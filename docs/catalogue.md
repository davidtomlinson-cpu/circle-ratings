# Catalogue: where titles come from

SofaClub searches real databases for films, TV, books and albums. Everything we use is public-domain data (CC0), so we're allowed to store it and use it in a paid app.

| What | Source | Licence | Cost |
|---|---|---|---|
| Films, TV series, books | [Wikidata](https://www.wikidata.org) | CC0 (public domain) | Free |
| Albums | [MusicBrainz](https://musicbrainz.org) core data | CC0 (public domain) | Free. MetaBrainz asks commercial users to support them (see below) |
| Trending: films, TV, books | [Wikimedia page views](https://wikimedia.org/api/rest_v1/) | CC0 (public domain) | Free |
| Trending: albums | [ListenBrainz](https://listenbrainz.org) statistics | CC0 (public domain) | Free |
| Title descriptions | Opening of the [English Wikipedia](https://en.wikipedia.org) article | **CC BY-SA 4.0**: must be credited and linked | Free |

We show no posters or cover art. Cover images are copyrighted by their owners, and none of the free sources gives us the right to use them in a paid app. The app's letter discs stand in for covers.

## How it works

1. **Search.** The app first searches titles already on SofaClub, which is instant. It then calls the `catalogue` edge function, which asks Wikidata and/or MusicBrainz.
   - Results are ranked by popularity: how many Wikipedias cover a film or book, and how many releases an album has.
   - Each answer is cached for 7 days in `catalogue_cache`, so repeat searches don't touch the outside sources.
2. **Picking a result.** When someone opens or adds a result, the function re-reads it at the source and saves it in `titles`, with key `wd:Q…` or `mb:…`. The app can never write catalogue titles itself.
3. **No duplicates.** The 220 titles that ship with the app (Top 50 lists and extras) are linked to their Wikidata or MusicBrainz ids. A search for The Godfather lands on the existing Top 50 entry, not a second copy.
4. **Trending.** The Trending tab has two parts:
   - **Trending this week (the wider world).** Rebuilt every day at 05:17 UTC by the `trending-refresh` edge function, which a database job calls with a secret kept in Vault. Films, TV and books are ranked by English Wikipedia page views over the last 7 days, kept only if Wikidata says they're a film, series or book. Albums come from ListenBrainz's most-played albums this week, re-ranked by an *estimate of how many different people* played them (weekly plays divided by average plays per listener), because raw play counts let a few superfans fill the chart. Studio albums only. If a source fails, that list keeps the previous day's version.
   - **In cinemas.** The trending films that came out in UK cinemas in the last 8 weeks. The release date is Wikidata's UK date, or the US date if there's no UK one. Films distributed by a streaming service (Netflix, Apple TV, Disney+ and so on) are left out. A film with no UK or US date in Wikidata won't appear here, but still shows under Films.
   - **Popular on SofaClub.** What the most people on SofaClub rated or added to a watchlist in the last 7 days. A title needs at least 3 people, and we never show who. It only appears once there's enough activity.

## Descriptions

Opening a title shows the first two or three sentences of its English Wikipedia article. The `catalogue` function finds the article through Wikidata (albums through MusicBrainz's Wikidata link), trims it, and caches it in `title_descriptions` for 30 days ("nothing found" is rechecked after 7). Titles people add themselves have no description.

Wikipedia text isn't public domain like the rest: it's CC BY-SA 4.0. That allows use in a paid app as long as each description is credited and linked, which the title page does ("From Wikipedia · CC BY-SA · Read more"). Keep that line if the design changes. The terms of use should mention it too (see the lawyer note in the terms draft).

## Setup before launch

Both sources limit how fast anonymous apps can ask. Testing showed we hit those limits quickly under load, so do these two steps before launch.

### 1. Contact for the User-Agent (2 minutes)

Both sources ask apps to identify themselves with a way to contact the developer. In Supabase → Edge Functions → Secrets, add:

- `CATALOGUE_CONTACT`: a support email or web page, for example `support@yourdomain`.

### 2. Wikimedia access token (10 minutes, free)

Signed requests get much higher Wikidata limits than anonymous ones.

1. Create a Wikimedia account at meta.wikimedia.org (or use an existing Wikipedia account).
2. Go to Special:OAuthConsumerRegistration/propose/oauth2 on meta.wikimedia.org and register an **owner-only** OAuth 2.0 consumer for "SofaClub catalogue search". Read-only access ("basic rights") is enough.
3. Copy the **access token** it shows you once.
4. In Supabase → Edge Functions → Secrets, add `WIKIMEDIA_TOKEN` with that value. **Never paste it into chat or the repo.**

Wikimedia's rate-limit rules were new in 2026 and may change. If search starts showing "busy" messages often, check their current API rate-limit page.

### 3. Supporting MetaBrainz (optional, recommended)

MusicBrainz data is free, but MetaBrainz asks commercial users to support them financially. Their supporter page is at metabrainz.org. MusicBrainz also allows only about one request a second per server, so at scale we may need their paid access or a local copy of the data.

## If we outgrow this

- **New releases.** Wikidata can take days or weeks to list a brand-new film or book. People can still add it themselves ("Can't find it? Add it yourself").
- **TMDB** (The Movie Database) has better, faster film and TV data and real trending. A paid app needs a written commercial licence from TMDB, reportedly about $149 a month for small companies (unconfirmed). The edge function is built so another source can be added without changing any app screens.
- Google Books (charging users isn't allowed without a deal with Google) and Open Library (not meant for commercial traffic) were ruled out.

## Known quirks of Trending

- English Wikipedia is read worldwide, so big Indian and US releases rank high. If we want a UK lean later, we can weight it.
- News spikes count: an actor's death or an awards night can push an older film up for a few days.
- ListenBrainz users lean towards keen music fans, so the albums list is less mainstream than a sales chart.
- Running it by hand (for example after a fix): in the SQL editor, `select private.refresh_world_trending();` then check `net._http_response` a minute later.

## Testing

```bash
npm run test:catalogue
```

This runs the unit tests for how Wikidata and MusicBrainz answers are turned into titles and ranked, and for the Trending sums.
