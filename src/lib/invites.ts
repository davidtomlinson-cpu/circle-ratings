import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const KEY = 'pending-invite-code';
export const CODE_RE = /^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/;

/** Normalise "abcd efgh" / "ABCDEFGH" to "ABCD-EFGH". Returns null if it can't be a code. */
export function normaliseCode(raw: string) {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== 8 || !CODE_RE.test(c)) return null;
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}

/** Family plan invitation: "heart abcd efgh" / "HEARTABCDEFGH" → "HEART-ABCD-EFGH", or null. */
export function normaliseFamilyCode(raw: string) {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^HEART/, '');
  if (c.length !== 8 || !/^[A-HJ-NP-Z2-9]{8}$/.test(c)) return null;
  return `HEART-${c.slice(0, 4)}-${c.slice(4)}`;
}

export const familyInviteLink = (code: string) => Linking.createURL('/family-join', { queryParams: { code } });

export function familyInviteMessage(name: string, code: string, planName: string) {
  return `${name} has added you to their SofaClub ${planName}. No payment needed.\n\nOpen this link on your phone: ${familyInviteLink(code)}\nOr in the app, tap “Have a family invitation?” and enter ${code}`;
}

/** Link that opens the join screen when the app is installed. */
export const inviteLink = (code: string) => Linking.createURL(`/join/${code}`);

export function inviteMessage(name: string, code: string) {
  return `${name} invited you to their circle on SofaClub, where we rate films, TV, books and albums in hearts.\n\nOpen this link on your phone: ${inviteLink(code)}\nOr enter the code ${code} under Invite → “Have a code?”`;
}

// Remember a code opened while signed out, so we can offer it right after sign-in.
export const savePendingInvite = (code: string) => AsyncStorage.setItem(KEY, code).catch(() => {});
export async function takePendingInvite() {
  try {
    const c = await AsyncStorage.getItem(KEY);
    if (c) await AsyncStorage.removeItem(KEY);
    return c;
  } catch {
    return null;
  }
}
