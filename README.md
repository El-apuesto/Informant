# n4mint

AI-powered transcription and content extraction platform. Convert audio/video to text, clean transcripts, generate summaries, and identify viral clip segments.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS v3 |
| Backend | FastAPI (Python 3.11) |
| Auth | Supabase Auth |
| Database | Supabase (Postgres) |
| File Storage | Supabase Storage |
| AI | Groq SDK (Whisper + Llama) |
| Payments | Stripe |

## Database Schema

Run this SQL in the Supabase SQL Editor:

```sql
-- profiles: extends Supabase auth.users
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  subscription_tier text not null default 'free',  -- 'free' | 'plus' | 'pro'
  stripe_customer_id text,
  jobs_used_this_month int not null default 0,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- jobs: one row per processing job
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  filename text not null,
  duration_seconds float,
  modes text[] not null,
  status text not null default 'queued',   -- queued | processing | completed | failed
  progress int not null default 0,         -- 0-100
  output_urls jsonb not null default '{}', -- {"transcript": url, "clean": url, ...}
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- RLS
alter table profiles enable row level security;
alter table jobs enable row level security;

create policy "Users read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users manage own jobs"
  on jobs for all using (auth.uid() = user_id);
```

## Environment Variables

### Frontend (`app/.env`)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=https://your-backend.koyeb.app
```

### Backend (`backend/.env`)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=gsk_...
GROQ_API_KEY_3=gsk_...

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLUS_MONTHLY_PRICE_ID=price_...
STRIPE_PLUS_ANNUAL_PRICE_ID=price_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...

APP_URL=https://your-frontend.vercel.app
```

## Deployment

### Frontend (Vercel)

1. Push the `app/` directory to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Backend (Koyeb)

1. Push the `backend/` directory to GitHub
2. Create new service on Koyeb
3. Select Dockerfile deployment
4. Set environment variables
5. Deploy

### Stripe Webhook Setup

1. In Stripe Dashboard, create a webhook endpoint
2. URL: `https://your-backend.koyeb.app/stripe-webhook`
3. Subscribe to events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Supabase Storage

1. Create a bucket named `outputs`
2. Set bucket to public
3. Configure CORS if needed

## Subscription Tiers

| Tier | Monthly Jobs | Modes Available | Price |
|------|--------------|-----------------|-------|
| Free | 3 total (lifetime) | transcript, clean | $0 |
| Plus | Unlimited | all four modes | $12/mo or $100/yr |
| Pro | Unlimited | all four modes | $24/mo or $200/yr |

## Processing Modes

- **transcript**: Raw transcription with timestamps (JSON)
- **clean**: Edited transcript without filler words (TXT)
- **summary**: Concise summary of key points (TXT)
- **clips**: Best segments for short-form video (JSON)

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | No | Health check |
| GET | /me | Yes | Returns profile row |
| GET | /plans | No | Returns pricing data |
| POST | /upload | Yes | Accepts file + modes, returns job_id |
| GET | /job/{id} | Yes | Returns job row |
| GET | /download/{job_id}/{type} | Yes | Redirects to Supabase Storage URL |
| POST | /create-checkout-session | Yes | Returns Stripe checkout URL |
| POST | /stripe-webhook | Stripe sig | Handles subscription events |

## Development

### Frontend

```bash
cd app
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## File Structure

```
n4mint/
├── app/                          # React frontend
│   ├── public/
│   │   └── static/
│   │       ├── wordmark.jpg
│   │       ├── logo-full.jpg
│   │       └── logo-cat.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthModal.tsx
│   │   │   ├── UploadPanel.tsx
│   │   │   ├── JobCard.tsx
│   │   │   ├── ResultsPanel.tsx
│   │   │   ├── PricingModal.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── koyeb.yaml
│   └── .env.example
└── README.md
```

## License

MIT
