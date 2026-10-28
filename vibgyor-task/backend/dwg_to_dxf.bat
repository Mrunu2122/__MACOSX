@echo off
REM DWG to DXF Conversion Script for Windows
REM This script attempts to find and use available DWG conversion tools

SETLOCAL ENABLEDELAYEDEXPANSION

IF "%~1"=="" (
    echo Usage: dwg_to_dxf.bat input.dwg [output.dxf]
    echo.
    echo This script converts DWG files to DXF format using available tools.
    exit /b 1
)

SET INPUT_FILE=%~1
SET OUTPUT_FILE=%~2

IF NOT EXIST "%INPUT_FILE%" (
    echo Error: Input file not found: %INPUT_FILE%
    exit /b 1
)

IF "%OUTPUT_FILE%"=="" (
    FOR %%A IN ("%INPUT_FILE%") DO SET OUTPUT_FILE=%%~dpnA.dxf
)

echo [INFO] Converting DWG to DXF
echo [INFO] Input:  %INPUT_FILE%
echo [INFO] Output: %OUTPUT_FILE%
echo.

REM Try LibreCAD
echo [INFO] Attempting LibreCAD conversion...
FOR %%P IN (
    "C:\Program Files\LibreCAD\LibreCAD.exe"
    "C:\Program Files (x86)\LibreCAD\LibreCAD.exe"
    "C:\Program Files\LibreCAD-2\LibreCAD.exe"
) DO (
    IF EXIST "%%P" (
        echo [OK] Found LibreCAD at %%P
        "%%P" "%INPUT_FILE%" -export-dxf "%OUTPUT_FILE%"
        IF EXIST "%OUTPUT_FILE%" (
            echo [OK] Conversion successful!
            exit /b 0
        )
    )
)

REM Try dwg2dxf command
echo [INFO] Attempting dwg2dxf...
WHERE dwg2dxf >nul 2>nul
IF %ERRORLEVEL% EQU 0 (
    echo [OK] Found dwg2dxf
    dwg2dxf "%INPUT_FILE%" "%OUTPUT_FILE%"
    IF EXIST "%OUTPUT_FILE%" (
        echo [OK] Conversion successful!
        exit /b 0
    )
)

REM Try ODA Converter
echo [INFO] Attempting ODA File Converter...
FOR %%P IN (
    "C:\Program Files\ODA\ODAFileConverter.exe"
    "C:\Program Files (x86)\ODA\ODAFileConverter.exe"
) DO (
    IF EXIST "%%P" (
        echo [OK] Found ODA Converter at %%P
        "%%P" "%~dp1" "%TEMP%" "DXF" "0" "1" "%~nx1"
        IF EXIST "%TEMP%\%~n1.dxf" (
            move "%TEMP%\%~n1.dxf" "%OUTPUT_FILE%"
            echo [OK] Conversion successful!
            exit /b 0
        )
    )
)

REM No tools found
echo.
echo [ERROR] No DWG conversion tools found!
echo.
echo [SOLUTION] Please install one of these tools:
echo.
echo 1. LibreCAD (Recommended)
echo    - Download from: https://librecad.org/
echo    - Run installer and restart this script
echo.
echo 2. Online conversion (No installation needed)
echo    - Visit: https://cloudconvert.com
echo    - Upload DWG file → Download DXF → Use in VIBGYOR
echo.
echo 3. dwg2dxf utility
echo    - Download and install
echo    - Add to system PATH
echo.

exit /b 1
