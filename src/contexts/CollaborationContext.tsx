import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { ref, onValue, push, serverTimestamp, update, get, remove } from 'firebase/database';
import { rtdb } from '../firebase';

export interface CursorPosition {
    x: number;
    y: number;
    page: string;
    element?: string;
    timestamp: string;
}

export interface UserCursor {
    userId: string;
    userName: string;
    userColor: string;
    cursor: CursorPosition;
    isActive: boolean;
    lastSeen: string;
}

export interface SharedSession {
    id: string;
    name: string;
    description?: string;
    createdBy: string;
    createdAt: string;
    isActive: boolean;
    participants: Array<{
        userId: string;
        userName: string;
        joinedAt: string;
        role: 'owner' | 'editor' | 'viewer';
        cursor?: CursorPosition;
        isTyping?: boolean;
        typingElement?: string;
    }>;
    sharedData?: {
        [key: string]: any;
    };
    settings: {
        allowAnonymous: boolean;
        maxParticipants: number;
        autoSave: boolean;
        isPublic: boolean;
    };
}

export interface TypingIndicator {
    userId: string;
    userName: string;
    element: string;
    isTyping: boolean;
    startedAt: string;
    lastUpdate: string;
}

interface CollaborationContextType {
    // Live Cursors
    userCursors: UserCursor[];
    myCursor: CursorPosition | null;
    updateMyCursor: (position: Partial<CursorPosition>) => void;
    clearMyCursor: () => void;
    
    // Shared Sessions
    activeSessions: SharedSession[];
    currentSession: SharedSession | null;
    createSession: (name: string, description?: string) => Promise<string>;
    joinSession: (sessionId: string) => Promise<void>;
    leaveSession: (sessionId: string) => Promise<void>;
    updateSessionData: (sessionId: string, data: any) => void;
    
    // Typing Indicators
    typingIndicators: TypingIndicator[];
    startTyping: (element: string) => void;
    stopTyping: (element: string) => void;
    
    // Collaboration Events
    broadcastEvent: (type: string, data: any, targetSession?: string) => void;
    onCollaborationEvent: (callback: (event: { type: string; data: any; userId: string; sessionId?: string }) => void) => () => void;
}

const CollaborationContext = createContext<CollaborationContextType>({
    userCursors: [],
    myCursor: null,
    updateMyCursor: () => {},
    clearMyCursor: () => {},
    activeSessions: [],
    currentSession: null,
    createSession: async () => '',
    joinSession: async () => {},
    leaveSession: async () => {},
    updateSessionData: () => {},
    typingIndicators: [],
    startTyping: () => {},
    stopTyping: () => {},
    broadcastEvent: () => {},
    onCollaborationEvent: () => () => () => {}
});

export const useCollaboration = () => useContext(CollaborationContext);

// Generate user color based on user ID
const generateUserColor = (userId: string): string => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
        '#F8B739', '#52B788', '#E74C3C', '#3498DB', '#9B59B6'
    ];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export const CollaborationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userCursors, setUserCursors] = useState<UserCursor[]>([]);
    const [myCursor, setMyCursor] = useState<CursorPosition | null>(null);
    const [activeSessions, setActiveSessions] = useState<SharedSession[]>([]);
    const [currentSession, setCurrentSession] = useState<SharedSession | null>(null);
    const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUserName, setCurrentUserName] = useState<string>('');

    // Get current user info
    useEffect(() => {
        const storedUser = localStorage.getItem('devium_user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setCurrentUserId(userData.uid);
                setCurrentUserName(userData.name);
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
    }, []);

    // Track mouse movement for cursor
    useEffect(() => {
        if (!currentUserId) return;

        let timeoutId: NodeJS.Timeout;
        const handleMouseMove = (e: MouseEvent) => {
            clearTimeout(timeoutId);
            
            const position: CursorPosition = {
                x: e.clientX,
                y: e.clientY,
                page: window.location.pathname,
                timestamp: new Date().toISOString()
            };

            setMyCursor(position);

            // Debounce cursor updates
            timeoutId = setTimeout(() => {
                updateCursorPosition(position);
            }, 100);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeoutId);
        };
    }, [currentUserId]);

    // Update cursor position in Firebase
    const updateCursorPosition = useCallback((position: CursorPosition) => {
        if (!currentUserId) return;

        const cursorRef = ref(rtdb, `cursors/${currentUserId}`);
        update(cursorRef, {
            userId: currentUserId,
            userName: currentUserName,
            userColor: generateUserColor(currentUserId),
            cursor: position,
            isActive: true,
            lastSeen: serverTimestamp()
        });
    }, [currentUserId, currentUserName]);

    // Listen for other users' cursors
    useEffect(() => {
        if (!currentUserId) return;

        const cursorsRef = ref(rtdb, 'cursors');
        const unsubscribe = onValue(cursorsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const cursors: UserCursor[] = Object.entries(data)
                    .filter(([userId]) => userId !== currentUserId)
                    .map(([userId, cursorData]: [string, any]) => ({
                        userId,
                        userName: cursorData.userName,
                        userColor: cursorData.userColor,
                        cursor: cursorData.cursor,
                        isActive: cursorData.isActive,
                        lastSeen: cursorData.lastSeen
                    }))
                    .filter(cursor => 
                        cursor.isActive && 
                        cursor.cursor.page === window.location.pathname &&
                        new Date().getTime() - new Date(cursor.lastSeen).getTime() < 30000 // Active within 30 seconds
                    );

                setUserCursors(cursors);
            } else {
                setUserCursors([]);
            }
        });

        return () => unsubscribe();
    }, [currentUserId]);

    // Listen for active sessions
    useEffect(() => {
        const sessionsRef = ref(rtdb, 'sessions');
        const unsubscribe = onValue(sessionsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const sessions: SharedSession[] = Object.entries(data)
                    .filter(([_, sessionData]: [string, any]) => {
                        // Filter out sessions without proper participant data
                        return sessionData.isActive && 
                               sessionData.participants && 
                               Array.isArray(sessionData.participants) && 
                               sessionData.participants.length > 0;
                    })
                    .map(([id, sessionData]: [string, any]) => {
                        const session = {
                            id,
                            ...sessionData,
                            participants: sessionData.participants || []
                        };
                        console.log('Session data:', session);
                        return session;
                    });
                setActiveSessions(sessions);
            } else {
                setActiveSessions([]);
            }
        });

        return () => unsubscribe();
    }, []);

    // Listen for typing indicators
    useEffect(() => {
        if (!currentUserId) return;

        const typingRef = ref(rtdb, 'typing');
        const unsubscribe = onValue(typingRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const indicators: TypingIndicator[] = Object.entries(data)
                    .filter(([userId]) => userId !== currentUserId)
                    .map(([userId, indicatorData]: [string, any]) => ({
                        userId,
                        userName: indicatorData.userName,
                        element: indicatorData.element,
                        isTyping: indicatorData.isTyping,
                        startedAt: indicatorData.startedAt,
                        lastUpdate: indicatorData.lastUpdate
                    }))
                    .filter(indicator => 
                        indicator.isTyping &&
                        new Date().getTime() - new Date(indicator.lastUpdate).getTime() < 5000 // Active within 5 seconds
                    );

                setTypingIndicators(indicators);
            } else {
                setTypingIndicators([]);
            }
        });

        return () => unsubscribe();
    }, [currentUserId]);

    // Clear cursor when user leaves page
    useEffect(() => {
        const handlePageUnload = () => {
            if (currentUserId) {
                const cursorRef = ref(rtdb, `cursors/${currentUserId}`);
                update(cursorRef, { isActive: false });
                
                // Stop typing
                stopTyping('all');
            }
        };

        window.addEventListener('beforeunload', handlePageUnload);
        return () => window.removeEventListener('beforeunload', handlePageUnload);
    }, [currentUserId]);

    // Collaboration functions
    const updateMyCursor = useCallback((position: Partial<CursorPosition>) => {
        if (myCursor) {
            const updatedCursor = { ...myCursor, ...position };
            setMyCursor(updatedCursor);
            updateCursorPosition(updatedCursor);
        } else {
            const newCursor: CursorPosition = {
                x: 0,
                y: 0,
                page: window.location.pathname,
                timestamp: new Date().toISOString(),
                ...position
            };
            setMyCursor(newCursor);
            updateCursorPosition(newCursor);
        }
    }, [myCursor, updateCursorPosition]);

    const clearMyCursor = useCallback(() => {
        if (currentUserId) {
            const cursorRef = ref(rtdb, `cursors/${currentUserId}`);
            update(cursorRef, { isActive: false });
            setMyCursor(null);
        }
    }, [currentUserId]);

    const createSession = async (name: string, description?: string): Promise<string> => {
        if (!currentUserId) throw new Error('User not authenticated');

        const sessionsRef = ref(rtdb, 'sessions');
        const newSessionRef = push(sessionsRef);
        
        const sessionData: SharedSession = {
            id: newSessionRef.key!,
            name,
            description,
            createdBy: currentUserId,
            createdAt: new Date().toISOString(),
            isActive: true,
            participants: [{
                userId: currentUserId,
                userName: currentUserName,
                joinedAt: new Date().toISOString(),
                role: 'owner'
            }],
            settings: {
                allowAnonymous: false,
                maxParticipants: 10,
                autoSave: true,
                isPublic: false
            }
        };

        console.log('Creating session with data:', sessionData);
        await update(newSessionRef, sessionData);
        return newSessionRef.key!;
    };

    const joinSession = async (sessionId: string): Promise<void> => {
        if (!currentUserId) throw new Error('User not authenticated');

        const sessionRef = ref(rtdb, `sessions/${sessionId}`);
        const snapshot = await get(sessionRef);
        const session = snapshot.val();

        if (!session || !session.isActive) {
            throw new Error('Session not found or inactive');
        }

        if (session.participants.length >= session.settings.maxParticipants) {
            throw new Error('Session is full');
        }

        // Add participant
        const participants = [...session.participants, {
            userId: currentUserId,
            userName: currentUserName,
            joinedAt: new Date().toISOString(),
            role: 'editor'
        }];

        await update(sessionRef, { participants });
        setCurrentSession({ ...session, id: sessionId, participants });
    };

    const leaveSession = async (sessionId: string): Promise<void> => {
        if (!currentUserId) return;

        const sessionRef = ref(rtdb, `sessions/${sessionId}`);
        const snapshot = await get(sessionRef);
        const session = snapshot.val();

        if (session) {
            const participants = session.participants.filter((p: any) => p.userId !== currentUserId);
            
            if (participants.length === 0) {
                // Delete session if no participants left
                await remove(sessionRef);
            } else {
                await update(sessionRef, { participants });
            }
        }

        if (currentSession?.id === sessionId) {
            setCurrentSession(null);
        }
    };

    const updateSessionData = async (sessionId: string, data: any): Promise<void> => {
        const sessionRef = ref(rtdb, `sessions/${sessionId}/sharedData`);
        await update(sessionRef, data);
    };

    const startTyping = useCallback((element: string) => {
        if (!currentUserId) return;

        const typingRef = ref(rtdb, `typing/${currentUserId}`);
        update(typingRef, {
            userId: currentUserId,
            userName: currentUserName,
            element,
            isTyping: true,
            startedAt: serverTimestamp(),
            lastUpdate: serverTimestamp()
        });
    }, [currentUserId, currentUserName]);

    const stopTyping = useCallback((element: string) => {
        if (!currentUserId) return;

        const typingRef = ref(rtdb, `typing/${currentUserId}`);
        if (element === 'all') {
            remove(typingRef);
        } else {
            update(typingRef, {
                isTyping: false,
                lastUpdate: serverTimestamp()
            });
        }
    }, [currentUserId]);

    const broadcastEvent = useCallback((type: string, data: any, targetSession?: string) => {
        if (!currentUserId) return;

        const eventsRef = ref(rtdb, `events${targetSession ? `/${targetSession}` : ''}`);
        push(eventsRef, {
            type,
            data,
            userId: currentUserId,
            userName: currentUserName,
            timestamp: serverTimestamp(),
            sessionId: targetSession
        });
    }, [currentUserId, currentUserName]);

    const onCollaborationEvent = useCallback((callback: (event: any) => void) => {
        const eventsRef = ref(rtdb, 'events');
        const unsubscribe = onValue(eventsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                Object.values(data).forEach((event: any) => {
                    if (event.userId !== currentUserId) {
                        callback(event);
                    }
                });
            }
        });

        return () => unsubscribe();
    }, [currentUserId]);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        userCursors,
        myCursor,
        updateMyCursor,
        clearMyCursor,
        activeSessions,
        currentSession,
        createSession,
        joinSession,
        leaveSession,
        updateSessionData,
        typingIndicators,
        startTyping,
        stopTyping,
        broadcastEvent,
        onCollaborationEvent
    }), [userCursors, myCursor, updateMyCursor, clearMyCursor, activeSessions, currentSession, createSession, joinSession, leaveSession, updateSessionData, typingIndicators, startTyping, stopTyping, broadcastEvent, onCollaborationEvent]);

    return (
        <CollaborationContext.Provider value={value}>
            {children}
        </CollaborationContext.Provider>
    );
};
