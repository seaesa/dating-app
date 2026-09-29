#!/usr/bin/env node
// The root config and the per-package configs are two entry points over one
// shared rule set: lint-staged and editors use the root, `turbo run lint` uses
// the per-package one. If the root is weaker, pre-commit passes code that CI
// then rejects — on a commit that already landed.
//
// This asserts they agree, and that a package nobody enumerated is still linted.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const DIRTY = [
  'const legacy = require("node:path")',
  'import { z } from "zod"',
  'import { join } from "node:path"',
  "export const value = [legacy, z, join]",
  "",
].join("\n");

const PROBES = [
  { file: "apps/mobile/app/__parity__.ts", pkg: "apps/mobile" },
  { file: "apps/web/app/__parity__.ts", pkg: "apps/web" },
  { file: "packages/ui/src/__parity__.ts", pkg: "packages/ui" },
  { file: "packages/core/src/__parity__.ts", pkg: "packages/core" },
];

// A package that exists but is in no enumerated list. Plans 2-4 add four of
// these; each must be linted the day it appears, not the day someone
// remembers to add it to a glob.
const UNENUMERATED = {
  file: "packages/__future__/src/__parity__.ts",
  pkg: null,
};

const FAKE_PACKAGE = "packages/__future__";
const ALL_PROBES = [...PROBES.map((p) => p.file), UNENUMERATED.file];

/**
 * Remove every probe this script can create.
 *
 * Run at startup as well as on the way out. A probe is deliberately broken
 * TypeScript — it imports a package its host does not depend on — so one left
 * behind by an interrupted run sits inside a real app breaking typecheck and the
 * editor, with a name that explains nothing to whoever finds it.
 */
function cleanup() {
  for (const file of ALL_PROBES) rmSync(file, { force: true });
  rmSync(FAKE_PACKAGE, { recursive: true, force: true });
}

cleanup();
process.on("exit", cleanup);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    cleanup();
    process.exit(130);
  });
}

let failed = false;

function countProblems(file, cwd) {
  try {
    execFileSync("pnpm", ["exec", "eslint", "--format", "json", file], {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
    });
    return 0;
  } catch (e) {
    const json = (e.stdout || "").slice((e.stdout || "").indexOf("["));
    try {
      return JSON.parse(json).reduce((n, r) => n + r.errorCount + r.warningCount, 0);
    } catch {
      return -1;
    }
  }
}

function withProbe(file, fn) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, DIRTY);
  try {
    return fn();
  } finally {
    rmSync(file, { force: true });
  }
}

for (const { file, pkg } of PROBES) {
  const [fromRoot, fromPkg] = withProbe(file, () => [
    countProblems(file, process.cwd()),
    countProblems(file.slice(pkg.length + 1), pkg),
  ]);

  const ok = fromRoot > 0 && fromRoot === fromPkg;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${pkg}: root reports ${fromRoot}, package reports ${fromPkg}`,
  );
  if (!ok) failed = true;
}

const found = withProbe(UNENUMERATED.file, () =>
  countProblems(UNENUMERATED.file, process.cwd()),
);
rmSync(FAKE_PACKAGE, { recursive: true, force: true });
const ok = found > 0;
console.log(
  `${ok ? "ok  " : "FAIL"} a package in no enumerated list is still linted (${found} problems)`,
);
if (!ok) failed = true;

process.exit(failed ? 1 : 0);
