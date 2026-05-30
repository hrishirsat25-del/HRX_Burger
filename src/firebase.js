import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCABDeW6qY2OtGy9PkyLGnMTHeVNuMve5I",
  authDomain: "hrx-burger.firebaseapp.com",
  databaseURL: "https://hrx-burger-default-rtdb.firebaseio.com",
  projectId: "hrx-burger",
  storageBucket: "hrx-burger.firebasestorage.app",
  messagingSenderId: "746228625526",
  appId: "1:746228625526:web:9250cf1857135587d86f57"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
