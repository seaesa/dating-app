#!/usr/bin/env node
// Guards the build profiles. A profile that forgets APP_VARIANT silently builds
// the development bundle id, which then collides on device and in the store.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

let failed = false;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `: ${detail}`}`);
  if (!ok) failed = true;
};

if (!existsSync("apps/mobile/eas.json")) {
  check("eas.json exists", false, "apps/mobile/eas.json does not exist");
  process.exit(1);
}

const eas = JSON.parse(readFileSync("apps/mobile/eas.json", "utf8"));
const profiles = ["development", "preview", "production"];

for (const name of profiles) {
  const profile = eas.build?.[name];
  check(`eas.json defines ${name}`, Boolean(profile));
  if (!profile) continue;

  // Without APP_VARIANT the config falls back to development and every profile
  // produces the same bundle id.
  check(
    `${name} sets APP_VARIANT`,
    profile.env?.APP_VARIANT === name,
    JSON.stringify(profile.env),
  );
}

check("preview builds an APK", eas.build?.preview?.android?.buildType === "apk");
check(
  "production builds an app bundle",
  eas.build?.production?.android?.buildType === "app-bundle",
);
check(
  "development uses a dev client",
  eas.build?.development?.developmentClient === true,
);

// A dirty tree makes a build untraceable to a commit.
check("the CLI refuses to build a dirty tree", eas.cli?.requireCommit === true);
// EAS owning the build number is what stops two builds colliding.
check("EAS owns the build number", eas.cli?.appVersionSource === "remote");

// Resolve the real config per variant and compare the identifiers. This is the
// part that cannot be faked by reading eas.json: it runs app.config.ts.
const identifiers = profiles.map((variant) => {
  const out = execFileSync(
    "pnpm",
    ["exec", "expo", "config", "--json", "--type", "public"],
    {
      cwd: "apps/mobile",
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, APP_VARIANT: variant },
    },
  );
  const config = JSON.parse(out);
  return {
    variant,
    ios: config.ios?.bundleIdentifier,
    android: config.android?.package,
    name: config.name,
  };
});

for (const { variant, ios, android } of identifiers) {
  check(`${variant} resolves an iOS bundle id`, Boolean(ios), String(ios));
  check(
    `${variant} iOS and Android identifiers match`,
    ios === android,
    `${ios} vs ${android}`,
  );
}

const unique = new Set(identifiers.map((i) => i.ios));
check(
  "each variant has a distinct identifier",
  unique.size === profiles.length,
  [...unique].join(", "),
);
check(
  "production uses the unsuffixed identifier",
  identifiers.find((i) => i.variant === "production")?.ios === "com.terdin.date",
  identifiers.map((i) => `${i.variant}=${i.ios}`).join(" "),
);

// The name is what a tester reads on the home screen when three builds are
// installed side by side.
const names = new Set(identifiers.map((i) => i.name));
check(
  "each variant has a distinct name",
  names.size === profiles.length,
  [...names].join(", "),
);

process.exit(failed ? 1 : 0);
