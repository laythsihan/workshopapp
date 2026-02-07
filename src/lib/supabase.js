import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log to console once so you can verify the URL is loading in the browser
console.log("Connecting to Supabase at:", supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials missing! Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);