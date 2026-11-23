@echo off
echo === Installing / Updating Requirements for Prompt Pack Builder ===
echo.

if not exist "venv\" (
    echo No virtual environment found. Run setup.bat first.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat
pip install -r requirements.txt
echo.
echo === Requirements installed. ===
pause
