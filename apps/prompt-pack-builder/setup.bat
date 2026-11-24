@echo off
echo === Setting up Prompt Pack Builder ===
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python from https://www.python.org/downloads/
    pause
    exit /b 1
)

if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo Done.
) else (
    echo Virtual environment already exists.
)

echo Installing dependencies...
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
echo.
echo === Setup complete. Run start.bat to launch the app. ===
pause
