# Family codes vs App Store and Google Play rules

Checked 17 November 2026. The Apple rule quotes come from the live App Review Guidelines. Google's policy pages were blocked by the session network, so the Google points come from Google's own help pages via search and are less certain.

## Bottom line

The family plan can go ahead, with two conditions:

- **Plans are only ever bought through Apple or Google.** That means in-app purchase, with no website checkout and no link to one.
- **Family codes are a way for the paying owner to share their plan, not a way to unlock the app.** A code should only work while the owner's store subscription is active, and the server should check that against Apple or Google.

The real risk is on iPhone. An Apple reviewer could read a typed code that unlocks the app as breaking the "no own unlock mechanism" rule. We can lower that risk a lot by:

- making invite links the main way to join, with the typed code as a backup;
- calling them invitations, not codes;
- explaining the setup in the App Review notes.

Apple has also announced its own version of this, called Group Purchases. When it's available, we should move the iPhone side onto it.

Separately, there are a few things the app needs before any store submission, whatever we decide about family codes. The biggest, in-app account deletion, is now done. The full list is below.

## What the rules say

### Apple (App Review Guidelines, verbatim where quoted)

| Rule | What it means for us | Risk |
|---|---|---|
| 3.1.1: unlocking features "you must use in-app purchase. Apps may not use their own mechanisms to unlock content or functionality, such as license keys … QR codes" | Plans must be bought in-app. A HEART-XXXX code typed at sign-up looks like a licence key unless it clearly comes from someone's in-app purchase. | **Medium.** This is the main rejection risk. |
| 3.1.1: "Apps may enable gifting of items that are eligible for in-app purchase to others" | This supports owners sharing what they bought. | Helps us. |
| 3.1.3(c): "Consumer, single user, or family sales must use in-app purchase" | Family plans can't be sold any other way (no web or bank-transfer family deals). | Low, as long as we only use in-app purchase. |
| 3.1.3(b): access across platforms is allowed "provided those items are also available as in-app purchases within the app" | An Android member can use an iPhone owner's plan, and the other way round, as long as every plan is also on sale in each app. | Low. |
| 3.1.2(a): subscriptions "must work on all of the user's devices" | This works already, because access is tied to the account. | Low. |
| 3.1.2(c) and Schedule 2: before purchase, "clearly describe what the user will get for the price" | The trial and paywall screens must show the price, renewal period, what's included, and links to the terms and privacy policy. | Low. |
| 5.1.1(v): "If your app supports account creation, you must also offer account deletion within the app" | Built: Profile → Delete account, which deletes immediately. | Resolved. |
| 4.8: a Google login requires an equivalent privacy-focused option | Shipping "Continue with Google" means also shipping Sign in with Apple. The design already has both. | Low. |

**Apple's own options for sharing a plan:**

- **Family Sharing.** You switch it on per subscription, and it covers up to 5 other people in the owner's Apple Family group. It isn't a good fit:
  - members must be in the owner's Apple Family group;
  - it's iPhone-only;
  - it tops out at 6 people, so it can't cover the 10-person Extended plan;
  - once switched on, it [can't be switched off](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/turn-on-family-sharing-for-in-app-purchases).
- **Group Purchases**, announced at WWDC 2026 in the session [Offer subscriptions to groups and organizations](https://developer.apple.com/videos/play/wwdc2026/391/).
  - One subscriber buys several seats and gets an invitation link to share. People who accept get a seat.
  - Apple says apps that "already implement an invitation and member management system" can keep their own invite flow, connected to Apple through new server endpoints.
  - **It's priced per seat**, with volume price bands, rather than as a fixed "up to 6" bundle. So our £6.99-for-6 pricing would need re-expressing as a per-seat price.
  - Not yet confirmed: release date, regions, maximum group size, how members are removed, and whether members can be on Android.

### Google Play

- **Billing:** Play's billing system is required for in-app digital subscriptions. Some regions have alternative-billing programmes, but we don't need them.
- **Sharing:** Google has no consumer group-subscription feature. Its September 2026 Multi-Quantity purchase is for organisations buying seats. So on Android the owner buys one normal Play subscription and our server handles the members. I found no rule against this, but I couldn't read the policy page directly. **We need to confirm this on the live [Payments](https://support.google.com/googleplay/android-developer/answer/9858738) and [Subscriptions](https://support.google.com/googleplay/android-developer/answer/9900533) policy pages before we build it.**
- **Free trials:** we must clearly state the trial length, the price afterwards, that it renews automatically, and how to cancel. There must also be a link to manage or cancel the subscription in account settings.

### UK law (not a store rule, but it affects the same screens)

- **New subscription rules:** these come from the Digital Markets, Competition and Consumers Act and are expected to apply to subscriptions taken out from **1 January 2027**, subject to Parliament. They bring:
  - reminders before a free trial converts and before renewals;
  - a 14-day cooling-off period after a trial converts;
  - cancelling as easily as you signed up.
- **What's already right:** our day-5 trial reminder points the right way.
- **What to change:** the "Trial and billing reminders" setting shouldn't let people switch off reminders the law requires.
- **Who's responsible:** it's unclear whether the obligations sit with us or with Apple and Google when they handle the billing. **Get a short legal check before launch.**

## Recommended design

1. **Store-only purchases.** Individual, Family and Extended are each an auto-renewing subscription in both stores, with a 7-day free trial set up as each store's introductory offer.
2. **The server is the authority on who has access.**
   - Store purchase notifications (Apple App Store Server Notifications and Google Real-time Developer Notifications) go to a Supabase function.
   - That function records the owner's plan, how many places it has, and when it expires.
   - A member's access follows the owner's plan. If the owner cancels, members keep access until the paid period ends, and they're told in advance.
3. **Invitations, not codes.**
   - Only an owner with an active Family or Extended plan can create them.
   - The main way to join is an invite link. A typed code is a backup, shown only after you tap "Have an invitation?", not on the sign-up form.
   - Each invitation works once, can be cancelled, and is limited by the plan's number of places.
4. **App Review notes.** Explain that family access comes only from an owner's in-app purchase, and provide a demo owner account and a demo member account.
5. **Move to Apple Group Purchases when it's available.** Build the server so where a member's access comes from (our invitation or an Apple seat) can be swapped without changing the app screens.

## Must-fix before any store submission

- ~~In-app account deletion (Apple 5.1.1(v)).~~ **Done 18 Nov 2026.** When billing ships, the delete screen must also say that deleting the account doesn't cancel a store subscription, and link to the store's subscription settings.
- Sign in with Apple, if we ship Google sign-in (Apple 4.8).
- Paywall and trial disclosures: price, renewal period, what's included, terms and privacy links (Apple 3.1.2(c), Google subscriptions policy).
- "Restore purchases" plus a manage/cancel subscription link in Settings, on both stores.
- Privacy policy and terms pages.

## Not verified

- Google's exact current policy wording, since the pages were blocked in this session.
- Apple Group Purchases details: dates, regions, group size, Android members.
- The final UK regulations and their start date.
