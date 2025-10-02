import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAu0IqFDOelbGha_oeR484DqQ9xrH3_wYc",
  authDomain: "grocerypricescomparer.firebaseapp.com",
  projectId: "grocerypricescomparer",
  storageBucket: "grocerypricescomparer.firebasestorage.app",
  messagingSenderId: "982759814445",
  appId: "1:982759814445:web:f979ca3b3ee842aa56cfa4",
  measurementId: "G-0EP9VVXWPN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore with default settings
export const db = getFirestore(app);

export const auth = getAuth(app);
export default app;
