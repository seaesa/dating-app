#!/usr/bin/env bash
# ===================================================================
# HARNESS AGENT BASE KIT INITIALIZATION SCRIPT (Linux / macOS Bash)
# Automatically creates .agents/.venv, installs code-review-graph,
# scaffolds root files (entry point, CODEOWNERS, AI_SYSTEM_MANIFEST),
# verifies MCP configuration, and builds Vector DB + AST Graph.
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$AGENTS_DIR/.venv"
VENV_PYTHON="$VENV_DIR/bin/python"
VENV_EXE="$VENV_DIR/bin/code-review-graph"
BUILD_INDEX_SCRIPT="$SCRIPT_DIR/build-index.ps1"

SYMLINK_ROOT=false
ROOT_PATH=""
SKIP_GRAPH_BUILD=false
IDE="antigravity"
INSTALL_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --symlink-root|-s)
      SYMLINK_ROOT=true
      shift
      ;;
    --root-path|-r)
      ROOT_PATH="$2"
      shift 2
      ;;
    --skip-graph-build|-g)
      SKIP_GRAPH_BUILD=true
      shift
      ;;
    --ide|-i)
      IDE="$2"
      shift 2
      ;;
    --install-path|-p)
      INSTALL_PATH="$2"
      shift 2
      ;;
    *)
      echo "[WARN] Unknown option: $1"
      shift
      ;;
  esac
done

# Resolve PROJECT_ROOT: prefer --install-path, fallback to parent of .agents
if [ -n "$INSTALL_PATH" ] && [ -d "$INSTALL_PATH" ]; then
    PROJECT_ROOT="$(cd "$INSTALL_PATH" && pwd)"
else
    PROJECT_ROOT="$(cd "$AGENTS_DIR/.." && pwd)"
fi

# IDE adapter
if [ "$IDE" = "codex" ]; then
    IDE_ENTRY_POINT_NAME="AGENTS.md"
else
    IDE_ENTRY_POINT_NAME="GEMINI.md"
fi
IDE_TEMPLATE_PATH="$AGENTS_DIR/ide/$IDE/entry-point.md"

echo "===================================================="
echo " HARNESS AGENT BASE KIT INITIALIZATION PIPELINE"
echo " Target Project: $PROJECT_ROOT"
echo " Agents Root   : $AGENTS_DIR"
echo " IDE           : $IDE"
echo " Entry Point   : $IDE_ENTRY_POINT_NAME"
echo "===================================================="

# Step 1: Check Python availability
echo "[1/6] Checking Python installation..."
if command -v python3 &>/dev/null; then
    PYTHON_BIN="$(command -v python3)"
elif command -v python &>/dev/null; then
    PYTHON_BIN="$(command -v python)"
else
    echo "[ERROR] Python 3 is not installed or not in PATH. Please install Python 3.10+."
    exit 1
fi
echo "[OK] Detected Python executable: $PYTHON_BIN"

# Step 2: Create .agents/.venv if missing
echo "[2/6] Setting up project-embedded virtual environment (.agents/.venv)..."
if [ ! -d "$VENV_DIR" ]; then
    echo "[INIT] Creating virtual environment at $VENV_DIR..."
    "$PYTHON_BIN" -m venv "$VENV_DIR"
    echo "[OK] Virtual environment created successfully."
else
    echo "[OK] Existing virtual environment found at $VENV_DIR."
fi

# Step 3: Install/Upgrade code-review-graph
echo "[3/6] Installing/Upgrading tirth8205/code-review-graph..."
"$VENV_PYTHON" -m pip install --upgrade pip --quiet 2>/dev/null || true
"$VENV_PYTHON" -m pip install "code-review-graph[embeddings]" --quiet

if [ -f "$VENV_EXE" ]; then
    echo "[OK] Executable code-review-graph ready at: $VENV_EXE"
    echo "[INIT] Running code-review-graph install for platform: $IDE..."
    "$VENV_EXE" install -y --platform "$IDE" 2>/dev/null || true
    echo "[OK] code-review-graph platform setup completed."
else
    echo "[ERROR] Failed to install code-review-graph into virtual environment."
    exit 1
fi

# Step 4: Scaffolding Root Project Files (Entry Point, CODEOWNERS, AI_SYSTEM_MANIFEST, .gitignore)
echo "[4/6] Scaffolding root project files ($IDE_ENTRY_POINT_NAME, CODEOWNERS, AI_SYSTEM_MANIFEST.yaml, .gitignore)..."
ENTRY_POINT_FILE="$PROJECT_ROOT/$IDE_ENTRY_POINT_NAME"

if [ -f "$IDE_TEMPLATE_PATH" ]; then
    ENTRY_POINT_CONTENT="$(cat "$IDE_TEMPLATE_PATH")"
else
    echo "[WARN] IDE template not found at $IDE_TEMPLATE_PATH. Using built-in fallback."
    ENTRY_POINT_CONTENT="# AG Kit Entry Point

@.agents/rules/core-protocol.md
@.agents/rules/coding-standards.md
@.agents/memory/MEMORY.md"
fi

if [ -f "$ENTRY_POINT_FILE" ]; then
    if ! grep -q ".agents/rules/core-protocol" "$ENTRY_POINT_FILE"; then
        echo "$ENTRY_POINT_CONTENT" >> "$ENTRY_POINT_FILE"
        echo "[OK] Appended AG Kit entry points to existing $IDE_ENTRY_POINT_NAME (No Overwrite)."
    else
        echo "[OK] $IDE_ENTRY_POINT_NAME already contains AG Kit entry points."
    fi
else
    echo "$ENTRY_POINT_CONTENT" > "$ENTRY_POINT_FILE"
    echo "[OK] Created new $IDE_ENTRY_POINT_NAME at project root."
fi

CODEOWNERS="$PROJECT_ROOT/CODEOWNERS"
if [ ! -f "$CODEOWNERS" ]; then
    cat <<EOF > "$CODEOWNERS"
# Project Code Owners
* @tech-lead
.agents/ @tech-lead
EOF
    echo "[OK] Created CODEOWNERS at project root."
fi

MANIFEST="$PROJECT_ROOT/AI_SYSTEM_MANIFEST.yaml"
if [ ! -f "$MANIFEST" ]; then
    cat <<EOF > "$MANIFEST"
version: "1.0.0"
kit_version: "1.0.0"
maturity_level: "M3"
capabilities:
  shared_mcp: true
  vector_indexing: true
  ast_code_graph: true
  runtime_isolation: true
EOF
    echo "[OK] Created AI_SYSTEM_MANIFEST.yaml at project root."
fi

GITIGNORE="$PROJECT_ROOT/.gitignore"
GITIGNORE_ENTRIES="
# Harness Agent Kit Local Cache & Index Files
.agents/.venv/
.code-review-graph/
.agents/indexes/*.sqlite
.agents/indexes/*.json
"
if [ -f "$GITIGNORE" ]; then
    if ! grep -q "\.agents/\.venv/" "$GITIGNORE"; then
        echo "$GITIGNORE_ENTRIES" >> "$GITIGNORE"
        echo "[OK] Appended Kit cache ignores to existing .gitignore"
    fi
else
    echo "$GITIGNORE_ENTRIES" > "$GITIGNORE"
    echo "[OK] Created new .gitignore at project root."
fi

# Step 5: Check MCP Server configuration
echo "[5/6] Verifying MCP Server configuration (.agents/mcp_config.json)..."
if [ -f "$AGENTS_DIR/mcp_config.json" ]; then
    echo "[OK] MCP Configuration file found at: $AGENTS_DIR/mcp_config.json"
else
    echo "[WARN] MCP Configuration file missing at $AGENTS_DIR/mcp_config.json."
fi

# Optional Step: Create Symlink to Workspace Root (for Multi-Repo setups)
if [ "$SYMLINK_ROOT" = true ]; then
    echo "[OPTIONAL] Creating Symlink & Scaffolding Workspace Root..."
    if [ -n "$ROOT_PATH" ] && [ -d "$ROOT_PATH" ]; then
        TARGET_ROOT="$(cd "$ROOT_PATH" && pwd)"
    else
        TARGET_ROOT="$(cd "$PROJECT_ROOT/.." && pwd)"
    fi
    ROOT_SYMLINK="$TARGET_ROOT/.agents"

    if [ -e "$ROOT_SYMLINK" ] || [ -L "$ROOT_SYMLINK" ]; then
        echo "[OK] Symlink or folder already exists at: $ROOT_SYMLINK"
    else
        ln -s "$AGENTS_DIR" "$ROOT_SYMLINK"
        echo "[OK] Created Symlink: $ROOT_SYMLINK -> $AGENTS_DIR"
    fi

    # Scaffold IDE Entry Point at Workspace Root (AGENTS.md for Codex, GEMINI.md for Antigravity)
    ROOT_ENTRY_POINT="$TARGET_ROOT/$IDE_ENTRY_POINT_NAME"
    if [ -f "$ROOT_ENTRY_POINT" ]; then
        if ! grep -q "\.agents/rules/core-protocol" "$ROOT_ENTRY_POINT"; then
            echo "$ENTRY_POINT_CONTENT" >> "$ROOT_ENTRY_POINT"
            echo "[OK] Appended AG Kit entry points to Root $IDE_ENTRY_POINT_NAME"
        fi
    else
        echo "$ENTRY_POINT_CONTENT" > "$ROOT_ENTRY_POINT"
        echo "[OK] Created new $IDE_ENTRY_POINT_NAME at Workspace Root."
    fi

    # Scaffold AI_SYSTEM_MANIFEST.yaml at Workspace Root
    ROOT_MANIFEST="$TARGET_ROOT/AI_SYSTEM_MANIFEST.yaml"
    if [ ! -f "$ROOT_MANIFEST" ]; then
        cat <<EOF > "$ROOT_MANIFEST"
version: "1.0.0"
kit_version: "1.0.0"
maturity_level: "M3"
capabilities:
  shared_mcp: true
  vector_indexing: true
  ast_code_graph: true
  runtime_isolation: true
EOF
        echo "[OK] Created AI_SYSTEM_MANIFEST.yaml at Workspace Root."
    fi
fi

# Step 6: Build Index & Code Graph
if [ "$SKIP_GRAPH_BUILD" = false ]; then
    if [ "$SYMLINK_ROOT" = true ] && [ -n "$TARGET_ROOT" ] && [ -d "$TARGET_ROOT" ]; then
        BUILD_DIR="$TARGET_ROOT"
    else
        BUILD_DIR="$PROJECT_ROOT"
    fi
    echo "[6/6] Rebuilding SQLite Vector Store & AST Code Graph for target: $BUILD_DIR..."
    (
        cd "$BUILD_DIR"
        if command -v pwsh &>/dev/null; then
            pwsh -ExecutionPolicy Bypass -File "$BUILD_INDEX_SCRIPT" -IDE "$IDE"
        elif command -v powershell &>/dev/null; then
            powershell -ExecutionPolicy Bypass -File "$BUILD_INDEX_SCRIPT" -IDE "$IDE"
        else
            echo "[INFO] Running Python vector DB builder directly..."
            "$VENV_PYTHON" "$SCRIPT_DIR/build_vector_db.py" || true
        fi
    )
else
    echo "[6/6] Skipped SQLite Vector Store & AST Code Graph build (--skip-graph-build active)."
fi

echo "===================================================="
echo " HARNESS AGENT BASE KIT INITIALIZATION COMPLETE!"
echo " Root Scaffolding & Embedded Tools Status:"
echo "   - GEMINI.md Entry Point: Configured (Appended/Preserved)"
echo "   - Code Review Graph    : $VENV_EXE"
echo "   - Vector Store DB      : $AGENTS_DIR/indexes/vector-store.sqlite"
if [ "$SYMLINK_ROOT" = true ]; then
    echo "   - Workspace Symlink    : Created at $ROOT_SYMLINK"
fi
echo "===================================================="
