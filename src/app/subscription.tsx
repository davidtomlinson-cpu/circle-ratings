// Subscription status and plan changes. Cancelling always happens in the store (Apple/Google own billing),
// so instead of the design's in-app cancel confirm, "Manage or cancel" opens the store's own screen.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { PeriodSwitch, PlanCards } from '../components/PlanPicker';
import { BackHeader, Btn, Card, H, Page, T } from '../components/ui';
import { fmtDay } from '../data/model';
import { available, buy, loadPlans, manage, restore, storeName, TIERS, type Period, type Plan, type Tier } from '../lib/billing';
import { supabase } from '../lib/supabase';
import { useApp } from '../state/store';
import { c, color } from '../theme';

const tierName = (t?: string | null) => TIERS.find((x) => x.tier === t)?.name ?? 'Plan';

export default function Subscription() {
  const s = useApp();
  const a = s.access;
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [period, setPeriod] = useState<Period>((a?.period as Period) ?? 'month');
  const [tier, setTier] = useState<Tier>((a?.tier as Tier) ?? 'individual');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => { loadPlans().then(setPlans).catch(() => {}); void s.refreshAccess(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isMember = a?.source === 'family';
  const expires = a?.expires_at ? fmtDay(new Date(a.expires_at)) : '';
  const price = plans?.find((p) => p.tier === a?.tier && p.period === a?.period)?.priceString;
  const status = !a?.has_access
    ? 'No active plan'
    : isMember
      ? `Member of ${a.owner_name}’s plan`
      : a.billing_issue
        ? `There’s a problem with your payment. Update it in ${storeName(a.store)} to keep access.`
        : a.in_trial
          ? `Free trial · ends ${expires}${a.will_renew && price ? `, then ${price} a ${a.period}` : ''}`
          : a.will_renew
            ? `Renews ${expires}${price ? ` · ${price} a ${a.period}` : ''}`
            : `Cancelled · full access until ${expires}`;

  const selected = plans?.find((p) => p.tier === tier && p.period === period);
  const isCurrent = tier === a?.tier && period === a?.period && a?.source === 'own';

  const change = async () => {
    if (!selected || isCurrent) return;
    setBusy(true);
    setMsg('');
    const current = plans?.find((p) => p.tier === a?.tier && p.period === a?.period)?.productId ?? null;
    const r = await buy(selected, current);
    await s.refreshAccess();
    setBusy(false);
    if (r.ok) setMsg('Plan updated. Changes to a cheaper plan take effect from your next billing date.');
    else if (!r.cancelled) setMsg(r.message);
  };

  const leave = async () => {
    await supabase.rpc('leave_family');
    await s.refreshAccess();
    setConfirmLeave(false);
  };

  return (
    <Page>
      <BackHeader title="Subscription" />
      <Card bg={a?.has_access ? color.s700 : color.n800} style={{ gap: 6 }}>
        <T size={11} weight="bold" color={color.s200} style={{ letterSpacing: 0.6 }}>YOUR PLAN</T>
        <H size={26}>{a?.has_access ? tierName(a.tier) : 'None'}</H>
        <T size={13} color={a?.billing_issue ? color.a200 : color.s100}>{status}</T>
      </Card>

      {isMember ? (
        <View style={{ gap: 10 }}>
          <T size={14} color={c.textSoft}>{a?.owner_name} pays for this plan. If they cancel, you keep access until their plan ends.</T>
          {confirmLeave ? (
            <Card style={{ gap: 10 }}>
              <T size={14}>Leave {a?.owner_name}’s plan? You’ll lose access unless you start your own plan.</T>
              <Btn small label="Leave plan" onPress={leave} />
              <Btn small label="Stay" kind="secondary" onPress={() => setConfirmLeave(false)} />
            </Card>
          ) : (
            <Pressable onPress={() => setConfirmLeave(true)}><T size={14} weight="bold" color={color.a400}>Leave this plan</T></Pressable>
          )}
        </View>
      ) : (
        <>
          <H size={22}>Change plan</H>
          <PeriodSwitch value={period} onChange={setPeriod} />
          {plans && <PlanCards plans={plans} period={period} value={tier} onChange={setTier} current={a?.source === 'own' && a.period === period ? (a.tier as Tier) : null} />}
          {!isCurrent && a?.source === 'own' && (
            <Btn label={busy ? 'Please wait…' : `Switch to ${tierName(tier)}${period === 'year' ? ' (annual)' : ''}`} disabled={busy || !available() || !selected} onPress={change} />
          )}
          {!a?.has_access && <Btn label="Choose a plan" onPress={() => router.push('/plans')} />}
          <T size={12} color={c.textMuted}>Upgrades start straight away. Changes to a cheaper plan apply from your next billing date.</T>
          {!!msg && <T size={13} color={color.a300}>{msg}</T>}
          {a?.source === 'own' && (
            <Btn label={a.will_renew ? 'Manage or cancel' : 'Resubscribe or manage'} kind="secondary" onPress={() => manage(a.store)} />
          )}
        </>
      )}

      <Pressable onPress={async () => { setBusy(true); const r = await restore(); await s.refreshAccess(); setBusy(false); setMsg(r.ok ? 'Purchases restored.' : r.message); }}>
        <T size={13} weight="bold" color={c.textSoft} center>Restore purchases</T>
      </Pressable>
      <T size={12} color={c.textMuted} center>Billing is handled by the App Store or Google Play. Cancel anytime in their settings.</T>
    </Page>
  );
}
