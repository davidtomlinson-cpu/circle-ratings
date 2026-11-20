// Search & add: titles we already have (instant), then the real catalogue (Wikidata for films, TV and
// books; MusicBrainz for albums). Picking a catalogue result saves it on the server first, so watchlists,
// ratings and comments all work the same as for Top 50 titles.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { openTitle, TitleRow } from '../components/TitleRow';
import { BackHeader, Btn, Chip, ChipRow, Page, Row, SectionLabel, T } from '../components/ui';
import { EXTRA_KEYS, KIND } from '../data/model';
import { CATS, type Cat } from '../data/types';
import { supabase } from '../lib/supabase';
import { useApp, type TitleRow as TitleData } from '../state/store';
import { c, color } from '../theme';

type Found = TitleData;
const SOURCE_NAME: Record<string, string> = { wikidata: 'film, TV and book', musicbrainz: 'album' };

export default function Search() {
  const addCustom = useApp((s) => s.addCustom);
  const learnTitles = useApp((s) => s.learnTitles);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Cat | 'All'>('All');
  const [newCat, setNewCat] = useState<Cat>('Movies');
  const [local, setLocal] = useState<Found[]>([]);
  const [remote, setRemote] = useState<{ q: string; rows: Found[]; busy: string[] } | null>(null);
  const query = q.trim();
  const seq = useRef(0);

  // Titles already on SofaList: quick, so search as you type.
  useEffect(() => {
    if (query.length < 2) return;
    let live = true;
    void supabase
      .rpc('search_titles', { p_q: query, p_category: cat === 'All' ? null : cat, p_limit: 20 })
      .then(({ data }) => {
        if (!live || !data) return;
        learnTitles(data as Found[]);
        setLocal(data as Found[]);
      });
    return () => { live = false; };
  }, [query, cat, learnTitles]);

  // The outside catalogue: wait until typing pauses, and ignore answers to older searches.
  useEffect(() => {
    if (query.length < 2) return;
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.functions.invoke('catalogue', {
        body: { action: 'search', q: query, category: cat === 'All' ? undefined : cat },
      });
      if (mine !== seq.current) return;
      const d = data as { results?: Found[]; busy?: string[] } | null;
      const rows = d?.results ?? [];
      learnTitles(rows);
      setRemote({ q: `${query}|${cat}`, rows, busy: error ? ['wikidata', 'musicbrainz'] : d?.busy ?? [] });
    }, 450);
    return () => clearTimeout(t);
  }, [query, cat, learnTitles]);

  const searching = query.length >= 2;
  const done = remote?.q === `${query}|${cat}`;
  const seen = new Set<string>();
  const results = searching
    ? [...local, ...(done ? remote!.rows : [])].filter((r) => (seen.has(r.key) ? false : (seen.add(r.key), true))).slice(0, 40)
    : [];
  const busy = done ? remote!.busy : [];

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
          returnKeyType="search"
          style={{ flex: 1, color: c.text, fontFamily: 'Figtree_400Regular', ...({ outlineWidth: 0 } as object), fontSize: 15, height: '100%' }}
        />
        {searching && !done && <ActivityIndicator size="small" color={color.n400} />}
      </Row>
      <ChipRow>
        {(['All', ...CATS] as const).map((x) => <Chip key={x} label={x === 'All' ? 'All' : KIND[x].short} on={cat === x} onPress={() => setCat(x)} />)}
      </ChipRow>

      {searching ? (
        <SectionLabel>{done ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Searching…'}</SectionLabel>
      ) : (
        <SectionLabel>Not in the Top 50 · try these</SectionLabel>
      )}

      {busy.length > 0 && (
        <T size={12} color={color.a300}>
          The {busy.map((b) => SOURCE_NAME[b] ?? b).join(' and ')} database is busy, so some results may be missing. Try again in a minute.
        </T>
      )}

      <View style={{ marginHorizontal: -6 }}>
        {(searching ? results.map((r) => r.key) : EXTRA_KEYS).map((k) => (
          <TitleRow key={k} k={k} onPress={() => void pick(k, 'open')} action={<SearchAddBtn k={k} />} />
        ))}
      </View>

      {searching && done && (
        <View style={{ gap: 10, backgroundColor: color.n800, borderRadius: 24, padding: 16 }}>
          <T size={14} weight="bold">Can’t find it? Add “{query}” yourself</T>
          <ChipRow>
            {CATS.map((x) => <Chip key={x} label={x} on={x === newCat} onPress={() => setNewCat(x)} />)}
          </ChipRow>
          <Btn small label="Add to my watchlist" onPress={() => { const k = addCustom(query, newCat); setQ(''); openTitle(k); }} />
        </View>
      )}

      <T size={11} color={c.textMuted} center>Film, TV and book details from Wikidata. Album details from MusicBrainz.</T>
    </Page>
  );
}

/** Save a catalogue result on the server if needed, then open it or add it to the watchlist. */
async function pick(k: string, then: 'open' | 'want') {
  const s = useApp.getState();
  const key = await s.catalogueAdd(k);
  if (!key) return;
  if (then === 'open') openTitle(key);
  else s.toggleWant(key, true);
}

function SearchAddBtn({ k }: { k: string }) {
  const on = useApp((s) => !!s.want[k]);
  const [busy, setBusy] = useState(false);
  return (
    <Btn
      small
      label={busy ? '…' : on ? '✓ Watchlist' : '+ Add'}
      kind={on ? 'positive' : 'secondary'}
      disabled={busy}
      onPress={async () => {
        if (on) return useApp.getState().toggleWant(k, false);
        setBusy(true);
        await pick(k, 'want');
        setBusy(false);
      }}
      style={!on ? { backgroundColor: color.n800, borderWidth: 1, borderColor: color.n700 } : undefined}
    />
  );
}
