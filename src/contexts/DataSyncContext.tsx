import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { ref, onValue, push, serverTimestamp, update, get, remove, off } from 'firebase/database';
import { rtdb } from '../firebase';

export interface SyncData {
    [key: string]: any;
}

export interface SyncEvent {
    id: string;
    type: 'create' | 'update' | 'delete';
    collection: string;
    documentId: string;
    data: any;
    userId: string;
    userName: string;
    timestamp: string;
    metadata?: {
        [key: string]: any;
    };
}

export interface SyncSubscription {
    id: string;
    collection: string;
    callback: (data: SyncData) => void;
    unsubscribe: () => void;
}

export interface ConflictResolution {
    strategy: 'last_write_wins' | 'first_write_wins' | 'merge' | 'manual';
    resolve: (local: any, remote: any) => any;
}

interface DataSyncContextType {
    // Real-time synchronization
    syncData: (collection: string, documentId: string, data: any, options?: { merge?: boolean }) => Promise<void>;
    deleteData: (collection: string, documentId: string) => Promise<void>;
    
    // Subscriptions
    subscribe: (collection: string, callback: (data: SyncData) => void, documentId?: string) => string;
    unsubscribe: (subscriptionId: string) => void;
    
    // Batch operations
    batchSync: (operations: Array<{ collection: string; documentId: string; data: any; type: 'create' | 'update' | 'delete' }>) => Promise<void>;
    
    // Conflict resolution
    resolveConflict: (local: any, remote: any, strategy?: ConflictResolution['strategy']) => any;
    
    // Sync status
    isOnline: boolean;
    pendingOperations: number;
    lastSyncTime: string;
    syncErrors: Array<{ id: string; error: string; timestamp: string }>;
    
    // Cache management
    getCache: (collection: string, documentId?: string) => SyncData;
    clearCache: (collection?: string) => void;
    
    // Real-time events
    onSyncEvent: (callback: (event: SyncEvent) => void) => () => void;
}

const DataSyncContext = createContext<DataSyncContextType>({
    syncData: async () => {},
    deleteData: async () => {},
    subscribe: () => '',
    unsubscribe: () => {},
    batchSync: async () => {},
    resolveConflict: () => ({}),
    isOnline: true,
    pendingOperations: 0,
    lastSyncTime: '',
    syncErrors: [],
    getCache: () => ({}),
    clearCache: () => {},
    onSyncEvent: () => () => () => {}
});

export const useDataSync = () => useContext(DataSyncContext);

export const DataSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingOperations, setPendingOperations] = useState(0);
    const [lastSyncTime, setLastSyncTime] = useState(new Date().toISOString());
    const [syncErrors, setSyncErrors] = useState<Array<{ id: string; error: string; timestamp: string }>>([]);
    const [cache, setCache] = useState<{ [collection: string]: SyncData }>({});
    const [subscriptions, setSubscriptions] = useState<SyncSubscription[]>([]);
    const eventListenersRef = useRef<Array<(event: SyncEvent) => void>>([]);
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

    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Retry pending operations when coming back online
            retryPendingOperations();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Listen for sync events
    useEffect(() => {
        const eventsRef = ref(rtdb, 'syncEvents');
        const unsubscribe = onValue(eventsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                eventListenersRef.current.forEach(listener => listener(data));
            }
        });

        return () => unsubscribe();
    }, []);

    // Sync data to Firebase
    const syncData = useCallback(async (collection: string, documentId: string, data: any, options: { merge?: boolean } = {}) => {
        try {
            const dataRef = ref(rtdb, `${collection}/${documentId}`);
            
            // Update local cache immediately
            setCache(prev => ({
                ...prev,
                [collection]: {
                    ...prev[collection],
                    [documentId]: data
                }
            }));

            if (isOnline) {
                // Sync to Firebase
                if (options.merge) {
                    await update(dataRef, data);
                } else {
                    await update(dataRef, data);
                }

                // Log sync event
                const eventRef = ref(rtdb, 'syncEvents');
                push(eventRef, {
                    type: 'update',
                    collection,
                    documentId,
                    data,
                    userId: currentUserId,
                    userName: currentUserName,
                    timestamp: serverTimestamp()
                });

                setLastSyncTime(new Date().toISOString());
            } else {
                // Store for later sync when offline
                const pendingRef = ref(rtdb, 'pendingOperations');
                push(pendingRef, {
                    type: 'update',
                    collection,
                    documentId,
                    data,
                    options,
                    userId: currentUserId,
                    timestamp: serverTimestamp()
                });

                setPendingOperations(prev => prev + 1);
            }
        } catch (error) {
            const errorId = Date.now().toString();
            setSyncErrors(prev => [...prev, {
                id: errorId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            }]);
        }
    }, [isOnline, currentUserId, currentUserName]);

    // Delete data
    const deleteData = useCallback(async (collection: string, documentId: string) => {
        try {
            const dataRef = ref(rtdb, `${collection}/${documentId}`);
            
            // Update local cache
            setCache(prev => {
                const collectionData = { ...prev[collection] };
                delete collectionData[documentId];
                return {
                    ...prev,
                    [collection]: collectionData
                };
            });

            if (isOnline) {
                await remove(dataRef);

                // Log sync event
                const eventRef = ref(rtdb, 'syncEvents');
                push(eventRef, {
                    type: 'delete',
                    collection,
                    documentId,
                    data: null,
                    userId: currentUserId,
                    userName: currentUserName,
                    timestamp: serverTimestamp()
                });

                setLastSyncTime(new Date().toISOString());
            } else {
                // Store for later sync when offline
                const pendingRef = ref(rtdb, 'pendingOperations');
                push(pendingRef, {
                    type: 'delete',
                    collection,
                    documentId,
                    data: null,
                    userId: currentUserId,
                    timestamp: serverTimestamp()
                });

                setPendingOperations(prev => prev + 1);
            }
        } catch (error) {
            const errorId = Date.now().toString();
            setSyncErrors(prev => [...prev, {
                id: errorId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            }]);
        }
    }, [isOnline, currentUserId, currentUserName]);

    // Subscribe to data changes
    const subscribe = useCallback((collection: string, callback: (data: SyncData) => void, documentId?: string): string => {
        const subscriptionId = `${collection}_${documentId || 'all'}_${Date.now()}`;
        
        const path = documentId ? `${collection}/${documentId}` : collection;
        const dataRef = ref(rtdb, path);
        
        const unsubscribe = onValue(dataRef, (snapshot) => {
            const data = snapshot.val();
            
            // Update cache
            if (documentId) {
                setCache(prev => ({
                    ...prev,
                    [collection]: {
                        ...prev[collection],
                        [documentId]: data
                    }
                }));
            } else {
                setCache(prev => ({
                    ...prev,
                    [collection]: data || {}
                }));
            }
            
            callback(data);
        });

        const subscription: SyncSubscription = {
            id: subscriptionId,
            collection,
            callback,
            unsubscribe
        };

        setSubscriptions(prev => [...prev, subscription]);

        return subscriptionId;
    }, []);

    // Unsubscribe from data changes
    const unsubscribe = useCallback((subscriptionId: string) => {
        setSubscriptions(prev => {
            const subscription = prev.find(sub => sub.id === subscriptionId);
            if (subscription) {
                subscription.unsubscribe();
            }
            return prev.filter(sub => sub.id !== subscriptionId);
        });
    }, []);

    // Batch operations
    const batchSync = useCallback(async (operations: Array<{ collection: string; documentId: string; data: any; type: 'create' | 'update' | 'delete' }>) => {
        const batchRef = ref(rtdb, 'batchOperations');
        const batchId = push(batchRef).key;

        try {
            // Update local cache first
            operations.forEach(op => {
                if (op.type === 'delete') {
                    setCache(prev => {
                        const collectionData = { ...prev[op.collection] };
                        delete collectionData[op.documentId];
                        return {
                            ...prev,
                            [op.collection]: collectionData
                        };
                    });
                } else {
                    setCache(prev => ({
                        ...prev,
                        [op.collection]: {
                            ...prev[op.collection],
                            [op.documentId]: op.data
                        }
                    }));
                }
            });

            if (isOnline) {
                // Execute batch operations
                const updates: { [key: string]: any } = {};
                
                operations.forEach(op => {
                    const path = `${op.collection}/${op.documentId}`;
                    if (op.type === 'delete') {
                        updates[path] = null;
                    } else {
                        updates[path] = op.data;
                    }
                });

                await update(ref(rtdb), updates);

                setLastSyncTime(new Date().toISOString());
            } else {
                // Store for later sync
                const pendingRef = ref(rtdb, 'pendingBatchOperations');
                push(pendingRef, {
                    id: batchId,
                    operations,
                    userId: currentUserId,
                    timestamp: serverTimestamp()
                });

                setPendingOperations(prev => prev + operations.length);
            }
        } catch (error) {
            const errorId = Date.now().toString();
            setSyncErrors(prev => [...prev, {
                id: errorId,
                error: error instanceof Error ? error.message : 'Batch operation failed',
                timestamp: new Date().toISOString()
            }]);
        }
    }, [isOnline, currentUserId]);

    // Conflict resolution
    const resolveConflict = useCallback((local: any, remote: any, strategy: ConflictResolution['strategy'] = 'last_write_wins'): any => {
        switch (strategy) {
            case 'last_write_wins':
                return remote;
            case 'first_write_wins':
                return local;
            case 'merge':
                if (typeof local === 'object' && typeof remote === 'object') {
                    return { ...local, ...remote };
                }
                return remote;
            case 'manual':
                // In a real implementation, this would trigger a UI for manual resolution
                console.warn('Manual conflict resolution not implemented, using last write wins');
                return remote;
            default:
                return remote;
        }
    }, []);

    // Retry pending operations
    const retryPendingOperations = useCallback(async () => {
        if (!isOnline) return;

        try {
            const pendingRef = ref(rtdb, 'pendingOperations');
            const snapshot = await get(pendingRef);
            const pendingOps = snapshot.val();

            if (pendingOps) {
                const updates: { [key: string]: any } = {};
                
                Object.entries(pendingOps).forEach(([key, op]: [string, any]) => {
                    const path = `${op.collection}/${op.documentId}`;
                    if (op.type === 'delete') {
                        updates[path] = null;
                    } else {
                        updates[path] = op.data;
                    }
                    
                    // Remove from pending
                    updates[`pendingOperations/${key}`] = null;
                });

                await update(ref(rtdb), updates);
                setPendingOperations(0);
                setLastSyncTime(new Date().toISOString());
            }
        } catch (error) {
            console.error('Failed to retry pending operations:', error);
        }
    }, [isOnline]);

    // Cache management
    const getCache = useCallback((collection: string, documentId?: string): SyncData => {
        if (documentId) {
            return cache[collection]?.[documentId] || {};
        }
        return cache[collection] || {};
    }, [cache]);

    const clearCache = useCallback((collection?: string) => {
        if (collection) {
            setCache(prev => {
                const newCache = { ...prev };
                delete newCache[collection];
                return newCache;
            });
        } else {
            setCache({});
        }
    }, []);

    // Event listeners
    const onSyncEvent = useCallback((callback: (event: SyncEvent) => void) => {
        eventListenersRef.current.push(callback);
        
        return () => {
            eventListenersRef.current = eventListenersRef.current.filter(listener => listener !== callback);
        };
    }, []);

    // Cleanup subscriptions on unmount
    useEffect(() => {
        return () => {
            subscriptions.forEach(sub => sub.unsubscribe());
        };
    }, [subscriptions]);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        syncData,
        deleteData,
        subscribe,
        unsubscribe,
        batchSync,
        resolveConflict,
        isOnline,
        pendingOperations,
        lastSyncTime,
        syncErrors,
        getCache,
        clearCache,
        onSyncEvent
    }), [syncData, deleteData, subscribe, unsubscribe, batchSync, resolveConflict, isOnline, pendingOperations, lastSyncTime, syncErrors, getCache, clearCache, onSyncEvent]);

    return (
        <DataSyncContext.Provider value={value}>
            {children}
        </DataSyncContext.Provider>
    );
};
