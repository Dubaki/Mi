@echo off
chcp 65001 >nul
title МИШУРА - Продакшен с Gemini AI

echo.
echo ===============================================
echo           🎨 МИШУРА - ИИ Стилист 
echo         (ПРОДАКШЕН с Gemini AI)
echo ===============================================
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

REM Убиваем все процессы Python
taskkill /f /im python.exe >nul 2>&1

echo 🔄 Запуск ПРОДАКШЕН серверов...
echo.

REM Запускаем Gemini AI API сервер в фоне
echo 🤖 Запуск Gemini AI API сервера (порт 8001)...
start "МИШУРА Gemini AI API" /min cmd /c "python api.py"

REM Ждем 3 секунды для запуска API
timeout /t 3 /nobreak >nul

REM Запускаем веб-сервер в фоне
echo 🌐 Запуск веб-сервера (порт 8000)...
start "МИШУРА Web Server" /min cmd /c "python -m http.server 8000 --directory webapp"

REM Ждем 2 секунды для запуска веб-сервера
timeout /t 2 /nobreak >nul

echo.
echo ✅ ПРОДАКШЕН серверы запущены!
echo.
echo 🌐 Открывается браузер: http://localhost:8000
echo 🤖 Gemini AI API: http://localhost:8001
echo.
echo 📋 Возможности:
echo    • 🧠 Реальный анализ Gemini AI
echo    • 🎯 Профессиональные советы по стилю
echo    • 👗 Сравнение нескольких образов  
echo    • 💾 Умное кэширование результатов
echo    • 📊 Детальный анализ одежды
echo.
echo 💡 Для демо-версии используйте start_mishura_quick_deploy.bat
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