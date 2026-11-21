// Pure helpers for short title descriptions: the opening of the title's English Wikipedia article.
// Wikipedia text is CC BY-SA 4.0: the app must show it with credit and a link to the article.

/** Wikidata item from a MusicBrainz release group's URL relations ("wikidata" type). */
export function wikidataFromMb(relations: { type?: string; url?: { resource?: string } }[] | undefined): string | null {
  for (const r of relations ?? []) {
    if (r.type !== 'wikidata') continue;
    const m = r.url?.resource?.match(/\/(Q\d+)$/);
    if (m) return m[1];
  }
  return null;
}

const ABBREV = /(?:^|\s)(?:[A-Z]|Mr|Mrs|Ms|Dr|St|Jr|Sr|Vol|No|vs|U\.S|U\.K|etc)\.$/;

/** Split text into sentences, without breaking on initials ("J. R. R.") or common abbreviations. */
export function sentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const re = /[.!?]+["”’)]*(?=\s+["“(]?[A-Z0-9]|$)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const end = m.index + m[0].length;
    if (ABBREV.test(text.slice(start, end))) continue;
    out.push(text.slice(start, end).trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** First few sentences, kept short for a phone screen. */
export function shortSummary(extract: string, maxChars = 420, maxSentences = 3): string {
  const text = extract.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  let out = '';
  for (const s of sentences(text).slice(0, maxSentences)) {
    const next = out ? `${out} ${s}` : s;
    if (out && next.length > maxChars) break;
    out = next;
  }
  if (out.length > maxChars) out = out.slice(0, maxChars).replace(/\s+\S*$/, '') + '…';
  return out;
}
