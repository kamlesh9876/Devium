import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { ref, onValue, push, serverTimestamp, update, remove } from 'firebase/database';
import { rtdb } from '../firebase';

export interface Notification {
    id: string;
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'user_online' | 'user_offline' | 'system_alert';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
    actionText?: string;
    metadata?: {
        [key: string]: any;
    };
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (notificationId: string) => void;
    markAllAsRead: () => void;
    clearNotification: (notificationId: string) => void;
    clearAllNotifications: () => void;
    sendSystemNotification: (title: string, message: string, type?: Notification['type']) => void;
}

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    addNotification: () => {},
    markAsRead: () => {},
    markAllAsRead: () => {},
    clearNotification: () => {},
    clearAllNotifications: () => {},
    sendSystemNotification: () => {}
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    // Get current user ID from localStorage or auth context
    useEffect(() => {
        const storedUser = localStorage.getItem('devium_user');
        if (storedUser) {
            try {
                const userData = JSON.parse(storedUser);
                setUserId(userData.uid);
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        }
    }, []);

    // Listen for user notifications
    useEffect(() => {
        if (!userId) return;

        const notificationsRef = ref(rtdb, `notifications/${userId}`);
        const unsubscribe = onValue(notificationsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const notificationList: Notification[] = Object.entries(data).map(([id, value]: [string, any]) => ({
                    id,
                    ...value
                })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                setNotifications(notificationList);
            } else {
                setNotifications([]);
            }
        });

        return () => unsubscribe();
    }, [userId]);

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        if (!userId) return;

        const notificationRef = ref(rtdb, `notifications/${userId}`);
        const newNotification = {
            ...notification,
            timestamp: serverTimestamp(),
            read: false
        };

        push(notificationRef, newNotification);

        // Also play a sound or show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico'
            });
        }
    }, [userId]);

    // Listen for system-wide notifications
    useEffect(() => {
        const systemNotificationsRef = ref(rtdb, 'systemNotifications');
        const unsubscribe = onValue(systemNotificationsRef, (snapshot) => {
            const data = snapshot.val();
            if (data && userId) {
                Object.entries(data).forEach(([id, notification]: [string, any]) => {
                    // Check if this notification is for all users or specifically for this user
                    if (notification.target === 'all' || notification.targetUserId === userId) {
                        addNotification({
                            userId,
                            type: notification.type || 'info',
                            title: notification.title,
                            message: notification.message,
                            actionUrl: notification.actionUrl,
                            actionText: notification.actionText,
                            metadata: notification.metadata
                        });
                        
                        // Remove system notification after processing
                        remove(ref(rtdb, `systemNotifications/${id}`));
                    }
                });
            }
        });

        return () => unsubscribe();
    }, [userId, addNotification]);

    const markAsRead = (notificationId: string) => {
        if (!userId) return;

        const notificationRef = ref(rtdb, `notifications/${userId}/${notificationId}`);
        update(notificationRef, { read: true });
    };

    const markAllAsRead = () => {
        if (!userId) return;

        const updates: { [key: string]: boolean } = {};
        notifications.forEach(notification => {
            if (!notification.read) {
                updates[`notifications/${userId}/${notification.id}/read`] = true;
            }
        });

        if (Object.keys(updates).length > 0) {
            update(ref(rtdb), updates);
        }
    };

    const clearNotification = (notificationId: string) => {
        if (!userId) return;

        const notificationRef = ref(rtdb, `notifications/${userId}/${notificationId}`);
        remove(notificationRef);
    };

    const clearAllNotifications = () => {
        if (!userId) return;

        const notificationsRef = ref(rtdb, `notifications/${userId}`);
        remove(notificationsRef);
    };

    const sendSystemNotification = (title: string, message: string, type: Notification['type'] = 'info') => {
        const systemNotificationRef = ref(rtdb, 'systemNotifications');
        const systemNotification = {
            title,
            message,
            type,
            target: 'all',
            timestamp: serverTimestamp()
        };

        push(systemNotificationRef, systemNotification);
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(() => ({
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        sendSystemNotification
    }), [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotification, clearAllNotifications, sendSystemNotification]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
