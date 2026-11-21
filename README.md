# SofaClub

A mobile app for friends and family to rate films, TV, albums and books out of 5 hearts. It was built from the "Circle Ratings" design handoff.

Stack: Expo SDK 58 (React Native 0.88), Expo Router, TypeScript, zustand and Supabase (Postgres + Auth). Fonts are Caprasimo and Figtree, and icons are Lucide-style SVGs.

## Brand

The name is **SofaClub**. The logo is a glowing line drawing of a sofa with a ticked list and five hearts, in the app's own colours (sage, cream and apricot on the dark brown background). `assets/brand/icon.svg` is the master and `assets/brand/sofaclub-logo.png` is the logo with the name. To change the icon, edit `gen.py`, then run `python3 gen.py && node render.js` in `assets/brand/` and copy `out/*.png` into `assets/`. That covers iPhone, Android adaptive and monochrome, splash and favicon.

There's also a small version (`assets/brand/small.svg`, just the sofa and one heart) for sizes where the full drawing turns to mush. It's used for the favicon and the Android monochrome icon, and it's the one to use for the notification icon when push notifications are added.

The app ID stays `com.davala.circleratings`. Nobody sees it, and changing it after a store listing exists is painful.

## Run it

```bash
npm install
npx expo start          # then press i / a, or scan with Expo Go
npx expo start --web    # browser preview
npm run typecheck
npm run lint
npm run test:billing             # RevenueCat → subscription mapping
npm run test:catalogue           # Wikidata / MusicBrainz → title mapping
```

## Backend: Supabase

- **Project:** `circle-ratings` (ref `fkyhmaorcrqzdbvktvcv`), in London (`eu-west-2`), on the free tier.
- **App config:** the URL and publishable key are in `.env`. Both are public by design. Never add the database password or a secret key.
- **Schema:** lives in `supabase/migrations/`, which holds the same SQL that was applied to the project.

The app can't break the rules below, because the database itself enforces them (row level security plus triggers):

- **Privacy:**
  - Your watchlist is visible only to you.
  - Your ratings are visible to you, and to your circle only when your list visibility allows it ("all", "some" with a per-person grant, or "locked").
  - Comments are visible to the author's circle.
- **No rating limit:** rate as many titles as you like. (An earlier monthly "jar of hearts" budget was removed on 21 Nov 2026.)
- **Loved by the Club** (the Club tab; called "Loved worldwide" in the code and database):
  - Only a 5 ♥ for a title that was on your watchlist counts. The database sets that flag, not the app.
  - Votes are stored as a salted hash, never your user id.
  - A title only appears once at least 3 people have loved it. The same 3-vote minimum applies to a title's "Everyone" average.
- **Circle:**
  - Joining needs the other person's invite code. Accepting links you both ways, and either of you can remove the other.
  - Notifications are created by the database: when someone rates (only if you're allowed to see their list), comments, or joins. Nobody can create or edit them from the app.
  - Everyone's Top 20 only includes titles rated by at least 3 people.
- **Deleting an account** (Profile → Delete account, via `delete_my_account()`) happens immediately. It removes all of the account's data: ratings, watchlist, comments, circle links in both directions, invite code, notifications, titles you added, and anonymous worldwide votes.

- **Billing:** RevenueCat tells our server what each person has bought, and the server decides access. It works like this:
  - **`subscriptions` table:** written only by the `revenuecat-webhook` and `sync-subscription` edge functions. Neither ever trusts the app.
  - **`private.access()`:** gives access to your own active plan, or to a filled place on an active Family or Extended plan.
  - **Ratings and comments:** refused by the database without access.
  - **Family invitations (`HEART-XXXX-XXXX`):** only the owner can make them. Each works once, is limited by the plan's places, and is cancelled when replaced or the member is removed.
  - **Catalogue:** films, TV and books come from Wikidata and albums from MusicBrainz, both public-domain data. Only the `catalogue` edge function writes these titles, after re-reading them at the source. Details and setup steps are in [`docs/catalogue.md`](docs/catalogue.md).
  - **Trending:** what's trending in the wider world this week (Wikipedia page views for films, TV and books; ListenBrainz for albums), refreshed daily on the server. Above it, "Popular on SofaClub" appears once titles have activity from at least 3 people. Details in [`docs/catalogue.md`](docs/catalogue.md).
- **Day-5 trial reminder:** posted by an hourly `pg_cron` job. It's always sent, because it's a required reminder.

## What's built

- **Accounts:** email sign-up, sign-in, password reset and in-app account deletion. You stay signed in between launches. App pages are locked when you're signed out.
- **Tabs:** Today, Top 50, Club, Trending, Watchlist and My list.
- **Rating sheet:** tap or drag across the hearts. The app updates straight away. If the server refuses (for example, you're out of hearts), the change is undone and a message explains why.
- **Title detail:** your rating, your circle's real ratings and average, and the Everyone average. Comments are saved to the server.
- **Subscriptions:**
  - **Paywall:** shown after sign-up and whenever there's no active plan. It has the 7-day trial timeline, a Monthly/Annual switch with "Save N%", the price and renewal disclosure, Restore purchases, and "Have a family invitation?".
  - **Subscription page:** status, change plan, and manage or cancel in the store.
  - **Family plan page:** Share, Copy, New code and Remove.
  - **Join a family plan:** works from a link even when signed out.
  - **Trial-ending page.**
  - Account deletion warns a paying user to cancel in the store first.
- **Search & add:** real search across films, TV, books and albums. Results already on SofaClub show instantly, then the outside databases. Picking a result saves it on the server, so watchlists, ratings and comments work the same as for Top 50 titles. You can still add something yourself if it isn't found.
- **Pages:** Privacy, and Profile & settings (name, privacy, notification preferences, sign out).
- **Circle:**
  - **Invite:** your personal code, with Share, Copy and Make a new code, plus a "Have a code?" box.
  - **Join a circle:** opens from `sofaclub://join/CODE`. It works signed out too: the code is remembered through sign-up.
  - **Contacts:** each person's rated count, top pick, and who can see whose list.
  - **Friend profile:** their list, taste match, a locked state, and remove from circle.
  - **Notifications:** with a live badge.
  - **Everyone's Top 20.**

Trending's world lists refresh daily at 05:17 UTC. "Popular on SofaClub" stays hidden until people use the app.

## Not built yet

0. **Phone builds:** step by step in [`docs/eas-build.md`](docs/eas-build.md).
1. **Store setup:** the products, RevenueCat, the secrets and a development build. Step by step in [`docs/billing-setup.md`](docs/billing-setup.md). Real purchases can't be tested until that's done.
2. **Push notifications:** these need `expo-notifications`, an EAS project and Apple/Google push credentials. In-app notifications already work.
   - **Invite links:** links only open the app if it's installed. Universal links (https links that open the app) need a domain and an app build.
3. **Apple and Google sign-in:** needs an Apple Developer account and a Google Cloud OAuth client.
4. **Email before launch:**
   - Set up custom SMTP in Supabase, because the built-in sender is rate-limited and meant for testing only.
   - Set the Site URL and redirect URLs so the confirmation and reset links open the app.
5. **Catalogue setup:** add the `CATALOGUE_CONTACT` and `WIKIMEDIA_TOKEN` secrets before launch (see [`docs/catalogue.md`](docs/catalogue.md)). No cover art: none of the free sources allows it in a paid app.

## Testing

```bash
npm run typecheck
npm run lint
npm run test:billing             # RevenueCat → subscription mapping
npm run test:catalogue           # Wikidata / MusicBrainz → title mapping
npx expo export --platform web   # then serve dist/ to try it in a browser
```

Tested end to end against the live project:

- The single-user flow: sign in, bookmark, rate, comment, change privacy, sign out.
- A two-person circle flow:
  - Invite, join via link while signed out, and the live badge.
  - Notifications, contacts and the friend profile.
  - Locking a list, removing someone from the circle, and a bad invite code.
- The catalogue: searching films, TV, books and albums; no duplicates for Top 50 titles; adding to a watchlist; rating; lists after a reload; deep links; and the Trending empty state.

## Layout

```
src/app/            routes (Expo Router). (tabs)/ = bottom tabs; other files slide in from the right
src/components/     ui.tsx (text, buttons, chips, rows), Icon, Logo, RatingSheet, Toast, TitleRow
src/data/           built-in Top 50 titles (from the prototype), model helpers, category tabs
src/state/store.ts  local copy of the user's server data, optimistic writes with rollback
src/lib/            Supabase client, billing (RevenueCat), invites, worldwide and trending hooks
supabase/functions  catalogue, revenuecat-webhook, sync-subscription (+ _shared mapping code and its tests)
docs/               store rules check, billing setup checklist, catalogue sources and setup
supabase/migrations database schema, security rules, catalogue seed
src/theme.ts        design tokens
```
