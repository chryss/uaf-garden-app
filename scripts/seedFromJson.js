/*
  Seed script for Firebase Realtime Database using client SDK.
  WARNING: This script will write to the Firebase project configured in src/services/firebaseConfig.js.
  Only run after confirming you want to seed that project (e.g., a local dev project).

  Usage: node scripts/seedFromJson.js
*/

import fs from 'fs';
import app, { database } from '../src/services/firebaseConfig.js';
import { ref as dbRef, set } from 'firebase/database';

const seedPath = './firebase/seed-plots.json';
const json = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

const seed = async () => {
  try {
    if (json.plots) {
      await set(dbRef(database, 'plots'), json.plots);
      console.log('Plots seeded successfully');
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  }
};

seed();
