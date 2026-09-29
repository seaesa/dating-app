#!/usr/bin/env node
// One gate for the whole foundation. Later plans run this to prove they did
// not regress the base.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

let failed = false;

const step = (label, fn) => {
  try {
    fn();
    console.log(`ok   ${label}`);
  } catch (e) {
    const detail = (e.stdout || e.stderr || e.message || "").toString();
    console.error(`FAIL ${label}: ${detail.slice(0, 400)}`);
    failed = true;
  }
};

const run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8", stdio: "pipe" });

step("no committed build output or native projects", () => {
  const tracked = run("git", ["ls-files"]).split("\n");
  const banned = tracked.filter(
    (p) =>
      /(^|\/)(dist|\.next|\.expo|\.turbo|node_modules|__pycache__|\.venv)\//.test(p) ||
      /^apps\/mobile\/(ios|android)\//.test(p),
  );
  if (banned.length) throw new Error(`tracked: ${banned.slice(0, 5).join(", ")}`);
});

step("gitignore covers the required paths", () => {
  const required = [
    "node_modules/x",
    ".turbo/x",
    "apps/web/.next/x",
    "apps/mobile/.expo/x",
    "apps/mobile/ios/x",
    "apps/mobile/android/x",
    "apps/api/.venv/x",
    "apps/api/src/__pycache__/x",
    "apps/api/.ruff_cache/x",
    "apps/api/.pytest_cache/x",
    "apps/api/.mypy_cache/x",
    ".env",
    ".env.local",
    "coverage/x",
    ".DS_Store",
  ];
  const out = run("git", ["check-ignore", "--no-index", ...required]);
  const ignored = new Set(out.split("\n").filter(Boolean));
  const missing = required.filter((p) => !ignored.has(p));
  if (missing.length) throw new Error(`not ignored: ${missing.join(", ")}`);
});

step("no tracked file is gitignored", () => {
  // Adding a rule to .gitignore does not untrack anything, so a generated file
  // committed before the rule existed stays tracked forever and every gate
  // above it reports green. `git check-ignore` skips tracked paths unless
  // --no-index is passed, which is why this needs its own step.
  const tracked = run("git", ["ls-files"]);
  let offenders = "";
  try {
    offenders = execFileSync("git", ["check-ignore", "--no-index", "--stdin"], {
      input: tracked,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    offenders = ""; // exit 1 means nothing matched, which is what we want
  }
  const list = offenders.split("\n").filter(Boolean);
  if (list.length) {
    throw new Error(`tracked but gitignored — git rm --cached them: ${list.join(", ")}`);
  }
});

step(".env.example is NOT ignored", () => {
  try {
    run("git", ["check-ignore", "--no-index", "-q", ".env.example"]);
  } catch {
    return; // exit 1 means not ignored, which is what we want
  }
  throw new Error(".env.example is ignored but must be committed");
});

step("the workspace manifest has no unresolved pnpm placeholder", () => {
  // pnpm writes `set this to true or false` into allowBuilds when a dependency
  // wants to run a build script and nobody has decided yet. Committed, it makes
  // `pnpm install --frozen-lockfile` fail with ERR_PNPM_IGNORED_BUILDS on every
  // fresh clone — so every CI job dies at its install step while a developer
  // whose local copy was already answered sees nothing wrong.
  const lines = readFileSync("pnpm-workspace.yaml", "utf8").split("\n");
  const unresolved = [];
  let inAllowBuilds = false;
  for (const line of lines) {
    if (/^\S/.test(line)) {
      inAllowBuilds = line.startsWith("allowBuilds:");
      continue;
    }
    if (!inAllowBuilds || line.trim() === "") continue;
    const value = line.split(":").slice(1).join(":").trim();
    if (value !== "true" && value !== "false") unresolved.push(line.trim());
  }
  if (unresolved.length) {
    throw new Error(`decide these: ${unresolved.join(", ")}`);
  }
});

step("no tsup config remains", () => {
  if (existsSync("packages/ui/tsup.config.ts")) {
    throw new Error("tsup.config.ts exists");
  }
});

step("versions match the matrix", () => run("node", ["scripts/check-versions.mjs"]));
step("hooks are wired", () => run("node", ["scripts/check-hooks.mjs"]));
step("lint pipeline is stable", () => run("node", ["scripts/check-lint-pipeline.mjs"]));
step("root and per-package eslint agree", () =>
  run("node", ["scripts/check-eslint-parity.mjs"]),
);
step("documented filters resolve", () => run("node", ["scripts/check-filters.mjs"]));
step("lint passes", () => run("pnpm", ["turbo", "run", "lint"]));
step("typecheck passes", () => run("pnpm", ["turbo", "run", "typecheck"]));
step("formatting is clean", () => run("pnpm", ["format:check"]));

process.exit(failed ? 1 : 0);
