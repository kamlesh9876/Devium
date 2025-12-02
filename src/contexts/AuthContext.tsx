import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { ref, set, onValue, onDisconnect, serverTimestamp, push, update } from 'firebase/database';
import { rtdb } from '../firebase';
import { useNotifications } from './NotificationContext';

// Generate unique session ID
const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

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
    const { addNotification, sendSystemNotification } = useNotifications();

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
        
        // Function to check and update user from localStorage
        const checkAndUpdateUser = () => {
            const storedUser = localStorage.getItem('devium_user');
            console.log('AuthProvider - Checking stored user:', !!storedUser);

            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    console.log('AuthProvider - Parsed user data:', userData);
                    setUser(userData);
                    setRole(userData.role);
                    setLoading(false);
                } catch (error) {
                    console.error('AuthProvider - Error parsing stored user data:', error);
                    localStorage.removeItem('devium_user');
                    setUser(null);
                    setRole(null);
                    setLoading(false);
                }
            } else {
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        };

        // Initial check
        checkAndUpdateUser();

        // Listen for storage events (when user logs in from another tab or window)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'devium_user') {
                console.log('AuthProvider - Storage change detected');
                checkAndUpdateUser();
            }
        };

        // Also listen for custom storage events (same tab updates)
        const handleCustomStorageChange = () => {
            console.log('AuthProvider - Custom storage change detected');
            checkAndUpdateUser();
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('devium_user_updated', handleCustomStorageChange);

        // Set loading to false after a short delay to prevent infinite loading
        const timer = setTimeout(() => {
            console.log('AuthProvider - Setting loading to false (timeout)');
            setLoading(false);
        }, 500);

        return () => {
            console.log('AuthProvider - Cleaning up');
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('devium_user_updated', handleCustomStorageChange);
            clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        // Enhanced real-time presence tracking
        if (!user?.uid || !user?.email) {
            console.log('No valid user, skipping presence tracking');
            return;
        }

        console.log('Setting up ENHANCED presence tracking for user:', user.uid);

        // Create references
        const sessionRef = ref(rtdb, `sessions/${user.uid}`);
        const userStatusRef = ref(rtdb, `users/${user.uid}/status`);
        const activityRef = ref(rtdb, `activities/${user.uid}`);
        
        // Enhanced device and browser information
        const getDeviceInfo = () => {
            const ua = navigator.userAgent;
            const platform = navigator.platform;
            const language = navigator.language;
            
            let browser = 'Unknown';
            let os = 'Unknown';
            
            if (ua.includes('Chrome')) browser = 'Chrome';
            else if (ua.includes('Firefox')) browser = 'Firefox';
            else if (ua.includes('Safari')) browser = 'Safari';
            else if (ua.includes('Edge')) browser = 'Edge';
            
            if (platform.includes('Win')) os = 'Windows';
            else if (platform.includes('Mac')) os = 'macOS';
            else if (platform.includes('Linux')) os = 'Linux';
            else if (platform.includes('iPhone')) os = 'iOS';
            else if (platform.includes('Android')) os = 'Android';
            
            return {
                browser,
                os,
                platform,
                language,
                screenResolution: `${screen.width}x${screen.height}`,
                colorDepth: screen.colorDepth,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                userAgent: ua
            };
        };

        // Get user location (approximate)
        const getUserLocation = () => {
            return {
                ip: 'Unknown', // Would need backend API for this
                country: 'Unknown',
                city: 'Unknown',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            };
        };

        // Enhanced session data
        const sessionData = {
            uid: user.uid,
            email: user.email,
            name: user.name,
            role: user.role,
            status: 'online',
            lastSeen: serverTimestamp(),
            connectedAt: serverTimestamp(),
            device: getDeviceInfo(),
            location: getUserLocation(),
            currentActivity: 'active',
            currentPage: window.location.pathname,
            sessionId: generateSessionId(),
            lastHeartbeat: serverTimestamp()
        };
        
        console.log('Setting user ONLINE with enhanced data:', sessionData);
        
        // Use set() to completely replace the session with all required fields
        set(sessionRef, sessionData);
        set(userStatusRef, 'online');

        // Send notification that user is online
        // Note: Commented out to prevent circular dependency with NotificationProvider
        // sendSystemNotification(
        //     `${user.name} is now online`,
        //     `${user.email} joined from ${sessionData.device.browser} on ${sessionData.device.os}`,
        //     'user_online'
        // );

        // Track page changes
        const trackPageChange = () => {
            if (user?.uid) {
                const activityData = {
                    type: 'page_view',
                    page: window.location.pathname,
                    timestamp: serverTimestamp(),
                    sessionId: sessionData.sessionId
                };
                
                push(activityRef, activityData);
                update(sessionRef, {
                    currentPage: window.location.pathname,
                    lastSeen: serverTimestamp(),
                    currentActivity: 'browsing'
                });
            }
        };

        // Enhanced heartbeat every 30 seconds with activity detection
        const heartbeat = setInterval(() => {
            if (user?.uid) {
                console.log('Enhanced heartbeat - keeping user online');
                
                // Detect user activity
                const isActive = document.visibilityState === 'visible';
                const activityType = isActive ? 'active' : 'away';
                
                // Update both lastSeen and ensure status stays online
                update(sessionRef, {
                    status: 'online',
                    lastSeen: serverTimestamp(),
                    lastHeartbeat: serverTimestamp(),
                    currentActivity: activityType,
                    isActive: isActive
                });
                set(userStatusRef, 'online');
                
                // Log activity
                if (isActive) {
                    const activityData = {
                        type: 'heartbeat',
                        timestamp: serverTimestamp(),
                        sessionId: sessionData.sessionId,
                        activity: activityType
                    };
                    push(activityRef, activityData);
                }
            }
        }, 30000);

        // Track visibility changes
        const handleVisibilityChange = () => {
            if (user?.uid) {
                const isActive = document.visibilityState === 'visible';
                update(sessionRef, {
                    isActive: isActive,
                    currentActivity: isActive ? 'active' : 'away',
                    lastSeen: serverTimestamp()
                });
            }
        };

        // Track mouse movement for activity detection
        let activityTimeout: NodeJS.Timeout;
        const handleUserActivity = () => {
            if (user?.uid) {
                clearTimeout(activityTimeout);
                update(sessionRef, {
                    currentActivity: 'active',
                    lastSeen: serverTimestamp()
                });
                
                // Set user as away after 5 minutes of inactivity
                activityTimeout = setTimeout(() => {
                    if (user?.uid) {
                        update(sessionRef, {
                            currentActivity: 'away',
                            lastSeen: serverTimestamp()
                        });
                    }
                }, 300000); // 5 minutes
            }
        };

        // Add event listeners
        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('mousemove', handleUserActivity);
        window.addEventListener('keypress', handleUserActivity);
        window.addEventListener('click', handleUserActivity);
        window.addEventListener('scroll', handleUserActivity);

        // Cleanup on logout or component unmount
        const cleanup = () => {
            console.log('Cleaning up - setting user OFFLINE');
            clearInterval(heartbeat);
            clearTimeout(activityTimeout);
            
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('mousemove', handleUserActivity);
            window.removeEventListener('keypress', handleUserActivity);
            window.removeEventListener('click', handleUserActivity);
            window.removeEventListener('scroll', handleUserActivity);
            
            if (user?.uid) {
                const disconnectData = {
                    status: 'offline',
                    lastSeen: serverTimestamp(),
                    disconnectedAt: serverTimestamp(),
                    currentActivity: 'offline',
                    isActive: false
                };
                update(sessionRef, disconnectData);
                set(userStatusRef, 'offline');
                
                // Send notification that user is offline
                // Note: Commented out to prevent circular dependency with NotificationProvider
                // sendSystemNotification(
                //     `${user.name} is now offline`,
                //     `${user.email} has disconnected`,
                //     'user_offline'
                // );
                
                // Log disconnection
                const activityData = {
                    type: 'disconnect',
                    timestamp: serverTimestamp(),
                    sessionId: sessionData.sessionId
                };
                push(activityRef, activityData);
            }
        };

        // Handle page unload
        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
            cleanup();
        };
    }, [user?.uid]); // Only depend on user ID, not the entire user object

    const logout = useCallback(async () => {
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
    }, [user?.uid]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        user,
        role,
        loading,
        logout
    }), [user, role, loading, logout]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
