# FOMO Podcasts Platform - Product Requirements

## Обзор продукта

FOMO Podcasts — приватная платформа для подкастеров с live-стримингом, gamification и Telegram интеграцией.

## Текущее состояние (v2.0.0)

### ✅ Полностью реализовано

#### Аутентификация
- MetaMask wallet подключение
- Роли: Owner, Admin, Member
- Admin Panel (`/admin`) для управления кошельками
- Backend middleware защита endpoints

#### Live Streaming
- Создание/управление сессиями
- WebSocket real-time:
  - Чат с историей
  - Emoji реакции
  - Hand raise queue
  - Promote/demote участников
- LiveKit WebRTC аудио (требует ключи)
- Статистика сессий (длительность, участники)

#### Gamification
- XP система с авто-наградами
- 5 уровней (Newcomer → Legend)
- 14+ бейджей
- Лидерборды по XP и бейджам

#### Telegram
- Бот `@Podcast_FOMO_bot`
- Уведомления о стримах (start/end)
- Recording Bot для `@Podcast_F`
- OAuth подключение для личных алертов

#### Контент
- Podcast CRUD
- Комментарии и реакции
- Библиотека с плейлистами
- RSS генерация

### 🔧 Требует внешней настройки

| Компонент | Статус | Требования |
|-----------|--------|------------|
| LiveKit Audio | ⚠️ Mock mode | LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET |
| Telegram Bot | ✅ Работает | Токен уже настроен |
| Recording Bot | ⚠️ Manual | Требует запуска `python telegram_recording_bot.py` |

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐│
│  │ Podcasts│ │  Live   │ │ Profile │ │  Admin Panel    ││
│  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘│
└───────┼──────────┼──────────┼─────────────────┼─────────┘
        │          │          │                 │
        ▼          ▼          ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐│
│  │Podcasts │ │Sessions │ │  XP &   │ │    Telegram     ││
│  │  API    │ │WebSocket│ │ Badges  │ │    Service      ││
│  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘│
└───────┼──────────┼──────────┼─────────────────┼─────────┘
        │          │          │                 │
        ▼          ▼          ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                      MongoDB                             │
│  users, podcasts, live_sessions, xp_transactions,       │
│  badges, comments, club_settings, processed_recordings  │
└─────────────────────────────────────────────────────────┘
```

## Ключевые API

### Live Sessions
```
GET    /api/live-sessions/sessions          # Список сессий
POST   /api/live-sessions/sessions          # Создать (Admin)
POST   /api/live-sessions/sessions/{id}/start  # Старт (Admin)
POST   /api/live-sessions/sessions/{id}/end    # Завершить (Admin)
WS     /api/live-sessions/ws/{id}           # WebSocket
POST   /api/live-sessions/livekit/token     # LiveKit токен
GET    /api/live-sessions/recordings        # Записи
POST   /api/live-sessions/recordings/sync   # Синхронизация
```

### XP & Badges
```
GET    /api/xp/leaderboard                  # Рейтинг XP
GET    /api/xp/levels                       # Уровни
GET    /api/badges/available                # Все бейджи
GET    /api/badges/leaderboard              # Рейтинг бейджей
```

### Admin
```
GET    /api/admin/settings                  # Настройки
POST   /api/admin/settings                  # Обновить (Owner)
```

## XP Награды

| Действие | XP | Лимит |
|----------|-----|-------|
| Вход в сессию | +10 | — |
| Каждые 5 минут | +5 | — |
| Сообщение в чат | +2 | 20/сессия |
| Реакция | +1 | 10/сессия |
| Поднятие руки | +5 | — |
| Повышение до speaker | +50 | — |

## База данных

### Основные коллекции
- `users` — пользователи с XP и бейджами
- `podcasts` — подкасты
- `live_sessions` — live сессии
- `club_settings` — настройки клуба (owner, admins)
- `xp_transactions` — история XP
- `processed_recordings` — обработанные записи

## Следующие шаги (Backlog)

### P1 — Production Ready
- [ ] Supervisor для Recording Bot
- [ ] Звуковые уведомления в чате
- [ ] Аватары в live room

### P2 — Расширение
- [ ] Расписание сессий с напоминаниями
- [ ] Push уведомления (PWA)
- [ ] Расширенная аналитика
- [ ] Система приглашений
- [ ] Монетизация (донаты, подписки)

## Файлы проекта

```
/app/
├── README.md           # Основная документация
├── QUICKSTART.md       # Быстрый старт
├── TASKS.md            # Актуальные задачи
├── CHANGELOG.md        # История изменений
├── backend/
│   ├── server.py       # FastAPI приложение
│   ├── routes/         # API endpoints
│   ├── middleware/     # Auth middleware
│   ├── services/       # Telegram service
│   └── telegram_recording_bot.py
├── frontend/
│   ├── src/pages/      # React страницы
│   └── src/components/ # UI компоненты
└── recordings/         # Скачанные записи
```

---

*Последнее обновление: 2026-01-03*
