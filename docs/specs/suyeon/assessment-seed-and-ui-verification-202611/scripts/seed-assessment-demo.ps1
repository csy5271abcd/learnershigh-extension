<#
  [DEMO-1112] 합성 Assessment 데이터 등록 (개발 환경 전용).
  - 실행 중인 시연 Backend의 기존 HTTP API만 쓴다. DB 비밀번호·분석기 토큰을 읽거나 출력하지 않는다.
  - 대상 Schema 확인: Backend를 띄운 창의 DB_URL Schema를 -ExpectedSchema와 같은지 사람이 확인하고 -ConfirmSchema 로 명시한다
    (API는 Schema 이름을 알려 주지 않으므로 스크립트가 추측하지 않는다).
  - 재실행 안전: seed-manifest.json의 ID를 GET으로 다시 확인하고, 이미 있으면 재사용한다. 전체 삭제 옵션은 없다.

  예)
    .\seed-assessment-demo.ps1 -ConfirmSchema lh_demo_manual_20261111
#>
param(
  [string]$Api = 'http://localhost:18080',
  [string]$StudentId = 'stu_001',
  [string]$AdminId = 'adm_demo_gangnam',
  [int]$AcademicYear = 2026,
  [int]$Semester = 1,
  [string]$ExpectedSchema = 'lh_demo_manual_20261111',
  [Parameter(Mandatory = $true)][string]$ConfirmSchema
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here

if ($ConfirmSchema -ne $ExpectedSchema) {
  Write-Error "대상 Schema 확인 불일치: 기대 $ExpectedSchema, 입력 $ConfirmSchema. 중단합니다."
}
$uri = [Uri]$Api
if ($uri.Host -ne 'localhost' -and $uri.Host -ne '127.0.0.1') {
  Write-Error "개발 환경 전용: localhost/127.0.0.1 Backend만 허용합니다 (받은 값: $($uri.Host))."
}
try {
  $health = Invoke-WebRequest -UseBasicParsing -Uri "$Api/api/student/assessment/academic-context?academicYear=$AcademicYear&semester=$Semester" -Headers @{ 'X-Assessment-Student-Id' = $StudentId } -TimeoutSec 10
} catch {
  Write-Error "Backend($Api)에 연결하지 못했습니다. Backend를 먼저 띄워 주세요. $($_.Exception.Message)"
}

$node = (Get-Command node -ErrorAction Stop).Source
& $node (Join-Path $here 'seed-assessment-demo.mjs') `
  --api $Api --student $StudentId --admin $AdminId --year $AcademicYear --semester $Semester `
  --manifest (Join-Path $root 'seed-manifest.json') --files (Join-Path $root 'seed-files')
exit $LASTEXITCODE
