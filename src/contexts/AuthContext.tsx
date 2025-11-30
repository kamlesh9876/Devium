import React, { createContext, useContext, useEffect, useState } from 'react';
import { ref, set, onValue, onDisconnect, serverTimestamp } from 'firebase/database';
import { rtdb } from '../firebase';

interface User {
    uid: string;
    email: string;
    name: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    role: string | null;
    loading: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper function to get device info
    const getDeviceInfo = () => {
        const userAgent = navigator.userAgent;
        let deviceInfo = 'Unknown';
        
        if (userAgent.includes('Chrome')) deviceInfo = 'Chrome';
        else if (userAgent.includes('Firefox')) deviceInfo = 'Firefox';
        else if (userAgent.includes('Safari')) deviceInfo = 'Safari';
        else if (userAgent.includes('Edge')) deviceInfo = 'Edge';
        
        if (userAgent.includes('Windows')) deviceInfo += ' on Windows';
        else if (userAgent.includes('Mac')) deviceInfo += ' on macOS';
        else if (userAgent.includes('Linux')) deviceInfo += ' on Linux';
        else if (userAgent.includes('Android')) deviceInfo += ' on Android';
        else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceInfo += ' on iOS';
        
        return deviceInfo;
    };

    useEffect(() => {
        console.log('AuthProvider - Initializing...');
        
        // Check localStorage for session
        const storedUser = localStorage.getItem('devium_user');
        console.log('AuthProvider - Stored user found:', !!storedUser);

        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                console.log('AuthProvider - Parsed user data:', userData);
                setUser(userData);
                setRole(userData.role);
                setLoading(false); // Set loading to false immediately when user is found

                // Temporarily disable real-time updates to prevent database interference
                /*
                // Listen for real-time updates to user data
                const userRef = ref(rtdb, `users/${userData.uid}`);
                const unsubscribe = onValue(userRef, (snapshot) => {
                    console.log('AuthProvider - Realtime update received');
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        console.log('AuthProvider - Database data:', data);
                        const updatedUser = {
                            uid: userData.uid,
                            email: data.email || userData.email,
                            name: data.name || userData.name,
                            role: data.role || userData.role
                        };
                        console.log('AuthProvider - Updated user:', updatedUser);
                        setUser(updatedUser);
                        setRole(updatedUser.role);
                    } else {
                        console.log('AuthProvider - No database data found, keeping localStorage data');
                        // Keep the localStorage data if database doesn't have the user
                        setUser(userData);
                        setRole(userData.role);
                    }
                });

                return () => {
                    console.log('AuthProvider - Cleaning up listener');
                    unsubscribe();
                };
                */

                return () => {
                    console.log('AuthProvider - Cleanup completed');
                };
            } catch (error) {
                console.error('AuthProvider - Error parsing stored user data:', error);
                localStorage.removeItem('devium_user');
                setLoading(false); // Set loading to false on error too
            }
        } else {
            // No stored user, set loading to false immediately
            setLoading(false);
        }

        // Set loading to false after a short delay to prevent infinite loading
        const timer = setTimeout(() => {
            console.log('AuthProvider - Setting loading to false (timeout)');
            setLoading(false);
        }, 500); // Reduced timeout to 500ms

        return () => {
            console.log('AuthProvider - Cleaning up timer');
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        // Set up real-time presence tracking for authenticated user
        if (!user?.uid || !user?.email) {
            console.log('No valid user, skipping presence tracking');
            return;
        }

        console.log('Setting up presence tracking for user:', user.uid);

        // Create a reference to this user's session
        const sessionRef = ref(rtdb, `sessions/${user.uid}`);
        const userStatusRef = ref(rtdb, `users/${user.uid}/status`);
        const connectedRef = ref(rtdb, '.info/connected');
        
        const unsubscribe = onValue(connectedRef, (snapshot) => {
            if (!snapshot.val()) return;
            
            console.log('User is connected, setting up presence');
            
            // Set user as online when connected
            const sessionData = {
                uid: user.uid,
                email: user.email,
                name: user.name,
                role: user.role,
                status: 'online',
                device: getDeviceInfo(),
                lastSeen: serverTimestamp(),
                connectedAt: serverTimestamp(),
                userAgent: navigator.userAgent
            };
            
            // Set the session data
            set(sessionRef, sessionData);
            
            // Update user status to online
            set(userStatusRef, 'online');
            
            // Set up disconnect handler - when user disconnects, mark as offline
            onDisconnect(sessionRef).update({
                status: 'offline',
                lastSeen: serverTimestamp(),
                disconnectedAt: serverTimestamp()
            });
            
            onDisconnect(userStatusRef).set('offline');
        });

        return () => {
            console.log('Cleaning up presence tracking');
            unsubscribe();
            
            // When component unmounts, set user as offline
            if (user?.uid && user?.email) {
                set(sessionRef, {
                    status: 'offline',
                    lastSeen: serverTimestamp(),
                    disconnectedAt: serverTimestamp()
                });
                set(userStatusRef, 'offline');
            }
        };
    }, [user?.uid, user?.email]);

    const logout = async () => {
        try {
            // Update session and status to offline
            if (user?.uid) {
                const sessionRef = ref(rtdb, `sessions/${user.uid}`);
                const userStatusRef = ref(rtdb, `users/${user.uid}/status`);
                
                // Update session to offline
                await set(sessionRef, {
                    status: 'offline',
                    lastSeen: serverTimestamp(),
                    disconnectedAt: serverTimestamp()
                });
                
                // Update user status to offline
                await set(userStatusRef, 'offline');
            }
            
            // Clear local state
            setUser(null);
            setRole(null);
            
            // Clear localStorage
            localStorage.removeItem('devium_user');
            
            console.log('User logged out successfully');
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
