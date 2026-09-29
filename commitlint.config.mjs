/**
 * Conventional Commits. `scope-enum` is deliberately open: the package list
 * changes across plans, and a closed enum would reject valid scopes for
 * packages that do not exist yet.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // What rejects a bare `fix:` — a type with no subject passes a naive
    // regex but tells a reader nothing.
    "subject-empty": [2, "never"],
    // Forbid Title Case and Sentence case, but allow a lower-case subject that
    // contains a proper noun: "raise the base to Expo SDK 57" must pass while
    // "Add a thing" must not. A flat lower-case rule rejects every product name.
    "subject-case": [
      2,
      "never",
      ["sentence-case", "start-case", "pascal-case", "upper-case"],
    ],
    "subject-full-stop": [2, "never", "."],
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "refactor",
        "perf",
        "test",
        "docs",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "body-max-line-length": [1, "always", 100],
  },
};
