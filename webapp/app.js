// 🎭 МИШУРА - Твой Стилист
// Главный файл приложения - app.js (ПРОДАКШН ВЕРСИЯ С ПАТЧАМИ V2 + STcoin + ЮKassa)
// Версия: 2.3.0 - Все критические исправления + STcoin система + ЮKassa интеграция

console.log('🎭 МИШУРА App загружается с патчами V2 + STcoin + ЮKassa...');

class MishuraApp {
    constructor() {
        console.log('🚀 Инициализация MishuraApp с патчами V2 + STcoin + ЮKassa...');
        
        // Состояние приложения
        this.currentMode = null; // 'single' или 'compare'
        this.currentSection = 'home'; // 'home', 'history', 'balance'
        this.compareImages = [null, null, null, null];
        this.singleImage = null;
        this.isLoading = false;
        this.lastAnalysisResult = null;
        
        // ПАТЧ V2: Увеличен timeout до 90 секунд
        this.requestTimeout = 90000; // 90 секунд вместо 30
        
        // ПАТЧ V2: Предотвращение бесконечных циклов
        this.eventListenersAttached = false;
        this.initializationComplete = false;
        
        // Пользовательские данные - STcoin система
        this.userBalance = 200; // STcoin баланс
        this.consultationsHistory = [];
        this.consultationsUsed = 0;
        
        // НОВОЕ: Состояние платежей ЮKassa
        this.paymentPackages = null;
        this.currentPayment = null;
        this.paymentCheckInterval = null;
        
        // ПАТЧ V2: Исправленная инициализация API с правильным контекстом
        this.api = null;
        this.initializeAPI();
        
        // Варианты поводов (расширенный список из тестирования)
        this.occasionOptions = [
            '💼 Деловая встреча',
            '❤️ Свидание', 
            '🚶 Повседневная прогулка',
            '🎉 Вечеринка',
            '👔 Собеседование',
            '🍽️ Ужин в ресторане',
            '🎭 Театр/концерт',
            '🏋️ Спортзал/тренировка',
            '🛍️ Шоппинг',
            '✈️ Путешествие',
            '🎓 Учеба/университет',
            '🏠 Дома/отдых',
            '🌞 Пляж/отпуск',
            '❄️ Зимняя прогулка',
            '🌧️ Дождливая погода',
            '🎪 Мероприятие на свежем воздухе',
            '🏢 Офисная работа',
            '🎨 Творческое мероприятие',
            '👶 Встреча с детьми',
            '👥 Деловые переговоры'
        ];
        
        // Аналитика
        this.analytics = {
            appStartTime: Date.now(),
            analysisRequested: 0,
            successfulAnalysis: 0,
            errors: 0
        };
        
        // ПАТЧ V2: Отложенная инициализация для предотвращения race condition
        this.init = this.init.bind(this);
        setTimeout(() => this.init(), 100);
    }

    // ПАТЧ V2: Асинхронная инициализация API с healthcheck и fallback на Mock
    async initializeAPI() {
        try {
            let healthCheck = null;
            
            // ИСПРАВЛЕНО: Правильные порты для вашей конфигурации
            let apiUrl;
            
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                // Локальная разработка - ваш api.py работает на порту 8000
                apiUrl = 'http://localhost:8000/api/v1/health';
            } else {
                // Продакшн на Render - тот же домен (api.py обслуживает всё)
                apiUrl = `${window.location.protocol}//${window.location.hostname}/api/v1/health`;
            }
            
            console.log('🔍 Проверяем API по адресу:', apiUrl);
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // Увеличили до 15 сек
                
                const response = await fetch(apiUrl, { 
                    signal: controller.signal,
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    const healthData = await response.json();
                    console.log('🏥 Статус API:', healthData);
                    
                    // Проверяем что Gemini работает
                    if (healthData.gemini_working) {
                        healthCheck = response;
                        console.log('✅ Gemini AI доступен');
                    } else {
                        console.warn('⚠️ Gemini AI недоступен, используем Mock');
                        healthCheck = null;
                    }
                } else {
                    console.warn('⚠️ API вернул ошибку:', response.status, response.statusText);
                    healthCheck = null;
                }
                
            } catch (e) {
                console.warn('⚠️ Ошибка подключения к API:', e.message);
                healthCheck = null;
            }

            if (healthCheck && healthCheck.ok) {
                // Используем реальный API
                this.api = new window.MishuraAPIService();
                console.log('✅ Реальный API подключен');
                
                // Проверяем что API действительно работает
                try {
                    const status = await this.api.getStatus();
                    if (status && status.api_status === 'online') {
                        console.log('🎯 API полностью работоспособен');
                        
                        // НОВОЕ: Загружаем пакеты платежей
                        await this.loadPaymentPackages();
                    } else {
                        throw new Error('API не прошел проверку статуса');
                    }
                } catch (e) {
                    console.warn('⚠️ API недоступен при проверке, переключаемся на Mock');
                    this.api = new window.MockMishuraAPIService();
                    console.log('🎭 Автоматический переход на Mock API');
                }
            } else {
                // Fallback на Mock API
                this.api = new window.MockMishuraAPIService();
                console.log('🎭 Автоматический переход на Mock API');
            }
            
            // Обновляем UI в зависимости от типа API
            this.updateAPIStatus();
            
        } catch (error) {
            this.api = new window.MockMishuraAPIService();
            console.log('🎭 Mock API активирован из-за ошибки:', error);
            this.updateAPIStatus();
        }
    }

    // НОВОЕ: Загрузка пакетов платежей с API
    async loadPaymentPackages() {
        try {
            console.log('💳 Загрузка пакетов платежей...');
            
            const response = await fetch('/api/v1/payments/packages');
            if (response.ok) {
                const data = await response.json();
                this.paymentPackages = data.packages;
                console.log('✅ Пакеты платежей загружены:', Object.keys(this.paymentPackages).length);
            } else {
                console.warn('⚠️ Не удалось загрузить пакеты платежей');
                this.paymentPackages = null;
            }
        } catch (error) {
            console.warn('⚠️ Ошибка загрузки пакетов:', error);
            this.paymentPackages = null;
        }
    }

    // НОВЫЙ: Метод для обновления индикатора API в интерфейсе
    updateAPIStatus() {
        const isRealAPI = this.api && !this.api.isMock;
        const statusElement = document.querySelector('.api-status');
        
        if (statusElement) {
            statusElement.textContent = isRealAPI ? '🌐 Реальный API' : '🎭 Демо-режим';
            statusElement.className = `api-status ${isRealAPI ? 'real' : 'demo'}`;
        }
        
        // Показываем уведомление только в демо-режиме
        if (!isRealAPI) {
            setTimeout(() => {
                this.showNotification('🔬 Работаем в демо-режиме с примерами ответов', 'info', 4000);
            }, 2000);
        }
    }

    // 🎯 ПАТЧ V2: Исправленная инициализация без циклов
    init() {
        if (this.initializationComplete) {
            console.log('⚠️ Инициализация уже завершена, пропускаем');
            return;
        }

        try {
            console.log('🎯 Начало безопасной инициализации...');
            
            // Основные обработчики с защитой от дублирования
            this.setupModeButtons();
            this.setupCloseButtons();
            this.setupSubmitButton();
            this.initUploaders();
            this.setupNavigation();
            
            // Дополнительные функции
            this.setupKeyboardShortcuts();
            this.setupDragAndDrop();
            this.setupContextMenu();
            this.setupOccasionDropdown();
            this.setupResultNavigation(); // НОВОЕ: навигация после результатов
            
            // Загружаем данные пользователя
            this.loadUserData();
            
            // Telegram интеграция
            this.setupTelegramIntegration();
            
            this.initializationComplete = true;
            console.log('✅ MishuraApp инициализирован с патчами V2 + STcoin + ЮKassa');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }

    // НОВОЕ: Настройка навигации после результатов (из тестирования)
    setupResultNavigation() {
        document.addEventListener('click', (event) => {
            if (event.target.matches('#result-back')) {
                this.backToSelection();
            } else if (event.target.matches('#result-new')) {
                this.startNewAnalysis();
            }
        });
        console.log('✅ Навигация результатов настроена');
    }

    // НОВОЕ: Возврат к выбору изображений
    backToSelection() {
        this.hideResult();
        
        if (this.currentMode === 'single') {
            const singleMode = document.getElementById('single-mode');
            if (singleMode) singleMode.classList.add('active');
        } else if (this.currentMode === 'compare') {
            const compareMode = document.getElementById('compare-mode');
            if (compareMode) compareMode.classList.add('active');
        }
        
        // Показываем форму если есть изображения
        if ((this.currentMode === 'single' && this.singleImage) || 
            (this.currentMode === 'compare' && this.compareImages.filter(img => img !== null).length >= 2)) {
            this.showForm();
        }
        
        console.log('⬅️ Возврат к выбору изображений');
    }

    // НОВОЕ: Начать новый анализ
    startNewAnalysis() {
        this.closeModal();
        console.log('🆕 Начало нового анализа');
    }

    // 🧭 ПАТЧ V2: Улучшенная настройка навигации без циклов
    setupNavigation() {
        if (this.navigationSetup) {
            return; // Предотвращаем повторную настройку
        }

        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(btn => {
            // Удаляем старые обработчики перед добавлением новых
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', () => {
                const targetSection = newBtn.id.replace('nav-', '');
                this.navigateToSection(targetSection);
                this.triggerHapticFeedback('light');
            });
        });
        
        this.navigationSetup = true;
        console.log('✅ Навигация настроена без циклов');
    }

    navigateToSection(section) {
        console.log(`🧭 Переход в раздел: ${section}`);
        
        // Обновляем активную кнопку
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.getElementById(`nav-${section}`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        
        // Показываем нужный контент
        this.currentSection = section;
        this.showSection(section);
        
        // Закрываем модальное окно если открыто
        this.closeModal();
    }

    showSection(section) {
        switch (section) {
            case 'home':
                this.showHomeSection();
                break;
            case 'history':
                this.showHistorySection();
                break;
            case 'balance':
                this.showBalanceSection();
                break;
        }
    }

    showHomeSection() {
        const container = document.querySelector('.container');
        if (!container) return;
        
        container.innerHTML = `
            <header class="header">
                <h1>✨ МИШУРА</h1>
                <p>Твой личный стилист в кармане</p>
            </header>

            <div class="action-buttons">
                <button id="single-mode-btn" class="action-btn">
                    <span class="icon">📷</span>
                    Анализ образа
                </button>
                <button id="compare-mode-btn" class="action-btn">
                    <span class="icon">🔄</span>
                    Сравнение образов
                </button>
            </div>
        `;
        
        // ИСПРАВЛЕНИЕ: Сбрасываем флаг и переинициализируем обработчики
        setTimeout(() => {
            this.modeButtonsSetup = false;
            this.setupModeButtons();
        }, 100);
    }

    // STcoin: Обновленная секция истории (2 строчки)
    showHistorySection() {
        const container = document.querySelector('.container');
        if (!container) return;
        
        const history = this.consultationsHistory.slice(-10).reverse();
        const consultationsRemaining = Math.floor(this.userBalance / 10); // STcoin: расчет из STcoin
        
        let historyHTML = `
            <header class="header">
                <h1>📚 История</h1>
                <p>Ваши консультации стилиста</p>
            </header>
            
            <div class="stats-card" style="
                background: rgba(212, 175, 55, 0.1);
                border: 1px solid var(--border-gold);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 20px;
                text-align: center;
            ">
                <div style="color: var(--text-gold); font-size: 1.2rem; font-weight: 700; margin-bottom: 6px;">
                    Осталось консультаций: ${consultationsRemaining}
                </div>
                <div style="color: var(--text-muted); font-size: 0.9rem;">
                    ${this.userBalance} STcoin
                </div>
            </div>
        `;

        if (history.length === 0) {
            historyHTML += `
                <div style="
                    text-align: center;
                    padding: 40px 20px;
                    color: var(--text-muted);
                ">
                    <div style="font-size: 3rem; margin-bottom: 16px;">📝</div>
                    <div style="font-size: 1.1rem;">История пуста</div>
                    <div style="font-size: 0.9rem; margin-top: 8px;">
                        Получите первую консультацию!
                    </div>
                </div>
            `;
        } else {
            historyHTML += '<div class="history-list">';
            
            history.forEach((consultation, index) => {
                const date = new Date(consultation.timestamp).toLocaleDateString('ru-RU');
                const time = new Date(consultation.timestamp).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                historyHTML += `
                    <div class="history-item" style="
                        background: rgba(26, 26, 26, 0.8);
                        border: 1px solid var(--border-light);
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 12px;
                        cursor: pointer;
                        transition: var(--transition);
                    " onclick="window.mishuraApp.viewConsultation(${this.consultationsHistory.length - 1 - index})">
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 8px;
                        ">
                            <span style="
                                color: var(--text-gold);
                                font-weight: 600;
                                text-transform: uppercase;
                                font-size: 0.9rem;
                            ">${consultation.occasion}</span>
                            <span style="
                                color: var(--text-muted);
                                font-size: 0.8rem;
                            ">${date} ${time}</span>
                        </div>
                        <div style="
                            color: var(--text-light);
                            font-size: 0.9rem;
                            line-height: 1.4;
                            display: -webkit-box;
                            -webkit-line-clamp: 2;
                            -webkit-box-orient: vertical;
                            overflow: hidden;
                        ">
                            ${consultation.advice.replace(/<[^>]*>/g, '').substring(0, 100)}...
                        </div>
                    </div>
                `;
            });
            
            historyHTML += '</div>';
        }

        container.innerHTML = historyHTML;
    }

    // STcoin + ЮKassa: Обновленная секция баланса с интеграцией платежей
    showBalanceSection() {
        const container = document.querySelector('.container');
        if (!container) return;
        
        const consultationsRemaining = Math.floor(this.userBalance / 10); // STcoin: расчет консультаций из STcoin
        
        container.innerHTML = `
            <header class="header">
                <h1>💰 Баланс</h1>
                <p>Управление STcoin</p>
            </header>
            
            <div class="balance-card" style="
                background: var(--gold-gradient);
                color: var(--text-dark);
                border-radius: 20px;
                padding: 24px;
                margin-bottom: 24px;
                text-align: center;
                box-shadow: var(--shadow-gold);
            ">
                <div style="font-size: 2.5rem; font-weight: 900; margin-bottom: 8px;">
                    ${this.userBalance}
                </div>
                <div style="font-size: 1.1rem; font-weight: 600; text-transform: uppercase;">
                    STcoin
                </div>
                <div style="font-size: 0.9rem; margin-top: 8px; opacity: 0.8;">
                    Доступно консультаций: ${consultationsRemaining}
                </div>
            </div>
            
            <div class="usage-stats" style="
                background: rgba(26, 26, 26, 0.8);
                border: 1px solid var(--border-light);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 24px;
            ">
                <h3 style="
                    color: var(--text-gold);
                    margin-bottom: 16px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    font-size: 1rem;
                ">📊 Статистика использования</h3>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: var(--text-muted);">Всего получено:</span>
                    <span style="color: var(--text-light); font-weight: 600;">${this.consultationsHistory.length}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: var(--text-muted);">Потрачено STcoin:</span>
                    <span style="color: var(--text-light); font-weight: 600;">${this.consultationsUsed}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Остаток STcoin:</span>
                    <span style="color: var(--text-gold); font-weight: 600;">${this.userBalance}</span>
                </div>
            </div>
            
            <div class="add-balance-section">
                <button id="add-balance-btn" class="action-btn" style="
                    width: 100%;
                    margin-bottom: 16px;
                    background: rgba(26, 26, 26, 0.8);
                    border: 2px solid var(--border-gold);
                    color: var(--text-gold);
                ">
                    <span class="icon">💳</span>
                    Пополнить STcoin
                </button>
                
                <div style="
                    background: rgba(212, 175, 55, 0.1);
                    border: 1px solid var(--border-gold);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                ">
                    <div style="
                        color: var(--text-gold);
                        font-weight: 600;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        font-size: 0.9rem;
                    ">💡 Информация</div>
                    <div style="
                        color: var(--text-light);
                        font-size: 0.9rem;
                        line-height: 1.4;
                    ">
                        Каждый новый пользователь получает 200 STcoin. 
                        Одна консультация стоит 10 STcoin.
                        Пополнение через безопасную платежную систему ЮKassa.
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем обработчик для кнопки пополнения
        const addBalanceBtn = document.getElementById('add-balance-btn');
        if (addBalanceBtn) {
            addBalanceBtn.addEventListener('click', () => {
                this.showPaymentModal();
            });
        }
    }

    // НОВОЕ: Модальное окно пополнения через ЮKassa
    showPaymentModal() {
        // Проверяем доступность пакетов
        if (!this.paymentPackages) {
            this.showNotification('🔄 Загружаем пакеты пополнения...', 'info');
            this.loadPaymentPackages().then(() => {
                if (this.paymentPackages) {
                    this.showPaymentModal();
                } else {
                    this.showNotification('❌ Пакеты пополнения недоступны', 'error');
                }
            });
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'payment-modal';
        
        let packagesHTML = '';
        Object.entries(this.paymentPackages).forEach(([packageId, packageData]) => {
            const isPopular = packageData.popular;
            packagesHTML += `
                <div class="payment-package ${isPopular ? 'popular' : ''}" 
                     data-package-id="${packageId}"
                     style="
                        background: ${isPopular ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))' : 'rgba(26, 26, 26, 0.8)'};
                        border: 2px solid ${isPopular ? 'var(--border-gold)' : 'var(--border-light)'};
                        border-radius: 16px;
                        padding: 20px;
                        margin-bottom: 16px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                     ">
                    ${isPopular ? '<div style="position: absolute; top: -8px; right: 16px; background: var(--accent-gold); color: var(--bg-primary); padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">🔥 ПОПУЛЯРНЫЙ</div>' : ''}
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h3 style="color: var(--text-gold); margin: 0; font-size: 1.2rem;">${packageData.name}</h3>
                        <div style="color: var(--text-light); font-size: 1.5rem; font-weight: 700;">${packageData.price_rub}₽</div>
                    </div>
                    
                    <div style="color: var(--text-muted); margin-bottom: 12px; font-size: 0.9rem;">
                        ${packageData.description}
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="color: var(--text-light);">
                            <span style="font-size: 1.1rem; font-weight: 600;">${packageData.stcoin}</span>
                            <span style="color: var(--text-muted); margin-left: 4px;">STcoin</span>
                        </div>
                        <div style="color: var(--text-muted); font-size: 0.9rem;">
                            ${packageData.consultations} консультаций
                        </div>
                    </div>
                </div>
            `;
        });

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">💳 Пополнение STcoin</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="
                        background: rgba(212, 175, 55, 0.1);
                        border: 1px solid var(--border-gold);
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 20px;
                        text-align: center;
                    ">
                        <div style="color: var(--text-gold); font-weight: 600; margin-bottom: 8px;">
                            🔒 Безопасная оплата через ЮKassa
                        </div>
                        <div style="color: var(--text-light); font-size: 0.9rem;">
                            Принимаем карты Visa, MasterCard, МИР, СБП и другие способы оплаты
                        </div>
                    </div>
                    
                    <div class="payment-packages">
                        ${packagesHTML}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Добавляем обработчики клика на пакеты
        modal.querySelectorAll('.payment-package').forEach(packageElement => {
            packageElement.addEventListener('click', () => {
                const packageId = packageElement.dataset.packageId;
                this.initiatePayment(packageId);
            });
            
            // Hover эффекты
            packageElement.addEventListener('mouseenter', () => {
                packageElement.style.transform = 'translateY(-2px)';
                packageElement.style.boxShadow = '0 8px 24px rgba(212, 175, 55, 0.3)';
            });
            
            packageElement.addEventListener('mouseleave', () => {
                packageElement.style.transform = 'translateY(0)';
                packageElement.style.boxShadow = 'none';
            });
        });
        
        this.triggerHapticFeedback('light');
    }

    // НОВОЕ: Инициация платежа через ЮKassa
    async initiatePayment(packageId) {
        const packageData = this.paymentPackages[packageId];
        if (!packageData) {
            this.showNotification('❌ Пакет не найден', 'error');
            return;
        }

        try {
            this.showNotification('💳 Создаем платеж...', 'info');

            // Создаем платеж через API
            const response = await fetch('/api/v1/payments/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: 12345, // TODO: Получать реальный user_id
                    package_id: packageId,
                    return_url: window.location.origin + '/webapp'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const paymentData = await response.json();

            if (paymentData.status === 'success') {
                // Сохраняем информацию о платеже
                this.currentPayment = {
                    id: paymentData.payment_id,
                    packageId: packageId,
                    amount: paymentData.amount,
                    stcoinAmount: paymentData.stcoin_amount,
                    confirmationUrl: paymentData.confirmation_url
                };

                // Закрываем модальное окно пакетов
                const paymentModal = document.getElementById('payment-modal');
                if (paymentModal) {
                    paymentModal.remove();
                }

                // Показываем модальное окно подтверждения
                this.showPaymentConfirmation();

            } else {
                throw new Error(paymentData.message || 'Не удалось создать платеж');
            }

        } catch (error) {
            console.error('❌ Ошибка создания платежа:', error);
            this.showNotification('❌ Ошибка создания платежа. Попробуйте позже.', 'error');
        }
    }

    // НОВОЕ: Модальное окно подтверждения платежа
    showPaymentConfirmation() {
        if (!this.currentPayment) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'payment-confirmation-modal';

        const packageData = this.paymentPackages[this.currentPayment.packageId];

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2 class="modal-title">💳 Подтверждение платежа</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="
                        background: var(--gold-gradient);
                        color: var(--text-dark);
                        border-radius: 16px;
                        padding: 20px;
                        margin-bottom: 20px;
                        text-align: center;
                    ">
                        <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">
                            ${packageData.name}
                        </div>
                        <div style="font-size: 2rem; font-weight: 900; margin-bottom: 8px;">
                            ${this.currentPayment.amount}₽
                        </div>
                        <div style="font-size: 1rem; opacity: 0.8;">
                            ${this.currentPayment.stcoinAmount} STcoin
                        </div>
                    </div>
                    
                    <div style="
                        background: rgba(26, 26, 26, 0.8);
                        border: 1px solid var(--border-light);
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 20px;
                    ">
                        <div style="color: var(--text-light); margin-bottom: 12px;">
                            <strong>Что получите:</strong>
                        </div>
                        <div style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.4;">
                            • ${this.currentPayment.stcoinAmount} STcoin на ваш баланс<br>
                            • ${packageData.consultations} консультаций стилиста<br>
                            • Моментальное зачисление после оплаты
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button id="cancel-payment-btn" style="
                            flex: 1;
                            background: transparent;
                            border: 1px solid var(--border-light);
                            color: var(--text-light);
                            padding: 12px;
                            border-radius: 8px;
                            cursor: pointer;
                        ">Отмена</button>
                        
                        <button id="proceed-payment-btn" style="
                            flex: 2;
                            background: var(--accent-gold);
                            border: none;
                            color: var(--bg-primary);
                            padding: 12px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: 600;
                        ">Перейти к оплате</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Обработчики кнопок
        modal.querySelector('#cancel-payment-btn').addEventListener('click', () => {
            modal.remove();
            this.currentPayment = null;
        });

        modal.querySelector('#proceed-payment-btn').addEventListener('click', () => {
            this.proceedToPayment();
        });

        this.triggerHapticFeedback('light');
    }

    // НОВОЕ: Переход к оплате через ЮKassa
    proceedToPayment() {
        if (!this.currentPayment || !this.currentPayment.confirmationUrl) {
            this.showNotification('❌ Ошибка платежа', 'error');
            return;
        }

        // Закрываем модальное окно
        const confirmationModal = document.getElementById('payment-confirmation-modal');
        if (confirmationModal) {
            confirmationModal.remove();
        }

        // Показываем уведомление
        this.showNotification('🔄 Переходим к оплате...', 'info');

        // Запускаем проверку статуса платежа
        this.startPaymentStatusCheck();

        // Переходим на страницу оплаты ЮKassa
        window.open(this.currentPayment.confirmationUrl, '_blank');

        this.triggerHapticFeedback('medium');
    }

    // НОВОЕ: Проверка статуса платежа
    startPaymentStatusCheck() {
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
        }

        console.log('🔍 Начинаем проверку статуса платежа:', this.currentPayment.id);

        this.paymentCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/v1/payments/status/${this.currentPayment.id}`);
                
                if (response.ok) {
                    const statusData = await response.json();
                    console.log('💳 Статус платежа:', statusData.payment_status);

                    if (statusData.payment_status === 'succeeded') {
                        // Платеж успешен
                        this.handleSuccessfulPayment();
                    } else if (statusData.payment_status === 'canceled') {
                        // Платеж отменен
                        this.handleCanceledPayment();
                    }
                    // Если 'pending' - продолжаем проверку
                } else {
                    console.warn('⚠️ Ошибка проверки статуса платежа');
                }
            } catch (error) {
                console.warn('⚠️ Ошибка при проверке платежа:', error);
            }
        }, 5000); // Проверяем каждые 5 секунд

        // Останавливаем проверку через 10 минут
        setTimeout(() => {
            if (this.paymentCheckInterval) {
                clearInterval(this.paymentCheckInterval);
                this.paymentCheckInterval = null;
                console.log('⏰ Время проверки платежа истекло');
            }
        }, 600000); // 10 минут
    }

    // НОВОЕ: Обработка успешного платежа
    handleSuccessfulPayment() {
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
            this.paymentCheckInterval = null;
        }

        // Обновляем баланс
        this.userBalance += this.currentPayment.stcoinAmount;
        this.saveUserData();

        // Показываем успешное уведомление
        this.showNotification(
            `🎉 Платеж успешен! Зачислено ${this.currentPayment.stcoinAmount} STcoin`, 
            'success', 
            8000
        );

        // Обновляем секцию баланса если мы на ней
        if (this.currentSection === 'balance') {
            this.showBalanceSection();
        }

        this.currentPayment = null;
        this.triggerHapticFeedback('success');

        console.log('✅ Платеж успешно обработан');
    }

    // НОВОЕ: Обработка отмененного платежа
    handleCanceledPayment() {
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
            this.paymentCheckInterval = null;
        }

        this.showNotification('❌ Платеж отменен', 'warning');
        this.currentPayment = null;
        this.triggerHapticFeedback('error');

        console.log('❌ Платеж отменен');
    }

    // 📄 Просмотр консультации
    viewConsultation(index) {
        const consultation = this.consultationsHistory[index];
        if (!consultation) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">Консультация #${index + 1}</h2>
                    <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div style="
                        background: rgba(212, 175, 55, 0.1);
                        border: 1px solid var(--border-gold);
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 16px;
                    ">
                        <div style="color: var(--text-gold); font-weight: 600; margin-bottom: 8px;">
                            📅 ${new Date(consultation.timestamp).toLocaleString('ru-RU')}
                        </div>
                        <div style="color: var(--text-light); margin-bottom: 4px;">
                            <strong>Повод:</strong> ${consultation.occasion}
                        </div>
                        ${consultation.preferences ? `
                            <div style="color: var(--text-light);">
                                <strong>Предпочтения:</strong> ${consultation.preferences}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="result-content">
                        ${consultation.advice}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.triggerHapticFeedback('light');
    }

    // 💾 Управление данными пользователя
    loadUserData() {
        try {
            const data = JSON.parse(localStorage.getItem('mishura_user_data') || '{}');
            this.userBalance = data.balance || 200; // STcoin: стартовый баланс 200
            this.consultationsHistory = data.history || [];
            this.consultationsUsed = data.used || 0;
            
            console.log('📊 Данные пользователя загружены:', {
                balance: this.userBalance,
                history: this.consultationsHistory.length,
                used: this.consultationsUsed
            });
        } catch (error) {
            console.error('❌ Ошибка загрузки данных пользователя:', error);
            this.initializeUserData();
        }
    }

    saveUserData() {
        try {
            const data = {
                balance: this.userBalance,
                history: this.consultationsHistory,
                used: this.consultationsUsed,
                lastSaved: Date.now()
            };
            
            localStorage.setItem('mishura_user_data', JSON.stringify(data));
            console.log('💾 Данные пользователя сохранены');
        } catch (error) {
            console.error('❌ Ошибка сохранения данных пользователя:', error);
        }
    }

    // STcoin: Обновленная инициализация данных пользователя
    initializeUserData() {
        this.userBalance = 200; // STcoin: 200 STcoin вместо 100
        this.consultationsHistory = [];
        this.consultationsUsed = 0;
        this.saveUserData();
        
        console.log('🆕 Инициализированы данные нового пользователя');
        this.showNotification('🎉 Добро пожаловать! У вас 200 STcoin!', 'success', 5000); // STcoin: текст уведомления
    }

    // 🔧 ПАТЧ V2: Исправленная настройка обработчиков без циклов
    setupModeButtons() {
        if (this.modeButtonsSetup) {
            return; // Предотвращаем повторную настройку
        }

        const singleBtn = document.getElementById('single-mode-btn');
        const compareBtn = document.getElementById('compare-mode-btn');
        
        if (singleBtn) {
            // Удаляем старые обработчики
            const newSingleBtn = singleBtn.cloneNode(true);
            singleBtn.parentNode.replaceChild(newSingleBtn, singleBtn);
            
            newSingleBtn.addEventListener('click', () => {
                console.log('🔥 Single Mode button clicked');
                this.triggerHapticFeedback('light');
                this.openSingleModal();
            });
        } else {
            console.warn('⚠️ Single button не найден');
        }

        if (compareBtn) {
            // Удаляем старые обработчики
            const newCompareBtn = compareBtn.cloneNode(true);
            compareBtn.parentNode.replaceChild(newCompareBtn, compareBtn);
            
            newCompareBtn.addEventListener('click', () => {
                console.log('🔄 Compare Mode button clicked');
                this.triggerHapticFeedback('light');
                this.openCompareModal();
            });
        } else {
            console.warn('⚠️ Compare button не найден');
        }
        
        this.modeButtonsSetup = true;
        console.log('✅ Mode buttons настроены без циклов');
    }

    setupCloseButtons() {
        if (this.eventListenersAttached) {
            return; // Предотвращаем дублирование
        }

        document.addEventListener('click', (event) => {
            if (event.target.matches('#consultation-cancel, .close-btn, #form-cancel')) {
                this.closeModal();
                this.triggerHapticFeedback('light');
            }
        });
    }

    setupSubmitButton() {
        if (this.submitButtonSetup) {
            return;
        }

        document.addEventListener('click', (event) => {
            if (event.target.matches('#form-submit')) {
                event.preventDefault();
                this.submit();
            }
        });
        
        document.addEventListener('input', (event) => {
            if (['occasion', 'preferences'].includes(event.target.id)) {
                this.updateSubmitButton();
            }
        });

        this.submitButtonSetup = true;
    }

    // 📋 Настройка выпадающего списка поводов
    setupOccasionDropdown() {
        if (this.occasionDropdownSetup) {
            return;
        }

        document.addEventListener('click', (event) => {
            const occasionInput = document.getElementById('occasion');
            const optionsContainer = document.getElementById('occasion-options');
            
            if (!occasionInput || !optionsContainer) return;
            
            if (event.target === occasionInput) {
                // Создаем опции если их нет
                if (optionsContainer.children.length === 0) {
                    this.occasionOptions.forEach(option => {
                        const optionElement = document.createElement('div');
                        optionElement.className = 'occasion-option';
                        optionElement.textContent = option;
                        optionElement.addEventListener('click', () => {
                            occasionInput.value = option;
                            optionsContainer.classList.remove('active');
                            this.updateSubmitButton();
                            this.triggerHapticFeedback('light');
                        });
                        optionsContainer.appendChild(optionElement);
                    });
                }
                
                optionsContainer.classList.toggle('active');
                this.triggerHapticFeedback('light');
            } else if (!event.target.closest('.occasion-dropdown')) {
                optionsContainer.classList.remove('active');
            }
        });

        this.occasionDropdownSetup = true;
    }

    // 📱 Telegram интеграция
    setupTelegramIntegration() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            tg.ready();
            tg.expand();
            
            tg.MainButton.setText('Получить консультацию');
            tg.MainButton.show();
            
            tg.MainButton.onClick(() => {
                if (this.currentSection === 'home') {
                    this.openSingleModal();
                } else {
                    this.navigateToSection('home');
                }
            });
            
            console.log('📱 Telegram WebApp интегрирован');
        }
    }

    // 🎮 Haptic Feedback
    triggerHapticFeedback(type = 'light') {
        try {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
                const feedback = window.Telegram.WebApp.HapticFeedback;
                
                switch (type) {
                    case 'light':
                        feedback.impactOccurred('light');
                        break;
                    case 'medium':
                        feedback.impactOccurred('medium');
                        break;
                    case 'heavy':
                        feedback.impactOccurred('heavy');
                        break;
                    case 'success':
                        feedback.notificationOccurred('success');
                        break;
                    case 'warning':
                        feedback.notificationOccurred('warning');
                        break;
                    case 'error':
                        feedback.notificationOccurred('error');
                        break;
                }
            }
        } catch (error) {
            // Игнорируем ошибки haptic feedback
        }
    }

    // 🖱️ Drag & Drop функциональность
    setupDragAndDrop() {
        if (this.dragDropSetup) {
            return;
        }

        // Single режим
        const singlePreview = document.getElementById('single-preview');
        if (singlePreview) {
            this.setupDragDropForElement(singlePreview, (file) => {
                this.handleSingleFile(file);
            });
        }
        
        // Compare режим
        document.querySelectorAll('.compare-slot').forEach((slot, index) => {
            this.setupDragDropForElement(slot, (file) => {
                this.handleCompareFile(file, index);
            });
        });
        
        this.dragDropSetup = true;
        console.log('🖱️ Drag & Drop настроен');
    }

    setupDragDropForElement(element, onDrop) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            element.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            element.addEventListener(eventName, () => {
                element.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            element.addEventListener(eventName, () => {
                element.classList.remove('drag-over');
            }, false);
        });

        element.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                onDrop(files[0]);
            }
        }, false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // ⌨️ Клавиатурные сокращения
    setupKeyboardShortcuts() {
        if (this.keyboardSetup) {
            return;
        }

        document.addEventListener('keydown', (event) => {
            // ESC - закрыть модальное окно
            if (event.key === 'Escape') {
                this.closeModal();
            }
            
            // Enter - отправить форму (если активна)
            if (event.key === 'Enter' && event.ctrlKey) {
                const submitBtn = document.getElementById('form-submit');
                if (submitBtn && !submitBtn.disabled) {
                    this.submit();
                }
            }
            
            // S - открыть single режим
            if (event.key === 's' || event.key === 'ы') {
                if (this.currentSection === 'home' && !document.querySelector('.modal-overlay.active')) {
                    this.openSingleModal();
                }
            }
            
            // C - открыть compare режим  
            if (event.key === 'c' || event.key === 'с') {
                if (this.currentSection === 'home' && !document.querySelector('.modal-overlay.active')) {
                    this.openCompareModal();
                }
            }
        });
        
        this.keyboardSetup = true;
        console.log('⌨️ Клавиатурные сокращения настроены');
    }

    // 🖱️ Контекстное меню
    setupContextMenu() {
        if (this.contextMenuSetup) {
            return;
        }

        document.addEventListener('contextmenu', (event) => {
            // Отключаем стандартное контекстное меню на превью изображений
            if (event.target.closest('.upload-preview, .compare-slot img')) {
                event.preventDefault();
                this.showImageContextMenu(event);
            }
        });

        this.contextMenuSetup = true;
    }

    showImageContextMenu(event) {
        // Простое контекстное меню для изображений
        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            top: ${event.clientY}px;
            left: ${event.clientX}px;
            background: var(--secondary-black);
            border: 1px solid var(--border-gold);
            border-radius: 8px;
            padding: 8px 0;
            z-index: 10000;
            min-width: 150px;
            box-shadow: var(--shadow-black);
        `;
        
        const actions = [
            { text: '🔄 Заменить', action: () => this.replaceImage(event.target) },
            { text: '❌ Удалить', action: () => this.removeImage(event.target) }
        ];
        
        actions.forEach(({ text, action }) => {
            const item = document.createElement('div');
            item.textContent = text;
            item.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                color: var(--text-light);
                transition: background-color 0.2s;
            `;
            
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });
            
            item.addEventListener('click', () => {
                action();
                menu.remove();
            });
            
            menu.appendChild(item);
        });
        
        document.body.appendChild(menu);
        
        // Удаляем меню при клике вне его
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }

    replaceImage(imgElement) {
        // Определяем тип изображения и заменяем
        const slot = imgElement.closest('.compare-slot');
        if (slot) {
            const slotIndex = parseInt(slot.dataset.slot);
            const fileInput = document.getElementById(`compare-file-input-${slotIndex}`);
            if (fileInput) fileInput.click();
        } else {
            // Single режим
            const fileInput = document.getElementById('single-file-input');
            if (fileInput) fileInput.click();
        }
    }

    removeImage(imgElement) {
        const slot = imgElement.closest('.compare-slot');
        if (slot) {
            // Compare режим
            const slotIndex = parseInt(slot.dataset.slot);
            this.compareImages[slotIndex] = null;
            slot.innerHTML = `
                <span class="slot-number">${slotIndex + 1}</span>
                <span class="add-icon">+</span>
            `;
            slot.classList.remove('has-image');
        } else {
            // Single режим
            this.singleImage = null;
            const preview = document.getElementById('single-preview');
            if (preview) {
                preview.innerHTML = '<div class="upload-text">Нажмите для выбора фото</div>';
                preview.classList.remove('has-image');
            }
        }
        
        this.updateSubmitButton();
        this.triggerHapticFeedback('light');
    }

    // 🎯 Методы модального окна
    openSingleModal() {
        this.currentMode = 'single';
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Анализ образа';
        }
        this.showModal('single-mode');
    }

    openCompareModal() {
        this.currentMode = 'compare';
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Сравнение образов';
        }
        this.showModal('compare-mode');
    }

    showModal(mode) {
        const overlay = document.getElementById('consultation-overlay');
        const modes = document.querySelectorAll('.upload-mode');
        
        modes.forEach(m => m.classList.remove('active'));
        const targetMode = document.getElementById(mode);
        if (targetMode) {
            targetMode.classList.add('active');
        }
        
        if (overlay) {
            overlay.classList.add('active');
        }
        
        this.clearForm();
        this.hideForm();
        this.hideLoading();
        this.hideResult();
    }

    closeModal() {
        const overlay = document.getElementById('consultation-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        this.clearForm();
        this.clearImages();
    }

    // 🎯 Управление состоянием формы
    clearForm() {
        const occasion = document.getElementById('occasion');
        const preferences = document.getElementById('preferences');
        const options = document.getElementById('occasion-options');
        
        if (occasion) occasion.value = '';
        if (preferences) preferences.value = '';
        if (options) options.classList.remove('active');
        
        this.updateSubmitButton();
    }

    clearImages() {
        this.singleImage = null;
        this.compareImages = [null, null, null, null];
        
        // Очищаем превью
        const singlePreview = document.getElementById('single-preview');
        if (singlePreview) {
            singlePreview.innerHTML = '<div class="upload-text">Нажмите для выбора фото</div>';
            singlePreview.classList.remove('has-image');
        }
        
        // Очищаем слоты сравнения
        document.querySelectorAll('.compare-slot').forEach((slot, index) => {
            slot.innerHTML = `
                <span class="slot-number">${index + 1}</span>
                <span class="add-icon">+</span>
            `;
            slot.classList.remove('has-image');
        });
    }

    updateSubmitButton() {
        const submitBtn = document.getElementById('form-submit');
        const occasion = document.getElementById('occasion')?.value?.trim() || '';
        
        let hasImages = false;
        if (this.currentMode === 'single') {
            hasImages = this.singleImage !== null;
        } else if (this.currentMode === 'compare') {
            hasImages = this.compareImages.filter(img => img !== null).length >= 2;
        }
        
        if (submitBtn) {
            submitBtn.disabled = !hasImages || !occasion;
        }
    }

    hideForm() {
        const form = document.getElementById('consultation-form');
        if (form) form.classList.remove('active');
    }

    showForm() {
        const form = document.getElementById('consultation-form');
        if (form) form.classList.add('active');
        this.updateSubmitButton();
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.classList.remove('active');
    }

    showLoading() {
        this.isLoading = true;
        
        const sections = {
            loading: true,
            'consultation-form': false,
            result: false
        };
        
        Object.entries(sections).forEach(([id, show]) => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.toggle('active', show);
            }
        });
    }

    hideResult() {
        const result = document.getElementById('result');
        if (result) result.classList.remove('active');
    }

    // ПАТЧ V2: Улучшенное отображение результатов с нормализацией ответа + навигацией + STcoin
    showResult(result) {
        this.isLoading = false;
        
        const sections = {
            loading: false,
            'consultation-form': false,
            result: true
        };
        
        Object.entries(sections).forEach(([id, show]) => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.toggle('active', show);
            }
        });
        
        // ПАТЧ V2: Нормализация API ответа в правильный формат
        const normalizedResult = this.normalizeAPIResponse(result);
        
        // Контент результата с навигационными кнопками
        const content = document.getElementById('result-content');
        if (content) {
            content.innerHTML = this.formatAdvice(normalizedResult.advice);
        }
        
        // НОВОЕ: Добавляем кнопки навигации если их нет
        const resultSection = document.getElementById('result');
        if (resultSection && !resultSection.querySelector('#result-back')) {
            const navButtons = document.createElement('div');
            navButtons.style.cssText = 'display: flex; gap: 12px; justify-content: center; margin-top: 20px;';
            navButtons.innerHTML = `
                <button id="result-back" style="
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                    border: 1px solid var(--accent-gold);
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                ">← Назад к выбору</button>
                <button id="result-new" style="
                    background: var(--accent-gold);
                    color: var(--bg-primary);
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                ">🆕 Новый анализ</button>
            `;
            resultSection.appendChild(navButtons);
        }
        
        // Сохраняем консультацию в историю
        const consultation = {
            id: Date.now(),
            type: this.currentMode,
            occasion: document.getElementById('occasion')?.value || '',
            preferences: document.getElementById('preferences')?.value || '',
            advice: normalizedResult.advice,
            timestamp: new Date().toISOString(),
            imagesCount: this.currentMode === 'compare' ? 
                this.compareImages.filter(img => img !== null).length : 1,
            metadata: normalizedResult.metadata || {}
        };
        
        // STcoin: Списываем консультацию (10 STcoin)
        this.userBalance -= 10; // STcoin: списываем 10 STcoin вместо 1
        this.consultationsUsed += 10; // STcoin: увеличиваем счетчик на 10
        this.consultationsHistory.push(consultation);
        this.saveUserData();
        
        // STcoin: Показываем обновленный баланс
        if (this.userBalance <= 50) { // STcoin: предупреждение при 50 STcoin (5 консультаций)
            setTimeout(() => {
                const consultationsRemaining = Math.floor(this.userBalance / 10);
                this.showNotification(`⚠️ Осталось ${consultationsRemaining} консультаций`, 'warning', 4000);
            }, 2000);
        }
    }

    // ПАТЧ V2: Нормализация ответов API в единый формат
    normalizeAPIResponse(response) {
        console.log('🔄 Нормализация ответа API:', response);
        
        // Если ответ уже в правильном формате
        if (response && typeof response === 'object' && response.advice) {
            return {
                advice: response.advice,
                metadata: response.metadata || {
                    timestamp: new Date().toISOString(),
                    status: response.status || 'success'
                }
            };
        }
        
        // Если ответ - строка
        if (typeof response === 'string') {
            return {
                advice: response,
                metadata: {
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    source: 'string_response'
                }
            };
        }
        
        // Если ответ содержит message вместо advice
        if (response && response.message) {
            return {
                advice: response.message,
                metadata: {
                    timestamp: new Date().toISOString(),
                    status: response.status || 'success',
                    source: 'message_field'
                }
            };
        }
        
        // Если ответ содержит другие поля с контентом
        if (response && typeof response === 'object') {
            const contentFields = ['text', 'content', 'result', 'analysis'];
            for (const field of contentFields) {
                if (response[field]) {
                    return {
                        advice: response[field],
                        metadata: {
                            timestamp: new Date().toISOString(),
                            status: response.status || 'success',
                            source: field
                        }
                    };
                }
            }
        }
        
        // Fallback
        return {
            advice: 'Анализ получен, но формат ответа неожиданный. Попробуйте еще раз.',
            metadata: {
                timestamp: new Date().toISOString(),
                status: 'warning',
                source: 'fallback'
            }
        };
    }

    showError(message) {
        this.isLoading = false;
        
        const sections = {
            loading: false,
            'consultation-form': true,
            result: false
        };
        
        Object.entries(sections).forEach(([id, show]) => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.toggle('active', show);
            }
        });
        
        this.showNotification(message, 'error');
    }

    // ✨ ПАТЧ V2: Улучшенное форматирование ответов с парсингом структуры
    formatAdvice(advice) {
        if (!advice) return '';
        
        // ПАТЧ V2: Улучшенный парсинг markdown структуры
        let processedAdvice = this.parseMarkdownStructure(advice);
        
        // Определяем названия образов на основе цветов в тексте
        const colorMapping = {
            'синий': 'Синий образ',
            'синем': 'Синий образ', 
            'синяя': 'Синий образ',
            'красный': 'Красный образ',
            'красном': 'Красный образ',
            'красная': 'Красный образ',
            'белый': 'Белый образ',
            'белом': 'Белый образ',
            'белая': 'Белый образ',
            'черный': 'Черный образ',
            'черном': 'Черный образ',
            'черная': 'Черный образ',
            'зеленый': 'Зеленый образ',
            'зеленом': 'Зеленый образ',
            'зеленая': 'Зеленый образ',
            'желтый': 'Желтый образ',
            'желтом': 'Желтый образ',
            'желтая': 'Желтый образ',
            'розовый': 'Розовый образ',
            'розовом': 'Розовый образ',
            'розовая': 'Розовый образ',
            'серый': 'Серый образ',
            'сером': 'Серый образ',
            'серая': 'Серый образ',
            'коричневый': 'Коричневый образ',
            'коричневом': 'Коричневый образ',
            'коричневая': 'Коричневый образ'
        };
        
        // Убираем избыточные описания того, что надето
        const descriptionsToRemove = [
            /На первом.*?изображении.*?\./gi,
            /На втором.*?изображении.*?\./gi,
            /На третьем.*?изображении.*?\./gi,
            /На четвертом.*?изображении.*?\./gi,
            /На фото.*?вы.*?одеты.*?\./gi,
            /Я вижу.*?что.*?на.*?\./gi,
            /Рассматривая.*?изображение.*?\./gi
        ];
        
        descriptionsToRemove.forEach(pattern => {
            processedAdvice = processedAdvice.replace(pattern, '');
        });
        
        // Заменяем цветовые описания на короткие названия образов
        Object.entries(colorMapping).forEach(([color, title]) => {
            const regex = new RegExp(`(в|на)\\s+${color}[а-я]*\\s+(платье|рубашке|футболке|блузке|костюме|жакете|пиджаке|брюках|джинсах|юбке|шортах|топе|кардигане|свитере|пальто|куртке)`, 'gi');
            processedAdvice = processedAdvice.replace(regex, `<span class="outfit-title">${title}</span>`);
        });
        
        return processedAdvice;
    }

    // ПАТЧ V2: Новый метод парсинга markdown структуры
    parseMarkdownStructure(text) {
        if (!text) return '';
        
        console.log('📋 Парсинг markdown структуры...');
        
        // Обрабатываем заголовки разных уровней
        text = text.replace(/^### (.*$)/gm, '<h4>$1</h4>');
        text = text.replace(/^## (.*$)/gm, '<h3>$1</h3>');
        text = text.replace(/^# (.*$)/gm, '<h2>$1</h2>');
        
        // Обрабатываем заголовки с **Заголовок:**
        text = text.replace(/\*\*(.*?):\*\*/g, '<h4>$1</h4>');
        
        // Обрабатываем жирный текст
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Обрабатываем курсив
        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Обрабатываем списки
        text = text.replace(/^- (.*$)/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        // Обрабатываем абзацы
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        let formattedText = '';
        
        paragraphs.forEach(paragraph => {
            paragraph = paragraph.trim();
            if (paragraph) {
                // Если это уже HTML тег, не оборачиваем в <p>
                if (paragraph.startsWith('<h') || paragraph.startsWith('<ul') || paragraph.startsWith('<div')) {
                    formattedText += paragraph;
                } else {
                    formattedText += `<p>${paragraph}</p>`;
                }
            }
        });
        
        console.log('✅ Markdown структура обработана');
        return formattedText;
    }

    // 📤 ПАТЧ V2: Исправленная отправка форм с правильным timeout + STcoin
    async submit() {
        if (this.isLoading) {
            console.log('⏳ Запрос уже выполняется');
            return;
        }
        
        const occasion = document.getElementById('occasion')?.value?.trim() || '';
        const preferences = document.getElementById('preferences')?.value?.trim() || '';
        
        if (!occasion) {
            this.showNotification('Пожалуйста, укажите повод', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        // STcoin: Проверяем баланс (нужно минимум 10 STcoin)
        if (this.userBalance < 10) { // STcoin: проверяем что хватает на 1 консультацию (10 STcoin)
            this.showNotification('❌ Недостаточно STcoin! Пополните баланс', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        this.analytics.analysisRequested++;
        
        if (this.currentMode === 'single') {
            await this.submitSingle(occasion, preferences);
        } else if (this.currentMode === 'compare') {
            await this.submitCompare(occasion, preferences);
        }
    }

    // ПАТЧ V2: Полностью переписанный метод submitSingle с улучшенной обработкой
    async submitSingle(occasion, preferences) {
        console.log('🚀 Single submit начался с патчами V2');
        
        if (!this.singleImage) {
            this.showNotification('Загрузите изображение', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        // Проверяем API
        if (!this.api) {
            this.showNotification('❌ API не подключен', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        this.showLoading();
        this.triggerHapticFeedback('medium');
        
        // ПАТЧ V2: Создаем promise с увеличенным timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Превышено время ожидания (${this.requestTimeout / 1000} сек)`));
            }, this.requestTimeout);
        });
        
        try {
            console.log('📡 Отправляем запрос к API с timeout 90 сек...');
            console.log('🔍 Используем метод: analyzeSingle');
            
            // ПАТЧ V2: Race между API запросом и timeout
            const apiPromise = this.api.analyzeSingle(this.singleImage, occasion, preferences);
            const result = await Promise.race([apiPromise, timeoutPromise]);
            
            console.log('✅ Single результат получен:', result);
            
            // ПАТЧ V2: Валидация ответа перед обработкой
            if (!result) {
                throw new Error('Пустой ответ от API');
            }
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Single ошибка:', error);
            this.analytics.errors++;
            
            // ПАТЧ V2: Улучшенная обработка различных типов ошибок
            let errorMessage = 'Ошибка анализа';
            
            if (error.message.includes('timeout') || error.message.includes('Превышено время')) {
                errorMessage = 'Анализ занимает больше времени чем обычно. Попробуйте еще раз.';
            } else if (error.message.includes('сети') || error.message.includes('network')) {
                errorMessage = 'Проблемы с сетью. Проверьте подключение к интернету.';
            } else if (error.message.includes('API')) {
                errorMessage = 'Сервис временно недоступен. Попробуйте через несколько минут.';
            } else {
                errorMessage = `Ошибка анализа: ${error.message}`;
            }
            
            this.showError(errorMessage);
            this.triggerHapticFeedback('error');
        }
    }

    // ПАТЧ V2: Улучшенный метод submitCompare
    async submitCompare(occasion, preferences) {
        const images = this.compareImages.filter(img => img !== null);
        
        if (images.length < 2) {
            this.showNotification('Загрузите минимум 2 изображения', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        // Проверяем API
        if (!this.api) {
            this.showNotification('❌ API не подключен', 'error');
            this.triggerHapticFeedback('error');
            return;
        }
        
        console.log(`🚀 Compare submit с патчами V2: отправка ${images.length} изображений`);
        this.showLoading();
        this.triggerHapticFeedback('medium');
        
        // ПАТЧ V2: Timeout для compare запросов
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Превышено время ожидания сравнения (${this.requestTimeout / 1000} сек)`));
            }, this.requestTimeout);
        });
        
        try {
            console.log('📡 Отправляем запрос сравнения к API...');
            console.log('🔍 Используем метод: analyzeCompare');
            
            // ПАТЧ V2: Race между API запросом и timeout
            const apiPromise = this.api.analyzeCompare(images, occasion, preferences);
            const result = await Promise.race([apiPromise, timeoutPromise]);
            
            console.log('✅ Compare результат получен:', result);
            
            // ПАТЧ V2: Валидация ответа
            if (!result) {
                throw new Error('Пустой ответ от API сравнения');
            }
            
            this.lastAnalysisResult = result;
            this.analytics.successfulAnalysis++;
            this.showResult(result);
            this.triggerHapticFeedback('success');
            
        } catch (error) {
            console.error('❌ Compare ошибка:', error);
            this.analytics.errors++;
            
            // ПАТЧ V2: Специализированная обработка ошибок сравнения
            let errorMessage = 'Ошибка сравнения';
            
            if (error.message.includes('timeout') || error.message.includes('Превышено время')) {
                errorMessage = 'Сравнение занимает больше времени чем обычно. Попробуйте с меньшим количеством изображений.';
            } else if (error.message.includes('размер') || error.message.includes('size')) {
                errorMessage = 'Изображения слишком большие. Попробуйте сжать их перед загрузкой.';
            } else {
                errorMessage = `Ошибка сравнения: ${error.message}`;
            }
            
            this.showError(errorMessage);
            this.triggerHapticFeedback('error');
        }
    }

    // 📁 Инициализация загрузчиков
    initUploaders() {
        // Single режим
        this.setupSingleUploader();
        
        // Compare режим  
        this.setupCompareUploader();
        
        console.log('📁 Загрузчики файлов настроены');
    }

    // 📷 Single загрузчик
    setupSingleUploader() {
        const preview = document.getElementById('single-preview');
        const fileInput = document.getElementById('single-file-input');
        
        if (preview && fileInput) {
            // Клик по превью открывает файловый диалог
            preview.addEventListener('click', () => {
                fileInput.click();
            });
            
            // Обработка выбора файла
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    this.handleSingleFile(file);
                }
            });
        }
    }

    // 🔄 Compare загрузчик (ИСПРАВЛЕННАЯ ВЕРСИЯ)
    setupCompareUploader() {
        // ИСПРАВЛЕНИЕ: Используем querySelectorAll и добавляем ID если нет
        const slots = document.querySelectorAll('.compare-slot');
        
        slots.forEach((slot, i) => {
            // Убеждаемся что у слота есть ID
            if (!slot.id) {
                slot.id = `compare-slot-${i}`;
                console.log(`🔧 Добавлен ID: compare-slot-${i}`);
            }
            
            const fileInput = document.getElementById(`compare-file-input-${i}`);
            
            if (slot && fileInput) {
                // Удаляем старые обработчики клонированием
                const newSlot = slot.cloneNode(true);
                slot.parentNode.replaceChild(newSlot, slot);
                
                // Клик по слоту открывает файловый диалог
                newSlot.addEventListener('click', () => {
                    console.log(`🔄 Клик по слоту ${i}`);
                    fileInput.click();
                });
                
                // Обработка выбора файла
                fileInput.addEventListener('change', (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        console.log(`📁 Файл выбран для слота ${i}:`, file.name);
                        this.handleCompareFile(file, i);
                    }
                    // Очищаем input для возможности повторного выбора того же файла
                    event.target.value = '';
                });
                
                console.log(`✅ Слот ${i} настроен с ID`);
            } else {
                console.warn(`⚠️ Слот ${i} или input не найден`);
            }
        });
        
        console.log('🔄 Compare uploader настроен с автоматическим добавлением ID');
    }

    // 📷 Обработка одного файла
    handleSingleFile(file) {
        console.log('📷 Обработка single файла:', file.name);
        
        if (!this.validateFile(file)) return;
        
        this.singleImage = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('single-preview');
            if (preview) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 12px;
                ">`;
                preview.classList.add('has-image');
            }
            
            this.showForm();
            this.updateSubmitButton();
            this.triggerHapticFeedback('light');
        };
        
        reader.readAsDataURL(file);
    }

    // 🔄 Обработка файла для сравнения
    handleCompareFile(file, slotIndex) {
        console.log(`🔄 Обработка compare файла в слот ${slotIndex}:`, file.name);
        
        if (!this.validateFile(file)) return;
        
        this.compareImages[slotIndex] = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const slot = document.getElementById(`compare-slot-${slotIndex}`);
            if (slot) {
                slot.innerHTML = `<img src="${e.target.result}" alt="Compare ${slotIndex + 1}" style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 12px;
                ">`;
                slot.classList.add('has-image');
            }
            
            // Показываем форму если загружено минимум 2 изображения
            const loadedImages = this.compareImages.filter(img => img !== null).length;
            if (loadedImages >= 2) {
                this.showForm();
            }
            
            this.updateSubmitButton();
            this.triggerHapticFeedback('light');
        };
        
        reader.readAsDataURL(file);
    }

    // ✅ Валидация файлов
    validateFile(file) {
        // Проверка типа файла
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('❌ Поддерживаются только JPEG, PNG и WebP форматы', 'error');
            this.triggerHapticFeedback('error');
            return false;
        }
        
        // Проверка размера файла (максимум 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showNotification('❌ Размер файла не должен превышать 10MB', 'error');
            this.triggerHapticFeedback('error');
            return false;
        }
        
        return true;
    }

    // 📢 Система уведомлений
    showNotification(message, type = 'info', duration = 3000) {
        // Удаляем существующие уведомления
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        const colors = {
            'success': '#10B981',
            'error': '#EF4444',
            'warning': '#F59E0B',
            'info': '#3B82F6'
        };
        
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${colors[type]};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                max-width: 90vw;
                animation: slideInDown 0.3s ease;
            ">
                <span>${icons[type]}</span>
                <span>${message}</span>
            </div>
        `;
        
        // Добавляем стили анимации если их нет
        if (!document.getElementById('notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                @keyframes slideInDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                
                @keyframes slideOutUp {
                    from {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-100%);
                    }
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Автоматическое скрытие
        setTimeout(() => {
            const notificationElement = notification.querySelector('div');
            if (notificationElement) {
                notificationElement.style.animation = 'slideOutUp 0.3s ease forwards';
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }
        }, duration);
    }

    // 📊 Получение аналитики
    getAnalytics() {
        return {
            ...this.analytics,
            uptime: Date.now() - this.analytics.appStartTime,
            userBalance: this.userBalance,
            consultationsTotal: this.consultationsHistory.length,
            currentMode: this.currentMode,
            currentSection: this.currentSection,
            apiStatus: this.api ? 'connected' : 'disconnected',
            isMockAPI: this.api && this.api.isMock || false,
            paymentPackages: this.paymentPackages ? Object.keys(this.paymentPackages).length : 0,
            currentPayment: this.currentPayment ? this.currentPayment.id : null
        };
    }

    // 🎯 Сброс приложения в исходное состояние
    reset() {
        console.log('🔄 Сброс приложения...');
        
        this.closeModal();
        this.clearImages();
        this.currentMode = null;
        this.isLoading = false;
        this.lastAnalysisResult = null;
        
        // Очищаем платежные данные
        this.currentPayment = null;
        if (this.paymentCheckInterval) {
            clearInterval(this.paymentCheckInterval);
            this.paymentCheckInterval = null;
        }
        
        // Возвращаемся на главную
        this.navigateToSection('home');
        
        console.log('✅ Приложение сброшено');
    }

    // 🔧 Диагностика
    diagnose() {
        const diagnosis = {
            timestamp: new Date().toISOString(),
            version: '2.3.0',
            initialization: this.initializationComplete,
            api: {
                connected: !!this.api,
                type: this.api ? (this.api.isMock ? 'Mock' : 'Real') : 'None',
                methods: this.api ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.api)) : []
            },
            state: {
                currentMode: this.currentMode,
                currentSection: this.currentSection,
                isLoading: this.isLoading,
                hasImages: {
                    single: !!this.singleImage,
                    compare: this.compareImages.filter(img => img !== null).length
                }
            },
            user: {
                balance: this.userBalance,
                consultationsUsed: this.consultationsUsed,
                historyCount: this.consultationsHistory.length
            },
            payments: {
                packagesLoaded: !!this.paymentPackages,
                packagesCount: this.paymentPackages ? Object.keys(this.paymentPackages).length : 0,
                currentPayment: this.currentPayment ? this.currentPayment.id : null,
                checkingPayment: !!this.paymentCheckInterval
            },
            analytics: this.getAnalytics(),
            domElements: {
                overlay: !!document.getElementById('consultation-overlay'),
                singlePreview: !!document.getElementById('single-preview'),
                compareSlots: document.querySelectorAll('.compare-slot').length,
                form: !!document.getElementById('consultation-form'),
                submitButton: !!document.getElementById('form-submit')
            }
        };
        
        console.log('🔧 Диагностика МИШУРЫ с ЮKassa:', diagnosis);
        return diagnosis;
    }

    // НОВОЕ: Получение реального user_id из Telegram
    getCurrentUserId() {
        // Попытка получить реальный user_id из Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            if (user && user.id) {
                console.log('🔍 Получен real user_id из Telegram:', user.id);
                return user.id;
            }
        }
        
        // Fallback: генерируем стабильный ID на основе браузера
        let deviceId = localStorage.getItem('mishura_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('mishura_device_id', deviceId);
            console.log('🔧 Создан device_id:', deviceId);
        }
        
        // Преобразуем device_id в числовой формат для совместимости
        const numericId = parseInt(deviceId.replace(/\D/g, '').substr(0, 9)) || 12345;
        console.log('🔧 Используем device-based user_id:', numericId);
        return numericId;
    }

    // НОВОЕ: Получение данных пользователя из Telegram
    getCurrentUserData() {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            if (user) {
                return {
                    id: user.id,
                    username: user.username || null,
                    first_name: user.first_name || null,
                    last_name: user.last_name || null,
                    language_code: user.language_code || 'ru'
                };
            }
        }
        
        return {
            id: this.getCurrentUserId(),
            username: null,
            first_name: null,
            last_name: null,
            language_code: 'ru'
        };
    }

    // ОБНОВЛЕННОЕ: Инициализация пользователя через API
    async initializeUser() {
        try {
            const userData = this.getCurrentUserData();
            console.log('👤 Инициализация пользователя:', userData);

            // Отправляем данные пользователя на сервер
            const response = await fetch('/api/v1/user/init', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userData.id,
                    username: userData.username,
                    first_name: userData.first_name,
                    last_name: userData.last_name
                })
            });

            if (response.ok) {
                const serverData = await response.json();
                console.log('✅ Пользователь инициализирован на сервере:', serverData);
                
                // Обновляем локальный баланс данными с сервера
                this.userBalance = serverData.balance;
                this.userId = serverData.user_id;
                
                if (serverData.is_new_user) {
                    this.showNotification('🎉 Добро пожаловать! У вас 200 STcoin!', 'success', 5000);
                }
                
                // Синхронизируем историю консультаций
                await this.syncUserHistory();
                
                return serverData;
            } else {
                throw new Error('Ошибка инициализации пользователя на сервере');
            }
        } catch (error) {
            console.error('❌ Ошибка инициализации пользователя:', error);
            // Fallback на локальные данные
            this.loadUserData();
            return null;
        }
    }

    // НОВОЕ: Синхронизация баланса с сервером
    async syncUserBalance() {
        try {
            const userId = this.getCurrentUserId();
            console.log('💰 Синхронизация баланса для user_id:', userId);

            const response = await fetch(`/api/v1/user/${userId}/balance`);
            if (response.ok) {
                const balanceData = await response.json();
                console.log('📊 Баланс с сервера:', balanceData);
                
                // Обновляем локальный баланс
                const oldBalance = this.userBalance;
                this.userBalance = balanceData.balance;
                
                // Показываем уведомление если баланс изменился
                if (oldBalance !== this.userBalance && oldBalance > 0) {
                    const diff = this.userBalance - oldBalance;
                    if (diff > 0) {
                        this.showNotification(`💰 Баланс пополнен на ${diff} STcoin!`, 'success');
                    } else if (diff < 0) {
                        this.showNotification(`💸 Списано ${Math.abs(diff)} STcoin`, 'info');
                    }
                }
                
                // Обновляем UI если мы в разделе баланса
                if (this.currentSection === 'balance') {
                    this.showBalanceSection();
                }
                
                return balanceData;
            } else {
                throw new Error('Ошибка получения баланса с сервера');
            }
        } catch (error) {
            console.error('❌ Ошибка синхронизации баланса:', error);
            return null;
        }
    }

    // НОВОЕ: Синхронизация истории консультаций
    async syncUserHistory() {
        try {
            const userId = this.getCurrentUserId();
            console.log('📚 Синхронизация истории для user_id:', userId);

            const response = await fetch(`/api/v1/user/${userId}/history?limit=50`);
            if (response.ok) {
                const historyData = await response.json();
                console.log('📋 История с сервера:', historyData.consultations.length, 'консультаций');
                
                // Преобразуем серверный формат в локальный
                this.consultationsHistory = historyData.consultations.map(consultation => ({
                    id: consultation.id,
                    type: 'single', // По умолчанию
                    occasion: consultation.occasion,
                    preferences: consultation.preferences,
                    advice: consultation.advice,
                    timestamp: consultation.created_at,
                    imagesCount: 1,
                    metadata: {}
                }));
                
                // Пересчитываем использованные консультации
                this.consultationsUsed = this.consultationsHistory.length * 10;
                
                return historyData;
            } else {
                throw new Error('Ошибка получения истории с сервера');
            }
        } catch (error) {
            console.error('❌ Ошибка синхронизации истории:', error);
            return null;
        }
    }

    // ОБНОВЛЕННОЕ: Загрузка данных пользователя (теперь с синхронизацией)
    async loadUserData() {
        try {
            // Сначала пытаемся инициализировать пользователя на сервере
            const serverData = await this.initializeUser();
            
            if (serverData) {
                console.log('✅ Данные пользователя загружены с сервера');
            } else {
                // Fallback на локальные данные
                console.log('⚠️ Используем локальные данные пользователя');
                const data = JSON.parse(localStorage.getItem('mishura_user_data') || '{}');
                this.userBalance = data.balance || 200;
                this.consultationsHistory = data.history || [];
                this.consultationsUsed = data.used || 0;
                this.userId = this.getCurrentUserId();
            }
            
            console.log('📊 Итоговые данные пользователя:', {
                userId: this.userId,
                balance: this.userBalance,
                history: this.consultationsHistory.length,
                used: this.consultationsUsed
            });
        } catch (error) {
            console.error('❌ Ошибка загрузки данных пользователя:', error);
            this.initializeUserData();
        }
    }

    // ОБНОВЛЕННОЕ: Сохранение данных (теперь без баланса - он хранится на сервере)
    saveUserData() {
        try {
            const data = {
                last_sync: Date.now(),
                device_id: localStorage.getItem('mishura_device_id'),
                user_id: this.userId
            };
            
            localStorage.setItem('mishura_user_data', JSON.stringify(data));
            console.log('💾 Локальные данные сохранены (без баланса)');
        } catch (error) {
            console.error('❌ Ошибка сохранения данных пользователя:', error);
        }
    }

    // НОВОЕ: Периодическая синхронизация
    startPeriodicSync() {
        // Синхронизируем баланс каждые 30 секунд
        setInterval(async () => {
            if (this.currentSection === 'balance') {
                await this.syncUserBalance();
            }
        }, 30000);
        
        console.log('🔄 Периодическая синхронизация баланса запущена (каждые 30 сек)');
    }

    // ОБНОВЛЕННОЕ: Инициализация приложения
    async init() {
        if (this.initializationComplete) {
            console.log('⚠️ Инициализация уже завершена, пропускаем');
            return;
        }

        try {
            console.log('🎯 Начало безопасной инициализации...');
            
            // Основные обработчики с защитой от дублирования
            this.setupModeButtons();
            this.setupCloseButtons();
            this.setupSubmitButton();
            this.initUploaders();
            this.setupNavigation();
            
            // Дополнительные функции
            this.setupKeyboardShortcuts();
            this.setupDragAndDrop();
            this.setupContextMenu();
            this.setupOccasionDropdown();
            this.setupResultNavigation();
            
            // НОВОЕ: Загружаем данные пользователя с синхронизацией
            await this.loadUserData();
            
            // НОВОЕ: Запускаем периодическую синхронизацию
            this.startPeriodicSync();
            
            // Telegram интеграция
            this.setupTelegramIntegration();
            
            this.initializationComplete = true;
            console.log('✅ MishuraApp инициализирован с синхронизацией пользователя');
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
        }
    }
}

// === ИНИЦИАЛИЗАЦИЯ И ЭКСПОРТ ===

// Ждем загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeMishuraApp();
    });
} else {
    // DOM уже загружен
    initializeMishuraApp();
}

function initializeMishuraApp() {
    try {
        // ПАТЧ V2: Проверяем что приложение еще не создано
        if (window.mishuraApp) {
            console.log('⚠️ MishuraApp уже существует, пропускаем создание');
            return;
        }
        
        console.log('🎬 Создание экземпляра MishuraApp с ЮKassa...');
        window.mishuraApp = new MishuraApp();
        
        // Глобальные утилиты для отладки
        window.mishuraUtils = {
            diagnose: () => window.mishuraApp.diagnose(),
            reset: () => window.mishuraApp.reset(),
            analytics: () => window.mishuraApp.getAnalytics(),
            testNotification: (message, type) => window.mishuraApp.showNotification(message, type),
            
            // Быстрые тесты
            testSingle: () => {
                window.mishuraApp.openSingleModal();
                setTimeout(() => {
                    const occasionInput = document.getElementById('occasion');
                    if (occasionInput) occasionInput.value = '💼 Деловая встреча';
                    window.mishuraApp.updateSubmitButton();
                }, 100);
            },
            
            testCompare: () => {
                window.mishuraApp.openCompareModal();
                setTimeout(() => {
                    const occasionInput = document.getElementById('occasion');
                    if (occasionInput) occasionInput.value = '🎉 Вечеринка';
                    window.mishuraApp.updateSubmitButton();
                }, 100);
            },
            
            // НОВЫЕ: Тесты платежей
            testPaymentModal: () => {
                window.mishuraApp.showPaymentModal();
            },
            
            testPaymentPackages: async () => {
                await window.mishuraApp.loadPaymentPackages();
                console.log('Пакеты:', window.mishuraApp.paymentPackages);
            }
        };
        
        console.log(`
🎉 === МИШУРА С ЮKASSA ГОТОВА К РАБОТЕ ===

📋 ДОСТУПНЫЕ КОМАНДЫ В КОНСОЛИ:
• mishuraUtils.diagnose() - диагностика приложения
• mishuraUtils.analytics() - статистика использования  
• mishuraUtils.reset() - сброс состояния
• mishuraUtils.testSingle() - тест single режима
• mishuraUtils.testCompare() - тест compare режима
• mishuraUtils.testPaymentModal() - тест модального окна платежей
• mishuraUtils.testPaymentPackages() - тест загрузки пакетов

🎯 ТЕКУЩЕЕ СОСТОЯНИЕ:
• Версия: 2.3.0 с патчами V2 + STcoin + ЮKassa
• API: ${window.mishuraApp.api ? (window.mishuraApp.api.isMock ? 'Mock (демо)' : 'Реальный') : 'Не подключен'}
• Баланс: ${window.mishuraApp.userBalance} STcoin (${Math.floor(window.mishuraApp.userBalance / 10)} консультаций)
• Платежи: ${window.mishuraApp.paymentPackages ? 'Загружены' : 'В процессе загрузки'}
• Timeout: ${window.mishuraApp.requestTimeout / 1000} секунд

✨ Приложение полностью загружено и готово к использованию с ЮKassa!
        `);
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации МИШУРЫ:', error);
        
        // Показываем ошибку пользователю
        document.body.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background: #1a1a1a;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center;
                padding: 20px;
            ">
                <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
                <h1 style="color: #ef4444; margin-bottom: 16px;">Ошибка загрузки МИШУРЫ</h1>
                <p style="color: #a1a1aa; margin-bottom: 20px; max-width: 500px;">
                    Произошла критическая ошибка при инициализации приложения. 
                    Пожалуйста, обновите страницу или обратитесь к разработчику.
                </p>
                <button onclick="location.reload()" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">🔄 Обновить страницу</button>
                <details style="margin-top: 20px; color: #71717a;">
                    <summary style="cursor: pointer;">Техническая информация</summary>
                    <pre style="
                        background: #262626;
                        padding: 12px;
                        border-radius: 6px;
                        margin-top: 8px;
                        font-size: 0.8rem;
                        text-align: left;
                        overflow-x: auto;
                    ">${error.stack || error.message}</pre>
                </details>
            </div>
        `;
    }
}

console.log('📦 МИШУРА App модуль загружен успешно с STcoin системой и ЮKassa!');