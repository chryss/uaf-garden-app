# Developer Guide

## 1. Prerequisites

- Node.js + npm
- Firebase CLI (`firebase --version`)
- Access to Firebase projects (staging and production)

Install dependencies:

```bash
npm install
```

## 2. Local development

Run dev server:

```bash
npm run dev
```

Stop dev server with `Ctrl+C`.

Build and preview production bundle:

```bash
npm run build
npm run preview
```

## 3. Environment configuration

Main env files:

- `.env.local` (active dev/staging runtime config)
- `.env.production` (production values reference)

Required Firebase env keys:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

Script auth keys (for seed/migration scripts):

- `VITE_FIREBASE_ADMIN_EMAIL`
- `VITE_FIREBASE_ADMIN_PASSWORD`

## 4. Deploy and Firebase operations

Build first:

```bash
npm run build
```

Deploy hosting (staging):

```bash
firebase deploy --only hosting --project cw-trtrtr
```

Deploy hosting (production):

```bash
firebase deploy --only hosting --project uaf-garden
```

Deploy Realtime Database rules:

```bash
firebase deploy --only database --project <project-id>
```

## 5. Data scripts

Generate registration seed from CSV:

```bash
node scripts/generateSeedRegistrations.js
```

Seed database from JSON files (`firebase/seed-*.json`):

```bash
VITE_FIREBASE_ADMIN_EMAIL="..." \
VITE_FIREBASE_ADMIN_PASSWORD="..." \
node scripts/seedFromJson.js
```

Migrate gardeners to email-based IDs:

```bash
VITE_FIREBASE_ADMIN_EMAIL="..." \
VITE_FIREBASE_ADMIN_PASSWORD="..." \
node scripts/migrateGardenersToEmailIds.js
```

## 6. Data model and rules highlights

- Public reads: `cms`, `plots`, `landmarks`
- Admin-only reads: `gardeners`, `returning-gardeners`
- Admin membership gate: `/admins/{uid}`
- Gardener IDs are email-based (`gardener-<email-slug>`)
- Gardener records track `plots` (array) + `plotId` (primary)

Rules file: `firebase/database.rules.json`

## 7. QA checklist before deploy

1. Public flows:
   - Home content loads
   - Plot registration map/form works
   - Returning gardener form submit works
2. Admin flows:
   - Admin login and `/admins` access checks
   - Plot reservations actions/edit/export
   - Returning gardeners actions/export
   - Plots & landmarks CRUD constraints
3. Build succeeds (`npm run build`)

## 8. Troubleshooting

- `PERMISSION_DENIED` in scripts:
  - Confirm correct project in `.env.local`
  - Confirm admin user is in Auth and `/admins/{uid}`
  - Confirm data passes rules validation
- Auth works but script write fails:
  - Check exact path in error and compare against rules
- UI loads but data empty:
  - Verify `VITE_FIREBASE_DATABASE_URL` and project env values
