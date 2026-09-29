/**
 * Staged-file routing. eslint runs before prettier so formatting is the last
 * word; the reverse order lets eslint's autofix reintroduce what prettier
 * just settled, and the two oscillate.
 *
 * The Python entry is scoped to apps/api because that is the only project with
 * a uv environment. A stray .py elsewhere is formatted by nothing, which is
 * correct — the alternative is a hook that fails outside that project.
 */
export default {
  "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix --no-warn-ignored", "prettier --write"],
  "*.{json,jsonc,md,mdx,yml,yaml,css}": ["prettier --write"],
  "apps/api/**/*.py": [
    "uv run --project apps/api ruff check --fix --force-exclude",
    "uv run --project apps/api ruff format --force-exclude",
  ],
};
