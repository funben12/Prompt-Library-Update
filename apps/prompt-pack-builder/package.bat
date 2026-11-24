@echo off
echo === Packaging Prompt Pack Builder ===
echo.

if not exist "dist\" (
    echo No dist folder found. Run build.bat first.
    pause
    exit /b 1
)

for /f "tokens=1-3 delims=/" %%a in ("%date%") do (
    set DD=%%a
    set MM=%%b
    set YYYY=%%c
)

set ZIPNAME=PromptPackBuilder-%DD%-%MM%-%YYYY%.zip

powershell -Command "Compress-Archive -Path 'dist\*' -DestinationPath '%ZIPNAME%' -Force"

echo.
echo === Packaged as %ZIPNAME% ===
pause
