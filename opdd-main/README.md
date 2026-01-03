# FOMO Podcasts Platform

Private Voice Club platform for podcast creators with live streaming, gamification, and Telegram integration.

## 🚀 Features

### Core Platform
- **Podcast Management** — Create, edit, and manage audio podcasts
- **Live Streaming** — Real-time audio rooms with WebRTC (LiveKit)
- **Gamification** — XP system, badges, levels, and leaderboards
- **Social Features** — Comments, messages, followers, and alerts

### Authentication & Roles
- **MetaMask Wallet Auth** — Web3-based authentication
- **Role System** — Owner, Admin, Member roles
- **Admin Panel** — Manage wallets and permissions at `/admin`

### Live Sessions
- **WebSocket Chat** — Real-time messages and emoji reactions
- **Hand Raise Queue** — Listeners can request to speak
- **LiveKit Audio** — WebRTC-based audio rooms for speakers
- **Auto XP Rewards** — Earn XP for participation

### Telegram Integration
- **Notifications** — Auto-notify users when streams start/end
- **Recording Bot** — Auto-save channel recordings as podcasts
- **OAuth Login** — Connect Telegram for personal alerts

## 📦 Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Tailwind CSS, Shadcn/UI |
| Backend | FastAPI, Python 3.11 |
| Database | MongoDB (Motor async driver) |
| Real-time | WebSockets, LiveKit WebRTC |
| Auth | MetaMask (Web3), JWT |
| Bot | Telegram Bot API |

## 🛠️ Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB 6+
- LiveKit account (optional, for audio)

### 1. Clone & Install

```bash
git clone https://github.com/DDDDDuf/podaa.git
cd podaa

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
yarn install
```

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=fomo_voice_club
JWT_SECRET_KEY=your-secret-key-change-in-production
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHANNEL_ID=-1003133850361
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
```

**Frontend** (`frontend/.env`):
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3. Initialize Database

```bash
cd backend
python init_demo_users.py        # Create demo users
python create_full_demo_data.py  # Seed demo content
```

### 4. Run Services

```bash
# Terminal 1 - Backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Frontend
cd frontend
yarn start
```

### 5. Access Application
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8001/docs
- **Admin Panel**: http://localhost:3000/admin

## 📁 Project Structure

```
podaa/
├── backend/
│   ├── routes/              # API endpoints
│   │   ├── admin_panel.py   # Wallet management
│   │   ├── live_sessions.py # Live streaming + WebSocket
│   │   ├── podcasts.py      # Podcast CRUD
│   │   ├── xp.py            # XP & levels
│   │   ├── badges.py        # Badge system
│   │   └── telegram.py      # Telegram integration
│   ├── services/
│   │   └── telegram_service.py
│   ├── middleware/
│   │   └── auth.py          # Auth middleware
│   ├── server.py            # FastAPI app
│   ├── telegram_recording_bot.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LiveRoomView.jsx    # Live room UI
│   │   │   ├── LiveManagement.jsx  # Session management
│   │   │   ├── AdminPanel.jsx      # Admin settings
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── ui/          # Shadcn components
│   │   │   └── Navigation.jsx
│   │   └── App.js
│   └── package.json
├── recordings/              # Downloaded recordings
├── memory/
│   └── PRD.md              # Product requirements
└── README.md
```

## 🔑 API Endpoints

### Live Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/live-sessions/sessions` | List all sessions |
| POST | `/api/live-sessions/sessions` | Create session (Admin) |
| POST | `/api/live-sessions/sessions/{id}/start` | Start stream (Admin) |
| POST | `/api/live-sessions/sessions/{id}/end` | End stream (Admin) |
| WS | `/api/live-sessions/ws/{id}` | WebSocket for live room |
| POST | `/api/live-sessions/livekit/token` | Get LiveKit token |

### XP & Gamification
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/xp/leaderboard` | XP rankings |
| GET | `/api/xp/levels` | Level definitions |
| GET | `/api/badges/available` | All badges |
| GET | `/api/badges/user/{id}` | User's badges |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/settings` | Get wallet config |
| POST | `/api/admin/settings` | Update wallets (Owner) |

## 🎮 XP System

| Action | XP Reward |
|--------|-----------|
| Join live session | +10 |
| Every 5 minutes | +5 |
| Send chat message | +2 (max 20/session) |
| Send reaction | +1 (max 10/session) |
| Raise hand | +5 |
| Promoted to speaker | +50 |

## 🤖 Telegram Bot Setup

1. Create bot via [@BotFather](https://t.me/BotFather)
2. Add bot as admin to your channel
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHANNEL_ID` in `.env`
4. Bot will auto-notify on stream start/end
5. Recordings posted to channel become podcasts

## 🔊 LiveKit Setup (Optional)

For real WebRTC audio:
1. Create account at [livekit.io](https://livekit.io)
2. Create a new project
3. Copy API Key, Secret, and Server URL
4. Add to backend `.env`

Without LiveKit, platform works in "mock mode" (no actual audio).

## 🛡️ Security

- Admin endpoints require `X-Wallet-Address` header
- Wallet validated against `club_settings` collection
- Only Owner can modify admin wallets
- JWT tokens for authenticated requests

## 📄 License

MIT License

## 🙏 Credits

Built with FastAPI, React, MongoDB, LiveKit, and Telegram Bot API.
