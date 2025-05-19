/*
ПРОЕКТ: МИШУРА - ИИ СТИЛИСТ
ВЕРСИЯ: 0.3.3
ФАЙЛ: script.js
НАЗНАЧЕНИЕ: Основной JS-файл для восстановления функциональности
МЕТОДОЛОГИЯ ПРАВОК: Полная замена файла для избежания ошибок
ДАТА ОБНОВЛЕНИЯ: 2025-05-19
*/

document.addEventListener('DOMContentLoaded', function () {
    // Упрощенный логгер для отладки
    const logger = {
        info: (message, ...args) => console.log(`[INFO] МишураApp: ${message}`, ...args),
        warn: (message, ...args) => console.warn(`[WARN] МишураApp: ${message}`, ...args),
        error: (message, ...args) => console.error(`[ERROR] МишураApp: ${message}`, ...args),
        debug: (message, ...args) => console.debug(`[DEBUG] МишураApp: ${message}`, ...args)
    };

    logger.info("DOM полностью загружен. Инициализация приложения...");

    // === ОСНОВНЫЕ ЭЛЕМЕНТЫ DOM ===

    // Основные кнопки
    const consultationButton = document.getElementById('consultation-button');
    const tryOnButton = document.getElementById('try-on-button');
    const fabButton = document.getElementById('fab-button');
    const menuButton = document.getElementById('menu-button');
    const searchButton = document.getElementById('search-button');
    const headerTitle = document.querySelector('.header-title-container');

    // Навигационное меню
    const navItems = document.querySelectorAll('.nav-item');

    // Оверлеи и диалоги
    const consultationOverlay = document.getElementById('consultation-overlay');
    const resultsOverlay = document.getElementById('results-overlay');
    const tryOnOverlay = document.getElementById('try-on-overlay');
    const loadingOverlay = document.getElementById('loading-overlay');
    const tryOnResultOverlay = document.getElementById('try-on-result-overlay');

    // Кнопки закрытия и отмены
    const consultationCancel = document.getElementById('consultation-cancel');
    const resultsClose = document.getElementById('results-close');
    const tryOnCancel = document.getElementById('try-on-cancel');
    const tryOnResultClose = document.getElementById('try-on-result-close');

    // Переключатели режимов
    const modeButtons = document.querySelectorAll('.mode-button');
    const singleAnalysisMode = document.getElementById('single-analysis-mode');
    const compareAnalysisMode = document.getElementById('compare-analysis-mode');

    // Элементы загрузки фото
    const singleUploadInput = document.getElementById('single-upload-input');
    const compareUploadInputs = document.querySelectorAll('.compare-upload-input');
    const yourPhotoInput = document.getElementById('your-photo-input');
    const outfitPhotoInput = document.getElementById('outfit-photo-input');

    // Контейнеры для превью
    const singlePreviewContainer = document.getElementById('single-preview-container');
    const singlePreviewImage = document.getElementById('single-preview-image');
    const yourPhotoContainer = document.getElementById('your-photo-container');
    const yourPhotoPreview = document.getElementById('your-photo-preview');
    const outfitPhotoContainer = document.getElementById('outfit-photo-container');
    const outfitPhotoPreview = document.getElementById('outfit-photo-preview');

    // Кнопки действий
    const analyzeButton = document.getElementById('analyze-button');
    const tryOnButtonSubmit = document.getElementById('try-on-button-submit');
    const tryOnResultDownload = document.getElementById('try-on-result-download');

    // Другие элементы
    const occasionSelector = document.getElementById('occasion-selector');
    const preferencesInput = document.getElementById('preferences-input');
    const tryOnStyleSelector = document.getElementById('try-on-style-selector');
    const resultsContainer = document.getElementById('results-container');
    const tryOnResultContainer = document.getElementById('try-on-result-container');
    const tryOnResultImage = document.getElementById('try-on-result-image');
    const loadingText = document.getElementById('loading-text');
    const deleteImageButtons = document.querySelectorAll('.delete-image');

    // Проверка на мобильное устройство
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // === СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===
    const appState = {
        // Данные для анализа одежды
        consultationMode: 'single', // 'single' или 'compare'
        singleImage: null,
        compareImages: [null, null, null, null],

        // Данные для примерки
        yourPhoto: null,
        outfitPhoto: null,

        // Метаданные
        selectedTab: 'home',
        isLoading: false,
        lastApiResponse: null
    };

    // === ИНИЦИАЛИЗАЦИЯ ===
    function initApp() {
        logger.info("Инициализация приложения");

        // Установка обработчиков событий
        setupEventListeners();

        // Настройка состояния интерфейса
        refreshUI();

        // Проверяем наличие DOM элементов
        checkDomElements();

        // Показываем уведомление о готовности
        showToast("Приложение МИШУРА готово к работе");
    }

    // Проверка наличия всех нужных DOM элементов
    function checkDomElements() {
        const criticalElements = [
            { name: 'consultationButton', element: consultationButton },
            { name: 'tryOnButton', element: tryOnButton },
            { name: 'consultationOverlay', element: consultationOverlay },
            { name: 'singleAnalysisMode', element: singleAnalysisMode },
            { name: 'compareAnalysisMode', element: compareAnalysisMode },
            { name: 'singleUploadInput', element: singleUploadInput }
        ];

        for (const item of criticalElements) {
            if (!item.element) {
                logger.error(`Критический элемент не найден: ${item.name}`);
            }
        }
    }

    // === УСТАНОВКА ОБРАБОТЧИКОВ СОБЫТИЙ ===
    function setupEventListeners() {
        logger.debug("Настройка обработчиков событий");

        // Основные кнопки
        if (consultationButton) {
            consultationButton.addEventListener('click', openConsultationModal);
        }
        if (tryOnButton) {
            tryOnButton.addEventListener('click', openTryOnModal);
        }
        if (fabButton) {
            fabButton.addEventListener('click', handleFabClick);
        }
        if (menuButton) {
            menuButton.addEventListener('click', handleMenuClick);
        }
        if (searchButton) {
            searchButton.addEventListener('click', handleSearchClick);
        }
        if (headerTitle) {
            headerTitle.addEventListener('click', handleHomeClick);
        }

        // Навигация
        navItems.forEach(item => {
            item.addEventListener('click', handleNavClick);
        });

        // Переключатели режимов консультации
        modeButtons.forEach(button => {
            button.addEventListener('click', handleModeSwitch);
        });

        // Загрузка файлов
        if (singleUploadInput) {
            singleUploadInput.addEventListener('change', handleSingleImageUpload);
        }

        compareUploadInputs.forEach(input => {
            input.addEventListener('change', handleCompareImageUpload);
        });

        if (yourPhotoInput) {
            yourPhotoInput.addEventListener('change', handleYourPhotoUpload);
        }

        if (outfitPhotoInput) {
            outfitPhotoInput.addEventListener('change', handleOutfitPhotoUpload);
        }

        // Кнопки действий
        if (analyzeButton) {
            analyzeButton.addEventListener('click', handleAnalyzeClick);
        }

        if (tryOnButtonSubmit) {
            tryOnButtonSubmit.addEventListener('click', handleTryOnClick);
        }

        if (tryOnResultDownload) {
            tryOnResultDownload.addEventListener('click', handleResultDownload);
        }

        // Кнопки закрытия диалогов
        if (consultationCancel) {
            consultationCancel.addEventListener('click', () => closeOverlay(consultationOverlay));
        }

        if (resultsClose) {
            resultsClose.addEventListener('click', () => closeOverlay(resultsOverlay));
        }

        if (tryOnCancel) {
            tryOnCancel.addEventListener('click', () => closeOverlay(tryOnOverlay));
        }

        if (tryOnResultClose) {
            tryOnResultClose.addEventListener('click', () => closeOverlay(tryOnResultOverlay));
        }

        // Кнопки удаления изображений
        deleteImageButtons.forEach(button => {
            button.addEventListener('click', handleDeleteImage);
        });
    }

    // === ОБРАБОТЧИКИ КЛИКОВ ПО ОСНОВНЫМ КНОПКАМ ===

    // Открыть модальное окно консультации
    function openConsultationModal() {
        logger.info("Открытие модального окна консультации");
        resetConsultationForm();
        openOverlay(consultationOverlay);
    }

    // Открыть модальное окно примерки
    function openTryOnModal() {
        logger.info("Открытие модального окна примерки");
        resetTryOnForm();
        openOverlay(tryOnOverlay);
    }

    // Обработка клика по кнопке FAB
    function handleFabClick() {
        logger.info("Клик по FAB кнопке");
        openConsultationModal();
    }

    // Обработка клика по кнопке меню
    function handleMenuClick() {
        logger.info("Клик по кнопке меню");
        showToast("Меню в разработке");
    }

    // Обработка клика по кнопке поиска
    function handleSearchClick() {
        logger.info("Клик по кнопке поиска");
        showToast("Поиск в разработке");
    }

    // Обработка клика по заголовку (возврат на главную)
    function handleHomeClick() {
        logger.info("Клик по заголовку (возврат на главную)");
        navItems.forEach(item => {
            if (item.getAttribute('data-tab') === 'home') {
                handleNavClick({ currentTarget: item });
            }
        });
    }

    // === НАВИГАЦИЯ ===

    // Обработка клика по пункту нижнего меню
    function handleNavClick(event) {
        const item = event.currentTarget;
        const tabName = item.getAttribute('data-tab');

        logger.info(`Переключение на вкладку: ${tabName}`);

        // Обновляем активный класс
        navItems.forEach(navItem => {
            navItem.classList.remove('active');
        });
        item.classList.add('active');

        // Обновляем состояние приложения
        appState.selectedTab = tabName;

        // Временное уведомление для неготовых разделов
        if (tabName !== 'home') {
            const tabText = item.querySelector('.nav-text').textContent;
            showToast(`Раздел "${tabText}" в разработке`);
        }
    }

    // === ОБРАБОТКА РЕЖИМОВ КОНСУЛЬТАЦИИ ===

    // Переключение между режимами одиночного анализа и сравнения
    function handleModeSwitch(event) {
        const mode = event.currentTarget.getAttribute('data-mode');
        logger.info(`Переключение режима консультации на: ${mode}`);

        if (!mode) {
            logger.error("Атрибут data-mode не найден в элементе переключения режима");
            return;
        }

        // Обновляем активный класс
        modeButtons.forEach(button => {
            button.classList.remove('active');
        });
        event.currentTarget.classList.add('active');

        // Показываем соответствующий интерфейс
        if (mode === 'single') {
            if (singleAnalysisMode) singleAnalysisMode.classList.remove('hidden');
            if (compareAnalysisMode) compareAnalysisMode.classList.add('hidden');
            appState.consultationMode = 'single';
        } else {
            if (singleAnalysisMode) singleAnalysisMode.classList.add('hidden');
            if (compareAnalysisMode) compareAnalysisMode.classList.remove('hidden');
            appState.consultationMode = 'compare';
        }
    }

    // === ЗАГРУЗКА ИЗОБРАЖЕНИЙ ===

    // Обработка загрузки одиночного изображения
    function handleSingleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        logger.info("Загрузка одиночного изображения:", file.name);

        if (!validateImageFile(file)) {
            event.target.value = '';
            return;
        }

        appState.singleImage = file;

        if (singlePreviewImage && singlePreviewContainer) {
            displayImagePreview(file, singlePreviewImage);
            singlePreviewContainer.style.display = 'block';
        }

        showToast("Изображение загружено");
    }

    // Обработка загрузки изображения для сравнения
    function handleCompareImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const slotIndex = parseInt(event.currentTarget.getAttribute('data-slot'));
        if (isNaN(slotIndex)) {
            logger.error("Не удалось определить индекс слота для сравнения изображений");
            return;
        }

        logger.info(`Загрузка изображения для сравнения в слот ${slotIndex}:`, file.name);

        if (!validateImageFile(file)) {
            event.target.value = '';
            return;
        }

        appState.compareImages[slotIndex] = file;

        // Находим слот и обновляем его внешний вид
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) {
            logger.error(`Слот с индексом ${slotIndex} не найден`);
            return;
        }

        // Если уже есть изображение в слоте, обновляем его
        let slotImage = slot.querySelector('.slot-image');
        if (!slotImage) {
            // Создаем элемент изображения, если его еще нет
            slotImage = document.createElement('img');
            slotImage.className = 'slot-image';
            slot.innerHTML = ''; // Очищаем слот
            slot.appendChild(slotImage);

            // Добавляем кнопку удаления
            const removeButton = document.createElement('div');
            removeButton.className = 'remove-image';
            removeButton.textContent = '✕';
            removeButton.setAttribute('data-slot', slotIndex);
            removeButton.addEventListener('click', handleRemoveCompareImage);
            slot.appendChild(removeButton);
        }

        // Отображаем изображение
        const reader = new FileReader();
        reader.onload = function (e) {
            slotImage.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Обновляем класс слота
        slot.classList.add('filled');

        showToast("Изображение добавлено");
    }

    // Обработка удаления изображения для сравнения
    function handleRemoveCompareImage(event) {
        event.stopPropagation();

        const slotIndex = parseInt(event.currentTarget.getAttribute('data-slot'));
        if (isNaN(slotIndex)) {
            logger.error("Не удалось определить индекс слота для удаления изображения");
            return;
        }

        logger.info(`Удаление изображения из слота ${slotIndex}`);

        // Очищаем состояние
        appState.compareImages[slotIndex] = null;

        // Находим слот и возвращаем ему первоначальный вид
        const slot = document.querySelector(`.image-slot[data-slot="${slotIndex}"]`);
        if (!slot) {
            logger.error(`Слот с индексом ${slotIndex} не найден`);
            return;
        }

        slot.classList.remove('filled');

        slot.innerHTML = `
            <div class="upload-icon">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
            </div>
            <input type="file" class="compare-upload-input" accept="image/*" data-slot="${slotIndex}">
        `;

        // Обновляем обработчик событий для нового input
        const newInput = slot.querySelector('.compare-upload-input');
        newInput.addEventListener('change', handleCompareImageUpload);

        showToast("Изображение удалено");
    }

    // Обработка загрузки фото пользователя для примерки
    function handleYourPhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        logger.info("Загрузка фото пользователя:", file.name);

        if (!validateImageFile(file)) {
            event.target.value = '';
            return;
        }

        appState.yourPhoto = file;

        if (yourPhotoPreview && yourPhotoContainer) {
            displayImagePreview(file, yourPhotoPreview);
            yourPhotoContainer.style.display = 'block';
        }

        showToast("Ваше фото загружено");
    }

    // Обработка загрузки фото образа для примерки
    function handleOutfitPhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        logger.info("Загрузка фото образа:", file.name);

        if (!validateImageFile(file)) {
            event.target.value = '';
            return;
        }

        appState.outfitPhoto = file;

        if (outfitPhotoPreview && outfitPhotoContainer) {
            displayImagePreview(file, outfitPhotoPreview);
            outfitPhotoContainer.style.display = 'block';
        }

        showToast("Фото образа загружено");
    }

    // Обработка удаления изображения
    function handleDeleteImage(event) {
        const target = event.currentTarget.getAttribute('data-target');
        if (!target) {
            logger.error("Не удалось определить цель удаления изображения");
            return;
        }

        logger.info(`Удаление изображения: ${target}`);

        switch (target) {
            case 'single':
                appState.singleImage = null;
                if (singleUploadInput) singleUploadInput.value = '';
                if (singlePreviewContainer) singlePreviewContainer.style.display = 'none';
                break;

            case 'your-photo':
                appState.yourPhoto = null;
                if (yourPhotoInput) yourPhotoInput.value = '';
                if (yourPhotoContainer) yourPhotoContainer.style.display = 'none';
                break;

            case 'outfit-photo':
                appState.outfitPhoto = null;
                if (outfitPhotoInput) outfitPhotoInput.value = '';
                if (outfitPhotoContainer) outfitPhotoContainer.style.display = 'none';
                break;

            default:
                logger.warn(`Неизвестный тип цели удаления: ${target}`);
                return;
        }

        showToast("Изображение удалено");
    }

    // === ОСНОВНЫЕ ДЕЙСТВИЯ ===

    // Обработка клика по кнопке "Проанализировать"
    function handleAnalyzeClick() {
        logger.info("Клик по кнопке Проанализировать");

        if (appState.consultationMode === 'single') {
            // Проверка наличия одиночного изображения
            if (!appState.singleImage) {
                showToast("Пожалуйста, загрузите изображение одежды");
                return;
            }

            // Отправка запроса на анализ одного изображения
            analyzeSingleOutfit();
        } else {
            // Проверка наличия изображений для сравнения
            const validImages = appState.compareImages.filter(img => img !== null);

            if (validImages.length < 2) {
                showToast("Пожалуйста, загрузите минимум 2 изображения для сравнения");
                return;
            }

            if (validImages.length > 4) {
                showToast("Максимальное количество изображений для сравнения - 4");
                return;
            }

            // Отправка запроса на сравнение изображений
            compareOutfits(validImages);
        }
    }

    // Обработка клика по кнопке "Примерить"
    function handleTryOnClick() {
        logger.info("Клик по кнопке Примерить");

        // Проверка наличия обоих необходимых изображений
        if (!appState.yourPhoto) {
            showToast("Пожалуйста, загрузите ваше фото");
            return;
        }

        if (!appState.outfitPhoto) {
            showToast("Пожалуйста, загрузите фото образа");
            return;
        }

        // Отправка запроса на виртуальную примерку
        tryOnOutfit();
    }

    // Обработка клика по кнопке "Скачать результат"
    function handleResultDownload() {
        logger.info("Клик по кнопке Скачать результат");

        // Проверка наличия результата
        if (!tryOnResultImage || !tryOnResultImage.src) {
            showToast("Нет изображения для скачивания");
            return;
        }

        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.href = tryOnResultImage.src;
        link.download = 'mishura-virtual-tryon.jpg';
        link.click();

        showToast("Изображение сохранено");
    }

    // === API ЗАПРОСЫ ===

    // Анализ одного предмета одежды
    async function analyzeSingleOutfit() {
        logger.info("Отправка запроса на анализ одежды");

        // Показываем индикатор загрузки
        showLoading("Анализируем вашу одежду...");

        try {
            // Создаем FormData для отправки
            const formData = new FormData();
            formData.append('image', appState.singleImage);
            formData.append('occasion', occasionSelector ? occasionSelector.value : 'повседневный');

            if (preferencesInput && preferencesInput.value.trim()) {
                formData.append('preferences', preferencesInput.value.trim());
            }

            // Отправляем запрос
            let response;

            try {
                response = await fetch('/analyze-outfit', {
                    method: 'POST',
                    body: formData
                });
            } catch (fetchError) {
                logger.error("Ошибка при отправке запроса на сервер:", fetchError);

                // Имитация ответа для демонстрации (в реальном приложении будет использоваться ответ от сервера)
                simulateAnalysisResponse();
                return;
            }

            // Обрабатываем ответ
            let data;

            try {
                data = await response.json();
            } catch (jsonError) {
                logger.error("Ошибка при разборе JSON ответа:", jsonError);

                // Имитация ответа для демонстрации
                simulateAnalysisResponse();
                return;
            }

            // Скрываем индикатор загрузки
            hideLoading();

            if (data.status === 'success') {
                logger.info("Анализ успешно получен");

                // Сохраняем результат в состоянии
                appState.lastApiResponse = data;

                // Закрываем диалог консультации
                closeOverlay(consultationOverlay);

                // Отображаем результаты
                displayResults(data.advice);
            } else {
                logger.error("Ошибка при анализе:", data.message);
                showToast(`Ошибка: ${data.message || 'Не удалось проанализировать изображение'}`);

                // Имитация ответа для демонстрации
                simulateAnalysisResponse();
            }
        } catch (error) {
            logger.error("Общая ошибка при отправке запроса:", error);
            hideLoading();
            showToast("Ошибка соединения с сервером. Попробуйте позже.");

            // Имитация ответа для демонстрации
            simulateAnalysisResponse();
        }
    }

    // Имитация ответа для анализа одежды (демонстрационный режим)
    function simulateAnalysisResponse() {
        setTimeout(() => {
            hideLoading();

            // Закрываем диалог консультации
            closeOverlay(consultationOverlay);

            // Демонстрационный ответ
            const demoAdvice = `### 1. Описание Вещи (Мишура)
* **Тип:** Casual джинсовая рубашка
* **Фасон и крой:** Прямой классический крой с карманами на груди
* **Цвет/Принт:** Светло-голубой деним, однотонный
* **Материал (предположительно):** Хлопковый деним средней плотности
* **Ключевые детали:** Металлические кнопки, отложной воротник, накладные карманы

### 2. Оценка для повода "повседневный" от Мишуры
* **Соответствие:** Отличный выбор!
* **Комментарий:** Джинсовая рубашка идеально подходит для повседневных образов. Её универсальность позволяет создавать различные комбинации — от расслабленных до более структурированных.

### 3. Рекомендации по Сочетаниям от Мишуры
* **Образ 1:** Сочетайте эту рубашку с темно-синими или черными джинсами slim-fit и белыми кроссовками для современного повседневного образа. В прохладную погоду добавьте бежевый или серый кардиган.
* **Образ 2:** Для более нарядного образа комбинируйте с бежевыми чиносами, коричневыми дерби и тонким кожаным ремнем в тон обуви.
* **Аксессуары:** Минималистичные часы с кожаным ремешком и солнцезащитные очки в темной оправе отлично дополнят образ.

### 4. Общее Впечатление и Сезонность от Мишуры
* Стильная и актуальная вещь, которая подходит для любого сезона. Летом носите с подвернутыми рукавами как самостоятельный верх, весной и осенью — как слой под куртку или пиджак.

💡 Совет для будущих консультаций: В следующий раз, если вы хотите более точные рекомендации по поводу аксессуаров, укажите в своих предпочтениях, какие цвета и стили вам нравятся. Это поможет мне дать ещё более персонализированные советы.`;

            // Отображаем результаты
            displayResults(demoAdvice);
        }, 1500);
    }

    // Сравнение нескольких предметов одежды
    async function compareOutfits(images) {
        logger.info(`Отправка запроса на сравнение ${images.length} предметов одежды`);

        // Показываем индикатор загрузки
        showLoading("Сравниваем предметы одежды...");

        try {
            // Создаем FormData для отправки
            const formData = new FormData();

            // Добавляем все изображения
            images.forEach((image, index) => {
                formData.append('images', image);
            });

            // Добавляем дополнительные параметры
            formData.append('occasion', occasionSelector ? occasionSelector.value : 'повседневный');

            if (preferencesInput && preferencesInput.value.trim()) {
                formData.append('preferences', preferencesInput.value.trim());
            }

            // Отправляем запрос
            let response;

            try {
                response = await fetch('/compare-outfits', {
                    method: 'POST',
                    body: formData
                });
            } catch (fetchError) {
                logger.error("Ошибка при отправке запроса на сервер:", fetchError);

                // Имитация ответа для демонстрации
                simulateComparisonResponse(images.length);
                return;
            }

            // Обрабатываем ответ
            let data;

            try {
                data = await response.json();
            } catch (jsonError) {
                logger.error("Ошибка при разборе JSON ответа:", jsonError);

                // Имитация ответа для демонстрации
                simulateComparisonResponse(images.length);
                return;
            }

            // Скрываем индикатор загрузки
            hideLoading();

            if (data.status === 'success') {
                logger.info("Сравнение успешно получено");

                // Сохраняем результат в состоянии
                appState.lastApiResponse = data;

                // Закрываем диалог консультации
                closeOverlay(consultationOverlay);

                // Отображаем результаты
                displayResults(data.advice);
            } else {
                logger.error("Ошибка при сравнении:", data.message);
                showToast(`Ошибка: ${data.message || 'Не удалось сравнить изображения'}`);

                // Имитация ответа для демонстрации
                simulateComparisonResponse(images.length);
            }
        } catch (error) {
            logger.error("Общая ошибка при отправке запроса:", error);
            hideLoading();
            showToast("Ошибка соединения с сервером. Попробуйте позже.");

            // Имитация ответа для демонстрации
            simulateComparisonResponse(images.length);
        }
    }

    // Имитация ответа для сравнения одежды (демонстрационный режим)
    function simulateComparisonResponse(imageCount) {
        setTimeout(() => {
            hideLoading();

            // Закрываем диалог консультации
            closeOverlay(consultationOverlay);

            // Демонстрационный ответ
            const demoAdvice = `### Краткий Обзор Предметов от Мишуры
* **Предмет 1:** Черный облегающий джемпер из тонкой шерсти с круглым вырезом
* **Предмет 2:** Темно-синий свитер из мериносовой шерсти с V-образным вырезом
${imageCount > 2 ? '* **Предмет 3:** Серый кашемировый свитер с высоким горлом и ребристой вязкой' : ''}
${imageCount > 3 ? '* **Предмет 4:** Бежевый кардиган из хлопка с пуговицами и накладными карманами' : ''}

### Сравнение для повода "повседневный" от Мишуры
* **Предмет 1:** Универсальный базовый элемент, хорошо сочетается с множеством вещей, но может выглядеть слишком строго для некоторых повседневных ситуаций.
* **Предмет 2:** Сочетает элегантность и комфорт, V-образный вырез делает его более интересным визуально.
${imageCount > 2 ? '* **Предмет 3:** Наиболее теплый и комфортный вариант, создает стильный и современный образ благодаря текстуре и фасону.' : ''}
${imageCount > 3 ? '* **Предмет 4:** Наиболее универсальный и функциональный вариант, можно использовать как верхний слой или самостоятельно.' : ''}

### Итоговая Рекомендация от Мишуры
* **Лучший выбор:** Предмет ${imageCount > 2 ? '3' : '2'} - идеально подходит для повседневного использования благодаря сочетанию комфорта, стиля и универсальности. Цвет и фактура делают его более интересным визуально, при этом он остается достаточно сдержанным для разных ситуаций.
* **Стилизация лучшего выбора:** Сочетайте с джинсами прямого кроя или чиносами, добавьте кожаные кроссовки или ботинки chelsea для завершенного образа.

💡 Совет для будущих сравнений: Для более точных рекомендаций было бы полезно знать, какой у вас тип фигуры и какие цветовые сочетания вы предпочитаете. Это поможет мне дать более персонализированные советы.`;

            // Отображаем результаты
            displayResults(demoAdvice);
        }, 1500);
    }

    // Виртуальная примерка
    async function tryOnOutfit() {
        logger.info("Отправка запроса на виртуальную примерку");

        // Показываем индикатор загрузки
        showLoading("Создаем виртуальную примерку...");

        // Временная имитация запроса (будет заменено реальным API)
        setTimeout(() => {
            hideLoading();

            // Для демонстрации используем загруженные изображения
            // В реальном приложении здесь будет ответ от API

            const reader = new FileReader();
            reader.onload = function (e) {
                // Используем фото образа в качестве результата для демонстрации
                if (tryOnResultImage) {
                    tryOnResultImage.src = e.target.result;
                }

                // Закрываем диалог примерки
                closeOverlay(tryOnOverlay);

                // Открываем диалог с результатом
                openOverlay(tryOnResultOverlay);
            };
            reader.readAsDataURL(appState.outfitPhoto);

            logger.info("Виртуальная примерка создана (демо)");
        }, 2000);
    }

    // === УТИЛИТЫ ИНТЕРФЕЙСА ===

    // Показать всплывающее сообщение
    function showToast(message, duration = 2000) {
        logger.debug(`Показ сообщения: ${message}`);

        // Находим или создаем элемент toast
        const toastElement = document.getElementById('toast') || createToastElement();

        // Устанавливаем текст и показываем
        toastElement.textContent = message;
        toastElement.classList.add('show');

        // Скрываем через указанное время
        setTimeout(() => {
            toastElement.classList.remove('show');
        }, duration);
    }

    // Создать элемент toast, если его нет
    function createToastElement() {
        const toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
        return toast;
    }

    // Показать индикатор загрузки
    function showLoading(message = 'Загрузка...') {
        logger.debug(`Показ индикатора загрузки: ${message}`);

        if (loadingText) {
            loadingText.textContent = message;
        }

        openOverlay(loadingOverlay);
        appState.isLoading = true;
    }

    // Скрыть индикатор загрузки
    function hideLoading() {
        logger.debug('Скрытие индикатора загрузки');

        closeOverlay(loadingOverlay);
        appState.isLoading = false;
    }

    // Открыть оверлей
    function openOverlay(overlay) {
        if (!overlay) {
            logger.error('Попытка открыть несуществующий оверлей');
            return;
        }

        logger.debug(`Открытие оверлея: ${overlay.id}`);

        overlay.classList.add('active');
    }

    // Закрыть оверлей
    function closeOverlay(overlay) {
        if (!overlay) {
            logger.error('Попытка закрыть несуществующий оверлей');
            return;
        }

        logger.debug(`Закрытие оверлея: ${overlay.id}`);

        overlay.classList.remove('active');
    }

    // Отобразить превью изображения
    function displayImagePreview(file, imgElement) {
        if (!file || !imgElement) {
            logger.error('Невозможно отобразить превью - отсутствует файл или элемент изображения');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            imgElement.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Отобразить результаты анализа
    function displayResults(advice) {
        logger.info("Отображение результатов анализа");

        if (!resultsContainer) {
            logger.error('Контейнер для результатов не найден');
            return;
        }

        // Очищаем контейнер результатов
        resultsContainer.innerHTML = '';

        // Преобразуем текстовые результаты в HTML
        // Предполагается, что совет в формате Markdown с заголовками
        const sections = advice.split('###').filter(section => section.trim() !== '');

        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'result-section';

            const lines = section.trim().split('\n');
            const title = lines[0].trim();
            const content = lines.slice(1).join('\n').trim();

            const titleEl = document.createElement('div');
            titleEl.className = 'result-section-title';
            titleEl.textContent = title;

            const contentEl = document.createElement('div');
            contentEl.className = 'result-section-content';
            contentEl.innerHTML = parseMarkdown(content);

            sectionDiv.appendChild(titleEl);
            sectionDiv.appendChild(contentEl);
            resultsContainer.appendChild(sectionDiv);
        });

        // Открываем оверлей с результатами
        openOverlay(resultsOverlay);
    }

    // Преобразование Markdown в HTML
    function parseMarkdown(markdown) {
        // Заменяем маркеры списка
        let html = markdown.replace(/\*\s(.*)/g, '<li>$1</li>');

        // Добавляем теги списка
        if (html.includes('<li>')) {
            html = '<ul>' + html + '</ul>';
        }

        // Заменяем двойные переносы строк на параграфы
        html = html.replace(/\n\n/g, '</p><p>');

        // Оборачиваем весь текст в параграф если он не начинается с <ul>
        if (!html.startsWith('<ul>')) {
            html = '<p>' + html + '</p>';
        }

        // Удаляем пустые параграфы
        html = html.replace(/<p><\/p>/g, '');

        return html;
    }

    // Сброс формы консультации
    function resetConsultationForm() {
        // Сбрасываем режим
        appState.consultationMode = 'single';

        // Активируем первую кнопку режима
        modeButtons.forEach((button, index) => {
            button.classList.toggle('active', index === 0);
        });

        // Показываем режим одиночного анализа
        if (singleAnalysisMode && compareAnalysisMode) {
            singleAnalysisMode.classList.remove('hidden');
            compareAnalysisMode.classList.add('hidden');
        }

        // Очищаем поля
        if (singleUploadInput) singleUploadInput.value = '';
        if (preferencesInput) preferencesInput.value = '';
        if (occasionSelector) occasionSelector.selectedIndex = 0;

        // Скрываем превью
        if (singlePreviewContainer) singlePreviewContainer.style.display = 'none';

        // Очищаем состояние
        appState.singleImage = null;
        appState.compareImages = [null, null, null, null];

        // Очищаем слоты сравнения
        const slots = document.querySelectorAll('.image-slot');
        slots.forEach(slot => {
            const slotIndex = slot.getAttribute('data-slot');

            // Возвращаем исходный вид
            slot.classList.remove('filled');
            slot.innerHTML = `
                <div class="upload-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                </div>
                <input type="file" class="compare-upload-input" accept="image/*" data-slot="${slotIndex}">
            `;

            // Обновляем обработчик событий
            const input = slot.querySelector('.compare-upload-input');
            if (input) {
                input.addEventListener('change', handleCompareImageUpload);
            }
        });
    }

    // Сброс формы примерки
    function resetTryOnForm() {
        // Очищаем поля
        if (yourPhotoInput) yourPhotoInput.value = '';
        if (outfitPhotoInput) outfitPhotoInput.value = '';
        if (tryOnStyleSelector) tryOnStyleSelector.selectedIndex = 0;

        // Скрываем превью
        if (yourPhotoContainer) yourPhotoContainer.style.display = 'none';
        if (outfitPhotoContainer) outfitPhotoContainer.style.display = 'none';

        // Очищаем состояние
        appState.yourPhoto = null;
        appState.outfitPhoto = null;
    }

    // Обновление интерфейса
    function refreshUI() {
        // Обновляем активный таб
        navItems.forEach(item => {
            const tabName = item.getAttribute('data-tab');
            item.classList.toggle('active', tabName === appState.selectedTab);
        });
    }

    // Валидация файла изображения
    function validateImageFile(file) {
        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            showToast("Пожалуйста, выберите файл изображения");
            return false;
        }

        // Проверка размера файла (не более 5 МБ)
        if (file.size > 5 * 1024 * 1024) {
            showToast("Размер файла превышает 5 МБ");
            return false;
        }

        return true;
    }

    // Запускаем инициализацию
    initApp();
});