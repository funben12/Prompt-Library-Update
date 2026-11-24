@echo off
echo === Building Prompt Pack Builder ===
echo.

if not exist "venv\" (
    echo Virtual environment not found. Running setup first...
    call setup.bat
)

call venv\Scripts\activate.bat

pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    pip install pyinstaller --quiet
)

echo Building executable...
pyinstaller --onefile --windowed --noupx --name "PromptPackBuilder" --icon icon.ico --add-data "web;web" --collect-all webview main.py

echo.
if exist "dist\PromptPackBuilder.exe" (
    echo === Build complete. ===
    echo Output: dist\PromptPackBuilder.exe
) else (
    echo === Build may have failed. Check output above. ===
)
pause
