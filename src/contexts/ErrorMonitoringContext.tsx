import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ref, onValue, push, serverTimestamp, update, get, remove } from 'firebase/database';
import { rtdb } from '../firebase';
import { useNotifications } from './NotificationContext';

export interface ErrorEvent {
    id: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    type: 'javascript' | 'network' | 'firebase' | 'auth' | 'performance' | 'security';
    message: string;
    stack?: string;
    source: {
        file: string;
        line: number;
        column: number;
    };
    userAgent: string;
        url: string;
    userId?: string;
    sessionId?: string;
    metadata?: {
        [key: string]: any;
    };
    resolved: boolean;
    resolvedAt?: string;
    resolvedBy?: string;
}

export interface SystemHealth {
    status: 'healthy' | 'warning' | 'critical';
    checks: {
        firebase: { status: 'ok' | 'error'; latency: number; lastCheck: string };
        performance: { status: 'ok' | 'warning' | 'error'; loadTime: number; lastCheck: string };
        memory: { status: 'ok' | 'warning' | 'error'; usage: number; lastCheck: string };
        errors: { status: 'ok' | 'warning' | 'error'; count: number; lastCheck: string };
        users: { status: 'ok' | 'warning' | 'error'; activeCount: number; lastCheck: string };
    };
    overallScore: number;
    lastUpdated: string;
}

export interface PerformanceMetric {
    id: string;
    timestamp: string;
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'percentage' | 'count';
    type: 'navigation' | 'resource' | 'paint' | 'interaction';
    metadata?: {
        [key: string]: any;
    };
}

interface ErrorMonitoringContextType {
    errors: ErrorEvent[];
    systemHealth: SystemHealth;
    performanceMetrics: PerformanceMetric[];
    loading: boolean;
    trackError: (error: Error | string, level?: ErrorEvent['level'], type?: ErrorEvent['type']) => void;
    trackPerformance: (name: string, value: number, unit: PerformanceMetric['unit'], type: PerformanceMetric['type']) => void;
    resolveError: (errorId: string) => void;
    getErrorStats: () => Promise<{ total: number; byLevel: { [key: string]: number }; byType: { [key: string]: number } }>;
    runHealthCheck: () => Promise<void>;
    clearErrors: () => void;
}

const ErrorMonitoringContext = createContext<ErrorMonitoringContextType>({
    errors: [],
    systemHealth: {
        status: 'healthy',
        checks: {
            firebase: { status: 'ok', latency: 0, lastCheck: '' },
            performance: { status: 'ok', loadTime: 0, lastCheck: '' },
            memory: { status: 'ok', usage: 0, lastCheck: '' },
            errors: { status: 'ok', count: 0, lastCheck: '' },
            users: { status: 'ok', activeCount: 0, lastCheck: '' }
        },
        overallScore: 100,
        lastUpdated: ''
    },
    performanceMetrics: [],
    loading: true,
    trackError: () => {},
    trackPerformance: () => {},
    resolveError: () => {},
    getErrorStats: async () => ({ total: 0, byLevel: {}, byType: {} }),
    runHealthCheck: async () => {},
    clearErrors: () => {}
});

export const useErrorMonitoring = () => useContext(ErrorMonitoringContext);

export const ErrorMonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [errors, setErrors] = useState<ErrorEvent[]>([]);
    const [systemHealth, setSystemHealth] = useState<SystemHealth>({
        status: 'healthy',
        checks: {
            firebase: { status: 'ok', latency: 0, lastCheck: '' },
            performance: { status: 'ok', loadTime: 0, lastCheck: '' },
            memory: { status: 'ok', usage: 0, lastCheck: '' },
            errors: { status: 'ok', count: 0, lastCheck: '' },
            users: { status: 'ok', activeCount: 0, lastCheck: '' }
        },
        overallScore: 100,
        lastUpdated: ''
    });
    const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const { addNotification, sendSystemNotification } = useNotifications();

    // Get current user
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

    // Listen for real-time error updates
    useEffect(() => {
        const errorsRef = ref(rtdb, 'errors');
        const unsubscribe = onValue(errorsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const errorList: ErrorEvent[] = Object.entries(data).map(([id, error]: [string, any]) => ({
                    id,
                    ...error
                })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                setErrors(errorList.slice(0, 100)); // Keep last 100 errors
                
                // Check for critical errors
                const criticalErrors = errorList.filter(e => e.level === 'critical' && !e.resolved);
                if (criticalErrors.length > 0) {
                    sendSystemNotification(
                        'Critical Error Detected',
                        `${criticalErrors.length} critical error(s) require immediate attention`,
                        'error'
                    );
                }
            }
        });

        return () => unsubscribe();
    }, []);

    // Listen for system health updates
    useEffect(() => {
        const healthRef = ref(rtdb, 'systemHealth');
        const unsubscribe = onValue(healthRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setSystemHealth(data);
                
                // Send notification for health status changes
                if (data.status === 'critical') {
                    sendSystemNotification(
                        'System Health Critical',
                        'Multiple system components are experiencing issues',
                        'error'
                    );
                } else if (data.status === 'warning') {
                    sendSystemNotification(
                        'System Health Warning',
                        'Some system components need attention',
                        'warning'
                    );
                }
            }
        });

        return () => unsubscribe();
    }, []);

    // Listen for performance metrics
    useEffect(() => {
        const metricsRef = ref(rtdb, 'performanceMetrics');
        const unsubscribe = onValue(metricsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const metricsList: PerformanceMetric[] = Object.entries(data).map(([id, metric]: [string, any]) => ({
                    id,
                    ...metric
                })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                setPerformanceMetrics(metricsList.slice(0, 200)); // Keep last 200 metrics
            }
        });

        return () => unsubscribe();
    }, []);

    // Global error handler
    useEffect(() => {
        const handleError = (event: any) => {
            trackError(event.error || event.message, 'error', 'javascript');
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            trackError(event.reason, 'error', 'javascript');
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    // Track error
    const trackError = (error: Error | string, level: ErrorEvent['level'] = 'error', type: ErrorEvent['type'] = 'javascript') => {
        const errorMessage = error instanceof Error ? error.message : error;
        const stack = error instanceof Error ? error.stack : undefined;

        const errorEvent: Omit<ErrorEvent, 'id' | 'timestamp'> = {
            level,
            type,
            message: errorMessage,
            stack,
            source: {
                file: window.location.href,
                line: 0,
                column: 0
            },
            userAgent: navigator.userAgent,
            url: window.location.href,
            userId: currentUserId || undefined,
            sessionId: localStorage.getItem('currentSessionId') || undefined,
            resolved: false,
            metadata: {
                timestamp: new Date().toISOString(),
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                online: navigator.onLine
            }
        };

        // Convert undefined to null for Firebase compatibility
        const firebaseData = {
            ...errorEvent,
            userId: errorEvent.userId || null,
            sessionId: errorEvent.sessionId || null
        };

        const errorsRef = ref(rtdb, 'errors');
        push(errorsRef, {
            ...firebaseData,
            timestamp: serverTimestamp()
        });

        // Update system health
        updateSystemHealth('errors', level === 'critical' ? 'error' : level === 'error' ? 'error' : 'warning');
    };

    // Track performance
    const trackPerformance = (name: string, value: number, unit: PerformanceMetric['unit'], type: PerformanceMetric['type']) => {
        const metric: Omit<PerformanceMetric, 'id' | 'timestamp'> = {
            name,
            value,
            unit,
            type,
            metadata: {
                userId: currentUserId || undefined,
                sessionId: localStorage.getItem('currentSessionId') || undefined,
                url: window.location.href
            }
        };

        // Convert undefined to null for Firebase compatibility
        const firebaseMetric = {
            ...metric,
            metadata: metric.metadata ? {
                ...metric.metadata,
                userId: metric.metadata.userId || null,
                sessionId: metric.metadata.sessionId || null
            } : null
        };

        const metricsRef = ref(rtdb, 'performanceMetrics');
        push(metricsRef, {
            ...firebaseMetric,
            timestamp: serverTimestamp()
        });

        // Check for performance issues
        if (type === 'navigation' && value > 3000) {
            trackError(`Slow page load detected: ${value}ms`, 'warning', 'performance');
        }
    };

    // Resolve error
    const resolveError = async (errorId: string) => {
        const errorRef = ref(rtdb, `errors/${errorId}`);
        const snapshot = await get(errorRef);
        const error = snapshot.val();

        if (error) {
            update(errorRef, {
                resolved: true,
                resolvedAt: serverTimestamp(),
                resolvedBy: currentUserId || null
            });

            addNotification({
                userId: currentUserId || '',
                type: 'success',
                title: 'Error Resolved',
                message: `Error "${error.message}" has been marked as resolved`
            });
        }
    };

    // Get error statistics
    const getErrorStats = async () => {
        const errorsRef = ref(rtdb, 'errors');
        const snapshot = await get(errorsRef);
        const data = snapshot.val();

        if (!data) {
            return { total: 0, byLevel: {}, byType: {} };
        }

        const errors = Object.values(data) as ErrorEvent[];
        const stats = {
            total: errors.length,
            byLevel: {} as { [key: string]: number },
            byType: {} as { [key: string]: number }
        };

        errors.forEach(error => {
            stats.byLevel[error.level] = (stats.byLevel[error.level] || 0) + 1;
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        });

        return stats;
    };

    // Run health check
    const runHealthCheck = async (): Promise<void> => {
        const healthChecks = await Promise.all([
            checkFirebaseHealth(),
            checkPerformanceHealth(),
            checkMemoryHealth(),
            checkErrorHealth(),
            checkUserHealth()
        ]);

        const overallScore = healthChecks.reduce((acc, check) => acc + (check.score || 0), 0) / healthChecks.length;
        
        const newHealth: SystemHealth = {
            status: overallScore >= 80 ? 'healthy' : overallScore >= 50 ? 'warning' : 'critical',
            checks: {
                firebase: {
                    status: healthChecks[0].status as 'ok' | 'error',
                    latency: healthChecks[0].latency,
                    lastCheck: healthChecks[0].lastCheck
                },
                performance: {
                    status: healthChecks[1].status as 'ok' | 'warning' | 'error',
                    loadTime: healthChecks[1].loadTime,
                    lastCheck: healthChecks[1].lastCheck
                },
                memory: {
                    status: healthChecks[2].status as 'ok' | 'warning' | 'error',
                    usage: healthChecks[2].usage,
                    lastCheck: healthChecks[2].lastCheck
                },
                errors: {
                    status: healthChecks[3].status as 'ok' | 'warning' | 'error',
                    count: healthChecks[3].count,
                    lastCheck: healthChecks[3].lastCheck
                },
                users: {
                    status: healthChecks[4].status as 'ok' | 'warning' | 'error',
                    activeCount: healthChecks[4].activeCount,
                    lastCheck: healthChecks[4].lastCheck
                }
            },
            overallScore,
            lastUpdated: new Date().toISOString()
        };

        const healthRef = ref(rtdb, 'systemHealth');
        update(healthRef, newHealth);
    };

    // Individual health check functions
    const checkFirebaseHealth = async () => {
        const startTime = Date.now();
        try {
            const testRef = ref(rtdb, '.info/connected');
            await get(testRef);
            const latency = Date.now() - startTime;
            return {
                status: latency < 1000 ? 'ok' : 'error',
                latency,
                lastCheck: new Date().toISOString(),
                score: latency < 500 ? 100 : latency < 1000 ? 70 : 30
            };
        } catch (error) {
            return {
                status: 'error',
                latency: Date.now() - startTime,
                lastCheck: new Date().toISOString(),
                score: 0
            };
        }
    };

    const checkPerformanceHealth = async () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        
        return {
            status: loadTime < 3000 ? 'ok' : loadTime < 5000 ? 'warning' : 'error',
            loadTime,
            lastCheck: new Date().toISOString(),
            score: loadTime < 1000 ? 100 : loadTime < 3000 ? 80 : loadTime < 5000 ? 50 : 20
        };
    };

    const checkMemoryHealth = async () => {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            
            return {
                status: usage < 70 ? 'ok' : usage < 85 ? 'warning' : 'error',
                usage,
                lastCheck: new Date().toISOString(),
                score: usage < 50 ? 100 : usage < 70 ? 80 : usage < 85 ? 50 : 20
            };
        }
        
        return {
            status: 'ok',
            usage: 0,
            lastCheck: new Date().toISOString(),
            score: 100
        };
    };

    const checkErrorHealth = async () => {
        const recentErrors = errors.filter(e => 
            new Date(e.timestamp).getTime() > Date.now() - 3600000 && !e.resolved
        );
        
        return {
            status: recentErrors.length === 0 ? 'ok' : recentErrors.length < 5 ? 'warning' : 'error',
            count: recentErrors.length,
            lastCheck: new Date().toISOString(),
            score: recentErrors.length === 0 ? 100 : recentErrors.length < 3 ? 80 : recentErrors.length < 5 ? 50 : 20
        };
    };

    const checkUserHealth = async () => {
        const sessionsRef = ref(rtdb, 'sessions');
        const snapshot = await get(sessionsRef);
        const sessions = snapshot.val();
        const activeCount = sessions ? Object.keys(sessions).filter(uid => sessions[uid].status === 'online').length : 0;
        
        return {
            status: activeCount > 0 ? 'ok' : 'warning',
            activeCount,
            lastCheck: new Date().toISOString(),
            score: activeCount > 0 ? 100 : 50
        };
    };

    // Update system health
    const updateSystemHealth = async (component: keyof SystemHealth['checks'], status: 'ok' | 'warning' | 'error') => {
        const healthRef = ref(rtdb, `systemHealth/checks/${component}`);
        update(healthRef, {
            status,
            lastCheck: serverTimestamp()
        });
    };

    // Clear errors
    const clearErrors = () => {
        const errorsRef = ref(rtdb, 'errors');
        remove(errorsRef);
        
        addNotification({
            userId: currentUserId || '',
            type: 'success',
            title: 'Errors Cleared',
            message: 'All errors have been cleared from the system'
        });
    };

    // Auto-run health checks
    useEffect(() => {
        runHealthCheck();
        const interval = setInterval(runHealthCheck, 60000); // Every minute
        
        return () => clearInterval(interval);
    }, []);

    // Track page performance
    useEffect(() => {
        const trackPagePerformance = () => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navigation) {
                trackPerformance('pageLoad', navigation.loadEventEnd - navigation.fetchStart, 'ms', 'navigation');
                trackPerformance('domInteractive', navigation.domInteractive - navigation.fetchStart, 'ms', 'navigation');
                trackPerformance('firstPaint', navigation.loadEventEnd - navigation.fetchStart, 'ms', 'paint');
            }
        };

        if (document.readyState === 'complete') {
            trackPagePerformance();
        } else {
            window.addEventListener('load', trackPagePerformance);
            return () => window.removeEventListener('load', trackPagePerformance);
        }
    }, []);

    // Set loading to false after initial setup
    useEffect(() => {
        setLoading(false);
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        errors,
        systemHealth,
        performanceMetrics,
        loading,
        trackError,
        trackPerformance,
        resolveError,
        getErrorStats,
        runHealthCheck,
        clearErrors
    }), [errors, systemHealth, performanceMetrics, loading, trackError, trackPerformance, resolveError, getErrorStats, runHealthCheck, clearErrors]);

    return (
        <ErrorMonitoringContext.Provider value={value}>
            {children}
        </ErrorMonitoringContext.Provider>
    );
};
