@echo off
chcp 65001 >nul
title МИШУРА - Полный запуск

echo.
echo ===============================================
echo           🎨 МИШУРА - ИИ Стилист
echo ===============================================
echo.
echo 🚀 Запуск полной системы...
echo.

REM Проверяем наличие Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python не найден! Установите Python и добавьте в PATH.
    pause
    exit /b 1
)

REM Запускаем API сервер в фоне
echo 🔧 Запуск API сервера (порт 8001)...
start "МИШУРА API" cmd /k "python api.py"

REM Ждем немного для запуска API
timeout /t 3 /nobreak >nul

REM Запускаем веб-сервер
echo 🌐 Запуск веб-приложения (порт 8000)...
cd /d "%~dp0\webapp"
echo.
echo ===============================================
echo ✅ Система готова!
echo.
echo 📱 Веб-приложение: http://localhost:8000
echo 🔧 API сервер:     http://localhost:8001
echo.
echo 💡 Для полной функциональности оба сервера
echo    должны работать одновременно
echo ===============================================
echo.

python -m http.server 8000 