"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Интеграция с Gemini AI (gemini_ai.py)
ВЕРСИЯ: 0.3.1.4 (Стандартизация комментариев, проверка импортов)
ДАТА ОБНОВЛЕНИЯ: 2025-05-20

МЕТОДОЛОГИЯ РАБОТЫ И ОБНОВЛЕНИЯ КОДА:
1.  Целостность Обновлений: Любые изменения файлов предоставляются целиком.
    Частичные изменения кода не допускаются для обеспечения стабильности интеграции.
2.  Язык Коммуникации: Комментарии и документация ведутся на русском языке.
3.  Стандарт Качества: Данный код является частью проекта "МИШУРА", разработанного
    с применением высочайших стандартов программирования и дизайна, соответствуя
    уровню лучших мировых практик.

НАЗНАЧЕНИЕ ФАЙЛА:
Модуль для взаимодействия с Google Gemini AI. Включает функции для анализа
одежды по фотографиям, сравнения образов и генерации стилистических рекомендаций.
Использует кэширование для оптимизации запросов.
==========================================================================================
"""
import os
import logging
import time
import asyncio # Для асинхронных операций и задержек
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image, ImageOps, ImageDraw # ImageDraw для тестового блока
from io import BytesIO
from cache_manager import AnalysisCacheManager # Предполагаем, что он есть и работает

# Настройка логирования
logger_gemini = logging.getLogger(__name__)
if not logger_gemini.handlers: # Предотвращение многократного добавления обработчиков
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - [%(levelname)s] - %(name)s - [%(funcName)s:%(lineno)d] %(message)s'
    )

logger_gemini.info("Инициализация модуля интеграции с Gemini AI для проекта МИШУРА.")

# Загрузка переменных окружения
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Конфигурация Gemini API
API_CONFIGURED_SUCCESSFULLY = False
if not GEMINI_API_KEY:
    logger_gemini.critical("КРИТИЧЕСКАЯ ОШИБКА: GEMINI_API_KEY не найден в .env файле или переменных окружения.")
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        API_CONFIGURED_SUCCESSFULLY = True
        logger_gemini.info("Gemini API успешно сконфигурирован.")
    except Exception as e:
        logger_gemini.critical(f"КРИТИЧЕСКАЯ ОШИБКА при конфигурации Gemini API: {e}", exc_info=True)

# Модели Gemini
VISION_MODEL = "models/gemini-1.5-flash"  # Используем актуальную модель

# Параметры повторных запросов
MAX_RETRIES = 3
RETRY_DELAY = 5 # Немного увеличена задержка для стабильности

# Инициализация менеджера кэша
CACHE_ENABLED = False # По умолчанию кэш выключен, если менеджер не инициализируется
cache_manager = None
try:
    cache_manager = AnalysisCacheManager() # Используем параметры по умолчанию из cache_manager.py
    CACHE_ENABLED = True
    logger_gemini.info("Менеджер кэша AnalysisCacheManager успешно инициализирован.")
except ImportError:
    logger_gemini.warning("Модуль cache_manager.py не найден. Кэширование будет ОТКЛЮЧЕНО.")
    class DummyCacheManager: # Заглушка для работы без кэша
        def get_from_cache(self, *args, **kwargs): logger_gemini.debug("DummyCache: get_from_cache вызван."); return None
        def save_to_cache(self, *args, **kwargs): logger_gemini.debug("DummyCache: save_to_cache вызван.")
    cache_manager = DummyCacheManager()
except Exception as e_cache:
    logger_gemini.error(f"Ошибка при инициализации AnalysisCacheManager: {e_cache}. Кэширование будет ОТКЛЮЧЕНО.", exc_info=True)
    if not isinstance(cache_manager, DummyCacheManager): # Если заглушка не была создана
        class DummyCacheManagerOnError:
            def get_from_cache(self, *args, **kwargs): logger_gemini.debug("DummyCacheOnError: get_from_cache вызван."); return None
            def save_to_cache(self, *args, **kwargs): logger_gemini.debug("DummyCacheOnError: save_to_cache вызван.")
        cache_manager = DummyCacheManagerOnError()


async def test_gemini_connection():
    """Тестирует соединение с Gemini API."""
    logger_gemini.debug("Вызов функции test_gemini_connection.")
    if not API_CONFIGURED_SUCCESSFULLY:
        logger_gemini.error("Тест соединения: Gemini API не сконфигурирован.")
        return False, "Gemini API не сконфигурирован (отсутствует API ключ или ошибка инициализации)."
    try:
        model = genai.GenerativeModel(VISION_MODEL)
        # Используем простой текстовый запрос для проверки доступности модели
        response = await model.generate_content_async("Это тест соединения с Gemini API. Ответь кратко.")
        if response and response.text:
            logger_gemini.info(f"Тестовое соединение с Gemini API ({VISION_MODEL}) успешно. Ответ: {response.text[:50]}...")
            return True, f"Соединение с Gemini API ({VISION_MODEL}) работает нормально."
        else:
            # Анализ возможных причин отсутствия текста в ответе
            reason_message = "API не вернул текстовый ответ."
            if response and response.prompt_feedback and response.prompt_feedback.block_reason:
                reason_message += f" Причина блокировки промпта: {response.prompt_feedback.block_reason_message or response.prompt_feedback.block_reason}."
            elif response and response.candidates and not response.text:
                 if response.candidates[0].finish_reason:
                     reason_message += f" Причина завершения генерации: {response.candidates[0].finish_reason.name}."

            logger_gemini.error(f"Тестовое соединение с Gemini API не вернуло ожидаемый текст. {reason_message} Полный ответ: {response}")
            return False, f"API не вернул текстовый ответ на тестовый запрос. {reason_message}"
    except Exception as e:
        logger_gemini.error(f"Ошибка при тестовом соединении с Gemini API: {e}", exc_info=True)
        return False, f"Ошибка при тестировании соединения с Gemini API: {str(e)}"

def handle_gemini_error(error: Exception, context_message: str = "") -> str:
    """Обрабатывает ошибки от Gemini API и возвращает стандартизированное сообщение."""
    logger_gemini.error(f"Ошибка Gemini AI в контексте '{context_message}': {type(error).__name__} - {error}", exc_info=True)
    error_str = str(error).lower()

    if "api key" in error_str or "authentication" in error_str or isinstance(error, (genai.types.PermissionDeniedError, genai.types.UnauthenticatedError)): # type: ignore
        return "Ошибка аутентификации с Gemini API. Проверьте правильность и активность вашего API ключа."
    elif "content filtered" in error_str or "safety" in error_str or (hasattr(error, 'response') and hasattr(error.response, 'prompt_feedback') and error.response.prompt_feedback.block_reason): # type: ignore
        reason = "неизвестная причина безопасности"
        if hasattr(error, 'response') and hasattr(error.response, 'prompt_feedback') and error.response.prompt_feedback.block_reason: # type: ignore
            reason = error.response.prompt_feedback.block_reason_message or error.response.prompt_feedback.block_reason # type: ignore
        return f"Запрос к Gemini API был заблокирован по соображениям безопасности: {reason}. Попробуйте изменить изображение или текст запроса."
    elif isinstance(error, genai.types.ResourceExhaustedError): # type: ignore
        return "Исчерпан лимит запросов к Gemini API. Пожалуйста, проверьте квоты или попробуйте позже."
    elif isinstance(error, genai.types.DeadlineExceededError): # type: ignore
         return "Превышено время ожидания ответа от Gemini API. Попробуйте позже или уменьшите размер запроса."
    # Другие специфические ошибки Gemini можно добавить здесь
    else:
        # Обрезаем слишком длинные общие сообщения об ошибках
        return f"Произошла ошибка при взаимодействии с ИИ-стилистом ({context_message}): {str(error)[:200]}"


def optimize_image(img_pil: Image.Image, max_size: int = 1024, quality: int = 85, format: str = 'JPEG') -> bytes:
    """
    Оптимизирует изображение PIL.Image для отправки в API.
    Изменяет размер, конвертирует в RGB (удаляя альфа-канал), применяет автоконтраст
    и сохраняет в указанном формате (по умолчанию JPEG) с заданным качеством.

    Args:
        img_pil: Объект PIL.Image.
        max_size: Максимальный размер большей стороны изображения.
        quality: Качество сохранения для JPEG (1-95).
        format: Формат сохранения ('JPEG', 'PNG').

    Returns:
        bytes: Оптимизированные бинарные данные изображения.
    
    Raises:
        ValueError: Если не удалось оптимизировать изображение.
    """
    logger_gemini.debug(f"Начало оптимизации изображения: исходный размер {img_pil.size}, режим {img_pil.mode}, целевой формат {format}")
    
    try:
        # 1. Изменение размера (если необходимо) с сохранением пропорций
        original_width, original_height = img_pil.size
        if original_width > max_size or original_height > max_size:
            if original_width > original_height:
                new_width = max_size
                new_height = int(original_height * (max_size / original_width))
            else:
                new_height = max_size
                new_width = int(original_width * (max_size / original_height))
            
            logger_gemini.info(f"Изменение размера изображения с {original_width}x{original_height} до {new_width}x{new_height}")
            img_pil = img_pil.resize((new_width, new_height), Image.Resampling.LANCZOS) # LANCZOS для лучшего качества

        # 2. Конвертация в RGB (если есть альфа-канал или не RGB)
        # Это важно для JPEG и часто для моделей ИИ, которые не ожидают альфа-канал
        if img_pil.mode in ('RGBA', 'LA') or (img_pil.mode == 'P' and 'transparency' in img_pil.info):
            logger_gemini.info(f"Конвертация изображения из режима {img_pil.mode} в RGB для удаления альфа-канала.")
            # Создаем белый фон и накладываем изображение, используя его альфа-канал как маску
            background = Image.new("RGB", img_pil.size, (255, 255, 255))
            img_rgba_for_paste = img_pil.convert("RGBA") # Гарантируем RGBA для доступа к маске
            # Используем альфа-канал изображения как маску
            alpha_mask = img_rgba_for_paste.split()[3] if len(img_rgba_for_paste.split()) == 4 else None
            background.paste(img_rgba_for_paste, mask=alpha_mask)
            img_pil = background
        elif img_pil.mode != 'RGB':
            logger_gemini.info(f"Конвертация изображения из режима {img_pil.mode} в RGB.")
            img_pil = img_pil.convert('RGB')
        
        logger_gemini.debug(f"Изображение после конвертации: режим {img_pil.mode}, размер {img_pil.size}.")

        # 3. Автоконтраст для улучшения четкости (опционально, но часто полезно)
        try:
            img_pil = ImageOps.autocontrast(img_pil, cutoff=0.5) # cutoff может помочь с некоторыми изображениями
            logger_gemini.debug("Автоконтраст применен.")
        except Exception as e_ac:
            logger_gemini.warning(f"Не удалось применить автоконтраст: {e_ac}. Продолжаем без него.")
        
        # 4. Сохранение в байтовый поток в целевом формате
        img_byte_arr = BytesIO()
        save_params = {'optimize': True}
        if format.upper() == 'JPEG':
            save_params['quality'] = quality
        
        img_pil.save(img_byte_arr, format=format.upper(), **save_params)
        img_bytes = img_byte_arr.getvalue()
        
        logger_gemini.info(f"Изображение успешно оптимизировано: формат {format}, качество {quality if format.upper() == 'JPEG' else 'N/A'}, итоговый размер: {len(img_bytes) / 1024:.1f} KB")
        return img_bytes
    
    except Exception as e:
        logger_gemini.error(f"КРИТИЧЕСКАЯ ОШИБКА в функции optimize_image: {type(e).__name__} - {e}", exc_info=True)
        # Оборачиваем в ValueError для стандартизации ошибок от этой функции
        raise ValueError(f"Не удалось оптимизировать изображение: {str(e)}")


def create_analysis_prompt(occasion: str, preferences: str = None) -> str:
    """Создает промпт для Gemini AI для анализа одного предмета одежды."""
    logger_gemini.debug(f"Создание промпта для анализа. Повод: '{occasion}', Предпочтения: '{preferences or 'не указаны'}'")
    # (Ваш улучшенный промпт из предыдущих версий)
    prompt = f"""Ты — Мишура, профессиональный и дружелюбный ИИ-стилист. Твоя задача — дать краткий, но содержательный анализ предмета одежды на фото и практичные рекомендации.

## Информация от пользователя:
- **Повод/ситуация:** {occasion}
{f'- **Предпочтения пользователя:** {preferences}' if preferences and preferences.strip() else '- Предпочтения: не указаны.'}

## Твоя задача:
1.  **Проанализируй вещь:** Дай четкий и практичный анализ по основной структуре ниже. Будь лаконичен, но не упускай важные детали.
2.  **Интеллектуальная подсказка (если действительно нужно):** После основного совета, если ты объективно видишь, что предоставление пользователем *конкретной* дополнительной информации (например, другого ракурса фото, уточнения по материалу, если он совсем не ясен, или ключевых личных параметров, если они критичны для совета по данной вещи и поводу) могло бы *значительно* улучшить твой совет в *будущем запросе*, добавь тактичную и персонализированную секцию "💡 Совет для будущих консультаций".
    * **Примеры хороших подсказок:** "Кстати, на фото не очень хорошо видна текстура ткани пиджака. Если в следующий раз вы сможете сделать снимок крупнее или при лучшем освещении, я смогу точнее подобрать к нему брюки по фактуре.", "Отличный выбор платья! Чтобы я могла давать еще более точные советы по фасонам, которые подчеркнут вашу фигуру, в следующий раз вы могли бы упомянуть ваш рост и тип фигуры, если вам комфортно."
    * **Когда НЕ добавлять подсказку:** Не добавляй эту секцию, если текущей информации достаточно для хорошего совета, или если подсказка будет слишком общей (например, "предоставляйте больше информации"), или если она не относится к текущей ситуации. Твоя цель – помочь пользователю, а не показаться придирчивой.

## Структура основного ответа (Markdown):

### 1. Описание Вещи (Мишура)
* **Тип:** (напр., Элегантная блузка, Повседневные джинсы, Вечернее пальто)
* **Фасон и крой:** (напр., Полуприлегающий силуэт, Прямой крой со стрелками, Оверсайз с объемными рукавами)
* **Цвет/Принт:** (напр., Глубокий изумрудный, Деликатный цветочный принт на кремовом фоне)
* **Материал (предположительно):** (напр., Натуральный шелк, Плотный хлопок, Смесовая шерсть). *Если не уверен, укажи: "По фото сложно определить точный материал, но тактильно это может быть..."*
* **Ключевые детали:** (напр., Асимметричный воротник, контрастная отстрочка, драпировка на талии)

### 2. Оценка для повода "{occasion}" от Мишуры
* **Соответствие:** (напр., Отличный выбор! / Очень хорошо подходит / Требует небольшой адаптации / Не самый удачный вариант, но можно попробовать...)
* **Комментарий:** (1-2 предложения: почему такая оценка, и как можно наилучшим образом стилизовать для этого повода)

### 3. Рекомендации по Сочетаниям от Мишуры (1-2 самых удачных варианта)
* **Образ 1:** (С чем сочетать: конкретный верх/низ, обувь. Пример: "Эта юбка будет прекрасно смотреться с облегающим кашемировым джемпером молочного цвета и высокими сапогами на устойчивом каблуке в тон юбки.")
* **Образ 2 (если есть хороший альтернативный вариант):** (Пример: "Для более смелого образа попробуйте скомбинировать ее с графичной футболкой, кожаной косухой и грубыми ботинками.")
* **Аксессуары (1-2 ключевых):** (Пример: "Из аксессуаров сюда идеально подойдет структурированная сумка среднего размера и минималистичные золотые серьги.")

### 4. Общее Впечатление и Сезонность от Мишуры (кратко)
* (Пример: "Очень стильная и актуальная вещь, которая станет основой многих образов для прохладной осени и весны.")

---
(Конец основного ответа. Если Мишура решила добавить подсказку, она будет здесь, начиная с "💡 Совет для будущих консультаций:")
"""
    return prompt

def create_comparison_prompt(occasion: str, preferences: str = None) -> str:
    """Создает промпт для Gemini AI для сравнения нескольких предметов одежды."""
    logger_gemini.debug(f"Создание промпта для сравнения. Повод: '{occasion}', Предпочтения: '{preferences or 'не указаны'}'")
    # (Ваш улучшенный промпт из предыдущих версий)
    prompt = f"""Ты — Мишура, профессиональный и дружелюбный ИИ-стилист. Тебе предоставлены фото нескольких предметов одежды. Проведи краткий, но емкий сравнительный анализ и дай четкую рекомендацию, какой из них лучше.

## Информация от пользователя:
- **Повод/ситуация:** {occasion}
{f'- **Предпочтения пользователя:** {preferences}' if preferences and preferences.strip() else '- Предпочтения: не указаны.'}

## Твоя задача:
1.  **Сравни предметы:** Очень кратко опиши каждый предмет (1-2 ключевые характеристики). Затем сравни их применительно к указанному поводу и предпочтениям.
2.  **Дай четкую рекомендацию:** Какой вариант является лучшим выбором и почему (1-2 главных аргумента).
3.  **Интеллектуальная подсказка (если действительно нужно):** После основного совета, если ты объективно видишь, что предоставление пользователем *конкретной* дополнительной информации о сравниваемых вещах или о его предпочтениях в контексте сравнения могло бы *значительно* улучшить твой совет в *будущем запросе*, добавь тактичную и персонализированную секцию "💡 Совет для будущих сравнений".
    * **Примеры хороших подсказок:** "В следующий раз, если будете сравнивать похожие платья, фото в полный рост помогут мне лучше оценить, как они сидят по фигуре.", "Поскольку оба варианта кажутся подходящими, уточнение, какой стиль (более строгий или расслабленный) вам ближе для этого мероприятия, помогло бы мне дать более однозначную рекомендацию."
    * **Когда НЕ добавлять подсказку:** Если информации достаточно, или подсказка будет общей.

## Структура основного ответа (Markdown):

### Краткий Обзор Предметов от Мишуры
(Нумеруй предметы как "Предмет 1", "Предмет 2" и т.д.)
* **Предмет 1:** (напр., Черное платье-футляр из плотного трикотажа)
* **Предмет 2:** (напр., Ярко-синий брючный костюм свободного кроя)
    (и так далее)

### Сравнение для повода "{occasion}" от Мишуры
(Очень кратко, по 1 предложению на предмет: ключевое преимущество или недостаток для данного повода)
* **Предмет 1:** (напр., Выглядит более формально и строго, что хорошо для деловой встречи.)
* **Предмет 2:** (напр., Создает более яркий и запоминающийся образ, но может быть менее уместен в консервативной среде.)
    (и так далее)

### Итоговая Рекомендация от Мишуры
* **Лучший выбор:** Предмет [Номер] - потому что [1-2 главных аргумента, почему он лучше для этого повода, учитывая предпочтения, если есть].
* **Стилизация лучшего выбора (1 совет):** (напр., "Дополните Предмет X классическими лодочками и небольшой сумкой-тоут.")

---
(Конец основного ответа. Если Мишура решила добавить подсказку, она будет здесь, начиная с "💡 Совет для будущих сравнений:")
"""
    return prompt

async def _send_to_gemini_with_retries(parts: list, context_for_log: str) -> str:
    """Отправляет запрос в Gemini API с логикой повторных попыток и обработкой ошибок."""
    logger_gemini.debug(f"Начало отправки запроса к Gemini: контекст '{context_for_log}', количество частей: {len(parts)}")
    if not API_CONFIGURED_SUCCESSFULLY:
        msg = f"Gemini API не сконфигурирован. Запрос для '{context_for_log}' не будет отправлен."
        logger_gemini.error(msg)
        # Возвращаем сообщение об ошибке, которое может быть показано пользователю
        return handle_gemini_error(RuntimeError("API_NOT_CONFIGURED_INTERNAL_ERROR_ID_G01"), context_for_log)

    retry_count = 0
    last_exception: Exception | None = None
    
    # Настройки генерации (можно вынести в конфигурацию, если нужно менять их динамически)
    generation_config = genai.types.GenerationConfig(
        temperature=0.65, # Умеренная креативность
        # top_p=0.95, # Можно добавить, если нужно
        # top_k=40,   # Можно добавить, если нужно
        # max_output_tokens=2048 # Ограничение длины ответа, если необходимо
    )
    safety_settings = [ # Блокируем контент средней и высокой степени опасности
        {"category": c, "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
        for c in [
            "HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"
        ]
    ]

    while retry_count < MAX_RETRIES:
        try:
            model = genai.GenerativeModel(VISION_MODEL) # Получаем модель
            logger_gemini.info(f"Отправка запроса к Gemini ({context_for_log}), попытка {retry_count + 1}/{MAX_RETRIES}...")
            
            response = await model.generate_content_async(
                parts,
                generation_config=generation_config,
                safety_settings=safety_settings,
                # request_options={"timeout": 60} # Таймаут для запроса в секундах, если нужно
            )
            
            # Извлечение текста из ответа (Gemini 1.5 может возвращать по-разному)
            full_response_text = ""
            if hasattr(response, 'text') and response.text:
                full_response_text = response.text.strip()
            elif response.parts: # Если ответ состоит из частей
                 full_response_text = "".join(part.text for part in response.parts if hasattr(part, 'text')).strip()

            if full_response_text: # Убедимся, что ответ не пустой
                logger_gemini.info(f"Ответ от Gemini ({context_for_log}) успешно получен (попытка {retry_count + 1}). Длина ответа: {len(full_response_text)} символов.")
                return full_response_text # Успешный выход
            else:
                # Анализ причины пустого ответа
                finish_reason_str = "N/A"
                block_reason_str = "N/A"
                if response.candidates and len(response.candidates) > 0:
                    candidate = response.candidates[0]
                    if candidate.finish_reason:
                        finish_reason_str = candidate.finish_reason.name
                    # Для Gemini 1.5 проверка блокировки может быть в prompt_feedback
                if response.prompt_feedback and response.prompt_feedback.block_reason:
                     block_reason_str = response.prompt_feedback.block_reason.name
                     finish_reason_str = f"PROMPT_BLOCKED ({block_reason_str})" # Уточняем причину

                logger_gemini.warning(f"Пустой текстовый ответ от Gemini ({context_for_log}), попытка {retry_count + 1}. Причина завершения: {finish_reason_str}, причина блокировки: {block_reason_str}.")
                last_exception = ValueError(f"Пустой ответ от Gemini. Причина завершения: {finish_reason_str}, причина блокировки: {block_reason_str}")
                setattr(last_exception, 'response', response) # Добавляем полный ответ к исключению для анализа
                
                # Не повторяем для определенных невосстановимых причин
                if finish_reason_str in ["SAFETY", "RECITATION", "MAX_TOKENS"] or "PROMPT_BLOCKED" in finish_reason_str:
                    logger_gemini.error(f"Невосстановимая причина пустого ответа от Gemini ({context_for_log}): {finish_reason_str}. Прекращение попыток.")
                    return handle_gemini_error(last_exception, context_for_log)
                # Для других причин пустого ответа (например, UNKNOWN, OTHER) - попробуем еще раз

        except Exception as e:
            last_exception = e
            logger_gemini.warning(f"Ошибка при запросе к Gemini ({context_for_log}), попытка {retry_count + 1}/{MAX_RETRIES}: {type(e).__name__} - {e}", exc_info=False) # exc_info=False чтобы не дублировать полный traceback от handle_gemini_error
            # Немедленный выход для критических ошибок аутентификации/доступа
            if isinstance(e, (genai.types.PermissionDeniedError, genai.types.UnauthenticatedError)): # type: ignore
                logger_gemini.critical(f"Критическая ошибка аутентификации/доступа к Gemini API ({context_for_log}). Прекращение попыток.")
                return handle_gemini_error(e, context_for_log)

        retry_count += 1
        if retry_count < MAX_RETRIES:
            logger_gemini.info(f"Ожидание {RETRY_DELAY} сек. перед следующей попыткой ({context_for_log})...")
            await asyncio.sleep(RETRY_DELAY) # Асинхронная задержка

    # Если все попытки исчерпаны
    final_error_message = f"Все {MAX_RETRIES} попытки запроса ({context_for_log}) к Gemini не удались."
    logger_gemini.error(final_error_message, exc_info=True if last_exception else False)
    # Используем last_exception, если оно было, или создаем общее
    error_to_handle = last_exception or ValueError("Не удалось получить ответ от Gemini после нескольких попыток (код: G-RETRY01).")
    return handle_gemini_error(error_to_handle, context_for_log)


async def analyze_clothing_image(image_data: bytes, occasion: str, preferences: str = None) -> str:
    """Анализирует одно изображение одежды с использованием Gemini AI."""
    context = "анализ одного изображения"
    logger_gemini.info(f"Начало {context}: повод '{occasion}', размер данных {len(image_data)/1024:.1f} KB.")
    
    if not API_CONFIGURED_SUCCESSFULLY:
        return handle_gemini_error(RuntimeError("API_NOT_CONFIGURED_ANALYZE_ID_G02"), context)

    # Проверка кэша (если включен и менеджер доступен)
    if CACHE_ENABLED and cache_manager:
        cached_result = cache_manager.get_from_cache(image_data, occasion, preferences)
        if cached_result:
            logger_gemini.info(f"Результат для {context} успешно извлечен из кэша.")
            return cached_result
    
    try:
        pil_image = Image.open(BytesIO(image_data))
        optimized_image_bytes = optimize_image(pil_image, quality=85, format='JPEG') # JPEG обычно предпочтительнее для Gemini Vision
    except ValueError as ve: # Ошибка от optimize_image
        logger_gemini.error(f"Ошибка оптимизации изображения для {context}: {ve}", exc_info=True)
        return str(ve) # Возвращаем сообщение об ошибке пользователю
    except Exception as e_opt: # Другие неожиданные ошибки оптимизации
        logger_gemini.error(f"Неожиданная ошибка оптимизации изображения для {context}: {e_opt}", exc_info=True)
        return "Внутренняя ошибка: не удалось подготовить изображение для анализа (код: G-OPT01)."

    # Создание промпта и частей запроса
    prompt = create_analysis_prompt(occasion, preferences)
    # Gemini Vision API ожидает данные изображения в определенном формате
    # mime_type должен соответствовать формату optimized_image_bytes
    parts = [prompt, {"mime_type": "image/jpeg", "data": optimized_image_bytes}] 
    
    response_text = await _send_to_gemini_with_retries(parts, context)

    # Сохранение в кэш (если успешно и не ошибка)
    if CACHE_ENABLED and cache_manager and not _is_error_message(response_text):
        try:
            cache_manager.save_to_cache(image_data, occasion, response_text, preferences) # Кэшируем по исходным байтам
            logger_gemini.info(f"Результат для {context} успешно сохранен в кэш.")
        except Exception as e_save_cache:
            logger_gemini.error(f"Ошибка при сохранении результата в кэш для {context}: {e_save_cache}", exc_info=True)
            
    return response_text


async def compare_clothing_images(image_data_list: list[bytes], occasion: str, preferences: str = None) -> str:
    """Сравнивает несколько изображений одежды с использованием Gemini AI."""
    context = "сравнение изображений"
    logger_gemini.info(f"Начало {context}: {len(image_data_list)} изображений, повод '{occasion}'.")

    if not API_CONFIGURED_SUCCESSFULLY:
        return handle_gemini_error(RuntimeError("API_NOT_CONFIGURED_COMPARE_ID_G03"), context)
    
    # Валидация количества изображений
    if not (2 <= len(image_data_list) <= 5): # Gemini может поддерживать больше, но для ТЗ пока так
        msg = f"Для сравнения необходимо от 2 до 5 изображений. Получено: {len(image_data_list)}."
        logger_gemini.warning(msg)
        return msg # Возвращаем сообщение об ошибке пользователю

    # Кэширование для сравнения изображений обычно сложнее и реже используется,
    # так как порядок и набор изображений важны. Пока не реализуем.
    # if CACHE_ENABLED and cache_manager: logger_gemini.debug(f"{context}: Кэширование для сравнения пока не используется.")

    processed_parts = [create_comparison_prompt(occasion, preferences)]
    for i, img_data_bytes in enumerate(image_data_list):
        logger_gemini.debug(f"Обработка изображения {i+1}/{len(image_data_list)} для {context} (размер: {len(img_data_bytes)/1024:.1f} KB).")
        try:
            pil_image = Image.open(BytesIO(img_data_bytes))
            optimized_bytes = optimize_image(pil_image, quality=85, format='JPEG')
            # Для многомодальных запросов с несколькими изображениями, каждое изображение - это отдельная часть
            processed_parts.append({"mime_type": "image/jpeg", "data": optimized_bytes})
        except ValueError as ve: # Ошибка от optimize_image
            logger_gemini.error(f"Ошибка оптимизации изображения {i+1} для {context}: {ve}", exc_info=True)
            return str(ve)
        except Exception as e_opt:
            logger_gemini.error(f"Неожиданная ошибка оптимизации изображения {i+1} для {context}: {e_opt}", exc_info=True)
            return f"Внутренняя ошибка: не удалось подготовить изображение {i+1} для сравнения (код: G-OPT02)."
            
    return await _send_to_gemini_with_retries(processed_parts, context)

def _is_error_message(text: str) -> bool:
    """Вспомогательная функция для проверки, является ли текстовый ответ сообщением об ошибке."""
    if not text: return True # Пустой ответ считаем ошибкой для целей некэширования
    # Ключевые слова, указывающие на ошибку (можно расширить)
    error_keywords = [
        "ошибка", "не найден", "не поддерживается", "слишком большой", "не ответил",
        "недоступен", "политики безопасности", "проблема с сетевым", "внутренняя ошибка",
        "(код: g-", "не удалось", "аутентификации", "лимит запросов", "заблокирован",
        "api_not_configured" # из наших RuntimeErrors
    ]
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in error_keywords)


async def analyze_clothing_file(file_path: str, occasion: str, preferences: str = None) -> str:
    """
    Читает изображение из файла и анализирует его.
    Это обертка над analyze_clothing_image для удобства работы с файлами на диске (например, в боте).
    """
    context = "анализ файла"
    logger_gemini.info(f"Начало {context}: файл '{file_path}', повод '{occasion}'.")
    
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        err_msg = f"Файл не найден по указанному пути: {file_path}"
        logger_gemini.error(err_msg)
        return f"Ошибка: {err_msg}"
    
    try:
        with open(file_path, "rb") as image_file:
            image_data = image_file.read()
        if not image_data:
            err_msg = f"Файл '{file_path}' пустой."
            logger_gemini.error(err_msg)
            return f"Ошибка: {err_msg}"
    except Exception as e:
        logger_gemini.error(f"Ошибка при чтении файла '{file_path}': {e}", exc_info=True)
        return f"Ошибка при чтении файла. Подробности: {str(e)}"
        
    return await analyze_clothing_image(image_data, occasion, preferences)


# Тестовый блок для проверки работоспособности модуля
if __name__ == "__main__":
    # Устанавливаем более детальный уровень логирования для тестов
    if logger_gemini.level > logging.DEBUG: # Если текущий уровень выше DEBUG
      for handler in logger_gemini.handlers or logging.getLogger().handlers: # Проверяем и корневой логгер
          handler.setLevel(logging.DEBUG)
      logger_gemini.setLevel(logging.DEBUG)
      logger_gemini.info("Уровень логирования для теста установлен в DEBUG.")


    async def main_test():
        print(f"\n======================================================================")
        print(f" Тестирование модуля Gemini AI для проекта МИШУРА (v{getattr(gemini_ai, '__version__', '0.3.1.4')}) ")
        print(f" Кэш: {'ВКЛЮЧЕН' if CACHE_ENABLED and cache_manager else 'ОТКЛЮЧЕН'}")
        print(f"======================================================================\n")

        if not API_CONFIGURED_SUCCESSFULLY:
            print("❌ КРИТИЧЕСКАЯ ОШИБКА: Gemini API не был сконфигурирован. Тестирование невозможно.\n   Проверьте наличие и правильность GEMINI_API_KEY в .env файле.")
            return

        print("1. Проверка соединения с Gemini API...")
        connected, msg = await test_gemini_connection()
        print(f"   Результат: {'✅ УСПЕШНО' if connected else '❌ ОШИБКА'} - {msg}\n")
        if not connected:
            return

        # --- Вспомогательная функция для генерации тестовых изображений ---
        # (кэширование в памяти, чтобы не генерировать одно и то же изображение много раз)
        _test_image_cache = {}
        def get_test_image_bytes(
            image_id: str, text_on_img: str, rgb_color: tuple = (100, 100, 200),
            size: tuple = (400, 500), quality: int = 75, img_format: str = 'JPEG'
        ) -> bytes:
            cache_key = f"{image_id}_{rgb_color}_{size}_{quality}_{img_format}"
            if cache_key in _test_image_cache:
                logger_gemini.debug(f"Использование кэшированного тестового изображения: {cache_key}")
                return _test_image_cache[cache_key]

            logger_gemini.debug(f"Генерация тестового изображения: id='{image_id}', текст='{text_on_img}'")
            img = Image.new('RGB', size, color=rgb_color)
            draw = ImageDraw.Draw(img)
            try:
                # Простой способ добавить текст без зависимости от наличия шрифтов .ttf
                # Для лучшего вида можно было бы загрузить ImageFont.truetype, но это усложнит тест
                text_lines = text_on_img.split('\n')
                current_h = size[1] * 0.3
                for line in text_lines:
                    # text_width, text_height = draw.textsize(line) # Устарело
                    bbox = draw.textbbox((0,0), line) # x0,y0,x1,y1
                    text_width = bbox[2] - bbox[0]
                    # text_height = bbox[3] - bbox[1] # не используется для позиционирования здесь
                    
                    x = (size[0] - text_width) / 2
                    draw.text((x, current_h), line, fill=(255,255,255) if sum(rgb_color) < 384 else (0,0,0)) # Белый или черный текст
                    current_h += 30 # Примерный межстрочный интервал
            except Exception as font_e:
                logger_gemini.warning(f"Ошибка при добавлении текста на тестовое изображение '{image_id}': {font_e}. Текст может отсутствовать.")

            # Оптимизируем тестовое изображение так же, как и пользовательские
            try:
                img_bytes = optimize_image(img, max_size=max(size), quality=quality, format=img_format)
                _test_image_cache[cache_key] = img_bytes
                logger_gemini.debug(f"Тестовое изображение '{image_id}' сгенерировано и оптимизировано, {len(img_bytes)/1024:.1f} KB.")
                return img_bytes
            except ValueError as ve:
                logger_gemini.error(f"Ошибка оптимизации тестового изображения '{image_id}': {ve}")
                return b'' # Возвращаем пустые байты в случае ошибки


        # --- Тест 1: Анализ одного изображения ---
        print("\n--- Тест 1: Анализ одного изображения (Синяя Футболка) ---")
        blue_shirt_bytes = get_test_image_bytes("blue_shirt", "Синяя\nФутболка", rgb_color=(50, 80, 180))
        if blue_shirt_bytes:
            advice_single = await analyze_clothing_image(
                blue_shirt_bytes,
                occasion="прогулка в парке",
                preferences="люблю комфорт, пастельные тона"
            )
            print("\nОтвет Мишуры (одиночный анализ):\n------------------------------------")
            print(advice_single)
            print("------------------------------------\n")
        else:
            print("❌ Не удалось сгенерировать тестовое изображение для одиночного анализа.")

        # --- Тест 2: Сравнение двух изображений ---
        print("\n--- Тест 2: Сравнение (Зеленые Шорты vs Красная Юбка) ---")
        green_shorts_bytes = get_test_image_bytes("green_shorts", "Зеленые\nШорты", rgb_color=(80, 150, 50))
        red_skirt_bytes = get_test_image_bytes("red_skirt", "Красная\nЮбка", rgb_color=(200, 40, 40))
        
        if green_shorts_bytes and red_skirt_bytes:
            advice_compare = await compare_clothing_images(
                [green_shorts_bytes, red_skirt_bytes],
                occasion="летний пикник",
                preferences="удобство и яркие цвета"
            )
            print("\nОтвет Мишуры (сравнение):\n---------------------------")
            print(advice_compare)
            print("---------------------------\n")
        else:
             print("❌ Не удалось сгенерировать одно или несколько тестовых изображений для сравнения.")

        # --- Тест 3: Ошибка - слишком много изображений для сравнения ---
        print("\n--- Тест 3: Ошибка - сравнение слишком большого количества изображений ---")
        images_for_fail_test = [
            get_test_image_bytes(f"img{i}", f"Image {i+1}", rgb_color=(i*30, 100, 200-i*20)) for i in range(6)
        ]
        if all(images_for_fail_test): # Убедимся, что все изображения сгенерированы
            advice_too_many = await compare_clothing_images(
                images_for_fail_test,
                occasion="любой",
            )
            print("\nОтвет Мишуры (слишком много изображений):\n--------------------------------------")
            print(advice_too_many)
            print("--------------------------------------\n")
            if "от 2 до 5 изображений" in advice_too_many:
                print("✅ Тест на обработку ошибки количества изображений пройден.")
            else:
                print("⚠️ Тест на обработку ошибки количества изображений НЕ пройден корректно.")
        else:
            print("❌ Не удалось сгенерировать тестовые изображения для теста на большое количество.")

        # --- Тест 4: Использование кэша (повторный одиночный анализ) ---
        if CACHE_ENABLED and cache_manager and blue_shirt_bytes:
            print("\n--- Тест 4: Проверка кэширования (повторный анализ Синей Футболки) ---")
            # Очищаем логи, чтобы было видно только логи второго вызова
            # (Это не идеальный способ, но для простого теста пойдет)
            # print("\n(Ожидайте меньше логов от Gemini, если кэш работает)\n")
            start_time = time.time()
            advice_single_cached = await analyze_clothing_image(
                blue_shirt_bytes, # То же изображение
                occasion="прогулка в парке", # Те же параметры
                preferences="люблю комфорт, пастельные тона"
            )
            end_time = time.time()
            print(f"   Время выполнения повторного анализа: {end_time - start_time:.4f} сек.")
            if advice_single_cached == advice_single:
                print("✅ Ответ из кэша совпадает с оригинальным.")
            else:
                print("❌ ОШИБКА КЭША: Ответ из кэша НЕ совпадает с оригинальным!")
            # В логах должно быть сообщение "Результат ... успешно извлечен из кэша."
            # Чтобы это увидеть, нужно будет анализировать логи stdout/stderr, а не только print.
        else:
            print("\n--- Тест 4: Кэширование ОТКЛЮЧЕНО или изображение не было сгенерировано, тест пропущен ---")
            
        print("\n======================================================================")
        print(" Тестирование модуля Gemini AI завершено.")
        print("======================================================================\n")

    # Запуск асинхронной функции main_test
    try:
        asyncio.run(main_test())
    except Exception as e_main_test:
        print(f"❌ КРИТИЧЕСКАЯ ОШИБКА во время выполнения main_test(): {e_main_test}")
        import traceback
        traceback.print_exc()

# Для информации о версии модуля, если потребуется
__version__ = "0.3.1.4"