# CLANCLAST website

The public CLANCLAST website, with the **real product running live**:

| Path | What it is |
|------|------------|
| `/` | Marketing site. Its "Live product" section embeds both apps in a laptop and a phone. |
| `/patient` | The real CLANCLAST patient app (ID, consent, encrypted vault for signed summaries, access log). |
| `/provider` | The real CLANCLAST provider workspace (check-in, patients, consent, referrals, signed summaries, Connect). |
| `/#ussd`, `/#caregiver` | Channels for people without a smartphone. |

**Everything runs in the visitor's browser.** The apps' API clients
(`src/apps/*/lib/api.ts`) call a shared demo backend (`src/demo/db.ts`) instead of a
server. Data is fictional, kept in `localStorage`, shared between the apps (a consent
request or signed summary sent from the workspace really arrives in the patient app), and
can be reset from the "Live demo" badge. Nothing is sent anywhere.

What is deliberately not here: the identity-resolution engine and the identity console.
Check-in uses a few illustrative rules only. Demo signing keys are derived from public
labels so a summary verifies on any device; they sign fictional data only.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173  (/, /patient, /provider)
npm run build      # static site in frontend/dist
npm run typecheck
```

Hosting: any static host. On Vercel set the root directory to `frontend`; `vercel.json`
rewrites `/patient/*` and `/provider/*` to their app pages for deep links.

## Demo sign-ins (fictional)

| Where | Sign in with | Password / PIN |
|-------|--------------|----------------|
| Patient app | `082 555 0198` | `Patient123!` |
| Provider workspace | `dr.naidoo@riverside.demo` | `Provider123!` |
| USSD | `082 555 0198` | PIN `2580` |
| Caregiver | `082 555 0199` | PIN `1234` |

Both apps have a "Demo account" button that fills these in.

## Keeping the apps in step with production

`src/apps/patient` and `src/apps/provider` are copies of the production frontends
(`patient-frontend/src`, `provider-frontend/src`). Website-only changes:

- `lib/api.ts`: demo backend instead of `fetch`;
- `app/lib/router.ts`: routes live under `/patient` and `/provider`;
- provider: identity console removed, demo-account button, "Open in the patient app" on summary hand-off, trust registry from the demo backend;
- `main.tsx`: demo badge and auto sign-in when embedded on the landing page (`?embed=1`).

## Before launch

- The enquiry form does not send anything yet. Connect a secure form service (with a privacy notice and retention rules).
- Pages have `noindex, nofollow`. Remove that from `frontend/index.html` when you are ready to be found.
