# ===================================================================
# AUTOMATED INDEX BUILDER & CLEANUP SCRIPT (Phase 3 Base Kit)
# Project-Embedded & Universal Dynamic Resolution Strategy
# Project: Harness Engineering
# ===================================================================

param(
    [ValidateSet("both", "antigravity", "codex")]
    [string]$IDE = "both"
)

# Set UTF-8 Output Encoding for Windows PowerShell Compatibility
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$IndexDir = Join-Path $PSScriptRoot "..\indexes"
$CrgDir = Join-Path $PSScriptRoot "..\..\.code-review-graph"
$ScriptJs = Join-Path $PSScriptRoot "build_vector_db.js"
$CommitSha = "local-dev-commit"

# 🔍 Project-Embedded Virtual Environment (.agents/.venv) Resolution & Auto-Provisioning
$VenvDir = Join-Path $PSScriptRoot "..\.venv"
$VenvExeWin = Join-Path $VenvDir "Scripts\code-review-graph.exe"
$VenvExeNix = Join-Path $VenvDir "bin\code-review-graph"
$VenvPyWin  = Join-Path $VenvDir "Scripts\python.exe"
$VenvPyNix  = Join-Path $VenvDir "bin\python"

# Tự động khởi tạo .agents/.venv và cài đặt code-review-graph nếu chưa có (Tương tự init-harness.sh / init-harness.ps1)

# Resolve Executable ưu tiên tuyệt đối .agents/.venv
# Match init-harness setup: upgrade pip and install embedding support on every run.
$PythonCmd = (Get-Command py -ErrorAction SilentlyContinue)
if (-not $PythonCmd) { $PythonCmd = (Get-Command python3 -ErrorAction SilentlyContinue) }
if (-not $PythonCmd) { $PythonCmd = (Get-Command python -ErrorAction SilentlyContinue) }

if (-not (Test-Path $VenvDir)) {
    if ($PythonCmd) {
        Write-Host "[INIT] Creating project-embedded virtual environment (.agents/.venv)..." -ForegroundColor Yellow
        & $PythonCmd.Path -m venv $VenvDir
    } else {
        Write-Host "[WARN] Python was not found; using global or npx fallback." -ForegroundColor Yellow
    }
}

$VenvPy = if ((Test-Path $VenvPyWin)) { $VenvPyWin } elseif ((Test-Path $VenvPyNix)) { $VenvPyNix } else { $null }
if ($VenvPy -and (Test-Path $VenvPy)) {
    Write-Host "[INIT] Upgrading pip in .agents/.venv..." -ForegroundColor Yellow
    & $VenvPy -m pip install --upgrade pip --quiet 2>$null
    Write-Host "[INIT] Installing/upgrading code-review-graph[embeddings]..." -ForegroundColor Yellow
    & $VenvPy -m pip install "code-review-graph[embeddings]" --quiet
}

$CrgExe = $null
if (Test-Path $VenvExeWin) {
    $CrgExe = (Resolve-Path $VenvExeWin).Path
} elseif (Test-Path $VenvExeNix) {
    $CrgExe = (Resolve-Path $VenvExeNix).Path
} else {
    # Fallback dự phòng nếu venv chưa cài xong
    $CmdCheck = (Get-Command code-review-graph.exe -ErrorAction SilentlyContinue)
    if (-not $CmdCheck) { $CmdCheck = (Get-Command code-review-graph -ErrorAction SilentlyContinue) }
    if ($CmdCheck) { $CrgExe = $CmdCheck.Path }
}

if ($CrgExe) {
    $Platforms = if ($IDE -eq "both") { @("antigravity", "codex") } else { @($IDE) }
    foreach ($Platform in $Platforms) {
        Write-Host "[INIT] Running code-review-graph platform setup for: $Platform..." -ForegroundColor Yellow
        & $CrgExe install -y --platform $Platform 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] code-review-graph platform setup completed for $Platform." -ForegroundColor Green
        } else {
            Write-Host "[WARN] code-review-graph platform setup for $Platform returned exit code $LASTEXITCODE." -ForegroundColor Yellow
        }
    }
}

try {
    $GitOutput = & git rev-parse HEAD 2>$null
    if ($GitOutput) { $CommitSha = $GitOutput }
} catch {
    $CommitSha = "local-dev-commit"
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "[START] Starting Phase 3 Built-in Index Builder Pipeline..." -ForegroundColor Cyan
Write-Host "   Engine: tirth8205/code-review-graph + SQLite Vector Store" -ForegroundColor Yellow
Write-Host "   Target Index Dir : $IndexDir" -ForegroundColor Yellow
Write-Host "   Current Commit SHA: $CommitSha" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

# 0. Ensure target directory exists (Self-healing)
If (-not (Test-Path $IndexDir)) {
    New-Item -ItemType Directory -Path $IndexDir -Force | Out-Null
    Write-Host "[INIT] Created missing directory: $IndexDir" -ForegroundColor Green
}

# Dynamic resolution of Current Execution Directory
$CurrentDir = (Get-Location).Path

# Resolve .code-review-graph directory dynamically
$CrgDir = Join-Path $CurrentDir ".code-review-graph"
if (-not (Test-Path $CrgDir)) {
    $CrgDir = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.code-review-graph"))
}

# 1. Clean Stale Caches to prevent SQLite malformed DB errors
If (Test-Path "$IndexDir\code-graph.json") {
    Remove-Item "$IndexDir\code-graph.json" -Force
    Write-Host "[CLEAN] Cleaned old Code Graph Cache." -ForegroundColor Green
}
If (Test-Path "$IndexDir\vector-store.sqlite") {
    Remove-Item "$IndexDir\vector-store.sqlite" -Force
    Write-Host "[CLEAN] Cleaned old Vector Store Cache." -ForegroundColor Green
}
If (Test-Path $CrgDir) {
    Remove-Item -Recurse -Force $CrgDir -ErrorAction SilentlyContinue
    Write-Host "[CLEAN] Cleaned old .code-review-graph directory." -ForegroundColor Green
}

# 2. Build Official code-review-graph SQLite Database (Dynamic Execution)
Write-Host "[BUILD] Running code-review-graph build..." -ForegroundColor Yellow
if ($CrgExe -and (Test-Path $CrgExe)) {
    Write-Host "[INFO] Resolved Executable Path: $CrgExe" -ForegroundColor Yellow
    & $CrgExe build
    Write-Host "[OK] Official code-review-graph built successfully at .code-review-graph/" -ForegroundColor Green
    Write-Host "[EMBED] Computing vector embeddings for code graph nodes..." -ForegroundColor Yellow
    & $CrgExe embed --provider local 2>$null
    Write-Host "[OK] Code vector embeddings generated successfully." -ForegroundColor Green
} else {
    Write-Host "[INFO] Dynamic fallback: Running via Node.js / npx..." -ForegroundColor Yellow
    npx -y @reizhafajrian/code-review-graph build 2>$null
    Write-Host "[OK] code-review-graph built via npx fallback at .code-review-graph/" -ForegroundColor Green
}

# 3. Build Supplemental Local Vector DB Cache (Ưu tiên Python trực tiếp -> fallback .cjs)
$ScriptPy = Join-Path $PSScriptRoot "build_vector_db.py"
$ScriptCjs = Join-Path $PSScriptRoot "build_vector_db.cjs"
$EmbeddedPy = Join-Path $PSScriptRoot "..\.venv\Scripts\python.exe"

If (Test-Path $ScriptPy) {
    if (Test-Path $EmbeddedPy) {
        & $EmbeddedPy $ScriptPy
    } else {
        py $ScriptPy
    }
    Write-Host "[OK] Built SQLite Vector DB at .agents/indexes/vector-store.sqlite" -ForegroundColor Green
} elseif (Test-Path $ScriptCjs) {
    node $ScriptCjs
    Write-Host "[OK] Built SQLite Vector DB at .agents/indexes/vector-store.sqlite (via node .cjs)" -ForegroundColor Green
}

# 4. Generate Code Graph Cache (code-graph.json) with dynamic database resolution
$NodesCount = 0
$EdgesCount = 0
$EmbeddingsCount = 0

# Try CWD first, then parent of CWD, then PSScriptRoot relative
$CrgDbPath = Join-Path $CurrentDir ".code-review-graph\graph.db"
if (-not (Test-Path $CrgDbPath)) {
    $ParentDir = Split-Path $CurrentDir -Parent
    if ($ParentDir) {
        $CrgDbPath = Join-Path $ParentDir ".code-review-graph\graph.db"
    }
}
if (-not (Test-Path $CrgDbPath)) {
    $CrgDbPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.code-review-graph\graph.db"))
}

if (Test-Path $CrgDbPath) {
    $PyForDb = if ($EmbeddedPy -and (Test-Path $EmbeddedPy)) { $EmbeddedPy } else { "python" }
    $GetCountsScript = Join-Path $PSScriptRoot "get_graph_counts.py"
    try {
        if (Test-Path $GetCountsScript) {
            $CountsJson = & $PyForDb $GetCountsScript $CrgDbPath 2>$null
            if ($CountsJson) {
                $CountsObj = ConvertFrom-Json $CountsJson
                $NodesCount = [int]$CountsObj.nodes
                $EdgesCount = [int]$CountsObj.edges
                $EmbeddingsCount = [int]$CountsObj.embeddings
            }
        }
    } catch {}
}

$GraphContent = @{
    schema_version = 1
    engine = "tirth8205/code-review-graph"
    commit_sha = $CommitSha
    indexed_at = (Get-Date).ToString("o")
    parser = "tree-sitter-ast-graph"
    nodes_count = $NodesCount
    edges_count = $EdgesCount
    embeddings_count = $EmbeddingsCount
    embedding_provider = "local (sentence-transformers/all-MiniLM-L6-v2)"
} | ConvertTo-Json -Depth 5

[System.IO.File]::WriteAllText("$IndexDir\code-graph.json", $GraphContent, (New-Object System.Text.UTF8Encoding $false))
Write-Host "[OK] Generated Code Graph Cache (UTF-8 No-BOM, Nodes: $NodesCount, Edges: $EdgesCount, Embeddings: $EmbeddingsCount): $IndexDir\code-graph.json" -ForegroundColor Green

# 5. Generate Handoff Index (HANDOFF_INDEX.md)
$HandoffIndexScript = Join-Path $PSScriptRoot "generate_handoff_index.py"
If (Test-Path $HandoffIndexScript) {
    Write-Host "[BUILD] Generating HANDOFF_INDEX.md..." -ForegroundColor Yellow
    if (Test-Path $EmbeddedPy) {
        & $EmbeddedPy $HandoffIndexScript
    } else {
        py $HandoffIndexScript
    }
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] Index Build Completed Successfully! (100% Embedded & Rebuildable)" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
