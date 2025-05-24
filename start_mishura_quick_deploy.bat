@echo off
chcp 65001 >nul
title МИШУРА - Быстрый деплой (демо-версия)

echo.
echo ===============================================
echo           🎨 МИШУРА - ИИ Стилист 
echo           (Быстрый деплой - демо)
echo ===============================================
echo.

REM Убиваем все процессы Python
taskkill /f /im python.exe >nul 2>&1

echo 🔄 Запуск серверов...
echo.

REM Запускаем демо-API сервер в фоне
echo 🔧 Запуск демо API сервера (порт 8001)...
start "МИШУРА Demo API" /min cmd /c "python api_simple.py"

REM Ждем 2 секунды для запуска API
timeout /t 2 /nobreak >nul

REM Запускаем веб-сервер в фоне
echo 🌐 Запуск веб-сервера (порт 8000)...
start "МИШУРА Web Server" /min cmd /c "python -m http.server 8000 --directory webapp"

REM Ждем 3 секунды для запуска веб-сервера
timeout /t 3 /nobreak >nul

echo.
echo ✅ Серверы запущены!
echo.
echo 🌐 Открывается браузер: http://localhost:8000
echo 🔧 API сервер: http://localhost:8001
echo.
echo 📋 Функции:
echo    • Анализ одежды (демо-ответы)
echo    • Сравнение образов (демо-ответы)  
echo    • Красивые стилистические советы
echo.
echo 🚀 Для перехода на Gemini AI используйте start_mishura_production.bat
echo.

REM Открываем браузер
start http://localhost:8000

echo ⏰ Нажмите любую клавишу для остановки серверов...
pause >nul

REM Останавливаем серверы
echo.
echo 🛑 Остановка серверов...
taskkill /f /im python.exe >nul 2>&1
echo ✅ Серверы остановлены.
echo.
pause 