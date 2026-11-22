# CLANCLAST website

The public CLANCLAST website: the marketing landing page plus clickable prototypes of the
Patient, Provider, Connect, Verify, USSD, Caregiver and Onboarding screens.

**Everything runs in the visitor's browser.** There is no backend. The prototypes use
fictional demonstration data (`frontend/src/lib/api.ts`) that resets when the page reloads,
and nothing anyone types is sent anywhere. None of CLANCLAST's production logic is in this
repository: the check-in "matching" is a few plain rules for illustration only.

## Run it

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in frontend/dist
npm run typecheck
```

`frontend/dist` can be hosted on any static host (Vercel, Netlify, S3 + CloudFront).

## Demo sign-ins (fictional)

| Prototype | Sign in with | Password / PIN |
|-----------|--------------|----------------|
| Patient   | `082 555 0198` | `Patient123!` |
| USSD      | `082 555 0198` | PIN `2580` |
| Provider  | `dr.naidoo@riverside.demo` | `Provider123!` |
| Caregiver | `082 555 0199` | PIN `1234` |

All people and organisations in the demo data are fictional.

## Brand

Colours, type and logos match the live CLANCLAST apps: tokens in
`frontend/src/styles/theme.css`, logo files in `frontend/public/brand`. The prototype screens
follow the device's light or dark setting; the marketing landing page is always light.

## What the site does not do

- It does not store or show clinical records. Patients see institution-signed summaries
  by issuer, version and date only.
- The enquiry form does not send anything yet. Connect a secure form service (with a
  privacy notice and retention rules) before taking real enquiries.
- `index.html` has `noindex, nofollow`, so search engines will not list the site.
  Remove that line when you are ready to launch publicly.
