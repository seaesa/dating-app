const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const indexDir = path.join(rootDir, ".agents", "indexes");
const pyScript = path.join(__dirname, "build_vector_db.py");

// Ensure directory exists
if (!fs.existsSync(indexDir)) {
  fs.mkdirSync(indexDir, { recursive: true });
}

// Run Python script to generate valid SQLite Vector DB
try {
  execSync(`py "${pyScript}"`, { stdio: "inherit" });
} catch {
  try {
    execSync(`python "${pyScript}"`, { stdio: "inherit" });
  } catch (err) {
    console.error("[ERROR] Failed to run build_vector_db.py:", err.message);
  }
}
