/**
 * Complete Supabase Database Schema
 * Following the architecture diagram
 * 
 * Tables:
 * - auth.users (managed by Supabase Auth)
 * - triggers (history)
 * - weather_cache
 * - risk_records
 * - emergency_contacts
 * - device_registry
 * - user_settings
 * - dashboard_cache
 * - risk_alerts
 * 
 * Features:
 * - Row Level Security (RLS)
 * - Materialized Views for performance
 * - Indexes for optimization
 * - Triggers for automation
 */

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Triggers Table (Inhaler Event History)
CREATE TABLE IF NOT EXISTS public.triggers (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_timestamp TIMESTAMPTZ NOT NULL,
    fsr_value INTEGER NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    aqi INTEGER,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    weather_condition TEXT,
    device_id TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weather Cache Table
CREATE TABLE IF NOT EXISTS public.weather_cache (
    id BIGSERIAL PRIMARY KEY,
    location_key TEXT NOT NULL UNIQUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    weather_condition TEXT,
    aqi INTEGER,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    pollen_level INTEGER,
    source TEXT,
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Risk Records Table
CREATE TABLE IF NOT EXISTS public.risk_records (
    id BIGSERIAL PRIMARY KEY,
    trigger_id BIGINT REFERENCES public.triggers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    patterns_detected TEXT[],
    recommendations TEXT[],
    analyzed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency Contacts Table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device Registry Table
CREATE TABLE IF NOT EXISTS public.device_registry (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL UNIQUE,
    device_name TEXT,
    device_type TEXT DEFAULT 'ESP32_Inhaler',
    firmware_version TEXT,
    last_connected TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    alert_threshold TEXT DEFAULT 'medium' CHECK (alert_threshold IN ('low', 'medium', 'high', 'critical')),
    data_sharing_enabled BOOLEAN DEFAULT FALSE,
    theme TEXT DEFAULT 'light',
    location_tracking_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard Cache Table
CREATE TABLE IF NOT EXISTS public.dashboard_cache (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period TEXT NOT NULL CHECK (period IN ('day', 'week', 'month', 'year')),
    stats JSONB NOT NULL,
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, period)
);

-- Risk Alerts Table (for real-time notifications)
CREATE TABLE IF NOT EXISTS public.risk_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_id BIGINT REFERENCES public.triggers(id) ON DELETE CASCADE,
    risk_level TEXT NOT NULL,
    alert_message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_triggers_user_timestamp ON public.triggers(user_id, trigger_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_triggers_location ON public.triggers(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_triggers_timestamp ON public.triggers(trigger_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_weather_cache_location ON public.weather_cache(location_key);
CREATE INDEX IF NOT EXISTS idx_weather_cache_expires ON public.weather_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_risk_records_user ON public.risk_records(user_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_records_level ON public.risk_records(risk_level);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON public.emergency_contacts(user_id);

CREATE INDEX IF NOT EXISTS idx_device_registry_user ON public.device_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_device_registry_device ON public.device_registry(device_id);

CREATE INDEX IF NOT EXISTS idx_risk_alerts_user_unread ON public.risk_alerts(user_id, is_read, created_at DESC);

-- ============================================================================
-- MATERIALIZED VIEWS FOR DASHBOARD PERFORMANCE
-- ============================================================================

-- User Statistics Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS public.user_stats_daily AS
SELECT 
    user_id,
    DATE(trigger_timestamp) as date,
    COUNT(*) as trigger_count,
    AVG(aqi) as avg_aqi,
    AVG(temperature) as avg_temperature,
    AVG(humidity) as avg_humidity,
    MODE() WITHIN GROUP (ORDER BY weather_condition) as common_weather
FROM public.triggers
WHERE trigger_timestamp >= NOW() - INTERVAL '90 days'
GROUP BY user_id, DATE(trigger_timestamp);

CREATE UNIQUE INDEX ON public.user_stats_daily (user_id, date);

-- Risk Trends Materialized View
CREATE MATERIALIZED VIEW IF NOT EXISTS public.risk_trends AS
SELECT 
    r.user_id,
    DATE_TRUNC('week', r.analyzed_at) as week,
    r.risk_level,
    COUNT(*) as count,
    AVG(r.risk_score) as avg_risk_score
FROM public.risk_records r
WHERE r.analyzed_at >= NOW() - INTERVAL '90 days'
GROUP BY r.user_id, DATE_TRUNC('week', r.analyzed_at), r.risk_level;

CREATE UNIQUE INDEX ON public.risk_trends (user_id, week, risk_level);

-- Environmental Correlations View
CREATE MATERIALIZED VIEW IF NOT EXISTS public.environmental_correlations AS
SELECT 
    user_id,
    CASE 
        WHEN aqi < 50 THEN 'Good'
        WHEN aqi < 100 THEN 'Moderate'
        WHEN aqi < 150 THEN 'Unhealthy for Sensitive'
        WHEN aqi < 200 THEN 'Unhealthy'
        ELSE 'Very Unhealthy'
    END as aqi_category,
    COUNT(*) as trigger_count,
    AVG(aqi) as avg_aqi
FROM public.triggers
WHERE aqi IS NOT NULL 
    AND trigger_timestamp >= NOW() - INTERVAL '90 days'
GROUP BY user_id, aqi_category;

CREATE UNIQUE INDEX ON public.environmental_correlations (user_id, aqi_category);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;

-- Triggers RLS Policies
CREATE POLICY "Users can view own triggers"
    ON public.triggers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own triggers"
    ON public.triggers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Risk Records RLS Policies
CREATE POLICY "Users can view own risk records"
    ON public.risk_records FOR SELECT
    USING (auth.uid() = user_id);

-- Emergency Contacts RLS Policies
CREATE POLICY "Users can manage own emergency contacts"
    ON public.emergency_contacts FOR ALL
    USING (auth.uid() = user_id);

-- Device Registry RLS Policies
CREATE POLICY "Users can manage own devices"
    ON public.device_registry FOR ALL
    USING (auth.uid() = user_id);

-- User Settings RLS Policies
CREATE POLICY "Users can manage own settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id);

-- Dashboard Cache RLS Policies
CREATE POLICY "Users can view own dashboard cache"
    ON public.dashboard_cache FOR SELECT
    USING (auth.uid() = user_id);

-- Risk Alerts RLS Policies
CREATE POLICY "Users can view own alerts"
    ON public.risk_alerts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
    ON public.risk_alerts FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to relevant tables
CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON public.emergency_contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_device_registry_updated_at
    BEFORE UPDATE ON public.device_registry
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to set weather cache expiration
CREATE OR REPLACE FUNCTION public.set_weather_cache_expiration()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expires_at = NEW.cached_at + INTERVAL '5 minutes';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_weather_expiration
    BEFORE INSERT ON public.weather_cache
    FOR EACH ROW EXECUTE FUNCTION public.set_weather_cache_expiration();

-- Function to refresh materialized views periodically
CREATE OR REPLACE FUNCTION public.refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_stats_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.risk_trends;
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.environmental_correlations;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA AND DEFAULTS
-- ============================================================================

-- Function to create default user settings on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- HELPFUL VIEWS
-- ============================================================================

-- Recent Triggers with Risk Levels View
CREATE OR REPLACE VIEW public.triggers_with_risk AS
SELECT 
    t.id,
    t.user_id,
    t.trigger_timestamp,
    t.fsr_value,
    t.latitude,
    t.longitude,
    t.aqi,
    t.temperature,
    t.humidity,
    t.weather_condition,
    r.risk_level,
    r.risk_score,
    r.recommendations
FROM public.triggers t
LEFT JOIN public.risk_records r ON t.id = r.trigger_id
ORDER BY t.trigger_timestamp DESC;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant access to materialized views
GRANT SELECT ON public.user_stats_daily TO authenticated;
GRANT SELECT ON public.risk_trends TO authenticated;
GRANT SELECT ON public.environmental_correlations TO authenticated;

-- Service role permissions (for Edge Functions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.triggers IS 'Stores all inhaler trigger events with environmental data';
COMMENT ON TABLE public.weather_cache IS 'Caches weather API responses to reduce external API calls';
COMMENT ON TABLE public.risk_records IS 'AI-analyzed risk assessments for each trigger';
COMMENT ON TABLE public.emergency_contacts IS 'User emergency contact information';
COMMENT ON TABLE public.device_registry IS 'Registered BLE devices (ESP32 inhalers)';
COMMENT ON TABLE public.user_settings IS 'User preferences and settings';
COMMENT ON TABLE public.dashboard_cache IS 'Pre-computed dashboard statistics';
COMMENT ON TABLE public.risk_alerts IS 'Real-time risk alerts for users';

COMMENT ON MATERIALIZED VIEW public.user_stats_daily IS 'Daily aggregated statistics per user';
COMMENT ON MATERIALIZED VIEW public.risk_trends IS 'Weekly risk level trends';
COMMENT ON MATERIALIZED VIEW public.environmental_correlations IS 'Correlations between AQI and triggers';
