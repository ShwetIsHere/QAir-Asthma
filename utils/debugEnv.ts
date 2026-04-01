// Debug utility to check environment variables
// Use this temporarily to verify your API key is loaded

export const debugEnvVars = () => {
  const openRouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  const backupGeminiKey = process.env.EXPO_PUBLIC_BACKUP_API_KEY || process.env.backup_api_key;
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
  console.log('OpenRouter API Key:', openRouterKey ? `${openRouterKey.substring(0, 15)}... (${openRouterKey.length} chars)` : 'NOT SET');
  console.log('Backup Gemini Key:', backupGeminiKey ? `${backupGeminiKey.substring(0, 15)}... (${backupGeminiKey.length} chars)` : 'NOT SET');
  console.log('Supabase URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT SET');
  console.log('Supabase Key:', supabaseKey ? `${supabaseKey.substring(0, 15)}... (${supabaseKey.length} chars)` : 'NOT SET');
  console.log('===================================');

  return {
    hasOpenRouterKey: !!openRouterKey,
    hasBackupGeminiKey: !!backupGeminiKey,
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseKey,
    openRouterKeyLength: openRouterKey?.length || 0,
    backupGeminiKeyLength: backupGeminiKey?.length || 0,
  };
};

// Call this in your app to debug
// Example: import { debugEnvVars } from '@/utils/debugEnv';
// debugEnvVars();
