#!/usr/bin/env bash
# ===================================================================
# AG KIT -- Interactive Setup Wizard (Linux / macOS / Git Bash)
#
# Flow:
#   1. Choose target project path
#   2. Choose AI IDE
#   3. Multi-repo? (symlink from workspace root -> .agents)
#   4. Scaffold .agents at target (selective by IDE, not blind copy)
#   5. Run init-harness.sh (venv + graph build)
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"   # source .agents

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

cyan='\033[0;36m' yellow='\033[0;33m' green='\033[0;32m'
white='\033[0;37m' gray='\033[0;90m'   red='\033[0;31m'; reset='\033[0m'

divider() { echo -e "${gray}  ------------------------------------------${reset}"; }

banner() {
    echo ""
    echo -e "${cyan}  ==========================================${reset}"
    echo -e "${cyan}   AG KIT -- Setup Wizard${reset}"
    echo -e "${yellow}   Step $1 of $2 : $3${reset}"
    echo -e "${cyan}  ==========================================${reset}"
    echo ""
}

show_menu() {
    local default_idx=${1:-0}; shift
    local options=("$@"); local count=${#options[@]}
    for ((i=0; i<count; i++)); do
        local marker="  "; [ "$i" -eq "$default_idx" ] && marker=">>"
        echo -e "    $marker $((i+1)). ${options[$i]}"
    done
    echo ""
    while true; do
        read -rp "  Enter choice [1-$count]: " raw
        [ -z "$raw" ] && echo "$default_idx" && return
        if [[ "$raw" =~ ^[0-9]+$ ]] && [ "$raw" -ge 1 ] && [ "$raw" -le "$count" ]; then
            echo $((raw - 1)); return
        fi
        echo -e "${red}  [!] Invalid. Enter a number between 1 and $count.${reset}"
    done
}

# IDE-aware scaffold: creates .agents at $dest_dir based on $ide
scaffold_agents() {
    local dest_dir="$1" ide="$2" src_dir="$3"

    echo ""
    echo -e "${cyan}  [SCAFFOLD] Creating .agents folder structure for IDE: $ide${reset}"

    # 1. Shared directories
    for d in rules skills workflows agent scripts templates; do
        if [ -d "$src_dir/$d" ]; then
            cp -r "$src_dir/$d" "$dest_dir/$d"
            echo -e "${green}  [OK] Copied $d/${reset}"
        fi
    done

    # 2. IDE-specific adapter only
    if [ -d "$src_dir/ide/$ide" ]; then
        mkdir -p "$dest_dir/ide"
        cp -r "$src_dir/ide/$ide" "$dest_dir/ide/$ide"
        echo -e "${green}  [OK] Copied ide/$ide/ adapter${reset}"
    fi

    # 3. MCP config: only for Antigravity
    if [ "$ide" = "antigravity" ] && [ -f "$src_dir/mcp_config.json" ]; then
        cp "$src_dir/mcp_config.json" "$dest_dir/mcp_config.json"
        echo -e "${green}  [OK] Copied mcp_config.json (Antigravity MCP)${reset}"
    fi

    # 4. Docs
    for f in ARCHITECTURE.md README.md VERSION; do
        [ -f "$src_dir/$f" ] && cp "$src_dir/$f" "$dest_dir/$f"
    done

    # 5. Runtime dirs: create empty (init will populate)
    for d in memory handoffs coordination indexes docs; do
        mkdir -p "$dest_dir/$d"
    done

    # Seed blank MEMORY.md
    [ ! -f "$dest_dir/memory/MEMORY.md" ] && \
        printf "# Memory Index\n\n## Project\n" > "$dest_dir/memory/MEMORY.md"

    # 6. .gitignore
    [ -f "$src_dir/.gitignore" ] && cp "$src_dir/.gitignore" "$dest_dir/.gitignore"

    echo -e "${green}  [OK] .agents scaffold complete at: $dest_dir${reset}"
}

# ---------------------------------------------------------------------------
# Step 1: Target project path
# ---------------------------------------------------------------------------

banner "1" "3" "Target Project Path"
echo -e "${white}  Where is your project? .agents will be created there.${reset}"
echo -e "${gray}  Example: /home/user/projects/myapp/api${reset}"
echo ""

path_choice=$(show_menu 0 \
    "Enter a custom path" \
    "Use current directory: $(pwd)")

if [ "$path_choice" -eq 0 ]; then
    echo ""
    read -rp "  Project path: " TARGET_PROJECT_PATH
    TARGET_PROJECT_PATH="$(echo "$TARGET_PROJECT_PATH" | xargs)"
    [ ! -d "$TARGET_PROJECT_PATH" ] && mkdir -p "$TARGET_PROJECT_PATH"
    TARGET_PROJECT_PATH="$(cd "$TARGET_PROJECT_PATH" && pwd)"
else
    TARGET_PROJECT_PATH="$(pwd)"
fi

TARGET_AGENTS_DIR="$TARGET_PROJECT_PATH/.agents"
echo ""
echo -e "${green}  [OK] Project: $TARGET_PROJECT_PATH${reset}"
echo -e "${green}  [OK] .agents: $TARGET_AGENTS_DIR${reset}"

# ---------------------------------------------------------------------------
# Step 2: IDE Selection
# ---------------------------------------------------------------------------

divider
banner "2" "3" "AI IDE"
echo -e "${white}  Which AI IDE are you using?${reset}"
echo ""

ide_choice=$(show_menu 0 \
    "Antigravity / Gemini CLI  ->  creates GEMINI.md" \
    "OpenAI Codex              ->  creates AGENTS.md")

IDE_KEYS=("antigravity" "codex")
ENTRY_FILES=("GEMINI.md" "AGENTS.md")
SELECTED_IDE="${IDE_KEYS[$ide_choice]}"
ENTRY_POINT_FILE="${ENTRY_FILES[$ide_choice]}"

echo ""
echo -e "${green}  [OK] IDE: $SELECTED_IDE  (entry: $ENTRY_POINT_FILE)${reset}"

# ---------------------------------------------------------------------------
# Step 3: Multi-repo Setup
# ---------------------------------------------------------------------------

divider
banner "3" "3" "Repository Setup"
echo -e "${white}  Is this a multi-repo workspace?${reset}"
echo -e "${gray}  (api/ and fe/ are separate Git repos under one root)${reset}"
echo ""

repo_choice=$(show_menu 0 \
    "No  - Single repo  (standard)" \
    "Yes - Multi-repo   (symlink from workspace root -> project .agents)")

IS_MULTI_REPO=false
ROOT_PATH=""

if [ "$repo_choice" -eq 1 ]; then
    IS_MULTI_REPO=true
    echo ""
    echo -e "${white}  Enter workspace root (folder containing api/ and fe/).${reset}"
    echo -e "${gray}  Leave blank to auto-detect (parent of project path).${reset}"
    echo ""
    read -rp "  Workspace root: " ROOT_PATH
    ROOT_PATH="$(echo "$ROOT_PATH" | xargs)"
    if [ -z "$ROOT_PATH" ]; then
        ROOT_PATH="$(dirname "$TARGET_PROJECT_PATH")"
        echo -e "${yellow}  [AUTO] Root: $ROOT_PATH${reset}"
    fi
fi

echo ""
if $IS_MULTI_REPO; then
    echo -e "${green}  [OK] Multi-repo: Yes (root: $ROOT_PATH)${reset}"
else
    echo -e "${green}  [OK] Multi-repo: No${reset}"
fi

# ---------------------------------------------------------------------------
# Summary & Confirm
# ---------------------------------------------------------------------------

echo ""
divider
echo ""
echo -e "${cyan}  SETUP SUMMARY${reset}"
echo ""
echo -e "${white}  Project  : $TARGET_PROJECT_PATH${reset}"
echo -e "${white}  .agents  : $TARGET_AGENTS_DIR${reset}"
echo -e "${white}  IDE      : $SELECTED_IDE${reset}"
echo -e "${white}  Entry    : $ENTRY_POINT_FILE${reset}"
echo -e "${white}  Multi-repo: $([ "$IS_MULTI_REPO" = true ] && echo "Yes (root: $ROOT_PATH)" || echo "No")${reset}"
echo ""

read -rp "  Proceed? [Y/n]: " confirm
if [ -n "$confirm" ] && ! echo "$confirm" | grep -qi "^y"; then
    echo -e "${yellow}  Setup cancelled.${reset}"; exit 0
fi

# ---------------------------------------------------------------------------
# Step A: Scaffold .agents (IDE-aware)
# ---------------------------------------------------------------------------

if [ -d "$TARGET_AGENTS_DIR" ]; then
    echo ""
    echo -e "${yellow}  [INFO] .agents already exists at $TARGET_AGENTS_DIR. Skipping scaffold.${reset}"
else
    mkdir -p "$TARGET_AGENTS_DIR"
    scaffold_agents "$TARGET_AGENTS_DIR" "$SELECTED_IDE" "$SOURCE_DIR"
fi

# ---------------------------------------------------------------------------
# Step B: Run init-harness.sh from the installed .agents
# ---------------------------------------------------------------------------

echo ""
echo -e "${cyan}  ==========================================${reset}"
echo -e "${cyan}   Running Init (venv + graph build)...${reset}"
echo -e "${cyan}  ==========================================${reset}"
echo ""

INSTALLED_INIT="$TARGET_AGENTS_DIR/scripts/init-harness.sh"
chmod +x "$INSTALLED_INIT"

INIT_ARGS=(--ide "$SELECTED_IDE" --install-path "$TARGET_PROJECT_PATH")
$IS_MULTI_REPO && INIT_ARGS+=(--symlink-root)
[ -n "$ROOT_PATH" ] && INIT_ARGS+=(--root-path "$ROOT_PATH")

bash "$INSTALLED_INIT" "${INIT_ARGS[@]}"
