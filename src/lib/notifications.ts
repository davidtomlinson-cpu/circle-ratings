import { item, type Custom } from '../data/model';

export type Notif = {
  id: number; kind: 'rating' | 'comment' | 'joined'; actor_id: string; actor_name: string;
  title_key: string | null; hearts: number | null; body: string | null; created_at: string; read_at: string | null;
};

export function notifText(n: Notif, custom: Custom = {}) {
  const t = n.title_key ? item(n.title_key, custom).title : '';
  if (n.kind === 'rating') return `${n.actor_name} gave ${t} ${n.hearts} ♥`;
  if (n.kind === 'comment') return `${n.actor_name} commented on ${t}`;
  return `${n.actor_name} joined your circle`;
}
