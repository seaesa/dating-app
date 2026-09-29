#!/usr/bin/env node
// Documentation that names a script or a path which no longer exists sends the
// next reader — human or agent — down a dead end, and is worse than no
// documentation because it is believed.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let failed = false;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `: ${detail}`}`);
  if (!ok) failed = true;
};

const REQUIRED = [
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "apps/api/README.md",
  "apps/api/AGENTS.md",
  "apps/web/README.md",
  "apps/web/AGENTS.md",
  "apps/mobile/README.md",
  "apps/mobile/AGENTS.md",
  "packages/README.md",
  "packages/ui/AGENTS.md",
];
for (const file of REQUIRED) check(`${file} exists`, existsSync(file));

const IGNORED = new Set([
  "node_modules",
  ".git",
  ".next",
  ".expo",
  ".turbo",
  ".venv",
  ".superpowers",
  "dist",
  "coverage",
]);

const walk = (dir) =>
  readdirSync(dir).flatMap((e) => {
    if (IGNORED.has(e)) return [];
    const full = join(dir, e);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/**
 * Only documentation that instructs.
 *
 * `docs/superpowers/` holds the spec and the plans, which are a record of what
 * was decided and when. Their commands were accurate when written, and gating on
 * them would either freeze the history or invite editing it.
 */
const instructional = walk(".").filter(
  (f) => f.endsWith(".md") && !f.startsWith("docs/superpowers/"),
);
check(
  "there is instructional documentation to check",
  instructional.length >= REQUIRED.length,
);

const rootScripts = Object.keys(JSON.parse(readFileSync("package.json", "utf8")).scripts);
const mobileScripts = Object.keys(
  JSON.parse(readFileSync("apps/mobile/package.json", "utf8")).scripts,
);
const PNPM_BUILTINS = [
  "install",
  "add",
  "remove",
  "exec",
  "dlx",
  "why",
  "store",
  "approve-builds",
  "list",
];

// Every `pnpm <script>` mentioned anywhere must actually resolve.
const unknown = [];
for (const file of instructional) {
  const text = readFileSync(file, "utf8");
  for (const [, script] of text.matchAll(/\bpnpm (?:run )?([a-z][a-z0-9:-]*)\b/g)) {
    if (PNPM_BUILTINS.includes(script)) continue;
    if (rootScripts.includes(script)) continue;
    // A doc inside an app may name that app's own script.
    if (file.startsWith("apps/mobile/") && mobileScripts.includes(script)) continue;
    unknown.push(`${file}: pnpm ${script}`);
  }
}
check("every documented pnpm script exists", unknown.length === 0, unknown.join("; "));

// Relative links must point at something.
const broken = [];
for (const file of instructional) {
  const dir = join(file, "..");
  for (const [, target] of readFileSync(file, "utf8").matchAll(/\]\((\.\.?\/[^)#]+)/g)) {
    if (!existsSync(join(dir, decodeURI(target)))) broken.push(`${file} -> ${target}`);
  }
}
check("every relative link resolves", broken.length === 0, broken.join("; "));

// Paths named in backticks must exist. A renamed module leaves the rule
// pointing at nothing, and the rule is the part that matters.
const missingPaths = [];
for (const file of instructional) {
  for (const [, path] of readFileSync(file, "utf8").matchAll(
    /`((?:apps|packages|scripts|docker)\/[A-Za-z0-9_./-]+)`/g,
  )) {
    if (path.endsWith("/") || path.includes("<") || path.includes("*")) continue;
    if (!existsSync(path)) missingPaths.push(`${file} -> ${path}`);
  }
}
check(
  "every path named in the docs exists",
  missingPaths.length === 0,
  missingPaths.join("; "),
);

// Every project README covers the same ground, because a reader arriving at one
// app should not have to guess which of the five things they need is missing.
// This caught apps/web/README.md still being the Next.js starter template
// (telling the reader to run `yarn dev` and deploy to Vercel) and
// apps/mobile/README.md being two sentences.
const README_SECTIONS = [
  ["tech stack", /^##+ .*tech stack/im],
  ["setup", /^##+ .*setup/im],
  ["running locally", /^##+ .*run/im],
  ["deployment", /^##+ .*(deploy|build)/im],
];
for (const file of REQUIRED.filter(
  (f) => f.startsWith("apps/") && f.endsWith("README.md"),
)) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  const missing = README_SECTIONS.filter(([, pattern]) => !pattern.test(text)).map(
    ([name]) => name,
  );
  check(
    `${file} covers every section`,
    missing.length === 0,
    `missing: ${missing.join(", ")}`,
  );
  check(
    `${file} points at its AGENTS.md`,
    /AGENTS\.md/.test(text),
    "the rules are the part that matters",
  );
}

// An AGENTS.md that only describes is a summary, not a set of rules.
for (const file of REQUIRED.filter((f) => f.endsWith("AGENTS.md"))) {
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  check(`${file} states rules`, /\b(never|must|always|do not)\b/i.test(text));
  check(`${file} names a verification command`, /```bash|`pnpm |`uv run /.test(text));
}

process.exit(failed ? 1 : 0);
