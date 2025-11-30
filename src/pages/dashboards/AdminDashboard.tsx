import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { rtdb } from '../../firebase';

import {
    Refresh as RefreshIcon,
    CheckCircle as CheckCircleIcon,
    People as PeopleIcon,
    Person as PersonIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Search as SearchIcon,
    AdminPanelSettings as AdminPanelSettingsIcon,
    Analytics as AnalyticsIcon,
    AccessTime as AccessTimeIcon,
    Group as GroupIcon,
    BugReport as BugReportIcon
} from '@mui/icons-material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
    Grid,
    Paper,
    Typography,
    Box,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Avatar,
    LinearProgress,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Divider,
    Tooltip,
    InputAdornment,
    Fab
} from '@mui/material';

interface User {
    uid: string;
    email: string;
    name: string;
    role: string;
    status: string;
    lastLogin: string;
    password?: string;
    createdAt?: string;
}

interface Stats {
    totalUsers: number;
    adminCount: number;
    managerCount: number;
    developerCount: number;
    testerCount: number;
    onlineUsers: number;
    activeUsers: number;
    inactiveUsers: number;
}

interface StatCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
}

const StatCardComponent = ({ title, value, icon, color, subtitle }: StatCardProps) => (
    <Card sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
        borderRadius: 2,
        overflow: 'visible',
        position: 'relative',
        '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 25px 0 ${color}40`,
        },
        transition: 'all 0.3s ease-in-out',
    }}>
        <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    {title}
                </Typography>
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: `${color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: color,
                    }}
                >
                    {React.cloneElement(icon as React.ReactElement, { fontSize: 'small' })}
                </Box>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: color, mb: 0.5 }}>
                {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
                {subtitle}
            </Typography>
        </CardContent>
    </Card>
);

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState<Stats>({
        totalUsers: 0,
        adminCount: 0,
        managerCount: 0,
        developerCount: 0,
        testerCount: 0,
        onlineUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
    });
    const [loading, setLoading] = useState(true);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [recentActivity, setRecentActivity] = useState<User[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Filter users based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user => 
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.role.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    const safeDateParse = (dateString: string): Date | null => {
        try {
            if (!dateString) return null;
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date;
        } catch (e) {
            console.warn('Failed to parse date:', dateString, e);
            return null;
        }
    };

    useEffect(() => {
        let isMounted = true;
        
        const loadData = async () => {
            try {
                const usersRef = ref(rtdb, 'users');
                const unsubscribe = onValue(usersRef, (snapshot) => {
                    try {
                        if (!isMounted) return;
                        
                        const data = snapshot.val();
                        if (!data) {
                            console.log('No data available');
                            setLoading(false);
                            setError('No user data available');
                            return;
                        }

                        const usersList: User[] = Object.entries(data).map(([uid, userData]: [string, any]) => {
                            const lastLogin = userData?.lastLogin || '';
                            const loginDate = safeDateParse(lastLogin);
                            
                            return {
                                uid,
                                email: userData?.email || '',
                                name: userData?.name || 'Unknown',
                                role: userData?.role || 'guest',
                                status: userData?.status || 'offline',
                                lastLogin: loginDate ? loginDate.toISOString() : '',
                                createdAt: userData?.createdAt || new Date().toISOString(),
                            };
                        });

                        setUsers(usersList);

                        // Calculate stats
                        const newStats: Stats = {
                            totalUsers: usersList.length,
                            adminCount: usersList.filter(u => u.role === 'admin').length,
                            managerCount: usersList.filter(u => u.role === 'manager').length,
                            developerCount: usersList.filter(u => u.role === 'developer').length,
                            testerCount: usersList.filter(u => u.role === 'tester').length,
                            onlineUsers: usersList.filter(u => u.status === 'online').length,
                            activeUsers: usersList.filter(u => u.status === 'active' || u.status === 'online').length,
                            inactiveUsers: usersList.filter(u => u.status === 'inactive' || u.status === 'offline').length,
                        };
                        setStats(newStats);

                        // Get recent activity (last 5 logins)
                        const recent = [...usersList]
                            .filter(u => u.lastLogin)
                            .sort((a, b) => {
                                try {
                                    const dateA = safeDateParse(a.lastLogin)?.getTime() || 0;
                                    const dateB = safeDateParse(b.lastLogin)?.getTime() || 0;
                                    return dateB - dateA;
                                } catch (e) {
                                    console.error('Error sorting dates:', e);
                                    return 0;
                                }
                            })
                            .slice(0, 5);
                        setRecentActivity(recent);
                        setError(null);
                    } catch (error) {
                        console.error('Error processing user data:', error);
                        setError('Failed to process user data');
                    } finally {
                        if (isMounted) {
                            setLoading(false);
                        }
                    }
                }, (error) => {
                    console.error('Firebase read failed:', error);
                    if (isMounted) {
                        setError('Failed to load data from server');
                        setLoading(false);
                    }
                });

                return () => {
                    try {
                        unsubscribe();
                    } catch (error) {
                        console.error('Error unsubscribing:', error);
                    }
                };
            } catch (error) {
                console.error('Error setting up Firebase listener:', error);
                if (isMounted) {
                    setError('Failed to initialize data loading');
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setEditDialogOpen(true);
    };

    const handleSaveUser = async () => {
        if (selectedUser) {
            try {
                await set(ref(rtdb, `users/${selectedUser.uid}`), {
                    ...selectedUser,
                    updatedAt: new Date().toISOString()
                });
                setEditDialogOpen(false);
            } catch (error) {
                console.error('Error updating user:', error);
                setError('Failed to update user');
            }
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            await remove(ref(rtdb, `users/${uid}`));
        }
    };

    const getRoleColor = (role: string) => {
        switch (role.toLowerCase()) {
            case 'admin': return 'error';
            case 'manager': return 'warning';
            case 'developer': return 'primary';
            case 'tester': return 'success';
            default: return 'default';
        }
    };

    const getDisplayStatus = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'active' || s === 'online') return 'Active';
        if (s === 'inactive' || s === 'offline') return 'Inactive';
        return status || 'Unknown';
    };

    const getTimeAgo = (dateString: string) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return <Box sx={{ width: '100%' }}><LinearProgress /></Box>;
    }

    const activePercentage = stats.totalUsers > 0
        ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
        : 0;

    // Dashboard: show only high-level company analytics
    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    Company Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Real-time overview of users and activity
                </Typography>
            </Box>

            {/* Expanded stats grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCardComponent
                        title="Total Users"
                        value={stats.totalUsers}
                        subtitle="All registered users"
                        icon={<PeopleIcon />}
                        color="#3b82f6"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCardComponent
                        title="Online Now"
                        value={stats.onlineUsers}
                        subtitle="Currently online"
                        icon={<CheckCircleIcon />}
                        color="#10b981"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCardComponent
                        title="Admins"
                        value={stats.adminCount}
                        subtitle="Admin accounts"
                        icon={<AdminPanelSettingsIcon />}
                        color="#ef4444"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCardComponent
                        title="Active Users %"
                        value={`${activePercentage}%`}
                        subtitle="Active vs total"
                        icon={<TrendingUpIcon />}
                        color="#8b5cf6"
                    />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <StatCardComponent
                        title="Managers"
                        value={stats.managerCount}
                        subtitle="Manager accounts"
                        icon={<GroupIcon />}
                        color="#f97316"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCardComponent
                        title="Developers"
                        value={stats.developerCount}
                        subtitle="Developer accounts"
                        icon={<PersonIcon />}
                        color="#22c55e"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCardComponent
                        title="Testers"
                        value={stats.testerCount}
                        subtitle="Tester accounts"
                        icon={<BugReportIcon />}
                        color="#eab308"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCardComponent
                        title="Inactive Users"
                        value={stats.inactiveUsers}
                        subtitle="Inactive or offline"
                        icon={<AccessTimeIcon />}
                        color="#6b7280"
                    />
                </Grid>
            </Grid>

            {/* Additional analytical breakdown */}
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Role & Status Breakdown
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            By Role
                        </Typography>
                        <List dense>
                            <ListItem>
                                <ListItemText
                                    primary={`Admins: ${stats.adminCount}`}
                                    secondary={stats.totalUsers ? `${Math.round((stats.adminCount / stats.totalUsers) * 100)}% of users` : '—'}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary={`Managers: ${stats.managerCount}`}
                                    secondary={stats.totalUsers ? `${Math.round((stats.managerCount / stats.totalUsers) * 100)}% of users` : '—'}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary={`Developers: ${stats.developerCount}`}
                                    secondary={stats.totalUsers ? `${Math.round((stats.developerCount / stats.totalUsers) * 100)}% of users` : '—'}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary={`Testers: ${stats.testerCount}`}
                                    secondary={stats.totalUsers ? `${Math.round((stats.testerCount / stats.totalUsers) * 100)}% of users` : '—'}
                                />
                            </ListItem>
                        </List>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            By Status
                        </Typography>
                        <List dense>
                            <ListItem>
                                <ListItemText
                                    primary={`Online: ${stats.onlineUsers}`}
                                    secondary={stats.totalUsers ? `${Math.round((stats.onlineUsers / stats.totalUsers) * 100)}% of users` : '—'}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary={`Active: ${stats.activeUsers}`}
                                    secondary={stats.totalUsers ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of users` : '—'}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary={`Inactive / Offline: ${stats.inactiveUsers}`}
                                    secondary={stats.totalUsers ? `${Math.round((stats.inactiveUsers / stats.totalUsers) * 100)}% of users` : '—'}
                                />
                            </ListItem>
                        </List>
                    </Grid>
                </Grid>
            </Paper>

            {/* Recent activity list */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Recent User Activity
                </Typography>
                <List sx={{ maxHeight: 260, overflow: 'auto' }}>
                    {recentActivity.length > 0 ? (
                        recentActivity.map((user, index) => (
                            <React.Fragment key={user.uid}>
                                <ListItem>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: getRoleColor(user.role) }}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={user.name}
                                        secondary={`Logged in ${getTimeAgo(user.lastLogin)}`}
                                        primaryTypographyProps={{ fontWeight: 'medium' }}
                                    />
                                    <Chip
                                        label={getDisplayStatus(user.status)}
                                        size="small"
                                        color={getDisplayStatus(user.status) === 'Active' ? 'success' : 'default'}
                                        variant="outlined"
                                    />
                                </ListItem>
                                {index < recentActivity.length - 1 && (
                                    <Divider variant="inset" component="li" />
                                )}
                            </React.Fragment>
                        ))
                    ) : (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ textAlign: 'center', py: 2 }}
                        >
                            No recent activity
                        </Typography>
                    )}
                </List>
            </Paper>
        </Box>
    );
}
