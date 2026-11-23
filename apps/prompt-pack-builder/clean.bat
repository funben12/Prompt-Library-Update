@echo off
echo === Cleaning Prompt Pack Builder project ===

if exist "__pycache__\" rd /s /q __pycache__
if exist "tests\__pycache__\" rd /s /q tests\__pycache__
if exist ".pytest_cache\" rd /s /q .pytest_cache
if exist "build\" rd /s /q build
if exist "dist\" rd /s /q dist
if exist "*.spec" del /q *.spec

for /r %%f in (*.pyc) do del "%%f"

echo Done. Project cleaned.
pause
