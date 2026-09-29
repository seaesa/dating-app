import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Shared flat config. `prettier` is last so formatting rules never conflict. */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.expo/**",
      "**/node_modules/**",
      "**/ios/**",
      "**/android/**",
      // Generated client code: linting it produces noise nobody can fix,
      // because the next `pnpm contract` overwrites any edit.
      "**/*.gen.ts",
      "**/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "import-x": importX },
    languageOptions: {
      globals: { ...globals.node, ...globals.es2023 },
      parserOptions: { ecmaVersion: 2023, sourceType: "module" },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          pathGroups: [{ pattern: "@repo/**", group: "internal" }],
          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import-x/no-duplicates": "error",
    },
  },
  {
    // Bundler and build configs are loaded by Node as CommonJS before any
    // transpiler runs, so require() is the only thing that works there.
    files: ["**/*.config.js", "**/*.config.cjs", "**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "import-x/order": "off",
    },
  },
  prettier,
);
