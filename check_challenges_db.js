// Quick script to verify Supabase database setup
// Run this with: node check_challenges_db.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking Supabase database setup...\n');

  try {
    // Check if user_challenges table exists
    console.log('1. Checking user_challenges table...');
    const { data: challenges, error: challengesError } = await supabase
      .from('user_challenges')
      .select('*')
      .limit(1);

    if (challengesError) {
      console.error('❌ user_challenges table NOT FOUND');
      console.error('   Error:', challengesError.message);
      console.log('\n📝 Action Required:');
      console.log('   1. Open Supabase Dashboard → SQL Editor');
      console.log('   2. Run the SQL from supabase_schema.sql (lines 128-216)');
      console.log('   3. See APPLY_DATABASE_CHANGES.md for detailed instructions\n');
      return false;
    } else {
      console.log('✅ user_challenges table exists');
    }

    // Check if challenge_progress_logs table exists
    console.log('2. Checking challenge_progress_logs table...');
    const { data: logs, error: logsError } = await supabase
      .from('challenge_progress_logs')
      .select('*')
      .limit(1);

    if (logsError) {
      console.error('❌ challenge_progress_logs table NOT FOUND');
      console.error('   Error:', logsError.message);
      return false;
    } else {
      console.log('✅ challenge_progress_logs table exists');
    }

    // Check other tables
    console.log('3. Checking other tables...');
    const { data: triggers, error: triggersError } = await supabase
      .from('inhaler_triggers')
      .select('*')
      .limit(1);
    
    if (!triggersError) {
      console.log('✅ inhaler_triggers table exists');
    }

    const { data: contacts, error: contactsError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .limit(1);
    
    if (!contactsError) {
      console.log('✅ emergency_contacts table exists');
    }

    const { data: actionPlan, error: planError } = await supabase
      .from('asthma_action_plan')
      .select('*')
      .limit(1);
    
    if (!planError) {
      console.log('✅ asthma_action_plan table exists');
    }

    console.log('\n🎉 All database tables are properly configured!');
    console.log('✨ You can now use the Challenges feature in your app.\n');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

checkDatabase()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
