import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZIaJKDUVo-UlBe_6NbnGdbcvZ_iTPYxA",
  authDomain: "cotizaciones-cttc.firebaseapp.com",
  projectId: "cotizaciones-cttc",
  storageBucket: "cotizaciones-cttc.firebasestorage.app",
  messagingSenderId: "296617281122",
  appId: "1:296617281122:web:1e7a51ff5d838d85bf733b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);