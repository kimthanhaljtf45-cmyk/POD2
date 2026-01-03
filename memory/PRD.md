# PRD - FOMO Podcasts Platform

## Обзор продукта

FOMO Podcasts - закрытая платформа для голосовых подкастов с функциями:
- Real-time аудио стриминг (LiveKit WebRTC)
- Live чат с эмодзи реакциями
- Система поднятия руки (Hand Raise)
- Gamification (XP, Badges, Levels)
- Telegram интеграция

---

## Технический стек

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: MongoDB (Motor async driver)
- **WebSocket**: Starlette WebSocket
- **Audio**: LiveKit WebRTC

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS
- **UI**: Shadcn/UI components
- **Audio Client**: LiveKit React SDK

### Интеграции
- **LiveKit**: WebRTC аудио стриминг
- **Telegram Bot API**: уведомления, recording
- **Web Push API**: PWA уведомления

---

## API Ключи

### Расположение: `/app/backend/.env`

```env
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="fomo_voice_club"

# Security
JWT_SECRET_KEY="fomo-podcast-secret-key-2025"

# Telegram (@Podcast_FOMO_bot)
TELEGRAM_BOT_TOKEN="8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E"
TELEGRAM_CHANNEL_ID="-1003133850361"

# LiveKit (fomo-bxb0f38x)
LIVEKIT_URL="wss://fomo-bxb0f38x.livekit.cloud"
LIVEKIT_API_KEY="APIqNLg599MoAHc"
LIVEKIT_API_SECRET="9wWu3BHo199HEcvcE22KMpcuSDfqy7K7TA5oXEOaXae"
```

---

## Архитектура Live Streaming

### Flow:
1. Admin создаёт сессию через `/live-management`
2. Сессия получает статус `live`
3. Пользователи подключаются через WebSocket
4. Чат, реакции, hand raise работают в real-time
5. Для аудио - генерируется LiveKit token
6. При завершении - уведомление в Telegram

### WebSocket Endpoint:
```
WS /api/live-sessions/ws/{session_id}
Query params: user_id, username, role
```

### LiveKit Token Endpoint:
```
POST /api/live-sessions/livekit/token
Body: {session_id, user_id, username}
```

---

## Telegram Боты

### 1. Notification Bot
- Username: @Podcast_FOMO_bot
- Функции: уведомления о стримах
- Файл: `/app/backend/services/telegram_service.py`

### 2. Recording Bot
- Слушает канал @Podcast_F
- Создаёт подкасты из записей
- Файл: `/app/backend/telegram_recording_bot.py`
- Запуск: Supervisor

---

## Страницы

| URL | Компонент | Описание |
|-----|-----------|----------|
| `/` | Home.jsx | Главная, статистика |
| `/live-management` | LiveManagement.jsx | Управление стримами |
| `/live/{id}` | LiveRoomView.jsx | Live комната |
| `/lives` | LiveStreams.jsx | Список стримов |
| `/admin` | AdminPanel.jsx | Админка |
| `/members` | Members.jsx | Участники |
| `/library` | Library.jsx | Подкасты |
| `/progress` | Progress.jsx | XP прогресс |
| `/analytics` | ClubAnalytics.jsx | Аналитика |

---

## Supervisor Services

```
backend                  - FastAPI сервер (port 8001)
frontend                 - React dev server (port 3000)
mongodb                  - MongoDB
telegram_recording_bot   - Telegram bot
```

Команды:
```bash
sudo supervisorctl status
sudo supervisorctl restart all
sudo supervisorctl restart backend
```

Логи:
```bash
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/telegram_bot.out.log
```

---

## База данных

### Collections:
- `users` - пользователи
- `podcasts` - подкасты
- `live_sessions` - live сессии
- `club_settings` - настройки клуба
- `xp_transactions` - XP транзакции
- `badges` - бейджи
- `push_subscriptions` - PWA подписки
- `notifications` - уведомления

---

*Обновлено: 2026-01-03*
