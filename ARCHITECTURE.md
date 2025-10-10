# QAir App Architecture & Flow

## 📱 App Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         APP LAUNCH                          │
│                         (index.tsx)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Check Auth     │
              │ State          │
              └───────┬────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
   ┌─────────┐               ┌──────────────┐
   │ Not     │               │ Authenticated│
   │ Logged  │               │              │
   │ In      │               └──────┬───────┘
   └────┬────┘                      │
        │                           │
        ▼                           ▼
┌──────────────┐          ┌─────────────────┐
│ Login Screen │          │   Tab Navigator  │
│              │          │                  │
│  - Email     │          │  ┌─────────────┐ │
│  - Password  │  Login   │  │  Dashboard  │ │
│  - Social    │─────────▶│  │    (Map)    │ │
│  - Register  │          │  └─────────────┘ │
│    Link      │          │                  │
└──────┬───────┘          │  ┌─────────────┐ │
       │                  │  │  Settings   │ │
       │                  │  │             │ │
       ▼                  │  └─────────────┘ │
┌──────────────┐          └─────────────────┘
│Register      │
│ Screen       │
│              │
│ - Full Name  │
│ - Email      │
│ - Password   │
│ - Confirm    │
└──────────────┘
```

## 🗺️ Dashboard Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      DASHBOARD SCREEN                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │          Google Maps (Full Screen)                 │    │
│  │                                                     │    │
│  │  🔴 = Inhaler Trigger Marker                      │    │
│  │  🔵 = User Current Location                       │    │
│  │  ⭕ = Red Zone (5+ triggers in 500m)             │    │
│  │                                                     │    │
│  │  ┌─────────────────┐                              │    │
│  │  │ Your Location   │                              │    │
│  │  │      🔵        │                              │    │
│  │  └─────────────────┘                              │    │
│  │                                                     │    │
│  │       🔴         🔴                                │    │
│  │             🔴                                     │    │
│  │         ⭕────────────────⭕                      │    │
│  │       🔴    🔴    🔴                              │    │
│  │         Red Zone (High Risk)                      │    │
│  │                                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────┐                        ┌────────────┐    │
│  │ 📍 Center    │                        │ ⚙️         │    │
│  │   Location   │                        │ Settings   │    │
│  └──────────────┘                        └────────────┘    │
│                                                              │
│             ┌────────────────────────────┐                  │
│             │  🔴 Record Trigger         │                  │
│             └────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Tap Marker
                           ▼
            ┌──────────────────────────────┐
            │   Bottom Sheet Modal         │
            ├──────────────────────────────┤
            │  Location Details            │
            │                              │
            │  ┌────────────────────────┐  │
            │  │   AQI: 85              │  │
            │  │   Category: Moderate   │  │
            │  │   ┌──────────────┐     │  │
            │  │   │      85      │     │  │
            │  │   └──────────────┘     │  │
            │  │                        │  │
            │  │   PM2.5: 35.2 μg/m³   │  │
            │  │   PM10: 52.8 μg/m³    │  │
            │  │   Temp: 24°C          │  │
            │  │   Humidity: 65%       │  │
            │  └────────────────────────┘  │
            │                              │
            │  Recorded: Oct 9, 2025       │
            └──────────────────────────────┘
```

## 🎯 Trigger Recording Flow

```
User Clicks "Record Trigger"
         │
         ▼
┌─────────────────────┐
│ Get Current         │
│ Location (GPS)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Fetch Air Quality   │
│ Data from API       │
│  - AQI              │
│  - PM2.5, PM10      │
│  - Temperature      │
│  - Humidity         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Save to Supabase    │
│ Database            │
│  - User ID          │
│  - Latitude/Long    │
│  - Timestamp        │
│  - Air Quality Data │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Update Map View     │
│  - Add Marker       │
│  - Recalculate      │
│    Red Zones        │
└──────────┬──────────┘
           │
           ▼
    ┌───────────┐
    │ Success!  │
    │ ✅        │
    └───────────┘
```

## 🔴 Red Zone Detection Algorithm

```
For each trigger in database:
  │
  ├─ Find all triggers within 500m radius
  │
  ├─ Count nearby triggers
  │
  └─ If count >= 5:
      │
      ├─ Calculate center point
      │
      ├─ Check if overlaps existing zone
      │
      └─ Create/Update red zone marker
          │
          └─ Draw red circle on map (500m radius)
```

## ⚙️ Settings Screen Structure

```
┌─────────────────────────────────────────┐
│          SETTINGS SCREEN                │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────┐     │
│  │      Profile Section          │     │
│  │                               │     │
│  │         ┌───────┐             │     │
│  │         │   A   │ Avatar      │     │
│  │         └───────┘             │     │
│  │       John Doe                │     │
│  │   john@example.com            │     │
│  └───────────────────────────────┘     │
│                                         │
│  ┌───────────────────────────────┐     │
│  │   Account Settings            │     │
│  │   ├─ 👤 Edit Profile          │     │
│  │   ├─ 🔑 Change Password       │     │
│  │   └─ 🛡️  Privacy & Security   │     │
│  └───────────────────────────────┘     │
│                                         │
│  ┌───────────────────────────────┐     │
│  │   App Preferences             │     │
│  │   ├─ 🔔 Notifications [ON]    │     │
│  │   ├─ 📍 Location Track [ON]   │     │
│  │   └─ 🌙 Dark Mode [OFF]       │     │
│  └───────────────────────────────┘     │
│                                         │
│  ┌───────────────────────────────┐     │
│  │   Data & Storage              │     │
│  │   ├─ 💾 Export Data           │     │
│  │   └─ 🗑️  Clear Cache          │     │
│  └───────────────────────────────┘     │
│                                         │
│  ┌───────────────────────────────┐     │
│  │   Support                     │     │
│  │   ├─ ❓ Help Center           │     │
│  │   ├─ 📧 Contact Us            │     │
│  │   └─ ℹ️  About v1.0.0         │     │
│  └───────────────────────────────┘     │
│                                         │
│         ┌─────────────────┐            │
│         │  🚪 Logout      │            │
│         └─────────────────┘            │
│                                         │
└─────────────────────────────────────────┘
```

## 🗄️ Database Schema

```
┌─────────────────────────────────────┐
│         inhaler_triggers            │
├─────────────────────────────────────┤
│ id              UUID (PK)           │
│ user_id         UUID (FK)           │
│ latitude        DOUBLE              │
│ longitude       DOUBLE              │
│ timestamp       TIMESTAMP           │
│ aqi             INTEGER             │
│ category        TEXT                │
│ pm25            DOUBLE              │
│ pm10            DOUBLE              │
│ temperature     DOUBLE              │
│ humidity        DOUBLE              │
│ created_at      TIMESTAMP           │
└─────────────────────────────────────┘
              │
              │ user_id FK
              ▼
┌─────────────────────────────────────┐
│           auth.users                │
│         (Supabase Auth)             │
├─────────────────────────────────────┤
│ id              UUID (PK)           │
│ email           TEXT                │
│ created_at      TIMESTAMP           │
│ user_metadata   JSONB               │
└─────────────────────────────────────┘
              │
              │ user_id FK
              ▼
┌─────────────────────────────────────┐
│         user_settings               │
├─────────────────────────────────────┤
│ id              UUID (PK)           │
│ user_id         UUID (FK) UNIQUE    │
│ notifications   BOOLEAN             │
│ location_track  BOOLEAN             │
│ dark_mode       BOOLEAN             │
│ aqi_threshold   INTEGER             │
└─────────────────────────────────────┘
```

## 🔐 Authentication Flow

```
Registration:
  User fills form
       │
       ▼
  Validation
       │
       ▼
  Supabase.auth.signUp()
       │
       ▼
  Email Verification Sent
       │
       ▼
  User verifies email
       │
       ▼
  Redirect to Dashboard

Login:
  User enters credentials
       │
       ▼
  Validation
       │
       ▼
  Supabase.auth.signInWithPassword()
       │
       ├─ Success → Dashboard
       │
       └─ Error → Show error message

Auto-Login:
  App Launch
       │
       ▼
  Check Session
       │
       ├─ Valid → Dashboard
       │
       └─ Invalid → Login Screen
```

## 🌐 API Integration

```
┌──────────────┐
│   QAir App   │
└──────┬───────┘
       │
       ├──────────────────┐
       │                  │
       ▼                  ▼
┌─────────────┐    ┌──────────────┐
│  Supabase   │    │ Google Maps  │
│             │    │              │
│ - Auth      │    │ - Map View   │
│ - Database  │    │ - Markers    │
│ - RLS       │    │ - Location   │
└─────────────┘    └──────────────┘
       │                  
       ▼                  
┌─────────────┐
│OpenWeather  │
│ Map API     │
│             │
│ - AQI Data  │
│ - Weather   │
│ - Pollution │
└─────────────┘
```

## 📦 Component Hierarchy

```
App (_layout.tsx)
│
├─ Auth Stack
│  ├─ Login
│  └─ Register
│
└─ Tab Navigator
   │
   ├─ Dashboard Tab
   │  ├─ MapView
   │  │  ├─ User Location Marker
   │  │  ├─ Trigger Markers (n)
   │  │  └─ Red Zone Circles (n)
   │  │
   │  ├─ FAB (Record Trigger)
   │  ├─ Location Button
   │  │
   │  └─ Bottom Sheet
   │     └─ AQICard
   │        ├─ AQI Display
   │        ├─ Pollutant Details
   │        └─ Weather Info
   │
   └─ Settings Tab
      ├─ Profile Card
      ├─ Account Settings Cards
      ├─ Preferences Cards
      └─ Logout Button
```

## 🎨 Color Scheme

```
Primary Colors:
├─ Indigo-500: #6366F1 (Main brand color)
├─ Indigo-600: #4F46E5 (Hover/Active states)
└─ Indigo-50:  #EEF2FF (Light backgrounds)

AQI Colors:
├─ Green-500:  #22C55E (Good: 0-50)
├─ Yellow-500: #EAB308 (Moderate: 51-100)
├─ Orange-500: #F97316 (USG: 101-150)
├─ Red-500:    #EF4444 (Unhealthy: 151-200)
├─ Purple-500: #A855F7 (Very Unhealthy: 201-300)
└─ Red-900:    #7F1D1D (Hazardous: 301+)

Neutral Colors:
├─ Gray-50:    #F9FAFB (Backgrounds)
├─ Gray-200:   #E5E7EB (Borders)
├─ Gray-500:   #6B7280 (Secondary text)
└─ Gray-900:   #111827 (Primary text)
```

---

**This architecture ensures:**
- ✅ Secure authentication
- ✅ Real-time data updates
- ✅ Smooth user experience
- ✅ Scalable structure
- ✅ Easy maintenance
