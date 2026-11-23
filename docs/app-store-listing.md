# App Store listing: SofaClub 1.0

Copy each field into App Store Connect → Apps → SofaClub. Character limits are Apple's.

## App Information (left menu, General → App Information)

| Field | Value |
|---|---|
| Name (30) | SofaClub |
| Subtitle (30) | Rate films, TV, books & music |
| Primary category | Entertainment |
| Secondary category | Lifestyle |
| Content rights | Yes, it contains third-party content, and yes, you have the rights to use it (Wikipedia extracts under CC BY-SA; title data under CC0) |
| Privacy Policy URL | https://davidtomlinson-cpu.github.io/circle-ratings/privacy/ |

## Version 1.0 page (Distribution → iOS App → 1.0 Prepare for Submission)

**Promotional text (170)**

Find out what your friends and family actually loved. Rate films, TV, books and albums with hearts, keep a watchlist, and see what’s trending this week. Free for 7 days.

**Description (4000)**

SofaClub is where your family and friends share what they’ve watched, read and listened to, and what they really thought of it.

RATE WITH HEARTS
Give anything one to five hearts: films, TV series, books and albums. Your ratings build into your own list, so you’ll never forget whether that series was worth it.

SEE WHAT YOUR CIRCLE LOVED
Invite the people whose taste you trust. See their top picks, what they’ve rated lately and how their hearts compare with yours. You choose who sees your ratings: all your contacts, just the people you pick, or no one.

WORK THROUGH THE GREATS
Top 50 lists of the all-time greats in every category. Tick them off and watch your progress grow.

WHAT’S TRENDING THIS WEEK
What’s out in cinemas now, plus the films, TV shows, books and albums people everywhere are talking about. Updated every day.

LOVED BY THE CLUB
The titles SofaClub members loved most, counted anonymously.

YOUR WATCHLIST AND RATINGS IN ONE PLACE
Save things for later, then rate them when you’re done. Search for any title, or add your own.

PLANS
Start with 7 days free. Choose Individual, Family (up to 6 people) or Extended family (up to 10 people), billed monthly or annually. Family members get their own account and their own private list.

Payment is charged to your Apple ID when the free trial ends. Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Manage or cancel any time in your App Store account settings.

Terms of use: https://davidtomlinson-cpu.github.io/circle-ratings/terms/
Privacy policy: https://davidtomlinson-cpu.github.io/circle-ratings/privacy/

**Keywords (100, no spaces after commas)**

movie,series,album,watchlist,family,friends,review,tracker,reading,cinema,top 50,classics,trending

| Field | Value |
|---|---|
| Support URL | https://davidtomlinson-cpu.github.io/circle-ratings/ |
| Marketing URL | leave blank |
| Version | 1.0.0 |
| Copyright | 2026 Nicola Jane Smith |
| Build | 3 |
| Version release | Manually release this version |

**Screenshots:** iPhone 6.9" display. Upload the six files in order (01 to 06). The app is iPhone only, so no iPad screenshots are needed.

## In-App Purchases and Subscriptions (same version page)

Click **+** in the "In-App Purchases and Subscriptions" section and tick all six `cr_` subscriptions. A first subscription must be reviewed with the app.

Each subscription also needs, under its own page → **Review Information**:
- **Screenshot:** a screenshot of the plan screen taken on the iPhone (TestFlight build). The same screenshot is fine for all six.
- **Review notes:** "Shown on the plan screen after sign-in. Starts with a 7-day free trial."

## App Review Information (same version page, near the bottom)

| Field | Value |
|---|---|
| Sign-in required | Yes |
| User name | appreview@sofaclub.invalid |
| Password | (given in chat; not stored in the repo) |
| Contact | Nicola's name, phone and email |

**Notes**

SofaClub needs a subscription, with a 7-day free trial. After signing in with the demo account, the plan screen appears: choose any plan and start the free trial with your sandbox account to unlock the app. The demo account already has four friends (Ana, Ben, Cara and Dev) with ratings, so the Friends tab, the circle averages and the title pages show real content.

Comments and ratings are only visible to people both users have connected with through a personal invite code. Users can remove anyone from their circle at any time (Friends → person → Remove from circle), which stops all sharing both ways. Objectionable content can be reported to the support email in the app's terms, and we act on reports within 24 hours.

Account deletion: Profile → Delete account.

Title details come from Wikidata and MusicBrainz (CC0); descriptions are short Wikipedia extracts under CC BY-SA 4.0, credited and linked on each title page.

## App Privacy (left menu, Trust & Safety → App Privacy)

Tracking: **No**, we don't track.

Data collected, all **linked to the user**, all used only for **App Functionality**, none used for tracking:

| Apple category | Type | Why |
|---|---|---|
| Contact Info | Name | Shown to the user's friends |
| Contact Info | Email Address | Sign-in and account emails |
| User Content | Other User Content | Ratings, watchlist, comments |
| Identifiers | User ID | Account and subscription records |
| Purchases | Purchase History | Subscription status from RevenueCat |

Not collected: location, contacts, health, financial info, browsing or search history, diagnostics, usage data, advertising data.

## Age rating (left menu, General → App Information → Age Rating)

Answer **None / No** to everything except:
- **User-generated content:** Yes (comments shared between connected friends).
- **Messaging and chat:** No.
- **Unrestricted web access:** No (links open specific Wikipedia articles only).

Expect a 13+ rating.

## Pricing and Availability

- Price: Free (subscriptions are sold in-app).
- Availability: United Kingdom only for launch. The terms and privacy policy are written for UK law; add other countries later after legal review.

## Launch

SofaClub 1.0 (build 3) went live on the UK App Store on 23 November 2026.

**Keep the reviewer account.** `appreview@sofaclub.invalid` (friends Ana, Ben, Cara, Dev) is needed for every future App Review. Don't delete it, and keep its password in the review notes.

**Shipping fixes.** JavaScript-only fixes go out over the air: check the live runtime first (`npx expo-updates runtimeversion:resolve --platform ios`), then `npm run update:production`. Anything that changes native code needs a new build and a new App Store submission.
