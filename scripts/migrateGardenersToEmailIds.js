/*
  Migrate gardeners to email-based IDs and merge multiple plot registrations
  for the same email into one gardener record.

  Usage:
    export VITE_FIREBASE_ADMIN_EMAIL=admin@example.com
    export VITE_FIREBASE_ADMIN_PASSWORD=super-secret
    node scripts/migrateGardenersToEmailIds.js
*/

import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDatabase, get, ref as dbRef, remove, set, update } from 'firebase/database';

const loadEnvFile = (path) => {
  if (!fs.existsSync(path)) return;
  const contents = fs.readFileSync(path, 'utf-8');
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) {
      process.env[key] = rest.join('=').replace(/^['"]|['"]$/g, '');
    }
  });
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const makeGardenerIdFromEmail = (email, fallback = 'unknown') => {
  const safeEmail = normalizeEmail(email)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `gardener-${safeEmail || fallback}`;
};

const dedupe = (values) =>
  [...new Set((Array.isArray(values) ? values : []).filter(Boolean).map((value) => String(value).trim()))];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePartners = (partners) =>
  (Array.isArray(partners) ? partners : [])
    .map((partner) => {
      const name = String(partner?.name || '').trim();
      const email = String(partner?.email || '').trim().toLowerCase();
      if (!name && !email) {
        return null;
      }
      return {
        ...(name ? { name } : { name: '' }),
        ...(emailPattern.test(email) ? { email } : {})
      };
    })
    .filter(Boolean);

loadEnvFile('.env.local');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const adminEmail = process.env.VITE_FIREBASE_ADMIN_EMAIL;
const adminPassword = process.env.VITE_FIREBASE_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  throw new Error('Set VITE_FIREBASE_ADMIN_EMAIL and VITE_FIREBASE_ADMIN_PASSWORD before running migration.');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const migrate = async () => {
  const credential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  try {
    const [gardenersSnapshot, plotsSnapshot] = await Promise.all([
      get(dbRef(database, 'gardeners')),
      get(dbRef(database, 'plots'))
    ]);

    const gardeners = gardenersSnapshot.exists() ? gardenersSnapshot.val() : {};
    const plots = plotsSnapshot.exists() ? plotsSnapshot.val() : {};
    const mergedGardeners = {};
    const plotToGardenerId = {};

    Object.entries(gardeners).forEach(([oldGardenerId, gardener]) => {
      const email = normalizeEmail(gardener?.email);
      const newGardenerId = makeGardenerIdFromEmail(email, oldGardenerId);
      const sourcePlots = dedupe([gardener?.plotId, ...(Array.isArray(gardener?.plots) ? gardener.plots : [])]);
      const existing = mergedGardeners[newGardenerId];

      const mergedPlots = dedupe([...(existing?.plots || []), ...sourcePlots]);
      mergedGardeners[newGardenerId] = {
        ...(existing || {}),
        firstName: existing?.firstName || gardener?.firstName || '',
        lastName: existing?.lastName || gardener?.lastName || '',
        email,
        affiliations:
          (Array.isArray(existing?.affiliations) && existing.affiliations.length)
            ? existing.affiliations
            : (Array.isArray(gardener?.affiliations) && gardener.affiliations.length)
              ? gardener.affiliations
              : [gardener?.affiliation].filter(Boolean),
        affiliation:
          existing?.affiliation
          || gardener?.affiliation
          || ((Array.isArray(gardener?.affiliations) && gardener.affiliations[0]) || null),
        studentType: existing?.studentType || gardener?.studentType || null,
        plotId: mergedPlots[0] || null,
        plots: mergedPlots,
        partners: normalizePartners([
          ...(Array.isArray(existing?.partners) ? existing.partners : []),
          ...(Array.isArray(gardener?.partners) ? gardener.partners : [])
        ]),
        agreeRules: gardener?.agreeRules === true || existing?.agreeRules === true,
        agreeWaiver: gardener?.agreeWaiver === true || existing?.agreeWaiver === true,
        paymentVerified: Boolean(gardener?.paymentVerified || existing?.paymentVerified),
        createdAt: existing?.createdAt || gardener?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: gardener?.source || existing?.source || 'migration'
      };

      mergedPlots.forEach((plotId) => {
        if (!plotToGardenerId[plotId]) {
          plotToGardenerId[plotId] = newGardenerId;
        }
      });
    });

    const migratedPlots = Object.fromEntries(
      Object.entries(plots).map(([plotId, plot]) => [
        plotId,
        {
          ...plot,
          registeredGardenerId: plotToGardenerId[plotId] || null
        }
      ])
    );

    const oldGardenerIds = Object.keys(gardeners);
    const newGardenerIds = Object.keys(mergedGardeners);
    const removedGardenerIds = oldGardenerIds.filter((id) => !newGardenerIds.includes(id));

    await Promise.all([
      ...newGardenerIds.map((gardenerId) =>
        set(dbRef(database, `gardeners/${gardenerId}`), mergedGardeners[gardenerId])
      ),
      ...removedGardenerIds.map((gardenerId) => remove(dbRef(database, `gardeners/${gardenerId}`))),
      set(dbRef(database, 'plots'), migratedPlots)
    ]);

    console.log(
      `Migrated ${Object.keys(gardeners).length} gardeners into ${Object.keys(mergedGardeners).length} email-based records.`
    );
    if (removedGardenerIds.length) {
      console.log(`Removed ${removedGardenerIds.length} obsolete gardener records.`);
    }
    console.log(`Updated registered gardener links on ${Object.keys(migratedPlots).length} plots.`);
  } finally {
    await signOut(auth);
    console.log(`Migration run completed as ${credential.user.email}`);
  }
};

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
