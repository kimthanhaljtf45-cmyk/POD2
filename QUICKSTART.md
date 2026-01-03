# ⚡ Быстрый запуск FOMO Podcasts Platform

## Шаг 1: Проверьте ключи

Откройте `/app/backend/.env` и убедитесь что ключи на месте:

```env
# MongoDB
MONGO_URL="mongodb://localhost:27017"
DB_NAME="fomo_voice_club"

# JWT
JWT_SECRET_KEY="fomo-podcast-secret-key-2025"

# Telegram
TELEGRAM_BOT_TOKEN="8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E"
TELEGRAM_CHANNEL_ID="-1003133850361"

# LiveKit
LIVEKIT_URL="wss://fomo-bxb0f38x.livekit.cloud"
LIVEKIT_API_KEY="APIqNLg599MoAHc"
LIVEKIT_API_SECRET="9wWu3BHo199HEcvcE22KMpcuSDfqy7K7TA5oXEOaXae"
```

---

## Шаг 2: Установите зависимости

### Backend:
```bash
cd /app/backend
pip install -r requirements.txt
```

### Frontend:
```bash
cd /app/frontend
yarn install
```

---

## Шаг 3: Инициализируйте базу данных

```bash
cd /app/backend
python init_demo_users.py
python create_full_demo_data.py
```

Это создаст:
- 3 демо пользователя (owner, admin, member)
- 1 тестовый подкаст
- 1 тестовую live сессию
- Бейджи и XP

---

## Шаг 4: Запустите сервисы

```bash
sudo supervisorctl restart all
sudo supervisorctl status
```

Должны быть RUNNING:
- backend
- frontend
- mongodb
- telegram_recording_bot

---

## Шаг 5: Проверьте работу

### API:
```bash
curl http://localhost:8001/api/
```
Ответ: `{"message":"FOMO Podcast API","version":"6.0..."}`

### Telegram Bot:
```bash
curl "https://api.telegram.org/bot8293451127:AAEVo5vQV_vJqoziVTDKHYJiOYUZQN-2M2E/getMe"
```
Ответ: `{"ok":true,"result":{"username":"Podcast_FOMO_bot"...}}`

### LiveKit Token:
```bash
curl -X POST http://localhost:8001/api/live-sessions/livekit/token \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test","user_id":"user1","username":"Test"}'
```
Ответ: `{"token":"...","url":"wss://fomo-bxb0f38x.livekit.cloud","mock_mode":false}`

---

## Шаг 6: Откройте в браузере

- **Frontend**: http://localhost:3000 или ваш домен
- **Admin Panel**: /admin
- **Live Management**: /live-management

---

## 🔧 Частые проблемы

### Backend не запускается:
```bash
tail -n 50 /var/log/supervisor/backend.err.log
```

### Frontend не компилируется:
```bash
tail -n 50 /var/log/supervisor/frontend.err.log
```

### Telegram bot не работает:
1. Проверьте токен в `.env`
2. Проверьте что бот добавлен в канал как админ
3. `sudo supervisorctl restart telegram_recording_bot`

### LiveKit не подключается:
1. Проверьте ключи в `.env`
2. Проверьте URL: должен быть `wss://` не `https://`

---

## 📱 Демо аккаунты

| ID | Роль | XP |
|----|------|-----|
| demo-owner-001 | Owner | 10,000 |
| demo-admin-002 | Admin | 5,000 |
| demo-user-003 | Member | 500 |

---

## 🎯 Что делать дальше?

1. **Настройте админку** → /admin → введите свой кошелек
2. **Создайте live сессию** → /live-management → Create
3. **Проверьте стриминг** → войдите в live комнату
4. **Telegram** → уведомления должны приходить в @Podcast_F

---

*Готово! Платформа запущена.* 🚀
