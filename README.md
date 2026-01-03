# FOMO Podcasts Platform

Закрытая платформа для голосовых подкастов с real-time стримингом, чатом и gamification системой.

## 🚀 Основные функции

- **Live Streaming** - WebRTC аудио через LiveKit
- **Real-time Chat** - WebSocket чат с эмодзи реакциями
- **Hand Raise** - система поднятия руки для выступления
- **XP & Badges** - геймификация с уровнями и наградами
- **Telegram Integration** - уведомления и recording bot
- **Push Notifications** - PWA уведомления
- **Admin Panel** - управление кошельками и участниками

---

## 📁 Структура проекта

```
/app
├── backend/                    # FastAPI Backend
│   ├── server.py              # Главный сервер
│   ├── .env                   # Переменные окружения (КЛЮЧИ!)
│   ├── requirements.txt       # Python зависимости
│   ├── routes/                # API маршруты
│   │   ├── live_sessions.py   # Live streaming + WebSocket
│   │   ├── admin_panel.py     # Админка
│   │   ├── telegram.py        # Telegram интеграция
│   │   ├── push_notifications.py # PWA Push
│   │   ├── xp.py              # XP система
│   │   ├── badges_club.py     # Бейджи
│   │   └── ...
│   ├── services/
│   │   └── telegram_service.py # Telegram сервис
│   ├── telegram_recording_bot.py # Бот записи
│   ├── init_demo_users.py     # Инициализация демо данных
│   └── create_full_demo_data.py
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── App.js             # Главный компонент
│   │   ├── pages/
│   │   │   ├── LiveRoomView.jsx    # Live комната
│   │   │   ├── LiveManagement.jsx  # Управление стримами
│   │   │   ├── AdminPanel.jsx      # Админка
│   │   │   ├── Home.jsx            # Главная
│   │   │   └── ...
│   │   └── components/
│   ├── public/
│   │   └── sw.js              # Service Worker (PWA)
│   ├── package.json
│   └── .env                   # Frontend переменные
│
├── README.md                  # Этот файл
├── QUICKSTART.md              # Быстрый запуск
└── TASKS.md                   # Текущие задачи
```

---

## 🔑 Ключи и API (ВАЖНО!)

### Расположение ключей: `/app/backend/.env`

```env
# MongoDB
MONGO_URL="mongodb://localhost:27017"
DB_NAME="fomo_voice_club"

# JWT
JWT_SECRET_KEY="your-secret-key"

# Telegram Bot
TELEGRAM_BOT_TOKEN="8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E"
TELEGRAM_CHANNEL_ID="-1003133850361"

# LiveKit (WebRTC Audio)
LIVEKIT_URL="wss://fomo-bxb0f38x.livekit.cloud"
LIVEKIT_API_KEY="APIqNLg599MoAHc"
LIVEKIT_API_SECRET="9wWu3BHo199HEcvcE22KMpcuSDfqy7K7TA5oXEOaXae"
```

---

## 📡 LiveKit Integration

### Что это?
LiveKit - WebRTC платформа для real-time аудио/видео.

### Как работает:
1. Пользователь нажимает **"Join Audio Room"** в live комнате
2. Backend генерирует JWT токен через `/api/live-sessions/livekit/token`
3. Frontend подключается к LiveKit серверу с этим токеном
4. WebRTC аудио стриминг работает

### API Endpoint:
```
POST /api/live-sessions/livekit/token
Body: {
  "session_id": "uuid",
  "user_id": "user-id",
  "username": "Name"
}
Response: {
  "token": "jwt-token",
  "url": "wss://fomo-bxb0f38x.livekit.cloud",
  "room": "session-id",
  "mock_mode": false
}
```

### Файлы:
- `/app/backend/routes/live_sessions.py` - token generation (строка ~1050)
- `/app/frontend/src/pages/LiveRoomView.jsx` - LiveKit client

---

## 🤖 Telegram Integration

### Компоненты:

#### 1. Notification Bot (@Podcast_FOMO_bot)
- Отправляет уведомления о начале/завершении стримов
- Файл: `/app/backend/services/telegram_service.py`

#### 2. Recording Bot
- Слушает канал @Podcast_F
- Автоматически создаёт подкасты из аудио записей
- Файл: `/app/backend/telegram_recording_bot.py`
- Запускается через Supervisor

#### 3. Telegram Channel (@Podcast_F)
- ID: `-1003133850361`
- Получает уведомления о стримах

### API Endpoints:
```
POST /api/telegram/send-message
POST /api/telegram/notify-stream-start
POST /api/telegram/notify-stream-end
GET  /api/telegram/check-bot
```

### Файлы:
- `/app/backend/routes/telegram.py` - API routes
- `/app/backend/services/telegram_service.py` - сервис
- `/app/backend/telegram_recording_bot.py` - recording bot

---

## 🎮 Live Streaming

### WebSocket API:
```
WS /api/live-sessions/ws/{session_id}?user_id=X&username=Y&role=listener
```

### Сообщения:
```javascript
// Отправка чата
{"type": "chat", "message": "Hello!"}

// Поднятие руки
{"type": "raise_hand"}

// Эмодзи реакция
{"type": "reaction", "emoji": "👍"}
```

### Получаемые события:
- `room_state` - состояние комнаты при подключении
- `chat_message` - новое сообщение
- `user_joined` / `user_left` - вход/выход участников
- `hand_raised` / `hand_lowered` - поднятие руки
- `speaker_promoted` / `speaker_demoted` - изменение роли
- `reaction` - эмодзи реакция

---

## 👤 Админ панель

### URL: `/admin`

### Функции:
- Управление кошельками (Owner, Admins)
- Список участников с XP
- Настройки клуба

### Без авторизации:
Для закрытого клуба админка работает без MetaMask - просто вводите адреса кошельков и сохраняете.

---

## 🚀 Запуск

### 1. Backend
```bash
cd /app/backend
pip install -r requirements.txt
python init_demo_users.py  # Инициализация БД
```

### 2. Frontend
```bash
cd /app/frontend
yarn install
```

### 3. Сервисы
```bash
sudo supervisorctl restart all
sudo supervisorctl status
```

### 4. Telegram Recording Bot
```bash
# Автоматически запускается через Supervisor
sudo supervisorctl status telegram_recording_bot
```

---

## 📱 URL Структура

| URL | Описание |
|-----|----------|
| `/` | Главная страница |
| `/live-management` | Управление стримами |
| `/live/{session_id}` | Live комната |
| `/lives` | Список стримов |
| `/admin` | Админ панель |
| `/members` | Участники |
| `/progress` | Прогресс XP |
| `/library` | Библиотека подкастов |
| `/analytics` | Аналитика |
| `/settings` | Настройки |

---

## 🔧 Supervisor конфигурация

Recording Bot: `/etc/supervisor/conf.d/telegram_bot.conf`
```ini
[program:telegram_recording_bot]
command=/root/.venv/bin/python /app/backend/telegram_recording_bot.py
directory=/app/backend
autostart=true
autorestart=true
```

---

## 📝 Примечания

- **Backend порт**: 8001
- **Frontend порт**: 3000
- **MongoDB**: localhost:27017
- **База данных**: fomo_voice_club

---

*Последнее обновление: 2026-01-03*
