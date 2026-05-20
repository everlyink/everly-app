# everly

> now in words. always in time.

The full Stage 2 web application for everly — a message scheduling platform where users write heartfelt messages today and everly delivers them at exactly the right moment in the future.

When ready, this app will replace the waitlist landing page at `everly.ink`.

---

## Tech stack

- **Framework**: Next.js (Pages Router) + React 19
- **Database + auth**: Supabase (Postgres + GoTrue)
- **Email delivery**: Resend
- **SMS delivery**: Twilio
- **Payments**: Stripe Checkout (one-off purchases)
- **Hosting**: Vercel
- **Scheduled jobs**: Vercel Cron

---

## Local setup

```bash
# 1. install dependencies (uses an isolated cache if your global one is unwritable)
npm install

# 2. copy the env template and fill in your keys
cp .env.example .env.local

# 3. run the dev server
npm run dev
```

Open `http://localhost:3000`.

---

## Environment variables

See `.env.example` for the full list. All of these need to be set in Vercel for production:

| Variable | Where it comes from |
|----------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API (service_role) |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys |
| `STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → signing secret |
| `RESEND_API_KEY` | Resend → API Keys |
| `EVERLY_FROM_EMAIL` | e.g. `everly <hello@everly.ink>` (must be verified in Resend) |
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account |
| `TWILIO_PHONE_NUMBER` | Twilio verified sending number, e.g. `+447xxxxxxxxx` |
| `NEXT_PUBLIC_APP_URL` | The public URL the delivery links use, e.g. `https://app.everly.ink` |
| `CRON_SECRET` | Optional secret protecting `/api/send-message` from outside callers |

---

## Supabase setup

1. Create a fresh Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`. This creates:
   - the `profiles`, `messages`, `delivery_log` tables
   - row-level security policies
   - a trigger that creates a profile row when a new user signs up
   - the `get_delivered_message(uuid)` function used by the recipient delivery page
3. In **Authentication → Email**, decide whether you want email confirmation on signup. The app handles both flows.
4. Copy the project URL and the `anon` and `service_role` keys into your env vars.

---

## Stripe setup

1. Create a Stripe account (test mode is fine to start).
2. From **Developers → API keys**, copy the publishable + secret keys.
3. Configure a webhook endpoint pointing at `https://<your-app>/api/stripe-webhook` and subscribe to the `checkout.session.completed` event. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
4. No need to create products manually — the checkout uses `price_data` inline.
5. For local webhook testing, use the Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe-webhook`.

---

## Resend setup

1. Sign in to Resend.
2. Add and verify a sending domain (e.g. `everly.ink`).
3. Create an API key, copy it into `RESEND_API_KEY`.
4. Set `EVERLY_FROM_EMAIL` to a verified `From` address.

---

## Twilio setup

1. Buy or port a phone number capable of sending SMS in your target region.
2. From the Twilio console, copy the **Account SID** and **Auth Token**.
3. Set `TWILIO_PHONE_NUMBER` to the E.164-formatted sending number (e.g. `+447xxxxxxxxx`).

---

## Vercel + cron

The `vercel.json` in this repo configures an hourly cron job that hits `/api/send-message`. Vercel automatically attaches an `Authorization: Bearer <CRON_SECRET>` header — set `CRON_SECRET` in your Vercel env vars to enforce that check.

Deploy with `vercel --prod` after pushing to git.

---

## Project layout

```
everly-app/
├── pages/                  - all routes
│   ├── api/                - serverless functions
│   ├── delivered/[token]   - recipient page
│   ├── message/[id]        - view + edit a message
│   └── ...
├── components/
│   ├── ui/                 - Button, Input, DatePicker, Modal, ...
│   ├── layout/             - Nav, Footer, ProtectedRoute, PlanBar
│   └── message/            - MessageCard, MessageComposer, MessagePreview
├── lib/                    - Supabase / Stripe / Resend / Twilio clients + plan logic
├── hooks/                  - useMessages, useMessage
├── context/                - AuthContext
├── supabase/schema.sql     - run once on a fresh project
├── styles/globals.css      - the everly design system
└── vercel.json             - cron schedule
```

---

## Business rules (enforced in code)

There are two distinct time windows. Don't confuse them:

- **Scheduling reach** — the latest date a user can pick when scheduling a new message. Implemented in `maxScheduleDate(profile)`.
- **Management (edit) window** — the period during which a user can add, edit, or cancel messages. Implemented as the `window_expires_at` column on `profiles` and checked by `isWindowExpired(profile)`. When this window closes, the account becomes read-only; scheduled messages still deliver via the cron sender.

| Rule | Where |
|------|-------|
| Free users cannot create more than 1 message | `hasCapacity` in `lib/plans.js`, checked in `MessageComposer` and `Dashboard.handleDuplicate` |
| Free users cannot edit or cancel messages | `canEditMessage`, `canCancelMessage` in `lib/plans.js` |
| Paid users can only edit each message within 10 days of its creation | `canEditMessage` |
| Cancel cutoff: 3 days before delivery for paid · 2 hours for legacy | `canCancelMessage` |
| **Scheduling reach** — free: 3 years from signup · single / bundle_s: 30 years from purchase · bundle_m: 50 years from purchase · legacy: bounded only by Dec 31, 2100 | `maxScheduleDate` + `PAID_SCHEDULE_YEARS` |
| **Management window** — free: 3 years from signup · paid: 3 years from purchase (extendable) · legacy: never | `planUpdateForCheckout`, `handle_new_user` trigger, `isWindowExpired` |
| When management window closes, account is read-only; cron still delivers | `isWindowExpired`, surfaced in the plan bar; `canEditMessage` and `canCancelMessage` also guard on it |
| Duplicate always creates a draft | `Dashboard.handleDuplicate` |
| Delivery token is unique per message | `delivery_token` column has unique index, defaults to `gen_random_uuid()` |
| No refunds | Surfaced in copy on the upgrade page |

---

## Design system notes

- All copy is lowercase (brand voice).
- Body text 18px minimum · buttons 56px tall minimum · line-height 1.8.
- Fonts: Alice (Google) for headings + logo · Lora for body and message text · Inter Light (300) for UI labels.
- Colours live as CSS variables on `:root` in `styles/globals.css`. Never substitute with system black/white.

---

## What's not in this build

- Image / audio messages (Stage 3+).
- WhatsApp delivery (removed from roadmap).
- Window-expiry email reminders (the `notify_window_expiry` flag and `delivery_log` schema are in place; the reminder cron itself is not yet implemented).
