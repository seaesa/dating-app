#!/usr/bin/env node
// Asserts the hooks exist, are executable, and that commitlint accepts and
// rejects the right messages.
import { execFileSync } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";
import { join } from "node:path";

let failed = false;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `: ${detail}`}`);
  if (!ok) failed = true;
};

// A hook file that exists but that git never runs is the failure this gate
// exists to catch, and it is invisible to a file-existence check. It happened:
// `pnpm install` reported "Already up to date", skipped the `prepare` script,
// never set core.hooksPath, and a deliberately bad commit SUCCEEDED while all
// three files sat there executable. Assert the wiring, not the files.
let hooksPath = "";
try {
  hooksPath = execFileSync("git", ["config", "--get", "core.hooksPath"], {
    encoding: "utf8",
  }).trim();
} catch {
  hooksPath = "";
}
check(
  "git is configured to run husky's hooks",
  hooksPath === ".husky/_",
  hooksPath
    ? `core.hooksPath is ${hooksPath}, expected .husky/_`
    : "core.hooksPath is unset — run `pnpm exec husky`; every hook is dead",
);

if (hooksPath) {
  for (const hook of ["pre-commit", "commit-msg", "pre-push"]) {
    check(
      `${hooksPath}/${hook} is where git will look`,
      existsSync(join(hooksPath, hook)),
      "husky's shim is missing; re-run `pnpm exec husky`",
    );
  }
}

for (const hook of ["pre-commit", "commit-msg", "pre-push"]) {
  const path = `.husky/${hook}`;
  if (!existsSync(path)) {
    check(`${path} exists`, false);
    continue;
  }
  try {
    accessSync(path, constants.X_OK);
    check(`${path} is executable`, true);
  } catch {
    check(`${path} is executable`, false, "not executable");
  }
}

const lint = (msg) => {
  try {
    execFileSync("pnpm", ["exec", "commitlint"], {
      input: msg,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
};

const cases = [
  ["feat: add a thing", true],
  ["fix(api): handle an expired code", true],
  ["refactor(ui)!: rename the export", true],
  // A bare type passes a naive regex but says nothing; subject-empty rejects it.
  ["fix:", false],
  ["fix", false],
  ["Fixed the thing", false],
  ["wip", false],
  ["feat: Add a thing", false],
  // A lower-case subject naming a product must pass: a flat lower-case rule
  // rejects "Expo SDK", "TypeScript" and every other proper noun.
  ["feat: raise the base to Expo SDK 57", true],
  ["fix(mobile): align React Native versions", true],
];

for (const [msg, want] of cases) {
  const got = lint(msg);
  check(
    `${want ? "accept" : "reject"} ${JSON.stringify(msg)}`,
    got === want,
    `got ${got ? "accepted" : "rejected"}`,
  );
}

process.exit(failed ? 1 : 0);
