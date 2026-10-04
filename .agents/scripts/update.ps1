# ===================================================================
# AG KIT -- Update Script (Windows PowerShell)
#
# Use this when an existing .agents folder is present and you want to upgrade:
#   - Update rules/, skills/, workflows/, agent/, scripts/, templates/
#   - Update IDE adapter (ide/<IDE>/)
#   - DO NOT remove runtime data (memory/, handoffs/, coordination/, indexes/, docs/)
#   - DO NOT overwrite GEMINI.md/AGENTS.md (only append missing sections)
#   - Upgrade code-review-graph pip package
#   - Rebuild AST Graph + Vector DB
# ===================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptRoot = $PSScriptRoot
$SourceDir  = (Resolve-Path (Join-Path $ScriptRoot "..")).Path  # source .agents dir

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

function Write-Divider { Write-Host "  ------------------------------------------" -ForegroundColor DarkGray }

function Write-Banner {
    param([string]$Step, [string]$Total, [string]$Title)
    Write-Host ""
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host "   AG KIT -- Update Wizard" -ForegroundColor Cyan
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
        Write-Host "  [!] Invalid selection." -ForegroundColor Red
    } while ($true)
}

# ---------------------------------------------------------------------------
# Step 1: Target project path
# ---------------------------------------------------------------------------

Write-Banner "1" "4" "Target Project Path"
Write-Host "  Select target project path to update .agents:" -ForegroundColor White
Write-Host ""

$pathChoice = Show-Menu -Options @(
    "Enter a custom path"
    "Use current directory: $(Get-Location)"
) -Default 1

if ($pathChoice -eq 0) {
    Write-Host ""
    $TargetProjectPath = (Read-Host "  Project path").Trim('"').Trim()
    $TargetProjectPath = (Resolve-Path $TargetProjectPath).Path
} else {
    $TargetProjectPath = (Get-Location).Path
}

$TargetAgentsDir = Join-Path $TargetProjectPath ".agents"

if (-not (Test-Path $TargetAgentsDir)) {
    Write-Host ""
    Write-Host "  [ERROR] Could not find .agents at: $TargetAgentsDir" -ForegroundColor Red
    Write-Host "  This project has not been setup yet. Please run setup.ps1 instead." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "  [OK] Project : $TargetProjectPath" -ForegroundColor Green
Write-Host "  [OK] .agents : $TargetAgentsDir" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 2: IDE Selection
# ---------------------------------------------------------------------------

Write-Divider
Write-Banner "2" "4" "AI IDE"
Write-Host "  Which AI IDE are you using?" -ForegroundColor White
Write-Host ""

$ideKeys  = @("antigravity", "codex")
$ideChoice = Show-Menu -Options @(
    "Antigravity / Gemini CLI  ->  GEMINI.md"
    "OpenAI Codex              ->  AGENTS.md"
) -Default 0
$SelectedIDE    = $ideKeys[$ideChoice]
$EntryPointFile = if ($SelectedIDE -eq "codex") { "AGENTS.md" } else { "GEMINI.md" }

Write-Host ""
Write-Host "  [OK] IDE: $SelectedIDE  (entry: $EntryPointFile)" -ForegroundColor Green

# ---------------------------------------------------------------------------
# Step 3: Multi-repo Setup
# ---------------------------------------------------------------------------

Write-Divider
Write-Banner "3" "4" "Repository Setup"
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
# Step 4: Confirm
# ---------------------------------------------------------------------------

Write-Divider
Write-Banner "4" "4" "Confirm Update"
Write-Host "  UPDATE SUMMARY" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Project   : $TargetProjectPath" -ForegroundColor White
Write-Host "  .agents   : $TargetAgentsDir" -ForegroundColor White
Write-Host "  IDE       : $SelectedIDE" -ForegroundColor White
Write-Host "  Entry     : $EntryPointFile" -ForegroundColor White
Write-Host "  Multi-repo: $multiLabel" -ForegroundColor White
Write-Host ""
Write-Host "  Directories to be UPDATED (overwrite):" -ForegroundColor Yellow
Write-Host "    rules/, skills/, workflows/, agent/, scripts/, templates/, ide/$SelectedIDE/" -ForegroundColor White
Write-Host ""
Write-Host "  Files and directories PRESERVED (unmodified):" -ForegroundColor Green
Write-Host "    memory/, handoffs/, coordination/, indexes/, docs/" -ForegroundColor White
Write-Host "    $EntryPointFile (append-only for missing sections)" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "  Proceed? [Y/n]"
if ($confirm -ne "" -and $confirm -notmatch "^[Yy]") {
    Write-Host "  Update cancelled." -ForegroundColor Yellow
    exit 0
}

# ---------------------------------------------------------------------------
# Step A: Update shared dirs (overwrite without deleting runtime data)
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "  [UPDATE] Updating shared directories..." -ForegroundColor Cyan

# Directories to update completely (overwrite)
$updateDirs = @("rules", "skills", "workflows", "agent", "scripts", "templates")
foreach ($d in $updateDirs) {
    $src  = Join-Path $SourceDir $d
    $dest = Join-Path $TargetAgentsDir $d
    if (Test-Path $src) {
        if (Test-Path $dest) {
            Remove-Item -Path $dest -Recurse -Force
        }
        Copy-Item -Path $src -Destination $dest -Recurse -Force
        Write-Host "  [OK] Updated $d/" -ForegroundColor Green
    }
}

# ---------------------------------------------------------------------------
# Step B: Update IDE adapter
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "  [UPDATE] Updating IDE adapter ide/$SelectedIDE/..." -ForegroundColor Cyan

$ideSrc  = Join-Path $SourceDir "ide\$SelectedIDE"
$ideDest = Join-Path $TargetAgentsDir "ide\$SelectedIDE"
if (Test-Path $ideSrc) {
    New-Item -ItemType Directory -Path (Join-Path $TargetAgentsDir "ide") -Force | Out-Null
    if (Test-Path $ideDest) {
        Remove-Item -Path $ideDest -Recurse -Force
    }
    Copy-Item -Path $ideSrc -Destination $ideDest -Recurse -Force
    Write-Host "  [OK] Updated ide/$SelectedIDE/" -ForegroundColor Green
}

# MCP config update (antigravity only)
if ($SelectedIDE -eq "antigravity") {
    $mcpSrc  = Join-Path $SourceDir "mcp_config.json"
    $mcpDest = Join-Path $TargetAgentsDir "mcp_config.json"
    if (Test-Path $mcpSrc) {
        Copy-Item -Path $mcpSrc -Destination $mcpDest -Force
        Write-Host "  [OK] Updated mcp_config.json" -ForegroundColor Green
    }
}

# Docs files (non-runtime)
foreach ($f in @("ARCHITECTURE.md", "README.md", "VERSION")) {
    $src = Join-Path $SourceDir $f
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $TargetAgentsDir $f) -Force
    }
}

# ---------------------------------------------------------------------------
# Step C: Update Entry Point (GEMINI.md / AGENTS.md) — append-only
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "  [UPDATE] Verifying and updating $EntryPointFile..." -ForegroundColor Cyan

$IDETemplatePath = Join-Path $TargetAgentsDir "ide\$SelectedIDE\entry-point.md"
$CRGMarker = "<!-- code-review-graph MCP tools -->"

function Update-SingleEntryPoint {
    param([string]$TargetDir, [string]$FileTitle)

    $EntryPointPath = Join-Path $TargetDir $EntryPointFile
    if (Test-Path $EntryPointPath) {
        $ExistingContent = Get-Content $EntryPointPath -Raw -ErrorAction SilentlyContinue

        if ($ExistingContent -notmatch [regex]::Escape($CRGMarker)) {
            if (Test-Path $IDETemplatePath) {
                $TemplateContent = Get-Content $IDETemplatePath -Raw -Encoding UTF8
                $markerIdx = $TemplateContent.IndexOf($CRGMarker)
                if ($markerIdx -ge 0) {
                    $MCPSection = "`n" + $TemplateContent.Substring($markerIdx)
                    Add-Content -Path $EntryPointPath -Value $MCPSection -Encoding UTF8
                    Write-Host "  [OK] Appended MCP tools section to $FileTitle $EntryPointFile" -ForegroundColor Green
                }
            }
        } else {
            Write-Host "  [OK] $FileTitle $EntryPointFile already contains MCP tools section." -ForegroundColor DarkGray
        }

        if ($ExistingContent -notmatch "\.agents/rules/core-protocol") {
            if (Test-Path $IDETemplatePath) {
                $TemplateContent = Get-Content $IDETemplatePath -Raw -Encoding UTF8
                Add-Content -Path $EntryPointPath -Value "`n$TemplateContent" -Encoding UTF8
                Write-Host "  [OK] Appended AG Kit protocol to $FileTitle $EntryPointFile" -ForegroundColor Green
            }
        }
    } else {
        if (Test-Path $IDETemplatePath) {
            $TemplateContent = Get-Content $IDETemplatePath -Raw -Encoding UTF8
            Set-Content -Path $EntryPointPath -Value $TemplateContent -Encoding UTF8
            Write-Host "  [OK] Created new $EntryPointFile at $FileTitle" -ForegroundColor Green
        }
    }
}

Update-SingleEntryPoint -TargetDir $TargetProjectPath -FileTitle "Project"

if ($IsMultiRepo -and $RootPath -and (Test-Path $RootPath)) {
    Update-SingleEntryPoint -TargetDir $RootPath -FileTitle "Workspace Root"
}

# ---------------------------------------------------------------------------
# Step D: Upgrade code-review-graph & run init harness
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "  [UPDATE] Upgrading code-review-graph and re-syncing platform init..." -ForegroundColor Cyan

$InstalledInit = Join-Path $TargetAgentsDir "scripts\init-harness.ps1"
$InitArgs = @("-IDE", $SelectedIDE, "-InstallPath", $TargetProjectPath, "-SkipGraphBuild")
if ($IsMultiRepo)  { $InitArgs += "-SymlinkRoot" }
if ($RootPath)     { $InitArgs += @("-RootPath", $RootPath) }

if (Test-Path $InstalledInit) {
    & powershell -ExecutionPolicy Bypass -File $InstalledInit @InitArgs
}

# ---------------------------------------------------------------------------
# Step E: Rebuild Graph + Embeddings
# ---------------------------------------------------------------------------

$BuildDir = if ($IsMultiRepo -and $RootPath -and (Test-Path $RootPath)) { (Resolve-Path $RootPath).Path } else { $TargetProjectPath }

Write-Host ""
Write-Host "  [UPDATE] Rebuilding AST Graph + Embeddings for target: $BuildDir..." -ForegroundColor Cyan

$BuildIndexScript = Join-Path $TargetAgentsDir "scripts\build-index.ps1"
if (Test-Path $BuildIndexScript) {
    Push-Location $BuildDir
    try {
        & powershell -ExecutionPolicy Bypass -File $BuildIndexScript -IDE $SelectedIDE
    } finally {
        Pop-Location
    }
} else {
    Write-Host "  [WARN] build-index.ps1 not found. Skipping graph rebuild." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host "   AG KIT UPDATE COMPLETE!" -ForegroundColor Cyan
Write-Host "  ==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  What was updated:" -ForegroundColor Yellow
Write-Host "   + rules/, skills/, workflows/, agent/, scripts/, templates/" -ForegroundColor Green
Write-Host "   + ide/$SelectedIDE/ adapter" -ForegroundColor Green
Write-Host "   + code-review-graph (pip upgraded)" -ForegroundColor Green
Write-Host "   + AST Graph & Semantic Embeddings rebuilt" -ForegroundColor Green
if ($IsMultiRepo) {
    Write-Host "   + Workspace Symlink & Root Entry Point synced at: $RootPath" -ForegroundColor Green
}
Write-Host ""
Write-Host "  What was preserved:" -ForegroundColor Yellow
Write-Host "   ~ memory/, handoffs/, coordination/, indexes/, docs/" -ForegroundColor DarkGray
Write-Host "   ~ $EntryPointFile (append-only, user customizations kept)" -ForegroundColor DarkGray
Write-Host ""
