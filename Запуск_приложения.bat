@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title App launcher

echo.
echo  Starting the application...
echo.

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js/npm was not found.
    echo Install Node.js from https://nodejs.org/ and run this file again.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Could not install npm dependencies.
        pause
        exit /b 1
    )
)

set "PYTHON_CMD="
where python >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=python"
if not defined PYTHON_CMD (
    where py >nul 2>nul
    if not errorlevel 1 set "PYTHON_CMD=py -3"
)

if defined PYTHON_CMD (
    %PYTHON_CMD% -c "import edge_tts" >nul 2>nul
    if errorlevel 1 (
        echo Installing Edge-TTS...
        %PYTHON_CMD% -m pip install -r requirements.txt
        if errorlevel 1 echo [WARNING] Edge-TTS installation failed. Browser speech will be used.
    )
) else (
    echo [WARNING] Python was not found. Edge-TTS is unavailable; browser speech will be used.
)

echo.
echo Application URL: http://127.0.0.1:3000/
echo Close this window or press Ctrl+C to stop.
echo.
call npm run dev -- --host 127.0.0.1

endlocal
