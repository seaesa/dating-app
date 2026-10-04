#!/usr/bin/env bash
# ===================================================================
# AG KIT -- Update Script (Linux / macOS Bash)
#
# Use this when an existing .agents folder is present and you want to upgrade:
#   - Update rules/, skills/, workflows/, agent/, scripts/, templates/
#   - Update IDE adapter (ide/<IDE>/)
#   - DO NOT remove runtime data (memory/, handoffs/, coordination/, indexes/, docs/)
#   - DO NOT overwrite GEMINI.md/AGENTS.md (only append missing sections)
#   - Upgrade code-review-graph pip package
#   - Rebuild AST Graph + Vector DB
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

write_banner() {
  local step="$1"
  local total="$2"
  local title="$3"
  echo ""
  echo "=========================================="
  echo " AG KIT -- Update Wizard"
  echo " Step $step of $total : $title"
  echo "=========================================="
  echo ""
}

show_menu() {
  local options=("$@")
  for i in "${!options[@]}"; do
    echo "  $((i+1)). ${options[$i]}"
  done
  echo ""
  read -p "Enter choice [1-${#options[@]}]: " choice
  if [[ -z "$choice" ]]; then
    echo "0"
  else
    echo "$((choice-1))"
  fi
}

write_banner "1" "4" "Target Project Path"
echo "Select target project path to update .agents:"
echo ""

path_choice=$(show_menu "Enter a custom path" "Use current directory: $(pwd)")

if [[ "$path_choice" == "0" ]]; then
  read -p "Project path: " TARGET_PROJECT_PATH
else
  TARGET_PROJECT_PATH="$(pwd)"
fi

TARGET_AGENTS_DIR="$TARGET_PROJECT_PATH/.agents"

if [[ ! -d "$TARGET_AGENTS_DIR" ]]; then
  echo "[ERROR] Could not find .agents at: $TARGET_AGENTS_DIR"
  echo "This project has not been setup yet. Please run setup.sh instead."
  exit 1
fi

echo "[OK] Project : $TARGET_PROJECT_PATH"
echo "[OK] .agents : $TARGET_AGENTS_DIR"

write_banner "2" "4" "AI IDE"
echo "Which AI IDE are you using?"
echo ""

ide_choice=$(show_menu "Antigravity / Gemini CLI  ->  GEMINI.md" "OpenAI Codex              ->  AGENTS.md")

if [[ "$ide_choice" == "1" ]]; then
  SELECTED_IDE="codex"
  ENTRY_POINT_FILE="AGENTS.md"
else
  SELECTED_IDE="antigravity"
  ENTRY_POINT_FILE="GEMINI.md"
fi

echo "[OK] IDE: $SELECTED_IDE (entry: $ENTRY_POINT_FILE)"

write_banner "3" "4" "Repository Setup"
echo "Is this a multi-repo workspace?"
echo "  (api/ and fe/ are separate Git repos under one root)"
echo ""

repo_choice=$(show_menu "No  - Single repo  (standard)" "Yes - Multi-repo   (symlink from workspace root -> project .agents)")

IS_MULTI_REPO=false
ROOT_PATH=""

if [[ "$repo_choice" == "1" ]]; then
  IS_MULTI_REPO=true
  echo ""
  echo "Enter workspace root (folder containing api/ and fe/)."
  echo "Leave blank to auto-detect (parent of project path)."
  echo ""
  read -p "Workspace root: " ROOT_PATH
  ROOT_PATH="$(echo "$ROOT_PATH" | xargs)"
  if [[ -z "$ROOT_PATH" ]]; then
    ROOT_PATH="$(dirname "$TARGET_PROJECT_PATH")"
    echo "[AUTO] Root: $ROOT_PATH"
  fi
fi

echo ""
if $IS_MULTI_REPO; then
  echo "[OK] Multi-repo: Yes (root: $ROOT_PATH)"
else
  echo "[OK] Multi-repo: No"
fi

write_banner "4" "4" "Confirm Update"
echo "UPDATE SUMMARY"
echo ""
echo "Project   : $TARGET_PROJECT_PATH"
echo ".agents   : $TARGET_AGENTS_DIR"
echo "IDE       : $SELECTED_IDE"
echo "Entry     : $ENTRY_POINT_FILE"
echo "Multi-repo: $( [ "$IS_MULTI_REPO" = true ] && echo "Yes (root: $ROOT_PATH)" || echo "No" )"
echo ""
echo "Directories to be UPDATED (overwrite):"
echo "  rules/, skills/, workflows/, agent/, scripts/, templates/, ide/$SELECTED_IDE/"
echo ""
echo "Files and directories PRESERVED (unmodified):"
echo "  memory/, handoffs/, coordination/, indexes/, docs/"
echo "  $ENTRY_POINT_FILE (append-only for missing sections)"
echo ""

read -p "Proceed? [Y/n] " confirm
if [[ -n "$confirm" && ! "$confirm" =~ ^[Yy] ]]; then
  echo "Update cancelled."
  exit 0
fi

echo ""
echo "[UPDATE] Updating shared directories..."
for d in rules skills workflows agent scripts templates; do
  if [[ -d "$SOURCE_DIR/$d" ]]; then
    rm -rf "$TARGET_AGENTS_DIR/$d"
    cp -r "$SOURCE_DIR/$d" "$TARGET_AGENTS_DIR/$d"
    echo "[OK] Updated $d/"
  fi
done

echo ""
echo "[UPDATE] Updating IDE adapter ide/$SELECTED_IDE/..."
if [[ -d "$SOURCE_DIR/ide/$SELECTED_IDE" ]]; then
  mkdir -p "$TARGET_AGENTS_DIR/ide"
  rm -rf "$TARGET_AGENTS_DIR/ide/$SELECTED_IDE"
  cp -r "$SOURCE_DIR/ide/$SELECTED_IDE" "$TARGET_AGENTS_DIR/ide/$SELECTED_IDE"
  echo "[OK] Updated ide/$SELECTED_IDE/"
fi

if [[ "$SELECTED_IDE" == "antigravity" && -f "$SOURCE_DIR/mcp_config.json" ]]; then
  cp "$SOURCE_DIR/mcp_config.json" "$TARGET_AGENTS_DIR/mcp_config.json"
  echo "[OK] Updated mcp_config.json"
fi

for f in ARCHITECTURE.md README.md VERSION; do
  if [[ -f "$SOURCE_DIR/$f" ]]; then
    cp "$SOURCE_DIR/$f" "$TARGET_AGENTS_DIR/$f"
  fi
done

echo ""
echo "[UPDATE] Verifying and updating $ENTRY_POINT_FILE..."
IDE_TEMPLATE_PATH="$TARGET_AGENTS_DIR/ide/$SELECTED_IDE/entry-point.md"
CRG_MARKER="<!-- code-review-graph MCP tools -->"

update_single_entry_point() {
  local target_dir="$1"
  local file_title="$2"
  local entry_path="$target_dir/$ENTRY_POINT_FILE"

  if [[ -f "$entry_path" ]]; then
    if ! grep -q "$CRG_MARKER" "$entry_path"; then
      if [[ -f "$IDE_TEMPLATE_PATH" ]]; then
        echo "" >> "$entry_path"
        sed -n "/$CRG_MARKER/,\$p" "$IDE_TEMPLATE_PATH" >> "$entry_path"
        echo "[OK] Appended MCP tools section to $file_title $ENTRY_POINT_FILE"
      fi
    else
      echo "[OK] $file_title $ENTRY_POINT_FILE already contains MCP tools section."
    fi

    if ! grep -q "\.agents/rules/core-protocol" "$entry_path"; then
      if [[ -f "$IDE_TEMPLATE_PATH" ]]; then
        echo "" >> "$entry_path"
        cat "$IDE_TEMPLATE_PATH" >> "$entry_path"
        echo "[OK] Appended AG Kit protocol to $file_title $ENTRY_POINT_FILE"
      fi
    fi
  else
    if [[ -f "$IDE_TEMPLATE_PATH" ]]; then
      cp "$IDE_TEMPLATE_PATH" "$entry_path"
      echo "[OK] Created new $ENTRY_POINT_FILE at $file_title"
    fi
  fi
}

update_single_entry_point "$TARGET_PROJECT_PATH" "Project"

if $IS_MULTI_REPO && [ -n "$ROOT_PATH" ] && [ -d "$ROOT_PATH" ]; then
  update_single_entry_point "$ROOT_PATH" "Workspace Root"
fi

echo ""
echo "[UPDATE] Upgrading code-review-graph and re-syncing platform init..."
INSTALLED_INIT="$TARGET_AGENTS_DIR/scripts/init-harness.sh"
chmod +x "$INSTALLED_INIT"

INIT_ARGS=(--ide "$SELECTED_IDE" --install-path "$TARGET_PROJECT_PATH" --skip-graph-build)
$IS_MULTI_REPO && INIT_ARGS+=(--symlink-root)
[ -n "$ROOT_PATH" ] && INIT_ARGS+=(--root-path "$ROOT_PATH")

bash "$INSTALLED_INIT" "${INIT_ARGS[@]}"

BUILD_DIR="$TARGET_PROJECT_PATH"
if $IS_MULTI_REPO && [ -n "$ROOT_PATH" ] && [ -d "$ROOT_PATH" ]; then
  BUILD_DIR="$ROOT_PATH"
fi

echo ""
echo "[UPDATE] Rebuilding AST Graph + Embeddings for target: $BUILD_DIR..."
BUILD_INDEX_SCRIPT="$TARGET_AGENTS_DIR/scripts/build-index.ps1"
if [[ -f "$BUILD_INDEX_SCRIPT" ]]; then
  (cd "$BUILD_DIR" && powershell -ExecutionPolicy Bypass -File "$BUILD_INDEX_SCRIPT" -IDE "$SELECTED_IDE" 2>/dev/null || bash "$TARGET_AGENTS_DIR/scripts/init-harness.sh" --skip-graph-build)
fi

echo ""
echo "=========================================="
echo " AG KIT UPDATE COMPLETE!"
echo "=========================================="
