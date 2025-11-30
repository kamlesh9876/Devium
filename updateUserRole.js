import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

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

// Update user role to admin
async function updateUserRole() {
    const userId = 'zIbIQaZBzrZ4ucizkm4IIoNWomZ2'; // The user ID from error message
    
    try {
        // Check current user data
        const userRef = ref(rtdb, `users/${userId}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('Current user data:', userData);
            
            // Update role to admin
            const updatedData = {
                ...userData,
                role: 'admin',
                status: 'active',
                updatedAt: new Date().toISOString()
            };
            
            await set(userRef, updatedData);
            console.log('✅ User role updated to admin successfully!');
            console.log(`📧 Email: ${userData.email}`);
            console.log(`👤 Name: ${userData.name}`);
            console.log(`🔑 Role: admin`);
        } else {
            console.log('❌ User not found in database');
            
            // Create user record if not exists
            const newUserData = {
                uid: userId,
                email: 'user@example.com', // Update with actual email
                name: 'Admin User',
                role: 'admin',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            
            await set(userRef, newUserData);
            console.log('✅ Created new admin user record');
        }
        
    } catch (error) {
        console.error('❌ Error updating user role:', error);
    }
}

updateUserRole();
