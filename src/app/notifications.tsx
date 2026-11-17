import { View } from 'react-native';
import { Icon } from '../components/Icon';
import { BackHeader, Page, T } from '../components/ui';
import { c } from '../theme';

// Notifications need a server-side feed (circle ratings, comments, trial reminders) and push.
// That arrives with the circle slice; until then this page says so plainly.
export default function Notifications() {
  return (
    <Page>
      <BackHeader title="Notifications" />
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 60 }}>
        <Icon name="bell" size={36} color={c.textMuted} />
        <T size={15} weight="bold" center>Nothing yet</T>
        <T size={13} color={c.textMuted} center>When people in your circle rate or comment, you’ll see it here.</T>
      </View>
    </Page>
  );
}
