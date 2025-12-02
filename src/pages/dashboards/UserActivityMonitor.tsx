import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Avatar,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    TextField,
    Tab,
    Tabs,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider
} from '@mui/material';
import {
    Person as PersonIcon,
    Timeline as TimelineIcon,
    AccessTime as TimeIcon,
    TrendingUp as TrendingUpIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Download as DownloadIcon,
    Create as CreateIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    ChartTooltip,
    Legend,
    Filler
);

interface UserActivity {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    action: string;
    resource: string;
    details: string;
    timestamp: string;
    sessionId: string;
    ipAddress: string;
    userAgent: string;
    duration?: number;
}

interface UserSession {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userRole: string;
    loginTime: string;
    lastActivity: string;
    ipAddress: string;
    device: string;
    status: 'online' | 'offline' | 'away';
    currentPage: string;
    duration: string;
    actionsCount?: number;
    // Enhanced fields
    deviceInfo?: {
        browser?: string;
        os?: string;
        platform?: string;
        language?: string;
        screenResolution?: string;
        timezone?: string;
    };
    locationInfo?: {
        ip?: string;
        country?: string;
        city?: string;
        timezone?: string;
    };
    currentActivity?: string;
    isActive?: boolean;
    sessionId?: string;
    lastHeartbeat?: string;
}

interface ActivityStats {
    totalUsers: number;
    activeUsers: number;
    pageViews: number;
    avgSessionDuration: string;
    hourlyActivity?: Array<{ hour: number; actions: number }>;
    actionBreakdown?: Array<{ action: string; actions: number }>;
    topPages?: Array<{ page: string; views: number }>;
    totalActions?: number;
}

const UserActivityMonitor: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [stats, setStats] = useState<ActivityStats>({
        totalUsers: 0,
        activeUsers: 0,
        pageViews: 0,
        avgSessionDuration: '0m'
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userFilter, setUserFilter] = useState('all');

    useEffect(() => {
        setLoading(true);
        
        // Initialize with empty data - real data will come from Firebase
        setStats({
            totalUsers: 0,
            activeUsers: 0,
            pageViews: 0,
            avgSessionDuration: '0m'
        });
        setActivities([]);
        setSessions([]);
        setLoading(false);
    }, []);

    // Simple real-time presence tracking
    useEffect(() => {
        console.log('Setting up SIMPLE presence monitoring...');
        
        // Test Firebase connection first
        const testRef = ref(rtdb, '.info/connected');
        const testUnsub = onValue(testRef, (snap) => {
            console.log('Firebase connected:', snap.val());
        });
        
        const sessionsRef = ref(rtdb, 'sessions');
        const unsubscribe = onValue(sessionsRef, (snapshot) => {
            const data = snapshot.val();
            console.log('=== SESSIONS UPDATE ===');
            console.log('Raw data:', data);
            console.log('Data type:', typeof data);
            
            const onlineUsers: UserSession[] = [];
            
            if (data) {
                console.log('Processing sessions...');
                Object.keys(data).forEach(uid => {
                    const session = data[uid];
                    console.log(`Session ${uid}:`, session);
                    
                    // Check if user is online - either status is 'online' or status is missing (assume online)
                    const isOnline = session.status === 'online' || !session.status;
                    
                    if (isOnline) {
                        console.log('User is ONLINE, adding to list');
                        onlineUsers.push({
                            id: uid,
                            userId: uid,
                            userName: session.name || 'Unknown User',
                            userEmail: session.email || 'unknown@example.com',
                            userRole: session.role || 'unknown',
                            loginTime: session.connectedAt || new Date().toISOString(),
                            lastActivity: session.lastSeen || new Date().toISOString(),
                            ipAddress: session.location?.ip || 'N/A',
                            device: session.device?.browser ? `${session.device.browser} on ${session.device.os}` : 'Unknown Device',
                            status: 'online',
                            currentPage: session.currentPage || '/dashboard',
                            duration: calculateDuration(session.connectedAt),
                            // Enhanced fields
                            deviceInfo: session.device || {},
                            locationInfo: session.location || {},
                            currentActivity: session.currentActivity || 'active',
                            isActive: session.isActive !== false,
                            sessionId: session.sessionId || 'unknown',
                            lastHeartbeat: session.lastHeartbeat || session.lastSeen
                        });
                    } else {
                        console.log(`User ${uid} is not online (status: ${session?.status})`);
                    }
                });
            } else {
                console.log('No sessions data found');
            }
            
            console.log('=== FINAL RESULT ===');
            console.log('Online users count:', onlineUsers.length);
            console.log('Online users:', onlineUsers);
            
            setSessions(onlineUsers);
            setStats(prev => ({
                ...prev,
                activeUsers: onlineUsers.length,
                totalUsers: Math.max(prev.totalUsers, onlineUsers.length),
                avgSessionDuration: calculateAverageDuration(onlineUsers)
            }));
        });
        
        return () => {
            testUnsub();
            unsubscribe();
        };
    }, []);

    // Helper function to calculate session duration
    const calculateDuration = (connectedAt: string) => {
        const now = new Date();
        const connected = new Date(connectedAt);
        const diffMs = now.getTime() - connected.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 60) {
            return `${diffMins}m`;
        } else {
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            return `${hours}h ${mins}m`;
        }
    };

    // Helper function to calculate average session duration
    const calculateAverageDuration = (sessions: UserSession[]) => {
        if (sessions.length === 0) return '0m';
        
        const totalMinutes = sessions.reduce((total, session) => {
            const now = new Date();
            const connected = new Date(session.loginTime);
            const diffMs = now.getTime() - connected.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            return total + diffMins;
        }, 0);
        
        const avgMins = Math.floor(totalMinutes / sessions.length);
        
        if (avgMins < 60) {
            return `${avgMins}m`;
        } else {
            const hours = Math.floor(avgMins / 60);
            const mins = avgMins % 60;
            return `${hours}h ${mins}m`;
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'PAGE_VIEW': return <ViewIcon />;
            case 'PROJECT_EDIT': return <EditIcon />;
            case 'USER_CREATE': return <CreateIcon />;
            case 'FILE_UPLOAD': return <DownloadIcon />;
            case 'DATA_EXPORT': return <DownloadIcon />;
            default: return <TimelineIcon />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'PAGE_VIEW': return 'primary';
            case 'PROJECT_EDIT': return 'warning';
            case 'USER_CREATE': return 'success';
            case 'FILE_UPLOAD': return 'info';
            case 'DATA_EXPORT': return 'secondary';
            default: return 'default';
        }
    };

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    };

    const formatDurationString = (durationStr: string) => {
        return durationStr; // Already formatted as string
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    // Chart data
    const hourlyActivityData = {
        labels: (stats.hourlyActivity || []).map(h => `${h.hour}:00`),
        datasets: [
            {
                label: 'User Activity',
                data: (stats.hourlyActivity || []).map(h => h.actions),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4,
                fill: true
            }
        ]
    };

    const actionBreakdownData = {
        labels: (stats.actionBreakdown || []).map(a => a.action.replace('_', ' ')),
        datasets: [
            {
                data: (stats.actionBreakdown || []).map(a => a.actions),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)'
                ]
            }
        ]
    };

    const topPagesData = {
        labels: (stats.topPages || []).map(p => p.page),
        datasets: [
            {
                label: 'Page Views',
                data: (stats.topPages || []).map(p => p.views),
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }
        ]
    };

    const filteredActivities = activities.filter(activity => {
        const matchesSearch = searchTerm === '' || 
            activity.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            activity.resource.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesUser = userFilter === 'all' || activity.userId === userFilter;
        
        return matchesSearch && matchesUser;
    });

    const filteredSessions = sessions.filter(session => {
        const matchesSearch = searchTerm === '' || 
            session.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            session.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesUser = userFilter === 'all' || session.userId === userFilter;
        
        return matchesSearch && matchesUser;
    });

    if (loading) {
        return <Box sx={{ p: 3 }}>Loading user activity data...</Box>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                User Activity Monitor
            </Typography>
            
            {/* Debug indicator */}
            <Box sx={{ mb: 2, p: 2, bgcolor: 'warning.main', color: 'white', borderRadius: 1 }}>
                <Typography variant="body2">
                    🐛 DEBUG: Component is loaded! Check console for Firebase debug messages.
                </Typography>
                <Typography variant="body2">
                    Current online users: {sessions.length}
                </Typography>
            </Box>

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <PersonIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Total Users</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {stats.totalUsers}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <TrendingUpIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Active Now</Typography>
                            </Box>
                            <Typography variant="h4" color="success">
                                {stats.activeUsers}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <TimelineIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Total Actions</Typography>
                            </Box>
                            <Typography variant="h4" color="info">
                                {stats.totalActions}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <TimeIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Avg Session</Typography>
                            </Box>
                            <Typography variant="h4" color="warning">
                                {formatDurationString(stats.avgSessionDuration)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Hourly Activity Pattern
                            </Typography>
                            <Box sx={{ height: 300 }}>
                                <Line data={hourlyActivityData} options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false }
                                    }
                                }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Action Breakdown
                            </Typography>
                            <Box sx={{ height: 300 }}>
                                <Pie data={actionBreakdownData} options={{
                                    responsive: true,
                                    maintainAspectRatio: false
                                }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label="Recent Activity" />
                    <Tab label="Active Sessions" />
                    <Tab label="Top Pages" />
                </Tabs>

                {/* Filters */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                }}
                                size="small"
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Filter by User</InputLabel>
                                <Select
                                    value={userFilter}
                                    onChange={(e) => setUserFilter(e.target.value)}
                                >
                                    <MenuItem value="all">All Users</MenuItem>
                                    {sessions.map(session => (
                                        <MenuItem key={session.userId} value={session.userId}>
                                            {session.userName}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </Box>

                {/* Tab Content */}
                {activeTab === 0 && (
                    <Box sx={{ p: 2 }}>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Timestamp</TableCell>
                                        <TableCell>User</TableCell>
                                        <TableCell>Device</TableCell>
                                        <TableCell>Location</TableCell>
                                        <TableCell>Activity</TableCell>
                                        <TableCell>Session Time</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredActivities.map((activity) => (
                                        <TableRow key={activity.id} hover>
                                            <TableCell>
                                                {formatTimestamp(activity.timestamp)}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                                                        {activity.userName.charAt(0)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography variant="body2">
                                                            {activity.userName}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {activity.userEmail}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {getActionIcon(activity.action)}
                                                    <Chip
                                                        label={activity.action.replace('_', ' ')}
                                                        color={getActionColor(activity.action) as any}
                                                        size="small"
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                    {activity.resource}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {activity.details}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {activity.duration && (
                                                    <Typography variant="body2">
                                                        {formatDuration(activity.duration)}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {activeTab === 1 && (
                    <Box sx={{ p: 2 }}>
                        <List>
                            {filteredSessions.map((session) => (
                                <React.Fragment key={session.id}>
                                    <ListItem alignItems="flex-start">
                                        <ListItemIcon>
                                            <Avatar sx={{ bgcolor: session.isActive ? 'success.main' : 'grey.500' }}>
                                                {session.userName.charAt(0)}
                                            </Avatar>
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="subtitle1">
                                                        {session.userName}
                                                    </Typography>
                                                    <Chip
                                                        label={session.isActive ? 'Active' : 'Offline'}
                                                        color={session.isActive ? 'success' : 'default'}
                                                        size="small"
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <Box sx={{ mt: 1 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {session.userEmail}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Login: {formatTimestamp(session.loginTime)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Last Activity: {formatTimestamp(session.lastActivity)}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        Duration: {formatDurationString(session.duration)} • Actions: {session.actionsCount}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                        IP: {session.ipAddress}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    <Divider variant="inset" component="li" />
                                </React.Fragment>
                            ))}
                        </List>
                    </Box>
                )}

                {activeTab === 2 && (
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Most Viewed Pages
                        </Typography>
                        <Box sx={{ height: 300 }}>
                            <Bar data={topPagesData} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false }
                                }
                            }} />
                        </Box>
                    </Box>
                )}
            </Paper>
        </Box>
    );
};

export default UserActivityMonitor;
