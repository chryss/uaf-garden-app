import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAMSsOkF8nPWXfAyWHADEnCB4y047_Pdec",
  authDomain: "uaf-garden.firebaseapp.com",
  databaseURL: "https://uaf-garden.firebaseio.com",
  projectId: "uaf-garden",
  storageBucket: "uaf-garden.firebasestorage.app",
  messagingSenderId: "656376107336",
  appId: "1:656376107336:web:043031229c2a73d608a37d",
  measurementId: "G-1C8TN2CXEN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

export default app;
