import base from "@repo/eslint-config/base";
import next from "@repo/eslint-config/next";
import reactNative from "@repo/eslint-config/react-native";

/**
 * Root config, for the entry points that run from the repository root:
 * lint-staged and editors. `turbo run lint` uses each package's own config.
 *
 * Two rules keep the halves honest:
 *
 * 1. NEVER overwrite a config object's own `files`. The shared configs use
 *    `files` for per-file-type overrides — base.mjs exempts `*.config.js` from
 *    no-require-imports — and replacing it widens that exemption to every file
 *    in the directory, silently disabling rules that CI still enforces.
 *
 * 2. `base` applies to everything by default, and the framework configs layer
 *    on top for their directories. Enumerating packages instead would leave
 *    every new package unlinted here until someone remembered to add it, and
 *    `--no-warn-ignored` in .lintstagedrc.mjs suppresses the warning that
 *    would otherwise reveal it.
 */

/** Restrict a config to `dirs` without clobbering its own `files` scoping. */
const within = (configs, dirs) =>
  configs.flatMap((config) =>
    config.files
      ? // Keep the config's own file scoping, anchored under each directory.
        [
          {
            ...config,
            files: dirs.flatMap((dir) =>
              config.files.map((pattern) =>
                pattern.startsWith("**/")
                  ? `${dir}/${pattern.slice(3)}`
                  : `${dir}/${pattern}`,
              ),
            ),
          },
        ]
      : // No scoping of its own: apply it across the directories.
        [{ ...config, files: dirs.map((dir) => `${dir}/**/*.{ts,tsx,js,jsx,mjs,cjs}`) }],
  );

const hasOnlyIgnores = (config) =>
  Object.keys(config).length === 1 && "ignores" in config;

export default [
  {
    ignores: [".agents/**"],
  },
  // Global ignores and the base rules apply everywhere, so a package that no
  // list below mentions is still linted.
  ...base,
  ...within(
    next.filter((c) => !base.includes(c) && !hasOnlyIgnores(c)),
    ["apps/web"],
  ),
  ...within(
    reactNative.filter((c) => !base.includes(c) && !hasOnlyIgnores(c)),
    ["apps/mobile", "packages/ui"],
  ),
];
