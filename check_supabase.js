// Quick script to check Supabase inhaler_triggers table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ptexxdbbyhejbucrztcn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0ZXh4ZGJieWhlamJ1Y3J6dGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMDc2NDIsImV4cCI6MjA3NTU4MzY0Mn0.6dSbQFnoGunEYUfsaaYIDFh3b_weadowLpJxCL240Bo';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTriggers() {
  console.log('Fetching all inhaler triggers...\n');
  
  const { data, error } = await supabase
    .from('inhaler_triggers')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No triggers found in database');
    console.log('\nThis means the app is NOT recording triggers to Supabase.');
    return;
  }
  
  console.log(`✅ Found ${data.length} triggers:\n`);
  
  data.forEach((trigger, index) => {
    console.log(`--- Trigger #${index + 1} ---`);
    console.log(`ID: ${trigger.id}`);
    console.log(`User ID: ${trigger.user_id}`);
    console.log(`Location: ${trigger.latitude}, ${trigger.longitude}`);
    console.log(`Timestamp: ${trigger.timestamp}`);
    console.log(`AQI: ${trigger.aqi} (${trigger.category})`);
    console.log(`PM2.5: ${trigger.pm25}, PM10: ${trigger.pm10}`);
    console.log(`Temperature: ${trigger.temperature}°C, Humidity: ${trigger.humidity}%`);
    console.log('');
  });
}

checkTriggers();
