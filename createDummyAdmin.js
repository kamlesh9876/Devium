import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

// Your Firebase config
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

// Create dummy admin user
async function createDummyAdmin() {
    try {
        const adminUser = {
            uid: 'admin123',
            email: 'admin@devium.com',
            name: 'Admin User',
            password: 'admin123',
            role: 'admin',
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };

        await set(ref(rtdb, 'users/admin123'), adminUser);
        
        console.log('✅ Dummy admin user created successfully!');
        console.log('📧 Email: admin@devium.com');
        console.log('🔑 Password: admin123');
        console.log('👤 Role: admin');
        console.log('🆔 UID: admin123');
        
    } catch (error) {
        console.error('❌ Error creating dummy admin:', error);
    }
}

createDummyAdmin();
