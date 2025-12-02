import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { ref, onValue, push, serverTimestamp, update, get } from 'firebase/database';
import { rtdb } from '../firebase';

export interface ActivityEvent {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    type: 'page_view' | 'click' | 'scroll' | 'form_submit' | 'login' | 'logout' | 'error' | 'feature_used';
    page: string;
    element?: string;
    timestamp: string;
    sessionId: string;
    metadata?: {
        [key: string]: any;
    };
    duration?: number;
}

export interface UserBehaviorMetrics {
    userId: string;
    userName: string;
    totalSessions: number;
    totalDuration: number;
    avgSessionDuration: number;
    pageViews: number;
    mostVisitedPages: Array<{ page: string; visits: number }>;
    lastActive: string;
    currentSession: {
        startTime: string;
        duration: number;
        currentPage: string;
        isActive: boolean;
    };
    errorCount: number;
    featureUsage: Array<{ feature: string; usageCount: number }>;
}

export interface SystemAnalytics {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    totalPageViews: number;
    topPages: Array<{ page: string; views: number; avgTime: number }>;
    hourlyActivity: Array<{ hour: number; users: number; actions: number }>;
    errorRate: number;
    featureUsage: Array<{ feature: string; usage: number; users: number }>;
    deviceBreakdown: Array<{ device: string; users: number; percentage: number }>;
    locationBreakdown: Array<{ location: string; users: number; percentage: number }>;
}

interface ActivityAnalyticsContextType {
    activities: ActivityEvent[];
    userMetrics: UserBehaviorMetrics[];
    systemAnalytics: SystemAnalytics;
    loading: boolean;
    trackActivity: (event: Omit<ActivityEvent, 'id' | 'timestamp'>) => void;
    trackPageView: (page: string, metadata?: any) => void;
    trackClick: (element: string, page: string, metadata?: any) => void;
    trackError: (error: string, page: string, metadata?: any) => void;
    trackFeatureUsage: (feature: string, metadata?: any) => void;
    getUserMetrics: (userId: string) => Promise<UserBehaviorMetrics | null>;
    getSystemAnalytics: () => Promise<SystemAnalytics>;
}

const ActivityAnalyticsContext = createContext<ActivityAnalyticsContextType>({
    activities: [],
    userMetrics: [],
    systemAnalytics: {
        totalUsers: 0,
        activeUsers: 0,
        totalSessions: 0,
        avgSessionDuration: 0,
        totalPageViews: 0,
        topPages: [],
        hourlyActivity: [],
        errorRate: 0,
        featureUsage: [],
        deviceBreakdown: [],
        locationBreakdown: []
    },
    loading: true,
    trackActivity: () => {},
    trackPageView: () => {},
    trackClick: () => {},
    trackError: () => {},
    trackFeatureUsage: () => {},
    getUserMetrics: async () => null,
    getSystemAnalytics: async () => ({ totalUsers: 0, activeUsers: 0, totalSessions: 0, avgSessionDuration: 0, totalPageViews: 0, topPages: [], hourlyActivity: [], errorRate: 0, featureUsage: [], deviceBreakdown: [], locationBreakdown: [] })
});

export const useActivityAnalytics = () => useContext(ActivityAnalyticsContext);

export const ActivityAnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activities, setActivities] = useState<ActivityEvent[]>([]);
    const [userMetrics, setUserMetrics] = useState<UserBehaviorMetrics[]>([]);
    const [systemAnalytics, setSystemAnalytics] = useState<SystemAnalytics>({
        totalUsers: 0,
        activeUsers: 0,
        totalSessions: 0,
        avgSessionDuration: 0,
        totalPageViews: 0,
        topPages: [],
        hourlyActivity: [],
        errorRate: 0,
        featureUsage: [],
        deviceBreakdown: [],
        locationBreakdown: []
    });
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Get current user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('devium_user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setCurrentUserId(userData.uid);
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
    }, []);

    // Listen for real-time activity updates
    useEffect(() => {
        const activitiesRef = ref(rtdb, 'activities');
        const unsubscribe = onValue(activitiesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const activityList: ActivityEvent[] = [];
                
                Object.keys(data).forEach(userId => {
                    const userActivities = data[userId];
                    if (userActivities) {
                        Object.keys(userActivities).forEach(activityId => {
                            const activity = userActivities[activityId];
                            if (activity) {
                                activityList.push({
                                    id: activityId,
                                    ...activity
                                });
                            }
                        });
                    }
                });
                
                // Sort by timestamp (most recent first)
                activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setActivities(activityList.slice(0, 1000)); // Keep last 1000 activities
            }
        });

        return () => unsubscribe();
    }, []);

    // Listen for user metrics updates
    useEffect(() => {
        const metricsRef = ref(rtdb, 'userMetrics');
        const unsubscribe = onValue(metricsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const metricsList: UserBehaviorMetrics[] = Object.entries(data).map(([userId, metrics]: [string, any]) => ({
                    userId,
                    ...metrics
                }));
                setUserMetrics(metricsList);
            }
        });

        return () => unsubscribe();
    }, []);

    // Listen for system analytics updates
    useEffect(() => {
        const analyticsRef = ref(rtdb, 'systemAnalytics');
        const unsubscribe = onValue(analyticsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setSystemAnalytics(data);
            }
        });

        return () => unsubscribe();
    }, []);

    // Track activity
    const trackActivity = useCallback((event: Omit<ActivityEvent, 'id' | 'timestamp'>) => {
        if (!currentUserId) return;

        const activityRef = ref(rtdb, `activities/${currentUserId}`);
        const newActivity = {
            ...event,
            timestamp: serverTimestamp()
        };

        push(activityRef, newActivity);

        // Update user metrics
        updateUserMetrics(event.userId, event.type);
        updateSystemAnalytics(event.type);
    }, [currentUserId]);

    // Track page view
    const trackPageView = useCallback((page: string, metadata?: any) => {
        const storedUser = localStorage.getItem('devium_user');
        if (!storedUser) return;

        const userData = JSON.parse(storedUser);
        trackActivity({
            userId: userData.uid,
            userName: userData.name,
            userEmail: userData.email,
            type: 'page_view',
            page,
            sessionId: getCurrentSessionId(),
            metadata
        });
    }, [trackActivity]);

    // Track click
    const trackClick = (element: string, page: string, metadata?: any) => {
        const storedUser = localStorage.getItem('devium_user');
        if (!storedUser) return;

        const userData = JSON.parse(storedUser);
        trackActivity({
            userId: userData.uid,
            userName: userData.name,
            userEmail: userData.email,
            type: 'click',
            page,
            element,
            sessionId: getCurrentSessionId(),
            metadata
        });
    };

    // Track error
    const trackError = (error: string, page: string, metadata?: any) => {
        const storedUser = localStorage.getItem('devium_user');
        if (!storedUser) return;

        const userData = JSON.parse(storedUser);
        trackActivity({
            userId: userData.uid,
            userName: userData.name,
            userEmail: userData.email,
            type: 'error',
            page,
            sessionId: getCurrentSessionId(),
            metadata: { error, ...metadata }
        });
    };

    // Track feature usage
    const trackFeatureUsage = (feature: string, metadata?: any) => {
        const storedUser = localStorage.getItem('devium_user');
        if (!storedUser) return;

        const userData = JSON.parse(storedUser);
        trackActivity({
            userId: userData.uid,
            userName: userData.name,
            userEmail: userData.email,
            type: 'feature_used',
            page: window.location.pathname,
            sessionId: getCurrentSessionId(),
            metadata: { feature, ...metadata }
        });
    };

    // Helper functions
    const getCurrentSessionId = (): string => {
        return localStorage.getItem('currentSessionId') || 'unknown';
    };

    const updateUserMetrics = async (userId: string, activityType: string) => {
        const metricsRef = ref(rtdb, `userMetrics/${userId}`);
        const snapshot = await get(metricsRef);
        const existingMetrics = snapshot.val() || {
            totalSessions: 0,
            totalDuration: 0,
            avgSessionDuration: 0,
            pageViews: 0,
            mostVisitedPages: [],
            lastActive: new Date().toISOString(),
            currentSession: {
                startTime: new Date().toISOString(),
                duration: 0,
                currentPage: window.location.pathname,
                isActive: true
            },
            errorCount: 0,
            featureUsage: []
        };

        const updatedMetrics = { ...existingMetrics };

        // Update based on activity type
        switch (activityType) {
            case 'page_view':
                updatedMetrics.pageViews++;
                updatedMetrics.lastActive = new Date().toISOString();
                break;
            case 'error':
                updatedMetrics.errorCount++;
                break;
        }

        update(metricsRef, updatedMetrics);
    };

    const updateSystemAnalytics = async (activityType: string) => {
        const analyticsRef = ref(rtdb, 'systemAnalytics');
        const snapshot = await get(analyticsRef);
        const existingAnalytics = snapshot.val() || {
            totalUsers: 0,
            activeUsers: 0,
            totalSessions: 0,
            avgSessionDuration: 0,
            totalPageViews: 0,
            topPages: [],
            hourlyActivity: [],
            errorRate: 0,
            featureUsage: [],
            deviceBreakdown: [],
            locationBreakdown: []
        };

        const updatedAnalytics = { ...existingAnalytics };

        // Update based on activity type
        switch (activityType) {
            case 'page_view':
                updatedAnalytics.totalPageViews++;
                break;
            case 'error':
                updatedAnalytics.errorRate = (updatedAnalytics.errorRate || 0) + 0.01;
                break;
        }

        update(analyticsRef, updatedAnalytics);
    };

    const getUserMetrics = async (userId: string): Promise<UserBehaviorMetrics | null> => {
        const metricsRef = ref(rtdb, `userMetrics/${userId}`);
        const snapshot = await get(metricsRef);
        return snapshot.val() || null;
    };

    const getSystemAnalytics = async (): Promise<SystemAnalytics> => {
        const analyticsRef = ref(rtdb, 'systemAnalytics');
        const snapshot = await get(analyticsRef);
        return snapshot.val() || {
            totalUsers: 0,
            activeUsers: 0,
            totalSessions: 0,
            avgSessionDuration: 0,
            totalPageViews: 0,
            topPages: [],
            hourlyActivity: [],
            errorRate: 0,
            featureUsage: [],
            deviceBreakdown: [],
            locationBreakdown: []
        };
    };

    // Auto-track page views
    useEffect(() => {
        const handlePageView = () => {
            trackPageView(window.location.pathname, {
                referrer: document.referrer,
                userAgent: navigator.userAgent
            });
        };

        // Track initial page view
        handlePageView();

        // Track route changes (for SPA)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            setTimeout(handlePageView, 0);
        };

        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            setTimeout(handlePageView, 0);
        };

        window.addEventListener('popstate', handlePageView);

        return () => {
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
            window.removeEventListener('popstate', handlePageView);
        };
    }, [currentUserId]);

    // Set loading to false after initial setup
    useEffect(() => {
        setLoading(false);
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        activities,
        userMetrics,
        systemAnalytics,
        loading,
        trackActivity,
        trackPageView,
        trackClick,
        trackError,
        trackFeatureUsage,
        getUserMetrics,
        getSystemAnalytics
    }), [activities, userMetrics, systemAnalytics, loading, trackActivity, trackPageView, trackClick, trackError, trackFeatureUsage, getUserMetrics, getSystemAnalytics]);

    return (
        <ActivityAnalyticsContext.Provider value={value}>
            {children}
        </ActivityAnalyticsContext.Provider>
    );
};
