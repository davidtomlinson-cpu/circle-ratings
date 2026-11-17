import { Pressable, View } from 'react-native';
import { annualSaving, TIERS, type Period, type Plan, type Tier } from '../lib/billing';
import { c, color } from '../theme';
import { Row, T } from './ui';

export function PeriodSwitch({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <Row gap={4} style={{ alignSelf: 'center', backgroundColor: color.n800, padding: 4, borderRadius: 999 }}>
      {(['month', 'year'] as Period[]).map((p) => (
        <Pressable
          key={p}
          accessibilityRole="button"
          accessibilityState={{ selected: value === p }}
          onPress={() => onChange(p)}
          style={{ paddingHorizontal: 16, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: value === p ? color.n600 : 'transparent' }}
        >
          <T size={13} weight="bold">{p === 'month' ? 'Monthly' : 'Annual'}</T>
        </Pressable>
      ))}
    </Row>
  );
}

/** Radio cards for the three plans at the chosen period. Prices come from the store when available. */
export function PlanCards({ plans, period, value, onChange, current }: {
  plans: Plan[]; period: Period; value: Tier; onChange: (t: Tier) => void; current?: Tier | null;
}) {
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup">
      {TIERS.map((t) => {
        const plan = plans.find((p) => p.tier === t.tier && p.period === period);
        if (!plan) return null;
        const on = value === t.tier;
        const save = period === 'year' ? annualSaving(plans, t.tier) : 0;
        const title = t.places > 1 ? `${t.name} · up to ${t.places}` : t.name;
        const sub = `${plan.priceString} a ${period === 'year' ? 'year' : 'month'}${t.codes ? ` · ${t.codes} invite codes` : ''}`;
        return (
          <Pressable
            key={t.tier}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(t.tier)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: color.n800, borderWidth: 2, borderColor: on ? color.a400 : 'transparent' }}
          >
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? color.a400 : color.n500, alignItems: 'center', justifyContent: 'center' }}>
              {on && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color.a400 }} />}
            </View>
            <View style={{ flex: 1 }}>
              <T size={14} weight="bold">{title}</T>
              <T size={12} color={c.textMuted}>{sub}</T>
            </View>
            {current === t.tier && <T size={11} weight="bold" color={color.s300}>CURRENT</T>}
            {!!save && current !== t.tier && (
              <View style={{ backgroundColor: color.s700, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                <T size={11} weight="bold" color={color.s100}>Save {save}%</T>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
