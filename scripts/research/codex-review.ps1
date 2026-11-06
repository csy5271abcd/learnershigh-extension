# Codex 검사 실행기. 사용: powershell -File scripts/research/codex-review.ps1 <prompt.md> <result.md> [read-only|workspace-write]
# Windows PowerShell 5.1은 외부 프로그램 표준입력을 시스템 코드페이지로 보내 한글이 깨지므로 UTF-8로 고정한다.
param([string]$Prompt, [string]$Result, [string]$Sandbox = 'read-only')
$OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $OutputEncoding
[Console]::InputEncoding = $OutputEncoding
# Codex 앱이 업데이트되면 bin 하위 폴더 이름이 바뀌므로 가장 최근 codex.exe를 찾는다
$codex = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin') -Recurse -Filter codex.exe | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Get-Content $Prompt -Raw -Encoding utf8 | & $codex exec -C $repo -s $Sandbox -c 'sandbox_workspace_write.network_access=true' --skip-git-repo-check -o $Result - 2>&1 | Select-Object -Last 5
