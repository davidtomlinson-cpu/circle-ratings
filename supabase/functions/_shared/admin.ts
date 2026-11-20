// Service-role Supabase client for edge functions. Bypasses row level security, so only use it server-side.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

export const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
