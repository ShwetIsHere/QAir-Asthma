# QAir Architecture Documentation

## Overview

QAir follows a **three-layer architecture** for an asthma monitoring application:

1. **Client Layer** (React Native - Lightweight & Offline-First)
2. **Cloud Layer** (Supabase - Edge Functions & PostgreSQL)
3. **External Services** (OpenWeather, Metro Weather, Gemini AI)

This architecture ensures:
- ✅ **Offline-first** operation with local SQLite storage
- ✅ **Real-time** alerts via WebSocket (Supabase Realtime)
- ✅ Background sync with retry mechanisms
- ✅ Efficient API usage with caching
- ✅ AI-powered risk analysis
- ✅ Secure data with Row Level Security (RLS)

---

## 🏗️ Architecture Layers

### 1. CLIENT LAYER (React Native)

#### Components:

##### **BLE Manager** (`client/ble/BLEManager.ts`)
- **Scan** for ESP32 inhaler devices
- **Connect/Disconnect** to devices
- **Receive** trigger events via BLE notifications
- **Immediate local storage** when trigger detected

##### **Local SQLite Database** (`client/database/LocalDatabase.ts`)
- Stores trigger events locally
- Tracks sync status (synced/unsynced)
- Maintains pending sync queue
- Provides offline access to data

##### **Background Sync Service** (`client/sync/BackgroundSyncService.ts`)
- **Queue operations** for upload
- **Retry failed syncs** with exponential backoff
- **Batch uploads** (10 at a time)
- Runs in background every 15 minutes
- Network-aware (syncs when connected)

##### **Realtime Service** (`client/sync/RealtimeService.ts`)
- Subscribe to **risk alerts** via WebSocket
- Real-time **trigger updates**
- Push notifications for critical alerts
- Connection management

##### **UI Manager** (React Native Screens)
- Dashboard
- SOS Button
- Map View
- Trigger History
- Settings

---

### 2. CLOUD LAYER (Supabase)

#### Edge Functions:

##### **Trigger Processor** (`supabase/functions/process-trigger`)
- **Validate** incoming trigger payloads
- **Enrich** data with user context
- Store in PostgreSQL `triggers` table
- Trigger downstream processing (weather, risk analysis)

##### **Weather Aggregator** (`supabase/functions/aggregate-weather`)
- Call **OpenWeather** and **Metro Weather APIs** in parallel
- **Cache** results for 5 minutes (reduce API calls)
- Store in `weather_cache` table
- Update trigger with environmental data

##### **Gemini Analyzer** (`supabase/functions/analyze-risk`)
- **Pattern matching** on trigger history
- AI-powered **risk prediction**
- Generate personalized **recommendations**
- Create **risk alerts** for high/critical levels
- Store in `risk_records` table
- Broadcast alerts via Realtime

##### **Dashboard Aggregator** (`supabase/functions/aggregate-dashboard`)
- **Pre-compute** statistics (daily, weekly, monthly)
- Calculate **trends** (increasing/decreasing triggers)
- Generate **reports**
- Cache results in `dashboard_cache` table

#### PostgreSQL Database:

##### Tables:
- `triggers` - Trigger event history
- `weather_cache` - Cached weather API responses
- `risk_records` - AI risk assessments
- `emergency_contacts` - User emergency contacts
- `device_registry` - Registered BLE devices
- `user_settings` - User preferences
- `dashboard_cache` - Pre-computed dashboard stats
- `risk_alerts` - Real-time alerts

##### Materialized Views (for performance):
- `user_stats_daily` - Daily aggregated statistics
- `risk_trends` - Weekly risk level trends
- `environmental_correlations` - AQI/trigger correlations

##### Security:
- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Service role for Edge Functions

#### Realtime Pub/Sub:
- **WebSocket** connection for instant updates
- Broadcast **risk alerts** to users
- Real-time trigger synchronization

---

### 3. EXTERNAL SERVICES

#### **OpenWeather API**
- Current weather conditions
- Temperature, humidity, pressure
- Weather forecasts

#### **Metro Weather API**
- **Air Quality Index (AQI)**
- PM2.5 and PM10 levels
- Pollen levels

#### **Gemini AI**
- Pattern analysis on trigger data
- Risk score calculation
- Personalized recommendations
- Alert generation

---

## 🔄 Data Flow

### Trigger Event Flow:

```
ESP32 Inhaler        BLE Manager          Local SQLite       Background Sync      Supabase
    (Press)      →    (Receive)       →    (Store)       →    (Queue)         →   (Cloud)
                                                                                      ↓
                                                                            Edge Functions
                                                                                      ↓
                                                                      ┌───────────────┼───────────────┐
                                                                      ↓               ↓               ↓
                                                              Weather Aggregator  Gemini Analyzer  Store DB
                                                                      ↓               ↓
                                                                   Cache API      Risk Analysis
                                                                   Results         & Alerts
                                                                                      ↓
                                                                              Realtime Broadcast
                                                                                      ↓
                                                                              Push Notification
```

### Offline Support:

```
NO NETWORK:
Trigger → BLE → Local SQLite ✅ (Stored)

NETWORK RESTORED:
Background Sync → Upload Queued Triggers → Mark as Synced ✅
```

---

## 📦 Installation & Setup

### Prerequisites:
- Node.js 18+
- Expo CLI
- Supabase CLI
- Android Studio / Xcode

### 1. Install Dependencies:

```bash
npm install
```

Required packages:
- `expo-sqlite` - Local database
- `react-native-ble-plx` - Bluetooth
- `@supabase/supabase-js` - Supabase client
- `expo-task-manager` - Background tasks
- `expo-notifications` - Push notifications
- `expo-location` - GPS location
- `expo-background-fetch` - Background sync

### 2. Configure Environment Variables:

Create `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Edge Function Secrets (Supabase Dashboard)
OPENWEATHER_API_KEY=your-openweather-key
METRO_WEATHER_API_KEY=your-metro-weather-key
GEMINI_API_KEY=your-gemini-key
```

### 3. Setup Supabase:

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Deploy Edge Functions
supabase functions deploy process-trigger
supabase functions deploy aggregate-weather
supabase functions deploy analyze-risk
supabase functions deploy aggregate-dashboard

# Set secrets
supabase secrets set OPENWEATHER_API_KEY=xxx
supabase secrets set METRO_WEATHER_API_KEY=xxx
supabase secrets set GEMINI_API_KEY=xxx
```

### 4. Run the App:

```bash
# Android
npm run android

# iOS
npm run ios

# Web (limited features)
npm run web
```

---

## 🔧 Usage

### In Your Component:

```tsx
import { useInhalerMonitor } from '@/hooks/useInhalerMonitor';

function MyComponent() {
  const {
    // BLE
    isScanning,
    connectedDevice,
    startScan,
    connect,
    disconnect,
    
    // Data
    recentTriggers,
    triggerStats,
    
    // Sync
    syncStatus,
    syncNow,
    
    // Alerts
    unreadAlerts,
    recentAlerts,
    markAlertAsRead,
    
    // Status
    isRealtimeConnected,
  } = useInhalerMonitor();

  return (
    <View>
      <Button title="Scan for Devices" onPress={() => startScan()} />
      <Text>Connected: {connectedDevice?.name || 'None'}</Text>
      <Text>Triggers Today: {triggerStats.today}</Text>
      <Text>Unread Alerts: {unreadAlerts}</Text>
      <Text>Sync Status: {syncStatus.isRunning ? 'Syncing...' : 'Idle'}</Text>
    </View>
  );
}
```

---

## 🚀 Key Features

### ✅ Offline-First Architecture
- All triggers stored locally first
- Background sync when network available
- Works without internet connection

### ✅ Real-Time Alerts
- WebSocket connection to Supabase
- Instant risk notifications
- Push notifications for critical alerts

### ✅ Efficient API Usage
- Weather data cached for 5 minutes
- Batch uploads (10 triggers at a time)
- Retry failed syncs with exponential backoff

### ✅ AI-Powered Insights
- Gemini AI for pattern analysis
- Personalized risk assessments
- Contextual recommendations

### ✅ Performance Optimization
- Materialized views for dashboard
- Indexed database queries
- Pre-computed statistics

### ✅ Security
- Row Level Security (RLS)
- Users can only access their own data
- Secure Edge Functions

---

## 📊 Database Schema

See `supabase/migrations/001_complete_schema.sql` for full schema.

Key tables:
- **triggers**: Inhaler events with environmental data
- **risk_records**: AI-analyzed risk assessments
- **weather_cache**: Cached API responses
- **risk_alerts**: Real-time notifications

---

## 🔐 Security Considerations

1. **RLS Policies**: All tables have RLS enabled
2. **Authentication**: Supabase Auth for user management
3. **API Keys**: Stored in Edge Function secrets
4. **Data Isolation**: Users can only access their own records
5. **Secure WebSocket**: Authenticated Realtime connections

---

## 🐛 Debugging

### Check Local Database:
```typescript
import { localDatabase } from '@/client';

const stats = await localDatabase.getTriggerStats();
console.log('Triggers:', stats);

const unsynced = await localDatabase.getUnsyncedTriggers();
console.log('Unsynced:', unsynced.length);
```

### Check Sync Status:
```typescript
import { BackgroundSyncService } from '@/client';

const status = BackgroundSyncService.getStatus();
console.log('Sync Status:', status);
```

### Check Realtime Connection:
```typescript
import { RealtimeService } from '@/client';

const connected = RealtimeService.isRealtimeConnected();
console.log('Realtime Connected:', connected);
```

---

## 📝 Maintenance

### Refresh Materialized Views:
```sql
SELECT public.refresh_materialized_views();
```

Schedule with pg_cron:
```sql
SELECT cron.schedule(
  'refresh-views',
  '0 */6 * * *',  -- Every 6 hours
  $$SELECT public.refresh_materialized_views();$$
);
```

### Clean Old Weather Cache:
```sql
DELETE FROM weather_cache 
WHERE expires_at < NOW();
```

### Clean Old Local Data:
```typescript
await localDatabase.cleanupOldRecords(30); // Keep 30 days
```

---

## 🤝 Contributing

1. Follow the architecture pattern
2. Add tests for new features
3. Update documentation
4. Follow React Native best practices

---

## 📄 License

[Your License Here]

---

## 📞 Support

For issues or questions, contact: [Your Contact Info]
