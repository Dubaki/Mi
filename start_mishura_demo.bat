@echo off
chcp 65001 >nul
title МИШУРА - Демо запуск

echo.
echo ===============================================
echo           🎨 МИШУРА - ИИ Стилист (ДЕМО)
echo ===============================================
echo.
echo 🚀 Запуск демо-системы...
echo.

REM Проверяем наличие Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python не найден! Установите Python и добавьте в PATH.
    pause
    exit /b 1
)

REM Запускаем демо API сервер в фоне
echo 🔧 Запуск Demo API сервера (порт 8001)...
start "МИШУРА Demo API" cmd /k "python api_simple.py"

REM Ждем немного для запуска API
timeout /t 3 /nobreak >nul

REM Запускаем веб-сервер
echo 🌐 Запуск веб-приложения (порт 8000)...
cd /d "%~dp0\webapp"
echo.
echo ===============================================
echo ✅ Демо-система готова!
echo.
echo 📱 Веб-приложение: http://localhost:8000
echo 🔧 Demo API:       http://localhost:8001
echo.
echo 💡 Демо-режим: получите стилистические советы
echo    без внешних зависимостей!
echo ===============================================
echo.

python -m http.server 8000 