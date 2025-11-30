import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue } from 'firebase/database';

// Firebase config
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

// Generate realistic system metrics
function generateSystemMetrics() {
    return {
        cpu: Math.random() * 30 + 20, // 20-50%
        memory: Math.random() * 40 + 40, // 40-80%
        storage: Math.random() * 20 + 60, // 60-80%
        database: Math.random() * 10 + 5, // 5-15%
        api: Math.random() * 200 + 100, // 100-300ms
        uptime: Date.now() - (Math.random() * 86400000), // Up to 24h
        activeUsers: Math.floor(Math.random() * 50) + 10,
        errorRate: Math.random() * 2 // 0-2%
    };
}

// Determine health status based on metrics
function determineHealthStatus(metrics) {
    let status = 'healthy';
    let message = 'All systems operational';
    
    if (metrics.cpu > 80 || metrics.memory > 90 || metrics.errorRate > 5) {
        status = 'critical';
        message = 'System performance degraded';
    } else if (metrics.cpu > 60 || metrics.memory > 75 || metrics.errorRate > 2) {
        status = 'warning';
        message = 'System under heavy load';
    }
    
    return {
        status,
        message,
        timestamp: new Date().toISOString()
    };
}

// Start real-time system health monitoring
function startSystemHealthMonitoring() {
    console.log('🚀 Starting real-time system health monitoring...');
    
    // Update system health data every 3 seconds
    const interval = setInterval(async () => {
        const metrics = generateSystemMetrics();
        const healthStatus = determineHealthStatus(metrics);
        
        const systemHealthData = {
            metrics,
            healthStatus,
            lastUpdated: new Date().toISOString()
        };
        
        try {
            const systemHealthRef = ref(rtdb, 'systemHealth');
            await set(systemHealthRef, systemHealthData);
            console.log(`✅ System health updated: ${healthStatus.status} (CPU: ${metrics.cpu.toFixed(1)}%, Memory: ${metrics.memory.toFixed(1)}%)`);
        } catch (error) {
            console.error('❌ Error updating system health:', error);
        }
    }, 3000); // Update every 3 seconds
    
    // Also listen for changes to verify data is being written
    const systemHealthRef = ref(rtdb, 'systemHealth');
    const unsubscribe = onValue(systemHealthRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log(`📊 Current system status: ${data.healthStatus?.status || 'unknown'}`);
        }
    });
    
    console.log('✅ System health monitoring started successfully!');
    console.log('📍 Data stored at: /systemHealth in Firebase Realtime Database');
    console.log('⏱️  Updates every 3 seconds');
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping system health monitoring...');
        clearInterval(interval);
        unsubscribe();
        process.exit(0);
    });
}

// Initialize with some data and start monitoring
async function initializeSystemHealth() {
    try {
        // Set initial data
        const initialMetrics = generateSystemMetrics();
        const initialHealthStatus = determineHealthStatus(initialMetrics);
        
        const initialData = {
            metrics: initialMetrics,
            healthStatus: initialHealthStatus,
            lastUpdated: new Date().toISOString()
        };
        
        const systemHealthRef = ref(rtdb, 'systemHealth');
        await set(systemHealthRef, initialData);
        
        console.log('✅ Initial system health data set');
        
        // Start real-time monitoring
        startSystemHealthMonitoring();
        
    } catch (error) {
        console.error('❌ Error initializing system health:', error);
    }
}

initializeSystemHealth();
