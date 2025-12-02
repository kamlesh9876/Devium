import React, { useEffect, useState } from 'react';
import { Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, Button, Divider, IconButton, Badge, Menu, MenuItem } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationCenter } from '../components/Notifications';
import { rtdb } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BugReportIcon from '@mui/icons-material/BugReport';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MonitorIcon from '@mui/icons-material/Monitor';
import SecurityIcon from '@mui/icons-material/Security';
import TimelineIcon from '@mui/icons-material/Timeline';
import UploadIcon from '@mui/icons-material/Upload';
import FlagIcon from '@mui/icons-material/Flag';
import ErrorIcon from '@mui/icons-material/Error';

const drawerWidth = 240;

interface UserNotification {
    id: string;
    type: string;
    teamId?: string;
    teamName?: string;
    createdAt?: string;
    read?: boolean;
}

export default function DashboardLayout() {
    const { role, logout, user } = useAuth();
    const navigate = useNavigate();

    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/', roles: ['admin', 'manager', 'developer', 'tester'] },
        { text: 'User Analytics', icon: <AnalyticsIcon />, path: '/analytics', roles: ['admin', 'manager', 'developer', 'tester'] },
        { text: 'Family', icon: <PeopleIcon />, path: '/family', roles: ['admin', 'manager'] },
        { text: 'Projects', icon: <AssignmentIcon />, path: '/projects', roles: ['manager', 'developer'] },
        { text: 'Bugs', icon: <BugReportIcon />, path: '/bugs', roles: ['tester', 'developer'] },
    ];

    const adminMenuItems = [
        { text: 'Admin Analytics', icon: <AnalyticsIcon />, path: '/admin-analytics', roles: ['admin'] },
        { text: 'User Management', icon: <PeopleIcon />, path: '/admin-users', roles: ['admin'] },
        { text: 'System Health', icon: <MonitorIcon />, path: '/system-health', roles: ['admin'] },
        { text: 'Security Audit', icon: <SecurityIcon />, path: '/security-audit', roles: ['admin'] },
        { text: 'User Activity', icon: <TimelineIcon />, path: '/user-activity', roles: ['admin'] },
        { text: 'Bulk Operations', icon: <UploadIcon />, path: '/bulk-operations', roles: ['admin'] },
        { text: 'Feature Flags', icon: <FlagIcon />, path: '/feature-flags', roles: ['admin'] },
        { text: 'Error Logs', icon: <ErrorIcon />, path: '/error-logs', roles: ['admin'] },
    ];

    // Debug logging
    console.log('DashboardLayout - Current role:', role);
    console.log('DashboardLayout - User:', user);
    console.log('DashboardLayout - Menu items filtered:', menuItems.filter(item => item.roles.includes(role || '')));
    console.log('DashboardLayout - Admin menu items filtered:', role === 'admin' ? adminMenuItems.filter(item => item.roles.includes(role || '')) : []);

    useEffect(() => {
        if (!user?.uid) return;

        const notifRef = ref(rtdb, `notifications/${user.uid}`);
        const unsubscribe = onValue(notifRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list: UserNotification[] = Object.entries(data).map(([id, value]: [string, any]) => ({
                id,
                type: value.type || 'info',
                teamId: value.teamId,
                teamName: value.teamName,
                createdAt: value.createdAt,
                read: !!value.read,
            }));
            // Newest first
            list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            setNotifications(list);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
        setNotifAnchorEl(event.currentTarget);

        // Mark all as read
        if (!user?.uid || notifications.length === 0) return;
        const updates: { [path: string]: any } = {};
        notifications.forEach((n) => {
            if (!n.read) {
                updates[`notifications/${user.uid}/${n.id}/read`] = true;
            }
        });
        if (Object.keys(updates).length > 0) {
            update(ref(rtdb), updates).catch((err) => console.error('Failed to mark notifications read', err));
        }
    };

    const handleCloseNotifications = () => {
        setNotifAnchorEl(null);
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        Welcome, {user?.name || 'User'}
                    </Typography>
                    {user && (
                        <>
                            <IconButton color="inherit" onClick={handleOpenNotifications} sx={{ mr: 1 }}>
                                <Badge color="error" badgeContent={notifications.filter(n => !n.read).length}>
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                            <Menu
                                anchorEl={notifAnchorEl}
                                open={Boolean(notifAnchorEl)}
                                onClose={handleCloseNotifications}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            >
                                {notifications.length === 0 ? (
                                    <MenuItem disabled>
                                        <ListItemText primary="No notifications" />
                                    </MenuItem>
                                ) : (
                                    notifications.slice(0, 10).map((n) => (
                                        <MenuItem key={n.id} dense>
                                            <ListItemText
                                                primary={
                                                    n.type === 'team_assigned'
                                                        ? `Assigned to team ${n.teamName || n.teamId}`
                                                        : 'New notification'
                                                }
                                                secondary={
                                                    n.createdAt
                                                        ? new Date(n.createdAt).toLocaleString()
                                                        : undefined
                                                }
                                            />
                                        </MenuItem>
                                    ))
                                )}
                            </Menu>
                        </>
                    )}
                    <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    [`& .MuiDrawer-paper`]: { 
                        width: drawerWidth, 
                        boxSizing: 'border-box',
                        backgroundColor: 'background.paper',
                        borderRight: '1px solid rgba(255, 255, 255, 0.12)'
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto' }}>
                    <List>
                        {menuItems.filter(item => item.roles.includes(role || '')).map((item) => (
                            <ListItem 
                                button 
                                key={item.text} 
                                onClick={() => navigate(item.path)}
                                sx={{
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    }
                                }}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItem>
                        ))}
                        
                        {role === 'admin' && (
                            <>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', fontWeight: 'medium' }}>
                                    <AdminPanelSettingsIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'middle' }} />
                                    Admin Tools
                                </Typography>
                                {adminMenuItems.filter(item => item.roles.includes(role || '')).map((item) => (
                                    <ListItem 
                                        button 
                                        key={item.text} 
                                        onClick={() => navigate(item.path)}
                                        sx={{
                                            '&:hover': {
                                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                            }
                                        }}
                                    >
                                        <ListItemIcon>{item.icon}</ListItemIcon>
                                        <ListItemText primary={item.text} />
                                    </ListItem>
                                ))}
                            </>
                        )}
                    </List>
                </Box>
            </Drawer>
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
                <Toolbar />
                <Outlet />
            </Box>
        </Box>
    );
}
