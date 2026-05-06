# Site Administrator Guide

## 1. Admin login and access

- Open `/admin/login`
- Sign in with your admin email/password
- Access is granted only if your Firebase user UID is listed under `/admins`

If login works but admin page denies access, your `/admins/{uid}` entry is missing.

## 2. Admin user management

In **Settings** (CMS editor), you can:

- View current admin users
- Add admin access by email
- Remove admin access (except your own current account)

Important:

- Removing admin access in-app removes `/admins/{uid}` access only.
- Deleting the actual Firebase Auth account must be done in Firebase Console (or Admin SDK backend).

## 3. Dashboard overview

Admin pages in `/admin`:

1. **Plot reservations**
2. **Returning gardeners**
3. **Plots & landmarks**
4. **Settings**

All tables support search and pagination.

## 4. Plot reservations

Use this page to:

- Mark selected reservations as verified / not verified
- Delete reservation entries
- Edit reservation details (name, email, affiliation, payment verified)
- Optionally edit partner list via **Edit partners** toggle

Notes:

- Payment verification here also updates linked plot payment/status.
- If you change email/name and that email has multiple registrations, you will be prompted whether to apply changes across those registrations.

## 5. Returning gardeners

Use this page to:

- Review submissions
- Mark status (incomplete/complete)
- Delete selected entries
- Export CSV

## 6. Plots & landmarks

Use this page to:

- Edit plot/landmark geometry (`x`, `y`, `width`, `height`)
- Create new plots/landmarks
- Delete selected items (with safety constraints)

Important guardrails:

- Plot status, assignment, and payment verification are managed in **Plot reservations**.
- Plot deletion is allowed only when no gardener is linked and status is available.

## 7. CMS settings

Use **Settings** to update site text and links, including key content sections shown on public pages.
You can also control:

- Plot registration form open/closed
- Returning gardener form open/closed
- Maximum plots per gardener (1-4) for new registrations by email
- Per-email plot limit overrides (for exceptions such as clubs)

## 8. CSV exports

- Plot reservations export includes gardener and related plot fields.
- Returning gardeners export includes full submission fields.

Store exports in your approved internal location; treat personal data as sensitive.

## 9. Seasonal startup checklist

1. Confirm registration status/open settings in CMS.
2. Verify plot map and landmark geometry.
3. Verify admin user list.
4. Run a test public registration and returning-gardener submission.
5. Confirm payment verification workflow for the new season.
