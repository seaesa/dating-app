#!/usr/bin/env node
// Verifies the images build, START, and expose nothing they should not.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let failed = false;

const step = (label, fn) => {
  try {
    fn();
    console.log(`ok   ${label}`);
  } catch (e) {
    const detail = (e.stdout || e.stderr || e.message || "").toString();
    console.error(`FAIL ${label}: ${detail.slice(0, 700)}`);
    failed = true;
  }
};

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", stdio: "pipe", ...opts });

const quiet = (cmd, args) => {
  try {
    return run(cmd, args);
  } catch {
    return "";
  }
};

/** Poll until `check` succeeds, so a slow start is not a failure. */
function waitFor(name, check, attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      check();
      return;
    } catch {
      execFileSync("sleep", ["1"]);
    }
  }
  const logs = quiet("docker", ["logs", "--tail", "30", name]);
  throw new Error(`${name} never became ready.\n${logs}`);
}

step("api image builds", () =>
  run("docker", [
    "build",
    "-f",
    "docker/api.Dockerfile",
    "-t",
    "terdin-date-api:test",
    ".",
  ]),
);

step("web image builds", () =>
  run("docker", [
    "build",
    "-f",
    "docker/web.Dockerfile",
    "-t",
    "terdin-date-web:test",
    ".",
  ]),
);

step("api container serves when its dependencies are reachable", () => {
  // Building is not running: a multi-stage image can compile and still lack a
  // runtime library, or run as a user that cannot read its own files. So the
  // image is given a real database and asked to answer.
  quiet("docker", ["rm", "-f", "api-smoke", "api-smoke-mongo", "api-smoke-redis"]);
  quiet("docker", ["network", "rm", "api-smoke-net"]);
  run("docker", ["network", "create", "api-smoke-net"]);
  try {
    // A replica set, because the app's transactions require one — the same
    // shape the dev compose stack uses.
    run("docker", [
      ...["run", "-d", "--name", "api-smoke-mongo", "--network", "api-smoke-net"],
      ...["--network-alias", "mongo", "mongo:8"],
      ...["--replSet", "rs0", "--bind_ip_all"],
    ]);
    run("docker", [
      ...["run", "-d", "--name", "api-smoke-redis", "--network", "api-smoke-net"],
      ...["--network-alias", "redis", "redis:8-alpine"],
    ]);
    waitFor("api-smoke-mongo", () =>
      run("docker", [
        ...["exec", "api-smoke-mongo", "mongosh", "--quiet", "--eval"],
        "try { rs.status().ok } catch (e) { rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo:27017'}]}).ok }",
      ]),
    );
    run("docker", [
      ...["run", "-d", "--name", "api-smoke", "--network", "api-smoke-net"],
      ...["-p", "18000:8000"],
      ...["-e", "MONGODB_URL=mongodb://mongo:27017/?replicaSet=rs0"],
      ...["-e", "REDIS_URL=redis://redis:6379/0"],
      ...["-e", "JWT_SECRET=0123456789012345678901234567890123"],
      "terdin-date-api:test",
    ]);

    // /openapi.json proves the process serves; /health proves the lifespan
    // actually reached its dependencies rather than starting degraded.
    waitFor("api-smoke", () =>
      run("curl", ["-sf", "-o", "/dev/null", "http://localhost:18000/openapi.json"]),
    );
    const health = run("curl", ["-sf", "http://localhost:18000/health"]);
    const parsed = JSON.parse(health);
    if (parsed.status !== "ok") {
      throw new Error(`health is ${health}, so a dependency did not connect`);
    }
  } finally {
    quiet("docker", ["rm", "-f", "api-smoke", "api-smoke-mongo", "api-smoke-redis"]);
    quiet("docker", ["network", "rm", "api-smoke-net"]);
  }
});

step("api container fails fast when the database is unreachable", () => {
  // It used to hang here forever: uvicorn printed "Waiting for application
  // startup." and the unbounded Mongo connect never returned, so the container
  // was neither serving nor dead and an orchestrator waited on it indefinitely.
  // A bounded failure is restartable; a hang is not.
  quiet("docker", ["rm", "-f", "api-deadend"]);
  run("docker", [
    ...["run", "-d", "--name", "api-deadend"],
    ...["-e", "MONGODB_URL=mongodb://nowhere:27017"],
    ...["-e", "REDIS_URL=redis://nowhere:6379/0"],
    ...["-e", "JWT_SECRET=0123456789012345678901234567890123"],
    "terdin-date-api:test",
  ]);
  try {
    // Generous next to the 5s client timeout, tight next to the old 30s-plus
    // driver default that produced the hang.
    waitFor(
      "api-deadend",
      () => {
        const state = run("docker", [
          ...["inspect", "-f", "{{.State.Running}}", "api-deadend"],
        ]).trim();
        if (state !== "false") throw new Error("still running");
      },
      20,
    );
    const logs = run("docker", ["logs", "api-deadend"]);
    if (!/mongodb unreachable at startup/.test(logs)) {
      throw new Error(`exited without saying why:\n${logs.slice(-500)}`);
    }
  } finally {
    quiet("docker", ["rm", "-f", "api-deadend"]);
  }
});

step("web container starts and answers", () => {
  quiet("docker", ["rm", "-f", "web-smoke"]);
  run("docker", [
    "run",
    "-d",
    "--name",
    "web-smoke",
    "-p",
    "13000:3000",
    // Deliberately no NEXT_PUBLIC_API_URL: it is inlined at build time, so
    // passing it here would do nothing and read as coverage that does not exist.
    "terdin-date-web:test",
  ]);
  try {
    waitFor("web-smoke", () =>
      run("curl", ["-sf", "-o", "/dev/null", "http://localhost:13000/login"]),
    );
  } finally {
    quiet("docker", ["rm", "-f", "web-smoke"]);
  }
});

step("the api restart policy tolerates a failed startup", () => {
  // uvicorn's multiprocess parent exits 0 when a worker fails to start, even
  // though nothing served. `on-failure` would therefore never restart an api
  // that came up before its database and give a permanently dead service, so
  // the policy must be one that restarts regardless of exit code.
  const text = readFileSync("docker-compose.prod.yml", "utf8");
  const api = text.split(/^ {2}(?=[a-z])/m).find((s) => s.startsWith("api:"));
  if (!api) throw new Error("no api service in docker-compose.prod.yml");
  const policy = /^\s{4}restart:\s*(\S+)/m.exec(api)?.[1];
  if (!["always", "unless-stopped"].includes(policy)) {
    throw new Error(`api restart policy is ${policy}, which ignores an exit 0 failure`);
  }
});

step("the web image's API URL is not a developer's localhost", () => {
  // NEXT_PUBLIC_API_URL is inlined into client JavaScript during the build, so
  // no runtime setting can correct it. A localhost default means every published
  // image points at a machine the visitor's browser is not running.
  const text = readFileSync("docker/web.Dockerfile", "utf8");
  const arg = /^ARG NEXT_PUBLIC_API_URL=(.*)$/m.exec(text)?.[1];
  if (!arg) throw new Error("no NEXT_PUBLIC_API_URL build argument");
  if (/localhost|127\.0\.0\.1/.test(arg)) {
    throw new Error(`the image would ship ${arg} to every visitor`);
  }
});

step("neither image runs as root", () => {
  for (const image of ["terdin-date-api:test", "terdin-date-web:test"]) {
    const user = run("docker", ["run", "--rm", "--entrypoint", "id", image, "-u"]).trim();
    if (user === "0") throw new Error(`${image} runs as root`);
  }
});

step("production compose publishes no database or cache port", () => {
  // A published port on a database is how these get found and drained.
  const text = readFileSync("docker-compose.prod.yml", "utf8");
  const services = text.split(/^ {2}(?=[a-z])/m);
  for (const service of services) {
    const name = service.split(":")[0].trim();
    if (!["mongo", "redis", "s3", "minio"].includes(name)) continue;
    if (/^\s{4}ports:/m.test(service)) {
      throw new Error(`${name} publishes a port to the host`);
    }
  }
});

step("production compose is valid and demands its secrets", () => {
  const env = {
    ...process.env,
    DOMAIN: "example.com",
    JWT_SECRET: "x".repeat(32),
    IMAGE_TAG: "test",
    MONGODB_URL: "mongodb://example",
    REDIS_URL: "redis://example",
    S3_ENDPOINT: "https://example",
    S3_BUCKET: "b",
    S3_ACCESS_KEY: "k",
    S3_SECRET_KEY: "s",
    S3_PUBLIC_BASE_URL: "https://example",
  };
  run("docker", ["compose", "-f", "docker-compose.prod.yml", "config", "-q"], {
    env,
  });

  // And it must refuse to resolve with a required value missing, rather than
  // starting with an empty string where a secret belongs.
  try {
    run("docker", ["compose", "-f", "docker-compose.prod.yml", "config", "-q"], {
      env: { ...env, JWT_SECRET: "" },
    });
  } catch {
    return;
  }
  throw new Error("compose resolved with an empty JWT_SECRET");
});

process.exit(failed ? 1 : 0);
