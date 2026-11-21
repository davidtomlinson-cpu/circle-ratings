import { useState } from 'react';
import { View } from 'react-native';
import { RateBtn, TitleRow } from '../../components/TitleRow';
import { FilterField, matches, NoMatch } from '../../components/FilterField';
import { CatChips } from '../../components/CatChips';
import { H, Page, T } from '../../components/ui';
import { item } from '../../data/model';
import type { Cat } from '../../data/types';
import { useApp, wantKeys } from '../../state/store';
import { c } from '../../theme';

export default function Watchlist() {
  const s = useApp();
  const [cat, setCat] = useState<Cat | 'All'>('All');
  const [q, setQ] = useState('');
  const keys = wantKeys(s);
  const inCat = keys.filter((k) => cat === 'All' || item(k, s.custom).cat === cat);
  const shown = inCat.filter((k) => { const it = item(k, s.custom); return matches(q, it.title, it.by, it.year); });

  return (
    <Page tabs>
      <View>
        <H size={26}>Watchlist</H>
        <T size={13} color={c.textSoft}>Things you fancy. Rate them once you’re done.</T>
      </View>
      <CatChips keys={keys} value={cat} onChange={setCat} />
      <FilterField value={q} onChange={setQ} placeholder="Find in your watchlist" cat={cat} />
      <T size={13} color={c.textSoft}>Watched, read or listened to one? Rate it and it moves to My list.</T>
      <View style={{ marginHorizontal: -6 }}>
        {shown.map((k) => <TitleRow key={k} k={k} action={<RateBtn k={k} />} />)}
      </View>
      {!shown.length && (q.trim() && inCat.length
        ? <NoMatch q={q} where="your watchlist" cat={cat} />
        : <T size={14} color={c.textMuted} center>Nothing here yet. Bookmark titles in Top 50 or add them from Trending.</T>)}
    </Page>
  );
}
