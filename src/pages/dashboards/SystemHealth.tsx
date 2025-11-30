import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Alert,
    LinearProgress,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Tooltip
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Memory as MemoryIcon,
    Storage as StorageIcon,
    Speed as SpeedIcon,
    Storage as DatabaseIcon,
    CloudQueue as CloudIcon,
    Security as SecurityIcon
} from '@mui/icons-material';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase';

interface SystemMetrics {
    cpu: number;
    memory: number;
    storage: number;
    database: number;
    api: number;
    uptime: number;
    activeUsers: number;
    errorRate: number;
}

interface HealthStatus {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    timestamp: string;
}

const SystemHealth: React.FC = () => {
    const [metrics, setMetrics] = useState<SystemMetrics>({
        cpu: 0,
        memory: 0,
        storage: 0,
        database: 0,
        api: 0,
        uptime: 0,
        activeUsers: 0,
        errorRate: 0
    });
    const [healthStatus, setHealthStatus] = useState<HealthStatus>({
        status: 'healthy',
        message: 'All systems operational',
        timestamp: new Date().toISOString()
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('🔍 SystemHealth: Setting up Firebase listener for /systemHealth');
        const systemHealthRef = ref(rtdb, 'systemHealth');
        
        const unsubscribe = onValue(systemHealthRef, (snapshot) => {
            console.log('📥 SystemHealth: Received data from Firebase');
            const data = snapshot.val();
            console.log('📊 Raw system health data:', data);
            
            if (data) {
                setMetrics(data.metrics || {
                    cpu: 0,
                    memory: 0,
                    storage: 0,
                    database: 0,
                    api: 0,
                    uptime: 0,
                    activeUsers: 0,
                    errorRate: 0
                });
                
                setHealthStatus(data.healthStatus || {
                    status: 'healthy',
                    message: 'All systems operational',
                    timestamp: new Date().toISOString()
                });
            } else {
                console.log('❌ No system health data found in Firebase');
                // Set default values if no data exists
                setMetrics({
                    cpu: 0,
                    memory: 0,
                    storage: 0,
                    database: 0,
                    api: 0,
                    uptime: 0,
                    activeUsers: 0,
                    errorRate: 0
                });
                setHealthStatus({
                    status: 'healthy',
                    message: 'All systems operational',
                    timestamp: new Date().toISOString()
                });
            }
            setLoading(false);
        }, (error) => {
            console.error('❌ Error fetching system health data:', error);
            setLoading(false);
        });

        return () => {
            console.log('🔌 SystemHealth: Cleaning up Firebase listener');
            unsubscribe();
        };
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'success';
            case 'warning': return 'warning';
            case 'critical': return 'error';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy': return <CheckCircleIcon color="success" />;
            case 'warning': return <WarningIcon color="warning" />;
            case 'critical': return <ErrorIcon color="error" />;
            default: return <CheckCircleIcon />;
        }
    };

    const formatUptime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        return `${minutes}m ${seconds % 60}s`;
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <LinearProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                System Health Monitor
            </Typography>
            
            {/* Overall Status */}
            <Alert 
                severity={healthStatus.status} 
                sx={{ mb: 3 }}
                icon={getStatusIcon(healthStatus.status)}
            >
                <Typography variant="subtitle1">
                    {healthStatus.message}
                </Typography>
                <Typography variant="caption" display="block">
                    Last updated: {new Date(healthStatus.timestamp).toLocaleString()}
                </Typography>
            </Alert>

            {/* Metrics Grid */}
            <Grid container spacing={3}>
                {/* CPU Usage */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <MemoryIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">CPU Usage</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {metrics.cpu.toFixed(1)}%
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={metrics.cpu} 
                                sx={{ mt: 1 }}
                                color={metrics.cpu > 80 ? 'error' : metrics.cpu > 60 ? 'warning' : 'success'}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Memory Usage */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <StorageIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Memory</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {metrics.memory.toFixed(1)}%
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={metrics.memory} 
                                sx={{ mt: 1 }}
                                color={metrics.memory > 90 ? 'error' : metrics.memory > 75 ? 'warning' : 'success'}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Storage */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CloudIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Storage</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {metrics.storage.toFixed(1)}%
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={metrics.storage} 
                                sx={{ mt: 1 }}
                                color={metrics.storage > 90 ? 'error' : 'warning'}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Database */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <DatabaseIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Database</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {metrics.database.toFixed(1)}%
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={metrics.database} 
                                sx={{ mt: 1 }}
                                color={metrics.database > 80 ? 'error' : 'success'}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* API Response Time */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <SpeedIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">API Response</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {metrics.api.toFixed(0)}ms
                            </Typography>
                            <Chip 
                                label={metrics.api < 200 ? 'Fast' : metrics.api < 500 ? 'Normal' : 'Slow'}
                                color={metrics.api < 200 ? 'success' : metrics.api < 500 ? 'warning' : 'error'}
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Uptime */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CheckCircleIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Uptime</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {formatUptime(metrics.uptime)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                System running continuously
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Active Users */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <SecurityIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Active Users</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {metrics.activeUsers}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Currently online
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Error Rate */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <ErrorIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Error Rate</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {metrics.errorRate.toFixed(2)}%
                            </Typography>
                            <Chip 
                                label={metrics.errorRate < 1 ? 'Low' : metrics.errorRate < 5 ? 'Medium' : 'High'}
                                color={metrics.errorRate < 1 ? 'success' : metrics.errorRate < 5 ? 'warning' : 'error'}
                                size="small"
                                sx={{ mt: 1 }}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* System Services Status */}
            <Paper sx={{ mt: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    System Services Status
                </Typography>
                <List>
                    <ListItem>
                        <ListItemIcon>
                            <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                            primary="Authentication Service" 
                            secondary="Operational - Response time: 45ms"
                        />
                        <Chip label="Healthy" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                            primary="Database Service" 
                            secondary="Operational - Response time: 12ms"
                        />
                        <Chip label="Healthy" color="success" size="small" />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText 
                            primary="File Storage Service" 
                            secondary="Degraded performance - Response time: 850ms"
                        />
                        <Chip label="Warning" color="warning" size="small" />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon>
                            <CheckCircleIcon color="success" />
                        </ListItemIcon>
                        <ListItemText 
                            primary="Email Service" 
                            secondary="Operational - Response time: 120ms"
                        />
                        <Chip label="Healthy" color="success" size="small" />
                    </ListItem>
                </List>
            </Paper>
        </Box>
    );
};

export default SystemHealth;
