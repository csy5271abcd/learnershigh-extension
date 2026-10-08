param(
    [switch]$Strict,
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$SkipTests
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message"
}

function Write-Warn {
    param([string]$Message)
    Write-Warning $Message
}

function Get-RepositoryRoot {
    return (Split-Path -Parent $PSScriptRoot)
}

function Test-RequiredHarnessFiles {
    param([string]$RepoRoot)

    $required = @(
        "CLAUDE.md",
        "README.md",
        ".gitignore",
        ".claude/settings.json",

        ".claude/rules/common.md",
        ".claude/rules/frontend-student.md",
        ".claude/rules/frontend-admin.md",
        ".claude/rules/frontend-mentor.md",
        ".claude/rules/backend.md",
        ".claude/rules/database.md",
        ".claude/rules/testing.md",

        "docs/SOURCE_OF_TRUTH.md",
        "docs/OWNERSHIP.md",

        "docs/architecture/overview.md",
        "docs/architecture/integration-boundary.md",
        "docs/architecture/shared-conventions.md",

        "docs/design/tds-web-guidelines.md",
        "docs/api/api-contract.md",

        "docs/specs/suyeon/domain.md",
        "docs/specs/suyeon/progress.md",
        "docs/specs/suyeon/features/mentor-hub.md",
        "docs/specs/suyeon/features/school-admissions.md",
        "docs/specs/suyeon/features/student-management.md",
        "docs/specs/suyeon/features/parent-progress.md",

        "docs/adr/README.md",
        "docs/adr/0001-separate-student-admin-mentor-surfaces.md",
        "docs/adr/0002-existing-learnershigh-integration-boundary.md",
        "docs/adr/0003-shared-feedback-queue.md",
        "docs/adr/0004-parent-report-without-parent-app.md",

        "scripts/verify.ps1",
        "scripts/verify-frontend.ps1",
        "scripts/verify-backend.ps1"
    )

    $missing = New-Object System.Collections.Generic.List[string]

    foreach ($relative in $required) {
        $fullPath = Join-Path $RepoRoot $relative

        if (-not (Test-Path -LiteralPath $fullPath)) {
            $missing.Add($relative)
        }
    }

    return $missing
}

function Test-ForbiddenCodeDirectories {
    param([string]$RepoRoot)

    $violations = New-Object System.Collections.Generic.List[string]
    $searchRoots = @(
        (Join-Path $RepoRoot "frontend"),
        (Join-Path $RepoRoot "backend")
    )

    foreach ($searchRoot in $searchRoots) {
        if (-not (Test-Path -LiteralPath $searchRoot)) {
            continue
        }

        $directories = Get-ChildItem -LiteralPath $searchRoot -Directory -Recurse -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Name -in @("suyeon", "wangyu", "ext")
            }

        foreach ($directory in $directories) {
            $relative = $directory.FullName.Substring($RepoRoot.Length).TrimStart("\", "/")
            $violations.Add($relative)
        }
    }

    return $violations
}

function Test-LocalClaudeSettingsTracked {
    param([string]$RepoRoot)

    if ($null -eq (Get-Command "git" -ErrorAction SilentlyContinue)) {
        return $false
    }

    $gitDir = Join-Path $RepoRoot ".git"

    if (-not (Test-Path -LiteralPath $gitDir)) {
        return $false
    }

    Push-Location $RepoRoot

    try {
        $tracked = & git ls-files -- ".claude/settings.local.json"

        if ($LASTEXITCODE -ne 0) {
            return $false
        }

        return -not [string]::IsNullOrWhiteSpace(($tracked -join ""))
    }
    finally {
        Pop-Location
    }
}

$repoRoot = Get-RepositoryRoot
$failures = New-Object System.Collections.Generic.List[string]

Write-Host "LearnersHigh Full Verification" -ForegroundColor Green
Write-Info "Repository: $repoRoot"
Write-Info "Strict mode: $Strict"
Write-Info "Skip tests: $SkipTests"

Write-Step "Harness file validation"

$missingFiles = @(Test-RequiredHarnessFiles -RepoRoot $repoRoot)

if ($missingFiles.Count -gt 0) {
    $message = "필수 Harness 파일이 없습니다:`n- " + ($missingFiles -join "`n- ")
    $failures.Add($message)
}
else {
    Write-Info "Required Harness files: PASS"
}

Write-Step "Code directory convention"

$forbiddenDirectories = @(Test-ForbiddenCodeDirectories -RepoRoot $repoRoot)

if ($forbiddenDirectories.Count -gt 0) {
    $message = @"
사람 이름 또는 ext 기반 code directory가 발견되었습니다:
- $($forbiddenDirectories -join "`n- ")

Source Code는 Feature / Domain 기준으로 구성하세요.
"@
    $failures.Add($message)
}
else {
    Write-Info "Feature / Domain directory convention: PASS"
}

Write-Step "Local Claude settings tracking"

if (Test-LocalClaudeSettingsTracked -RepoRoot $repoRoot) {
    $failures.Add(".claude/settings.local.json이 Git에 추적되고 있습니다. local 설정은 Git에서 제외하세요.")
}
else {
    Write-Info "settings.local.json Git tracking: PASS"
}

if (-not $SkipFrontend) {
    Write-Step "Frontend verification"

    $frontendScript = Join-Path $PSScriptRoot "verify-frontend.ps1"

    try {
        & $frontendScript -Strict:$Strict -SkipTests:$SkipTests
    }
    catch {
        $failures.Add("Frontend verification 실패:`n$($_.Exception.Message)")
    }
}
else {
    Write-Warn "Frontend verification을 요청에 따라 건너뜁니다."
}

if (-not $SkipBackend) {
    Write-Step "Backend verification"

    $backendScript = Join-Path $PSScriptRoot "verify-backend.ps1"

    try {
        & $backendScript -Strict:$Strict -SkipTests:$SkipTests
    }
    catch {
        $failures.Add("Backend verification 실패:`n$($_.Exception.Message)")
    }
}
else {
    Write-Warn "Backend verification을 요청에 따라 건너뜁니다."
}

Write-Host ""

if ($failures.Count -gt 0) {
    Write-Host "Verification FAILED" -ForegroundColor Red
    Write-Host ""

    $index = 1

    foreach ($failure in $failures) {
        Write-Host "[$index] $failure" -ForegroundColor Red
        Write-Host ""
        $index++
    }

    throw "LearnersHigh verification failed with $($failures.Count) failure(s)."
}

Write-Host "Verification PASS" -ForegroundColor Green

if (-not $Strict) {
    Write-Info "Non-strict mode에서는 아직 scaffold가 없는 Frontend/Backend를 skip할 수 있습니다."
    Write-Info "CI 또는 구현 완료 검증에서는 -Strict 사용을 권장합니다."
}
