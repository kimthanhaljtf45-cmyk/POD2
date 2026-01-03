# Quick Start Guide

Быстрый запуск FOMO Podcasts Platform.

## Требования

- Python 3.11+
- Node.js 18+
- MongoDB 6+
- Yarn

## Шаг 1: Клонирование

```bash
git clone https://github.com/DDDDDuf/podaa.git
cd podaa
```

## Шаг 2: Backend

```bash
cd backend

# Создать виртуальное окружение
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt

# Создать .env файл
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=fomo_voice_club
JWT_SECRET_KEY=your-secret-key-change-me
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHANNEL_ID=your-channel-id
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
EOF

# Инициализировать базу данных
python init_demo_users.py
python create_full_demo_data.py

# Запустить сервер
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## Шаг 3: Frontend

```bash
cd frontend

# Установить зависимости
yarn install

# Создать .env файл
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Запустить
yarn start
```

## Шаг 4: Настройка Admin

1. Открыть http://localhost:3000/admin
2. Подключить MetaMask кошелек
3. Ввести адрес кошелька в поле "Owner Wallet"
4. Сохранить

Теперь этот кошелек имеет права администратора.

## Шаг 5: Telegram Bot (опционально)

1. Создать бота через [@BotFather](https://t.me/BotFather)
2. Добавить бота админом в канал
3. Получить ID канала:
   ```
   https://api.telegram.org/bot<TOKEN>/getChat?chat_id=@username
   ```
4. Добавить в `.env`:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC...
   TELEGRAM_CHANNEL_ID=-100123456789
   ```

## Шаг 6: LiveKit Audio (опционально)

1. Зарегистрироваться на [livekit.io](https://livekit.io)
2. Создать проект
3. Добавить в `.env`:
   ```
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=APIxxxxx
   LIVEKIT_API_SECRET=xxxxx
   ```

## Доступ

| URL | Описание |
|-----|----------|
| http://localhost:3000 | Frontend |
| http://localhost:3000/admin | Admin Panel |
| http://localhost:3000/live | Live Management |
| http://localhost:3000/lives | Active Streams |
| http://localhost:8001/docs | API Documentation |

## Тестовые данные

После `create_full_demo_data.py`:
- 3 пользователя с разными уровнями
- Демо подкасты
- Настройки клуба

## Проверка работоспособности

```bash
# Health check
curl http://localhost:8001/api/

# Список сессий
curl http://localhost:8001/api/live-sessions/sessions

# XP лидерборд
curl http://localhost:8001/api/xp/leaderboard
```

## Troubleshooting

### MongoDB не подключается
```bash
# Проверить статус
mongosh --eval "db.adminCommand('ping')"
```

### Frontend не видит backend
- Проверить REACT_APP_BACKEND_URL в frontend/.env
- Убедиться, что backend запущен на порту 8001

### Telegram бот не отправляет сообщения
- Проверить токен бота
- Убедиться, что бот админ канала
- Проверить правильность CHANNEL_ID (должен начинаться с -100)
