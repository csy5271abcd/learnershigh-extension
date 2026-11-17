# Student Assessment를 실제 Backend(http)로 띄우는 개발 전용 실행 스크립트 (방법 B, Shared vite.config 무수정).
# 사용 예 (PowerShell, 저장소 어디서든):
#   .\docs\specs\suyeon\assessment-final-integration-202611\scripts\run-student-http-dev.ps1 -ApiTarget http://localhost:18080 -StudentId stu_001 -CurrentTerm 2026-1
# 주의: X-Assessment-Student-Id는 Backend 개발용 Mock 인증 Header다. 실제 인증이 아니며 Production Build에는 붙지 않는다.
param(
  [string]$ApiTarget = 'http://localhost:18080',
  [string]$StudentId = 'stu_001',
  [string]$CurrentTerm = '2026-1'
)
$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..\..')
$config = Join-Path $PSScriptRoot 'vite.student-http.config.ts'
$env:VITE_API_TARGET = $ApiTarget
$env:VITE_ASSESSMENT_DATA_SOURCE = 'http'
$env:VITE_ASSESSMENT_DEV_STUDENT_ID = $StudentId
$env:VITE_ASSESSMENT_DEV_CURRENT_TERM = $CurrentTerm
Push-Location (Join-Path $repo 'frontend\student')
try {
  npx vite --config $config
} finally {
  Pop-Location
}
