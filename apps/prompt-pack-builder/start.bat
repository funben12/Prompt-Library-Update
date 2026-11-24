@echo off
setlocal
echo ============================================
echo   Prompt Pack Builder - Starting...
echo ============================================
echo.

cd /d "%~dp0"

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ from python.org
    pause
    exit /b 1
)

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt --quiet
echo.

python -c "import webview" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: pywebview could not be installed.
    echo Try running this manually:
    echo   venv\Scripts\pip install pywebview==5.3.2 --force-reinstall
    pause
    exit /b 1
)

echo Starting Prompt Pack Builder...
echo.
python main.py

pause
