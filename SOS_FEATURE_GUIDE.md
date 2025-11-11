# 🚨 Emergency Contact & SOS Button Feature Guide

## Overview
The QAir app now includes a comprehensive emergency response system designed to help asthma patients during attacks. This feature provides instant access to emergency contacts, automated alerts, and displays your personalized Asthma Action Plan.

## Features Implemented

### 1. **Emergency Contacts Management**
Located in **Settings > Emergency Settings**

#### Features:
- ✅ Add multiple emergency contacts (family, friends, caregivers)
- ✅ Store contact name, phone number, and relationship
- ✅ Set a primary contact for priority calling
- ✅ Edit and delete contacts easily
- ✅ Secure storage in Supabase database with Row Level Security

#### How to Use:
1. Go to **Settings** tab
2. Scroll to **Emergency Settings** section
3. Tap **Add** button in Emergency Contacts card
4. Fill in contact details:
   - Name (required)
   - Phone Number (required)
   - Relationship (optional)
   - Toggle "Set as Primary Contact"
5. Tap **Save Contact**

---

### 2. **Asthma Action Plan Manager**
Located in **Settings > Emergency Settings**

#### Features:
- ✅ Create personalized action plan based on doctor's recommendations
- ✅ Three-zone system (Green, Yellow, Red)
- ✅ Store medications, allergies, doctor, and hospital information
- ✅ Load default template for quick setup
- ✅ Display plan during emergencies for first responders

#### Zones:
- **🟢 Green Zone**: What to do when feeling well
- **🟡 Yellow Zone**: Actions when symptoms worsen
- **🔴 Red Zone**: Emergency actions during severe attack

#### How to Use:
1. Go to **Settings** tab
2. Scroll to **Asthma Action Plan** section
3. Fill in each zone with your doctor's instructions
4. Add medications, allergies, and medical contacts
5. Tap **Save Action Plan**

**Tip**: Use the "Load Default" button for a template, then customize it.

---

### 3. **SOS Button**
Located on **Dashboard** (Map screen)

#### Features:
- ✅ Prominent red button with warning icon
- ✅ One-tap access to emergency options
- ✅ Four emergency actions available
- ✅ Vibration feedback for confirmation

#### Location:
- Floating on the right side of the map
- Always accessible above the "Recenter" button
- Red color with SOS label for easy identification

---

## How to Use the SOS Button

### During an Asthma Attack:

1. **Tap the Red SOS Button** on the dashboard
2. **Choose from 4 Options**:

   #### Option 1: Call Emergency Contact
   - Instantly calls your primary emergency contact
   - If no primary contact, calls the first contact in your list
   - Direct dial - no typing required

   #### Option 2: Send Alert SMS
   - Automatically creates SMS with:
     - Emergency alert message
     - Your current GPS location (with Google Maps link)
     - Current date and time
     - Your name (from profile)
   - Choose to send to:
     - Primary contact only
     - All emergency contacts
   - Opens your SMS app with pre-filled message
   - Just tap Send!

   #### Option 3: View Action Plan
   - Displays your full Asthma Action Plan
   - Shows all three zones (Red, Yellow, Green)
   - Displays medications and allergies
   - Shows doctor and hospital information
   - Perfect for showing first responders
   - Quick access to doctor's phone number

   #### Option 4: Do Everything
   - **Automated full emergency response**:
     1. Immediately displays Action Plan
     2. Prepares emergency SMS with location
     3. Offers to call primary contact
   - Best option during severe attacks
   - Ensures all help channels are activated

---

## Database Schema

### Emergency Contacts Table
```sql
Table: emergency_contacts
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to auth.users)
- name (TEXT, Required)
- phone_number (TEXT, Required)
- relationship (TEXT, Optional)
- is_primary (BOOLEAN, Default: false)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Asthma Action Plan Table
```sql
Table: asthma_action_plan
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key to auth.users, Unique)
- green_zone_actions (TEXT)
- yellow_zone_actions (TEXT)
- red_zone_actions (TEXT)
- medications (TEXT)
- doctor_name (TEXT)
- doctor_phone (TEXT)
- hospital_name (TEXT)
- hospital_address (TEXT)
- allergies (TEXT)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

---

## Security & Privacy

### ✅ Row Level Security (RLS) Enabled
- Users can only access their own emergency contacts
- Users can only view/edit their own action plan
- No user can see another user's emergency data

### ✅ Secure Policies
- SELECT: Users can view own data
- INSERT: Users can create own data
- UPDATE: Users can modify own data
- DELETE: Users can remove own data

---

## Setup Instructions for New Users

### Step 1: Add Emergency Contacts
1. Open **Settings** tab
2. Tap **Add** in Emergency Contacts section
3. Add at least one contact (recommended: 2-3)
4. Set one as primary contact

### Step 2: Create Action Plan
1. Scroll to Asthma Action Plan section
2. Tap **Load Default** for a template
3. Customize each zone based on your doctor's advice
4. Add your medications and allergies
5. Fill in doctor and hospital information
6. Tap **Save Action Plan**

### Step 3: Test the SOS Button
1. Go to **Dashboard** tab
2. Locate the red SOS button on the right side
3. Tap it to see the emergency options
4. Familiarize yourself with each option
5. **Don't worry**: Tapping SOS won't automatically call or text

---

## Database Migration

To set up the database tables in Supabase:

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Run the updated `supabase_schema.sql` file
4. Verify tables are created:
   - `emergency_contacts`
   - `asthma_action_plan`

Or copy and paste the SQL from `supabase_schema.sql` starting from the Emergency Contacts Table section.

---

## Technical Details

### Components Created:
1. **EmergencyContactsManager.tsx** - Manage emergency contacts
2. **AsthmaActionPlanManager.tsx** - Manage action plan
3. **SOSButton.tsx** - Emergency button with all SOS actions

### Dependencies Added:
- ✅ Native Linking API (no additional packages needed)
- ✅ expo-location (already installed)
- ✅ Built-in Vibration API

### Permissions Required:
- **Location**: For GPS coordinates in emergency SMS
- **SMS**: Opens SMS app (no permission needed, user controls sending)
- **Phone**: Opens phone dialer (no permission needed, user controls calling)

---

## SMS Format Example

```
🚨 ASTHMA EMERGENCY ALERT 🚨

John Doe is having an asthma attack and needs immediate help!

Location:
37.7749, -122.4194
View on map: https://maps.google.com/?q=37.7749,-122.4194

Time: 11/11/2025, 2:30 PM

This is an automated SOS alert from QAir app.
```

---

## Best Practices

### For Patients:
1. ✅ Add at least 2-3 emergency contacts
2. ✅ Keep contact information up to date
3. ✅ Review action plan with your doctor
4. ✅ Practice using the SOS button when calm
5. ✅ Ensure location services are enabled
6. ✅ Keep your phone charged

### For Emergency Contacts:
1. ✅ Know you're listed as an emergency contact
2. ✅ Understand the patient's asthma triggers
3. ✅ Know the location of the patient's inhaler
4. ✅ Be familiar with the action plan
5. ✅ Keep your phone accessible

### For Healthcare Providers:
1. ✅ Review the action plan with patient
2. ✅ Ensure zones are properly defined
3. ✅ List specific medication names and dosages
4. ✅ Include your office contact information
5. ✅ Recommend nearby hospital/emergency room

---

## Troubleshooting

### Issue: SMS not opening
**Solution**: Make sure your device has an SMS app installed and default SMS app is set.

### Issue: Location not showing in SMS
**Solution**: 
1. Check location permissions for QAir app
2. Enable location services in device settings
3. Try again in an area with better GPS signal

### Issue: Can't add emergency contact
**Solution**:
1. Check internet connection
2. Verify phone number format
3. Ensure all required fields are filled
4. Check Supabase connection

### Issue: Action Plan not saving
**Solution**:
1. Check internet connection
2. Verify you're logged in
3. Try again or restart app
4. Check Supabase database connection

---

## Future Enhancements (Potential)

- 📱 Auto-call 911 option
- 📍 Share live location tracking
- 🔔 Push notifications to emergency contacts
- 📊 Send recent trigger history with alert
- 🎤 Voice-activated SOS
- ⌚ Apple Watch/Wear OS integration
- 🌐 Multi-language support
- 🚑 Integration with local emergency services

---

## Support

For questions or issues with the SOS feature:
- Email: patel.s.manojbhai@nuv.ac.in
- Email: jay.l.jaiswal@nuv.ac.in
- Email: ujjaval.r.rathod@nuv.ac.in

---

## Version History

### v1.0.0 - Initial SOS Feature Release
- ✅ Emergency contacts management
- ✅ Asthma action plan manager
- ✅ SOS button with 4 emergency options
- ✅ GPS location in emergency alerts
- ✅ Database schema with RLS policies

---

**Remember**: This feature is designed to assist during emergencies, but it should not replace professional medical care. Always seek immediate medical attention for severe asthma attacks. Call 911 or your local emergency number if breathing difficulty is severe.

---

*Stay Safe. Breathe Easy. QAir is here for you.* 🫁❤️
