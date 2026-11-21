import './session-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env');

export const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh tokens while the app is in the foreground (recommended for mobile).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Turn a Supabase/Postgres error into a sentence we can show. */
export function friendlyError(e: { message?: string; hint?: string; code?: string } | null | undefined) {
  if (!e) return '';
  if (e.hint === 'subscription_required') return 'Your plan has ended. Choose a plan to keep rating.';
  if (e.message?.includes('Invalid login credentials')) return 'That email and password don’t match.';
  if (e.message?.includes('User already registered')) return 'There’s already an account with that email. Try signing in.';
  if (e.message?.includes('Email not confirmed')) return 'Confirm your email first. Check your inbox for the link.';
  if (e.message?.includes('Failed to fetch') || e.message?.includes('Network request failed')) return 'Can’t reach the server. Check your connection.';
  return e.message ?? 'Something went wrong.';
}
