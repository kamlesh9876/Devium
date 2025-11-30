import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

// Your Firebase config (from .env file)
const firebaseConfig = {
    apiKey: 'AIzaSyCp1CCrgCpyTsCaELhU6y8cyTkVgFP4_fc',
    authDomain: 'devium-4d44c.firebaseapp.com',
    projectId: 'devium-4d44c',
    storageBucket: 'devium-4d44c.firebasestorage.app',
    messagingSenderId: '47305189323',
    appId: '1:47305189323:web:a2c9e128c70486aabe384e',
    measurementId: 'G-LDXSYDKT2X',
    databaseURL: 'https://devium-4d44c-default-rtdb.firebaseio.com'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

// Your user ID from the error message
const userId = '-Of-zGAp8Jyz6H3q4T9u';

// Add admin role to your user
async function addUserRole() {
  try {
    await set(ref(rtdb, `users/${userId}/role`), 'admin');
    console.log('Successfully added admin role to user:', userId);
    
    // Also set basic user info if not present
    await set(ref(rtdb, `users/${userId}`), {
      uid: userId,
      email: 'admin@devium.com', // You can update this
      name: 'Admin User', // You can update this
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });
    
    console.log('User record updated successfully');
  } catch (error) {
    console.error('Error adding user role:', error);
  }
}

addUserRole();
