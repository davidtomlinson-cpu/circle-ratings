# Circle Ratings

A mobile app for friends and family to rate films, TV, albums and books out of 5 hearts. It's built from the "Circle Ratings" design handoff.

Stack: Expo SDK 58 (React Native 0.88), Expo Router, TypeScript and zustand. State is persisted with AsyncStorage. Fonts are Caprasimo and Figtree, and icons are Lucide-style SVGs.

## Run it

```bash
npm install
npx expo start          # then press i / a, or scan with Expo Go
npx expo start --web    # browser preview
npm run typecheck
```

## What's built (slice 1: core loop, local data)

- **Tabs:** Today, Top 50, World (Loved worldwide), Trending, Watchlist and My list. They use the custom 6-tab bar from the spec.
- **Rating sheet:** tap or drag across the hearts. It uses the jar budget (60 a month), shows the save label ("Use N hearts · M left"), and disables the button when you're short.
- **After a rating is saved:** the title leaves the watchlist and goes to My list, the jar goes down, and a toast tells you who gets notified.
- **Worldwide rule:** only 5 ♥ given to a title that was on your watchlist at the time of rating count towards Loved worldwide. You can opt out in Privacy.
- **Title detail:** You / Circle / Everyone stats, circle members' hearts, and comments.
- **Pages:** Jar of hearts, Notifications, Search & add a title, and Privacy. Privacy controls who sees My list and who gets notified.

Everything runs on mock data ported from the prototype (`src/data/`). Ratings, watchlist and settings persist on the device.

## Not built yet

1. **Accounts and subscriptions:** onboarding (welcome, sign-up, free trial, join with a code), Profile & settings, Subscription, Family plan codes, and the trial-ending reminder.
2. **The circle:** Contacts, Friend profile (taste match), Invite, and Everyone's Top 20.
3. **Backend (Supabase is the likely fit):**
   - Auth with Apple, Google and email.
   - Real catalogue IDs from TMDB, Open Library and MusicBrainz.
   - Ratings, watchlists and comments, with privacy enforced server-side.
   - The anonymous worldwide aggregate.
   - Push notifications.
   - A daily trending job. This replaces the prototype's on-device AI calls; the Trending tab shows sample rows until it exists.
4. **Billing:** StoreKit 2 and Play Billing with a 7-day intro offer. Family codes become server-issued, single-use tokens.

## Layout

```
src/app/            routes (Expo Router). (tabs)/ = bottom tabs; other files slide in from the right
src/components/     ui.tsx (text, buttons, chips, rows), Icon, Jar, RatingSheet, Toast, TitleRow
src/data/           catalogue (generated from the prototype), model helpers, mock feeds
src/state/store.ts  persisted user state + derived rules (jar budget, viewers)
src/theme.ts        design tokens
```
