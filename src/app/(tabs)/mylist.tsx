import { useState } from 'react';
import { View } from 'react-native';
import { CatChips } from '../../components/CatChips';
import { FilterField, matches, NoMatch } from '../../components/FilterField';
import { TitleRow } from '../../components/TitleRow';
import { Chip, ChipRow, H, Page, Row, T } from '../../components/ui';
import { ago, item } from '../../data/model';
import type { Cat } from '../../data/types';
import { useApp, viewers } from '../../state/store';
import { c, color } from '../../theme';

export default function MyList() {
  const s = useApp();
  const [cat, setCat] = useState<Cat | 'All'>('All');
  const [five, setFive] = useState(false);
  const [q, setQ] = useState('');

  const all = Object.keys(s.my).sort((a, b) => (s.rAt[b] ?? 0) - (s.rAt[a] ?? 0) || s.my[b] - s.my[a]);
  const inCat = all.filter((k) => cat === 'All' || item(k, s.custom).cat === cat);
  const fives = inCat.filter((k) => s.my[k] === 5);
  const shown = (five ? fives : inCat).filter((k) => { const it = item(k, s.custom); return matches(q, it.title, it.by, it.year); });
  const who = viewers(s);
  const share = s.vis === 'locked' ? 'Locked · only you can see it' : s.vis === 'all' ? `Shared live with all ${who.length} contacts` : `Shared live with ${who.length} ${who.length === 1 ? 'contact' : 'contacts'}`;

  return (
    <Page tabs>
      <View>
        <H size={26}>My list</H>
        <T size={13} color={c.textSoft}>Everything you’ve watched, read and heard, with your hearts.</T>
      </View>
      <CatChips keys={all} value={cat} onChange={setCat} />
      <FilterField value={q} onChange={setQ} placeholder="Find in your ratings" cat={cat} />
      <ChipRow>
        <Chip label={`All ratings · ${inCat.length}`} on={!five} onPress={() => setFive(false)} />
        <Chip label={`My 5 ♥ · ${fives.length}`} on={five} onPress={() => setFive(true)} />
      </ChipRow>
      <Row gap={6}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: s.vis === 'locked' ? color.n500 : color.s400 }} />
        <T size={12} color={c.textSoft}>{share}</T>
      </Row>
      <View style={{ marginHorizontal: -6 }}>
        {shown.map((k, i) => {
          const it = item(k, s.custom);
          const at = s.rAt[k];
          return <TitleRow key={k} k={k} sub={(i === 0 && at ? 'Latest · ' : '') + it.sub + (at ? ` · ${ago(at)}` : '')} />;
        })}
      </View>
      {!shown.length && (q.trim() && (five ? fives : inCat).length
        ? <NoMatch q={q} where="your ratings" cat={cat} />
        : <T size={14} color={c.textMuted} center>No ratings here yet.</T>)}
    </Page>
  );
}
