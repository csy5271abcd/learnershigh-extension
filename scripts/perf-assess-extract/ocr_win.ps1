# Windows 내장 OCR(Windows.Media.Ocr, 한국어)로 이미지 글자를 읽는다. 설치 없이 동작.
# 사용: powershell -NoProfile -ExecutionPolicy Bypass -File ocr_win.ps1 <이미지 경로> [<이미지 경로> ...]
# 출력: 이미지마다 "===FILE <경로>" 줄 뒤에 인식한 줄들 (UTF-8). OCR_WORDS=1 이면 단어마다 "W x y w h 글자"
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Paths)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$t) {
    $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op))
    $task.Wait() | Out-Null
    $task.Result
}
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('ko'))
if ($null -eq $engine) { Write-Error 'Korean OCR language is not installed'; exit 2 }
foreach ($p in $Paths) {
    $full = (Resolve-Path $p).Path
    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($full)) ([Windows.Storage.StorageFile])
    $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    Write-Output "===FILE $p"
    foreach ($line in $result.Lines) {
        if ($env:OCR_WORDS -eq '1') {
            # 단어마다 위치: "W x y 너비 높이 글자" (표 칸 복원용)
            foreach ($w in $line.Words) {
                $r = $w.BoundingRect
                Write-Output ("W {0} {1} {2} {3} {4}" -f [int]$r.X, [int]$r.Y, [int]$r.Width, [int]$r.Height, $w.Text)
            }
        } else { Write-Output $line.Text }
    }
    $stream.Dispose()
}
