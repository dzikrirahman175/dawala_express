@echo off
title DAWALA System
echo ==========================================
echo    DAWALA System - Start Script
echo ==========================================
echo.

:: Memeriksa apakah Node.js sudah terinstall
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan! Silakan install Node.js terlebih dahulu.
    pause
    exit /b
)

:: Memeriksa dan menginstall library jika folder node_modules tidak ada
if not exist "node_modules\" (
    echo [+] Folder node_modules tidak ditemukan. Menginstall library...
    call npm install express cors xlsx
)

:: Membuat database awal jika file Excel belum ditemukan
if not exist "data_warga.xlsx" (
    echo [+] Membuat database Excel awal...
    node generate_excel.js
)

:: Membuka browser ke URL server
echo [+] Membuka browser ke http://localhost:5500...
start http://localhost:5500

:: Menjalankan server Node.js
echo [+] Menjalankan Server...
echo [INFO] Jangan tutup jendela ini selama aplikasi digunakan.
echo.
node server.js

pause