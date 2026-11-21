# Billing setup checklist

These are the steps that only you can do, because they happen in your Apple, Google, RevenueCat, Supabase and Expo accounts. Do them in this order. Each section ends with what to send back (keys) and where they go. **Never paste a secret key into chat.** Secret keys go straight into the Supabase dashboard. The public keys go in `.env`.

App ID everywhere: **`com.davala.circleratings`**

## Products to create (identical names in both stores)

| Plan | Price | Places | App Store product ID | Google Play |
|---|---|---|---|---|
| Individual | £3.99/month | 1 | `cr_individual_monthly` | subscription `cr_individual`, base plan `monthly` |
| Individual | £39.99/year | 1 | `cr_individual_annual` | subscription `cr_individual`, base plan `annual` |
| Family | £6.99/month | 6 | `cr_family_monthly` | subscription `cr_family`, base plan `monthly` |
| Family | £79.99/year | 6 | `cr_family_annual` | subscription `cr_family`, base plan `annual` |
| Extended family | £9.99/month | 10 | `cr_extended_monthly` | subscription `cr_extended`, base plan `monthly` |
| Extended family | £99.99/year | 10 | `cr_extended_annual` | subscription `cr_extended`, base plan `annual` |

Every product gets a **7-day free trial** for new subscribers. The server works out the plan from the `cr_individual` / `cr_family` / `cr_extended` part of the ID, so keep those exactly as written.

## 1. Apple: App Store Connect (about 45 minutes)

1. **Agreements, Tax and Banking.** Accept the Paid Apps agreement and add bank and tax details. Subscriptions don't work in testing until this is done.
2. **Small Business Program.** Enrol at developer.apple.com/app-store/small-business-program. This cuts Apple's fee to 15% from the first year instead of 30%.
3. **Identifiers.** Certificates, IDs & Profiles → Identifiers → add App ID `com.davala.circleratings`. In-App Purchase is on by default.
4. **Create the app record.** Apps → + → New App: name "SofaClub", bundle ID as above, SKU `circleratings`.
5. **Create the subscriptions.**
   - Go to Monetization → Subscriptions and create one subscription group called "SofaClub".
   - Add the six products from the table, with their prices.
   - Rank them in the group from Extended down to Individual, so upgrades and downgrades work.
   - Do **not** turn on Family Sharing. It can't be turned off once enabled, and we run family plans ourselves.
6. **Free trial.** For each product, add an Introductory Offer: Free, 1 week, new subscribers.
7. **Key for RevenueCat.** Users and Access → Integrations → In-App Purchase → generate a key. Download the `.p8` file and note the Key ID and Issuer ID. You'll upload these to RevenueCat in step 3.
8. **Sandbox tester.** Users and Access → Sandbox → add a tester email (it must not be a real Apple ID) for test purchases.

## 2. Google: Play Console (about 45 minutes)

1. **Payments profile.** Set up a merchant account under Settings → Payments profile.
2. **Create the app.** Create app "SofaClub", package `com.davala.circleratings`.
3. **Upload a first build.** Play won't let you create subscriptions until a build with billing is uploaded to a testing track. Upload the first EAS build (step 5) to **Internal testing**, then come back here.
4. **Create the subscriptions.**
   - Go to Monetize → Subscriptions and create `cr_individual`, `cr_family` and `cr_extended`.
   - Give each one two auto-renewing base plans: `monthly` and `annual`.
   - Add an offer to each base plan: free trial, 7 days, eligibility "New customer acquisition".
5. **Service account for RevenueCat.**
   - Follow RevenueCat's "Google Play service credentials" guide: create a service account in Google Cloud and grant it financial access in Play Console.
   - Download the JSON key.
   - Turn on Real-time developer notifications (Monetization setup) with the Pub/Sub topic RevenueCat gives you.
6. **License testing.** Add your Google account under Settings → License testing, so test purchases aren't charged.

## 3. RevenueCat (about 20 minutes)

1. **Create a project** called "SofaClub".
2. **Add the iOS app.** Bundle ID as above; upload the `.p8` In-App Purchase key with its Key ID and Issuer ID.
3. **Add the Android app.** Package as above; upload the service account JSON.
4. **Create the entitlement.** Its identifier must be exactly **`access`**. Attach all six App Store products and all six Google base plans to it.
5. **Create the offering.** Make it **Current** (identifier `default`), with packages for all six plans. The app reads every package in the current offering.
6. **Webhook.** Go to Integrations → Webhooks:
   - URL: `https://fkyhmaorcrqzdbvktvcv.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header value: make up a long random string (for example from a password manager). You'll paste the same value into Supabase next.
7. **API keys.** Under Project → API keys:
   - The **public** iOS key (starts `appl_`) and Android key (starts `goog_`) go into `.env` in the repo as `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`. These are safe to share and commit.
   - Create a **secret** API key (v1 is fine, read-only is enough). This one is not safe to share.

## 4. Supabase (5 minutes)

**Secrets.** Project `circle-ratings` → Edge Functions → Secrets, add:
- `REVENUECAT_SECRET_KEY`: the secret RevenueCat key from step 3.7.
- `REVENUECAT_WEBHOOK_AUTH`: the same random string you put in the RevenueCat webhook header.

**Also recommended:**
- **Leaked password protection:** turn it on under Authentication → Passwords. It blocks passwords known from data breaches. Supabase's security check flagged it.
- **Email sending:** set up custom SMTP before real users sign up. The built-in sender is for testing only.
- **Email links:** set Authentication → URL Configuration → Site URL and redirect URLs (`sofaclub://`), so confirmation and reset links open the app.

## 5. Expo: test build on your phone

```bash
npm install -g eas-cli
```

```bash
eas login
```

```bash
eas init
```

```bash
eas build --profile development --platform ios
```

```bash
eas build --profile development --platform android
```

`eas init` links the project to your Expo account; commit the change it makes to `app.json`. The development build is what you install on your phone to test real (sandbox) purchases. Expo Go can't do in-app purchases.

## 6. Check it works

1. **Sign up and start a trial.** On the phone, sign up, then on step 2 start the Family trial with your sandbox or test account.
2. **Check the server recorded it.** In Supabase Table Editor → `subscriptions` there should be a row for you, with `tier = family`, `in_trial = true` and `sandbox = true`. If there isn't, check Edge Functions → Logs for `sync-subscription` and `revenuecat-webhook`.
3. **Test a family invitation.** Settings → Family plan → Share a code with a second account. They join with no payment.
4. **Test cancelling.** Cancel in the store's sandbox settings. Within a few minutes Subscription should say "Cancelled · full access until …".

## Before App Review

- Terms of use and privacy policy pages. Put their URLs in `.env` as `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL`. Both stores require them, and they show on the paywall.
- **App Review notes:** explain that family access only comes from an owner's in-app purchase. Give reviewers two sandbox accounts: an owner already on a Family trial, and a member who can join with one of the owner's codes.
- The quick UK legal check on subscription rules (see `docs/store-rules-check.md`).
