// My Club: your own lists in one place. Watchlist (things you fancy) and Rated (what you've finished, with
// your hearts). Opens on Watchlist unless a link asks for ?view=rated.
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { MyListView } from '../../components/MyListView';
import { WatchlistView } from '../../components/WatchlistView';
import { Chip, ChipRow, H, Page, T } from '../../components/ui';
import { useApp, wantKeys } from '../../state/store';
import { c } from '../../theme';

type View_ = 'watchlist' | 'rated';

export default function MyClub() {
  const params = useLocalSearchParams<{ view?: string }>();
  const asked: View_ | null = params.view === 'rated' || params.view === 'watchlist' ? params.view : null;
  const [picked, setPicked] = useState<{ view: View_; for: View_ | null } | null>(null);
  // A link (e.g. "See all" on Today) wins over the last tab picked by hand.
  const view: View_ = picked && picked.for === asked ? picked.view : asked ?? 'watchlist';
  const wantCount = useApp((s) => wantKeys(s).length);
  const ratedCount = useApp((s) => Object.keys(s.my).length);

  return (
    <Page tabs>
      <View>
        <H size={26}>My Club</H>
        <T size={13} color={c.textSoft}>
          {view === 'watchlist' ? 'Things you fancy. Rate them once you’re done.' : 'Everything you’ve watched, read and heard, with your hearts.'}
        </T>
      </View>
      <ChipRow>
        <Chip label={`Watchlist · ${wantCount}`} on={view === 'watchlist'} onPress={() => setPicked({ view: 'watchlist', for: asked })} />
        <Chip label={`Rated · ${ratedCount}`} on={view === 'rated'} onPress={() => setPicked({ view: 'rated', for: asked })} />
      </ChipRow>
      {view === 'watchlist' ? <WatchlistView /> : <MyListView />}
    </Page>
  );
}
