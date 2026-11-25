// Turns a RevenueCat v1 subscriber into our `subscriptions` row. Pure, so it can be unit-tested.
//
// Product IDs (see docs/billing-setup.md):
//   App Store:   cr_individual_monthly, cr_individual_annual, cr_family_monthly, ... cr_extended_annual
//   Google Play: subscriptions cr_individual / cr_family / cr_extended, base plans "monthly" / "annual"
//                (RevenueCat reports these as "cr_family:monthly", with the plan also in product_plan_identifier)

export const ENTITLEMENT = 'access';

export type Tier = 'individual' | 'family' | 'extended';
export type Period = 'month' | 'year';

type RcEntitlement = { expires_date: string | null; product_identifier: string; purchase_date?: string };
type RcSubscription = {
  expires_date: string | null;
  period_type?: string; // "trial" | "intro" | "normal"
  store?: string; // "app_store" | "play_store" | ...
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  is_sandbox?: boolean;
  product_plan_identifier?: string | null;
};
export type RcSubscriber = {
  entitlements?: Record<string, RcEntitlement>;
  subscriptions?: Record<string, RcSubscription>;
};

export type SubscriptionRow = {
  user_id: string;
  tier: Tier;
  period: Period;
  store: 'app_store' | 'play_store';
  product_id: string;
  in_trial: boolean;
  will_renew: boolean;
  billing_issue: boolean;
  expires_at: string;
  sandbox: boolean;
  updated_at: string;
};

export function tierOf(productId: string): Tier | null {
  const m = productId.toLowerCase().match(/(?:^|_)(individual|family|extended)(?:[_:.]|$)/);
  return (m?.[1] as Tier) ?? null;
}

export function periodOf(productId: string, plan?: string | null): Period {
  return /annual|year/i.test(`${productId} ${plan ?? ''}`) ? 'year' : 'month';
}

/** Find the subscription record for an entitlement's product (Google keys may omit the ":baseplan" part). */
function findSub(subs: Record<string, RcSubscription>, productId: string) {
  if (subs[productId]) return subs[productId];
  const base = productId.split(':')[0];
  if (subs[base]) return subs[base];
  const key = Object.keys(subs).find((k) => k.split(':')[0] === base);
  return key ? subs[key] : undefined;
}

/**
 * Returns the row to store, or null if RevenueCat has never seen an entitlement for this user.
 * An expired entitlement still produces a row (with a past expires_at) so history is kept and access ends.
 */
export function toRow(userId: string, sub: RcSubscriber, now = new Date()): SubscriptionRow | null {
  const ent = sub.entitlements?.[ENTITLEMENT];
  if (!ent?.product_identifier) return null;
  const tier = tierOf(ent.product_identifier);
  if (!tier) return null;
  const s = findSub(sub.subscriptions ?? {}, ent.product_identifier);
  // A null expiry would mean a lifetime unlock; we don't sell those, so treat it as needing a re-check soon.
  const expires = ent.expires_date ?? s?.expires_date ?? now.toISOString();
  return {
    user_id: userId,
    tier,
    period: periodOf(ent.product_identifier, s?.product_plan_identifier),
    store: s?.store === 'play_store' ? 'play_store' : 'app_store',
    product_id: ent.product_identifier,
    in_trial: s?.period_type === 'trial',
    will_renew: !s?.unsubscribe_detected_at,
    billing_issue: !!s?.billing_issues_detected_at,
    expires_at: new Date(expires).toISOString(),
    sandbox: !!s?.is_sandbox,
    updated_at: now.toISOString(),
  };
}

/** All user ids mentioned by a webhook event (current, original, aliases, transfers). Only UUIDs are ours. */
export function userIdsFromEvent(event: Record<string, unknown>): string[] {
  const out = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === 'string') out.add(v);
    else if (Array.isArray(v)) v.forEach(add);
  };
  add(event.app_user_id);
  add(event.original_app_user_id);
  add(event.aliases);
  add(event.transferred_from);
  add(event.transferred_to);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return [...out].filter((id) => uuid.test(id));
}

/** Constant-time string compare for the webhook secret. */
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
