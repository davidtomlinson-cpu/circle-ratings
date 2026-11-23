# SofaClub on Google Play: step-by-step guide

Work through the parts in order. Each part says who does it. When a part says "send me", paste the value into chat. Never paste anything this guide marks as **secret**.

Google renames menus now and then. If a button isn't where this says, look for the nearest match or send a screenshot.

**Time:** about 2 hours of your time in total, spread over three weeks because of Google's 14-day testing rule (Part H).

---

## Part A: Check the account (you, 5 minutes)

1. Go to **play.google.com/console** and sign in with the Google account that owns the SofaClub app.
2. Click **SofaClub** in the app list.
3. In the left menu, scroll to the bottom and click **Settings**, then **Developer account**, then **Account details**.
4. Look at **Account type**: **Personal** or **Organisation**. Tell me which. If it's Personal, Part H (12 testers for 14 days) applies.
5. In the left menu, check that **Settings → Payments profile** shows a payments profile with bank details. If it doesn't, click **Create payments profile** and fill it in with Nicola's details (Nicola is the seller). Google can't pay you without it.

---

## Part B: Create the subscriptions (you, 20 minutes)

You'll make 3 subscriptions. Each has 2 price plans (monthly and annual), and each plan gets a 7-day free trial.

**The IDs must be typed exactly as shown. They can never be changed.**

| Subscription ID | Name | `monthly` price | `annual` price |
|---|---|---|---|
| `cr_individual` | Individual | £3.99 | £39.99 |
| `cr_family` | Family | £6.99 | £79.99 |
| `cr_extended` | Extended family | £9.99 | £99.99 |

### B1. Make the first subscription

1. Left menu: **Monetise with Play**, then **Products**, then **Subscriptions**.
2. Click **Create subscription**.
3. **Product ID:** `cr_individual`
4. **Name:** `Individual`
5. Click **Create**.

### B2. Add the monthly plan

1. On the subscription page, under **Base plans and offers**, click **Add base plan**.
2. **Base plan ID:** `monthly`
3. **Type:** Auto-renewing.
4. **Billing period:** Monthly.
5. **Grace period:** leave the default.
6. Scroll to **Prices and availability**, click **Set prices**, tick **United Kingdom** (or all countries is fine), click **Set price**, enter **3.99**, and confirm.
7. Click **Save**, then **Activate**.

### B3. Add the annual plan

1. Back on the subscription page, click **Add base plan** again.
2. **Base plan ID:** `annual`
3. **Type:** Auto-renewing. **Billing period:** Yearly.
4. Set the price to **39.99** as before.
5. **Save**, then **Activate**.

### B4. Add the free trial to each plan

Do this twice, once for `monthly` and once for `annual`:

1. On the subscription page, click **Add offer** and choose the base plan.
2. **Offer ID:** `trial`
3. **Eligibility:** **New customer acquisition**, then **Never had this subscription** (or "Never had any subscription in this app", either is fine).
4. Click **Add phase**, then **Free trial**, duration **7 days**. Click **Apply**.
5. **Save**, then **Activate**.

### B5. Repeat for the other two

Repeat B1 to B4 for `cr_family` and `cr_extended`, using the prices in the table.

**Check:** you should have 3 subscriptions, each showing 2 active base plans and 2 active offers.

---

## Part C: Give RevenueCat access to Google Play (you, 20 minutes)

RevenueCat needs a "service account": a robot login that can check purchases. You make it in Google Cloud, then give it permission in Play Console.

### C1. Turn on the Google APIs

1. Go to **console.cloud.google.com**, signed in with the same Google account.
2. At the top, click the project picker. If there's a project linked to your Play account, choose it. Otherwise click **New project**, name it `SofaClub`, and click **Create**, then select it.
3. In the search bar at the top, search **Google Play Android Developer API**, open it, and click **Enable**.
4. Search **Google Play Developer Reporting API**, open it, and click **Enable**.
5. Search **Cloud Pub/Sub API**, open it, and click **Enable** (if it isn't already).

### C2. Create the service account

1. Left menu (☰): **IAM & Admin**, then **Service Accounts**.
2. Click **+ Create service account**.
3. **Name:** `revenuecat`. Click **Create and continue**.
4. **Grant this service account access**: add two roles:
   - **Pub/Sub Editor**
   - **Monitoring Viewer**
5. Click **Continue**, then **Done**.
6. Copy the service account's **email address** from the list (it ends `@...iam.gserviceaccount.com`). You'll need it in C4.

### C3. Download its key (**secret**)

1. Click the new `revenuecat` service account.
2. Go to the **Keys** tab, then **Add key**, then **Create new key**.
3. Choose **JSON**, then **Create**. A `.json` file downloads.
4. **This file is secret.** It goes into RevenueCat only. Don't send it to me or anyone else.

### C4. Give it permission in Play Console

1. Back in **Play Console**, go to the **main page** (All apps), then the left menu: **Users and permissions**.
2. Click **Invite new users**.
3. **Email address:** paste the service account email from C2.
4. **Account permissions**: tick
   - **View app information and download bulk reports (read only)**
   - **View financial data, orders and cancellation survey responses**
   - **Manage orders and subscriptions**
5. Click **Invite user**, then **Send invite**.

---

## Part D: Set up Android in RevenueCat (you, 15 minutes)

### D1. Add the Play Store app

1. In RevenueCat, open the **SofaClub** project, then **Apps** (left menu), then **+ New app** (or **Add app**), then **Google Play Store**.
2. **App name:** `SofaClub (Play Store)`
3. **Package name:** `com.davala.circleratings`
4. **Service account credentials JSON:** upload the file from C3.
5. Click **Save**.

RevenueCat may say the credentials are "being validated". Google can take up to 36 hours to activate a new service account. You can carry on meanwhile.

### D2. Real-time notifications (renewals and cancellations)

1. On the same RevenueCat app page, find **Google developer notifications**.
2. Click **Connect to Google** (it creates a Pub/Sub topic). Copy the **Topic ID** it shows (it starts `projects/...`).
3. In Play Console, open **SofaClub**, then **Monetise with Play**, then **Monetisation setup**.
4. Under **Real-time developer notifications**, tick **Enable**, paste the **Topic name**, and click **Save**.
5. Click **Send test notification**. RevenueCat should show it as received.

### D3. Import the products

1. RevenueCat: **Product catalog**, then **Products**, then **+ New** (or **Import**), then choose the Play Store app.
2. Import all six. They show as `cr_individual:monthly`, `cr_individual:annual`, and so on.

If the import finds nothing, the service account isn't active yet. Wait a few hours and try again.

### D4. Attach them to `access`

1. **Product catalog**, then **Entitlements**, then **access**.
2. Click **Attach**, tick all six Play Store products, and click **Attach**.

### D5. Add them to the offering

1. **Product catalog**, then **Offerings**, then **access**.
2. For each of the six packages (`individual_monthly`, and so on), click **Edit**, and in the **SofaClub (Play Store)** row choose the matching product: `individual_monthly` → `cr_individual:monthly`, `family_annual` → `cr_family:annual`, and so on.
3. Save each one.

### D6. Send me the public Android key

1. **API keys** (left menu, or Project settings → API keys).
2. Under the Play Store app, copy the **public** key. It starts **`goog_`**.
3. **Send it to me.** It's meant to be public (it ships inside the app).

---

## Part E: Add yourself as a licence tester (you, 2 minutes)

So your test purchases aren't charged:

1. Play Console **main page** (All apps), then **Settings**, then **License testing**.
2. Add the Gmail address on your Android phone. Set **License response** to **RESPOND_NORMALLY**.
3. **Save changes**.

---

## Part F: New Android build (me, about 20 minutes)

When you send the `goog_` key, I'll:

1. Add it to the app's settings and the EAS build settings.
2. Build a new live Android version (versionCode 3) with payments and the terms and privacy links.
3. Send you the download link for the `.aab` file.

Then you:

1. Play Console: **SofaClub**, then **Test and release**, then **Testing**, then **Internal testing**, then **Create new release**.
2. Upload the `.aab`, and give it the release name `1.0.0 (3)`.
3. **Next**, then **Save and publish**.

---

## Part G: Test a purchase (you, 10 minutes)

1. On your Android phone, open the internal testing link (Internal testing → **Testers** tab → **Copy link**) and install the update from Play.
2. Open SofaClub, sign in, and start a free trial on any plan. The Play payment sheet should say it's a **test** purchase.
3. Check the app unlocks. Tell me, and I'll check the purchase reached our server.

---

## Part H: Closed test with 12 testers for 14 days (you; only if the account is Personal)

Google won't allow a production launch until a closed test has had **at least 12 testers opted in for 14 days in a row**.

1. Gather 12 or more people with Android phones. Collect the Gmail address each uses for Play.
2. Play Console: **SofaClub**, then **Test and release**, then **Testing**, then **Closed testing**, then **Create track** (or use the default **Closed testing - Alpha**).
3. **Testers** tab: **Create email list**, name it `SofaClub testers`, add their addresses, and **Save**.
4. **Countries/regions**: add **United Kingdom**.
5. **Create new release**, then **Add from library**, choose build `1.0.0 (3)`, then **Next**, then **Save and publish**.
6. Google reviews the closed test (usually a day or two).
7. Once approved, copy the **opt-in link** from the Testers tab and send it to everyone. Each tester must:
   - open the link and tap **Become a tester**
   - install SofaClub from Play
   - stay opted in for the full 14 days (they don't have to pay; they can start a free trial if they like and cancel it).
8. The 14 days count from the day the 12th tester opts in. Play Console shows progress on the **Dashboard**.

Tip: invite 15 to 20 people. If anyone drops out, the clock can reset.

---

## Part I: Store listing and app content (both, during the 14 days)

### I1. App content (you, with my answers)

Play Console: **SofaClub**, then **Policy and programmes**, then **App content**. Complete each item:

| Item | Answer |
|---|---|
| Privacy policy | `https://davidtomlinson-cpu.github.io/circle-ratings/privacy/` |
| App access | **All or some functionality is restricted**. Add instructions: name `Demo account`, username `appreview@sofaclub.invalid`, password (same as Apple's), note "Choose any plan and start the free trial with a licence-test account." |
| Ads | **No, my app does not contain ads** |
| Content rating | Fill in the questionnaire (I'll give answers when you get there; send a screenshot) |
| Target audience | Ages **13–15, 16–17, 18 and over**. Not designed for children. |
| Data safety | I'll give exact answers when you get there (send a screenshot) |
| Government apps | No |
| Financial features | No |
| Health | No |
| News | No |

### I2. Store listing (me for graphics, you to paste)

Play Console: **Grow users**, then **Store presence**, then **Main store listing**.

| Field | Value |
|---|---|
| App name | SofaClub |
| Short description (80) | Rate films, TV, books and albums with friends and family. 7 days free. |
| Full description | Same as the App Store description (in `docs/app-store-listing.md`), with "Apple ID" changed to "Google Play account" and "App Store" to "Google Play" |
| App icon | 512 × 512 PNG (I'll make it) |
| Feature graphic | 1024 × 500 PNG (I'll make it) |
| Phone screenshots | 2 to 8 images (I'll make them) |
| Category | Entertainment |
| Contact email | david@ditti.uk |

Tell me when you're ready and I'll make the icon, feature graphic and screenshots.

---

## Part J: Go live (you, after the 14 days)

1. Play Console **Dashboard**: click **Apply for production** and answer Google's short questions about the test (what testers said, what you changed).
2. Google reviews the application (about 7 days).
3. Once approved: **Test and release**, then **Production**, then **Create new release**, add the build, set **Countries/regions** to **United Kingdom**, then **Save and publish**.
4. Google reviews the release (a few hours to a few days). Then SofaClub is live on Google Play.

Google's fee on subscriptions is already 15%, so unlike Apple there's no programme to join for that.
