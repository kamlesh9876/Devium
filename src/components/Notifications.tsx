import React, { useState, useEffect, useMemo, memo } from 'react';
import {
    Badge,
    IconButton,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Typography,
    Box,
    Paper,
    Button,
    Chip,
    Divider,
    Tooltip,
    Menu,
    MenuItem,
    Fade,
    useTheme,
    Alert,
    AlertTitle
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    NotificationsNone as NotificationsNoneIcon,
    Done as DoneIcon,
    Clear as ClearIcon,
    Delete as DeleteIcon,
    Info as InfoIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Person as PersonIcon,
    SystemUpdate as SystemIcon
} from '@mui/icons-material';
import { useNotifications, Notification } from '../contexts/NotificationContext';

const NotificationItem: React.FC<{ notification: Notification }> = memo(({ notification }) => {
    const { markAsRead, clearNotification } = useNotifications();
    const theme = useTheme();

    const getIcon = () => {
        switch (notification.type) {
            case 'success':
                return <CheckCircleIcon sx={{ color: theme.palette.success.main }} />;
            case 'warning':
                return <WarningIcon sx={{ color: theme.palette.warning.main }} />;
            case 'error':
                return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
            case 'user_online':
                return <PersonIcon sx={{ color: theme.palette.success.main }} />;
            case 'user_offline':
                return <PersonIcon sx={{ color: theme.palette.grey[500] }} />;
            case 'system_alert':
                return <SystemIcon sx={{ color: theme.palette.info.main }} />;
            default:
                return <InfoIcon sx={{ color: theme.palette.info.main }} />;
        }
    };

    const getTimeAgo = (timestamp: string) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now.getTime() - time.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return `${Math.floor(diffMins / 1440)}d ago`;
    };

    return (
        <ListItem
            sx={{
                bgcolor: notification.read ? 'transparent' : 'action.hover',
                '&:hover': { bgcolor: 'action.selected' }
            }}
        >
            <ListItemIcon sx={{ minWidth: 40 }}>
                {getIcon()}
            </ListItemIcon>
            <ListItemText
                primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                            {notification.title}
                        </Typography>
                        {!notification.read && (
                            <Chip label="New" size="small" color="primary" />
                        )}
                    </Box>
                }
                secondary={
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {getTimeAgo(notification.timestamp)}
                        </Typography>
                        {notification.actionUrl && (
                            <Button
                                size="small"
                                href={notification.actionUrl}
                                sx={{ mt: 1, mr: 1 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {notification.actionText || 'View'}
                            </Button>
                        )}
                    </Box>
                }
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {!notification.read && (
                    <Tooltip title="Mark as read">
                        <IconButton
                            size="small"
                            onClick={() => markAsRead(notification.id)}
                        >
                            <DoneIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                <Tooltip title="Delete">
                    <IconButton
                        size="small"
                        onClick={() => clearNotification(notification.id)}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </ListItem>
    );
});

export const NotificationCenter: React.FC = memo(() => {
    const { notifications, unreadCount, markAllAsRead, clearAllNotifications } = useNotifications();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMarkAllRead = () => {
        markAllAsRead();
        handleClose();
    };

    const handleClearAll = () => {
        clearAllNotifications();
        handleClose();
    };

    // Memoize notification items to prevent unnecessary re-renders
    const notificationItems = useMemo(() => 
        notifications.slice(0, 10).map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
        )), [notifications]);

    return (
        <>
            <Tooltip title="Notifications">
                <IconButton
                    color="inherit"
                    onClick={handleClick}
                    sx={{ position: 'relative' }}
                >
                    {unreadCount > 0 ? (
                        <Badge badgeContent={unreadCount} color="error">
                            <NotificationsIcon />
                        </Badge>
                    ) : (
                        <NotificationsNoneIcon />
                    )}
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        width: 360,
                        maxHeight: 480,
                        overflow: 'auto'
                    }
                }}
            >
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6">Notifications</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {unreadCount} unread
                    </Typography>
                </Box>

                {notifications.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography color="text.secondary">No notifications</Typography>
                    </Box>
                ) : (
                    <>
                        <List sx={{ p: 0 }}>
                            {notificationItems}
                        </List>
                        {notifications.length > 0 && (
                            <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
                                <Button
                                    size="small"
                                    onClick={handleMarkAllRead}
                                    disabled={unreadCount === 0}
                                    sx={{ mr: 1 }}
                                >
                                    Mark all as read
                                </Button>
                                <Button
                                    size="small"
                                    onClick={handleClearAll}
                                    color="error"
                                >
                                    Clear all
                                </Button>
                            </Box>
                        )}
                    </>
                )}
            </Menu>
        </>
    );
});

export const NotificationToast: React.FC = memo(() => {
    const { notifications } = useNotifications();
    const [visibleNotifications, setVisibleNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        // Show only the latest unread notification as a toast
        const latestUnread = notifications.find(n => !n.read);
        if (latestUnread && !visibleNotifications.find(n => n.id === latestUnread.id)) {
            setVisibleNotifications(prev => [...prev, latestUnread]);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                setVisibleNotifications(prev => prev.filter(n => n.id !== latestUnread.id));
            }, 5000);
        }
    }, [notifications]);

    // Memoize toast elements to prevent unnecessary re-renders
    const toastElements = useMemo(() => 
        visibleNotifications.map((notification) => (
            <Alert
                key={notification.id}
                severity={notification.type === 'error' ? 'error' : notification.type === 'warning' ? 'warning' : notification.type === 'success' ? 'success' : 'info'}
                sx={{ mb: 1 }}
                onClose={() => setVisibleNotifications(prev => prev.filter(n => n.id !== notification.id))}
            >
                <AlertTitle>{notification.title}</AlertTitle>
                {notification.message}
            </Alert>
        )), [visibleNotifications]);

    return (
        <Box
            sx={{
                position: 'fixed',
                top: 20,
                right: 20,
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: 1
            }}
        >
            {toastElements}
        </Box>
    );
});
