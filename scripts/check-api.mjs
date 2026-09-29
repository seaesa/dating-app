#!/usr/bin/env node
// Gate for the API. Plan 3 runs this before generating the TypeScript client.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

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

const api = { cwd: "apps/api" };

step("ruff lint", () => run("uv", ["run", "ruff", "check", "."], api));
step("ruff format", () => run("uv", ["run", "ruff", "format", "--check", "."], api));
step("mypy strict", () => run("uv", ["run", "mypy"], api));
step("pytest", () => run("uv", ["run", "pytest", "-q"], api));

step("openapi.json is current", () => {
  const file = "packages/api-contract/openapi.json";

  // Tracked first: `git diff` silently ignores an untracked file, so without
  // this the whole check passes vacuously on a fresh checkout that forgot to
  // commit the document.
  const tracked = run("git", ["ls-files", "--", file]).trim();
  if (!tracked) throw new Error(`${file} is not tracked by git`);

  run("pnpm", ["--filter=api", "run", "openapi"]);
  run("git", ["diff", "--exit-code", "--", file]);
});

const spec = () => JSON.parse(readFileSync("packages/api-contract/openapi.json", "utf8"));

step("schemas are camelCase", () => {
  const schemas = spec().components?.schemas ?? {};
  const offenders = [];
  for (const [name, schema] of Object.entries(schemas)) {
    for (const field of Object.keys(schema.properties ?? {})) {
      // snake_case in the document means the generated TypeScript needs a
      // mapping layer, which is the duplication BaseSchema exists to remove.
      if (field.includes("_")) offenders.push(`${name}.${field}`);
    }
  }
  if (offenders.length) throw new Error(offenders.join(", "));
});

step("every route has an explicit operationId", () => {
  const ops = [];
  for (const [path, methods] of Object.entries(spec().paths)) {
    for (const [method, op] of Object.entries(methods)) {
      // FastAPI derives an id like `get_me_v1_users_me_get` when none is set,
      // and the generated client function inherits that name.
      if (!op.operationId || /_(get|post|patch|delete|put)$/i.test(op.operationId)) {
        ops.push(`${method.toUpperCase()} ${path}`);
      }
    }
  }
  if (ops.length) throw new Error(`missing operation_id: ${ops.join(", ")}`);
});

step("the client's entry points exist", () => {
  const ids = Object.values(spec().paths).flatMap((p) =>
    Object.values(p).map((op) => op.operationId),
  );
  const required = [
    "requestOtp",
    "verifyOtp",
    "refreshTokens",
    "logout",
    "getMe",
    "getUser",
    "updateMyProfile",
    "updateMyIdentity",
    "createUploadUrl",
    "confirmUpload",
  ];
  const missing = required.filter((id) => !ids.includes(id));
  if (missing.length) throw new Error(missing.join(", "));
});

step("no private field appears in a public response schema", () => {
  const schemas = spec().components?.schemas ?? {};
  const publicProfile = schemas.PublicProfileRead?.properties ?? {};
  if (!Object.keys(publicProfile).length) {
    throw new Error("PublicProfileRead is missing from the document");
  }
  for (const banned of ["realName", "socials", "location", "phone", "birthYear"]) {
    if (banned in publicProfile) {
      throw new Error(`${banned} is exposed on PublicProfileRead`);
    }
  }
});

step("path parameters are camelCase", () => {
  const offenders = Object.keys(spec().paths).filter((p) => /\{[a-z]+_/.test(p));
  if (offenders.length) {
    // BaseSchema aliases body and response fields but cannot reach a path
    // parameter, so a snake_case segment surfaces in the generated client.
    throw new Error(`snake_case path params: ${offenders.join(", ")}`);
  }
});

process.exit(failed ? 1 : 0);
