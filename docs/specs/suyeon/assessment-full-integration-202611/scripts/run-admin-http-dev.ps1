# Admin Assessment를 실제 Backend(http)로 띄우는 개발 실행 스크립트 (DEMO-RUNBOOK §5와 같은 설정 + 선택 Flag).
# 사용 예 (PowerShell, 저장소 어디서든):
#   기본(시연과 같음):  .\docs\specs\suyeon\assessment-full-integration-202611\scripts\run-admin-http-dev.ps1
#   로컬 분석기 자동 분석: ... -Analyzer -TokenFile "C:\Users\<사용자>\LearnersHigh-local\curriculum-analysis\sensitive\service\dev-token.txt"
#   HWP·HWPX 실험 표시: ... -Multiformat   (Backend도 ASSESSMENT_MULTIFORMAT_EXPERIMENTAL=true인 별도 프로세스여야 함)
# 포트는 Admin vite.config의 5174 + strictPort다. 사용 중이면 다른 포트로 옮겨 가지 않고 실패한다(-Port는 시험용).
# 주의: X-Assessment-Admin-Id는 Backend 개발용 Mock 인증 Header다. 실제 인증이 아니다.
param(
  [string]$ApiTarget = 'http://localhost:18080',
  [string]$AdminId = 'adm_plan_operator',
  [string]$PlanSchools = 'school_001',
  [string]$CurrentTerm = '2026-1',
  [int]$Port = 5174,
  [switch]$Analyzer,
  [string]$TokenFile = '',
  [string]$AnalyzerUrl = 'http://127.0.0.1:8765',
  [switch]$Multiformat
)
$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..\..')
$analyzerConfig = Join-Path $PSScriptRoot 'vite.admin-analyzer.config.ts'
$env:VITE_API_TARGET = $ApiTarget
$env:VITE_ASSESSMENT_DATA_SOURCE = 'http'
$env:VITE_ASSESSMENT_DEV_ADMIN_ID = $AdminId
$env:VITE_ASSESSMENT_DEV_PLAN_SCHOOLS = $PlanSchools
$env:VITE_ASSESSMENT_DEV_CURRENT_TERM = $CurrentTerm
$env:ADMIN_PORT = "$Port"
if ($Multiformat) { $env:VITE_ASSESSMENT_DEV_MULTIFORMAT = 'true' } else { Remove-Item Env:VITE_ASSESSMENT_DEV_MULTIFORMAT -ErrorAction SilentlyContinue }
Push-Location (Join-Path $repo 'frontend\admin')
try {
  if ($Analyzer) {
    $env:VITE_ASSESSMENT_DEV_ANALYZER = 'true'
    $env:ANALYSIS_SERVICE_URL = $AnalyzerUrl
    if ($TokenFile) { $env:CURRICULUM_ANALYSIS_TOKEN_FILE = $TokenFile }
    npx vite --config $analyzerConfig
  } else {
    Remove-Item Env:VITE_ASSESSMENT_DEV_ANALYZER -ErrorAction SilentlyContinue
    npx vite --port $Port --strictPort
  }
} finally {
  Pop-Location
}
