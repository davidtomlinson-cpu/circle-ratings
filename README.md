# Circle Ratings

A mobile app for friends and family to rate films, TV, albums and books out of 5 hearts. It's built from the "Circle Ratings" design handoff.

Stack: Expo SDK 58 (React Native 0.88), Expo Router, TypeScript, zustand and Supabase (Postgres + Auth). Fonts are Caprasimo and Figtree, and icons are Lucide-style SVGs.

## Run it

```bash
npm install
npx expo start          # then press i / a, or scan with Expo Go
npx expo start --web    # browser preview
npm run typecheck
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
- **Heart budget:** 60 hearts a month, with the month counted on UK time. Re-rating something you rated this month costs the difference. The database refuses a rating that goes over budget.
- **Loved worldwide:**
  - Only a 5 ♥ for a title that was on your watchlist counts. The database sets that flag, not the app.
  - Votes are stored as a salted hash, never your user id.
  - A title only appears once at least 3 people have loved it. The same 3-vote minimum applies to a title's "Everyone" average.
- **Deleting an account** removes all of its data, including its anonymous worldwide votes.

## What's built

- **Accounts:** email sign-up, sign-in and password reset. You stay signed in between launches. App pages are locked when you're signed out.
- **Tabs:** Today, Top 50, World, Trending, Watchlist and My list.
- **Rating sheet:** tap or drag across the hearts. The app updates straight away. If the server refuses (for example, you're out of hearts), the change is undone and a message explains why.
- **Title detail:** your rating, your circle's real ratings and average, and the Everyone average. Comments are saved to the server.
- **Pages:** Jar of hearts, Search & add (custom titles are saved to the server), Privacy, and Profile & settings (name, privacy, notification preferences, sign out).

Trending still shows labelled sample rows until the daily backend job exists.

## Not built yet

1. **Billing:** the free trial, plans, Subscription, Family plan codes and the trial reminder. This needs StoreKit 2 / Play Billing, and checking the family codes against Apple's and Google's rules.
2. **The circle:** invites, Contacts, Friend profile, notifications feed and push. The database tables for the circle already exist.
3. **Apple and Google sign-in:** needs an Apple Developer account and a Google Cloud OAuth client.
4. **Email before launch:**
   - Set up custom SMTP in Supabase, because the built-in sender is rate-limited and meant for testing only.
   - Set the Site URL and redirect URLs so the confirmation and reset links open the app.
5. **Real catalogue:** TMDB, Open Library and MusicBrainz IDs, plus the daily trending job.

## Testing

```bash
npm run typecheck
npx expo export --platform web   # then serve dist/ to try it in a browser
```

The sign-in → bookmark → rate → comment → privacy → sign-out flow was tested end to end against the live project.

## Layout

```
src/app/            routes (Expo Router). (tabs)/ = bottom tabs; other files slide in from the right
src/components/     ui.tsx (text, buttons, chips, rows), Icon, Jar, RatingSheet, Toast, TitleRow
src/data/           catalogue (generated from the prototype), model helpers, mock feeds
src/state/store.ts  local copy of the user's server data, optimistic writes with rollback
src/lib/            Supabase client, worldwide hook
supabase/migrations database schema, security rules, catalogue seed
src/theme.ts        design tokens
```
