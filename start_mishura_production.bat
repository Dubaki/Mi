@echo off
chcp 65001 >nul
title МИШУРА - Продакшен запуск

echo.
echo ===============================================
echo           🎨 МИШУРА - ИИ Стилист (ПРОДАКШЕН)
echo ===============================================
echo.
echo 🚀 Запуск полной системы с Gemini AI...
echo.

REM Проверяем наличие Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python не найден! Установите Python и добавьте в PATH.
    pause
    exit /b 1
)

REM Проверяем наличие .env файла
if not exist ".env" (
    echo ❌ Файл .env не найден!
    echo 📝 Создайте файл .env с вашим GEMINI_API_KEY
    echo 💡 Пример: GEMINI_API_KEY=your_api_key_here
    pause
    exit /b 1
)

REM Запускаем API сервер в фоне
echo 🔧 Запуск Gemini AI API сервера (порт 8001)...
start "МИШУРА Production API" cmd /k "python api_simple.py"

REM Ждем немного для запуска API
timeout /t 3 /nobreak >nul

REM Запускаем веб-сервер
echo 🌐 Запуск веб-приложения (порт 8000)...
cd /d "%~dp0\webapp"
echo.
echo ===============================================
echo ✅ Продакшен система готова!
echo.
echo 📱 Веб-приложение: http://localhost:8000
echo 🤖 Gemini AI API:  http://localhost:8001
echo.
echo 💡 Система работает с реальным ИИ анализом!
echo ===============================================
echo.

python -m http.server 8000 