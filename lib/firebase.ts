// Import the functions you need from the SDKs you need
import { initializeApp,getApps, FirebaseApp,getApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push, remove, update,get } from 'firebase/database';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxx_LM7MrZsjSJbcQdPQLZLOZBhrXhR3c",
  authDomain: "raja-mantri-bd795.firebaseapp.com",
  projectId: "raja-mantri-bd795",
  storageBucket: "raja-mantri-bd795.firebasestorage.app",
  messagingSenderId: "876080727719",
  appId: "1:876080727719:web:a2477159e1f3b58af7fd82",
  measurementId: "G-ZBEZP7T0W6"
};

let app: FirebaseApp;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Get the existing app instead of the array
}
const database = getDatabase(app);
export { database, ref, set, onValue, push, remove, update ,get};