
import { createClient } from '@supabase/supabase-js';

// Credentials provided by the user
const SUPABASE_URL = 'https://ylibptdgicyrgzpwyowu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YVfOO41jSpz0FM79qDkkYg_KcLa9iLq';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Explicitly ensure this is true for OAuth hash handling
    flowType: 'implicit' // Standard for browser-only apps handling hash fragments
  }
});
