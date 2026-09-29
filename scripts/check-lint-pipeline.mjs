#!/usr/bin/env node
// Verifies lint-staged is idempotent and tolerates a .py file outside apps/api.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: "pipe", ...opts });

const SCRATCH = ["packages/core/src/__scratch__.ts", "scripts/__scratch__.py"];

/** Leave no scratch file behind, however this exits — a leaked one fails lint
 *  and format for everyone afterwards. */
function cleanup() {
  for (const f of SCRATCH) {
    try {
      run("git", ["rm", "-f", "--quiet", f]);
    } catch {
      rmSync(f, { force: true });
    }
    if (existsSync(f)) rmSync(f, { force: true });
  }
}
process.on("exit", cleanup);

let failed = false;
const [tsFile, pyFile] = SCRATCH;

// 1. A file that is both lint-dirty (unused var) and format-dirty (no
//    semicolons) must converge, not oscillate: eslint --fix and
//    prettier --write can undo one another when run in the wrong order.
// Deliberately fixable by BOTH tools: the imports are out of order
// (eslint, import-x/order) and the formatting is wrong (prettier). An
// UNFIXABLE error would be the wrong fixture — lint-staged aborts and
// reverts the whole batch, which is correct behaviour but means neither
// tool's output is observable.
// Both tools must have real work to do, and their work must be
// DISTINGUISHABLE. The previous fixture's two imports were both builtins in
// alphabetical order, so import-x/order had nothing to fix and prettier's
// semicolons alone satisfied "the file changed" — the assertion passed even
// with eslint disabled entirely.
//
// Here an external import sits above a builtin, which only eslint reorders,
// and the formatting is wrong, which only prettier repairs.
const DIRTY = [
  'import { z } from "zod"',
  'import { join } from "node:path"',
  'export const p = join("a","b") + String(z)',
  "",
].join("\n");

writeFileSync(tsFile, DIRTY);
run("git", ["add", tsFile]);
/**
 * lint-staged exits non-zero here because eslint cannot autofix the unused
 * var, which is expected. What must NOT be swallowed is eslint failing to
 * start at all — a missing or unresolvable root config produces the same
 * non-zero exit and would make the idempotency check pass vacuously, because
 * a tool that never ran never changes the file.
 */
function runPipeline() {
  try {
    run("pnpm", ["exec", "lint-staged", "--no-stash"]);
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    if (
      /couldn't find an eslint\.config|ERR_MODULE_NOT_FOUND|Oops! Something went wrong/.test(
        out,
      )
    ) {
      throw new Error(`eslint could not start:\n${out.slice(0, 600)}`);
    }
  }
}

runPipeline();
const firstPass = readFileSync(tsFile, "utf8");
run("git", ["add", tsFile]);
runPipeline();
const secondPass = readFileSync(tsFile, "utf8");

// Assert each tool's signature separately. "The file changed" is not enough:
// prettier alone satisfies it.
const eslintRan = firstPass.indexOf('"node:path"') < firstPass.indexOf('"zod"');
const prettierRan = firstPass.includes('join("a", "b")');

if (!eslintRan) {
  console.error("FAIL eslint did not reorder the imports");
  console.error(firstPass);
  failed = true;
} else {
  console.log("ok   eslint --fix ran (imports reordered)");
}

if (!prettierRan) {
  console.error("FAIL prettier did not reformat the file");
  console.error(firstPass);
  failed = true;
} else {
  console.log("ok   prettier --write ran (arguments respaced)");
}

if (firstPass !== secondPass) {
  console.error("FAIL lint-staged is not idempotent");
  console.error(JSON.stringify({ firstPass, secondPass }, null, 2));
  failed = true;
} else {
  console.log("ok   lint-staged is idempotent");
}

// Unstage case 1's file before case 2: lint-staged processes every staged
// path, so leaving it in place would make case 2 fail on case 1's unused var
// and report the wrong cause.
run("git", ["rm", "-f", "--quiet", tsFile]);
rmSync(tsFile, { force: true });

// 2. A .py file outside apps/api must not trigger the uv-based command, which
//    would fail before plan 2 creates that project.
writeFileSync(pyFile, "x = 1\n");
run("git", ["add", pyFile]);
try {
  run("pnpm", ["exec", "lint-staged", "--no-stash"]);
  console.log("ok   a stray .py file does not invoke the api linter");
} catch (e) {
  console.error(`FAIL stray .py broke lint-staged: ${e.stdout ?? e.message}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
