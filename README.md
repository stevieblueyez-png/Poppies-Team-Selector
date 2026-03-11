# Grassroots Football Team Manager

A mobile app for managing your grassroots football team roster, player availability, and generating optimal lineups.

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

- **Frontend**: Expo (React Native)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB

---

## 🚀 Deployment Options

### Important: This is a Mobile App

This project is an **Expo React Native mobile application**, not a web app. Therefore:
- ❌ **Cannot deploy to Vercel** (Vercel is for web apps)
- ❌ **Cannot deploy to Netlify** (Netlify is for web apps)
- ✅ **Use EAS (Expo Application Services)** for mobile app builds
- ✅ **Deploy backend separately** to a cloud service

---

## Backend Deployment

### Option 1: Emergent Deployment (Easiest)
If you built this in Emergent, use the built-in deployment feature (50 credits/month).

### Option 2: Manual Deployment (Railway, Render, Fly.io)

**Required Environment Variables:**
```bash
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=football_team_manager
```

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

### Option 3: Docker Deployment

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## Mobile App Deployment (EAS Build)

### Prerequisites
1. Install EAS CLI: `npm install -g eas-cli`
2. Create Expo account: https://expo.dev
3. Login: `eas login`

### Configure EAS
```bash
cd frontend
eas build:configure
```

### Build Commands

**Development Build (for testing):**
```bash
eas build --profile development --platform all
```

**Production Build (for app stores):**
```bash
# iOS (requires Apple Developer account)
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

### Update Backend URL for Production
Before building, update `frontend/.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://your-deployed-backend-url.com
```

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
expo start
```

---

## Environment Variables

### Backend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | Database name | `football_team_manager` |

### Frontend (.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_BACKEND_URL` | Backend API URL | `https://api.yourapp.com` |

---

## Database Setup (MongoDB Atlas - Free Tier)

1. Create account at https://www.mongodb.com/atlas
2. Create free M0 cluster
3. Add database user
4. Get connection string
5. Add to backend `.env`

---

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI application
│   ├── requirements.txt   # Python dependencies
│   ├── .env              # Environment variables
│   └── .env.example      # Environment template
├── frontend/
│   ├── app/
│   │   └── index.tsx     # Main app screen
│   ├── package.json      # Node dependencies
│   ├── .env              # Environment variables
│   └── .env.example      # Environment template
└── README.md
```

---

## Support

For issues with:
- **Emergent deployment**: Contact Emergent support
- **EAS builds**: Visit https://docs.expo.dev/build/introduction/
- **App store submission**: Follow platform-specific guidelines
