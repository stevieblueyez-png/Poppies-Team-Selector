# Grassroots Football Team Manager

A mobile & web app for managing your grassroots football team roster, player availability, and generating optimal lineups.

## Features

- **Squad Roster**: Add/edit/remove players with positions (GK, CB, RB, etc.) and ratings (1-5)
- **Preferred Foot**: Track left/right foot preference for each player
- **Weekly Availability**: Mark which players are available for this week's match
- **Lineup Generator**: Auto-generate best starting XI based on available players
- **Formation Selection**: 4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2, 4-1-4-1, 3-4-3
- **Selection Modes**: Toggle between "Strongest XI" and "Balanced" lineups
- **Heatmap**: Visual pitch heatmap showing team strength zones
- **Save Lineup**: Download lineup as image for sharing

## Tech Stack

- **Frontend**: Expo (React Native) with Web support
- **Backend**: FastAPI (Python)
- **Database**: MongoDB

---

## ✅ Web Deployment (Vercel)

This Expo app **supports web deployment** via `react-native-web`.

### Prerequisites
1. Deploy your backend first (see Backend Deployment section)
2. Get your deployed backend URL

### Deploy to Vercel

**Option 1: Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Set environment variable for backend URL
cd /app
vercel env add EXPO_PUBLIC_BACKEND_URL production
# Enter your backend URL when prompted

# Deploy
vercel --prod
```

**Option 2: Vercel Dashboard**
1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Configure:
   - **Build Command**: `cd frontend && npx expo export --platform web`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `cd frontend && yarn install`
4. Add environment variable:
   - `EXPO_PUBLIC_BACKEND_URL` = your backend URL
5. Deploy

### Local Web Build

```bash
cd frontend

# Build for web
yarn web:build
# or
npx expo export --platform web

# Preview locally
yarn web:serve
# or
npx serve dist
```

**Output**: Static files in `frontend/dist/` folder

---

## 📱 Mobile Deployment (EAS Build)

### Prerequisites
1. Install EAS CLI: `npm install -g eas-cli`
2. Create Expo account: https://expo.dev
3. Login: `eas login`

### Build Commands

```bash
cd frontend

# Configure EAS
eas build:configure

# Development Build
eas build --profile development --platform all

# Production Build (for app stores)
eas build --profile production --platform ios
eas build --profile production --platform android
```

---

## Backend Deployment

### Option 1: Emergent Deployment
Use the built-in deployment feature (50 credits/month).

### Option 2: Railway / Render / Fly.io

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

**Required Environment Variables:**
```bash
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=football_team_manager
```

---

## Environment Variables

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | Database name | `football_team_manager` |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_BACKEND_URL` | Backend API URL | `https://your-api.railway.app` |

---

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install

# Start for all platforms
yarn start

# Web only
yarn web

# iOS only
yarn ios

# Android only
yarn android
```

---

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   ├── .env.example       # Environment template
│   └── Procfile          # Deployment config
├── frontend/
│   ├── app/
│   │   └── index.tsx     # Main app screen
│   ├── dist/             # Web build output (generated)
│   ├── package.json      # Node dependencies
│   ├── app.json          # Expo configuration
│   └── .env.example      # Environment template
├── vercel.json           # Vercel deployment config
└── README.md
```

---

## Database Setup (MongoDB Atlas - Free)

1. Create account at https://www.mongodb.com/atlas
2. Create free M0 cluster
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for all)
5. Get connection string
6. Add to backend `.env`

---

## Quick Start Commands

| Action | Command |
|--------|---------|
| Build for web | `cd frontend && yarn web:build` |
| Preview web locally | `cd frontend && yarn web:serve` |
| Deploy to Vercel | `vercel --prod` |
| Start dev server | `cd frontend && yarn start` |
| Run backend | `cd backend && uvicorn server:app --reload` |
