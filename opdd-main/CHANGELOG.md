# Changelog

Все значимые изменения проекта.

## [2.0.0] - 2026-01-03

### Добавлено

#### Live Streaming System
- WebSocket endpoint `/api/live-sessions/ws/{session_id}` для real-time взаимодействия
- Real-time чат с историей сообщений
- Emoji реакции (👍❤️🔥👏🎉😂🤔) с анимацией
- Система "поднятых рук" — слушатели могут запросить слово
- Повышение/понижение участников (speaker ↔ listener)
- LiveKit WebRTC интеграция для аудио комнат
- LiveKit token generation API

#### Security
- Auth middleware (`/app/backend/middleware/auth.py`)
- Защита admin endpoints через X-Wallet-Address header
- Валидация кошельков против club_settings

#### Gamification
- Auto XP rewards за участие в live sessions:
  - Вход в сессию: +10 XP
  - Каждые 5 минут: +5 XP
  - Сообщение в чат: +2 XP (max 20/session)
  - Реакция: +1 XP (max 10/session)
  - Поднятие руки: +5 XP
  - Повышение до speaker: +50 XP

#### Telegram Integration
- Уведомления о начале/завершении стримов
- Recording Bot для канала @Podcast_F
- Автосоздание подкастов из записей канала
- API endpoints:
  - `GET /api/live-sessions/recordings`
  - `POST /api/live-sessions/recordings/sync`

### Изменено
- `/lives` страница теперь использует `/api/live-sessions/sessions`
- Тёмная тема для live room UI
- Улучшен LiveRoomView.jsx с LiveKit SDK

### Исправлено
- Badges leaderboard — обработка string/dict форматов
- Session end notifications — добавлена статистика

---

## [1.0.0] - 2026-01-02

### Добавлено

#### Admin Panel
- Страница `/admin` для управления кошельками
- Owner/Admin wallet configuration
- MetaMask wallet-based authentication

#### UI Refactoring
- Убран Social Hub, добавлены отдельные Messages/Alerts
- Unified Analytics page с табами
- Упрощённый Create Podcast flow

#### Database
- `init_demo_users.py` — создание тестовых пользователей
- `create_full_demo_data.py` — полный seed данных

#### Live Sessions Foundation
- API endpoints для создания/управления сессиями
- LiveManagement.jsx — UI управления
- LiveRoomView.jsx — UI просмотра

### Исправлено
- Badges API — ошибка типов данных
- Progress page — пустая страница

---

## [0.1.0] - Initial

- Базовый проект из GitHub
- FastAPI + React + MongoDB
- Podcast CRUD
- User authentication
- Comments & reactions
