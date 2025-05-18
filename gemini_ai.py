"""
ПРОЕКТ: МИШУРА - ИИ СТИЛИСТ
МОДУЛЬ: Gemini AI Integration
ВЕРСИЯ: 0.3.3 (Промпты улучшены для краткости и интеллектуальной персонализированной подсказки в конце ответа)
ФАЙЛ: gemini_ai.py
НАЗНАЧЕНИЕ: Модуль для анализа одежды на фотографиях с использованием Gemini AI.
ДАТА ОБНОВЛЕНИЯ: 2025-05-18

МЕТОДОЛОГИЯ ОБНОВЛЕНИЯ КОДА:
Файл предоставляется целиком. Изменения направлены на улучшение промптов для Gemini AI.
ИИ-стилист "Мишура" теперь всегда будет давать основной совет, но также, если это целесообразно
на основе анализа входных данных (качество фото, полнота информации), будет предлагать
в конце своего ответа персонализированную подсказку о том, какую дополнительную информацию
пользователь мог бы предоставить при следующем запросе для получения еще более качественного
и индивидуального совета.
"""

import os
import logging
import asyncio # Добавлен для асинхронных операций
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageOps # ImageDraw добавлен для тестов
from io import BytesIO
# Предполагается, что cache_manager.py находится в том же каталоге или доступен через PYTHONPATH
# Если cache_manager.py нет, закомментируйте следующие две строки и код, связанный с кэшем.
from cache_manager import AnalysisCacheManager
cache_manager = AnalysisCacheManager()

# Настройка логирования
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    logger.error("Критическая ошибка: GEMINI_API_KEY не найден в .env файле. Функциональность Gemini AI будет недоступна.")
else:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini API успешно настроен.")
    except Exception as e:
        logger.error(f"Ошибка при первоначальной конфигурации Gemini API: {e}")

# Модели Gemini
VISION_MODEL = "models/gemini-1.5-flash"

# Параметры API
MAX_RETRIES = 3
RETRY_DELAY = 5

def handle_gemini_error(error):
    """Преобразует технические ошибки API в понятные сообщения."""
    error_str = str(error).lower()
    # (Логика из предыдущей версии сохраняется)
    if "api key" in error_str or "authentication" in error_str or "auth" in error_str:
        return "Произошла ошибка с доступом к сервису анализа (ошибка аутентификации). Пожалуйста, сообщите администратору."
    elif "rate limit" in error_str or "quota" in error_str:
        return "В данный момент сервис анализа перегружен (превышен лимит запросов). Пожалуйста, попробуйте немного позже."
    elif "invalid image" in error_str or "unsupported format" in error_str:
        return "Формат загруженного изображения не поддерживается. Пожалуйста, используйте JPG или PNG."
    elif "image_corrupted" in error_str or "cannot identify image file" in error_str: # Добавлено
        return "Загруженное изображение повреждено или не является изображением. Пожалуйста, проверьте файл."
    elif "too large" in error_str or "size limit" in error_str:
        return "Загруженное изображение слишком большое. Пожалуйста, выберите файл меньшего размера."
    elif "timeout" in error_str or "deadline exceeded" in error_str:
        return "Сервис анализа не ответил вовремя. Возможно, временные неполадки. Попробуйте позже или с другим фото."
    elif "service unavailable" in error_str or "server error" in error_str:
        return "Сервис анализа временно недоступен. Мы уже работаем над этим. Пожалуйста, попробуйте позже."
    elif "content filtered" in error_str or "safety" in error_str or "finish_reason: SAFETY" in str(error): # Уточнено
        return "Изображение или запрос не могут быть обработаны из-за политики безопасности сервиса. Пожалуйста, загрузите другое фото или измените текст запроса."
    elif "network" in error_str or "connection" in error_str:
        return "Проблема с сетевым подключением при обращении к сервису анализа. Проверьте ваше интернет-соединение."
    elif "finish_reason: MAX_TOKENS" in str(error): # Добавлено
        return "Ответ получился слишком длинным и был обрезан. Мы работаем над улучшением краткости."
    else:
        logger.error(f"Необработанная ошибка Gemini API: {error}", exc_info=True)
        return f"При обработке вашего запроса произошла внутренняя ошибка. Мы уже разбираемся. Попробуйте позже. (Код: G01)"


def optimize_image(img_bytes_io: BytesIO, max_size=1024, quality=85):
    """Оптимизирует изображение: изменяет размер, конвертирует в RGB, сжимает."""
    try:
        img_bytes_io.seek(0) # Гарантируем чтение с начала
        img = Image.open(img_bytes_io)
        original_format = img.format
        logger.info(f"Оптимизация изображения: начальный размер {img.size}, формат {original_format}, режим {img.mode}")

        if img.mode not in ['RGB', 'L']: # L - для черно-белых
            if img.mode == 'RGBA' or img.mode == 'LA' or (img.mode == 'P' and 'transparency' in img.info):
                logger.info(f"Конвертация изображения из режима {img.mode} в RGB для удаления альфа-канала.")
                img = img.convert('RGB')
            elif img.mode == 'P': # Палитровые изображения без явной прозрачности
                 logger.info(f"Конвертация палитрового изображения (режим {img.mode}) в RGB.")
                 img = img.convert('RGB')
            else: # Другие режимы, например CMYK, которые могут быть нежелательны
                logger.warning(f"Изображение в режиме {img.mode}. Принудительная конвертация в RGB.")
                img = img.convert('RGB')

        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            logger.info(f"Изображение изменено до размера {img.size}")

        try: # ImageOps может иногда вызывать ошибки на специфичных файлах
            img = ImageOps.autocontrast(img, cutoff=0.5) # Добавил cutoff для более мягкой автоконтрастности
        except Exception as e_ops:
            logger.warning(f"Не удалось применить автоконтраст: {e_ops}. Продолжаем без него.")


        optimized_buffer = BytesIO()
        img.save(optimized_buffer, format='JPEG', quality=quality, optimize=True)
        optimized_bytes = optimized_buffer.getvalue()
        
        logger.info(f"Изображение оптимизировано: итоговый размер файла {len(optimized_bytes) / 1024:.1f} KB")
        return optimized_bytes
    except Exception as e:
        logger.error(f"Критическая ошибка при оптимизации изображения: {e}", exc_info=True)
        # В случае серьезной ошибки оптимизации, лучше вернуть ошибку, чем пытаться отправить "сырые" данные
        raise ValueError(f"Не удалось оптимизировать изображение: {e}")


def create_analysis_prompt(occasion, preferences=None):
    """Создает промпт для анализа одной вещи, с акцентом на краткость и интеллектуальную подсказку."""
    prompt = f"""Ты — Мишура, профессиональный и дружелюбный ИИ-стилист. Твоя задача — дать краткий, но содержательный анализ предмета одежды на фото и практичные рекомендации.

## Информация от пользователя:
- **Повод/ситуация:** {occasion}
{f'- **Предпочтения пользователя:** {preferences}' if preferences and preferences.strip() else '- Предпочтения: не указаны.'}

## Твоя задача:
1.  **Проанализируй вещь:** Дай четкий и практичный анализ по основной структуре ниже. Будь лаконичен.
2.  **Интеллектуальная подсказка (если нужно):** После основного совета, если ты видишь, что предоставление *конкретной* дополнительной информации могло бы *значительно* улучшить совет в *будущем запросе* пользователя, добавь секцию "💡 Совет для будущих консультаций". Не добавляй эту секцию, если текущей информации достаточно или если подсказка будет слишком общей и неперсонализированной.

## Структура основного ответа (Markdown):

### 1. Описание Вещи
* **Тип:** (напр., Блузка, Юбка, Пальто)
* **Фасон и крой:** (напр., Свободный крой, А-силуэт, Укороченное)
* **Цвет/Принт:** (напр., Пастельно-голубой, Мелкая клетка)
* **Материал (предположительно):** (напр., Лен, Вискоза, Твид). *Если не уверен, укажи: "По фото сложно определить точный материал, но похоже на..."*
* **Ключевые детали:** (напр., Отложной воротник, декоративные пуговицы, драпировка)

### 2. Оценка для повода "{occasion}"
* **Соответствие:** (напр., Идеально / Хорошо подходит / Можно адаптировать / Скорее нет)
* **Комментарий:** (1-2 предложения: почему, и как можно стилизовать для этого повода)

### 3. Ключевые Рекомендации по Сочетаниям (1-2 варианта)
* **Образ 1:** (С чем сочетать: верх/низ, обувь. Пример: "С классическими синими джинсами прямого кроя и белыми кедами для стильного повседневного образа.")
* **Образ 2 (если применимо):** (Пример: "Для более формального вида — с черными брюками-палаццо и лоферами.")
* **Аксессуары (1-2 ключевых):** (Пример: "Дополните образ серебряной цепочкой и небольшой сумкой через плечо.")

### 4. Общее Впечатление и Сезонность (кратко)
* (Пример: "Универсальная вещь для весенне-летнего гардероба, легко впишется в разные стили.")

---
(Конец основного ответа. Секция "💡 Совет для будущих консультаций" генерируется ниже только при необходимости)
"""
    return prompt

def create_comparison_prompt(occasion, preferences=None):
    """Создает промпт для сравнения нескольких вещей, с акцентом на краткость и интеллектуальную подсказку."""
    prompt = f"""Ты — Мишура, профессиональный и дружелюбный ИИ-стилист. Тебе даны фото нескольких предметов одежды. Сделай краткий, но емкий сравнительный анализ и дай четкую рекомендацию.

## Информация от пользователя:
- **Повод/ситуация:** {occasion}
{f'- **Предпочтения пользователя:** {preferences}' if preferences and preferences.strip() else '- Предпочтения: не указаны.'}

## Твоя задача:
1.  **Сравни предметы:** Кратко опиши каждый и сравни их применительно к поводу.
2.  **Дай рекомендацию:** Какой вариант лучше и почему.
3.  **Интеллектуальная подсказка (если нужно):** После основного совета, если ты видишь, что предоставление *конкретной* дополнительной информации могло бы *значительно* улучшить совет по сравнению в *будущем запросе* пользователя, добавь секцию "💡 Совет для будущих сравнений". Не добавляй эту секцию, если текущей информации достаточно или если подсказка будет слишком общей.

## Структура основного ответа (Markdown):

### Краткий Обзор Предметов
(Нумеруй предметы как "Предмет 1", "Предмет 2" и т.д., ориентируясь на порядок изображений)
* **Предмет 1:** (Тип, цвет, ключевая особенность)
* **Предмет 2:** (Тип, цвет, ключевая особенность)
    (и так далее)

### Сравнение для повода "{occasion}"
(Кратко по 1-2 предложения на предмет: плюсы/минусы для этого повода)
* **Предмет 1:** ...
* **Предмет 2:** ...
    (и так далее)

### Итоговая Рекомендация от Мишуры
* **Лучший выбор:** Предмет [Номер] - потому что [1-2 главных аргумента, почему он лучше для этого повода и предпочтений].
* **Стилизация лучшего выбора:** (1-2 кратких совета, с чем его сочетать).

---
(Конец основного ответа. Секция "💡 Совет для будущих сравнений" генерируется ниже только при необходимости)
"""
    return prompt

async def _generate_gemini_response(parts: list, is_comparison: bool = False):
    """Внутренняя функция для генерации ответа от Gemini с обработкой ошибок и повторами."""
    retry_count = 0
    last_exception = None
    
    # Определяем, какой промпт был использован (для логирования и потенциально для выбора generation_config)
    prompt_type_for_log = "сравнения" if is_comparison else "одиночного анализа"

    # Настройки генерации (можно вынести в константы или передавать)
    # Уменьшаем max_output_tokens для краткости, temperature для большей предсказуемости
    generation_config = genai.types.GenerationConfig(
        # max_output_tokens=800, # Экспериментируйте с этим значением
        temperature=0.6, # Чуть ниже для большей сфокусированности
        # top_p=0.9,
        # top_k=40
    )
    # Безопасность - можно настроить более гранулярно, если нужно
    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    ]


    while retry_count < MAX_RETRIES:
        try:
            # Убедимся, что API сконфигурирован перед каждым вызовом, если это необходимо
            # (хотя обычно достаточно одного раза при старте приложения)
            if not GEMINI_API_KEY: # Дополнительная проверка на случай, если ключ пропал
                 logger.error("GEMINI_API_KEY отсутствует в середине процесса генерации.")
                 raise ValueError("Отсутствует API ключ Gemini.")
            if not genai.รู้หรือไม่._is_configured: # Используем внутренний флаг (если доступен и надежен) или конфигурируем снова
                 genai.configure(api_key=GEMINI_API_KEY)
                 logger.info("Повторная конфигурация Gemini API перед запросом.")


            model = genai.GenerativeModel(VISION_MODEL)
            logger.info(f"Отправка запроса ({prompt_type_for_log}) к Gemini (попытка {retry_count + 1}). Размер parts: {len(parts)}")
            response = await model.generate_content_async(
                parts,
                generation_config=generation_config,
                safety_settings=safety_settings
            )

            if response.parts: # Gemini 1.5 может возвращать ответ в response.parts
                 full_response_text = "".join(part.text for part in response.parts if hasattr(part, 'text'))
            elif hasattr(response, 'text') and response.text:
                 full_response_text = response.text
            else:
                 full_response_text = ""


            if full_response_text:
                logger.info(f"Ответ от Gemini ({prompt_type_for_log}) получен (попытка {retry_count + 1}). Длина: {len(full_response_text)}.")
                # Проверка на "пустые" ответы или ответы-заглушки от модели
                if len(full_response_text.strip()) < 50 and ("не могу" in full_response_text.lower() or "недостаточно информации" in full_response_text.lower()): # Примерный порог
                    logger.warning(f"Получен потенциально неинформативный ответ от Gemini: '{full_response_text[:100]}...'")
                    # Можно расценить как ошибку и попробовать еще раз, если есть попытки
                    # last_exception = ValueError(f"Неинформативный ответ от Gemini: {full_response_text}")
                    # retry_count += 1
                    # if retry_count < MAX_RETRIES:
                    #     await asyncio.sleep(RETRY_DELAY)
                    #     continue
                    # else: # Если все попытки исчерпаны или это единственная
                    #     return handle_gemini_error(last_exception) # или вернуть сам ответ, если это допустимо
                return full_response_text
            else:
                # Анализ причины пустого ответа
                finish_reason_str = "N/A"
                if response.candidates and response.candidates[0].finish_reason:
                    finish_reason_str = response.candidates[0].finish_reason.name
                logger.warning(f"Gemini ({prompt_type_for_log}) не вернул текстовый ответ (попытка {retry_count + 1}). Причина завершения: {finish_reason_str}")
                
                if finish_reason_str == "SAFETY":
                    last_exception = ValueError(f"Ответ ({prompt_type_for_log}) заблокирован из-за настроек безопасности (SAFETY).")
                    break # Немедленный выход, нет смысла повторять
                elif finish_reason_str == "MAX_TOKENS":
                    last_exception = ValueError(f"Ответ ({prompt_type_for_log}) превысил максимальную длину (MAX_TOKENS).")
                    # Здесь можно решить, повторять ли. Обычно нет, т.к. проблема в длине.
                    break
                elif finish_reason_str == "RECITATION": # Добавлено
                     last_exception = ValueError(f"Ответ ({prompt_type_for_log}) заблокирован из-за цитирования защищенного контента (RECITATION).")
                     break
                else: # OTHER, UNSPECIFIED, UNKNOWN
                    last_exception = ValueError(f"Пустой ответ от Gemini ({prompt_type_for_log}). Причина: {finish_reason_str}.")
            
            retry_count += 1
            if retry_count < MAX_RETRIES:
                logger.info(f"Ожидание {RETRY_DELAY} сек. перед следующей попыткой ({prompt_type_for_log})...")
                await asyncio.sleep(RETRY_DELAY)

        except Exception as e:
            last_exception = e
            logger.warning(f"Ошибка при запросе к Gemini ({prompt_type_for_log}) (попытка {retry_count + 1}/{MAX_RETRIES}): {e}", exc_info=True)
            retry_count += 1
            # Критические ошибки, из-за которых нет смысла повторять
            if "API_KEY_INVALID" in str(e).upper() or \
               "APIKEYNOTVALID" in str(e).upper() or \
               "PERMISSION_DENIED" in str(e).upper() or \
               isinstance(e, genai.types.PermissionDeniedError) or \
               isinstance(e, genai.types.UnauthenticatedError):
                logger.error(f"Критическая ошибка аутентификации или доступа к Gemini API ({prompt_type_for_log}). Прекращение попыток.")
                break 
            if retry_count < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY)

    logger.error(f"Все {MAX_RETRIES} попытки запроса ({prompt_type_for_log}) к Gemini не удались. Последняя ошибка: {last_exception}")
    return handle_gemini_error(last_exception or ValueError(f"Не удалось получить ответ от Gemini ({prompt_type_for_log}) после нескольких попыток."))


async def analyze_clothing_image(image_data_bytesio: BytesIO, occasion: str, preferences: str = None):
    """Анализ одного изображения одежды."""
    try:
        # Логгирование размера входных данных
        # image_data_bytesio.seek(0) # Убедимся, что указатель в начале для getbuffer
        # logger.info(f"Начало анализа изображения для повода: {occasion}. Размер входных данных: {image_data_bytesio.getbuffer().nbytes / 1024:.1f} KB")
        # image_data_bytesio.seek(0) # Возвращаем указатель для дальнейшего использования

        if not GEMINI_API_KEY: return "Ошибка: API ключ для Gemini не настроен."

        original_image_bytes = image_data_bytesio.getvalue() # Для кэша
        cached_result = cache_manager.get_from_cache(original_image_bytes, occasion, preferences)
        if cached_result:
            logger.info("Результат анализа одиночного изображения найден в кэше.")
            return cached_result

        optimized_image_bytes = optimize_image(image_data_bytesio) # optimize_image теперь должна возвращать bytes
        
        prompt_text = create_analysis_prompt(occasion, preferences)
        parts = [prompt_text, {"mime_type": "image/jpeg", "data": optimized_image_bytes}]
        
        response_text = await _generate_gemini_response(parts, is_comparison=False)

        # Сохраняем в кэш только успешные ответы, которые не являются сообщениями об ошибках
        if not response_text.startswith("Ошибка:") and not response_text.startswith("При обработке") and not "Gemini API" in response_text:
            cache_manager.save_to_cache(original_image_bytes, occasion, response_text, preferences)
        return response_text

    except ValueError as ve: # Ошибки, которые мы сами генерируем (например, из optimize_image)
        logger.error(f"Ошибка значения при анализе изображения: {ve}", exc_info=True)
        return str(ve) # Возвращаем сообщение об ошибке напрямую
    except Exception as e:
        logger.error(f"Критическая ошибка в analyze_clothing_image: {e}", exc_info=True)
        return f"Произошла системная ошибка при обработке вашего запроса (Код: G02)."


async def compare_clothing_images(image_data_list: list[BytesIO], occasion: str, preferences: str = None):
    """Сравнительный анализ нескольких изображений."""
    try:
        logger.info(f"Начало сравнения {len(image_data_list)} изображений для повода: {occasion}.")
        if not GEMINI_API_KEY: return "Ошибка: API ключ для Gemini не настроен."
        if not (2 <= len(image_data_list) <= 5): return "Для сравнения необходимо от 2 до 5 изображений."

        # Кэширование для сравнения (упрощенный вариант: хэш от конкатенации всех исходных изображений)
        # Это менее эффективно, если порядок или одно изображение изменятся, но лучше, чем ничего.
        all_original_bytes_for_hash = b''
        for img_io in image_data_list:
            img_io.seek(0)
            all_original_bytes_for_hash += img_io.getvalue()
        
        # cache_key_compare = hashlib.md5(all_original_bytes_for_hash).hexdigest() # Нужен hashlib
        # cached_result_compare = cache_manager.get_from_cache_raw(cache_key_compare, occasion, preferences) # Предположим, есть get_from_cache_raw
        # if cached_result_compare:
        #     logger.info("Результат сравнения изображений найден в кэше.")
        #     return cached_result_compare
        # ПОКА ПРОПУСКАЕМ КЭШ ДЛЯ СРАВНЕНИЯ ДЛЯ УПРОЩЕНИЯ

        processed_parts = [create_comparison_prompt(occasion, preferences)]
        for i, img_bytes_io in enumerate(image_data_list):
            img_bytes_io.seek(0) # Убедимся, что читаем с начала для оптимизации
            try:
                optimized_bytes = optimize_image(img_bytes_io)
                processed_parts.append({"mime_type": "image/jpeg", "data": optimized_bytes})
            except ValueError as ve:
                 logger.error(f"Ошибка оптимизации изображения {i+1} для сравнения: {ve}")
                 return str(ve) # Возвращаем сообщение об ошибке напрямую
            except Exception as e:
                logger.error(f"Неожиданная ошибка оптимизации изображения {i+1} для сравнения: {e}", exc_info=True)
                return f"Не удалось подготовить изображение {i+1} для сравнения (Код: G03)."
        
        response_text = await _generate_gemini_response(processed_parts, is_comparison=True)
        
        # if not response_text.startswith("Ошибка:") and not response_text.startswith("При обработке"):
        #     cache_manager.save_to_cache_raw(cache_key_compare, occasion, response_text, preferences)
        return response_text

    except ValueError as ve:
        logger.error(f"Ошибка значения при сравнении изображений: {ve}", exc_info=True)
        return str(ve)
    except Exception as e:
        logger.error(f"Критическая ошибка в compare_clothing_images: {e}", exc_info=True)
        return f"Произошла системная ошибка при сравнении изображений (Код: G04)."


async def analyze_clothing_file(file_path: str, occasion: str, preferences: str = None):
    """Анализ изображения из файла (обертка для analyze_clothing_image)."""
    try:
        logger.info(f"Анализ файла: {file_path} для повода: {occasion}")
        if not os.path.exists(file_path):
            logger.error(f"Файл не найден: {file_path}")
            return "Ошибка: Файл для анализа не найден."
        
        with open(file_path, "rb") as image_file:
            image_data_bytesio = BytesIO(image_file.read())
            
        return await analyze_clothing_image(image_data_bytesio, occasion, preferences)
    except Exception as e:
        logger.error(f"Ошибка при обработке файла {file_path}: {e}", exc_info=True)
        return f"Произошла ошибка при обработке файла (Код: G05): {e}"


if __name__ == "__main__":
    import asyncio
    from PIL import Image, ImageDraw # Убедимся, что ImageDraw импортирован здесь

    async def main_test():
        print("Тестирование модуля Gemini AI для проекта МИШУРА (v0.3.3)...")
        if not GEMINI_API_KEY:
            print("ОШИБКА: GEMINI_API_KEY не установлен в .env. Тестирование невозможно.")
            return

        # Создадим простое тестовое изображение (красный квадрат с текстом)
        try:
            img_data = {}
            colors = {"red": (200, 0, 0), "blue": (0, 0, 200), "green": (0,150,0)}
            texts = {"red": "Красный Тест", "blue": "Синий Тест", "green": "Зеленый Свитер"}

            for color_name, rgb_tuple in colors.items():
                img = Image.new('RGB', (300, 400), color=rgb_tuple) # Более реалистичный размер
                draw = ImageDraw.Draw(img)
                text = texts[color_name]
                # Простой расчет для центрирования текста (может потребовать более точного)
                # text_bbox = draw.textbbox((0,0), text) # Для Pillow 9.2.0+
                # text_width = text_bbox[2] - text_bbox[0]
                # text_height = text_bbox[3] - text_bbox[1]
                # x = (img.width - text_width) / 2
                # y = (img.height - text_height) / 2
                # draw.text((x,y), text, fill="white") # Pillow 9.2.0+
                draw.text((img.width*0.2, img.height*0.45), text, fill="white", font_size=30) # Упрощенно

                img_bytes_io = BytesIO()
                img.save(img_bytes_io, format='JPEG', quality=75)
                img_bytes_io.seek(0)
                img_data[color_name] = img_bytes_io
            
            print("\n--- Тест одиночного анализа (Красный Тест) ---")
            # Передаем копию BytesIO, так как он может быть прочитан несколько раз
            advice_single = await analyze_clothing_image(BytesIO(img_data["red"].getvalue()), "деловая встреча", "предпочитаю строгий стиль, но с изюминкой")
            print("\nОтвет Мишуры (одиночный анализ):")
            print(advice_single)

            print("\n--- Тест одиночного анализа (Зеленый Свитер, имитация плохого качества) ---")
            # "Испортим" зеленое изображение для теста подсказки
            img_green_poor = Image.open(BytesIO(img_data["green"].getvalue()))
            img_green_poor = img_green_poor.resize((100,133), Image.Resampling.NEAREST) # Уменьшим и ухудшим
            img_green_poor_io = BytesIO()
            img_green_poor.save(img_green_poor_io, format='JPEG', quality=30) # Низкое качество
            img_green_poor_io.seek(0)
            advice_single_poor = await analyze_clothing_image(img_green_poor_io, "прогулка в парке", None) # Без предпочтений
            print("\nОтвет Мишуры (одиночный анализ, плохое качество фото):")
            print(advice_single_poor)


            print("\n--- Тест сравнения изображений (Красный и Синий) ---")
            advice_compare = await compare_clothing_images(
                [BytesIO(img_data["red"].getvalue()), BytesIO(img_data["blue"].getvalue())], 
                "выход в свет", 
                "хочу выглядеть эффектно"
            )
            print("\nОтвет Мишуры (сравнение):")
            print(advice_compare)

        except NameError as ne: # Если cache_manager не импортирован
            if "AnalysisCacheManager" in str(ne):
                print(f"\nПРЕДУПРЕЖДЕНИЕ: {ne}. Кэширование будет отключено для этого теста.")
                # Здесь можно было бы создать dummy cache_manager, но для простоты теста это опустим.
                # Главное, чтобы основная логика Gemini работала.
            else:
                raise ne
        except Exception as e:
            print(f"\nОШИБКА ВО ВРЕМЯ ТЕСТА: {e}")
            import traceback
            traceback.print_exc()

    asyncio.run(main_test())