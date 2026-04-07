# n4mint - AI Transcription with Spy Chase Gamification

A cyberpunk-themed transcription SaaS where users play a spy chase game while their files are being processed.

![n4mint Logo](app/public/static/combined.PNG)

## The Concept

Instead of waiting bored while files transcribe, users become spies waiting for an informant. Once the informant arrives (file uploaded), they must escape in their getaway car while the evidence is processed. The longer they survive, the higher their score!

## Features

### Transcription
- Upload video/audio files
- Raw transcript with timestamps
- Cleaned transcript (AI removes filler words)
- Summary generation
- Viral clip suggestions

### The Game: Spy Chase
- **Waiting Phase**: Your spy waits for the informant to arrive
- **Driving Phase**: Navigate 3 lanes, dodge obstacles
- **Tip-Off Events**: Random police alerts - escape routes compromised!
- **Obstacles**: Enemy cars, road barriers, oil slicks
- **Scoring**: Points for survival time and dodging obstacles
- **Leaderboard**: Global and personal high scores

### Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind
- **Backend**: FastAPI (Python)
- **Auth**: Supabase
- **AI**: OpenAI Whisper + GPT-4o-mini
- **Game**: HTML5 Canvas with custom rendering

## Project Structure

```
/mnt/okcomputer/output/
├── app/                    # React Frontend
│   ├── src/
│   │   ├── App.tsx        # Main app with screens
│   │   ├── components/
│   │   │   ├── SpyChaseGame.tsx   # The car chase game
│   │   │   └── Leaderboard.tsx    # Score leaderboard
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx    # Supabase auth
│   │   └── services/
│   │       └── api.ts       # API client
│   └── dist/               # Built frontend
├── backend/                # FastAPI Backend
│   ├── main.py            # API endpoints
│   └── requirements.txt
└── README.md
```

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-api.koyeb.app
```

### Backend
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
SUPABASE_JWT_SECRET=
OPENAI_API_KEY=
```

## Database Setup (Supabase)

Create `users` table:
```sql
create table users (
  id uuid references auth.users primary key,
  email text not null
);
```

Create `jobs` table:
```sql
create table jobs (
  id uuid primary key,
  user_id uuid references users(id),
  filename text,
  duration float,
  modes text[],
  status text default 'queued',
  progress int default 0,
  output_files jsonb,
  error text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
```

Create `scores` table:
```sql
create table scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  score int,
  survival_time float,
  created_at timestamptz default now()
);
```

## Deployment

### Frontend
```bash
cd app
npm install
npm run build
# Deploy dist/ folder
```

### Backend (Koyeb)
```bash
cd backend
# Deploy with Dockerfile or Procfile
```

## Game Controls

- **Desktop**: Arrow keys to switch lanes
- **Mobile**: Swipe left/right to switch lanes
- **Goal**: Survive as long as possible!

## Live Demo

**Frontend**: https://gvne6jrmespna.ok.kimi.link

---

**Every word leaves a trace. Every escape earns you glory.**
