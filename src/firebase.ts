import { initializeApp, getApps } from 'firebase/app';
import { Database, getDatabase } from 'firebase/database';

const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const databaseURL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

let db: Database | null = null;

if (apiKey && databaseURL) {
  const app =
    getApps().length === 0
      ? initializeApp({
          apiKey,
          authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
          databaseURL,
          projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
        })
      : getApps()[0];
  db = getDatabase(app);
}

export { db };
export const isFirebaseReady = Boolean(db);
