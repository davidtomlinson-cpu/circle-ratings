# Getting SofaClub onto a phone

Expo builds the app in the cloud, so no Mac or Android Studio is needed. We make a **development build** first: a real app you install on your phone, which loads the latest code while we work on it. Store builds come later.

| Build | What it's for | Profile |
|---|---|---|
| Development | Testing on our own phones while we build | `development` |
| Preview | A normal-feeling test copy to share with a few people | `preview` |
| Production | What goes to the App Store and Google Play | `production` |

These are already set up in `eas.json`.

## What's already done

- `expo-dev-client` is installed, and the build profiles are in `eas.json`. Each profile uses the Expo environment with the same name.
- App ID on both stores: `com.davala.circleratings`. Display name: SofaClub.
- iOS is marked as using only standard encryption (HTTPS), so App Store Connect won't ask the export-compliance question on every upload.
- Build numbers are kept on Expo's servers and go up automatically for production builds.
- The public keys the app needs (Supabase URL and publishable key) are in `.env`, which is committed and uploaded with each build. The RevenueCat keys are still empty. Until they're filled in, the paywall shows preview prices and can't take payment.

## Steps

### 1. Expo account (5 minutes, free)

1. Sign up at expo.dev. Use a company email address, not a personal one, because this account will own the app's signing keys.
2. Optional but recommended: create an organisation (for example "Davala") and build under it, so the app doesn't belong to one person's login.
3. Account settings → Access tokens → create a token called "SofaClub builds". Give it to Claude through the secure form in the session, never by pasting it in chat. Or run the commands below yourself after `npx eas-cli@latest login`.

### 2. Link the project (Claude can do this once there's a token)

```bash
npx eas-cli@latest init
```

This creates the project on Expo and adds its id to `app.json`.

### 3. Android development build (about 15 minutes, no Google account needed)

```bash
npx eas-cli@latest build --profile development --platform android
```

When it finishes, it shows a link and a QR code. Open it on the Android phone, download the app and allow the install. Android will warn that it isn't from the Play Store. That's expected for test builds.

### 4. iPhone development build (needs the Apple Developer account, $99 a year)

Apple only lets test builds run on phones that are registered in advance.

1. Register each test iPhone. This gives a link to open on the phone, which installs a small profile:

   ```bash
   npx eas-cli@latest device:create
   ```

2. Build. The first iOS build asks you to sign in with the Apple Developer account, so Expo can create the certificates. Run this one on your own computer, in a terminal:

   ```bash
   npx eas-cli@latest build --profile development --platform ios
   ```

3. On the iPhone, turn on Developer Mode (Settings → Privacy & Security → Developer Mode), then install from the link Expo gives you.

Adding a new iPhone later means registering it and building again.

### 5. Running the app

Open the development build on the phone. It loads the code from a computer running `npx expo start` on the same network (or `npx expo start --tunnel` from anywhere). For testing away from a computer, use a **preview** build instead. It behaves like the real app and doesn't need a computer.

## Later

- **Store builds:** `npx eas-cli@latest build --profile production`, then `npx eas-cli@latest submit`. Needs the store records from `docs/billing-setup.md`.
- **RevenueCat keys:** once they exist, add them to `.env` (they're public keys). A development build picks them up straight away; preview and store builds need building again.
- **Push notifications** need `expo-notifications` and push credentials. That's a separate piece of work.
