/*
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Главный модуль (main.js)
ВЕРСИЯ: 0.4.1 (Улучшенная проверка Telegram WebApp API)
ДАТА ОБНОВЛЕНИЯ: 2025-05-21

НАЗНАЧЕНИЕ ФАЙЛА:
Главный модуль приложения МИШУРА. Точка входа для инициализации всех компонентов.
==========================================================================================
*/

window.MishuraApp = window.MishuraApp || {};

(function(app) {
    'use strict';
    
    let MainLogger, MainDeviceDetect, MainUIHelpers, MainModals, MainNavigation, MainImageUpload, MainAPIService;
    let MainConsultationFeature, MainComparisonFeature, MainTryOnFeature;
    let MainAIService;
    
    const REQUIRED_MODULES = {
        "Logger": "MishuraApp.utils.logger",
        "DeviceDetect": "MishuraApp.utils.deviceDetector", // Исправлено с deviceDetect на deviceDetector
        "UIHelpers": "MishuraApp.utils.uiHelpers",
        "APIService": "MishuraApp.api.service",
        "AIService": "MishuraApp.services.aiService",
        "Modals": "MishuraApp.components.modals",
        "Navigation": "MishuraApp.components.navigation",
        "ImageUpload": "MishuraApp.components.imageUpload",
        "ConsultationFeature": "MishuraApp.features.consultation",
        "ComparisonFeature": "MishuraApp.features.comparison",
        "TryOnFeature": "MishuraApp.features.tryOn"
    };

    function checkRequiredModules(loggerInstance) {
        let allFound = true;
        for (const name in REQUIRED_MODULES) {
            const path = REQUIRED_MODULES[name];
            const parts = path.split('.');
            let current = window;
            let found = true;
            for (const part of parts) {
                if (current && typeof current === 'object' && part in current) {
                    current = current[part];
                } else {
                    found = false;
                    break;
                }
            }
            if (!found) {
                (loggerInstance || console).error(`Main.js: ОБЯЗАТЕЛЬНЫЙ МОДУЛЬ НЕ НАЙДЕН: ${name} (ожидался по пути ${path})`);
                allFound = false;
            }
        }
        return allFound;
    }
        
    function initTelegramWebApp(loggerInstance) {
        const logger = loggerInstance || console;
        if (window.Telegram && window.Telegram.WebApp) {
            logger.info("Main.js: Telegram WebApp API доступен. Вызов ready()...");
            try {
                Telegram.WebApp.ready(); 
                logger.info("Main.js: Telegram.WebApp.ready() успешно вызван.");
                
                if (!Telegram.WebApp.isExpanded) {
                    Telegram.WebApp.expand();
                    logger.info("Main.js: Telegram.WebApp.expand() вызван.");
                }
                // Telegram.WebApp.enableClosingConfirmation(); // Если нужно подтверждение при закрытии
                // Telegram.WebApp.setHeaderColor('#ваш_цвет'); // Если нужно кастомизировать цвет хедера
                // Telegram.WebApp.setBackgroundColor('#ваш_цвет_фона');
                return true;
            } catch (e) {
                logger.error("Main.js: Ошибка при работе с Telegram.WebApp:", e.message, e.stack);
                return false;
            }
        } else {
            logger.warn("Main.js: window.Telegram.WebApp не найден! Приложение запущено вне Telegram или API не загрузился.");
            return false;
        }
    }
    
    function setupErrorHandling(loggerInstance) {
        const logger = loggerInstance || console;
        window.onerror = function(message, source, lineno, colno, error) {
            logger.error("Main.js: Глобальная ошибка JavaScript:", {message, source, lineno, colno, error: error ? error.stack : 'N/A'});
            
            // Используем MainUIHelpers, если он уже инициализирован
            const uiHelpers = MainUIHelpers || (app.utils && app.utils.uiHelpers);
            if (uiHelpers && typeof uiHelpers.showToast === 'function') {
                uiHelpers.showToast("Произошла критическая ошибка. Пожалуйста, перезагрузите приложение.", 5000);
            } else {
                alert("Произошла критическая ошибка. Пожалуйста, перезагрузите приложение. Проверьте консоль для деталей.");
            }
            return false; 
        };
        window.onunhandledrejection = function(event) {
            logger.error("Main.js: Глобальная ошибка (необработанный Promise rejection):", event.reason);
        };
    }
    
    app.init = function() {
        // Получаем логгер как можно раньше, даже если он еще не проинициализирован через app.js
        MainLogger = (app.utils && app.utils.logger) || console;
        
        if (!checkRequiredModules(MainLogger)) {
            MainLogger.error("Main.js: Не все обязательные модули были найдены. Инициализация может быть неполной или некорректной.");
        }

        MainLogger.info("Main.js: Начало инициализации приложения МИШУРА (app.init)");
        
        setupErrorHandling(MainLogger); // Настраиваем глобальный обработчик ошибок
        
        // Ссылки на модули (предполагаем, что они уже загружены и добавлены в window.MishuraApp)
        MainDeviceDetect = app.utils.deviceDetector; 
        MainUIHelpers = app.utils.uiHelpers;
        MainModals = app.components.modals;
        MainNavigation = app.components.navigation;
        MainImageUpload = app.components.imageUpload;
        MainAPIService = app.api.service;
        
        // Инициализация API сервиса
        if (MainAPIService && typeof MainAPIService.init === 'function') {
            MainAPIService.init();
            MainLogger.info("Main.js: API Service инициализирован");
        } else {
            MainLogger.error("Main.js: API Service не найден или не имеет метода init");
        }
        
        // Инициализация AI сервиса
        if (app.services && app.services.aiService) {
            MainAIService = app.services.aiService;
            if (typeof MainAIService.init === 'function') {
                MainAIService.init();
                MainLogger.info("Main.js: AI Service инициализирован");
            } else {
                MainLogger.error("Main.js: AI Service не имеет метода init");
            }
        } else {
            MainLogger.error("Main.js: AI Service не найден");
        }
        
        MainConsultationFeature = app.features.consultation;
        MainComparisonFeature = app.features.comparison;
        MainTryOnFeature = app.features.tryOn;

        // Инициализация модулей
        if (MainConsultationFeature && typeof MainConsultationFeature.init === 'function') {
            MainConsultationFeature.init();
            MainLogger.info("Main.js: Модуль консультации инициализирован");
        }
        
        if (MainComparisonFeature && typeof MainComparisonFeature.init === 'function') {
            MainComparisonFeature.init();
            MainLogger.info("Main.js: Модуль сравнения инициализирован");
        }
        
        if (MainTryOnFeature && typeof MainTryOnFeature.init === 'function') {
            MainTryOnFeature.init();
            MainLogger.info("Main.js: Модуль примерки инициализирован");
        } else {
            MainLogger.error("Main.js: Модуль примерки не найден или не имеет метода init");
        }

        // Инициализация Telegram WebApp API
        const telegramInitialized = initTelegramWebApp(MainLogger);
        if (!telegramInitialized && !(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            MainLogger.warn("Main.js: Telegram WebApp API не инициализирован, некоторые функции могут быть недоступны.");
        }
        
        MainLogger.info("Main.js: Инициализация приложения МИШУРА (app.init) завершена.");
    };
    
    app.version = '0.4.1';
    
})(window.MishuraApp);

// Экспортируем интерфейс для вызова из app.js
// Убедимся, что window.MishuraApp.main не перезаписывается, если он уже есть
if (!window.MishuraApp.main) {
    window.MishuraApp.main = {
        init: function() {
            if (window.MishuraApp && typeof window.MishuraApp.init === 'function') {
                window.MishuraApp.init();
            } else {
                console.error("Main.js (экспорт): window.MishuraApp.init не является функцией!");
            }
        },
        version: window.MishuraApp.version || '0.4.1'
    };
} else if (typeof window.MishuraApp.main.init !== 'function') { // Если main есть, но без init
     console.warn("Main.js (экспорт): window.MishuraApp.main уже существует, но не имеет метода init. Перезапись.");
     window.MishuraApp.main.init = function() { /* ... */ };
     window.MishuraApp.main.version = window.MishuraApp.version || '0.4.1';
}