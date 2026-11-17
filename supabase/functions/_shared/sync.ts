// Fetch a user's current state from RevenueCat and store it. Used by both the webhook and the app-triggered sync.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { toRow, type RcSubscriber } from './revenuecat.ts';

export const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

export async function syncUser(userId: string): Promise<{ ok: boolean; status: string }> {
  const key = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!key) return { ok: false, status: 'not_configured' };

  const db = admin();
  // Only sync real accounts.
  const { data: profile } = await db.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (!profile) return { ok: true, status: 'unknown_user' };

  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return { ok: false, status: `revenuecat_${res.status}` };
  const body = (await res.json()) as { subscriber?: RcSubscriber };
  const row = toRow(userId, body.subscriber ?? {});

  if (!row) {
    // Never had an entitlement in RevenueCat. Leave manual test rows alone; otherwise clear any stale row.
    await db.from('subscriptions').delete().eq('user_id', userId).neq('store', 'test');
    return { ok: true, status: 'none' };
  }
  const { error } = await db.from('subscriptions').upsert(row, { onConflict: 'user_id' });
  if (error) return { ok: false, status: `db_${error.code}` };
  return { ok: true, status: new Date(row.expires_at) > new Date() ? (row.in_trial ? 'trial' : 'active') : 'expired' };
}
