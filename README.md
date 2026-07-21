# 🛡️ WatchDogs — Tourist Safety Platform

A full-stack MERN application for real-time tourist safety monitoring, emergency response, and community-driven safety reporting.

## 📁 Repository Structure

```
mernv2/
├── WatchDogs/
│   ├── watchdogs-backend/   # Node.js + Express + MongoDB API
│   └── watchdogs-frontend/  # React + Vite SPA
├── render.yaml              # Render.com deployment config
└── .gitignore
```

---

## 🚀 Features

- **Auth** — JWT-based registration, login, protected routes
- **Real-Time Location** — GPS tracking, safety check-ins, nearby user detection (Socket.io)
- **Community Safety** — Submit/upvote/downvote reports (safe / caution / danger / info)
- **Document Vault** — Upload & track passports, visas, insurance with expiry alerts
- **Emergency SOS** — Multi-level alerts, auto-notify emergency contacts, location broadcast
- **AI Insights** — Safety predictions, cultural tips, emergency phrase translation, local alerts

---

## 🛠️ Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 18, React Router, Vite, Socket.io-client  |
| Backend   | Node.js, Express 5, Socket.io                   |
| Database  | MongoDB + Mongoose (geospatial indexes)          |
| Auth      | JWT + bcrypt                                    |
| AI        | Google Generative AI (`@google/generative-ai`)  |
| Maps      | Google Maps Services JS                         |
| SMS/Email | Twilio, Nodemailer                              |
| Deploy    | Render (backend), Vercel (frontend)             |

---

## ⚡ Quick Start

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- MongoDB (local or Atlas)

### 1. Clone & install

```bash
git clone <repo-url>
cd mernv2

# Backend
cd WatchDogs/watchdogs-backend
npm install

# Frontend
cd ../watchdogs-frontend
npm install
```

### 2. Configure environment

Copy and fill in the backend env file:

```bash
cd WatchDogs/watchdogs-backend
cp .env.example .env
```

Key variables:

| Variable              | Description                              |
|-----------------------|------------------------------------------|
| `MONGODB_URI`         | MongoDB connection string                |
| `JWT_SECRET`          | Strong random secret                     |
| `PORT`                | Server port (default `5000`)             |
| `CLIENT_URL`          | Frontend origin for CORS                 |
| `EMAIL_USER/PASS`     | Nodemailer SMTP credentials              |
| `GOOGLE_MAPS_API_KEY` | Google Maps (optional)                   |
| `TWILIO_*`            | Twilio SMS credentials (optional)        |

### 3. Run locally

```bash
# Terminal 1 — backend (http://localhost:5000)
cd WatchDogs/watchdogs-backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd WatchDogs/watchdogs-frontend
npm run dev
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint                     | Description       |
|--------|------------------------------|-------------------|
| POST   | `/api/auth/register`         | Register user     |
| POST   | `/api/auth/login`            | Login             |
| GET    | `/api/auth/me`               | Current user      |
| PUT    | `/api/auth/update-password`  | Change password   |

### User Management
| Method | Endpoint                            | Description            |
|--------|-------------------------------------|------------------------|
| GET    | `/api/users/profile`                | Get profile            |
| PUT    | `/api/users/profile`                | Update profile         |
| POST   | `/api/users/emergency-contacts`     | Add emergency contact  |
| PUT    | `/api/users/emergency-contacts/:id` | Update contact         |
| DELETE | `/api/users/emergency-contacts/:id` | Delete contact         |
| PUT    | `/api/users/medical-info`           | Update medical info    |
| DELETE | `/api/users/account`                | Delete account         |

### Location
| Method | Endpoint                         | Description          |
|--------|----------------------------------|----------------------|
| POST   | `/api/location/update`           | Update GPS location  |
| GET    | `/api/location/current`          | Current location     |
| GET    | `/api/location/history`          | Location history     |
| POST   | `/api/location/check-in`         | Public check-in      |
| GET    | `/api/location/nearby-checkins`  | Nearby check-ins     |

### Safety Reports
| Method | Endpoint                    | Description         |
|--------|-----------------------------|---------------------|
| POST   | `/api/reports/create`       | Create report       |
| GET    | `/api/reports/feed`         | Community feed      |
| GET    | `/api/reports/nearby`       | Nearby reports      |
| POST   | `/api/reports/:id/upvote`   | Upvote              |
| POST   | `/api/reports/:id/downvote` | Downvote            |
| DELETE | `/api/reports/:id`          | Delete own report   |
| GET    | `/api/reports/stats`        | Community stats     |

### Documents
| Method | Endpoint                          | Description            |
|--------|-----------------------------------|------------------------|
| POST   | `/api/documents/upload`           | Upload document        |
| GET    | `/api/documents/list`             | List all documents     |
| GET    | `/api/documents/:id`              | Document details       |
| GET    | `/api/documents/:id/download`     | Download document      |
| PUT    | `/api/documents/:id`              | Update document        |
| DELETE | `/api/documents/:id`              | Delete document        |
| GET    | `/api/documents/expiring/soon`    | Expiring documents     |

### Emergency
| Method | Endpoint                       | Description           |
|--------|--------------------------------|-----------------------|
| POST   | `/api/emergency/trigger`       | Trigger SOS alert     |
| PUT    | `/api/emergency/:id/resolve`   | Resolve emergency     |
| PUT    | `/api/emergency/:id/cancel`    | Cancel emergency      |
| GET    | `/api/emergency/status`        | Active emergency      |
| GET    | `/api/emergency/history`       | Emergency history     |
| POST   | `/api/emergency/:id/response`  | Add response note     |

### AI
| Method | Endpoint                      | Description                    |
|--------|-------------------------------|--------------------------------|
| POST   | `/api/ai/safety-prediction`   | Safety prediction for location |
| POST   | `/api/ai/recommendations`     | Smart recommendations          |
| GET    | `/api/ai/cultural-tips`       | Cultural etiquette tips        |
| POST   | `/api/ai/translate`           | Emergency phrase translation   |
| GET    | `/api/ai/local-alerts`        | Local alerts                   |

All protected routes require:
```
Authorization: Bearer <jwt-token>
```

---

## 🔌 WebSocket Events (Socket.io)

### Client → Server
```js
socket.emit('location:update', data)
socket.emit('report:new', data)
socket.emit('checkin:new', data)
socket.emit('emergency:trigger', data)
```

### Server → Client
```js
socket.on('location:new', data)
socket.on('report:added', data)
socket.on('checkin:added', data)
socket.on('emergency:alert', data)
socket.on('emergency:resolved', data)
```

---

## 🚢 Deployment

### Backend — Render

A [`render.yaml`](./render.yaml) is already configured. Set these environment variables in the Render dashboard:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL` (your Vercel frontend URL)

### Frontend — Vercel

```bash
cd WatchDogs/watchdogs-frontend
npm run build
# deploy dist/ to Vercel, or connect the repo via Vercel dashboard
```

Set `VITE_API_URL` in Vercel to point at your Render backend URL.

---

## 🔒 Security

- Helmet.js HTTP headers
- CORS restricted to `CLIENT_URL`
- JWT authentication + bcrypt password hashing
- Rate limiting on all routes
- Input validation (express-validator)
- File upload restrictions (5 MB max, JPEG/PNG/PDF/DOC only)

---

## 📄 License

ISC
