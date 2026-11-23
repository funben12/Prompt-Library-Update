@echo off
echo Starting Prompt Pack Builder...

if not exist "venv\" (
    echo Virtual environment not found. Running setup first...
    call setup.bat
)

call venv\Scripts\activate.bat
python main.py
pause
