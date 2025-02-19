import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDoMVSna-K4tc-bE1UZF91rgwja24sCJOk",
  authDomain: "juheehur-portfolio.firebaseapp.com",
  projectId: "juheehur-portfolio",
  storageBucket: "juheehur-portfolio.firebasestorage.app",
  messagingSenderId: "283350073670",
  appId: "1:283350073670:web:109c9dde3c11dc1b992547",
  measurementId: "G-07GQ6N033Y"
};

// Tech Questions Firebase configuration
const techQuestionsConfig = {
  apiKey: "AIzaSyAe3gIG7tgvp8sJ7jBQbAsyW3a4cVLugZI",
  authDomain: "tech-questions-366c0.firebaseapp.com",
  projectId: "tech-questions-366c0",
  storageBucket: "tech-questions-366c0.firebasestorage.app",
  messagingSenderId: "933588168614",
  appId: "1:933588168614:web:9685df5f4c236096c9e967",
  measurementId: "G-MZR78EEGES"
};

// Initialize Firebase apps
const app = initializeApp(firebaseConfig);
const techQuestionsApp = initializeApp(techQuestionsConfig, 'techQuestions');

// Get services for main app
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Get services for tech questions app
export const techQuestionsDb = getFirestore(techQuestionsApp);
export const techQuestionsAuth = getAuth(techQuestionsApp);
export const techQuestionsAnalytics = getAnalytics(techQuestionsApp);

// Tech Interview Database Collections
export const COLLECTIONS = {
  CATEGORIES: 'categories',
  QUESTIONS: 'questions',
  ANSWERS: 'answers',
  TAGS: 'tags',
  QUESTION_TAGS: 'question_tags'
};

// Predefined categories
export const PREDEFINED_CATEGORIES = [
  {
    id: 'machine-learning',
    name: 'Machine Learning',
    description: 'Machine Learning and AI related questions'
  },
  {
    id: 'cs-basics',
    name: 'CS Basics',
    description: 'Computer Science fundamentals including algorithms and data structures'
  },
  {
    id: 'frontend',
    name: 'Frontend',
    description: 'Frontend development including HTML, CSS, JavaScript, and modern frameworks'
  },
  {
    id: 'backend',
    name: 'Backend',
    description: 'Backend development including server-side programming and databases'
  }
];

// Difficulty levels
export const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

// Question types
export const QUESTION_TYPES = ['Theoretical', 'Practical', 'Coding'];

export const ADMIN_EMAILS = ['emily.hur.juhee@gmail.com'];

export default app;


