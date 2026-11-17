// Store purchases via RevenueCat. Only runs in the iOS/Android app (a development or store build).
// In the browser or Expo Go there is no store, so `available()` is false and the paywall says so.
// Access itself is always decided by the server (my_access); this module only buys, restores and syncs.
import { Linking, Platform } from 'react-native';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  PURCHASES_ERROR_CODE,
  type PurchasesPackage,
} from 'react-native-purchases';
import { supabase } from './supabase';

export type Tier = 'individual' | 'family' | 'extended';
export type Period = 'month' | 'year';

export const TIERS: { tier: Tier; name: string; places: number; codes: number }[] = [
  { tier: 'individual', name: 'Individual', places: 1, codes: 0 },
  { tier: 'family', name: 'Family', places: 6, codes: 5 },
  { tier: 'extended', name: 'Extended family', places: 10, codes: 9 },
];

/** Design prices: shown only where the store can't supply real ones (browser preview). */
export const FALLBACK_PRICES: Record<Tier, Record<Period, number>> = {
  individual: { month: 3.99, year: 39.99 },
  family: { month: 6.99, year: 79.99 },
  extended: { month: 9.99, year: 99.99 },
};

export type Plan = {
  tier: Tier;
  period: Period;
  price: number;
  priceString: string;
  trialEligible: boolean;
  pkg: PurchasesPackage | null; // null = preview only, can't buy
  productId: string | null;
};

const KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

let configuredFor: string | null = null;

export const available = () => (Platform.OS === 'ios' || Platform.OS === 'android') && !!KEY;

/** Tie RevenueCat to the Supabase user id, so the server can look purchases up by that id. */
export async function identify(userId: string | null) {
  if (!available()) return;
  try {
    if (!configuredFor) {
      if (!userId) return;
      Purchases.configure({ apiKey: KEY!, appUserID: userId });
      configuredFor = userId;
    } else if (userId && userId !== configuredFor) {
      await Purchases.logIn(userId);
      configuredFor = userId;
    } else if (!userId) {
      // Signed out: forget the last user. RevenueCat makes an anonymous id until the next sign-in.
      await Purchases.logOut().catch(() => {});
      configuredFor = null;
    }
  } catch {
    // Billing problems must never block the rest of the app.
  }
}

const tierOf = (id: string) => (id.match(/cr_(individual|family|extended)/)?.[1] as Tier | undefined) ?? null;
const periodOf = (id: string) => (/annual|year/i.test(id) ? 'year' : 'month') as Period;

export async function loadPlans(): Promise<Plan[]> {
  if (!available()) {
    return TIERS.flatMap(({ tier }) =>
      (['month', 'year'] as Period[]).map((period) => ({
        tier, period, price: FALLBACK_PRICES[tier][period], priceString: `£${FALLBACK_PRICES[tier][period].toFixed(2)}`,
        trialEligible: true, pkg: null, productId: null,
      })),
    );
  }
  const offerings = await Purchases.getOfferings();
  const pkgs = offerings.current?.availablePackages ?? [];
  let eligibility: Record<string, { status: INTRO_ELIGIBILITY_STATUS }> = {};
  if (Platform.OS === 'ios' && pkgs.length) {
    eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(pkgs.map((p) => p.product.identifier)).catch(() => ({}));
  }
  const plans: Plan[] = [];
  for (const p of pkgs) {
    const id = p.product.identifier;
    const tier = tierOf(id);
    if (!tier) continue;
    const trialEligible = Platform.OS === 'ios'
      ? eligibility[id]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
      : !!p.product.introPrice; // Play only offers the free phase to eligible users
    plans.push({ tier, period: periodOf(id), price: p.product.price, priceString: p.product.priceString, trialEligible, pkg: p, productId: id });
  }
  return plans;
}

/** Ask the server to pull this user's latest state from RevenueCat (doesn't wait for the webhook). */
export async function syncWithServer() {
  await supabase.functions.invoke('sync-subscription', { method: 'POST' }).catch(() => {});
}

export type BuyResult = { ok: true } | { ok: false; cancelled: boolean; message: string };

export async function buy(plan: Plan, currentProductId?: string | null): Promise<BuyResult> {
  if (!plan.pkg) return { ok: false, cancelled: false, message: 'Subscriptions are bought in the iPhone or Android app.' };
  try {
    // Android needs to be told which subscription is being replaced; iOS handles this within the subscription group.
    const change = Platform.OS === 'android' && currentProductId && currentProductId !== plan.productId
      ? { oldProductIdentifier: currentProductId.split(':')[0] }
      : null;
    await Purchases.purchasePackage(plan.pkg, null, change);
    await syncWithServer();
    return { ok: true };
  } catch (e) {
    const err = e as { code?: string; userCancelled?: boolean | null; message?: string };
    const cancelled = err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || !!err.userCancelled;
    return { ok: false, cancelled, message: cancelled ? '' : err.message ?? 'The purchase didn’t go through.' };
  }
}

export async function restore(): Promise<BuyResult> {
  if (!available()) return { ok: false, cancelled: false, message: 'Restore works in the iPhone or Android app.' };
  try {
    await Purchases.restorePurchases();
    await syncWithServer();
    return { ok: true };
  } catch (e) {
    return { ok: false, cancelled: false, message: (e as Error).message ?? 'Couldn’t restore purchases.' };
  }
}

/** Store-owned cancel/manage screen. Cancelling always happens in the store, never in our app. */
export async function manage(store?: string | null) {
  if (available()) {
    try {
      await Purchases.showManageSubscriptions();
      return;
    } catch {
      // fall through to the store's web page
    }
  }
  const url = store === 'play_store' || Platform.OS === 'android'
    ? 'https://play.google.com/store/account/subscriptions?package=com.davala.circleratings'
    : 'https://apps.apple.com/account/subscriptions';
  await Linking.openURL(url).catch(() => {});
}

export const storeName = (store?: string | null) =>
  store === 'play_store' ? 'Google Play' : store === 'app_store' ? 'the App Store' : Platform.OS === 'android' ? 'Google Play' : 'the App Store';

/** Annual saving vs paying monthly for a year, as a whole percent. */
export function annualSaving(plans: Plan[], tier: Tier) {
  const m = plans.find((p) => p.tier === tier && p.period === 'month');
  const y = plans.find((p) => p.tier === tier && p.period === 'year');
  if (!m || !y || !m.price) return 0;
  return Math.max(0, Math.round((1 - y.price / (m.price * 12)) * 100));
}

export const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || '';
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || '';
