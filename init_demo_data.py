"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Инициализация демонстрационных данных (init_demo_data.py)
ВЕРСИЯ: 1.0.0
ДАТА СОЗДАНИЯ: 2025-05-23

Скрипт для создания демонстрационных данных для тестирования функций бота
==========================================================================================
"""
import logging
import database as db

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DemoDataInit")

def init_demo_data():
    """Инициализирует демонстрационные данные для тестирования."""
    logger.info("Начало инициализации демонстрационных данных...")
    
    # Инициализируем базу данных
    if not db.init_db():
        logger.error("Не удалось инициализировать базу данных")
        return False
    
    # Создаем тестового пользователя
    demo_user_id = 123456789
    logger.info(f"Создание демо-пользователя с ID: {demo_user_id}")
    
    # Сохраняем пользователя
    if db.save_user(demo_user_id, "demo_user", "Демо", "Пользователь"):
        logger.info("Демо-пользователь создан успешно")
        
        # Добавляем баланс
        db.update_user_balance(demo_user_id, 10)
        logger.info("Баланс демо-пользователя установлен на 10 консультаций")
        
        # Создаем демо-консультацию
        consultation_id = db.save_consultation(
            demo_user_id,
            "деловая встреча",
            "классический стиль, строгость",
            "demo_file_id_12345",  # Фиктивный file_id
            "Отличный выбор для деловой встречи! Классический костюм подчеркивает профессионализм. Рекомендую добавить качественные аксессуары.\n\n💡 Совет от МИШУРЫ: Для еще более точного анализа в следующий раз попробуйте сфотографировать образ при дневном свете."
        )
        
        if consultation_id:
            logger.info(f"Демо-консультация создана с ID: {consultation_id}")
            
            # Создаем демо-предмет в гардеробе
            wardrobe_id = db.save_wardrobe_item(
                demo_user_id,
                "demo_file_id_67890",
                "Черный деловой костюм",
                "деловой",
                "костюмы"
            )
            
            if wardrobe_id:
                logger.info(f"Демо-предмет гардероба создан с ID: {wardrobe_id}")
                logger.info("✅ Демонстрационные данные успешно инициализированы!")
                return True
    
    logger.error("❌ Ошибка при инициализации демонстрационных данных")
    return False

def show_demo_stats():
    """Показывает статистику демонстрационных данных."""
    logger.info("=== СТАТИСТИКА ДЕМОНСТРАЦИОННЫХ ДАННЫХ ===")
    
    # Общая статистика
    stats = db.get_stats()
    logger.info(f"Всего пользователей: {stats['total_users']}")
    logger.info(f"Всего консультаций: {stats['total_consultations']}")
    logger.info(f"Консультаций за день: {stats['daily_consultations']}")
    
    # Статистика демо-пользователя
    demo_user_id = 123456789
    user = db.get_user(demo_user_id)
    if user:
        logger.info(f"\nДемо-пользователь: {user['first_name']} {user['last_name']}")
        logger.info(f"Баланс: {user['balance']} консультаций")
        
        # Консультации демо-пользователя
        consultations = db.get_user_consultations(demo_user_id)
        logger.info(f"Консультаций пользователя: {len(consultations)}")
        
        # Гардероб демо-пользователя
        wardrobe = db.get_user_wardrobe(demo_user_id)
        logger.info(f"Предметов в гардеробе: {len(wardrobe)}")
        
        # Статистика гардероба
        wardrobe_stats = db.get_wardrobe_stats(demo_user_id)
        logger.info(f"Статистика гардероба: {wardrobe_stats}")

if __name__ == "__main__":
    logger.info("🎭 ИНИЦИАЛИЗАЦИЯ ДЕМОНСТРАЦИОННЫХ ДАННЫХ МИШУРА 🎭")
    
    if init_demo_data():
        show_demo_stats()
        logger.info("\n✨ Теперь вы можете протестировать все функции бота МИШУРА!")
        logger.info("📱 Используйте Telegram ID 123456789 для тестирования")
    else:
        logger.error("\n❌ Не удалось инициализировать демонстрационные данные") 