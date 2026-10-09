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

# Package Manager 정책: npm only (README §4, CLAUDE.md §8).
# package-lock.json 외의 Lockfile은 허용하지 않는다.
$ForbiddenLockfiles = @("pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb")
$RequiredNodeMajor = 22

function Find-ForbiddenLockfiles {
    param(
        [string]$RepoRoot,
        [string]$FrontendDir
    )

    $found = New-Object System.Collections.Generic.List[string]

    foreach ($name in $ForbiddenLockfiles) {
        $rootCandidate = Join-Path $RepoRoot $name

        if (Test-Path -LiteralPath $rootCandidate) {
            $found.Add($name)
        }
    }

    $nested = Get-ChildItem -LiteralPath $FrontendDir -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -in $ForbiddenLockfiles -and
            $_.FullName -notmatch '[\\/]node_modules[\\/]'
        }

    foreach ($file in $nested) {
        $found.Add($file.FullName.Substring($RepoRoot.Length).TrimStart("\", "/"))
    }

    return $found
}

function Assert-NpmPackageManagerField {
    param(
        [string]$PackageJsonPath,
        [object]$PackageJson
    )

    $packageManagerProperty = $PackageJson.PSObject.Properties["packageManager"]

    if ($null -eq $packageManagerProperty) {
        return
    }

    $packageManager = [string]$packageManagerProperty.Value

    if ($packageManager -notmatch '^npm@') {
        throw "package.json의 packageManager가 npm이 아닙니다: $packageManager ($PackageJsonPath)`nPackage Manager 정책은 npm only입니다."
    }
}

function Find-NpmLockfile {
    param(
        [string]$ProjectDir,
        [string]$FrontendDir
    )

    # npm workspace 구조를 고려해 frontend/까지 상위로 package-lock.json을 찾는다.
    $current = (Resolve-Path -LiteralPath $ProjectDir).Path
    $stop = (Resolve-Path -LiteralPath $FrontendDir).Path

    while ($true) {
        $candidate = Join-Path $current "package-lock.json"

        if (Test-Path -LiteralPath $candidate) {
            return $candidate
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

function Assert-NodeMajorVersion {
    param([switch]$Strict)

    $nodeVersion = (& node --version).Trim()

    if ($LASTEXITCODE -ne 0) {
        throw "node --version 실패"
    }

    if ($nodeVersion -notmatch '^v(\d+)\.') {
        throw "Node.js Version을 해석할 수 없습니다: $nodeVersion"
    }

    $major = [int]$Matches[1]
    Write-Info "Node.js: $nodeVersion (required major: $RequiredNodeMajor)"

    if ($major -ne $RequiredNodeMajor) {
        $message = "Node.js major version이 $RequiredNodeMajor 이 아닙니다: $nodeVersion"

        if ($Strict) {
            throw $message
        }

        Write-Warn $message
    }
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

function Invoke-NpmScript {
    param(
        [string]$ScriptName,
        [string]$WorkingDirectory
    )

    Write-Step "$WorkingDirectory :: npm run $ScriptName"

    Push-Location $WorkingDirectory

    try {
        & npm run $ScriptName

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

Write-Step "Package manager policy (npm only)"

$forbiddenLockfiles = @(Find-ForbiddenLockfiles -RepoRoot $repoRoot -FrontendDir $frontendDir)

if ($forbiddenLockfiles.Count -gt 0) {
    throw @"
npm 외 Package Manager의 Lockfile이 발견되었습니다:
- $($forbiddenLockfiles -join "`n- ")

Package Manager 정책은 npm only입니다. package-lock.json만 사용하세요.
"@
}

Write-Info "Forbidden lockfiles (pnpm / yarn / bun): none"

$packageJsonPaths = @(Get-FrontendProjects -FrontendDir $frontendDir)

if ($packageJsonPaths.Count -eq 0) {
    $message = "frontend/ 아래에서 package.json을 찾지 못했습니다."

    if ($Strict) {
        throw $message
    }

    Write-Warn "$message 아직 Frontend scaffold가 없다면 정상입니다."
    return
}

Assert-CommandAvailable -Command "node"
Assert-CommandAvailable -Command "npm"
Assert-NodeMajorVersion -Strict:$Strict

$oldCI = $env:CI
$env:CI = "true"

$verifiedProjects = 0
$executedScripts = 0

try {
    foreach ($packageJsonPath in $packageJsonPaths) {
        $projectDir = Split-Path -Parent $packageJsonPath
        $packageJson = Read-PackageJson -PackageJsonPath $packageJsonPath
        $scripts = Get-AvailableScripts -PackageJson $packageJson

        Assert-NpmPackageManagerField -PackageJsonPath $packageJsonPath -PackageJson $packageJson

        $npmLockfile = Find-NpmLockfile -ProjectDir $projectDir -FrontendDir $frontendDir

        if ($null -eq $npmLockfile) {
            $message = "package-lock.json을 찾지 못했습니다: $projectDir (npm install로 생성 후 commit하세요)"

            if ($Strict) {
                throw $message
            }

            Write-Warn $message
        }

        $nameProperty = $packageJson.PSObject.Properties["name"]

        $projectName = if ($null -ne $nameProperty -and -not [string]::IsNullOrWhiteSpace([string]$nameProperty.Value)) {
            [string]$nameProperty.Value
        }
        else {
            Split-Path -Leaf $projectDir
        }

        Write-Step "Project: $projectName"
        Write-Info "Path: $projectDir"
        Write-Info "Package manager: npm"

        if ($null -ne $npmLockfile) {
            Write-Info "Lockfile: $npmLockfile"
        }

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
            Invoke-NpmScript `
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
