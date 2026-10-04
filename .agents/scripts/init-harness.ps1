# ===================================================================
# HARNESS AGENT BASE KIT INITIALIZATION SCRIPT (Windows PowerShell)
# Automatically creates .agents/.venv, installs code-review-graph,
# scaffolds root files (entry point, CODEOWNERS, AI_SYSTEM_MANIFEST),
# verifies MCP configuration, and builds Vector DB + AST Graph.
# ===================================================================

param(
    [switch]$SymlinkRoot,
    [string]$RootPath = "",
    [switch]$SkipGraphBuild,
    [ValidateSet("antigravity", "codex")][string]$IDE = "antigravity",
    [string]$InstallPath = ""
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptRoot = $PSScriptRoot
$AgentsDir = (Resolve-Path (Join-Path $ScriptRoot "..")).Path

# Resolve ProjectRoot: prefer -InstallPath, then fallback to parent of .agents
if ($InstallPath -and (Test-Path $InstallPath)) {
    $ProjectRoot = (Resolve-Path $InstallPath).Path
} else {
    $ProjectRoot = (Resolve-Path (Join-Path $AgentsDir "..")).Path
}

$VenvDir = Join-Path $AgentsDir ".venv"
$VenvExe = Join-Path $VenvDir "Scripts\code-review-graph.exe"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"
$BuildIndexScript = Join-Path $ScriptRoot "build-index.ps1"

# IDE adapter: entry point file name and template path
$IDEEntryPointName = if ($IDE -eq "codex") { "AGENTS.md" } else { "GEMINI.md" }
$IDETemplatePath = Join-Path $AgentsDir "ide\$IDE\entry-point.md"

Write-Host "===================================================="  -ForegroundColor Cyan
Write-Host " HARNESS AGENT BASE KIT INITIALIZATION PIPELINE"  -ForegroundColor Cyan
Write-Host " Target Project: $ProjectRoot"                     -ForegroundColor Yellow
Write-Host " Agents Root   : $AgentsDir"                      -ForegroundColor Yellow
Write-Host " IDE           : $IDE"                            -ForegroundColor Yellow
Write-Host " Entry Point   : $IDEEntryPointName"              -ForegroundColor Yellow
Write-Host "===================================================="  -ForegroundColor Cyan

# Step 1: Check Python availability
Write-Host "[1/6] Checking Python installation..." -ForegroundColor Yellow
$PythonCmd = (Get-Command py -ErrorAction SilentlyContinue)
if (-not $PythonCmd) { $PythonCmd = (Get-Command python -ErrorAction SilentlyContinue) }

if (-not $PythonCmd) {
    Write-Host "[ERROR] Python 3 is not installed or not in PATH. Please install Python 3.10+." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Detected Python executable: $($PythonCmd.Path)" -ForegroundColor Green

# Step 2: Create .agents/.venv if missing
Write-Host "[2/6] Setting up project-embedded virtual environment (.agents/.venv)..." -ForegroundColor Yellow
if (-not (Test-Path $VenvDir)) {
    Write-Host "[INIT] Creating virtual environment at $VenvDir..." -ForegroundColor Yellow
    & $PythonCmd.Path -m venv $VenvDir
    Write-Host "[OK] Virtual environment created successfully." -ForegroundColor Green
} else {
    Write-Host "[OK] Existing virtual environment found at $VenvDir." -ForegroundColor Green
}

# Step 3: Install/Upgrade code-review-graph
Write-Host "[3/6] Installing/Upgrading tirth8205/code-review-graph..." -ForegroundColor Yellow
& $VenvPython -m pip install --upgrade pip --quiet 2>$null
& $VenvPython -m pip install "code-review-graph[embeddings]" --quiet
if (Test-Path $VenvExe) {
    Write-Host "[OK] Executable code-review-graph ready at: $VenvExe" -ForegroundColor Green
    Write-Host "[INIT] Running code-review-graph install for platform: $IDE..." -ForegroundColor Yellow
    & $VenvExe install -y --platform $IDE 2>$null
    Write-Host "[OK] code-review-graph platform setup completed." -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to install code-review-graph into virtual environment." -ForegroundColor Red
    exit 1
}

# Step 4: Scaffolding Root Project Files (Entry Point, CODEOWNERS, AI_SYSTEM_MANIFEST, .gitignore)
Write-Host "[4/6] Scaffolding root project files ($IDEEntryPointName, CODEOWNERS, AI_SYSTEM_MANIFEST.yaml, .gitignore)..." -ForegroundColor Yellow

# Load entry point content from IDE adapter template
$EntryPointPath = Join-Path $ProjectRoot $IDEEntryPointName
if (Test-Path $IDETemplatePath) {
    $EntryPointContent = Get-Content $IDETemplatePath -Raw -Encoding UTF8
} else {
    Write-Host "[WARN] IDE template not found at $IDETemplatePath. Using built-in fallback." -ForegroundColor Yellow
    $EntryPointContent = "# AG Kit Entry Point`n`n@.agents/rules/core-protocol.md`n@.agents/rules/coding-standards.md`n@.agents/memory/MEMORY.md"
}

$CRGMarker = "<!-- code-review-graph MCP tools -->"
if (Test-Path $EntryPointPath) {
    $ExistingContent = Get-Content $EntryPointPath -Raw -ErrorAction SilentlyContinue
    if ($ExistingContent -notmatch "\.agents/rules/core-protocol") {
        $AppendText = $EntryPointContent
        if (($ExistingContent -match [regex]::Escape($CRGMarker)) -and ($AppendText -match [regex]::Escape($CRGMarker))) {
            $mIdx = $AppendText.IndexOf($CRGMarker)
            if ($mIdx -ge 0) {
                $AppendText = $AppendText.Substring(0, $mIdx).TrimEnd()
            }
        }
        Add-Content -Path $EntryPointPath -Value "`n$AppendText" -Encoding UTF8
        Write-Host "[OK] Appended AG Kit entry points to existing $IDEEntryPointName (No Overwrite)." -ForegroundColor Green
    } else {
        Write-Host "[OK] $IDEEntryPointName already contains AG Kit entry points." -ForegroundColor Green
    }
} else {
    Set-Content -Path $EntryPointPath -Value $EntryPointContent -Encoding UTF8
    Write-Host "[OK] Created new $IDEEntryPointName at project root." -ForegroundColor Green
}

# Keep $GeminiContent for use in SymlinkRoot scaffold (backward compat)
$GeminiContent = $EntryPointContent

# Scaffolding CODEOWNERS
$CodeownersPath = Join-Path $ProjectRoot "CODEOWNERS"
if (-not (Test-Path $CodeownersPath)) {
    $CodeownersContent = @"
# Project Code Owners
* @tech-lead
.agents/ @tech-lead
"@
    Set-Content -Path $CodeownersPath -Value $CodeownersContent -Encoding UTF8
    Write-Host "[OK] Created CODEOWNERS at project root." -ForegroundColor Green
}

# Scaffolding AI_SYSTEM_MANIFEST.yaml
$ManifestPath = Join-Path $ProjectRoot "AI_SYSTEM_MANIFEST.yaml"
if (-not (Test-Path $ManifestPath)) {
    $ManifestContent = @"
version: "1.0.0"
kit_version: "1.0.0"
maturity_level: "M3"
capabilities:
  shared_mcp: true
  vector_indexing: true
  ast_code_graph: true
  runtime_isolation: true
"@
    Set-Content -Path $ManifestPath -Value $ManifestContent -Encoding UTF8
    Write-Host "[OK] Created AI_SYSTEM_MANIFEST.yaml at project root." -ForegroundColor Green
}

# Updating .gitignore
$GitignorePath = Join-Path $ProjectRoot ".gitignore"
$GitignoreEntries = @"

# Harness Agent Kit Local Cache & Index Files
.agents/.venv/
.code-review-graph/
.agents/indexes/*.sqlite
.agents/indexes/*.json
"@

if (Test-Path $GitignorePath) {
    $GitignoreContent = Get-Content $GitignorePath -Raw -ErrorAction SilentlyContinue
    if ($GitignoreContent -notmatch "\.agents/\.venv/") {
        Add-Content -Path $GitignorePath -Value $GitignoreEntries -Encoding UTF8
        Write-Host "[OK] Appended Kit cache ignores to existing .gitignore" -ForegroundColor Green
    }
} else {
    Set-Content -Path $GitignorePath -Value $GitignoreEntries.TrimStart() -Encoding UTF8
    Write-Host "[OK] Created new .gitignore at project root." -ForegroundColor Green
}

# Step 5: Check MCP Server configuration
Write-Host "[5/6] Verifying MCP Server configuration (.agents/mcp_config.json)..." -ForegroundColor Yellow
$McpConfigPath = Join-Path $AgentsDir "mcp_config.json"
if (Test-Path $McpConfigPath) {
    Write-Host "[OK] MCP Configuration file found at: $McpConfigPath" -ForegroundColor Green
} else {
    Write-Host "[WARN] MCP Configuration file missing at $McpConfigPath. Please generate it." -ForegroundColor Yellow
}

# Optional Step: Create Symlink to Workspace Root (for Multi-Repo setups)
# Optional Step: Create Symlink to Workspace Root (for Multi-Repo setups)
if ($SymlinkRoot) {
    Write-Host "[OPTIONAL] Creating Symlink & Scaffolding Workspace Root..." -ForegroundColor Yellow
    $TargetRoot = if ($RootPath -and (Test-Path $RootPath)) { (Resolve-Path $RootPath).Path } else { Split-Path $ProjectRoot -Parent }
    $RootSymlink = Join-Path $TargetRoot ".agents"

    if (Test-Path $RootSymlink) {
        Write-Host "[OK] Symlink or folder already exists at: $RootSymlink" -ForegroundColor Green
    } else {
        try {
            New-Item -ItemType SymbolicLink -Path $RootSymlink -Value $AgentsDir -ErrorAction Stop | Out-Null
            Write-Host "[OK] Created Symlink: $RootSymlink -> $AgentsDir" -ForegroundColor Green
        } catch {
            try {
                New-Item -ItemType Junction -Path $RootSymlink -Value $AgentsDir -ErrorAction Stop | Out-Null
                Write-Host "[OK] Created Junction: $RootSymlink -> $AgentsDir" -ForegroundColor Green
            } catch {
                $ErrMsg = $_.Exception.Message
                Write-Host "[ERROR] Could not create Symlink/Junction at ${RootSymlink}. Details: ${ErrMsg}" -ForegroundColor Red
            }
        }
    }

    # Scaffold IDE Entry Point at Workspace Root (AGENTS.md for Codex, GEMINI.md for Antigravity)
    $RootEntryPointPath = Join-Path $TargetRoot $IDEEntryPointName
    if (Test-Path $RootEntryPointPath) {
        $ExistingRootContent = Get-Content $RootEntryPointPath -Raw -ErrorAction SilentlyContinue
        if ($ExistingRootContent -notmatch "\.agents/rules/core-protocol") {
            $AppendRootText = $EntryPointContent
            if (($ExistingRootContent -match [regex]::Escape($CRGMarker)) -and ($AppendRootText -match [regex]::Escape($CRGMarker))) {
                $mIdx = $AppendRootText.IndexOf($CRGMarker)
                if ($mIdx -ge 0) {
                    $AppendRootText = $AppendRootText.Substring(0, $mIdx).TrimEnd()
                }
            }
            Add-Content -Path $RootEntryPointPath -Value "`n$AppendRootText" -Encoding UTF8
            Write-Host "[OK] Appended AG Kit entry points to Root $IDEEntryPointName" -ForegroundColor Green
        } else {
            Write-Host "[OK] Root $IDEEntryPointName already contains AG Kit entry points." -ForegroundColor Green
        }
    } else {
        Set-Content -Path $RootEntryPointPath -Value $EntryPointContent.TrimStart() -Encoding UTF8
        Write-Host "[OK] Created new $IDEEntryPointName at Workspace Root." -ForegroundColor Green
    }

    # Scaffold AI_SYSTEM_MANIFEST.yaml at Workspace Root
    $RootManifestPath = Join-Path $TargetRoot "AI_SYSTEM_MANIFEST.yaml"
    if (-not (Test-Path $RootManifestPath)) {
        Set-Content -Path $RootManifestPath -Value $ManifestContent -Encoding UTF8
        Write-Host "[OK] Created AI_SYSTEM_MANIFEST.yaml at Workspace Root." -ForegroundColor Green
    }
}

# Step 6: Build Index & Code Graph
if (-not $SkipGraphBuild) {
    $BuildDir = if ($SymlinkRoot -and $TargetRoot -and (Test-Path $TargetRoot)) { $TargetRoot } else { $ProjectRoot }
    Write-Host "[6/6] Rebuilding SQLite Vector Store & AST Code Graph for target: $BuildDir..." -ForegroundColor Yellow
    if (Test-Path $BuildIndexScript) {
        Push-Location $BuildDir
        try {
            & powershell -ExecutionPolicy Bypass -File $BuildIndexScript -IDE $IDE
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "[WARN] build-index.ps1 script not found at $BuildIndexScript." -ForegroundColor Yellow
    }
} else {
    Write-Host "[6/6] Skipped SQLite Vector Store & AST Code Graph build (-SkipGraphBuild active)." -ForegroundColor Yellow
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " HARNESS AGENT BASE KIT INITIALIZATION COMPLETE!" -ForegroundColor Cyan
Write-Host " Root Scaffolding & Embedded Tools Status:" -ForegroundColor Yellow
Write-Host "   - GEMINI.md Entry Point: Configured (Appended/Preserved)" -ForegroundColor Green
Write-Host "   - Code Review Graph    : $VenvExe" -ForegroundColor Green
Write-Host "   - Vector Store DB      : $AgentsDir\indexes\vector-store.sqlite" -ForegroundColor Green
if ($SymlinkRoot) {
    Write-Host "   - Workspace Symlink    : Created at $TargetRoot\.agents" -ForegroundColor Green
}
Write-Host "====================================================" -ForegroundColor Cyan
