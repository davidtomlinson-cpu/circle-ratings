// Called by the app straight after a purchase or restore, so access doesn't wait for the webhook.
// Requires the user's own JWT; a user can only sync themselves.
import { admin, syncUser } from '../_shared/sync.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer /i, '');
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data.user) return json(401, { error: 'unauthorized' });
  const r = await syncUser(data.user.id);
  return json(r.ok ? 200 : r.status === 'not_configured' ? 503 : 502, r);
});
