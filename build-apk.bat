@echo off
setlocal enabledelayedexpansion

title Kerala Lottery - Android APK Builder and Sync

echo ======================================================================
echo    KERALA LOTTERY SYSTEM - ANDROID APK BUILDER AND SYNC
echo ======================================================================
echo.

set "SRC=%~dp0"
set "LOCAL_ANDROID=%SRC%android"
set "STUDIO_ANDROID=C:\Users\Administrator\AndroidStudioProjects\KeralaLotteryResult"

REM Pick the active Android project directory
if exist "%LOCAL_ANDROID%\gradlew.bat" (
    set "ANDROID_PROJ=%LOCAL_ANDROID%"
) else (
    set "ANDROID_PROJ=%STUDIO_ANDROID%"
)

set "DEST_ASSETS=%ANDROID_PROJ%\app\src\main\assets"
set "STUDIO_ASSETS=%STUDIO_ANDROID%\app\src\main\assets"

echo [Step 1/4] Synchronizing App Launcher and Adaptive Icons...
if exist "%SRC%sync-icons.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SRC%sync-icons.ps1"
) else (
    echo [INFO] sync-icons.ps1 not found, continuing with existing resources...
)

echo.
echo [Step 2/4] Synchronizing Web Scripts to Android Assets...
if not exist "%DEST_ASSETS%" mkdir "%DEST_ASSETS%"

set "FILES=index.html style.css app.js public.js html5-qrcode.min.js qrcode.min.js manifest.json icon-192.png icon-512.png"

for %%F in (%FILES%) do (
    if exist "%SRC%%%F" (
        copy /Y "%SRC%%%F" "%DEST_ASSETS%\%%F" >nul
        if exist "%STUDIO_ANDROID%" (
            if not exist "%STUDIO_ASSETS%" mkdir "%STUDIO_ASSETS%"
            copy /Y "%SRC%%%F" "%STUDIO_ASSETS%\%%F" >nul
        )
    )
)
echo [OK] All scripts, assets, and web files synchronized successfully.

echo.
echo [Step 3/4] Checking Java and Android SDK Environment...

REM Find Java Home if not set
if not defined JAVA_HOME (
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
    ) else if exist "C:\Program Files\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android Studio\jbr"
    ) else if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr" (
        set "JAVA_HOME=%LOCALAPPDATA%\Programs\Android Studio\jbr"
    ) else if exist "C:\Program Files\Java\jdk-17" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-17"
    ) else if exist "C:\Program Files\Java\jdk-21" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-21"
    )
)

if defined JAVA_HOME (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
    echo [OK] Using Java: %JAVA_HOME%
) else (
    echo [INFO] JAVA_HOME not explicitly set, relying on system PATH.
)

if not defined ANDROID_HOME (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
        set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
        echo [OK] Using Android SDK: %LOCALAPPDATA%\Android\Sdk
    )
)

REM Ensure local.properties exists in Android project
if not exist "%ANDROID_PROJ%\local.properties" (
    if defined ANDROID_HOME (
        set "SDK_ESCAPED=%ANDROID_HOME:\=\\%"
        echo sdk.dir=!SDK_ESCAPED!> "%ANDROID_PROJ%\local.properties"
    )
)

echo.
echo [Step 4/4] Compiling Android APK...
cd /d "%ANDROID_PROJ%"

if exist "gradlew.bat" (
    call gradlew.bat assembleDebug
    set "BUILD_CODE=!ERRORLEVEL!"
    if !BUILD_CODE! EQU 0 (
        echo.
        echo ======================================================================
        echo  SUCCESS: ANDROID APK HAS BEEN GENERATED SUCCESSFULLY
        echo ======================================================================
        set "APK_OUT=%ANDROID_PROJ%\app\build\outputs\apk\debug\app-debug.apk"
        if exist "!APK_OUT!" (
            copy /Y "!APK_OUT!" "%SRC%KeralaLottery-debug.apk" >nul
            echo.
            echo  APK File Location:
            echo  %SRC%KeralaLottery-debug.apk
            echo.
        )
        echo ======================================================================
        pause
        exit /b 0
    ) else (
        echo.
        echo ======================================================================
        echo  [ERROR] GRADLE BUILD FAILED WITH EXIT CODE !BUILD_CODE!
        echo ======================================================================
        echo  Please inspect the build output messages above.
    )
) else (
    echo [ERROR] gradlew.bat not found in %ANDROID_PROJ%
)

echo.
echo ======================================================================
echo  ALTERNATIVE: BUILD DIRECTLY IN ANDROID STUDIO
echo ======================================================================
echo  All web files, assets, and app launcher icons have been synchronized.
echo.
echo  To build or debug in Android Studio:
echo   1. Open Android Studio
echo   2. Open this folder:
echo      %ANDROID_PROJ%
echo   3. From the top menu bar, click:
echo      Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo   4. Android Studio will compile your KeralaLottery.apk!
echo ======================================================================
echo.
pause
