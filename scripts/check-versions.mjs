#!/usr/bin/env node
// Asserts the INSTALLED versions match the spec's version matrix (spec §2).
//
// Each dependency is resolved from the app that declares it, discovered by
// scanning apps/*. Two reasons it is not resolved from the repo root or from a
// hardcoded path: pnpm's isolated node_modules links only the root's own direct
// dependencies, so a root resolve fails for every package regardless of what is
// installed; and apps/native is renamed to apps/mobile later in this plan, which
// a hardcoded path would not survive.
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

let failed = false;

const EXPECTED = [
  ["expo", /^57\./],
  ["expo-router", /^57\./],
  ["react-native", /^0\.86\./],
  ["react", /^19\.2\./],
  ["react-dom", /^19\.2\./],
  ["next", /^16\./],
  ["typescript", /^6\./],
];

// packages/* are scanned alongside apps/*: packages/ui pins react and
// react-native exactly, and a version there that drifts from the app's puts
// two copies of a native module in the tree — which is a runtime "Invalid hook
// call", not a warning.
const apps = ["apps", "packages"]
  .flatMap((root) =>
    readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => join(root, e.name)),
  )
  .filter((dir) => {
    try {
      readFileSync(join(dir, "package.json"));
      return true;
    } catch {
      return false;
    }
  });

/** Every app whose manifest declares `name`, in any dependency field. */
function declaringApps(name) {
  return apps.filter((dir) => {
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    } catch (e) {
      // A malformed manifest should be a named failure, not a stack trace.
      console.error(`FAIL ${dir}/package.json is unreadable: ${e.message}`);
      failed = true;
      return false;
    }
    return Boolean(manifest.dependencies?.[name] ?? manifest.devDependencies?.[name]);
  });
}

for (const [name, want] of EXPECTED) {
  const owners = declaringApps(name);
  if (owners.length === 0) {
    console.error(`FAIL ${name} — no app declares it`);
    failed = true;
    continue;
  }

  for (const owner of owners) {
    const require = createRequire(join(process.cwd(), owner, "package.json"));
    let got;
    try {
      got = JSON.parse(
        readFileSync(require.resolve(`${name}/package.json`), "utf8"),
      ).version;
    } catch {
      console.error(`FAIL ${owner} ${name} — declared but not installed`);
      failed = true;
      continue;
    }
    const ok = want.test(got);
    console.log(`${ok ? "ok  " : "FAIL"} ${owner} ${name} ${got} (want ${want})`);
    if (!ok) failed = true;
  }
}

process.exit(failed ? 1 : 0);
