# Student 평가계획서 "분석 미리보기" 개발 실행 스크립트 (2026-11-11, 개발 전용).
# 기본 시연 Student(5173)와 별도 프로세스·포트(기본 5176)에서만 분석 미리보기 Flag를 켠다.
# 사용 예 (PowerShell, 저장소 어디서든):
#   .\docs\specs\suyeon\assessment-ui-analysis-connection-202611\scripts\run-student-analysis-preview-dev.ps1 `
#       -TokenFile "C:\Users\<사용자>\LearnersHigh-local\curriculum-analysis\sensitive\service\dev-token.txt"
# 전제: 계정 B 분석기 실행 중 (127.0.0.1:8765, runs/v22-analysis-preview-service-20261111/REPORT.md §2)
# 주의: 토큰은 VITE_ 변수로 넘기지 않는다(번들 포함 방지). X-Assessment-Student-Id는 개발용 Mock 인증 Header다.
param(
  [string]$ApiTarget = 'http://localhost:18080',
  [string]$StudentId = 'stu_001',
  [string]$CurrentTerm = '2026-1',
  [int]$Port = 5176,
  [string]$TokenFile = '',
  [string]$AnalyzerUrl = 'http://127.0.0.1:8765'
)
$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..\..')
$config = Join-Path $PSScriptRoot 'vite.student-analysis-preview.config.ts'
$env:VITE_API_TARGET = $ApiTarget
$env:VITE_ASSESSMENT_DATA_SOURCE = 'http'
$env:VITE_ASSESSMENT_DEV_STUDENT_ID = $StudentId
$env:VITE_ASSESSMENT_DEV_CURRENT_TERM = $CurrentTerm
$env:VITE_ASSESSMENT_DEV_ANALYSIS_PREVIEW = 'true'
$env:STUDENT_PREVIEW_PORT = "$Port"
$env:ANALYSIS_SERVICE_URL = $AnalyzerUrl
if ($TokenFile) { $env:CURRICULUM_ANALYSIS_TOKEN_FILE = $TokenFile }
Push-Location (Join-Path $repo 'frontend\student')
try {
  npx vite --config $config
} finally {
  Pop-Location
}
