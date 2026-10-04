import { defineConfig } from "@hey-api/openapi-ts";

// Types only: request bodies, responses and the Problem error. Requests are
// written by hand in src/api.ts.
export default defineConfig({
  input: "./openapi.json",
  output: {
    path: "./src/generated",
    format: "prettier",
    clean: true,
  },
  plugins: ["@hey-api/typescript"],
});
