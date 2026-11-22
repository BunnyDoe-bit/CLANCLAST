# Humanet Health — full-stack platform

This turns the original Figma/Make prototype into a working product: a real
Node.js/Express API backed by a SQLite database sits behind the existing
React UI, so identity creation, login, consent, referrals and verification
are all real, persisted actions instead of local mock state.

```
humanet-health-platform/
├── backend/     Express + TypeScript + Prisma (SQLite) API
└── frontend/    The original React/Vite app, wired to call the API
```

## Landing page

The public landing page is the CLANCLAST website design
(`frontend/src/app/components/landing/MavenLanding.tsx` + `maven-landing.css`,
all CSS scoped under `.cc-site`). Its product cards and the **Working
prototypes** section open the Patient, Provider, Connect, Verify, USSD,
Caregiver and Onboard screens. The earlier globe-style landing components in
the same folder are no longer used by `App.tsx` and can be deleted.

## 1. Run the backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:migrate   # creates prisma/dev.db and applies the schema
npm run seed              # loads demo organisations, a patient and a provider
npm run dev                # starts the API on http://localhost:4000
```

Check it's alive: `curl http://localhost:4000/api/health`

## 2. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env.local   # already points at http://localhost:4000/api
npm run dev                   # starts Vite on http://localhost:5173
```

Open the printed localhost URL and choose **Patient**, **Provider**,
**Connect** or **Verify**, exactly like the original prototype — except
every action now round-trips to the database.

## Demo logins

| Role     | Identifier                        | Password       |
|----------|------------------------------------|----------------|
| Patient  | `+27825550198` (or the email)      | `Patient123!`  |
| Provider | `dr.naidoo@livingstone.org.za`     | `Provider123!` |
| Caregiver (Martin's sister) | phone: `+27825550199` | PIN: `1234` |

The seeded patient (Martin Mamoloto) already has a pending consent request
from Livingstone Hospital — sign in as the patient to approve/decline it,
or as the provider to see it sitting in **Consent Requests**.

> **Updating from an earlier copy of this project?** The schema has grown a
> few times (patient settings, `Caregiver`, interoperability tables,
> `AccessLog`, `RecordSyncRequest`, and now a `Medication` table plus
> attachment fields on `HealthRecord`/`RecordSyncRequest`). Just re-run
> `npm run prisma:migrate` in `backend/` each time — it's additive, your
> existing `dev.db` data is kept, and it'll prompt for a migration name
> (anything works, e.g. `add-medications-and-attachments`).

## What's actually real now

- **Identity** — patient registration and provider-assisted registration
  create a real row in the database and a genuine `HN-####-####` Humanet ID;
  duplicate mobile/ID numbers are rejected.
- **Auth** — bcrypt password hashing, JWT sessions, separate patient and
  provider tokens stored in `localStorage`.
- **QR codes** — `GET /api/patient/qr.png` renders an actual scannable PNG
  (via the `qrcode` package) encoding a 5-minute signed token; a provider's
  "Verify" screen can resolve that token back to a patient.
- **Consent** — approve (once / 7 days / until revoked), decline and revoke
  all update real records, adjust expiry, and add the requesting provider to
  the patient's care team on approval.
- **Referrals** — creating a referral automatically creates the linked
  consent request and a patient notification; approving that consent moves
  the referral from "awaiting consent" to "sent".
- **Verification** — `Humanet Verify` (public trust-check page) and the
  provider's in-workspace verification both hit the same backend logic and
  log an auditable activity entry.
- **Activity log** — every significant action (registration, verification,
  consent request/response, referral, credential issued) writes an
  `ActivityLog` row, shown in the provider's dashboard and Activity page —
  with the actual patient/provider name, not a raw database ID.
- **Patient → provider connections** — a patient can browse the organisation
  directory and connect directly from **Team → Connect a healthcare
  provider**; this adds the org to their care team without granting record
  access (that's still a separate consent step).
- **Patient profile & settings** — Personal information, default consent
  duration, caregiver access (add/remove), notification category toggles,
  language, and a real "larger text" accessibility toggle are all backed by
  the database now, not static buttons.
- **Provider settings** — editable provider name/role, organisation summary,
  and a working notification bell (recent org activity feed).
- **Credentials** — a provider can issue a credential to a patient from the
  Patients page; it shows up in the patient's Health Passport and triggers
  a notification.
- **Interoperability (Humanet Connect)** — the public Connect page now shows
  real counts instead of hardcoded numbers; a new organisation can actually
  "Connect your organisation" (creates a real `Organization` + first admin
  `Provider` login, starting at `PENDING` status); providers can invite
  other organisations to a partnership (accept/decline flow); each
  organisation has a simulated gateway sync log (`SyncEvent`) with a
  "Simulate gateway sync" action; and a provider can request that a record
  from another connected organisation's own system be synced into a
  patient's timeline — restricted to patients that provider's organisation
  already has a relationship with (an approved consent, or the patient is
  on their care team). **The record isn't created until the patient
  approves it** — the request shows up on the patient's Records screen with
  Approve/Decline, exactly like a consent request, and declining means
  nothing is ever added. This mirrors how record *viewing* already worked
  (consent-gated) and closes a gap where record *creation* previously
  didn't require any patient action at all.
  (Worth knowing: there's no real external FHIR server for any of this to
  talk to in a demo, so these are realistic simulations of the workflow —
  real data and real state transitions, just not a live integration.)
- **Inclusive access** — the "no smartphone? still connected" promise is now
  backed by real features: a **Health Card** (an actual generated PDF with
  the patient's Humanet ID and a scannable QR, downloadable from the QR
  screen or the "I do not have a smartphone" modal); a **USSD simulator**
  (landing page → "Try the USSD experience") showing the text-menu flow
  someone on a feature phone would use to check their ID, view/approve
  pending consent, or see emergency info — it runs its own isolated session
  so it won't sign you out of an already-open Patient app tab; and
  **caregiver login** (landing page → "Caregiver sign in") — a patient can
  give a caregiver their own phone number + PIN in Profile → Caregiver
  access, and that caregiver can then sign in separately to view the
  patient's emergency info and approve/decline consent requests on their
  behalf.
- **Consent transparency** — a patient-facing **Data access log** (Profile →
  Data access log) shows every time a provider viewed their authorised
  records or verified their identity; **emergency/break-glass access**
  (Provider → Patients → "Emergency access") lets a provider pull critical
  info without an approved consent, but it requires a written reason,
  immediately notifies the patient, and shows up flagged in their access
  log until they mark it reviewed; and **consent expiry** is now actually
  enforced — a background job flips lapsed grants to `EXPIRED` and notifies
  the patient 24h before a 7-day grant lapses, and the Consent screen shows
  a live "Expires in X days" countdown. (This also fixed a real bug: the
  provider's patient-detail view was previously treating approved consent
  as active forever, ignoring `expiresAt` entirely.)

## API overview

All endpoints are under `/api`. Patient and provider endpoints require
`Authorization: Bearer <token>` from their respective login response.

- `POST /auth/patient/register`, `POST /auth/patient/login`
- `POST /auth/provider/login`, `GET /auth/me`
- `GET /patient/passport|records|team|consent|notifications`
- `GET /patient/qr`, `GET /patient/qr.png`
- `POST /patient/consent/:id/approve|decline|revoke`
- `PATCH /patient/profile`, `PATCH /patient/notifications/:id/read`
- `GET /provider/dashboard`
- `GET|POST /provider/patients`, `GET /provider/patients/:id`
- `POST /provider/verify` (Humanet ID or QR token)
- `POST|GET /provider/consent-requests`, `POST /provider/consent-requests/:id/resend`
- `POST|GET /provider/referrals`
- `GET /provider/connections`, `GET /provider/activity`
- `POST /verify/lookup` — public trust-check used by the "Humanet Verify" page

## Data model

See `backend/prisma/schema.prisma` for the full picture: `Organization`,
`Provider`, `Patient`, `HealthRecord`, `Credential`, `CareTeamMember`,
`ConsentRequest`, `Referral`, `Notification`, `ActivityLog`.

## Records depth

- **Medications** — a real `Medication` model, not just another health record.
  A provider prescribes from the Patients page (name, dosage, frequency,
  notes); the patient always sees their own full list under **Records →
  Medications**. Other providers only see it if their approved consent
  scope includes "Prescription" — same gating as everything else. A
  provider can later mark a medication completed/discontinued.
- **Document attachments** — a provider can attach a real file (PDF, PNG,
  JPEG, or WEBP, up to 5MB) when requesting a record sync. Like everything
  else in that flow, the attachment doesn't exist for anyone until the
  patient approves the sync request. Both the patient and any provider with
  matching active consent can then view/download it — the provider-side
  download endpoint independently re-checks consent and scope server-side,
  so it can't be used to pull a file for a record outside what that
  provider is actually authorised to see.
- Fixed two more real gaps found while building this: **credential
  issuance had no relationship guardrail at all** (any provider could issue
  a credential to any patient with zero established relationship — now
  fixed, using the same shared guardrail as medications and record sync),
  and **the provider's "authorised records" view only ever showed a count,
  never the actual list** — now it shows the real records, with attachment
  downloads where available.

## Identity match & check-in (real-time)

A probabilistic identity-match engine for front-desk check-in — "does this
person already have a Humanet ID?" when they don't have a scannable QR or
exact ID handy (misspelled on a printed card, given verbally, etc.).
Deterministic exact-ID match short-circuits to an immediate match; otherwise
a phonetic (Double Metaphone) + fuzzy (Jaro-Winkler) cascade scores against
existing patients and classifies each into `auto_link` / `escalate` /
`distinct`, surfaced to the receptionist as **Provider → Check-in**.

This was built and validated by actually running it against test cases —
including the misspelled-name example a partner-facing POC document used as
its own worked example — not just written and assumed correct. Doing that
surfaced two real design bugs before they shipped:
- Missing fields (e.g. no DOB given) were dragging scores down as weak
  counter-evidence instead of being excluded from consideration — an exact
  name match with nothing else provided was wrongly landing as "distinct"
  (new patient) instead of prompting a human to check.
- The fix for that then overcorrected: a bare name match with *zero* other
  corroborating fields could reach `auto_link` purely because there was
  nothing else to weigh against it — which would silently merge two
  different people who happen to share a name. `auto_link` now requires at
  least one corroborating field beyond name to have actually been compared.

The weights and thresholds (`src/utils/matchEngine.ts`) are a reasonable
starting point, explicitly not a validated result — they should be tuned
against a real labelled test set before being trusted, and checked for
uneven performance across South African name-origin groups specifically,
since phonetic algorithms are typically tuned for English/Western name
patterns first.

## Verify, extended

Humanet Verify (the public trust-check page) now verifies credentials, not
just identity — this turned out to already be mostly built from earlier
work, so this pass was mostly about finding and closing the gaps:

- **Verify a credential** — a second tab on the public Verify page. Enter a
  credential's reference (or scan its QR) and get back its type, holder,
  issuer, issue date, and live status — independent of identity lookup, so
  a verifier never needs any Humanet access themselves.
- **Patient-side QR** — each credential in a patient's Health Passport has
  a "Show verification code" action generating a real scannable QR.
- **Found and fixed: no way to revoke a credential.** The backend endpoint
  and API client function already existed, but no UI ever called it — a
  provider could issue a credential but never revoke one. Added a Revoke
  button per credential on the provider's Patients page; a revoked
  credential immediately fails public verification and the patient is
  notified.
- **Found and fixed: no way to manually enter a credential's reference.**
  The QR modal only showed the QR image — testing the public Verify page
  without a scanner meant decoding a QR code by hand. Now the reference is
  also shown as copyable plain text right below it.

## Bug-hunt & cleanup pass

A dedicated audit across the whole codebase (every frontend API call
cross-referenced against every backend route, every view/nav target
checked for a matching screen, schema checked for dead models, env config
checked for consistency). Found and fixed:

- **A stale, unused `RecordImportRequest` model** left in the schema from
  earlier work, alongside the real `RecordSyncRequest` — caused a Prisma
  validation error on migrate. Removed.
- **The same expiry-blind consent bug, found in four separate places**
  (patient's own Health Passport, the public Verify lookup, and two spots
  in the provider's patient view) — each one counted `APPROVED` consent as
  "active" without checking if it had actually expired. Fixed all four,
  and extracted a shared `activeConsentWhere()` helper so this specific
  mistake can't be reintroduced by accident in a fifth place.
- **The consent-request scope picker** (letting a provider choose what
  they're requesting access to, instead of a hardcoded pair of scopes) had
  only ever been given as paste-in instructions and never actually applied
  to this project — now properly implemented.
- Confirmed every other "here's a snippet to paste in" fix from earlier in
  this project's history was in fact applied (the nav-tab fix, the
  ts-node/nodemon swap, the emergency-access guardrail, the credentials
  consent-gating fix) — no other gaps found.

## Notes & next steps

- SQLite is used for zero-setup local development. To move to Postgres for
  a real deployment, change `datasource db { provider = "postgresql" }` in
  `schema.prisma`, set `DATABASE_URL` to a Postgres connection string, and
  re-run `npm run prisma:migrate`.
- Identity "verification" is simulated as instant (as the original prototype
  implied) — in production this is where you'd call an actual ID-matching
  service before setting `identityVerified`.
- There's no HTTPS/rate-limiting/refresh-token layer yet; add those before
  putting this in front of real patient data.

## Roadmap to a real pilot

**Deploying it** — see [`DEPLOYMENT.md`](./DEPLOYMENT.md) for a step-by-step
guide (Railway for the backend, Vercel for the frontend).

**Phase 1 — POC / concierge pilot on synthetic data.** What's needed beyond
deployment itself:
- A password reset flow (currently missing entirely — real users need this
  even with synthetic data)
- Admin/support tooling for the concierge team — `npx prisma studio` (built
  into this project already) covers a lot of this at small scale without
  needing a custom admin panel
- A bulk-onboarding script for the pilot cohort, rather than one-by-one
  self-registration
- Basic error monitoring (even a free-tier Sentry-style service) so issues
  surface before a pilot participant has to report them
- Automated tests around the consent/access-control logic specifically —
  this is where manual testing already found the most real bugs
- In-app feedback capture, since the point of a concierge pilot is learning

**Phase 2 — before any real patient health data goes in.** This is a
different tier of work, not an afterthought:
- A privacy/compliance review against South Africa's POPIA (or your
  jurisdiction's equivalent) — data processing agreement with the pilot
  site, a real privacy policy, clarity on data residency
- Encryption at rest for the database
- Real server-side session/token revocation (a logged-out token is
  currently still valid until it naturally expires)
- Hardened rate limiting, especially on public endpoints (`/verify`,
  `/connect/onboard`)
- A security review before real PHI is at stake
- Ethics/IRB sign-off if this becomes a research pilot with publishable
  outcomes
