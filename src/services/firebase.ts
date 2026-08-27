import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let appInstance;
if (!getApps().length) {
  appInstance = initializeApp(firebaseConfig);
} else {
  appInstance = getApp();
}

// Initialize Firestore with specific databaseId if provided
export const db: Firestore = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(appInstance, firebaseConfig.firestoreDatabaseId)
  : getFirestore(appInstance);

export { appInstance };
