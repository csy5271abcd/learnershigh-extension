param(
    [switch]$Strict,
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

function Read-PackageJson {
    param([string]$PackageJsonPath)

    try {
        return (Get-Content -LiteralPath $PackageJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json)
    }
    catch {
        throw "package.json을 읽을 수 없습니다: $PackageJsonPath`n$($_.Exception.Message)"
    }
}

function Find-PackageManager {
    param(
        [string]$ProjectDir,
        [object]$PackageJson,
        [string]$StopDir
    )

    $packageManagerProperty = $PackageJson.PSObject.Properties["packageManager"]

    if ($null -ne $packageManagerProperty) {
        $packageManager = [string]$packageManagerProperty.Value

        if ($packageManager -match '^npm@')  { return "npm" }
        if ($packageManager -match '^pnpm@') { return "pnpm" }
        if ($packageManager -match '^yarn@') { return "yarn" }
        if ($packageManager -match '^bun@')  { return "bun" }
    }

    $current = (Resolve-Path -LiteralPath $ProjectDir).Path
    $stop = (Resolve-Path -LiteralPath $StopDir).Path

    while ($true) {
        if (Test-Path -LiteralPath (Join-Path $current "pnpm-lock.yaml")) {
            return "pnpm"
        }

        if (Test-Path -LiteralPath (Join-Path $current "yarn.lock")) {
            return "yarn"
        }

        if (Test-Path -LiteralPath (Join-Path $current "package-lock.json")) {
            return "npm"
        }

        if (Test-Path -LiteralPath (Join-Path $current "bun.lockb")) {
            return "bun"
        }

        if (Test-Path -LiteralPath (Join-Path $current "bun.lock")) {
            return "bun"
        }

        if ($current -eq $stop) {
            break
        }

        $parent = Split-Path -Parent $current

        if ([string]::IsNullOrWhiteSpace($parent) -or $parent -eq $current) {
            break
        }

        $current = $parent
    }

    return $null
}

function Assert-CommandAvailable {
    param([string]$Command)

    if ($null -eq (Get-Command $Command -ErrorAction SilentlyContinue)) {
        throw "필요한 명령을 찾을 수 없습니다: $Command"
    }
}

function Get-AvailableScripts {
    param([object]$PackageJson)

    $result = @{}

    $scriptsProperty = $PackageJson.PSObject.Properties["scripts"]

    if ($null -eq $scriptsProperty -or $null -eq $scriptsProperty.Value) {
        return $result
    }

    foreach ($property in $scriptsProperty.Value.PSObject.Properties) {
        $result[$property.Name] = [string]$property.Value
    }

    return $result
}

function Invoke-PackageScript {
    param(
        [string]$PackageManager,
        [string]$ScriptName,
        [string]$WorkingDirectory
    )

    Write-Step "$WorkingDirectory :: $ScriptName"

    Push-Location $WorkingDirectory

    try {
        switch ($PackageManager) {
            "npm" {
                & npm run $ScriptName
            }
            "pnpm" {
                & pnpm run $ScriptName
            }
            "yarn" {
                & yarn run $ScriptName
            }
            "bun" {
                & bun run $ScriptName
            }
            default {
                throw "지원하지 않는 package manager입니다: $PackageManager"
            }
        }

        if ($LASTEXITCODE -ne 0) {
            throw "Frontend script 실패: $ScriptName (exit code: $LASTEXITCODE)"
        }
    }
    finally {
        Pop-Location
    }
}

function Get-FrontendProjects {
    param([string]$FrontendDir)

    $frontendPackage = Join-Path $FrontendDir "package.json"

    # frontend/package.json이 있으면 workspace/root package를 우선 사용한다.
    # root script가 하위 package를 orchestration하는 구조일 가능성이 있으므로
    # 같은 검증을 중복 실행하지 않는다.
    if (Test-Path -LiteralPath $frontendPackage) {
        return @($frontendPackage)
    }

    $allPackages = Get-ChildItem -LiteralPath $FrontendDir -Filter "package.json" -File -Recurse |
        Where-Object {
            $_.FullName -notmatch '[\\/](node_modules|dist|build|coverage|\.vite)[\\/]'
        } |
        Sort-Object FullName

    return @($allPackages.FullName)
}

$repoRoot = Get-RepositoryRoot
$frontendDir = Join-Path $repoRoot "frontend"

Write-Host "LearnersHigh Frontend Verification" -ForegroundColor Green
Write-Info "Repository: $repoRoot"

if (-not (Test-Path -LiteralPath $frontendDir)) {
    $message = "frontend/ 디렉터리가 없습니다."

    if ($Strict) {
        throw $message
    }

    Write-Warn "$message Frontend 검증을 건너뜁니다."
    return
}

$packageJsonPaths = @(Get-FrontendProjects -FrontendDir $frontendDir)

if ($packageJsonPaths.Count -eq 0) {
    $message = "frontend/ 아래에서 package.json을 찾지 못했습니다."

    if ($Strict) {
        throw $message
    }

    Write-Warn "$message 아직 Frontend scaffold가 없다면 정상입니다."
    return
}

$oldCI = $env:CI
$env:CI = "true"

$verifiedProjects = 0
$executedScripts = 0

try {
    foreach ($packageJsonPath in $packageJsonPaths) {
        $projectDir = Split-Path -Parent $packageJsonPath
        $packageJson = Read-PackageJson -PackageJsonPath $packageJsonPath
        $scripts = Get-AvailableScripts -PackageJson $packageJson
        $packageManager = Find-PackageManager `
            -ProjectDir $projectDir `
            -PackageJson $packageJson `
            -StopDir $repoRoot

        if ([string]::IsNullOrWhiteSpace($packageManager)) {
            throw @"
Package manager를 결정할 수 없습니다: $projectDir

다음 중 하나를 Repository에 명시하세요.
- package.json의 packageManager
- package-lock.json
- pnpm-lock.yaml
- yarn.lock
- bun.lock / bun.lockb
"@
        }

        Assert-CommandAvailable -Command $packageManager

        $nameProperty = $packageJson.PSObject.Properties["name"]

        $projectName = if ($null -ne $nameProperty -and -not [string]::IsNullOrWhiteSpace([string]$nameProperty.Value)) {
            [string]$nameProperty.Value
        }
        else {
            Split-Path -Leaf $projectDir
        }

        Write-Step "Project: $projectName"
        Write-Info "Path: $projectDir"
        Write-Info "Package manager: $packageManager"

        $scriptsToRun = New-Object System.Collections.Generic.List[string]

        # 프로젝트에 verify script가 명시되어 있으면 이를 단일 진입점으로 우선한다.
        if ($scripts.ContainsKey("verify")) {
            $scriptsToRun.Add("verify")
        }
        else {
            foreach ($candidate in @("typecheck", "lint")) {
                if ($scripts.ContainsKey($candidate)) {
                    $scriptsToRun.Add($candidate)
                }
            }

            if (-not $SkipTests) {
                if ($scripts.ContainsKey("test:ci")) {
                    $scriptsToRun.Add("test:ci")
                }
                elseif ($scripts.ContainsKey("test")) {
                    $scriptsToRun.Add("test")
                }
            }

            if ($scripts.ContainsKey("build")) {
                $scriptsToRun.Add("build")
            }
        }

        if ($scriptsToRun.Count -eq 0) {
            $message = "검증 가능한 표준 script를 찾지 못했습니다: $projectDir"

            if ($Strict) {
                throw $message
            }

            Write-Warn "$message (verify/typecheck/lint/test:ci/test/build)"
            continue
        }

        foreach ($scriptName in $scriptsToRun) {
            Invoke-PackageScript `
                -PackageManager $packageManager `
                -ScriptName $scriptName `
                -WorkingDirectory $projectDir

            $executedScripts++
        }

        $verifiedProjects++
    }
}
finally {
    $env:CI = $oldCI
}

Write-Host ""
Write-Host "Frontend verification PASS" -ForegroundColor Green
Write-Info "Verified projects: $verifiedProjects"
Write-Info "Executed scripts: $executedScripts"
