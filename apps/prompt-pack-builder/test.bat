@echo off
echo === Running Tests for Prompt Pack Builder ===
echo.

if not exist "venv\" (
    echo Virtual environment not found. Running setup first...
    call setup.bat
)

call venv\Scripts\activate.bat

pip show pytest >nul 2>&1
if errorlevel 1 (
    echo Installing pytest...
    pip install pytest --quiet
)

echo Running pytest...
echo.
pytest --tb=short -v
echo.
if errorlevel 1 (
    echo === Some tests FAILED. See above for details. ===
) else (
    echo === All tests PASSED. ===
)
pause
