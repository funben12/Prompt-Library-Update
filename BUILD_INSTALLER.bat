@echo off
REM =============================================================================
REM  Build Installer — Prompt Library Pro
REM  Compiles PromptLibrary.iss into an executable installer
REM =============================================================================

setlocal enabledelayedexpansion

REM Find Inno Setup compiler
set "ISCC=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"

if not exist "!ISCC!" (
    echo ERROR: Inno Setup 6 not found at !ISCC!
    echo Please install from: https://jrsoftware.org/isdl.php
    pause
    exit /b 1
)

REM Check that PromptLibrary.iss exists
if not exist "PromptLibrary.iss" (
    echo ERROR: PromptLibrary.iss not found in current directory
    pause
    exit /b 1
)

REM Check that the EXE was built
if not exist "dist\PromptLibrary.exe" (
    echo ERROR: dist\PromptLibrary.exe not found
    echo Run Build.bat first to compile the app
    pause
    exit /b 1
)

REM Create output directory
if not exist "installer" mkdir installer

REM Compile
echo.
echo Compiling PromptLibrary.iss...
echo.
"!ISCC!" PromptLibrary.iss

if errorlevel 1 (
    echo.
    echo ERROR: Compilation failed
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Installer created successfully!
echo Output: installer\PromptLibraryPro_Setup_PreRelease_2.exe
echo ============================================================
echo.
pause
