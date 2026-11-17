// "Your free trial ends in N days" (from the Day 5 reminder notification).
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { HEART_PATH } from '../components/Icon';
import { BackHeader, Btn, Card, H, Page, T } from '../components/ui';
import { fmtDay } from '../data/model';
import { loadPlans, manage, TIERS, type Plan } from '../lib/billing';
import { useApp, wantKeys } from '../state/store';
import { c, color } from '../theme';

export default function TrialEnding() {
  const s = useApp();
  const a = s.access;
  const [plans, setPlans] = useState<Plan[]>([]);
  useEffect(() => { loadPlans().then(setPlans).catch(() => {}); }, []);

  const end = a?.expires_at ? new Date(a.expires_at) : null;
  const days = end ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000)) : 0;
  const price = plans.find((p) => p.tier === a?.tier && p.period === a?.period)?.priceString;
  const name = TIERS.find((t) => t.tier === a?.tier)?.name ?? '';

  if (!a?.in_trial || !end) {
    return (
      <Page>
        <BackHeader title="Free trial" />
        <T size={15} color={c.textSoft} center>You’re not on a free trial right now.</T>
        <Btn label="See my subscription" onPress={() => router.replace('/subscription')} />
      </Page>
    );
  }

  return (
    <Page>
      <BackHeader title="Free trial" />
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 120 }}>
        <Svg width={110} height={110} viewBox="0 0 24 24" style={{ position: 'absolute' }}><Path d={HEART_PATH} fill={color.a400} /></Svg>
        <H size={36} color={c.ink} style={{ marginTop: -8 }}>{days}</H>
      </View>
      <H size={30} center>Your free trial ends in {days} {days === 1 ? 'day' : 'days'}</H>
      <T size={15} color={c.textSoft} center>
        {a.will_renew
          ? `On ${fmtDay(end)} your ${name} plan starts${price ? ` at ${price} a ${a.period}` : ''}. Keep going and nothing changes. Cancel before then and you won’t be charged.`
          : `You’ve cancelled, so you won’t be charged. Full access continues until ${fmtDay(end)}.`}
      </T>
      <Card style={{ padding: 14 }}>
        <T size={13} center>So far you’ve rated {Object.keys(s.my).length} titles and have {wantKeys(s).length} on your watchlist.</T>
      </Card>
      <Btn label="Keep my plan" onPress={() => router.back()} />
      <Btn label="Change plan" kind="secondary" onPress={() => router.push('/subscription')} />
      {a.will_renew && (
        <Pressable onPress={() => manage(a.store)} style={{ alignItems: 'center', paddingVertical: 6 }}>
          <T size={14} weight="bold" color={color.a300}>Cancel before {fmtDay(end)}</T>
        </Pressable>
      )}
    </Page>
  );
}
