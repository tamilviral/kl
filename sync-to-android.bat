@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo    Kerala Lottery - Sync Web Assets and Icons
echo ========================================================

set "SRC=%~dp0"
set "LOCAL_ANDROID=%SRC%android"
set "STUDIO_ANDROID=C:\Users\Administrator\AndroidStudioProjects\KeralaLotteryResult"

set "LOCAL_ASSETS=%LOCAL_ANDROID%\app\src\main\assets"
set "STUDIO_ASSETS=%STUDIO_ANDROID%\app\src\main\assets"

echo [1/2] Syncing web scripts and assets to Android...
set "FILES=index.html style.css app.js public.js html5-qrcode.min.js qrcode.min.js manifest.json icon-192.png icon-512.png"

if exist "%LOCAL_ANDROID%" (
    if not exist "%LOCAL_ASSETS%" mkdir "%LOCAL_ASSETS%"
    for %%F in (%FILES%) do (
        if exist "%SRC%%%F" copy /Y "%SRC%%%F" "%LOCAL_ASSETS%\%%F" >nul
    )
    echo  [OK] Synced to local Android project: %LOCAL_ASSETS%
)

if exist "%STUDIO_ANDROID%" (
    if not exist "%STUDIO_ASSETS%" mkdir "%STUDIO_ASSETS%"
    for %%F in (%FILES%) do (
        if exist "%SRC%%%F" copy /Y "%SRC%%%F" "%STUDIO_ASSETS%\%%F" >nul
    )
    echo  [OK] Synced to Android Studio project: %STUDIO_ASSETS%
)

echo.
echo [2/2] Generating and syncing Android launcher icons...
if exist "%SRC%sync-icons.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SRC%sync-icons.ps1"
)

echo.
echo ========================================================
echo  SUCCESS: All web files and launcher icons synchronized!
echo ========================================================
pause
