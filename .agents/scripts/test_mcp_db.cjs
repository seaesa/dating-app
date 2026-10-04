/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const mcpConfigPath = path.join(rootDir, ".agents", "mcp_config.json");
const graphDbPath = path.join(rootDir, ".code-review-graph", "graph.db");

console.log("[TEST] Verifying MCP Configuration and CSDL files...");

if (fs.existsSync(mcpConfigPath)) {
  console.log("[OK] mcp_config.json exists.");
} else {
  console.error("[FAIL] mcp_config.json missing!");
}

if (fs.existsSync(graphDbPath)) {
  const stats = fs.statSync(graphDbPath);
  console.log(`[OK] graph.db exists (Size: ${stats.size} bytes).`);
} else {
  console.error("[FAIL] graph.db missing!");
}
