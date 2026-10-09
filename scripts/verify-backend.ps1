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

# Backend Build Tool 정책: Gradle only, Repository에 포함된 Gradle Wrapper만 사용한다.
# Maven 산출물은 허용하지 않는다.
$ForbiddenMavenArtifacts = @("pom.xml", "mvnw", "mvnw.cmd", ".mvn")

function Resolve-GradleWrapper {
    param([string]$BackendDir)

    # Windows에서는 gradlew.bat, 그 외 환경에서는 gradlew를 사용한다.
    $isWindowsHost = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT
    $wrapperName = if ($isWindowsHost) { "gradlew.bat" } else { "gradlew" }
    $wrapper = Join-Path $BackendDir $wrapperName

    if (Test-Path -LiteralPath $wrapper) {
        return $wrapper
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

Write-Step "Build tool policy (Gradle Wrapper only)"

$mavenArtifacts = @(
    $ForbiddenMavenArtifacts |
        Where-Object { Test-Path -LiteralPath (Join-Path $backendDir $_) }
)

if ($mavenArtifacts.Count -gt 0) {
    throw @"
backend/에서 Maven 산출물이 발견되었습니다:
- $($mavenArtifacts -join "`n- ")

Backend Build Tool 정책은 Gradle only입니다.
"@
}

Write-Info "Maven artifacts (pom.xml / mvnw / mvnw.cmd / .mvn): none"

$gradleBuildFile = @(
    @(
        (Join-Path $backendDir "build.gradle"),
        (Join-Path $backendDir "build.gradle.kts")
    ) | Where-Object { Test-Path -LiteralPath $_ }
)

if ($gradleBuildFile.Count -eq 0) {
    $message = "backend/에서 Gradle build file(build.gradle.kts / build.gradle)을 찾지 못했습니다."

    if ($Strict) {
        throw $message
    }

    Write-Warn "$message 아직 Backend scaffold가 없다면 정상입니다."
    return
}

$gradleWrapper = Resolve-GradleWrapper -BackendDir $backendDir

if ($null -eq $gradleWrapper) {
    throw @"
Gradle Wrapper를 찾지 못했습니다: $backendDir
Global Gradle 설치에 의존하지 않습니다. backend/에 gradlew / gradlew.bat / gradle/wrapper/를 포함하세요.
"@
}

Push-Location $backendDir

try {
    Write-Step "Gradle verification"
    Write-Info "Command: $gradleWrapper"

    if ($SkipTests) {
        & $gradleWrapper clean build -x test
        Assert-LastExitCode -Operation "Gradle clean build -x test"
    }
    else {
        & $gradleWrapper clean build
        Assert-LastExitCode -Operation "Gradle clean build"

        # Integration Test는 Testcontainers(MySQL)를 쓰므로 Docker가 필요하다 (ADR-0006).
        Write-Step "Integration tests (Testcontainers)"

        $dockerAvailable = $false

        if ($null -ne (Get-Command "docker" -ErrorAction SilentlyContinue)) {
            & docker info *> $null
            $dockerAvailable = ($LASTEXITCODE -eq 0)
        }

        if ($dockerAvailable) {
            & $gradleWrapper integrationTest
            Assert-LastExitCode -Operation "Gradle integrationTest"
        }
        elseif ($Strict) {
            throw "Docker를 사용할 수 없어 integrationTest를 실행하지 못했습니다. (-Strict)"
        }
        else {
            Write-Warn "Docker를 사용할 수 없어 integrationTest를 건너뜁니다. Docker 실행 후 다시 검증하세요."
        }
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "Backend verification PASS" -ForegroundColor Green
