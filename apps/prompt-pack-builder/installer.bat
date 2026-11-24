@echo off
echo === Building Installer for Prompt Pack Builder ===
echo.

if not exist "dist\PromptPackBuilder.exe" (
    echo dist\PromptPackBuilder.exe not found. Run build.bat first.
    pause
    exit /b 1
)

set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

if not exist %ISCC% (
    set ISCC="C:\Program Files\Inno Setup 6\ISCC.exe"
)

if not exist %ISCC% (
    where ISCC.exe >nul 2>&1
    if errorlevel 1 (
        echo Inno Setup Compiler not found.
        echo Install it from https://jrsoftware.org/isdl.php
        pause
        exit /b 1
    )
    set ISCC=ISCC.exe
)

if not exist "Output\" mkdir Output

%ISCC% installer.iss

echo.
if errorlevel 1 (
    echo === Installer build FAILED. See output above. ===
) else (
    echo === Installer built. Check the Output\ folder. ===
)
pause
