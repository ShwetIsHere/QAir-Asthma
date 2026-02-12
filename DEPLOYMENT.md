# Deployment Guide - QAir

Complete guide for deploying QAir to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Edge Functions Deployment](#edge-functions-deployment)
4. [Database Configuration](#database-configuration)
5. [Mobile App Build](#mobile-app-build)
6. [CI/CD Setup](#cicd-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Accounts
- ✅ Supabase account (Pro recommended for production)
- ✅ Google Play Console (Android)
- ✅ Apple Developer Account (iOS)
- ✅ OpenWeather API account
- ✅ Google AI Studio (Gemini)

### Required Tools
```bash
npm install -g supabase
npm install -g eas-cli
npm install -g expo-cli
```

---

## Supabase Setup

### 1. Create Production Project

```bash
# Create new project via CLI or dashboard
# Use strong password and enable 2FA
```

### 2. Configure Database

```bash
# Link to production project
supabase link --project-ref YOUR_PROD_REF

# Apply migrations
supabase db push

# Or import SQL manually
```

### 3. Enable Realtime

In Supabase Dashboard:
1. Go to Database → Replication
2. Enable replication for these tables:
   - `triggers`
   - `risk_alerts`

### 4. Configure Storage (Optional)

If storing files (PDFs, reports):
```bash
# Create buckets
supabase storage create reports --public false
supabase storage create exports --public false
```

### 5. Set Up Authentication

In Supabase Dashboard → Authentication:
- Enable Email authentication
- Configure email templates
- Set up OAuth providers (optional)
- Configure password policies

---

## Edge Functions Deployment

### 1. Install Supabase CLI

```bash
npm install -g supabase
supabase login
```

### 2. Deploy Functions

```bash
# Deploy all functions
cd supabase/functions

# Deploy individually
supabase functions deploy process-trigger --project-ref YOUR_REF
supabase functions deploy aggregate-weather --project-ref YOUR_REF
supabase functions deploy analyze-risk --project-ref YOUR_REF
supabase functions deploy aggregate-dashboard --project-ref YOUR_REF

# Or deploy all at once
for func in process-trigger aggregate-weather analyze-risk aggregate-dashboard; do
  supabase functions deploy $func --project-ref YOUR_REF
done
```

### 3. Set Environment Secrets

```bash
# Set secrets for Edge Functions
supabase secrets set \
  OPENWEATHER_API_KEY="your_key" \
  METRO_WEATHER_API_KEY="your_key" \
  GEMINI_API_KEY="your_key" \
  --project-ref YOUR_REF

# Verify secrets
supabase secrets list --project-ref YOUR_REF
```

### 4. Test Edge Functions

```bash
# Test locally first
supabase functions serve process-trigger --env-file ./supabase/.env

# Test deployed function
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/process-trigger \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"trigger_timestamp":"2024-01-01T00:00:00Z","fsr_value":500}'
```

---

## Database Configuration

### 1. Enable Row Level Security (RLS)

Verify all tables have RLS enabled:
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Enable RLS if not already enabled
ALTER TABLE public.triggers ENABLE ROW LEVEL SECURITY;
-- Repeat for all tables
```

### 2. Create Indexes

```sql
-- Already included in migration, but verify:
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';
```

### 3. Setup Materialized Views Refresh

```sql
-- Schedule materialized view refresh every 6 hours
SELECT cron.schedule(
  'refresh-materialized-views',
  '0 */6 * * *',
  $$SELECT public.refresh_materialized_views();$$
);

-- Verify cron jobs
SELECT * FROM cron.job;
```

### 4. Database Backups

In Supabase Dashboard → Settings → Database:
- Enable daily backups
- Set retention period (7-30 days recommended)
- Test restore process

---

## Mobile App Build

### 1. Configure EAS Build

```bash
# Login to Expo
eas login

# Configure project
eas build:configure
```

Update `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  }
}
```

### 2. Set Production Environment

Create `.env.production`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

### 3. Build Android

```bash
# Build APK
eas build --platform android --profile production

# Or AAB for Play Store
eas build --platform android --profile production --gradle-command assembleRelease

# Download build
eas build:download --platform android
```

### 4. Build iOS

```bash
# Build for App Store
eas build --platform ios --profile production

# Download IPA
eas build:download --platform ios
```

### 5. Submit to Stores

#### Android (Play Store)
```bash
# Submit directly via EAS
eas submit --platform android

# Or manually upload AAB to Play Console
```

#### iOS (App Store)
```bash
# Submit via EAS
eas submit --platform ios

# Or use Xcode > Archive > Upload
```

---

## CI/CD Setup

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy QAir

on:
  push:
    branches: [main]

jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Supabase CLI
        run: npm install -g supabase
      
      - name: Deploy Edge Functions
        run: |
          supabase functions deploy process-trigger --project-ref ${{ secrets.SUPABASE_REF }}
          supabase functions deploy aggregate-weather --project-ref ${{ secrets.SUPABASE_REF }}
          supabase functions deploy analyze-risk --project-ref ${{ secrets.SUPABASE_REF }}
          supabase functions deploy aggregate-dashboard --project-ref ${{ secrets.SUPABASE_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm install
      
      - name: Build Android
        run: eas build --platform android --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## Monitoring & Maintenance

### 1. Enable Logging

In Supabase Dashboard:
- Enable Database logs
- Enable Edge Function logs
- Set up log retention

### 2. Monitor Performance

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Set Up Alerts

Use Supabase monitoring or integrate with:
- Sentry for error tracking
- Datadog for performance monitoring
- PagerDuty for incident management

### 4. Maintenance Tasks

Schedule regular maintenance:

```sql
-- Weekly vacuum
VACUUM ANALYZE;

-- Clean old weather cache (daily)
DELETE FROM weather_cache WHERE expires_at < NOW() - INTERVAL '1 day';

-- Archive old triggers (monthly)
-- Move to separate archive table if needed
```

### 5. Health Checks

Create monitoring endpoints:

```typescript
// Add to Edge Functions
export async function healthCheck() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
    { status: 200 }
  );
}
```

---

## Security Checklist

- [ ] All RLS policies enabled and tested
- [ ] API keys rotated from development
- [ ] HTTPS enforced
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Sensitive data encrypted
- [ ] Access logs reviewed
- [ ] Two-factor auth enabled for admin accounts
- [ ] Regular security audits scheduled

---

## Rollback Procedure

If deployment fails:

```bash
# Database rollback
supabase db reset --project-ref YOUR_REF

# Edge Functions rollback
# Deploy previous version
supabase functions deploy process-trigger@previous-version

# Mobile app
# Submit previous APK/IPA to stores as emergency update
```

---

## Production Optimization

### Database Optimization

```sql
-- Create composite indexes for frequent queries
CREATE INDEX idx_triggers_user_date ON triggers(user_id, DATE(trigger_timestamp));

-- Partition large tables (if needed)
-- See PostgreSQL partitioning docs
```

### Edge Function Optimization

```typescript
// Use connection pooling
// Cache frequently accessed data
// Implement request coalescing
```

### Mobile App Optimization

```bash
# Enable Hermes engine (already enabled)
# Optimize images
# Minimize bundle size
# Enable code splitting
```

---

## Cost Optimization

### Supabase
- Use materialized views to reduce database load
- Cache API responses (weather data)
- Set appropriate retention policies
- Monitor function invocations

### External APIs
- Cache OpenWeather responses (5 min)
- Batch Gemini AI requests
- Use free tiers efficiently

---

## Post-Deployment

1. **Test all features** in production
2. **Monitor error rates** for first 24 hours
3. **Review user feedback** 
4. **Check performance metrics**
5. **Verify backup procedures**

---

## Support & Resources

- Supabase Status: https://status.supabase.com
- Expo Status: https://status.expo.dev
- Support Email: [your-email]
- Documentation: See `ARCHITECTURE.md`

---

**Deployment Complete! 🚀**
