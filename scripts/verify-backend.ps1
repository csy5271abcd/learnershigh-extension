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

function Assert-LastExitCode {
    param([string]$Operation)

    if ($LASTEXITCODE -ne 0) {
        throw "$Operation 실패 (exit code: $LASTEXITCODE)"
    }
}

function Resolve-GradleCommand {
    param([string]$BackendDir)

    $gradlewBat = Join-Path $BackendDir "gradlew.bat"
    $gradlew = Join-Path $BackendDir "gradlew"

    if (Test-Path -LiteralPath $gradlewBat) {
        return @{
            Kind = "wrapper"
            Command = $gradlewBat
        }
    }

    if (Test-Path -LiteralPath $gradlew) {
        return @{
            Kind = "wrapper"
            Command = $gradlew
        }
    }

    if ($null -ne (Get-Command "gradle" -ErrorAction SilentlyContinue)) {
        return @{
            Kind = "system"
            Command = "gradle"
        }
    }

    return $null
}

function Resolve-MavenCommand {
    param([string]$BackendDir)

    $mvnwCmd = Join-Path $BackendDir "mvnw.cmd"
    $mvnw = Join-Path $BackendDir "mvnw"

    if (Test-Path -LiteralPath $mvnwCmd) {
        return @{
            Kind = "wrapper"
            Command = $mvnwCmd
        }
    }

    if (Test-Path -LiteralPath $mvnw) {
        return @{
            Kind = "wrapper"
            Command = $mvnw
        }
    }

    if ($null -ne (Get-Command "mvn" -ErrorAction SilentlyContinue)) {
        return @{
            Kind = "system"
            Command = "mvn"
        }
    }

    return $null
}

$repoRoot = Get-RepositoryRoot
$backendDir = Join-Path $repoRoot "backend"

Write-Host "LearnersHigh Backend Verification" -ForegroundColor Green
Write-Info "Repository: $repoRoot"

if (-not (Test-Path -LiteralPath $backendDir)) {
    $message = "backend/ 디렉터리가 없습니다."

    if ($Strict) {
        throw $message
    }

    Write-Warn "$message Backend 검증을 건너뜁니다."
    return
}

$gradleBuildFile = @(
    (Join-Path $backendDir "build.gradle"),
    (Join-Path $backendDir "build.gradle.kts"),
    (Join-Path $backendDir "settings.gradle"),
    (Join-Path $backendDir "settings.gradle.kts")
) | Where-Object { Test-Path -LiteralPath $_ }

$mavenPom = Join-Path $backendDir "pom.xml"
$hasGradle = $gradleBuildFile.Count -gt 0
$hasMaven = Test-Path -LiteralPath $mavenPom

if (-not $hasGradle -and -not $hasMaven) {
    $message = "backend/에서 Gradle 또는 Maven build file을 찾지 못했습니다."

    if ($Strict) {
        throw $message
    }

    Write-Warn "$message 아직 Backend scaffold가 없다면 정상입니다."
    return
}

if ($hasGradle -and $hasMaven) {
    throw @"
backend/에 Gradle과 Maven 설정이 동시에 존재합니다.
어느 build tool이 Source of Truth인지 먼저 확정하세요.
"@
}

Push-Location $backendDir

try {
    if ($hasGradle) {
        $gradle = Resolve-GradleCommand -BackendDir $backendDir

        if ($null -eq $gradle) {
            throw @"
Gradle 프로젝트를 감지했지만 Gradle 실행 파일을 찾지 못했습니다.
권장: backend/에 Gradle Wrapper를 포함하세요.
"@
        }

        Write-Step "Gradle verification"
        Write-Info "Command source: $($gradle.Kind)"
        Write-Info "Command: $($gradle.Command)"

        if ($SkipTests) {
            & $gradle.Command clean build -x test
            Assert-LastExitCode -Operation "Gradle clean build -x test"
        }
        else {
            & $gradle.Command clean build
            Assert-LastExitCode -Operation "Gradle clean build"
        }
    }
    elseif ($hasMaven) {
        $maven = Resolve-MavenCommand -BackendDir $backendDir

        if ($null -eq $maven) {
            throw @"
Maven 프로젝트를 감지했지만 Maven 실행 파일을 찾지 못했습니다.
권장: backend/에 Maven Wrapper를 포함하세요.
"@
        }

        Write-Step "Maven verification"
        Write-Info "Command source: $($maven.Kind)"
        Write-Info "Command: $($maven.Command)"

        if ($SkipTests) {
            & $maven.Command clean verify "-DskipTests"
            Assert-LastExitCode -Operation "Maven clean verify -DskipTests"
        }
        else {
            & $maven.Command clean verify
            Assert-LastExitCode -Operation "Maven clean verify"
        }
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Backend verification PASS" -ForegroundColor Green
