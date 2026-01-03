# TASKS - Текущие задачи

## ✅ Реализовано (Полностью работает)

### Core Features
- [x] Live Streaming с WebSocket чатом
- [x] Emoji реакции в real-time (👍❤️🔥👏🎉😄😢)
- [x] Hand Raise система (поднятие руки)
- [x] Promote/Demote участников (speaker/listener)
- [x] Аватары с цветами по имени
- [x] Звуковые уведомления при новых сообщениях

### LiveKit Audio
- [x] WebRTC аудио стриминг
- [x] Token generation API
- [x] Join Audio Room кнопка
- [x] Ключи настроены в .env

### Telegram Integration
- [x] Notification Bot (@Podcast_FOMO_bot)
- [x] Recording Bot (автосоздание подкастов)
- [x] Channel уведомления (@Podcast_F)
- [x] Supervisor для recording bot

### Admin & Management
- [x] Admin Panel без авторизации
- [x] Live Management через навигацию
- [x] Create/View/End сессий
- [x] Управление кошельками

### UI/UX
- [x] Live уведомления на главной ("🔴 Live Now!")
- [x] Навигация с кнопкой Live
- [x] Тёмная тема для live room
- [x] PWA Push Notifications

### Gamification
- [x] XP система с уровнями
- [x] Badges
- [x] Leaderboard
- [x] Progress страница

---

## 🔑 Ключи API

Все ключи находятся в `/app/backend/.env`:

| Сервис | Ключ | Значение |
|--------|------|----------|
| Telegram Bot | TELEGRAM_BOT_TOKEN | `8293451127:AAEVo5vQV_...` |
| Telegram Channel | TELEGRAM_CHANNEL_ID | `-1003133850361` |
| LiveKit URL | LIVEKIT_URL | `wss://fomo-bxb0f38x.livekit.cloud` |
| LiveKit API Key | LIVEKIT_API_KEY | `APIqNLg599MoAHc` |
| LiveKit Secret | LIVEKIT_API_SECRET | `9wWu3BHo199HEcvc...` |

---

## 📁 Важные файлы

| Файл | Описание |
|------|----------|
| `/app/backend/.env` | **ВСЕ КЛЮЧИ ЗДЕСЬ** |
| `/app/backend/routes/live_sessions.py` | Live streaming + WebSocket |
| `/app/backend/telegram_recording_bot.py` | Telegram recording bot |
| `/app/frontend/src/pages/LiveRoomView.jsx` | Live комната UI |
| `/app/frontend/src/pages/LiveManagement.jsx` | Управление стримами |

---

## ⏳ Backlog (Будущее развитие)

### P2 - Можно сделать позже
- [ ] Интеграция с Twitter/Discord
- [ ] Платные подписки
- [ ] Донаты во время стримов
- [ ] Экспорт записей в MP3

---

*Обновлено: 2026-01-03*
