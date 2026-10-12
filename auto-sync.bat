@echo off
setlocal enabledelayedexpansion

title Kerala Lottery - Live Asset Auto-Sync Watcher

echo ======================================================================
echo    KERALA LOTTERY - LIVE ASSET AUTO-SYNC WATCHER
echo ======================================================================
echo  Whenever you edit index.html, style.css, or app.js in this folder,
echo  they will be automatically synchronized to Android assets in real-time!
echo.
echo  Press Ctrl+C anytime to stop this watcher.
echo ======================================================================
echo.

set "SRC=%~dp0"
set "LOCAL_ASSETS=%SRC%android\app\src\main\assets"
set "STUDIO_ASSETS=C:\Users\Administrator\AndroidStudioProjects\KeralaLotteryResult\app\src\main\assets"

if not exist "%LOCAL_ASSETS%" mkdir "%LOCAL_ASSETS%" >nul 2>&1
if exist "C:\Users\Administrator\AndroidStudioProjects\KeralaLotteryResult" (
    if not exist "%STUDIO_ASSETS%" mkdir "%STUDIO_ASSETS%" >nul 2>&1
)

REM Initial sync
echo [%TIME%] Initializing sync of all web files...
set "FILES=index.html style.css app.js public.js html5-qrcode.min.js qrcode.min.js manifest.json icon-192.png icon-512.png"
for %%F in (%FILES%) do (
    if exist "%SRC%%%F" (
        copy /Y "%SRC%%%F" "%LOCAL_ASSETS%\%%F" >nul
        if exist "%STUDIO_ASSETS%" copy /Y "%SRC%%%F" "%STUDIO_ASSETS%\%%F" >nul
    )
)
echo [%TIME%] [READY] Watching for edits to index.html, style.css, and app.js...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$src = '%SRC%'.TrimEnd('\');" ^
    "$local = '%LOCAL_ASSETS%'.TrimEnd('\');" ^
    "$studio = '%STUDIO_ASSETS%'.TrimEnd('\');" ^
    "$files = @('index.html', 'style.css', 'app.js', 'public.js', 'manifest.json');" ^
    "$lastWrites = @{};" ^
    "foreach ($f in $files) {" ^
    "    $p = Join-Path $src $f;" ^
    "    if (Test-Path $p) { $lastWrites[$f] = (Get-Item $p).LastWriteTimeUtc }" ^
    "}" ^
    "while ($true) {" ^
    "    Start-Sleep -Milliseconds 1000;" ^
    "    foreach ($f in $files) {" ^
    "        $p = Join-Path $src $f;" ^
    "        if (Test-Path $p) {" ^
    "            $curr = (Get-Item $p).LastWriteTimeUtc;" ^
    "            if ($curr -ne $lastWrites[$f]) {" ^
    "                $lastWrites[$f] = $curr;" ^
    "                Copy-Item -Path $p -Destination (Join-Path $local $f) -Force -ErrorAction SilentlyContinue;" ^
    "                if (Test-Path $studio) { Copy-Item -Path $p -Destination (Join-Path $studio $f) -Force -ErrorAction SilentlyContinue };" ^
    "                Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] [SYNCED] ' + $f + ' -> Android mobile assets updated!') -ForegroundColor Green;" ^
    "            }" ^
    "        }" ^
    "    }" ^
    "}"
