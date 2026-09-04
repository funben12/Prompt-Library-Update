@echo off
setlocal
chcp 65001 >nul
echo ============================================
echo   Prompt Library Pro - Build Script
echo ============================================
echo.

REM Move into the script's own directory so paths resolve correctly
cd /d "%~dp0"

REM -----------------------------------------------------------------------
REM  PRE-BUILD VALIDATION
REM -----------------------------------------------------------------------
echo [1/6] Running pre-build checks...

REM Strip NUL bytes from key files
python -c "f='static/index.html'; d=open(f,'rb').read(); open(f,'wb').write(d.replace(b'\x00',b''))"
python -c "f='static/app.js'; d=open(f,'rb').read(); open(f,'wb').write(d.replace(b'\x00',b''))"

REM Run validation script
python prebuild_check.py
if errorlevel 1 (
    echo.
    echo Fix the errors above then run Build.bat again.
    pause
    exit /b 1
)

REM -----------------------------------------------------------------------
REM  ENVIRONMENT SETUP
REM -----------------------------------------------------------------------
echo.
echo [2/6] Setting up virtual environment...

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat

pip install -r requirements.txt --quiet
pip install pyinstaller --quiet

REM -----------------------------------------------------------------------
REM  CACHE-BUST HASH
REM -----------------------------------------------------------------------
echo.
echo [3/6] Updating app.js cache-bust hash...
python update_hash.py

REM -----------------------------------------------------------------------
REM  ICON CHECK
REM -----------------------------------------------------------------------
echo.
echo [4/6] Checking icon...

if not exist "icon.ico" (
    if exist "static\icon.ico" (
        copy /Y "static\icon.ico" "icon.ico" >nul
        echo   Copied static\icon.ico to project root.
    ) else (
        echo WARNING: icon.ico not found. Build will use a default icon.
    )
) else (
    echo   icon.ico OK
)

REM -----------------------------------------------------------------------
REM  KILL ANY RUNNING INSTANCE (prevents Error 5 / Access Denied on EXE)
REM -----------------------------------------------------------------------
echo.
echo [5/6] Stopping any running PromptLibrary process...
taskkill /F /IM PromptLibrary.exe /T >nul 2>&1
REM Give Windows 2 seconds to fully release the file handle
timeout /t 2 /nobreak >nul

REM -----------------------------------------------------------------------
REM  CLEAN OLD BUILD ARTEFACTS
REM -----------------------------------------------------------------------
if exist PromptLibrary.spec del PromptLibrary.spec
if exist build  rmdir /S /Q build
if exist dist   rmdir /S /Q dist

REM -----------------------------------------------------------------------
REM  BUILD EXECUTABLE
REM -----------------------------------------------------------------------
echo.
echo [6/6] Building executable (this takes a few minutes)...

REM --noupx: UPX compression triggers Windows Defender mid-build, causing Error 5 / Access Denied
pyinstaller --name="PromptLibrary" ^
    --onefile ^
    --windowed ^
    --noupx ^
    --icon=icon.ico ^
    --add-data "static;static" ^
    --add-data "icon.ico;." ^
    --hidden-import=webview ^
    --hidden-import=webview.platforms.winforms ^
    --hidden-import=clr ^
    --hidden-import=flask ^
    --hidden-import=flask_cors ^
    --hidden-import=waitress ^
    --collect-all=webview ^
    --clean ^
    Main.py

if errorlevel 1 (
    echo.
    echo ============================================
    echo   BUILD FAILED - see output above
    echo ============================================
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Build Complete!
echo   Executable: dist\PromptLibrary.exe
echo   Next step:  Open PromptLibrary.iss in
echo               Inno Setup and press Ctrl+F9
echo ============================================
pause
