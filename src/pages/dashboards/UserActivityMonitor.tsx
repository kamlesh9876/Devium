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
    LinearProgress,
    Avatar,
    IconButton,
    Tooltip,
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
    Login as LoginIcon,
    Logout as LogoutIcon,
    Create as CreateIcon,
    Delete as DeleteIcon,
    Update as UpdateIcon,
    Search as SearchIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
import { Line, Bar, Pie } from 'react-chartjs-2';
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
    loginTime: string;
    lastActivity: string;
    duration: number;
    isActive: boolean;
    actionsCount: number;
    pagesViewed: string[];
    ipAddress: string;
}

interface ActivityStats {
    totalUsers: number;
    activeUsers: number;
    totalActions: number;
    avgSessionDuration: number;
    topPages: Array<{ page: string; views: number }>;
    actionBreakdown: Array<{ action: string; count: number }>;
    hourlyActivity: Array<{ hour: number; actions: number }>;
}

const UserActivityMonitor: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [stats, setStats] = useState<ActivityStats>({
        totalUsers: 0,
        activeUsers: 0,
        totalActions: 0,
        avgSessionDuration: 0,
        topPages: [],
        actionBreakdown: [],
        hourlyActivity: []
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userFilter, setUserFilter] = useState('all');

    useEffect(() => {
        // Generate sample user activity data
        const sampleActivities: UserActivity[] = [
            {
                id: '1',
                userId: 'user1',
                userName: 'John Doe',
                userEmail: 'john@example.com',
                action: 'PAGE_VIEW',
                resource: '/dashboard',
                details: 'Viewed admin dashboard',
                timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                sessionId: 'session1',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                duration: 45000
            },
            {
                id: '2',
                userId: 'user1',
                userName: 'John Doe',
                userEmail: 'john@example.com',
                action: 'PROJECT_EDIT',
                resource: '/projects/123',
                details: 'Edited project "Website Redesign"',
                timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
                sessionId: 'session1',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                duration: 120000
            },
            {
                id: '3',
                userId: 'user2',
                userName: 'Jane Smith',
                userEmail: 'jane@example.com',
                action: 'USER_CREATE',
                resource: '/users',
                details: 'Created new user "mike@example.com"',
                timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                sessionId: 'session2',
                ipAddress: '192.168.1.101',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                duration: 30000
            },
            {
                id: '4',
                userId: 'user3',
                userName: 'Mike Johnson',
                userEmail: 'mike@example.com',
                action: 'FILE_UPLOAD',
                resource: '/projects/456/files',
                details: 'Uploaded file "design.pdf"',
                timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
                sessionId: 'session3',
                ipAddress: '192.168.1.102',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                duration: 60000
            },
            {
                id: '5',
                userId: 'user1',
                userName: 'John Doe',
                userEmail: 'john@example.com',
                action: 'DATA_EXPORT',
                resource: '/analytics/export',
                details: 'Exported user analytics (CSV)',
                timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                sessionId: 'session1',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                duration: 90000
            }
        ];

        const sampleSessions: UserSession[] = [
            {
                id: 'session1',
                userId: 'user1',
                userName: 'John Doe',
                userEmail: 'john@example.com',
                loginTime: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                lastActivity: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                duration: 55 * 60 * 1000, // 55 minutes
                isActive: true,
                actionsCount: 15,
                pagesViewed: ['/dashboard', '/projects', '/projects/123', '/analytics'],
                ipAddress: '192.168.1.100'
            },
            {
                id: 'session2',
                userId: 'user2',
                userName: 'Jane Smith',
                userEmail: 'jane@example.com',
                loginTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                lastActivity: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                duration: 15 * 60 * 1000, // 15 minutes
                isActive: false,
                actionsCount: 8,
                pagesViewed: ['/dashboard', '/users', '/teams'],
                ipAddress: '192.168.1.101'
            },
            {
                id: 'session3',
                userId: 'user3',
                userName: 'Mike Johnson',
                userEmail: 'mike@example.com',
                loginTime: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
                lastActivity: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
                duration: 25 * 60 * 1000, // 25 minutes
                isActive: false,
                actionsCount: 12,
                pagesViewed: ['/dashboard', '/projects', '/projects/456'],
                ipAddress: '192.168.1.102'
            }
        ];

        const sampleStats: ActivityStats = {
            totalUsers: 3,
            activeUsers: 1,
            totalActions: 35,
            avgSessionDuration: 31.7 * 60 * 1000, // 31.7 minutes
            topPages: [
                { page: '/dashboard', views: 45 },
                { page: '/projects', views: 28 },
                { page: '/users', views: 15 },
                { page: '/analytics', views: 12 },
                { page: '/teams', views: 8 }
            ],
            actionBreakdown: [
                { action: 'PAGE_VIEW', count: 25 },
                { action: 'PROJECT_EDIT', count: 8 },
                { action: 'USER_CREATE', count: 3 },
                { action: 'FILE_UPLOAD', count: 2 },
                { action: 'DATA_EXPORT', count: 1 }
            ],
            hourlyActivity: Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                actions: Math.floor(Math.random() * 20) + (i >= 9 && i <= 17 ? 10 : 0)
            }))
        };

        setActivities(sampleActivities);
        setSessions(sampleSessions);
        setStats(sampleStats);
        setLoading(false);
    }, []);

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

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    // Chart data
    const hourlyActivityData = {
        labels: stats.hourlyActivity.map(h => `${h.hour}:00`),
        datasets: [
            {
                label: 'User Activity',
                data: stats.hourlyActivity.map(h => h.actions),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4,
                fill: true
            }
        ]
    };

    const actionBreakdownData = {
        labels: stats.actionBreakdown.map(a => a.action.replace('_', ' ')),
        datasets: [
            {
                data: stats.actionBreakdown.map(a => a.count),
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
        labels: stats.topPages.map(p => p.page),
        datasets: [
            {
                label: 'Page Views',
                data: stats.topPages.map(p => p.views),
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
                                {formatDuration(stats.avgSessionDuration)}
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
                    onChange={(e, newValue) => setActiveTab(newValue)}
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
                                        <TableCell>Action</TableCell>
                                        <TableCell>Resource</TableCell>
                                        <TableCell>Details</TableCell>
                                        <TableCell>Duration</TableCell>
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
                                                        Duration: {formatDuration(session.duration)} • Actions: {session.actionsCount}
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
