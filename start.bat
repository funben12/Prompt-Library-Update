@echo off
setlocal
echo ============================================
echo   Prompt Library - Starting...
echo ============================================
echo.

cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ from python.org
    pause
    exit /b 1
)

REM Create venv if missing
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate venv
call venv\Scripts\activate.bat

REM Install / update dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet
echo.

REM Force reinstall pywebview to fix any corrupted or partial install
echo Verifying pywebview...
python -c "import webview" >nul 2>&1
if %errorlevel% neq 0 (
    echo pywebview not importable - reinstalling...
    pip install pywebview==5.3.2 --force-reinstall --quiet
    echo.
)

REM Confirm webview is now importable before launching
python -c "import webview" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: pywebview could not be installed.
    echo Try running this manually:
    echo   venv\Scripts\pip install pywebview==5.3.2 --force-reinstall
    pause
    exit /b 1
)

REM Start the app
echo Starting Prompt Library...
echo.
python Main.py

pause
