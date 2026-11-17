// Run: node --experimental-strip-types supabase/functions/_shared/test/revenuecat.test.ts
import assert from 'node:assert/strict';
import { periodOf, safeEqual, tierOf, toRow, userIdsFromEvent } from '../revenuecat.ts';

const U = '0e7b2d9c-1111-4222-8333-944455556666';
const now = new Date('2026-11-18T12:00:00Z');
let n = 0;
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok', name); };

t('tier and period from App Store ids', () => {
  assert.equal(tierOf('cr_family_monthly'), 'family');
  assert.equal(tierOf('cr_extended_annual'), 'extended');
  assert.equal(periodOf('cr_extended_annual'), 'year');
  assert.equal(periodOf('cr_individual_monthly'), 'month');
  assert.equal(tierOf('something_else'), null);
});

t('App Store trial maps to in_trial, renewing', () => {
  const row = toRow(U, {
    entitlements: { access: { expires_date: '2026-11-25T12:00:00Z', product_identifier: 'cr_family_monthly' } },
    subscriptions: { cr_family_monthly: { expires_date: '2026-11-25T12:00:00Z', period_type: 'trial', store: 'app_store', unsubscribe_detected_at: null, billing_issues_detected_at: null, is_sandbox: true } },
  }, now)!;
  assert.deepEqual([row.tier, row.period, row.store, row.in_trial, row.will_renew, row.billing_issue, row.sandbox], ['family', 'month', 'app_store', true, true, false, true]);
  assert.equal(row.expires_at, '2026-11-25T12:00:00.000Z');
});

t('Google Play base plan id ("cr_extended:annual") with subscriptions keyed by base id', () => {
  const row = toRow(U, {
    entitlements: { access: { expires_date: '2027-11-18T12:00:00Z', product_identifier: 'cr_extended:annual' } },
    subscriptions: { cr_extended: { expires_date: '2027-11-18T12:00:00Z', period_type: 'normal', store: 'play_store', unsubscribe_detected_at: '2026-11-20T00:00:00Z', product_plan_identifier: 'annual' } },
  }, now)!;
  assert.deepEqual([row.tier, row.period, row.store, row.in_trial, row.will_renew], ['extended', 'year', 'play_store', false, false]);
});

t('billing issue flagged', () => {
  const row = toRow(U, {
    entitlements: { access: { expires_date: '2026-11-19T12:00:00Z', product_identifier: 'cr_individual_monthly' } },
    subscriptions: { cr_individual_monthly: { expires_date: '2026-11-19T12:00:00Z', billing_issues_detected_at: '2026-11-18T00:00:00Z', store: 'app_store' } },
  }, now)!;
  assert.equal(row.billing_issue, true);
});

t('expired entitlement still produces a row (access ends by date)', () => {
  const row = toRow(U, { entitlements: { access: { expires_date: '2026-10-01T00:00:00Z', product_identifier: 'cr_family_annual' } }, subscriptions: {} }, now)!;
  assert.ok(new Date(row.expires_at) < now);
});

t('no entitlement → null; unknown product → null', () => {
  assert.equal(toRow(U, {}, now), null);
  assert.equal(toRow(U, { entitlements: { access: { expires_date: null, product_identifier: 'other_app_product' } } }, now), null);
});

t('webhook ids: current, aliases, transfers; non-UUID anonymous ids dropped', () => {
  const ids = userIdsFromEvent({ app_user_id: U, original_app_user_id: '$RCAnonymousID:abc', aliases: ['$RCAnonymousID:abc', U], transferred_to: ['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'] });
  assert.deepEqual(ids.sort(), [U, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'].sort());
});

t('safeEqual', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
});
console.log(`${n} passed`);
