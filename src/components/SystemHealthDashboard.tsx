import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Paper,
    LinearProgress,
    Avatar,
    Chip,
    IconButton,
    Tooltip,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Alert,
    Collapse,
    useTheme,
    alpha
} from '@mui/material';
import {
    CheckCircle,
    Warning,
    Error,
    Refresh,
    ExpandMore,
    ExpandLess,
    Timeline,
    Memory,
    Speed,
    People,
    CloudQueue,
    BugReport,
    TrendingUp,
    TrendingDown,
    Info
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    Filler
} from 'chart.js';
import { useErrorMonitoring, SystemHealth, ErrorEvent } from '../contexts/ErrorMonitoringContext';
import { useNotifications } from '../contexts/NotificationContext';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    ChartTooltip,
    Legend,
    Filler
);

interface HealthCheck {
    name: string;
    status: 'ok' | 'warning' | 'error';
    value: number;
    unit: string;
    lastCheck: string;
    icon: React.ReactNode;
    description: string;
    trend?: 'up' | 'down' | 'stable';
}

const SystemHealthDashboard: React.FC = () => {
    const theme = useTheme();
    const { systemHealth, errors, performanceMetrics, runHealthCheck, resolveError } = useErrorMonitoring();
    const { addNotification } = useNotifications();
    const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await runHealthCheck();
            addNotification({
                userId: '',
                type: 'success',
                title: 'Health Check Complete',
                message: 'System health has been refreshed'
            });
        } catch (error) {
            addNotification({
                userId: '',
                type: 'error',
                title: 'Health Check Failed',
                message: 'Unable to complete health check'
            });
        } finally {
            setRefreshing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ok':
                return theme.palette.success.main;
            case 'warning':
                return theme.palette.warning.main;
            case 'error':
            case 'critical':
                return theme.palette.error.main;
            default:
                return theme.palette.grey[500];
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ok':
                return <CheckCircle sx={{ color: theme.palette.success.main }} />;
            case 'warning':
                return <Warning sx={{ color: theme.palette.warning.main }} />;
            case 'error':
            case 'critical':
                return <Error sx={{ color: theme.palette.error.main }} />;
            default:
                return <Info sx={{ color: theme.palette.grey[500] }} />;
        }
    };

    const getHealthChecks = (): HealthCheck[] => [
        {
            name: 'Firebase Connection',
            status: systemHealth.checks.firebase.status,
            value: systemHealth.checks.firebase.latency,
            unit: 'ms',
            lastCheck: systemHealth.checks.firebase.lastCheck,
            icon: <CloudQueue />,
            description: 'Database connectivity and response time',
            trend: systemHealth.checks.firebase.latency < 500 ? 'stable' : 'up'
        },
        {
            name: 'Page Performance',
            status: systemHealth.checks.performance.status,
            value: systemHealth.checks.performance.loadTime,
            unit: 'ms',
            lastCheck: systemHealth.checks.performance.lastCheck,
            icon: <Speed />,
            description: 'Average page load time',
            trend: systemHealth.checks.performance.loadTime < 3000 ? 'stable' : 'up'
        },
        {
            name: 'Memory Usage',
            status: systemHealth.checks.memory.status,
            value: systemHealth.checks.memory.usage,
            unit: '%',
            lastCheck: systemHealth.checks.memory.lastCheck,
            icon: <Memory />,
            description: 'JavaScript heap memory usage',
            trend: systemHealth.checks.memory.usage < 70 ? 'stable' : 'up'
        },
        {
            name: 'Error Rate',
            status: systemHealth.checks.errors.status,
            value: systemHealth.checks.errors.count,
            unit: 'errors/hr',
            lastCheck: systemHealth.checks.errors.lastCheck,
            icon: <BugReport />,
            description: 'Recent error occurrences',
            trend: systemHealth.checks.errors.count === 0 ? 'stable' : 'up'
        },
        {
            name: 'Active Users',
            status: systemHealth.checks.users.status,
            value: systemHealth.checks.users.activeCount,
            unit: 'users',
            lastCheck: systemHealth.checks.users.lastCheck,
            icon: <People />,
            description: 'Currently online users',
            trend: systemHealth.checks.users.activeCount > 0 ? 'stable' : 'down'
        }
    ];

    const getTrendIcon = (trend?: string) => {
        switch (trend) {
            case 'up':
                return <TrendingUp sx={{ color: theme.palette.error.main, fontSize: 16 }} />;
            case 'down':
                return <TrendingDown sx={{ color: theme.palette.success.main, fontSize: 16 }} />;
            default:
                return <Timeline sx={{ color: theme.palette.info.main, fontSize: 16 }} />;
        }
    };

    const getProgressValue = (check: HealthCheck) => {
        if (check.unit === 'ms') {
            return Math.min(100, (check.value / 3000) * 100);
        }
        if (check.unit === '%') {
            return check.value;
        }
        return check.unit === 'errors/hr' ? Math.min(100, check.value * 20) : Math.min(100, check.value * 10);
    };

    const recentErrors = errors.filter(e => !e.resolved).slice(0, 5);

    const performanceChartData = {
        labels: performanceMetrics.slice(-10).map(m => new Date(m.timestamp).toLocaleTimeString()),
        datasets: [{
            label: 'Response Time (ms)',
            data: performanceMetrics.slice(-10).map(m => m.value),
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            tension: 0.4,
            fill: true
        }]
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: getStatusColor(systemHealth.status) }}>
                            {getStatusIcon(systemHealth.status)}
                        </Avatar>
                        System Health Monitor
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Overall Score: {systemHealth.overallScore.toFixed(1)}% • Last updated: {new Date(systemHealth.lastUpdated).toLocaleTimeString()}
                    </Typography>
                </Box>
                <Tooltip title="Run Health Check">
                    <IconButton onClick={handleRefresh} disabled={refreshing}>
                        <Refresh sx={{ 
                            animation: refreshing ? 'spin 1s linear infinite' : 'none',
                            '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' }
                            }
                        }} />
                    </IconButton>
                </Tooltip>
            </Box>

            {/* System Status Alert */}
            {systemHealth.status !== 'healthy' && (
                <Alert 
                    severity={systemHealth.status === 'critical' ? 'error' : 'warning'} 
                    sx={{ mb: 3 }}
                    action={
                        <IconButton size="small" onClick={handleRefresh}>
                            <Refresh />
                        </IconButton>
                    }
                >
                    <Typography variant="subtitle2">
                        System Status: {systemHealth.status.toUpperCase()}
                    </Typography>
                    <Typography variant="body2">
                        {systemHealth.status === 'critical' 
                            ? 'Critical issues detected requiring immediate attention'
                            : 'Some components need attention'
                        }
                    </Typography>
                </Alert>
            )}

            {/* Health Check Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {getHealthChecks().map((check, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={2.4} key={index}>
                        <Card 
                            sx={{ 
                                height: '100%',
                                background: `linear-gradient(135deg, ${alpha(getStatusColor(check.status), 0.05)} 0%, ${alpha(getStatusColor(check.status), 0.1)} 100%)`,
                                border: `1px solid ${alpha(getStatusColor(check.status), 0.2)}`
                            }}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Avatar sx={{ bgcolor: getStatusColor(check.status), mr: 2, width: 40, height: 40 }}>
                                        {check.icon}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                            {check.name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {getStatusIcon(check.status)}
                                            <Typography variant="caption" color="text.secondary">
                                                {check.status}
                                            </Typography>
                                            {getTrendIcon(check.trend)}
                                        </Box>
                                    </Box>
                                </Box>
                                
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                        {check.value} {check.unit}
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={getProgressValue(check)} 
                                        sx={{ 
                                            mt: 1,
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: alpha(getStatusColor(check.status), 0.2),
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: getStatusColor(check.status)
                                            }
                                        }}
                                    />
                                </Box>
                                
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    {check.description}
                                </Typography>
                                
                                <Typography variant="caption" color="text.secondary">
                                    Last check: {new Date(check.lastCheck).toLocaleTimeString()}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Performance Chart */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Performance Metrics
                        </Typography>
                        <Box sx={{ height: 250 }}>
                            <Line 
                                data={performanceChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            grid: {
                                                color: alpha(theme.palette.divider, 0.1)
                                            }
                                        },
                                        x: {
                                            grid: {
                                                display: false
                                            }
                                        }
                                    }
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Recent Errors
                        </Typography>
                        <List sx={{ maxHeight: 250, overflow: 'auto' }}>
                            {recentErrors.length === 0 ? (
                                <ListItem>
                                    <ListItemText 
                                        primary="No recent errors"
                                        secondary="System is running smoothly"
                                    />
                                </ListItem>
                            ) : (
                                recentErrors.map((error) => (
                                    <ListItem key={error.id} sx={{ pb: 1 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            {getStatusIcon(error.level)}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                        {error.type}
                                                    </Typography>
                                                    <Chip 
                                                        label={error.level} 
                                                        size="small" 
                                                        color={error.level === 'critical' ? 'error' : error.level === 'error' ? 'warning' : 'default'}
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="text.secondary">
                                                    {error.message.substring(0, 50)}...
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            {/* Detailed Error List */}
            <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                        Error Log ({errors.length} total)
                    </Typography>
                </Box>
                
                <List>
                    {errors.slice(0, 10).map((error, index) => (
                        <React.Fragment key={error.id}>
                            <ListItem 
                                sx={{ 
                                    bgcolor: error.resolved ? alpha(theme.palette.success.main, 0.05) : alpha(theme.palette.error.main, 0.05),
                                    mb: 1,
                                    borderRadius: 1
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    {getStatusIcon(error.level)}
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                {error.type}
                                            </Typography>
                                            <Chip 
                                                label={error.level} 
                                                size="small" 
                                                color={error.level === 'critical' ? 'error' : error.level === 'error' ? 'warning' : 'default'}
                                            />
                                            {error.resolved && (
                                                <Chip label="Resolved" size="small" color="success" />
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                {error.message}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(error.timestamp).toLocaleString()} • {error.userAgent}
                                            </Typography>
                                        </Box>
                                    }
                                />
                                <IconButton 
                                    size="small" 
                                    onClick={() => setExpanded(prev => ({ ...prev, [error.id]: !prev[error.id] }))}
                                >
                                    {expanded[error.id] ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                            </ListItem>
                            
                            <Collapse in={expanded[error.id]} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                        <strong>Source:</strong> {error.source.file}:{error.source.line}:{error.source.column}
                                    </Typography>
                                    {error.stack && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                            <strong>Stack Trace:</strong>
                                            {error.stack}
                                        </Typography>
                                    )}
                                </Box>
                            </Collapse>
                        </React.Fragment>
                    ))}
                </List>
            </Paper>
        </Box>
    );
};

export default SystemHealthDashboard;
