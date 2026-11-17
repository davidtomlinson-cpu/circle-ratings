import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { AddBtn, openTitle } from '../components/TitleRow';
import { BackHeader, Btn, Chip, ChipRow, Page, Row, SectionLabel, T } from '../components/ui';
import { TitleRow } from '../components/TitleRow';
import { ALL_TOP_KEYS, EXTRA_KEYS, item } from '../data/model';
import { CATS, type Cat } from '../data/types';
import { useApp } from '../state/store';
import { c, color } from '../theme';

export default function Search() {
  const custom = useApp((s) => s.custom);
  const addCustom = useApp((s) => s.addCustom);
  const [q, setQ] = useState('');
  const [newCat, setNewCat] = useState<Cat>('Movies');
  const query = q.trim().toLowerCase();

  const all = [...ALL_TOP_KEYS, ...EXTRA_KEYS, ...Object.keys(custom).map((id) => `C#${id}`)];
  const results = query
    ? all.filter((k) => {
        const it = item(k, custom);
        return it.title.toLowerCase().includes(query) || it.by.toLowerCase().includes(query);
      }).slice(0, 30)
    : EXTRA_KEYS;

  return (
    <Page>
      <BackHeader title="Add a title" />
      <Row gap={10} style={{ height: 52, borderRadius: 26, borderWidth: 2, borderColor: color.n700, backgroundColor: color.n800, paddingHorizontal: 16 }}>
        <Icon name="search" size={18} color={color.n400} />
        <TextInput
          autoFocus
          value={q}
          onChangeText={setQ}
          placeholder="Search films, TV, books, albums"
          placeholderTextColor={color.n500}
          style={{ flex: 1, color: c.text, fontFamily: 'Figtree_400Regular', ...({ outlineWidth: 0 } as object), fontSize: 15, height: '100%' }}
        />
      </Row>
      <SectionLabel>{query ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Not in the Top 50 · try these'}</SectionLabel>
      <View style={{ marginHorizontal: -6 }}>
        {results.map((k) => <TitleRow key={k} k={k} action={<AddBtn k={k} />} />)}
      </View>

      {!!query && (
        <View style={{ gap: 10, backgroundColor: color.n800, borderRadius: 24, padding: 16 }}>
          <T size={14} weight="bold">Can’t find it? Add “{q.trim()}” yourself</T>
          <ChipRow>
            {CATS.map((x) => <Chip key={x} label={x} on={x === newCat} onPress={() => setNewCat(x)} />)}
          </ChipRow>
          <Btn small label="Add to my watchlist" onPress={() => { const k = addCustom(q.trim(), newCat); setQ(''); openTitle(k); }} />
          <T size={11} color={c.textMuted}>Real catalogue search (TMDB, Open Library, MusicBrainz) comes with the backend.</T>
        </View>
      )}
    </Page>
  );
}
