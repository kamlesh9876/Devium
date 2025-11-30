import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

// Firebase config (same as your app)
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

// Test Firebase connection and check data
async function testFirebaseConnection() {
    try {
        console.log('🔍 Testing Firebase connection...');
        
        // Test basic connection
        const membersRef = ref(rtdb, 'members');
        const snapshot = await get(membersRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            console.log('✅ Firebase connection successful!');
            console.log('📊 Data found at /members:', data);
            console.log('🔢 Number of members:', Object.keys(data).length);
            
            // Show each member
            Object.entries(data).forEach(([key, member]) => {
                console.log(`   - ${key}: ${member.name} (${member.role})`);
            });
        } else {
            console.log('❌ No data found at /members');
            console.log('📍 Database URL:', firebaseConfig.databaseURL);
            
            // Check if we can read from the root
            const rootRef = ref(rtdb, '/');
            const rootSnapshot = await get(rootRef);
            if (rootSnapshot.exists()) {
                console.log('📁 Root data available:', Object.keys(rootSnapshot.val()));
            } else {
                console.log('❌ No access to database root');
            }
        }
        
    } catch (error) {
        console.error('❌ Firebase connection error:', error);
        console.error('Error details:', error.message);
    }
}

testFirebaseConnection();
