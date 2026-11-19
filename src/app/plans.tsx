// Paywall / "Step 2 of 2: Try everything free for 7 days". Shown to signed-in people without access.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { Logo } from '../components/Logo';
import { PeriodSwitch, PlanCards } from '../components/PlanPicker';
import { Btn, Card, Disc, H, Page, Row, T } from '../components/ui';
import { fmtDay } from '../data/model';
import {
  available, buy, loadPlans, PRIVACY_URL, restore, storeName, TERMS_URL, type Period, type Plan, type Tier,
} from '../lib/billing';
import { supabase } from '../lib/supabase';
import { useApp } from '../state/store';
import { c, color } from '../theme';

const addDays = (n: number) => new Date(Date.now() + n * 86400000);

export default function Plans() {
  const s = useApp();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [tier, setTier] = useState<Tier>('individual');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPlans().then(setPlans).catch(() => setError('Couldn’t load plans from the store. Check your connection and try again.'));
  }, []);

  const plan = plans?.find((p) => p.tier === tier && p.period === period);
  const trial = !!plan?.trialEligible;
  const per = period === 'year' ? 'year' : 'month';

  const start = async () => {
    if (!plan || busy) return;
    setBusy(true);
    setError('');
    const r = await buy(plan, null);
    if (r.ok) {
      // The server confirms the purchase (sync + webhook). Poll briefly so access appears without a restart.
      for (let i = 0; i < 6 && !useApp.getState().access?.has_access; i++) {
        await s.refreshAccess();
        if (!useApp.getState().access?.has_access) await new Promise((res) => setTimeout(res, 1500));
      }
      setBusy(false);
      if (!useApp.getState().access?.has_access) setError('Purchase received. It can take a minute to activate. Pull to refresh or reopen the app.');
      return;
    }
    setBusy(false);
    if (!r.cancelled) setError(r.message);
  };

  const doRestore = async () => {
    setBusy(true);
    const r = await restore();
    await s.refreshAccess();
    setBusy(false);
    if (!r.ok) setError(r.message);
    else if (!useApp.getState().access?.has_access) setError('No active subscription found for this account.');
  };

  return (
    <Page>
      <Logo mark={56} text={26} />
      <View>
        <H size={32}>{trial ? 'Try everything free for 7 days' : 'Choose your plan'}</H>
        <T size={13} color={c.textMuted}>{trial ? 'Step 2 of 2' : 'Your ratings and lists are kept safe'}</T>
      </View>

      {trial && (
        // Compact three-step timeline, side by side, so the start button fits on screen.
        <Row gap={8} style={{ alignItems: 'flex-start' }}>
          {[
            { n: '1', bg: color.a400, title: 'Today', sub: 'Full access' },
            { n: '5', bg: color.s400, title: `Day 5 · ${fmtDay(addDays(5))}`, sub: 'We’ll remind you' },
            { n: '7', bg: color.n400, title: `Day 7 · ${fmtDay(addDays(7))}`, sub: 'Plan starts' },
          ].map((x) => (
            <View key={x.n} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Disc size={26} bg={x.bg} fg={c.ink} label={x.n} display={false} />
              <T size={12} weight="bold" center>{x.title}</T>
              <T size={11} color={c.textSoft} center>{x.sub}</T>
            </View>
          ))}
        </Row>
      )}

      <PeriodSwitch value={period} onChange={setPeriod} />
      {plans ? <PlanCards plans={plans} period={period} value={tier} onChange={setTier} /> : <T size={13} color={c.textMuted} center>Loading plans…</T>}

      {!available() && (
        <Card style={{ padding: 14 }}>
          <T size={13} color={c.textSoft}>Subscriptions are bought in the iPhone or Android app, through {Platform.OS === 'android' ? 'Google Play' : 'the App Store or Google Play'}. Prices shown here are a preview.</T>
        </Card>
      )}
      {!!error && <Card bg={color.a800} style={{ padding: 14 }}><T size={13} color={color.a100}>{error}</T></Card>}

      <Btn
        label={busy ? 'Please wait…' : trial ? 'Start my free trial' : `Subscribe for ${plan?.priceString ?? ''} a ${per}`}
        disabled={!plan || busy || !available()}
        onPress={start}
      />
      {/* Required disclosure: price, renewal, how to cancel. */}
      <T size={12} color={c.textMuted} center>
        {plan
          ? trial
            ? `No charge today. Cancel before ${fmtDay(addDays(7))} and you won’t pay. After that it’s ${plan.priceString} a ${per}, renewing automatically until you cancel in ${storeName()} settings.`
            : `${plan.priceString} a ${per}, renewing automatically until you cancel. Cancel anytime in ${storeName()} settings.`
          : ''}
      </T>

      <Row gap={18} style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        <Pressable onPress={() => router.push('/family-join')}><T size={13} weight="bold" color={color.a300}>Have a family invitation?</T></Pressable>
        <Pressable onPress={doRestore} disabled={busy}><T size={13} weight="bold" color={c.textSoft}>Restore purchases</T></Pressable>
      </Row>
      <Row gap={18} style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        {!!TERMS_URL && <Pressable onPress={() => Linking.openURL(TERMS_URL)}><T size={12} color={c.textMuted}>Terms of use</T></Pressable>}
        {!!PRIVACY_URL && <Pressable onPress={() => Linking.openURL(PRIVACY_URL)}><T size={12} color={c.textMuted}>Privacy policy</T></Pressable>}
        <Pressable onPress={() => router.push('/profile')}><T size={12} color={c.textMuted}>Account</T></Pressable>
        <Pressable onPress={() => supabase.auth.signOut()}><T size={12} color={c.textMuted}>Sign out</T></Pressable>
      </Row>
    </Page>
  );
}
