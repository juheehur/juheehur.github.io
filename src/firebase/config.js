import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDoMVSna-K4tc-bE1UZF91rgwja24sCJOk",
  authDomain: "juheehur-portfolio.firebaseapp.com",
  projectId: "juheehur-portfolio",
  storageBucket: "juheehur-portfolio.firebasestorage.app",
  messagingSenderId: "283350073670",
  appId: "1:283350073670:web:109c9dde3c11dc1b992547",
  measurementId: "G-07GQ6N033Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export const ADMIN_EMAILS = ['emily.hur.juhee@gmail.com'];


