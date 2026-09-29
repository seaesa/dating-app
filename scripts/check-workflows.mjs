#!/usr/bin/env node
// Guards the CI configuration itself. A green check that ran nothing is worse
// than a red one: it is a false statement about the code that nobody re-reads.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = ".github/workflows";
let failed = false;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `: ${detail}`}`);
  if (!ok) failed = true;
};

if (!existsSync(dir)) {
  check("workflows exist", false, `${dir} does not exist`);
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
check("workflows exist", files.length > 0);

for (const file of files) {
  const text = readFileSync(join(dir, file), "utf8");

  // A step that cannot fail cannot gate anything.
  check(
    `${file} has no continue-on-error`,
    !/continue-on-error:\s*true/.test(text),
    "a step that cannot fail is not a check",
  );

  // Unpinned actions drift under you and are a supply-chain surface.
  //
  // The whole value is read rather than pattern-matched, because an action can
  // carry a subdirectory (github/codeql-action/init@v3) and a regex that stops
  // at the second segment reports a pinned action as unpinned.
  const unpinned = [...text.matchAll(/uses:\s*(\S+)/g)]
    .map((m) => m[1])
    // Local composite actions have no version to pin.
    .filter((value) => !value.startsWith("./") && !value.includes("@"));
  check(`${file} pins every action version`, unpinned.length === 0, unpinned.join(", "));

  // A literal that looks like a credential must never appear in a workflow.
  const literals = [
    ...text.matchAll(/(token|secret|password|key):\s*["']?[A-Za-z0-9_-]{16,}/gi),
  ]
    .map((m) => m[0])
    .filter((m) => !m.includes("secrets.") && !m.includes("${{"));
  check(`${file} contains no literal secret`, literals.length === 0, literals.join(", "));

  const jobs = (text.match(/^\s{4}runs-on:/gm) ?? []).length;
  const timeouts = (text.match(/^\s{4}timeout-minutes:/gm) ?? []).length;
  check(
    `${file} sets a timeout on every job`,
    jobs === timeouts,
    `${jobs} jobs, ${timeouts} timeouts — a hung job burns quota until the 6-hour default`,
  );

  // Least privilege, explicitly. The repository default may be read-write, and
  // a workflow that never says so inherits it silently.
  check(
    `${file} declares its permissions`,
    /^permissions:/m.test(text),
    "an undeclared workflow inherits whatever the repository default is",
  );
}

const ci = readFileSync(join(dir, "ci.yml"), "utf8");
for (const required of [
  "check:foundation",
  "check:api",
  "check:ui",
  "contract",
  // The guards this plan created. check:eas is the one written specifically to
  // stop a build shipping the development bundle id; enforcing it only on a
  // developer's own machine, and only if they remember, is not enforcing it.
  "check:eas",
  "check:docs",
]) {
  check(`ci.yml runs ${required}`, ci.includes(required));
}
check(
  "ci.yml has no paths filter that could skip a required check",
  !/^\s*paths(-ignore)?:/m.test(ci),
  "a filtered required check reports success without running",
);

// The API suite talks to a real MongoDB replica set, Redis and an S3 gateway.
// Plan 2 recorded why testcontainers cannot serve here: a replica set initiated
// inside an ephemeral container advertises a member address the host cannot
// reach. So CI has to bring up the compose stack, and a job that forgets would
// fail in a way that reads like a broken test rather than missing services.
// GitHub's Ubuntu runners ship Node and npm but NOT pnpm, and package.json
// carries no `packageManager` field for corepack to shim — which is exactly why
// the composite setup action pins it. A job that calls pnpm without running that
// action gets `pnpm: command not found`, minutes into the run.
const jobBlocks = ci.split(/^ {2}(?=[a-z][a-z0-9-]*:$)/m).slice(1);
const missingSetup = jobBlocks
  .filter((block) => /^\s+run:.*\bpnpm /m.test(block) || /\|\s*\n\s+pnpm /.test(block))
  .filter((block) => !block.includes("./.github/actions/setup"))
  .map((block) => block.split(":")[0].trim());
check(
  "every job that runs pnpm installs it first",
  missingSetup.length === 0,
  `${missingSetup.join(", ")} — the runner has no pnpm without ./.github/actions/setup`,
);

const pythonJob = ci.slice(ci.indexOf("  python:"), ci.indexOf("  contract:"));
check(
  "ci.yml starts the service stack before the API tests",
  /services:up|docker compose up/.test(pythonJob),
  "pytest needs MongoDB, Redis and the S3 gateway to exist",
);

process.exit(failed ? 1 : 0);
