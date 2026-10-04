# ===================================================================
# AG KIT -- Interactive Setup Wizard (Windows PowerShell)
#
# Flow:
#   1. Choose target project path
#   2. Choose AI IDE
#   3. Multi-repo? (symlink from workspace root -> .agents)
#   4. Scaffold .agents at target (selective by IDE, not blind copy)
#   5. Run init-harness.ps1 (venv + graph build)
# ===================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptRoot    = $PSScriptRoot
$SourceDir     = (Resolve-Path (Join-Path $ScriptRoot "..")).Path  # source .agents

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Write-Divider { Write-Host "  ------------------------------------------" -ForegroundColor DarkGray }

function Write-Banner {
    param([string]$Step, [string]$Total, [string]$Title)
    Write-Host ""
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host "   AG KIT -- Setup Wizard" -ForegroundColor Cyan
    Write-Host "   Step $Step of $Total : $Title" -ForegroundColor Yellow
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Menu {
    param([string[]]$Options, [int]$Default = 0)
    for ($i = 0; $i -lt $Options.Length; $i++) {
        $marker = if ($i -eq $Default) { ">>" } else { "  " }
        Write-Host "    $marker $($i+1). $($Options[$i])" -ForegroundColor White
    }
    Write-Host ""
    do {
        $raw = Read-Host "  Enter choice [1-$($Options.Length)]"
        if ($raw -eq "") { return $Default }
        if ($raw -match '^\d+$') {
            $idx = [int]$raw - 1
            if ($idx -ge 0 -and $idx -lt $Options.Length) { return $idx }
        }
        Write-Host "  [!] Invalid. Enter a number between 1 and $($Options.Length)." -ForegroundColor Red
    } while ($true)
}

# IDE-aware scaffold: creates .agents at $DestDir based on $IDE
function Invoke-Scaffold {
    param([string]$DestDir, [string]$IDE, [string]$SrcDir)

    Write-Host ""
    Write-Host "  [SCAFFOLD] Creating .agents folder structure for IDE: $IDE" -ForegroundColor Cyan

    # -- 1. Shared directories (copy from source) --
    $sharedDirs = @("rules", "skills", "workflows", "agent", "scripts", "templates")
    foreach ($d in $sharedDirs) {
        $src  = Join-Path $SrcDir $d
        $dest = Join-Path $DestDir $d
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination $dest -Recurse -Force
            Write-Host "  [OK] Copied $d/" -ForegroundColor Green
        }
    }

    # -- 2. IDE-specific: copy only the selected adapter --
    $ideSrc  = Join-Path $SrcDir "ide\$IDE"
    $ideDest = Join-Path $DestDir "ide\$IDE"
    if (Test-Path $ideSrc) {
        New-Item -ItemType Directory -Path (Join-Path $DestDir "ide") -Force | Out-Null
        Copy-Item -Path $ideSrc -Destination $ideDest -Recurse -Force
        Write-Host "  [OK] Copied ide/$IDE/ adapter" -ForegroundColor Green
    }

    # -- 3. MCP config: only for Antigravity --
    if ($IDE -eq "antigravity") {
        $mcpSrc  = Join-Path $SrcDir "mcp_config.json"
        $mcpDest = Join-Path $DestDir "mcp_config.json"
        if (Test-Path $mcpSrc) {
            Copy-Item -Path $mcpSrc -Destination $mcpDest -Force
            Write-Host "  [OK] Copied mcp_config.json (Antigravity MCP)" -ForegroundColor Green
        }
    }

    # -- 4. Docs (optional, non-runtime) --
    foreach ($f in @("ARCHITECTURE.md", "README.md", "VERSION")) {
        $src = Join-Path $SrcDir $f
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination (Join-Path $DestDir $f) -Force
        }
    }

    # -- 5. Runtime directories: create empty (init will populate) --
    $runtimeDirs = @("memory", "handoffs", "coordination", "indexes", "docs")
    foreach ($d in $runtimeDirs) {
        $dest = Join-Path $DestDir $d
        New-Item -ItemType Directory -Path $dest -Force | Out-Null
    }

    # Seed a blank MEMORY.md
    $memFile = Join-Path $DestDir "memory\MEMORY.md"
    if (-not (Test-Path $memFile)) {
        Set-Content -Path $memFile -Value "# Memory Index`n`n## Project`n" -Encoding UTF8
    }

    # -- 6. .gitignore for .agents itself --
    $gitignoreSrc  = Join-Path $SrcDir ".gitignore"
    $gitignoreDest = Join-Path $DestDir ".gitignore"
    if (Test-Path $gitignoreSrc) {
        Copy-Item -Path $gitignoreSrc -Destination $gitignoreDest -Force
    }

    Write-Host "  [OK] .agents scaffold complete at: $DestDir" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Step 1: Target project path
# ---------------------------------------------------------------------------

Write-Banner "1" "3" "Target Project Path"
Write-Host "  Where is your project? .agents will be created there." -ForegroundColor White
Write-Host "  Example: C:\projects\techeyes\api" -ForegroundColor DarkGray
Write-Host ""

$pathChoice = Show-Menu -Options @(
    "Enter a custom path"
    "Use current directory: $(Get-Location)"
) -Default 0

if ($pathChoice -eq 0) {
    Write-Host ""
    $TargetProjectPath = (Read-Host "  Project path").Trim('"').Trim()
    if (-not (Test-Path $TargetProjectPath)) {
        Write-Host "  [INFO] Path does not exist -- will be created." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $TargetProjectPath -Force | Out-Null
    }
    $TargetProjectPath = (Resolve-Path $TargetProjectPath).Path
} else {
    $TargetProjectPath = (Get-Location).Path
}

$TargetAgentsDir = Join-Path $TargetProjectPath ".agents"
Write-Host ""
Write-Host "  [OK] Project: $TargetProjectPath" -ForegroundColor Green
Write-Host "  [OK] .agents: $TargetAgentsDir" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 2: IDE Selection
# ---------------------------------------------------------------------------

Write-Divider
Write-Banner "2" "3" "AI IDE"
Write-Host "  Which AI IDE are you using?" -ForegroundColor White
Write-Host ""

$ideKeys  = @("antigravity", "codex")
$ideChoice = Show-Menu -Options @(
    "Antigravity / Gemini CLI  ->  creates GEMINI.md"
    "OpenAI Codex              ->  creates AGENTS.md"
) -Default 0
$SelectedIDE    = $ideKeys[$ideChoice]
$EntryPointFile = if ($SelectedIDE -eq "codex") { "AGENTS.md" } else { "GEMINI.md" }

Write-Host ""
Write-Host "  [OK] IDE: $SelectedIDE  (entry: $EntryPointFile)" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 3: Multi-repo Setup
# ---------------------------------------------------------------------------

Write-Divider
Write-Banner "3" "3" "Repository Setup"
Write-Host "  Is this a multi-repo workspace?" -ForegroundColor White
Write-Host "  (api/ and fe/ are separate Git repos under one root)" -ForegroundColor DarkGray
Write-Host ""

$repoChoice  = Show-Menu -Options @(
    "No  - Single repo  (standard)"
    "Yes - Multi-repo   (symlink from workspace root -> project .agents)"
) -Default 0
$IsMultiRepo = $repoChoice -eq 1
$RootPath    = ""

if ($IsMultiRepo) {
    Write-Host ""
    Write-Host "  Enter workspace root (folder containing api/ and fe/)." -ForegroundColor White
    Write-Host "  Leave blank to auto-detect (parent of project path)." -ForegroundColor DarkGray
    Write-Host ""
    $RootPath = (Read-Host "  Workspace root").Trim('"').Trim()
    if ($RootPath -eq "") {
        $RootPath = Split-Path $TargetProjectPath -Parent
        Write-Host "  [AUTO] Root: $RootPath" -ForegroundColor Yellow
    }
}

Write-Host ""
$multiLabel = if ($IsMultiRepo) { "Yes (root: $RootPath)" } else { "No" }
Write-Host "  [OK] Multi-repo: $multiLabel" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Summary & Confirm
# ---------------------------------------------------------------------------

Write-Host ""
Write-Divider
Write-Host ""
Write-Host "  SETUP SUMMARY" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Project  : $TargetProjectPath" -ForegroundColor White
Write-Host "  .agents  : $TargetAgentsDir" -ForegroundColor White
Write-Host "  IDE      : $SelectedIDE" -ForegroundColor White
Write-Host "  Entry    : $EntryPointFile" -ForegroundColor White
Write-Host "  Multi-repo: $multiLabel" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "  Proceed? [Y/n]"
if ($confirm -ne "" -and $confirm -notmatch "^[Yy]") {
    Write-Host "  Setup cancelled." -ForegroundColor Yellow
    exit 0
}

# ---------------------------------------------------------------------------
# Step A: Scaffold .agents (IDE-aware, not blind copy)
# ---------------------------------------------------------------------------

if (Test-Path $TargetAgentsDir) {
    Write-Host ""
    Write-Host "  [INFO] .agents already exists at $TargetAgentsDir. Skipping scaffold." -ForegroundColor Yellow
} else {
    New-Item -ItemType Directory -Path $TargetAgentsDir -Force | Out-Null
    Invoke-Scaffold -DestDir $TargetAgentsDir -IDE $SelectedIDE -SrcDir $SourceDir
}

# ---------------------------------------------------------------------------
# Step B: Run init-harness.ps1 from the installed .agents
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host "   Running Init (venv + graph build)..." -ForegroundColor Cyan
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host ""

$InstalledInit = Join-Path $TargetAgentsDir "scripts\init-harness.ps1"
$InitArgs = @("-IDE", $SelectedIDE, "-InstallPath", $TargetProjectPath)
if ($IsMultiRepo)  { $InitArgs += "-SymlinkRoot" }
if ($RootPath)     { $InitArgs += @("-RootPath", $RootPath) }

& powershell -ExecutionPolicy Bypass -File $InstalledInit @InitArgs
