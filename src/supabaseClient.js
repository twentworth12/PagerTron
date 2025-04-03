// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl); // Debug log (remove in production)
// console.log("Supabase Anon Key:", supabaseAnonKey); // Be cautious logging sensitive keys

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("supabaseUrl and supabaseAnonKey are required");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
