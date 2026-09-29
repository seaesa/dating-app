import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi.json",
  output: {
    path: "./src/generated",
    format: "prettier",
    clean: true,
  },
  plugins: [
    // Axios rather than fetch: interceptors are the cleanest place for the
    // single-flight refresh, and both platforms ship the same adapter.
    { name: "@hey-api/client-axios", runtimeConfigPath: "./src/runtime" },
    "@hey-api/typescript",
    { name: "@hey-api/sdk", asClass: false },
    // Zod schemas feed react-hook-form resolvers, so form validation comes
    // from the API contract rather than a second hand-written copy.
    { name: "zod", compatibilityVersion: 4 },
    {
      name: "@tanstack/react-query",
      queryOptions: true,
      mutationOptions: true,
    },
  ],
});
