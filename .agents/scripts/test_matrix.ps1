# ===================================================================
# Test Suite: Verify Setup & Update Scripts across Multiple Matrix Cases
# ===================================================================

$ErrorActionPreference = "Stop"
$ScriptRoot = $PSScriptRoot
$SourceAgentsDir = (Resolve-Path (Join-Path $ScriptRoot "..")).Path
$TestTempBase = Join-Path $env:TEMP "ag_kit_verify_suite"

if (Test-Path $TestTempBase) {
    Remove-Item -Path $TestTempBase -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $TestTempBase -Force | Out-Null

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " RUNNING INTEGRATION VERIFICATION MATRIX SUITE" -ForegroundColor Cyan
Write-Host " Temp Workspace: $TestTempBase" -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

$passed = 0
$failed = 0

function Assert-Condition {
    param([bool]$Condition, [string]$Message)
    if ($Condition) {
        Write-Host "  [PASS] $Message" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host "  [FAIL] $Message" -ForegroundColor Red
        $script:failed++
    }
}

# Dynamically extract Invoke-Scaffold function definition from setup.ps1
$setupCode = Get-Content (Join-Path $SourceAgentsDir "scripts\setup.ps1") -Raw
$fnStart = $setupCode.IndexOf("function Invoke-Scaffold")
$fnEnd = $setupCode.IndexOf("# ---", $fnStart)
$fnDef = $setupCode.Substring($fnStart, $fnEnd - $fnStart)
Invoke-Expression $fnDef

# ---------------------------------------------------------------------------
# CASE 1: Antigravity - Single Repo Setup & Update
# ---------------------------------------------------------------------------
Write-Host "`n--- [CASE 1] Antigravity Single Repo ---" -ForegroundColor Yellow
$case1Path = Join-Path $TestTempBase "case1_antigravity_single"
New-Item -ItemType Directory -Path $case1Path -Force | Out-Null
$case1Agents = Join-Path $case1Path ".agents"

New-Item -ItemType Directory -Path $case1Agents -Force | Out-Null
Invoke-Scaffold -DestDir $case1Agents -IDE "antigravity" -SrcDir $SourceAgentsDir
& powershell -ExecutionPolicy Bypass -File (Join-Path $SourceAgentsDir "scripts\init-harness.ps1") -IDE antigravity -InstallPath $case1Path -SkipGraphBuild

# Assertions for Setup
Assert-Condition (Test-Path (Join-Path $case1Path "GEMINI.md")) "Case 1: GEMINI.md created at project root"
Assert-Condition (Test-Path (Join-Path $case1Agents "mcp_config.json")) "Case 1: mcp_config.json created in .agents"
Assert-Condition (-not (Test-Path (Join-Path $case1Path ".codex"))) "Case 1: .codex folder NOT created"
Assert-Condition (Test-Path (Join-Path $case1Agents "workflows")) "Case 1: .agents/workflows created for Antigravity"

# ---------------------------------------------------------------------------
# CASE 2: Codex - Single Repo Setup & Update
# ---------------------------------------------------------------------------
Write-Host "`n--- [CASE 2] OpenAI Codex Single Repo ---" -ForegroundColor Yellow
$case2Path = Join-Path $TestTempBase "case2_codex_single"
New-Item -ItemType Directory -Path $case2Path -Force | Out-Null
$case2Agents = Join-Path $case2Path ".agents"

New-Item -ItemType Directory -Path $case2Agents -Force | Out-Null
Invoke-Scaffold -DestDir $case2Agents -IDE "codex" -SrcDir $SourceAgentsDir
& powershell -ExecutionPolicy Bypass -File (Join-Path $SourceAgentsDir "scripts\init-harness.ps1") -IDE codex -InstallPath $case2Path -SkipGraphBuild

# Assertions for Setup
Assert-Condition (Test-Path (Join-Path $case2Path "AGENTS.md")) "Case 2: AGENTS.md created at project root"
Assert-Condition (-not (Test-Path (Join-Path $case2Path "GEMINI.md"))) "Case 2: GEMINI.md NOT created for Codex"
Assert-Condition (-not (Test-Path (Join-Path $case2Path ".codex"))) "Case 2: .codex folder NOT created for Codex"
Assert-Condition (Test-Path (Join-Path $case2Agents "workflows")) "Case 2: .agents/workflows created for Codex"

# ---------------------------------------------------------------------------
# CASE 3: Antigravity - Multi-Repo Workspace Setup & Update
# ---------------------------------------------------------------------------
Write-Host "`n--- [CASE 3] Antigravity Multi-Repo Workspace ---" -ForegroundColor Yellow
$case3Root = Join-Path $TestTempBase "case3_multi_root"
$case3Api  = Join-Path $case3Root "api"
New-Item -ItemType Directory -Path $case3Api -Force | Out-Null
$case3Agents = Join-Path $case3Api ".agents"

New-Item -ItemType Directory -Path $case3Agents -Force | Out-Null
Invoke-Scaffold -DestDir $case3Agents -IDE "antigravity" -SrcDir $SourceAgentsDir
& powershell -ExecutionPolicy Bypass -File (Join-Path $SourceAgentsDir "scripts\init-harness.ps1") -IDE antigravity -InstallPath $case3Api -SymlinkRoot -RootPath $case3Root -SkipGraphBuild

# Assertions for Multi-repo Setup
Assert-Condition (Test-Path (Join-Path $case3Root ".agents")) "Case 3: .agents Junction/Symlink created at Workspace Root"
Assert-Condition (Test-Path (Join-Path $case3Root "GEMINI.md")) "Case 3: GEMINI.md created at Workspace Root"
Assert-Condition (Test-Path (Join-Path $case3Api "GEMINI.md")) "Case 3: GEMINI.md created at Project Root"
Assert-Condition (-not (Test-Path (Join-Path $case3Root ".codex"))) "Case 3: .codex NOT created at Workspace Root"

# ---------------------------------------------------------------------------
# CASE 4: OpenAI Codex - Multi-Repo Workspace Setup & Update
# ---------------------------------------------------------------------------
Write-Host "`n--- [CASE 4] OpenAI Codex Multi-Repo Workspace ---" -ForegroundColor Yellow
$case4Root = Join-Path $TestTempBase "case4_multi_codex_root"
$case4App  = Join-Path $case4Root "app"
New-Item -ItemType Directory -Path $case4App -Force | Out-Null
$case4Agents = Join-Path $case4App ".agents"

New-Item -ItemType Directory -Path $case4Agents -Force | Out-Null
Invoke-Scaffold -DestDir $case4Agents -IDE "codex" -SrcDir $SourceAgentsDir
& powershell -ExecutionPolicy Bypass -File (Join-Path $SourceAgentsDir "scripts\init-harness.ps1") -IDE codex -InstallPath $case4App -SymlinkRoot -RootPath $case4Root -SkipGraphBuild

# Assertions for Multi-repo Codex
Assert-Condition (Test-Path (Join-Path $case4Root ".agents")) "Case 4: .agents Junction/Symlink created at Workspace Root"
Assert-Condition (Test-Path (Join-Path $case4Root "AGENTS.md")) "Case 4: AGENTS.md created at Workspace Root"
Assert-Condition (Test-Path (Join-Path $case4App "AGENTS.md")) "Case 4: AGENTS.md created at Project Root"
Assert-Condition (-not (Test-Path (Join-Path $case4Root "GEMINI.md"))) "Case 4: GEMINI.md NOT created at Workspace Root for Codex"
Assert-Condition (-not (Test-Path (Join-Path $case4Root ".codex"))) "Case 4: .codex NOT created at Workspace Root"

# ---------------------------------------------------------------------------
# CASE 5: Idempotency & User Customization Protection
# ---------------------------------------------------------------------------
Write-Host "`n--- [CASE 5] Idempotency & Customization Protection ---" -ForegroundColor Yellow
$case5Path = Join-Path $TestTempBase "case5_idempotency"
New-Item -ItemType Directory -Path $case5Path -Force | Out-Null
$customContent = "# Custom User Title`n`nMy custom user rule here.`n`n<!-- code-review-graph MCP tools -->`nExisting section"
Set-Content -Path (Join-Path $case5Path "GEMINI.md") -Value $customContent -Encoding UTF8

& powershell -ExecutionPolicy Bypass -File (Join-Path $SourceAgentsDir "scripts\init-harness.ps1") -IDE antigravity -InstallPath $case5Path -SkipGraphBuild

$postContent = Get-Content (Join-Path $case5Path "GEMINI.md") -Raw
Assert-Condition ($postContent -match "My custom user rule here") "Case 5: User custom rules preserved"
Assert-Condition ($postContent -match "\.agents/rules/core-protocol") "Case 5: AG Kit entry point appended without destroying custom rules"
Assert-Condition (([regex]::Matches($postContent, "<!-- code-review-graph MCP tools -->")).Count -eq 1) "Case 5: MCP marker NOT duplicated"

# ---------------------------------------------------------------------------
# SUMMARY REPORT
# ---------------------------------------------------------------------------
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " INTEGRATION VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host " Total Passed : $passed" -ForegroundColor Green
Write-Host " Total Failed : $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "==========================================" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
