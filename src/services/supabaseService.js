import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if environment variables are defined
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not defined!', {
    url: supabaseUrl ? 'defined' : 'undefined',
    key: supabaseKey ? 'defined' : 'undefined'
  });
}

// Create a single instance with minimal configuration
// Simplifying to avoid schema query errors
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true
  }
}); 