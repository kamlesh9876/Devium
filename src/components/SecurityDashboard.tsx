import React, { useState, useEffect, useMemo, memo } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    Button,
    Alert,
    Collapse,
    IconButton,
    Tooltip,
    LinearProgress,
    Avatar,
    useTheme,
    alpha
} from '@mui/material';
import {
    Security,
    Warning,
    Error,
    CheckCircle,
    Block,
    Gavel,
    Shield,
    Timeline,
    LocationOn,
    DeviceHub,
    ExpandMore,
    ExpandLess,
    Refresh,
    PriorityHigh,
    BugReport,
    Lock,
    Assessment
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
import { useSecurityMonitoring, SecurityEvent, SecurityThreat } from '../contexts/SecurityMonitoringContext';

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

const SecurityDashboard: React.FC = memo(() => {
    const theme = useTheme();
    const { 
        securityEvents, 
        threats, 
        metrics, 
        loading, 
        runSecurityScan, 
        resolveSecurityEvent, 
        blockIPAddress,
        mitigateThreat,
        resolveThreat
    } = useSecurityMonitoring();
    
    const [expandedEvents, setExpandedEvents] = useState<{ [key: string]: boolean }>({});
    const [expandedThreats, setExpandedThreats] = useState<{ [key: string]: boolean }>({});
    const [scanning, setScanning] = useState(false);

    const handleSecurityScan = async () => {
        setScanning(true);
        try {
            await runSecurityScan();
        } finally {
            setScanning(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return theme.palette.error.main;
            case 'high': return theme.palette.warning.main;
            case 'medium': return theme.palette.info.main;
            case 'low': return theme.palette.success.main;
            default: return theme.palette.grey[500];
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return <Error sx={{ color: theme.palette.error.main }} />;
            case 'high': return <Warning sx={{ color: theme.palette.warning.main }} />;
            case 'medium': return <Security sx={{ color: theme.palette.info.main }} />;
            case 'low': return <CheckCircle sx={{ color: theme.palette.success.main }} />;
            default: return <Security sx={{ color: theme.palette.grey[500] }} />;
        }
    };

    const getRiskScoreColor = (score: number) => {
        if (score >= 80) return theme.palette.error.main;
        if (score >= 60) return theme.palette.warning.main;
        if (score >= 40) return theme.palette.info.main;
        return theme.palette.success.main;
    };

    const recentEvents = securityEvents.filter(e => !e.resolved).slice(0, 10);
    const activeThreats = threats.filter(t => t.status === 'active');

    // Chart data
    const hourlyEventsChart = {
        labels: metrics.eventsByHour.map(h => `${h.hour}:00`),
        datasets: [{
            label: 'Security Events',
            data: metrics.eventsByHour.map(h => h.count),
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            tension: 0.4,
            fill: true
        }]
    };

    const eventsByTypeChart = {
        labels: Object.keys(metrics.eventsByType),
        datasets: [{
            data: Object.values(metrics.eventsByType),
            backgroundColor: [
                alpha(theme.palette.error.main, 0.8),
                alpha(theme.palette.warning.main, 0.8),
                alpha(theme.palette.info.main, 0.8),
                alpha(theme.palette.success.main, 0.8),
                alpha(theme.palette.secondary.main, 0.8)
            ],
            borderWidth: 0
        }]
    };

    const severityDistributionChart = {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
            data: [metrics.criticalEvents, metrics.highEvents, metrics.mediumEvents, metrics.lowEvents],
            backgroundColor: [
                alpha(theme.palette.error.main, 0.8),
                alpha(theme.palette.warning.main, 0.8),
                alpha(theme.palette.info.main, 0.8),
                alpha(theme.palette.success.main, 0.8)
            ],
            borderWidth: 0
        }]
    };

    if (loading) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <LinearProgress sx={{ mb: 2, width: 300 }} />
                    <Typography variant="h6" color="text.secondary">
                        Loading Security Dashboard...
                    </Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Shield sx={{ color: theme.palette.primary.main }} />
                        Security Monitoring Center
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Real-time threat detection and security analysis
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="contained"
                        startIcon={<Assessment />}
                        onClick={handleSecurityScan}
                        disabled={scanning}
                        sx={{ 
                            bgcolor: theme.palette.primary.main,
                            '&:hover': { bgcolor: theme.palette.primary.dark }
                        }}
                    >
                        {scanning ? 'Scanning...' : 'Run Security Scan'}
                    </Button>
                    <Tooltip title="Refresh Data">
                        <IconButton>
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Critical Alerts */}
            {activeThreats.length > 0 && (
                <Alert 
                    severity="error" 
                    sx={{ mb: 3 }}
                    action={
                        <Button size="small" color="inherit" onClick={() => activeThreats.forEach(t => mitigateThreat(t.id, ['Immediate investigation']))}>
                            Mitigate All
                        </Button>
                    }
                >
                    <Typography variant="subtitle2">
                        🚨 {activeThreats.length} Active Security Threat(s) Detected
                    </Typography>
                    <Typography variant="body2">
                        Immediate action required to prevent potential security breaches
                    </Typography>
                </Alert>
            )}

            {/* Security Metrics Grid */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        bgcolor: alpha(theme.palette.background.paper, 0.9),
                        border: `1px solid ${theme.palette.divider}`
                    }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Avatar sx={{ 
                                bgcolor: getRiskScoreColor(metrics.riskScore), 
                                mx: 'auto', 
                                mb: 2,
                                width: 56,
                                height: 56
                            }}>
                                <Assessment />
                            </Avatar>
                            <Typography variant="h4" sx={{ fontWeight: 'bold', color: getRiskScoreColor(metrics.riskScore) }}>
                                {metrics.riskScore}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Risk Score
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={metrics.riskScore} 
                                sx={{ 
                                    mt: 2,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: alpha(theme.palette.divider, 0.2),
                                    '& .MuiLinearProgress-bar': {
                                        backgroundColor: getRiskScoreColor(metrics.riskScore)
                                    }
                                }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        bgcolor: alpha(theme.palette.error.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
                    }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Avatar sx={{ bgcolor: theme.palette.error.main, mx: 'auto', mb: 2 }}>
                                <PriorityHigh />
                            </Avatar>
                            <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.error.main }}>
                                {metrics.criticalEvents}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Critical Events
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        bgcolor: alpha(theme.palette.warning.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
                    }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Avatar sx={{ bgcolor: theme.palette.warning.main, mx: 'auto', mb: 2 }}>
                                <Warning />
                            </Avatar>
                            <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                                {activeThreats.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Active Threats
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                        bgcolor: alpha(theme.palette.success.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                    }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Avatar sx={{ bgcolor: theme.palette.success.main, mx: 'auto', mb: 2 }}>
                                <CheckCircle />
                            </Avatar>
                            <Typography variant="h4" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                                {metrics.blockedAttempts}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Blocked Attempts
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Security Charts */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Security Events Timeline
                        </Typography>
                        <Box sx={{ height: 300 }}>
                            <Line 
                                data={hourlyEventsChart}
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
                            Event Severity Distribution
                        </Typography>
                        <Box sx={{ height: 300 }}>
                            <Doughnut 
                                data={severityDistributionChart}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: 'bottom'
                                        }
                                    }
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Active Threats */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Gavel />
                    Active Security Threats ({activeThreats.length})
                </Typography>
                <List>
                    {activeThreats.length === 0 ? (
                        <ListItem>
                            <ListItemText 
                                primary="No active threats"
                                secondary="Security system is operating normally"
                            />
                        </ListItem>
                    ) : (
                        activeThreats.map((threat) => (
                            <React.Fragment key={threat.id}>
                                <ListItem 
                                    sx={{ 
                                        bgcolor: alpha(getSeverityColor(threat.severity), 0.05),
                                        mb: 1,
                                        borderRadius: 1,
                                        border: `1px solid ${alpha(getSeverityColor(threat.severity), 0.2)}`
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        {getSeverityIcon(threat.severity)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                    {threat.name}
                                                </Typography>
                                                <Chip 
                                                    label={threat.severity} 
                                                    size="small" 
                                                    color={threat.severity === 'critical' ? 'error' : threat.severity === 'high' ? 'warning' : 'default'}
                                                />
                                                <Chip 
                                                    label={`Risk: ${threat.riskScore}`} 
                                                    size="small" 
                                                    variant="outlined"
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    {threat.description}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Detected: {new Date(threat.detectedAt).toLocaleString()} • 
                                                    {threat.affectedUsers.length} user(s) affected
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                    <IconButton 
                                        size="small" 
                                        onClick={() => setExpandedThreats(prev => ({ ...prev, [threat.id]: !prev[threat.id] }))}
                                    >
                                        {expandedThreats[threat.id] ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                </ListItem>
                                
                                <Collapse in={expandedThreats[threat.id]} timeout="auto" unmountOnExit>
                                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Mitigation Steps:
                                        </Typography>
                                        <List dense>
                                            {threat.mitigationSteps.map((step, index) => (
                                                <ListItem key={index} sx={{ pl: 0 }}>
                                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                                        <CheckCircle sx={{ fontSize: 16, color: theme.palette.success.main }} />
                                                    </ListItemIcon>
                                                    <ListItemText primary={step} />
                                                </ListItem>
                                            ))}
                                        </List>
                                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                            <Button
                                                size="small"
                                                variant="contained"
                                                color="primary"
                                                onClick={() => mitigateThreat(threat.id, threat.mitigationSteps)}
                                            >
                                                Mitigate
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={() => resolveThreat(threat.id)}
                                            >
                                                Resolve
                                            </Button>
                                        </Box>
                                    </Box>
                                </Collapse>
                            </React.Fragment>
                        ))
                    )}
                </List>
            </Paper>

            {/* Recent Security Events */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Timeline />
                    Recent Security Events ({recentEvents.length})
                </Typography>
                <List>
                    {recentEvents.length === 0 ? (
                        <ListItem>
                            <ListItemText 
                                primary="No recent events"
                                secondary="No security events detected in the last 24 hours"
                            />
                        </ListItem>
                    ) : (
                        recentEvents.map((event) => (
                            <React.Fragment key={event.id}>
                                <ListItem 
                                    sx={{ 
                                        bgcolor: alpha(getSeverityColor(event.severity), 0.05),
                                        mb: 1,
                                        borderRadius: 1,
                                        border: `1px solid ${alpha(getSeverityColor(event.severity), 0.2)}`
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        {getSeverityIcon(event.severity)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                    {event.type.replace('_', ' ').toUpperCase()}
                                                </Typography>
                                                <Chip 
                                                    label={event.severity} 
                                                    size="small" 
                                                    color={event.severity === 'critical' ? 'error' : event.severity === 'high' ? 'warning' : 'default'}
                                                />
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                    {event.description}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        IP: {event.ipAddress}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {new Date(event.timestamp).toLocaleString()}
                                                    </Typography>
                                                    {event.location && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <LocationOn sx={{ fontSize: 14 }} />
                                                            <Typography variant="caption" color="text.secondary">
                                                                {event.location.city}, {event.location.country}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                        }
                                    />
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        <IconButton 
                                            size="small" 
                                            onClick={() => setExpandedEvents(prev => ({ ...prev, [event.id]: !prev[event.id] }))}
                                        >
                                            {expandedEvents[event.id] ? <ExpandLess /> : <ExpandMore />}
                                        </IconButton>
                                        <IconButton 
                                            size="small"
                                            onClick={() => blockIPAddress(event.ipAddress)}
                                            title="Block IP"
                                        >
                                            <Block sx={{ fontSize: 16 }} />
                                        </IconButton>
                                        <IconButton 
                                            size="small"
                                            onClick={() => resolveSecurityEvent(event.id)}
                                            title="Resolve Event"
                                        >
                                            <CheckCircle sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Box>
                                </ListItem>
                                
                                <Collapse in={expandedEvents[event.id]} timeout="auto" unmountOnExit>
                                    <Box sx={{ pl: 7, pr: 2, pb: 2 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                            <strong>User Agent:</strong> {event.userAgent}
                                        </Typography>
                                        {event.details && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                                                <strong>Details:</strong>
                                                {JSON.stringify(event.details, null, 2)}
                                            </Typography>
                                        )}
                                    </Box>
                                </Collapse>
                            </React.Fragment>
                        ))
                    )}
                </List>
            </Paper>
        </Box>
    );
});

export default SecurityDashboard;
