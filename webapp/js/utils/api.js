window.MishuraApp = window.MishuraApp || {};
window.MishuraApp.utils = window.MishuraApp.utils || {};

window.MishuraApp.utils.api = (function() {
    'use strict';
    
    let logger;
    const API_BASE_URL = 'http://127.0.0.1:8001/api/v1';
    
    function init() {
        logger = window.MishuraApp.utils.logger;
        logger.debug('Инициализация API модуля');
    }
    
    async function sendRequest(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            logger.error('Ошибка при отправке запроса:', error);
            throw error;
        }
    }
    
    async function analyzeImage(imageData, mode = 'single', occasion = null, preferences = null) {
        try {
            console.log('🚀 API: Отправка запроса на анализ', {
                image: imageData.name,
                mode,
                occasion, 
                preferences,
                endpoint: `${API_BASE_URL}/analyze-outfit`
            });
            
            // Реальный API запрос к серверу
            const formData = new FormData();
            formData.append('image', imageData);
            formData.append('mode', mode);
            
            if (occasion) {
                formData.append('occasion', occasion);
            }
            
            if (preferences) {
                formData.append('preferences', preferences);
            }
            
            const response = await fetch(`${API_BASE_URL}/analyze-outfit`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            logger.error('Ошибка при анализе изображения:', error);
            
            // Fallback: Возвращаем информативное сообщение об ошибке вместо исключения
            if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('net::ERR_CONNECTION_REFUSED')) {
                logger.warn('⚠️ API сервер недоступен. Возвращаю информационный ответ...');
                return {
                    status: 'error',
                    message: 'API сервер не запущен. Для получения стилистических советов необходимо запустить сервер командой: python api.py',
                    error_type: 'connection_refused'
                };
            }
            
            // Для других ошибок возвращаем общее сообщение
            return {
                status: 'error', 
                message: `Ошибка подключения к серверу: ${error.message}`,
                error_type: 'general_error'
            };
        }
    }
    
    async function compareImages(images, occasion = null, preferences = null) {
        try {
            console.log('🚀 API: Отправка запроса на сравнение', {
                images: images.map(img => img ? img.name : null),
                occasion, 
                preferences,
                endpoint: `${API_BASE_URL}/compare-outfits`
            });
            
            const formData = new FormData();
            
            images.forEach((image, index) => {
                if (image) {
                    formData.append('images', image);
                    console.log(`📎 Добавлено изображение ${index + 1}: ${image.name}`);
                }
            });
            
            if (occasion) {
                formData.append('occasion', occasion);
                console.log(`🎯 Повод: ${occasion}`);
            }
            
            if (preferences) {
                formData.append('preferences', preferences);
                console.log(`💭 Предпочтения: ${preferences}`);
            }

            // Реальный API запрос к серверу
            const response = await fetch(`${API_BASE_URL}/compare-outfits`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            logger.error('Ошибка при сравнении изображений:', error);
            
            // Fallback: Возвращаем информативное сообщение об ошибке вместо исключения
            if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.message.includes('net::ERR_CONNECTION_REFUSED')) {
                logger.warn('⚠️ API сервер недоступен. Возвращаю информационный ответ...');
                return {
                    status: 'error',
                    message: 'API сервер не запущен. Для получения стилистических советов необходимо запустить сервер командой: python api.py',
                    error_type: 'connection_refused'
                };
            }
            
            // Для других ошибок возвращаем общее сообщение
            return {
                status: 'error', 
                message: `Ошибка подключения к серверу: ${error.message}`,
                error_type: 'general_error'
            };
        }
    }
    
    async function processCompareOutfits(formData) {
        try {
            const response = await fetch(`${API_BASE_URL}/compare-outfits`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            logger.error('Ошибка при сравнении образов:', error);
            throw error;
        }
    }
    
    return {
        init,
        sendRequest,
        analyzeImage,
        compareImages,
        processCompareOutfits
    };
})(); 