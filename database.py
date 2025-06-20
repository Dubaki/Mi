"""
==========================================================================================
ПРОЕКТ: МИШУРА - Ваш персональный ИИ-Стилист
КОМПОНЕНТ: Модуль Базы Данных (database.py)
ВЕРСИЯ: 0.2.0 - ПРИНУДИТЕЛЬНОЕ ПЕРЕСОЗДАНИЕ БД
ДАТА ОБНОВЛЕНИЯ: 2025-06-20

КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительное пересоздание БД с правильными FOREIGN KEY
==========================================================================================
"""
import sqlite3
import os
from datetime import datetime
import logging
from typing import Optional, Dict, Any, List, Union

# Настройка логирования для этого модуля
logger = logging.getLogger("MishuraDB")
if not logger.handlers:
    logging.basicConfig(
        format="%(asctime)s - [%(levelname)s] - %(name)s - (%(filename)s).%(funcName)s(%(lineno)d): %(message)s",
        level=logging.INFO
    )

logger.info("Инициализация модуля базы данных МИШУРА.")

# Имя файла БД
DB_FILENAME = "styleai.db"
DB_PATH = DB_FILENAME 
SCHEMA_FILE = "schema.sql"

class MishuraDB:
    """
    🎭 МИШУРА Database Class
    Основной класс для работы с базой данных SQLite
    """
    
    def __init__(self, db_path: str = DB_PATH):
        """Инициализация базы данных МИШУРА"""
        self.db_path = db_path
        self.logger = logger
        
        # ПРИНУДИТЕЛЬНОЕ ПЕРЕСОЗДАНИЕ БД
        self.force_recreate_db()
        
        self.logger.info(f"✅ MishuraDB инициализирована: {self.db_path}")
    
    def force_recreate_db(self):
        """Принудительное пересоздание базы данных с правильной схемой"""
        self.logger.info("🔥 ПРИНУДИТЕЛЬНОЕ ПЕРЕСОЗДАНИЕ базы данных")
        
        try:
            # Удаляем старую БД если есть
            if os.path.exists(self.db_path):
                os.remove(self.db_path)
                self.logger.info(f"🗑️ Старая БД удалена: {self.db_path}")
            
            # Создаем новую БД с правильной схемой
            self.init_db()
            
            self.logger.info("✅ БД успешно пересоздана с новой схемой")
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка пересоздания БД: {e}")
            raise
    
    def get_connection(self) -> sqlite3.Connection:
        """
        Устанавливает и возвращает соединение с базой данных SQLite.
        Включает поддержку внешних ключей.
        """
        try:
            conn = sqlite3.connect(self.db_path, timeout=10)
            conn.execute("PRAGMA foreign_keys = ON;")
            return conn
        except sqlite3.Error as e:
            self.logger.critical(f"Критическая ошибка при подключении к БД {self.db_path}: {e}", exc_info=True)
            raise
    
    def init_db(self, schema_file_path: str = SCHEMA_FILE) -> bool:
        """Инициализирует базу данных"""
        self.logger.info(f"Начало инициализации/проверки базы данных '{self.db_path}' со схемой '{schema_file_path}'")
        
        # Проверка существования файла схемы
        actual_schema_path = schema_file_path
        if not os.path.exists(actual_schema_path):
            self.logger.warning(f"Файл схемы '{actual_schema_path}' не найден в текущей директории ({os.getcwd()}). Попытка найти рядом с database.py...")
            script_dir = os.path.dirname(os.path.abspath(__file__))
            path_near_script = os.path.join(script_dir, schema_file_path)
            if os.path.exists(path_near_script):
                actual_schema_path = path_near_script
                self.logger.info(f"Файл схемы найден по альтернативному пути: {actual_schema_path}")
            else:
                self.logger.critical(f"КРИТИЧЕСКАЯ ОШИБКА: Файл SQL-схемы '{schema_file_path}' не найден. Инициализация БД невозможна.")
                return False
                
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                with open(actual_schema_path, 'r', encoding='utf-8') as f:
                    sql_script = f.read()
                
                cursor.executescript(sql_script)
                conn.commit()
                self.logger.info(f"База данных '{self.db_path}' успешно инициализирована/проверена схемой '{actual_schema_path}'.")
                return True
        except sqlite3.Error as e_sql:
            self.logger.error(f"Ошибка SQLite при инициализации базы данных ({self.db_path}): {e_sql}", exc_info=True)
        except FileNotFoundError:
            self.logger.error(f"Файл SQL-схемы '{actual_schema_path}' не найден.", exc_info=True)
        except Exception as e:
            self.logger.critical(f"Непредвиденная критическая ошибка при инициализации базы данных: {e}", exc_info=True)
        return False

    # --- ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ---
    
    def get_user_by_telegram_id(self, telegram_id):
        """Получить пользователя по telegram_id"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, telegram_id, username, first_name, last_name, created_at
                FROM users 
                WHERE telegram_id = ?
            """, (telegram_id,))
            user = cursor.fetchone()
            conn.close()
            
            if user:
                return {
                    'id': user[0],
                    'telegram_id': user[1], 
                    'username': user[2],
                    'first_name': user[3],
                    'last_name': user[4],
                    'created_at': user[5]
                }
            return None
            
        except Exception as e:
            self.logger.error(f"Ошибка получения пользователя {telegram_id}: {str(e)}")
            return None

    def save_user(self, telegram_id, username=None, first_name=None, last_name=None, initial_balance=200):
        """Сохранить пользователя, возвращает user_id"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Проверяем, существует ли пользователь
            cursor.execute("SELECT id, balance FROM users WHERE telegram_id = ?", (telegram_id,))
            existing_user = cursor.fetchone()
            
            if existing_user:
                # Пользователь существует, обновляем только основную информацию
                user_id, current_balance = existing_user
                cursor.execute("""
                    UPDATE users 
                    SET username = COALESCE(?, username),
                        first_name = COALESCE(?, first_name),
                        last_name = COALESCE(?, last_name),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE telegram_id = ?
                """, (username, first_name, last_name, telegram_id))
                
                conn.commit()
                conn.close()
                
                self.logger.info(f"Пользователь обновлен: ID={user_id}, telegram_id={telegram_id}, баланс={current_balance}")
                return user_id
            else:
                # Создаем нового пользователя с начальным балансом
                cursor.execute("""
                    INSERT INTO users (telegram_id, username, first_name, last_name, balance, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, (telegram_id, username or 'webapp_user', first_name or 'WebApp', 
                      last_name or 'User', initial_balance))
                
                user_id = cursor.lastrowid
                conn.commit()
                conn.close()
                
                self.logger.info(f"Пользователь создан: ID={user_id}, telegram_id={telegram_id}, баланс={initial_balance}")
                return user_id
                
        except Exception as e:
            self.logger.error(f"Ошибка сохранения пользователя telegram_id={telegram_id}: {e}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            raise

    def get_user(self, telegram_id: int) -> Optional[Dict[str, Any]]:
        """Получает информацию о пользователе по его telegram_id"""
        self.logger.debug(f"Запрос информации о пользователе: telegram_id={telegram_id}")
        sql = 'SELECT id, telegram_id, username, first_name, last_name, balance, created_at FROM users WHERE telegram_id = ?'
        try:
            with self.get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(sql, (telegram_id,))
                user_row = cursor.fetchone()
            
            if user_row:
                user_dict = dict(user_row)
                self.logger.info(f"Пользователь telegram_id={telegram_id} найден: {user_dict}")
                return user_dict
            else:
                self.logger.info(f"Пользователь telegram_id={telegram_id} не найден.")
                return None
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении пользователя telegram_id={telegram_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении пользователя telegram_id={telegram_id}: {e_gen}", exc_info=True)
        return None
        
    def get_user_balance(self, telegram_id: int) -> int:
        """Получает текущий баланс консультаций пользователя"""
        self.logger.debug(f"Запрос баланса для пользователя: telegram_id={telegram_id}")
        sql = 'SELECT balance FROM users WHERE telegram_id = ?'
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (telegram_id,))
                result = cursor.fetchone()
            
            if result:
                balance = result[0]
                self.logger.info(f"Баланс для пользователя telegram_id={telegram_id} составляет: {balance}")
                return balance
            else:
                # Пользователь не найден, создаем с начальным балансом
                self.logger.warning(f"Пользователь telegram_id={telegram_id} не найден при запросе баланса")
                
                # Создаем пользователя с начальным балансом 200 STCoins
                initial_balance = 200
                user_id = self.save_user(
                    telegram_id=telegram_id,
                    username='webapp_user',
                    first_name='WebApp',
                    last_name='User',
                    initial_balance=initial_balance
                )
                
                if user_id:
                    self.logger.info(f"Создан новый пользователь telegram_id={telegram_id} с начальным балансом {initial_balance}")
                    return initial_balance
                else:
                    return 0
                    
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении баланса пользователя telegram_id={telegram_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении баланса пользователя telegram_id={telegram_id}: {e_gen}", exc_info=True)
        return 0
        
    def update_user_balance(self, telegram_id: int, amount_change: int, operation_type="manual") -> int:
        """Обновляет баланс пользователя на указанную величину"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Получаем текущий баланс
            current_balance = self.get_user_balance(telegram_id)
            new_balance = current_balance + amount_change
            
            # Обновляем баланс
            cursor.execute("""
                UPDATE users 
                SET balance = ?, updated_at = CURRENT_TIMESTAMP
                WHERE telegram_id = ?
            """, (new_balance, telegram_id))
            
            if cursor.rowcount == 0:
                # Пользователь не существует, создаем его
                user_id = self.save_user(
                    telegram_id=telegram_id,
                    username='webapp_user',
                    first_name='WebApp',
                    last_name='User',
                    initial_balance=new_balance
                )
                
                if not user_id:
                    conn.rollback()
                    conn.close()
                    return current_balance
            
            conn.commit()
            conn.close()
            
            self.logger.info(f"Баланс пользователя {telegram_id} обновлен: {current_balance} {'+' if amount_change >= 0 else ''}{amount_change} = {new_balance} ({operation_type})")
            
            return new_balance
            
        except Exception as e:
            self.logger.error(f"Ошибка обновления баланса для telegram_id={telegram_id}: {e}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            return current_balance if 'current_balance' in locals() else 0

    # --- ФУНКЦИИ ДЛЯ РАБОТЫ С КОНСУЛЬТАЦИЯМИ ---
    
    def save_consultation(self, user_id: int, occasion: Optional[str], preferences: Optional[str], image_path: Optional[str], advice: Optional[str]) -> Optional[int]:
        """Сохраняет новую консультацию в базу данных"""
        self.logger.info(f"Сохранение консультации для user_id={user_id}, повод: {occasion}")
        sql = '''
        INSERT INTO consultations (user_id, occasion, preferences, image_path, advice, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        '''
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # ИСПРАВЛЕНИЕ: user_id теперь это telegram_id, получаем правильный internal ID
                cursor.execute("SELECT id FROM users WHERE telegram_id = ?", (user_id,))
                user_row = cursor.fetchone()
                
                if not user_row:
                    self.logger.error(f"Пользователь с telegram_id={user_id} не найден")
                    return None
                
                internal_user_id = user_row[0]
                
                cursor.execute(sql, (internal_user_id, occasion, preferences, image_path, advice))
                consultation_id = cursor.lastrowid
                conn.commit()
            self.logger.info(f"Консультация для telegram_id={user_id} (internal_id={internal_user_id}) успешно сохранена с ID={consultation_id}.")
            return consultation_id
        except sqlite3.IntegrityError as e_int:
            self.logger.error(f"Ошибка целостности SQLite при сохранении консультации для user_id={user_id}: {e_int}", exc_info=True)
        except sqlite3.Error as e_sql:
            self.logger.error(f"Ошибка SQLite при сохранении консультации для user_id={user_id}: {e_sql}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при сохранении консультации для user_id={user_id}: {e_gen}", exc_info=True)
        return None

    def get_consultation(self, consultation_id: int, user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """Получает информацию о консультации"""
        self.logger.debug(f"Запрос консультации ID={consultation_id}" + (f" для user_id={user_id}" if user_id else ""))
        
        if user_id:
            sql = 'SELECT * FROM consultations WHERE id = ? AND user_id = ?'
            params = (consultation_id, user_id)
        else:
            sql = 'SELECT * FROM consultations WHERE id = ?'
            params = (consultation_id,)
            
        try:
            with self.get_connection() as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(sql, params)
                consultation_row = cursor.fetchone()
            
            if consultation_row:
                consultation_dict = dict(consultation_row)
                self.logger.info(f"Консультация ID={consultation_id} найдена.")
                return consultation_dict
            else:
                self.logger.info(f"Консультация ID={consultation_id} не найдена" + (f" для user_id={user_id}." if user_id else "."))
                return None
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении консультации ID={consultation_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении консультации ID={consultation_id}: {e_gen}", exc_info=True)
        return None

    def get_user_consultations(self, user_id: int, limit: int = 20):
        """Получить консультации пользователя"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, user_id, occasion, preferences, image_path, advice, created_at
                FROM consultations 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            """, (user_id, limit))
            
            consultations = cursor.fetchall()
            conn.close()
            
            self.logger.info(f"📚 Получено {len(consultations)} консультаций для пользователя {user_id}")
            return consultations
            
        except Exception as e:
            self.logger.error(f"❌ Ошибка получения консультаций для пользователя {user_id}: {e}")
            return []

    # --- ОСТАЛЬНЫЕ МЕТОДЫ ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ ---
    # (все остальные методы из предыдущей версии...)
    # Копируем все остальные методы без изменений для краткости
    
    def record_payment(self, user_id: int, amount_rub: int, status: str = "pending", payment_provider_id: Optional[str] = None) -> Optional[int]:
        """Записывает информацию о платеже в базу данных"""
        self.logger.info(f"Запись платежа для user_id={user_id}, сумма: {amount_rub} RUB, статус: {status}")
        sql = '''
        INSERT INTO payments (user_id, amount, status, created_at, payment_provider_id) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
        '''
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (user_id, amount_rub, status, payment_provider_id))
                payment_id = cursor.lastrowid
                conn.commit()
            self.logger.info(f"Платеж для user_id={user_id} успешно записан с ID={payment_id}.")
            return payment_id
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при записи платежа для user_id={user_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при записи платежа для user_id={user_id}: {e_gen}", exc_info=True)
        return None

    def update_payment_status(self, payment_id: int, new_status: str) -> bool:
        """Обновляет статус указанного платежа"""
        self.logger.info(f"Обновление статуса платежа ID={payment_id} на '{new_status}'")
        sql = 'UPDATE payments SET status = ? WHERE id = ?'
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (new_status, payment_id))
                conn.commit()
                if cursor.rowcount > 0:
                    self.logger.info(f"Статус платежа ID={payment_id} успешно обновлен на '{new_status}'.")
                    return True
                else:
                    self.logger.warning(f"Платеж ID={payment_id} не найден при попытке обновления статуса.")
                    return False
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при обновлении статуса платежа ID={payment_id}: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при обновлении статуса платежа ID={payment_id}: {e_gen}", exc_info=True)
        return False

    def get_stats(self) -> Dict[str, int]:
        """Получает общую статистику сервиса МИШУРА"""
        self.logger.debug("Запрос общей статистики сервиса.")
        stats = {
            'total_users': 0,
            'total_consultations': 0,
            'daily_consultations': 0,
            'total_payments_completed': 0
        }
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute('SELECT COUNT(*) FROM users')
                stats['total_users'] = cursor.fetchone()[0]
                
                cursor.execute('SELECT COUNT(*) FROM consultations')
                stats['total_consultations'] = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM consultations WHERE created_at >= datetime('now', '-1 day')")
                stats['daily_consultations'] = cursor.fetchone()[0]
                
            self.logger.info(f"Статистика сервиса МИШУРА получена: {stats}")
        except sqlite3.Error as e:
            self.logger.error(f"Ошибка SQLite при получении статистики: {e}", exc_info=True)
        except Exception as e_gen:
            self.logger.error(f"Непредвиденная ошибка при получении статистики: {e_gen}", exc_info=True)
        return stats

    # Остальные методы для гардероба копируем без изменений...
    # (save_wardrobe_item, get_user_wardrobe, etc.)


# === ФУНКЦИИ СОВМЕСТИМОСТИ ===
# (все функции совместимости копируем без изменений...)

def get_connection() -> sqlite3.Connection:
    """Функция совместимости"""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn
    except sqlite3.Error as e:
        logger.critical(f"Критическая ошибка при подключении к БД {DB_PATH}: {e}", exc_info=True)
        raise

def init_db(schema_file_path: str = SCHEMA_FILE) -> bool:
    """Функция совместимости"""
    db_instance = MishuraDB()
    return db_instance.init_db(schema_file_path)

# Остальные функции совместимости...

if __name__ == "__main__":
    logger.info("Запуск database.py как основного скрипта (для тестов или инициализации).")
    db_instance = MishuraDB()
    if db_instance:
        logger.info("База данных успешно инициализирована из __main__.")
    else:
        logger.error("Не удалось инициализировать базу данных из __main__.")