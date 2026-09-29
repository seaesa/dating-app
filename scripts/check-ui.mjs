#!/usr/bin/env node
// Gate for the UI and contract layer.
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let failed = false;

const step = (label, fn) => {
  try {
    fn();
    console.log(`ok   ${label}`);
  } catch (e) {
    const detail = (e.stdout || e.stderr || e.message || "").toString();
    console.error(`FAIL ${label}: ${detail.slice(0, 500)}`);
    failed = true;
  }
};

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: "pipe", ...opts });

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

step("generated client is current", () => {
  const dir = "packages/api-contract/src/generated";

  // Tracked first: `git diff` silently ignores untracked files, so without
  // this the check passes vacuously on a checkout that never committed them.
  const tracked = run("git", ["ls-files", "--", dir]).trim();
  if (!tracked) throw new Error(`${dir} is not tracked by git`);

  run("pnpm", ["--filter=@repo/api-contract", "run", "generate"]);
  run("git", ["diff", "--exit-code", "--", dir]);
});

step("no Babel config on web", () => {
  // A Babel config switches off Next's SWC, which is the whole reason
  // NativeWind is configured through tsconfig instead.
  const offenders = readdirSync("apps/web").filter((f) => /^\.?babel/.test(f));
  if (offenders.length) throw new Error(`found ${offenders.join(", ")}`);
});

step("the web app compiles JSX through NativeWind", () => {
  // The plan's defining silent failure: without jsxImportSource every className
  // on a react-native-web element is a dead prop at runtime, and NOTHING else
  // notices. next build succeeds, Tailwind still emits every class from content
  // scanning, and the built stylesheet still contains every token.
  const config = JSON.parse(
    run("pnpm", ["exec", "tsc", "--showConfig"], { cwd: "apps/web" }),
  );
  if (config.compilerOptions?.jsxImportSource !== "nativewind") {
    throw new Error(
      `apps/web resolves jsxImportSource to ${config.compilerOptions?.jsxImportSource}`,
    );
  }
});

step("web does not depend on reanimated", () => {
  const pkg = JSON.parse(readFileSync("apps/web/package.json", "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if ("react-native-reanimated" in deps) {
    throw new Error("react-native-reanimated would force a Babel config on web");
  }
});

step("@repo/ui imports neither the API client nor the store", () => {
  const offenders = walk("packages/ui/src")
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => /@repo\/(api-contract|store)/.test(readFileSync(f, "utf8")));
  if (offenders.length) throw new Error(offenders.join(", "));
});

step("no page outside the owner's own profile reads a private field", () => {
  // Defence in depth for the product's core rule. The API is the gate and
  // tests/test_visibility.py covers it; this is the other half — that no page
  // reads a private field even if one arrived.
  //
  // This lived in apps/web/app/leak.test.ts until JavaScript testing was taken
  // out of scope. It is kept because it guards the invariant rather than a
  // behaviour, and it needs no test runner to do so.
  const stripComments = (text) =>
    text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

  const pages = walk("apps/web/app")
    .filter((f) => /\.tsx$/.test(f))
    // `identity` is legitimate on /profile, where the viewer IS the owner.
    .filter((f) => !f.includes("profile/page"));
  if (pages.length < 4) throw new Error(`only ${pages.length} pages found to check`);

  const offenders = pages.filter((f) =>
    /\bidentity\b/.test(stripComments(readFileSync(f, "utf8"))),
  );
  if (offenders.length)
    throw new Error(`reads the private tier: ${offenders.join(", ")}`);

  // And the public profile card must not even be handed one.
  const publicProfile = stripComments(
    readFileSync("apps/web/app/u/[id]/public-profile.tsx", "utf8"),
  );
  for (const banned of ["identity", "phone", "realName", "photoUrls"]) {
    if (new RegExp(`\\b${banned}\\b`).test(publicProfile)) {
      throw new Error(`public-profile.tsx references ${banned}`);
    }
  }
});

step("no hard-coded hex colour in shared components or app screens", () => {
  const sources = [
    ...walk("packages/ui/src"),
    ...walk("apps/web/app"),
    ...walk("apps/mobile/app"),
  ];
  const offenders = sources
    .filter((f) => /\.tsx?$/.test(f))
    // No exemptions. The two places that genuinely need a finished colour —
    // the navigation theme and the browser's themeColor — take it from
    // @repo/tailwind-config/colors, which is generated from theme.css.
    //
    // Every notation, not just six-digit hex: `#fff` was missed by the length,
    // and `#ff0044cc` was missed because \b fails between two word characters.
    .filter((f) =>
      /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(readFileSync(f, "utf8")),
    );
  if (offenders.length) {
    throw new Error(`use design tokens instead: ${offenders.join(", ")}`);
  }
});

step("the shared preset survives Tailwind's config resolution", () => {
  // The preset was once ESM, so a CommonJS tailwind.config.js received
  // { default: ... } from require() and merged NOTHING — the resolved theme had
  // no colours at all and every build still succeeded.
  //
  // Resolution is rooted at each app, not the repo root: pnpm's isolated
  // node_modules links only a package's own declared dependencies, so
  // requiring tailwindcss from here fails regardless of what is installed.
  for (const app of ["apps/web", "apps/mobile"]) {
    const out = run(
      "node",
      [
        "-e",
        `const r = require("tailwindcss/resolveConfig");
         const t = r(require("./tailwind.config.js")).theme;
         if (!t.colors.primary) throw new Error("primary is undefined");
         if (!t.colors.background) throw new Error("background is undefined");
         if (t.borderRadius.lg !== "var(--radius)") {
           throw new Error("borderRadius.lg did not come from the preset");
         }
         console.log("resolved");`,
      ],
      { cwd: app },
    );
    if (!out.includes("resolved")) throw new Error(`${app}: ${out}`);
  }
});

step("the web bundle carries the design tokens and utilities", () => {
  run("pnpm", ["--filter=web", "run", "build"]);
  const css = walk("apps/web/.next")
    .filter((f) => f.endsWith(".css"))
    .map((f) => readFileSync(f, "utf8"))
    .join("");
  if (!css) throw new Error("the build produced no CSS at all");
  for (const needle of [
    "--primary:347",
    ".bg-primary",
    ".text-foreground",
    // The dark token block and at least one dark: variant. Tailwind is set to
    // darkMode: "class" for NativeWind's sake, and layout.tsx applies that class
    // from prefers-color-scheme — without both halves every dark: utility in
    // @repo/ui is dead on web while the browser chrome still turns dark.
    ".dark:root",
    ".dark\\:",
  ]) {
    if (!css.includes(needle)) {
      throw new Error(`the stylesheet is missing ${needle}`);
    }
  }

  // And the class has to actually be applied, or the block above never matches.
  const layout = readFileSync("apps/web/app/layout.tsx", "utf8");
  if (!/prefers-color-scheme/.test(layout) || !/classList/.test(layout)) {
    throw new Error("layout.tsx no longer applies the dark class before paint");
  }
});

step("the web bundle contains no native-only storage", () => {
  // storage.web.ts must be the file that resolved. expo-secure-store reaching
  // the browser would mean the platform split silently failed.
  const chunks = walk("apps/web/.next/static").filter((f) => f.endsWith(".js"));
  if (chunks.length === 0) throw new Error("no js chunks to inspect");
  const bundle = chunks.map((f) => readFileSync(f, "utf8")).join("");
  for (const banned of ["SecureStore", "No storage implementation"]) {
    if (bundle.includes(banned)) {
      throw new Error(`${banned} reached the web bundle`);
    }
  }
  // Our own key, not the API name: any dependency touching localStorage would
  // make that assertion pass for the wrong reason.
  if (!bundle.includes("terdin.refreshToken")) {
    throw new Error("storage.web.ts did not reach the bundle");
  }
});

step("mobile bundles for both platforms with the tokens compiled in", () => {
  // The label used to promise compiled styles and only count .hbc files, so a
  // NativeWind regression that stripped every style left it green.
  const out = join(process.env.TMPDIR ?? "/tmp", "check-ui-mobile");
  run("rm", ["-rf", out]);
  run("pnpm", ["exec", "expo", "export", "--platform", "all", "--output-dir", out], {
    cwd: "apps/mobile",
  });
  const js = walk(join(out, "_expo", "static", "js"));
  const native = js.filter((f) => f.endsWith(".hbc"));
  if (native.length < 2) {
    throw new Error(`expected ios and android bundles, found ${native.length}`);
  }

  // Hermes bytecode keeps string literals, so the compiled brand hue is
  // greppable even though class names are not.
  const carriesTokens = native.some((f) => readFileSync(f, "latin1").includes("347 77%"));
  if (!carriesTokens) {
    throw new Error("no native bundle carries the compiled design tokens");
  }
  run("rm", ["-rf", out]);
});

step("the web app builds with webpack, not Turbopack", () => {
  // Turbopack panics on react-native-web. next.config.js still carries a
  // turbopack block for the day that is fixed, which reads like an invitation to
  // drop the flag.
  const pkg = JSON.parse(readFileSync("apps/web/package.json", "utf8"));
  for (const script of ["dev", "build"]) {
    if (!pkg.scripts?.[script]?.includes("--webpack")) {
      throw new Error(`apps/web "${script}" lost --webpack`);
    }
  }
});

step("lint", () => run("pnpm", ["turbo", "run", "lint"]));
step("typecheck", () => run("pnpm", ["turbo", "run", "typecheck"]));

process.exit(failed ? 1 : 0);
