// RevenueCat → Supabase. RevenueCat sends the Authorization header configured in its dashboard;
// it must equal the REVENUECAT_WEBHOOK_AUTH secret. The event only tells us *who* changed:
// we re-read their current state from RevenueCat, so out-of-order or repeated events are harmless.
import { safeEqual, userIdsFromEvent } from '../_shared/revenuecat.ts';
import { syncUser } from '../_shared/sync.ts';

// Forgive the usual copy-paste slips in either place: spaces, wrapping quotes, a "Bearer " prefix.
const clean = (s: string) => s.trim().replace(/^bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const expected = clean(Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '');
  if (!expected) return json(503, { error: 'not_configured' });
  const raw = req.headers.get('authorization') ?? '';
  const got = clean(raw);
  if (!safeEqual(got, expected)) {
    // Never log the values: only enough to tell a typo from a missing or different header.
    console.warn(`webhook auth mismatch: header ${raw ? `${got.length} chars${/^bearer\s/i.test(raw.trim()) ? ' (Bearer)' : ''}` : 'missing'}, secret ${expected.length} chars`);
    return json(401, { error: 'unauthorized' });
  }

  let event: Record<string, unknown>;
  try {
    const body = await req.json();
    event = (body?.event ?? {}) as Record<string, unknown>;
  } catch {
    return json(400, { error: 'bad_json' });
  }
  if (event.type === 'TEST') return json(200, { ok: true, test: true });

  const ids = userIdsFromEvent(event);
  const results = await Promise.all(ids.map(async (id) => ({ id, ...(await syncUser(id)) })));
  // A non-2xx makes RevenueCat retry, which is what we want if RevenueCat or the DB had a blip.
  const failed = results.filter((r) => !r.ok);
  return json(failed.length ? 500 : 200, { ok: !failed.length, synced: results.length });
});
