import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  // Your Firebase configuration object here
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
const messaging = getMessaging(app);

// FCM 토큰 가져오기
export const getFCMToken = async () => {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'BPmu_8Iga0YqUh_MS7xmIfcTzsfj8Pj2BcV2wQ3EuyIXB636tfQBSlqn9oWTZ4Mo6lLClxXpK3wlq24owOsAtV8'
    });
    return token;
  } catch (error) {
    console.error('FCM 토큰 가져오기 실패:', error);
    return null;
  }
};

export { db, messaging };

export const ADMIN_EMAILS = ['emily.hur.juhee@gmail.com'];


