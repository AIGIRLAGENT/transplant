import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const requireEnv = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: requireEnv('VITE_FIREBASE_API_KEY'),
  authDomain: requireEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('VITE_FIREBASE_PROJECT_ID'),
  // Keep this for completeness; we'll pass the gs:// bucket explicitly to getStorage below.
  storageBucket: requireEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('VITE_FIREBASE_APP_ID'),
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize App Check BEFORE other services so tokens are attached to requests
try {
  const siteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY as string | undefined;
  const appCheckDebug = import.meta.env.VITE_APPCHECK_DEBUG === 'true';

  if (import.meta.env.DEV && appCheckDebug) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  if (siteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    if (import.meta.env.DEV) {
      console.info('[Firebase] App Check initialized (reCAPTCHA v3)');
    }
  } else if (import.meta.env.DEV) {
    console.warn('[Firebase] App Check not initialized: missing VITE_RECAPTCHA_V3_SITE_KEY');
  }
} catch (e) {
  console.warn('[Firebase] App Check init failed:', e);
}

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
// Explicitly target the bucket displayed in Firebase Console to avoid domain ambiguity
const resolvedBucket = requireEnv('VITE_FIREBASE_STORAGE_BUCKET').replace(/^gs:\/\//, '');
export const storage = getStorage(app, `gs://${resolvedBucket}`);
export const functions = getFunctions(app);

// Connect to emulators in development
const USE_EMULATORS = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';

if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('🔥 Firebase Emulators Connected');
}

// Initialize Analytics only in production
if (import.meta.env.PROD) {
  isSupported().then(supported => {
    if (supported) {
      getAnalytics(app);
    }
  });
}

// Helpful: log the resolved bucket in development to confirm configuration
if (import.meta.env.DEV) {
  console.info(`[Firebase] Storage bucket resolved to: gs://${resolvedBucket}`);
}
