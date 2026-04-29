/*
  Seed script for Firebase Realtime Database using the client SDK.
  WARNING: This script will write to the Firebase project configured via env vars.
  Only run after confirming you want to seed that project (e.g., a local dev project).

  Usage:
    export VITE_FIREBASE_ADMIN_EMAIL=admin@example.com
    export VITE_FIREBASE_ADMIN_PASSWORD=super-secret
    node scripts/seedFromJson.js
*/

import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getDatabase, ref as dbRef, set } from 'firebase/database';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf-8'));

const loadEnvFile = (path) => {
  if (!fs.existsSync(path)) {
    return;
  }

  const contents = fs.readFileSync(path, 'utf-8');
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return;
    }

    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) {
      process.env[key] = rest.join('=').replace(/^['"]|['"]$/g, '');
    }
  });
};

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

const requiredConfigKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (requiredConfigKeys.length) {
  throw new Error(`Missing Firebase config values: ${requiredConfigKeys.join(', ')}`);
}

if (!adminEmail || !adminPassword) {
  throw new Error('Set VITE_FIREBASE_ADMIN_EMAIL and VITE_FIREBASE_ADMIN_PASSWORD before seeding.');
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

const plotsJson = readJson('./firebase/seed-plots.json');
const cmsJson = fs.existsSync('./firebase/seed-cms.json')
  ? readJson('./firebase/seed-cms.json')
  : null;
const landmarksJson = fs.existsSync('./firebase/seed-landmarks.json')
  ? readJson('./firebase/seed-landmarks.json')
  : null;
const registrationsJson = fs.existsSync('./firebase/seed-registrations.json')
  ? readJson('./firebase/seed-registrations.json')
  : null;

const seed = async () => {
  const credential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

  try {
    const mergedPlots = { ...(plotsJson.plots || {}) };
    if (registrationsJson?.plots) {
      Object.entries(registrationsJson.plots).forEach(([plotId, update]) => {
        mergedPlots[plotId] = {
          ...(mergedPlots[plotId] || {}),
          ...update
        };
      });
    }

    if (Object.keys(mergedPlots).length) {
      await set(dbRef(database, 'plots'), mergedPlots);
      console.log('Plots seeded successfully');
    }

    if (cmsJson?.cms) {
      await set(dbRef(database, 'cms'), cmsJson.cms);
      console.log('CMS seeded successfully');
    }

    if (landmarksJson?.landmarks) {
      await set(dbRef(database, 'landmarks'), landmarksJson.landmarks);
      console.log('Landmarks seeded successfully');
    }

    if (registrationsJson?.gardeners) {
      await set(dbRef(database, 'gardeners'), registrationsJson.gardeners);
      console.log('Gardeners seeded successfully');
    }
  } finally {
    await signOut(auth);
    console.log(`Seed run completed as ${credential.user.email}`);
  }
};

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error seeding data:', err);
    process.exit(1);
  });
