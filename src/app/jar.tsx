import { View } from 'react-native';
import { Jar } from '../components/Jar';
import { BackHeader, Card, H, HeartGlyph, Row, T, Page } from '../components/ui';
import { BUDGET, fmtDay, monthStart, nextMonth } from '../data/model';
import { jarLeft, useApp } from '../state/store';
import { c, color } from '../theme';

export default function JarPage() {
  const s = useApp();
  const left = jarLeft(s);
  const now = new Date();
  const ratings = Object.values(s.my);
  const lc = (n: number) => ratings.filter((v) => v === n).length;

  // Ratings per day this month, from real timestamps.
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const perDay = Array.from({ length: days }, () => 0);
  const m = monthStart(now);
  Object.values(s.rAt).forEach((t) => {
    if (t >= m) perDay[new Date(t).getDate() - 1]++;
  });
  const today = now.getDate();

  return (
    <Page>
      <BackHeader
        title="Jar of hearts"
        right={
          <View style={{ backgroundColor: color.n800, paddingHorizontal: 12, height: 26, borderRadius: 13, justifyContent: 'center' }}>
            <T size={12} weight="bold" color={color.a300}>{now.toLocaleDateString('en-GB', { month: 'long' })}</T>
          </View>
        }
      />
      <Jar left={left} />
      <View style={{ gap: 2 }}>
        <T size={14} center><H size={26}>{left}</H> of {BUDGET} hearts left this month</T>
        <T size={12} color={c.textMuted} center>Each rating uses its hearts · refills on {fmtDay(nextMonth(now))}</T>
      </View>

      <Card style={{ gap: 16 }}>
        <Row style={{ justifyContent: 'space-around' }}>
          {[['Loved', 5, color.a400], ['Really liked', 4, color.s400], ['Liked', 3, color.n400]].map(([label, n, col]) => (
            <View key={label as string} style={{ alignItems: 'center', gap: 4 }}>
              <HeartGlyph size={22} fill={col as string} />
              <T size={12} weight="bold">{label}</T>
              <View style={{ backgroundColor: color.n700, borderRadius: 10, paddingHorizontal: 8 }}>
                <T size={11} weight="bold" color={col as string}>×{lc(n as number)}</T>
              </View>
            </View>
          ))}
        </Row>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 50 }}>
          {perDay.map((n, i) => (
            <View
              key={i}
              style={{
                flex: 1, height: n ? 8 + Math.min(5, n) * 7 : 4, borderRadius: 2,
                backgroundColor: i + 1 > today || !n ? color.n700 : n >= 3 ? color.a400 : color.s400,
              }}
            />
          ))}
        </View>
        <T size={12} color={c.textMuted} center>Ratings per day this month</T>
      </Card>
    </Page>
  );
}
