# 시연용 Backend(18080) 실행. DB 계정은 Docker 컨테이너 환경에서 읽어 이 프로세스에만 설정하고 출력하지 않는다.
# 사용: powershell -NoExit -ExecutionPolicy Bypass -File run-backend-demo.ps1 [-Jar <jar 경로>]
param(
  [string]$Jar = "C:\learnershigh-extension\backend\build\libs-demo\learnershigh-extension-backend-0.0.1.jar"
)
$ErrorActionPreference = 'Stop'
Set-Location "C:\learnershigh-extension\backend"
$env:DB_URL = "jdbc:mysql://localhost:3307/lh_demo_manual_20261111"
$mysqlEnv = docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' learnershigh-mysql
$env:DB_USERNAME = (($mysqlEnv | Where-Object { $_ -like 'MYSQL_USER=*' } | Select-Object -First 1) -split '=', 2)[1]
$env:DB_PASSWORD = (($mysqlEnv | Where-Object { $_ -like 'MYSQL_PASSWORD=*' } | Select-Object -First 1) -split '=', 2)[1]
if (-not $env:DB_USERNAME -or -not $env:DB_PASSWORD) { throw 'MySQL 컨테이너에서 DB 계정을 읽지 못했습니다.' }
$env:ASSESSMENT_DEMO_ROSTER_ENABLED = 'true'
$env:ASSESSMENT_ANALYSIS_IMPORT_ENABLED = 'true'
$env:ASSESSMENT_MULTIFORMAT_EXPERIMENTAL = 'true'
Write-Host "Backend 시작: $Jar (port 18080, DB 계정 값은 표시하지 않음)"
& "$HOME\.jdks\jbr-21.0.8\bin\java.exe" -Xmx384m -jar $Jar --server.port=18080
