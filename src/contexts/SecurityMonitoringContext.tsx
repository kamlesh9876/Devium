import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { ref, onValue, push, serverTimestamp, update } from 'firebase/database';
import { rtdb } from '../firebase';

export interface SecurityEvent {
    id: string;
    timestamp: string;
    type: 'login_attempt' | 'failed_login' | 'suspicious_activity' | 'data_breach' | 'malware_detected' | 'unauthorized_access' | 'brute_force' | 'session_hijack' | 'xss_attempt' | 'sql_injection' | 'csrf_attack';
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    ipAddress: string;
    userAgent: string;
    location?: {
        country: string;
        city: string;
    };
    description: string;
    details?: {
        [key: string]: any;
    };
    resolved: boolean;
    resolvedAt?: string;
    resolvedBy?: string;
    falsePositive: boolean;
}

export interface SecurityThreat {
    id: string;
    type: string;
    name: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detectedAt: string;
    status: 'active' | 'mitigated' | 'resolved';
    affectedUsers: string[];
    mitigationSteps: string[];
    riskScore: number;
}

export interface SecurityMetrics {
    totalEvents: number;
    criticalEvents: number;
    highEvents: number;
    mediumEvents: number;
    lowEvents: number;
    resolvedEvents: number;
    activeThreats: number;
    riskScore: number;
    eventsByType: { [key: string]: number };
    eventsByHour: Array<{ hour: number; count: number }>;
    topAttackSources: Array<{ ip: string; count: number; location?: string }>;
    blockedAttempts: number;
    successfulAttacks: number;
}

interface SecurityMonitoringContextType {
    // Security events
    securityEvents: SecurityEvent[];
    threats: SecurityThreat[];
    metrics: SecurityMetrics;
    loading: boolean;
    
    // Event tracking
    trackSecurityEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved' | 'falsePositive'>) => void;
    reportSuspiciousActivity: (description: string, severity: SecurityEvent['severity'], details?: any) => void;
    
    // Threat management
    createThreatAlert: (threat: Omit<SecurityThreat, 'id' | 'detectedAt' | 'status'>) => void;
    mitigateThreat: (threatId: string, mitigationSteps: string[]) => void;
    resolveThreat: (threatId: string) => void;
    
    // Event management
    resolveSecurityEvent: (eventId: string, isFalsePositive?: boolean) => void;
    blockIPAddress: (ipAddress: string, duration?: number) => void;
    
    // Monitoring
    getSecurityMetrics: () => Promise<SecurityMetrics>;
    runSecurityScan: () => Promise<void>;
    
    // Real-time alerts
    onSecurityThreat: (callback: (threat: SecurityThreat) => void) => () => void;
}

const SecurityMonitoringContext = createContext<SecurityMonitoringContextType>({
    securityEvents: [],
    threats: [],
    metrics: {
        totalEvents: 0,
        criticalEvents: 0,
        highEvents: 0,
        mediumEvents: 0,
        lowEvents: 0,
        resolvedEvents: 0,
        activeThreats: 0,
        riskScore: 0,
        eventsByType: {},
        eventsByHour: [],
        topAttackSources: [],
        blockedAttempts: 0,
        successfulAttacks: 0
    },
    loading: true,
    trackSecurityEvent: () => {},
    reportSuspiciousActivity: () => {},
    createThreatAlert: () => {},
    mitigateThreat: () => {},
    resolveThreat: () => {},
    resolveSecurityEvent: () => {},
    blockIPAddress: () => {},
    getSecurityMetrics: async () => ({ totalEvents: 0, criticalEvents: 0, highEvents: 0, mediumEvents: 0, lowEvents: 0, resolvedEvents: 0, activeThreats: 0, riskScore: 0, eventsByType: {}, eventsByHour: [], topAttackSources: [], blockedAttempts: 0, successfulAttacks: 0 }),
    runSecurityScan: async () => {},
    onSecurityThreat: () => () => () => {}
});

export const useSecurityMonitoring = () => useContext(SecurityMonitoringContext);

// Security rule engine
const analyzeSecurityEvent = (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved' | 'falsePositive'>): SecurityThreat | null => {
    // Check for suspicious patterns
    if (event.type === 'failed_login' && event.details?.attempts > 5) {
        return {
            id: '',
            type: 'brute_force',
            name: 'Brute Force Attack Detected',
            description: `Multiple failed login attempts from ${event.ipAddress}`,
            severity: 'high',
            detectedAt: new Date().toISOString(),
            status: 'active',
            affectedUsers: event.userId ? [event.userId] : [],
            mitigationSteps: [
                'Block IP address temporarily',
                'Require additional authentication',
                'Notify user of suspicious activity'
            ],
            riskScore: 75
        };
    }

    if (event.type === 'suspicious_activity' && event.severity === 'critical') {
        return {
            id: '',
            type: 'data_breach',
            name: 'Potential Data Breach',
            description: event.description,
            severity: 'critical',
            detectedAt: new Date().toISOString(),
            status: 'active',
            affectedUsers: event.userId ? [event.userId] : [],
            mitigationSteps: [
                'Immediate user notification',
                'Force password reset',
                'Review access logs',
                'Enable additional monitoring'
            ],
            riskScore: 95
        };
    }

    return null;
};

export const SecurityMonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
    const [threats, setThreats] = useState<SecurityThreat[]>([]);
    const [metrics, setMetrics] = useState<SecurityMetrics>({
        totalEvents: 0,
        criticalEvents: 0,
        highEvents: 0,
        mediumEvents: 0,
        lowEvents: 0,
        resolvedEvents: 0,
        activeThreats: 0,
        riskScore: 0,
        eventsByType: {},
        eventsByHour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
        topAttackSources: [],
        blockedAttempts: 0,
        successfulAttacks: 0
    });
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const threatListenersRef = useRef<Array<(threat: SecurityThreat) => void>>([]);

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

    // Listen for security events
    useEffect(() => {
        const eventsRef = ref(rtdb, 'securityEvents');
        const unsubscribe = onValue(eventsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const events: SecurityEvent[] = Object.entries(data).map(([id, event]: [string, any]) => ({
                    id,
                    ...event
                })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                setSecurityEvents(events);
                
                // Check for critical events
                const criticalEvents = events.filter(e => e.severity === 'critical' && !e.resolved);
                if (criticalEvents.length > 0) {
                    // Note: Notification removed to prevent circular dependency
                    console.warn(`${criticalEvents.length} critical security event(s) detected`);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    // Listen for threats
    useEffect(() => {
        const threatsRef = ref(rtdb, 'securityThreats');
        const unsubscribe = onValue(threatsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const threatList: SecurityThreat[] = Object.entries(data).map(([id, threat]: [string, any]) => ({
                    id,
                    ...threat
                })).sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
                
                setThreats(threatList);
                
                // Notify about new threats
                threatList.forEach(threat => {
                    if (threat.status === 'active') {
                        threatListenersRef.current.forEach(listener => listener(threat));
                        // Note: Notification removed to prevent circular dependency
                        console.warn(`Security Threat Detected: ${threat.name}: ${threat.description}`);
                    }
                });
            }
        });

        return () => unsubscribe();
    }, []); // Remove threatListeners from dependencies

    // Create threat alert
    const createThreatAlert = useCallback((threat: Omit<SecurityThreat, 'id' | 'detectedAt' | 'status'>) => {
        const threatData = {
            ...threat,
            detectedAt: serverTimestamp(),
            status: 'active'
        };

        const threatsRef = ref(rtdb, 'securityThreats');
        push(threatsRef, threatData);
    }, []);

    // Track security event
    const trackSecurityEvent = useCallback((event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved' | 'falsePositive'>) => {
        const securityEvent = {
            ...event,
            timestamp: serverTimestamp(),
            resolved: false,
            falsePositive: false
        };

        const eventsRef = ref(rtdb, 'securityEvents');
        push(eventsRef, securityEvent);

        // Analyze for threats
        const threat = analyzeSecurityEvent(event);
        if (threat) {
            createThreatAlert(threat);
        }
    }, [createThreatAlert]);

    // Report suspicious activity
    const reportSuspiciousActivity = useCallback((description: string, severity: SecurityEvent['severity'], details?: any) => {
        const storedUser = localStorage.getItem('devium_user');
        const userData = storedUser ? JSON.parse(storedUser) : null;

        trackSecurityEvent({
            type: 'suspicious_activity',
            severity,
            userId: userData?.uid,
            ipAddress: 'unknown', // Would be detected server-side
            userAgent: navigator.userAgent,
            description,
            details
        });
    }, [trackSecurityEvent]);

    // Mitigate threat
    const mitigateThreat = useCallback(async (threatId: string, mitigationSteps: string[]) => {
        const threatRef = ref(rtdb, `securityThreats/${threatId}`);
        await update(threatRef, {
            status: 'mitigated',
            mitigationSteps
        });

        // Note: Notification removed to prevent circular dependency
        // addNotification({
        //     userId: currentUserId || '',
        //     type: 'success',
        //     title: 'Threat Mitigated',
        //     message: `Security threat has been mitigated with ${mitigationSteps.length} steps`
        // });
    }, [currentUserId]);

    // Resolve threat
    const resolveThreat = useCallback(async (threatId: string) => {
        const threatRef = ref(rtdb, `securityThreats/${threatId}`);
        await update(threatRef, {
            status: 'resolved',
            resolvedBy: currentUserId
        });

        // Note: Notification removed to prevent circular dependency
        // addNotification({
        //     userId: currentUserId || '',
        //     type: 'success',
        //     title: 'Threat Resolved',
        //     message: 'Security threat has been resolved'
        // });
    }, [currentUserId]);

    // Resolve security event
    const resolveSecurityEvent = useCallback(async (eventId: string, isFalsePositive = false) => {
        const eventRef = ref(rtdb, `securityEvents/${eventId}`);
        await update(eventRef, {
            resolved: true,
            resolvedAt: serverTimestamp(),
            resolvedBy: currentUserId,
            falsePositive: isFalsePositive
        });
    }, [currentUserId]);

    // Block IP address
    const blockIPAddress = useCallback(async (ipAddress: string, duration = 3600000) => { // 1 hour default
        const blockRef = ref(rtdb, 'blockedIPs');
        await update(blockRef, {
            [ipAddress]: {
                blockedAt: serverTimestamp(),
                duration,
                blockedBy: currentUserId
            }
        });

        // Note: Notification removed to prevent circular dependency
        // addNotification({
        //     userId: currentUserId || '',
        //     type: 'success',
        //     title: 'IP Address Blocked',
        //     message: `${ipAddress} has been blocked for ${duration / 60000} minutes`
        // });
    }, [currentUserId]);

    // Get security metrics
    const getSecurityMetrics = async (): Promise<SecurityMetrics> => {
        return metrics;
    };

    // Run security scan
    const runSecurityScan = useCallback(async () => {
        // Simulate security scan
        const scanResults: Array<Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved' | 'falsePositive' | 'ipAddress' | 'userAgent'>> = [
            {
                type: 'xss_attempt',
                severity: 'medium' as const,
                description: 'Potential XSS attempt detected in user input',
                details: { pattern: '<script>alert(1)</script>' }
            },
            {
                type: 'suspicious_activity',
                severity: 'low' as const,
                description: 'Unusual user behavior pattern detected',
                details: { pattern: 'rapid_requests' }
            }
        ];

        scanResults.forEach(result => {
            const securityEvent = {
                ...result,
                userId: currentUserId || undefined,
                ipAddress: 'scan.simulated',
                userAgent: 'Security Scanner'
            };
            
            // Convert undefined to null for Firebase compatibility
            const firebaseEvent = {
                ...securityEvent,
                userId: securityEvent.userId || null
            };
            
            trackSecurityEvent(firebaseEvent as any);
        });

        // Note: Notification removed to prevent circular dependency
        // addNotification({
        //     userId: currentUserId || '',
        //     type: 'info',
        //     title: 'Security Scan Complete',
        //     message: `Scan completed with ${scanResults.length} findings`
        // });
    }, [currentUserId, trackSecurityEvent]);

    // Security threat listeners
    const onSecurityThreat = useCallback((callback: (threat: SecurityThreat) => void) => {
        threatListenersRef.current.push(callback);
        
        return () => {
            threatListenersRef.current = threatListenersRef.current.filter(listener => listener !== callback);
        };
    }, []);

    // Create a ref for trackSecurityEvent to avoid circular dependency
    const trackSecurityEventRef = useRef(trackSecurityEvent);
    trackSecurityEventRef.current = trackSecurityEvent;

    // Auto security checks
    useEffect(() => {
        const interval = setInterval(() => {
            // Check for unusual patterns
            const recentEvents = securityEvents.filter(e => 
                new Date(e.timestamp).getTime() > Date.now() - 3600000 // Last hour
            );

            // Check for multiple failed logins from same IP
            const ipFailures: { [ip: string]: number } = {};
            recentEvents.forEach(event => {
                if (event.type === 'failed_login') {
                    ipFailures[event.ipAddress] = (ipFailures[event.ipAddress] || 0) + 1;
                }
            });

            Object.entries(ipFailures).forEach(([ip, count]) => {
                if (count >= 5) {
                    trackSecurityEventRef.current({
                        type: 'brute_force',
                        severity: 'high',
                        ipAddress: ip,
                        userAgent: 'unknown',
                        description: `Brute force attack detected from ${ip}`,
                        details: { attempts: count, timeframe: '1 hour' }
                    });
                }
            });
        }, 30000); // Every 30 seconds

        return () => clearInterval(interval);
    }, [securityEvents]); // Remove trackSecurityEvent from dependencies

    // Calculate security metrics
    useEffect(() => {
        const newMetrics: SecurityMetrics = {
            totalEvents: securityEvents.length,
            criticalEvents: securityEvents.filter(e => e.severity === 'critical').length,
            highEvents: securityEvents.filter(e => e.severity === 'high').length,
            mediumEvents: securityEvents.filter(e => e.severity === 'medium').length,
            lowEvents: securityEvents.filter(e => e.severity === 'low').length,
            resolvedEvents: securityEvents.filter(e => e.resolved).length,
            activeThreats: threats.filter(t => t.status === 'active').length,
            riskScore: Math.min(100, Math.round(
                (securityEvents.filter(e => e.severity === 'critical').length * 25 +
                 securityEvents.filter(e => e.severity === 'high').length * 15 +
                 securityEvents.filter(e => e.severity === 'medium').length * 10 +
                 threats.filter(t => t.status === 'active').length * 20) /
                Math.max(1, securityEvents.length)
            )),
            eventsByType: securityEvents.reduce((acc, event) => {
                acc[event.type] = (acc[event.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            eventsByHour: Array.from({ length: 24 }, (_, hour) => {
                const hourStart = new Date();
                hourStart.setHours(hour, 0, 0, 0);
                const hourEnd = new Date(hourStart);
                hourEnd.setHours(hour + 1);
                
                return {
                    hour,
                    count: securityEvents.filter(e => {
                        const eventTime = new Date(e.timestamp);
                        return eventTime >= hourStart && eventTime < hourEnd;
                    }).length
                };
            }),
            topAttackSources: Object.entries(
                securityEvents.reduce((acc, event) => {
                    if (event.ipAddress && event.ipAddress !== 'unknown') {
                        acc[event.ipAddress] = (acc[event.ipAddress] || 0) + 1;
                    }
                    return acc;
                }, {} as Record<string, number>)
            )
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([ip, count]) => ({ ip, count })),
            blockedAttempts: securityEvents.filter(e => e.type === 'unauthorized_access').length,
            successfulAttacks: securityEvents.filter(e => e.type === 'data_breach').length
        };

        setMetrics(newMetrics);
    }, [securityEvents, threats]);

    // Set loading to false after initial setup
    useEffect(() => {
        setLoading(false);
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        securityEvents,
        threats,
        metrics,
        loading,
        trackSecurityEvent,
        reportSuspiciousActivity,
        createThreatAlert,
        mitigateThreat,
        resolveThreat,
        resolveSecurityEvent,
        blockIPAddress,
        getSecurityMetrics,
        runSecurityScan,
        onSecurityThreat
    }), [securityEvents, threats, metrics, loading, trackSecurityEvent, reportSuspiciousActivity, createThreatAlert, mitigateThreat, resolveThreat, resolveSecurityEvent, blockIPAddress, getSecurityMetrics, runSecurityScan, onSecurityThreat]);

    return (
        <SecurityMonitoringContext.Provider value={value}>
            {children}
        </SecurityMonitoringContext.Provider>
    );
};
