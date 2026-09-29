#!/usr/bin/env node
// Asserts every documented pnpm filter resolves to exactly one package.
//
// This exists because a filter that matches nothing is SILENT: pnpm and turbo
// both exit 0 and simply do no work, so `pnpm dev --filter=mobil` looks like a
// success. This script is what turns that no-op into a failure.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const EXPECTED = ["api", "web", "mobile"];

/** Workspace project names a filter selects. */
function packagesFor(filter) {
  const out = execFileSync(
    "pnpm",
    ["list", "--filter", filter, "--depth", "-1", "--json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  const parsed = JSON.parse(out || "[]");
  return parsed.map((p) => p.name).filter(Boolean);
}

let failed = false;

for (const filter of EXPECTED) {
  let names = [];
  try {
    names = packagesFor(filter);
  } catch (e) {
    console.error(`FAIL ${filter}: ${String(e.message).split("\n")[0]}`);
    failed = true;
    continue;
  }
  const ok = names.length === 1 && names[0] === filter;
  console.log(`${ok ? "ok  " : "FAIL"} --filter=${filter} -> [${names}]`);
  if (!ok) failed = true;
}

// Every documented `dev:<name>` root script must name a package that exists,
// or the script is a silent no-op the day someone runs it.
const rootScripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
for (const [name, body] of Object.entries(rootScripts)) {
  const match = /^dev:(.+)$/.exec(name);
  if (!match) continue;
  const target = /--filter=(\S+)/.exec(body)?.[1];
  const ok = Boolean(target) && EXPECTED.includes(target);
  console.log(
    `${ok ? "ok  " : "FAIL"} ${name} -> --filter=${target}` +
      (ok ? "" : " names no package"),
  );
  if (!ok) failed = true;
}

// The failure mode this script defends against: pnpm reports success for a
// filter that selects nothing. Prove that is what happens, so the assertions
// above are known to be the only thing catching it.
const bogus = packagesFor("definitely-not-a-package");
if (bogus.length === 0) {
  console.log("ok   a bogus filter selects nothing (and pnpm still exits 0)");
} else {
  console.error(`FAIL bogus filter selected ${bogus}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
