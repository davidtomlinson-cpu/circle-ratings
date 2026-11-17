import { useState } from 'react';
import { View } from 'react-native';
import { RateBtn, TitleRow } from '../../components/TitleRow';
import { CatChips } from '../../components/CatChips';
import { H, Page, T } from '../../components/ui';
import { item } from '../../data/model';
import type { Cat } from '../../data/types';
import { useApp, wantKeys } from '../../state/store';
import { c } from '../../theme';

export default function Watchlist() {
  const s = useApp();
  const [cat, setCat] = useState<Cat | 'All'>('All');
  const keys = wantKeys(s);
  const shown = keys.filter((k) => cat === 'All' || item(k, s.custom).cat === cat);

  return (
    <Page tabs>
      <View>
        <H size={26}>Watchlist</H>
        <T size={13} color={c.textSoft}>Things you fancy. Rate them once you’re done.</T>
      </View>
      <CatChips keys={keys} value={cat} onChange={setCat} />
      <T size={13} color={c.textSoft}>Watched, read or listened to one? Rate it and it moves to My list.</T>
      <View style={{ marginHorizontal: -6 }}>
        {shown.map((k) => <TitleRow key={k} k={k} action={<RateBtn k={k} />} />)}
      </View>
      {!shown.length && <T size={14} color={c.textMuted} center>Nothing here yet. Bookmark titles in Top 50 or add them from Trending.</T>}
    </Page>
  );
}
