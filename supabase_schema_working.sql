-- ============================================
-- n4mint AI Transcription Platform - Working Database Schema
-- Rewrites existing database with proper structure and security
-- ============================================

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS usage_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id uuid REFERENCES auth.users PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Usage tracking
  minutes_used decimal(10,2) DEFAULT 0,
  files_processed integer DEFAULT 0,
  last_active_at timestamptz DEFAULT now(),
  
  -- Preferences
  timezone text DEFAULT 'UTC',
  language text DEFAULT 'en',
  
  -- Account status
  is_active boolean DEFAULT true,
  trial_used boolean DEFAULT false,
  trial_expires_at timestamptz
);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Subscription details
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
  plan_type text NOT NULL CHECK (plan_type IN ('free', 'plus', 'pro')),
  
  -- Stripe integration
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  
  -- Billing cycle
  interval text NOT NULL CHECK (interval IN ('month', 'year')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  canceled_at timestamptz,
  ended_at timestamptz
);

-- ============================================
-- USAGE LOGS TABLE
-- ============================================
CREATE TABLE usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  job_id uuid,
  
  -- Usage details
  minutes_processed decimal(10,2) NOT NULL,
  file_size_mb decimal(10,2),
  processing_modes text[], -- ['transcript', 'clean', 'summary', 'clips']
  
  -- Cost tracking
  cost_cents integer DEFAULT 0,
  plan_at_time text NOT NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- JOBS TABLE
-- ============================================
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- File information
  filename text NOT NULL,
  original_filename text,
  file_size_bytes bigint,
  duration_seconds float,
  file_type text, -- 'audio' or 'video'
  
  -- Processing details
  modes text[] NOT NULL, -- ['transcript', 'clean', 'summary', 'clips']
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  
  -- Results
  output_files jsonb,
  error text,
  processing_time_seconds float,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- ============================================
-- GAME SCORES TABLE
-- ============================================
CREATE TABLE scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  
  -- Game details
  score integer NOT NULL,
  survival_time float NOT NULL,
  level integer DEFAULT 1,
  difficulty text DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'hard')),
  
  -- Performance metrics
  obstacles_dodged integer DEFAULT 0,
  powerups_collected integer DEFAULT 0,
  accuracy float DEFAULT 0.0,
  
  -- Session info
  session_id text,
  device_type text DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile')),
  
  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_active ON users(last_active_at);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Usage logs indexes
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_user_date ON usage_logs(user_id, created_at);

-- Jobs indexes
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_user_status ON jobs(user_id, status);

-- Scores indexes
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_score ON scores(score DESC);
CREATE INDEX idx_scores_created_at ON scores(created_at);
CREATE INDEX idx_scores_user_top ON scores(user_id, score DESC);

-- ============================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can manage subscriptions" ON subscriptions FOR ALL USING (auth.role() = 'service_role');

-- Usage logs policies
CREATE POLICY "Users can view own usage" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert usage logs" ON usage_logs FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Jobs policies
CREATE POLICY "Users can view own jobs" ON jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service can update all jobs" ON jobs FOR UPDATE USING (auth.role() = 'service_role');

-- Scores policies
CREATE POLICY "Users can view own scores" ON scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scores" ON scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Scores are publicly readable for leaderboard" ON scores FOR SELECT USING (true);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update user last_active_at
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET last_active_at = now() WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply last_active_at triggers
CREATE TRIGGER update_user_last_active_job AFTER INSERT ON jobs FOR EACH ROW EXECUTE FUNCTION update_user_last_active();
CREATE TRIGGER update_user_last_active_score AFTER INSERT ON scores FOR EACH ROW EXECUTE FUNCTION update_user_last_active();

-- ============================================
-- SECURE VIEWS (No SECURITY DEFINER)
-- ============================================

-- User subscription summary view
CREATE OR REPLACE VIEW user_subscription_summary AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.created_at as user_created_at,
    u.minutes_used,
    u.files_processed,
    s.status as subscription_status,
    s.plan_type,
    s.current_period_end,
    s.cancel_at_period_end,
    CASE 
        WHEN s.status = 'active' AND s.current_period_end > now() THEN true
        ELSE false
    END as is_subscribed
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
WHERE u.id = auth.uid()
ORDER BY u.created_at DESC;

-- User usage statistics view
CREATE OR REPLACE VIEW user_usage_stats AS
SELECT 
    u.id,
    u.email,
    u.minutes_used,
    u.files_processed,
    COALESCE(j.total_jobs, 0) as total_jobs,
    COALESCE(j.completed_jobs, 0) as completed_jobs,
    COALESCE(j.failed_jobs, 0) as failed_jobs,
    COALESCE(ul.monthly_minutes, 0) as minutes_this_month,
    COALESCE(ul.monthly_cost, 0) as cost_this_month_cents
FROM users u
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs
    FROM jobs
    GROUP BY user_id
) j ON u.id = j.user_id
LEFT JOIN (
    SELECT 
        user_id,
        SUM(minutes_processed) as monthly_minutes,
        SUM(cost_cents) as monthly_cost
    FROM usage_logs
    WHERE created_at >= date_trunc('month', now())
    GROUP BY user_id
) ul ON u.id = ul.user_id
WHERE u.id = auth.uid();

-- ============================================
-- ADMIN FUNCTIONS (Fixed Syntax)
-- ============================================

-- Admin function for subscription summary
CREATE OR REPLACE FUNCTION get_all_subscription_summary()
RETURNS SETOF record AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.full_name,
        u.created_at as user_created_at,
        u.minutes_used,
        u.files_processed,
        s.status as subscription_status,
        s.plan_type,
        s.current_period_end,
        s.cancel_at_period_end,
        CASE 
            WHEN s.status = 'active' AND s.current_period_end > now() THEN true
            ELSE false
        END as is_subscribed
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin function for usage stats
CREATE OR REPLACE FUNCTION get_all_usage_stats()
RETURNS SETOF record AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.minutes_used,
        u.files_processed,
        COALESCE(j.total_jobs, 0) as total_jobs,
        COALESCE(j.completed_jobs, 0) as completed_jobs,
        COALESCE(j.failed_jobs, 0) as failed_jobs,
        COALESCE(ul.monthly_minutes, 0) as minutes_this_month,
        COALESCE(ul.monthly_cost, 0) as cost_this_month_cents
    FROM users u
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as total_jobs,
            COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs
        FROM jobs
        GROUP BY user_id
    ) j ON u.id = j.user_id
    LEFT JOIN (
        SELECT 
            user_id,
            SUM(minutes_processed) as monthly_minutes,
            SUM(cost_cents) as monthly_cost
        FROM usage_logs
        WHERE created_at >= date_trunc('month', now())
        GROUP BY user_id
    ) ul ON u.id = ul.user_id
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANTS
-- ============================================

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant view access to authenticated users
GRANT SELECT ON user_subscription_summary TO authenticated;
GRANT SELECT ON user_usage_stats TO authenticated;

-- Grant function access to service role only
GRANT EXECUTE ON FUNCTION get_all_subscription_summary() TO service_role;
GRANT EXECUTE ON FUNCTION get_all_usage_stats() TO service_role;
