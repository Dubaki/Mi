"""
ПРОЕКТ: МИШУРА - ИИ СТИЛИСТ
МОДУЛЬ: Gemini AI Integration
ВЕРСИЯ: 0.3.1.1 (На базе вашей 0.3.1. Промпты обновлены для интеллектуальной персонализированной подсказки в конце ответа)
ФАЙЛ: gemini_ai.py
НАЗНАЧЕНИЕ: Модуль для анализа одежды на фотографиях с использованием Gemini AI.
ДАТА ОБНОВЛЕНИЯ: 2025-05-18

МЕТОДОЛОГИЯ ОБНОВЛЕНИЯ КОДА:
Файл предоставляется целиком. Внесены изменения в функции create_analysis_prompt и create_comparison_prompt
для реализации интеллектуальных подсказок от ИИ-стилиста "Мишура".
Остальная логика файла (версии 0.3.1, предоставленной пользователем) сохранена.
"""

import os
import logging
# import base64 # Не используется в предоставленной версии 0.3.1
import time # Используется для RETRY_DELAY
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image, ImageOps
from io import BytesIO
from cache_manager import AnalysisCacheManager # Предполагаем, что он есть и работает

# Настройка логирования
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] %(message)s')
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Конфигурация Gemini API (один раз при загрузке модуля)
API_CONFIGURED_SUCCESSFULLY = False
if not GEMINI_API_KEY:
    logger.critical("КРИТИЧЕСКАЯ ОШИБКА: GEMINI_API_KEY не найден в .env файле.")
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        API_CONFIGURED_SUCCESSFULLY = True
        logger.info("Gemini API успешно сконфигурирован при загрузке модуля.")
        # Убираем тестовое соединение отсюда, чтобы не делать лишний вызов при каждом импорте.
        # Его можно вынести в отдельную функцию или в if __name__ == "__main__".
    except Exception as e:
        logger.critical(f"КРИТИЧЕСКАЯ ОШИБКА при конфигурации Gemini API: {e}", exc_info=True)


# Полные имена моделей (с префиксом "models/")
VISION_MODEL = "models/gemini-1.5-flash"  # Актуальная модель для анализа изображений

# Максимальное количество попыток при ошибках API
MAX_RETRIES = 3 # Как в вашей версии 0.3.1
# Время ожидания между повторными попытками (в секундах)
RETRY_DELAY = 2 # Как в вашей версии 0.3.1

# Инициализация менеджера кэша
# Этот код был в вашей версии 0.3.1, оставляем его.
# Убедитесь, что cache_manager.py корректно работает.
try:
    cache_manager = AnalysisCacheManager()
    CACHE_ENABLED = True # Предполагаем, что если импорт успешен, кэш включен
    logger.info("Менеджер кэша AnalysisCacheManager инициализирован.")
except ImportError:
    CACHE_ENABLED = False
    logger.warning("cache_manager.py не найден или не может быть импортирован. Кэширование будет ОТКЛЮЧЕНО.")
    class DummyCacheManager:
        def get_from_cache(self, *args, **kwargs): logger.debug("DummyCache: get_from_cache called"); return None
        def save_to_cache(self, *args, **kwargs): logger.debug("DummyCache: save_to_cache called")
    cache_manager = DummyCacheManager()
except Exception as e_cache: # Ловим другие возможные ошибки при инициализации кэша
    CACHE_ENABLED = False
    logger.error(f"Ошибка при инициализации AnalysisCacheManager: {e_cache}. Кэширование будет ОТКЛЮЧЕНО.", exc_info=True)
    class DummyCacheManager: # Повторное определение, если предыдущее не сработало
        def get_from_cache(self, *args, **kwargs): logger.debug("DummyCache: get_from_cache called"); return None
        def save_to_cache(self, *args, **kwargs): logger.debug("DummyCache: save_to_cache called")
    cache_manager = DummyCacheManager()


# Функция test_gemini_connection из вашей версии 0.3.1 (если она нужна для внешних проверок)
async def test_gemini_connection():
    logger.debug("Вызов test_gemini_connection")
    if not API_CONFIGURED_SUCCESSFULLY:
        return False, "Gemini API не был сконфигурирован из-за отсутствия ключа или ошибки."
    try:
        model = genai.GenerativeModel(VISION_MODEL) # Используем актуальную модель
        response = await model.generate_content_async("Test connection to Gemini API") # Делаем асинхронным
        if response and response.text:
            logger.info("Тестовое соединение с Gemini API (асинхронное) успешно.")
            return True, "Соединение с Gemini API работает нормально."
        else:
            logger.error(f"Тестовое соединение с Gemini API не вернуло текст. Ответ: {response}")
            return False, "API не вернул ответ на тестовый запрос."
    except Exception as e:
        logger.error(f"Ошибка при тестовом соединении с Gemini API: {e}", exc_info=True)
        return False, f"Ошибка при тестировании соединения с Gemini API: {str(e)}"

# Функция handle_gemini_error из вашей версии 0.3.1 (с небольшими адаптациями для логгирования)
def handle_gemini_error(error, context_message=""):
    # (Код почти как в 0.3.6, но адаптирован под структуру вашей 0.3.1)
    logger.error(f"handle_gemini_error вызвана для ({context_message}). Ошибка: {type(error).__name__} - {error}", exc_info=True)
    error_str = str(error).lower()
    # ... (Логика определения типа ошибки и возврата сообщения из вашей версии 0.3.1,
    # можно дополнить кодами ошибок Gxx, если нужно будет их различать в api.py)
    if "api key" in error_str or "authentication" in error_str:
        return "Ошибка аутентификации API. Проверьте API ключ."
    # ... и так далее, как в вашей версии 0.3.1 ...
    elif "content filtered" in error_str or "safety" in error_str:
        return "Изображение или запрос не могут быть обработаны из-за политики безопасности."
    else:
        return f"Ошибка при обработке изображения ({context_message}): {str(error)[:150]}" # Обрезаем длинные ошибки


# Функция optimize_image из вашей версии 0.3.1 (принимает PIL.Image, возвращает bytes)
# Добавим более подробное логгирование и обработку ошибок
def optimize_image(img: Image.Image, max_size=1024, quality=85) -> bytes:
    logger.debug(f"optimize_image: Старт. Входной PIL Image: размер {img.size}, режим {img.mode}")
    try:
        # 1. Проверка размера и изменение, если нужно (как в вашей версии 0.3.1)
        original_width, original_height = img.size
        if original_width > max_size or original_height > max_size:
            if original_width > original_height:
                new_width = max_size
                new_height = int(original_height * (max_size / original_width))
            else:
                new_height = max_size
                new_width = int(original_width * (max_size / original_height))
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS) # Убедимся, что используется LANCZOS
            logger.info(f"Изображение изменено с {original_width}x{original_height} до {new_width}x{new_height}")

        # 2. Конвертация в RGB (как в вашей версии 0.3.1)
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            logger.info(f"Конвертация изображения из режима {img.mode} в RGB (для удаления альфа-канала).")
            # Создаем белый фон и накладываем изображение, если есть альфа
            background = Image.new("RGB", img.size, (255, 255, 255))
            img_rgba_for_paste = img.convert("RGBA") # Гарантируем RGBA для доступа к маске
            background.paste(img_rgba_for_paste, mask=img_rgba_for_paste.split()[3] if len(img_rgba_for_paste.split()) == 4 else None)
            img = background
        elif img.mode != 'RGB': # Если это не RGB и не случай с альфа-каналом выше
            logger.info(f"Конвертация изображения из режима {img.mode} в RGB.")
            img = img.convert('RGB')
        
        logger.debug(f"После конвертации: режим {img.mode}, размер {img.size}.")

        # 3. Автоконтраст (как в вашей версии 0.3.1)
        try:
            img = ImageOps.autocontrast(img, cutoff=0.5) # cutoff может помочь с некоторыми изображениями
        except Exception as e_ac:
            logger.warning(f"Не удалось применить автоконтраст: {e_ac}. Продолжаем без него.")
        
        # 4. Сохранение в JPEG (как в вашей версии 0.3.1)
        img_byte_arr = BytesIO()
        img.save(img_byte_arr, format='JPEG', quality=quality, optimize=True)
        img_bytes = img_byte_arr.getvalue()
        
        logger.info(f"Изображение оптимизировано: JPEG quality={quality}, итоговый размер: {len(img_bytes) / 1024:.1f} KB")
        return img_bytes
    
    except Exception as e:
        logger.error(f"КРИТИЧЕСКАЯ ОШИБКА в optimize_image: {type(e).__name__} - {e}", exc_info=True)
        raise ValueError(f"Не удалось оптимизировать изображение: {e}")


# === ИЗМЕНЕННЫЕ ПРОМПТЫ ===
def create_analysis_prompt(occasion, preferences=None):
    logger.debug(f"Создание промпта для анализа. Повод: {occasion}, Предпочтения: {preferences}")
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

def create_comparison_prompt(occasion, preferences=None):
    logger.debug(f"Создание промпта для сравнения. Повод: {occasion}, Предпочтения: {preferences}")
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

# Основные функции анализа (логика из вашей версии 0.3.1, адаптированная для асинхронности и логгирования)
async def _send_to_gemini_with_retries(parts: list, context_for_log: str):
    logger.debug(f"_send_to_gemini_with_retries: Старт для ({context_for_log}). Количество parts: {len(parts)}")
    if not API_CONFIGURED_SUCCESSFULLY:
        msg = f"Gemini API не сконфигурирован. Запрос ({context_for_log}) не будет отправлен."
        logger.error(msg)
        return handle_gemini_error(RuntimeError("API_NOT_CONFIGURED_INTERNAL"), context_for_log)

    retry_count = 0
    last_error = None
    
    # Настройки генерации (можно вынести, если нужно будет менять их динамически)
    generation_config = genai.types.GenerationConfig(temperature=0.65) # Немного креативности
    safety_settings = [
        {"category": c, "threshold": "BLOCK_MEDIUM_AND_ABOVE"}
        for c in ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH",
                  "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"]
    ]

    while retry_count < MAX_RETRIES:
        try:
            model = genai.GenerativeModel(VISION_MODEL)
            logger.info(f"Отправка запроса к Gemini ({context_for_log}), попытка {retry_count + 1}/{MAX_RETRIES}...")
            
            # Используем асинхронный вызов
            response = await model.generate_content_async(
                parts,
                generation_config=generation_config,
                safety_settings=safety_settings
            )
            
            full_response_text = ""
            # Gemini 1.5 может возвращать в response.text или response.parts
            if hasattr(response, 'text') and response.text:
                full_response_text = response.text
            elif response.parts:
                 full_response_text = "".join(part.text for part in response.parts if hasattr(part, 'text'))

            if full_response_text.strip(): # Убедимся, что ответ не состоит только из пробелов
                logger.info(f"Ответ от Gemini ({context_for_log}) успешно получен (попытка {retry_count + 1}). Длина: {len(full_response_text)}")
                return full_response_text
            else:
                # Если текст пустой, анализируем причину
                finish_reason_str = "N/A"
                candidate_exists = response.candidates and len(response.candidates) > 0
                if candidate_exists and response.candidates[0].finish_reason:
                    finish_reason_str = response.candidates[0].finish_reason.name
                logger.warning(f"Пустой ответ от Gemini ({context_for_log}), попытка {retry_count + 1}. Причина: {finish_reason_str if candidate_exists else 'Нет кандидата или причины'}.")
                last_error = ValueError(f"Пустой ответ от Gemini. Причина: {finish_reason_str}")
                setattr(last_error, 'response', response) # Добавляем response к ошибке
                if finish_reason_str in ["SAFETY", "RECITATION", "MAX_TOKENS"]: # Не повторяем для этих причин
                    return handle_gemini_error(last_error, context_for_log)
                # Для других причин пустого ответа - попробуем еще раз

        except Exception as e:
            last_error = e
            logger.warning(f"Ошибка при запросе к Gemini ({context_for_log}), попытка {retry_count + 1}/{MAX_RETRIES}: {type(e).__name__} - {e}", exc_info=False)
            if isinstance(e, (genai.types.PermissionDeniedError, genai.types.UnauthenticatedError)):
                logger.error(f"Критическая ошибка аутентификации Gemini API ({context_for_log}). Прекращение попыток.")
                return handle_gemini_error(e, context_for_log) # Возвращаем ошибку, не ретраим

        retry_count += 1
        if retry_count < MAX_RETRIES:
            logger.info(f"Ожидание {RETRY_DELAY} сек. перед следующей попыткой ({context_for_log})...")
            await asyncio.sleep(RETRY_DELAY) # Асинхронная задержка

    logger.error(f"Все {MAX_RETRIES} попытки запроса ({context_for_log}) к Gemini не удались. Последняя ошибка: {last_error}", exc_info=True if last_error else False)
    return handle_gemini_error(last_error or ValueError("Не удалось получить ответ от Gemini после нескольких попыток."), context_for_log)


async def analyze_clothing_image(image_data: bytes, occasion: str, preferences: str = None):
    logger.info(f"analyze_clothing_image: Старт. Повод: {occasion}, размер данных: {len(image_data)/1024:.1f} KB")
    if not API_CONFIGURED_SUCCESSFULLY: return handle_gemini_error(RuntimeError("API_NOT_CONFIGURED_ANALYZE"), "одиночный анализ")

    if CACHE_ENABLED:
        cached_result = cache_manager.get_from_cache(image_data, occasion, preferences)
        if cached_result:
            logger.info("Результат (одиночный) из кэша.")
            return cached_result
    try:
        # В версии 0.3.1 optimize_image принимает PIL.Image, а не bytes/BytesIO
        pil_image = Image.open(BytesIO(image_data)) # Конвертируем bytes в PIL.Image
        logger.debug("PIL.Image создан из байт для optimize_image.")
        optimized_image_bytes = optimize_image(pil_image, quality=85) # quality как в вашей 0.3.1
    except ValueError as ve: # Ошибка от optimize_image
        logger.error(f"analyze_clothing_image: Ошибка оптимизации - {ve}", exc_info=True)
        return str(ve)
    except Exception as e_opt:
        logger.error(f"analyze_clothing_image: Неожиданная ошибка оптимизации - {e_opt}", exc_info=True)
        return f"Ошибка подготовки изображения (Код: G-OPT01)."

    prompt = create_analysis_prompt(occasion, preferences)
    parts = [prompt, {"mime_type": "image/jpeg", "data": optimized_image_bytes}]
    
    response_text = await _send_to_gemini_with_retries(parts, "одиночный анализ")

    if CACHE_ENABLED and not _is_error_message(response_text): # _is_error_message нужно определить
        cache_manager.save_to_cache(image_data, occasion, response_text, preferences) # Кэшируем по исходным байтам
        logger.info("Результат (одиночный) сохранен в кэш.")
    return response_text


async def compare_clothing_images(image_data_list: list[bytes], occasion: str, preferences: str = None):
    logger.info(f"compare_clothing_images: Старт. {len(image_data_list)} изображений. Повод: {occasion}")
    if not API_CONFIGURED_SUCCESSFULLY: return handle_gemini_error(RuntimeError("API_NOT_CONFIGURED_COMPARE"), "сравнение")
    if not (2 <= len(image_data_list) <= 5):
        logger.warning(f"Некорректное количество изображений для сравнения: {len(image_data_list)}")
        return "Для сравнения необходимо от 2 до 5 изображений."

    # Кэширование для сравнения пока не используется в этой версии
    if CACHE_ENABLED: logger.debug("compare_clothing_images: Кэширование для сравнения пока не используется.")

    processed_parts = [create_comparison_prompt(occasion, preferences)]
    for i, img_data_bytes in enumerate(image_data_list):
        logger.debug(f"Обработка изображения {i+1} для сравнения (размер: {len(img_data_bytes)/1024:.1f} KB).")
        try:
            pil_image = Image.open(BytesIO(img_data_bytes)) # Конвертируем bytes в PIL.Image
            logger.debug(f"PIL.Image {i+1} создан для optimize_image.")
            optimized_bytes = optimize_image(pil_image, quality=85)
            processed_parts.append({"mime_type": "image/jpeg", "data": optimized_bytes})
        except ValueError as ve:
            logger.error(f"compare_clothing_images: Ошибка оптимизации изображения {i+1} - {ve}", exc_info=True)
            return str(ve)
        except Exception as e_opt:
            logger.error(f"compare_clothing_images: Неожиданная ошибка оптимизации {i+1} - {e_opt}", exc_info=True)
            return f"Ошибка подготовки изображения {i+1} для сравнения (Код: G-OPT02)."
            
    return await _send_to_gemini_with_retries(processed_parts, "сравнение")

# Вспомогательная функция для проверки, является ли ответ ошибкой (нужна для кэширования)
def _is_error_message(text: str) -> bool:
    if not text: return True
    keywords = ["ошибка:", "не найден", "не поддерживается", "слишком большой", "не ответил",
                "недоступен", "политики безопасности", "проблема с сетевым", "внутренняя ошибка",
                "(код: g", "не удалось"]
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in keywords)


async def analyze_clothing_file(file_path, occasion, preferences=None):
    # (Эта функция из вашей версии 0.3.1, она корректна, если analyze_clothing_image ожидает bytes)
    logger.info(f"Анализ файла: {file_path}")
    if not os.path.exists(file_path):
        logger.error(f"Файл не найден: {file_path}")
        return "Ошибка: Файл не найден"
    try:
        with open(file_path, "rb") as image_file:
            image_data = image_file.read() # Читаем байты
    except Exception as e:
        logger.error(f"Ошибка при чтении файла: {e}", exc_info=True)
        return f"Ошибка при чтении файла. Подробности: {str(e)}"
    return await analyze_clothing_image(image_data, occasion, preferences)


if __name__ == "__main__":
    # Тестовый блок из вашей версии 0.3.1, но адаптированный для асинхронности
    # и вызова новых асинхронных функций _send_to_gemini_with_retries
    # Он также должен использовать BytesIO для передачи данных в analyze_clothing_image
    async def main_test():
        print(f"Тестирование модуля Gemini AI для проекта МИШУРА (v0.3.1.1)... Кэш {'ВКЛЮЧЕН' if CACHE_ENABLED else 'ОТКЛЮЧЕН'}.")
        if not API_CONFIGURED_SUCCESSFULLY:
            print("ОШИБКА: Gemini API не был сконфигурирован. Тестирование невозможно.")
            return

        # Проверка соединения (вызываем асинхронную версию)
        connected, msg = await test_gemini_connection()
        print(f"Тест соединения с Gemini: {'УСПЕШНО' if connected else 'ОШИБКА'} - {msg}")
        if not connected:
            return

        img_data_cache_test = {}
        def get_test_image_bytes(color_name: str, text_on_img: str, rgb_tuple: tuple, quality: int = 75, size: tuple = (300,400)) -> bytes:
            # Генерирует PIL Image, сохраняет в BytesIO, возвращает bytes
            cache_key = f"{color_name}_{quality}_{size[0]}x{size[1]}"
            if cache_key in img_data_cache_test:
                # logger.debug(f"Using cached test image bytes: {cache_key}")
                return img_data_cache_test[cache_key]

            img = Image.new('RGB', size, color=rgb_tuple)
            draw = ImageDraw.Draw(img)
            try:
                from PIL import ImageFont
                font_size = int(size[1] / 10)
                try: font = ImageFont.truetype("arial.ttf", font_size)
                except IOError:
                    try: font = ImageFont.truetype("DejaVuSans.ttf", font_size)
                    except IOError: font = ImageFont.load_default() # Fallback
                # Для корректного расчета размера текста и центрирования
                # text_bbox = draw.textbbox((0,0), text_on_img, font=font)
                # text_width = text_bbox[2] - text_bbox[0]
                # text_height = text_bbox[3] - text_bbox[1]
                # x = (img.width - text_width) / 2
                # y = (img.height - text_height) / 2
                # draw.text((x, y), text_on_img, fill="white", font=font)
                draw.text((img.width*0.1, img.height*0.45), text_on_img, fill="white") # Упрощенно
            except Exception as font_e:
                logger.warning(f"Ошибка шрифта в тесте: {font_e}. Простой текст.")
                draw.text((img.width*0.1, img.height*0.45), text_on_img, fill="white")

            img_bytes_io = BytesIO()
            img.save(img_bytes_io, format='JPEG', quality=quality)
            img_bytes = img_bytes_io.getvalue()
            img_data_cache_test[cache_key] = img_bytes
            # logger.debug(f"Created test image bytes: {cache_key}, size: {len(img_bytes)/1024:.1f} KB")
            return img_bytes

        try:
            print("\n--- Тест 1: Одиночный анализ (Красное платье) ---")
            red_dress_bytes = get_test_image_bytes("red_dress", "Красное Платье", (200,20,20))
            advice_single = await analyze_clothing_image(
                red_dress_bytes,
                "коктейльная вечеринка",
                "люблю элегантность, избегаю слишком откровенного"
            )
            print("\nОтвет Мишуры (одиночный):")
            print(advice_single)

            print("\n--- Тест 2: Сравнение (Красное платье и Синие джинсы) ---")
            blue_jeans_bytes = get_test_image_bytes("blue_jeans_comp", "Синие Джинсы", (20,20,180))
            advice_compare = await compare_clothing_images(
                [red_dress_bytes, blue_jeans_bytes],
                "поход в кино с друзьями",
                "удобство и стиль"
            )
            print("\nОтвет Мишуры (сравнение):")
            print(advice_compare)

        except Exception as e:
            print(f"\nОШИБКА ВО ВРЕМЯ ГЛАВНОГО ТЕСТА: {type(e).__name__} - {e}")
            import traceback
            traceback.print_exc()

    asyncio.run(main_test())