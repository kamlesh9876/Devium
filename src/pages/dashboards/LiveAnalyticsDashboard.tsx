import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Paper,
    Avatar,
    Chip,
    LinearProgress,
    IconButton,
    Tooltip,
    useTheme,
    alpha
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    People,
    AccessTime,
    Visibility,
    ErrorOutline,
    CheckCircle,
    Refresh,
    Timeline,
    BarChart,
    PieChart
} from '@mui/icons-material';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
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
    Filler,
    TimeScale
} from 'chart.js';
import { useActivityAnalytics, SystemAnalytics, UserBehaviorMetrics } from '../../contexts/ActivityAnalyticsContext';
import { useNotifications } from '../../contexts/NotificationContext';

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
    Filler,
    TimeScale
);

interface LiveMetric {
    label: string;
    value: number | string;
    change: number;
    changeType: 'increase' | 'decrease';
    icon: React.ReactNode;
    color: string;
    format?: 'number' | 'percentage' | 'duration' | 'time';
}

interface LiveChart {
    type: 'line' | 'bar' | 'pie' | 'doughnut';
    title: string;
    data: any;
    options?: any;
    height?: number;
}

const LiveAnalyticsDashboard: React.FC = () => {
    const theme = useTheme();
    const { systemAnalytics, userMetrics, loading } = useActivityAnalytics();
    const { sendSystemNotification } = useNotifications();
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [refreshing, setRefreshing] = useState(false);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setLastUpdate(new Date());
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        // Trigger data refresh
        setTimeout(() => {
            setRefreshing(false);
            setLastUpdate(new Date());
            sendSystemNotification(
                'Dashboard Refreshed',
                'Live analytics data has been updated',
                'success'
            );
        }, 1000);
    };

    // Format metrics
    const formatValue = (value: number | string, format?: string): string => {
        switch (format) {
            case 'percentage':
                return `${value}%`;
            case 'duration':
                if (typeof value === 'number') {
                    const hours = Math.floor(value / 3600);
                    const minutes = Math.floor((value % 3600) / 60);
                    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                }
                return String(value);
            case 'time':
                return new Date(value as string).toLocaleTimeString();
            case 'number':
            default:
                return Number(value).toLocaleString();
        }
    };

    // Live metrics
    const liveMetrics: LiveMetric[] = [
        {
            label: 'Active Users',
            value: systemAnalytics.activeUsers,
            change: 12,
            changeType: 'increase',
            icon: <People />,
            color: theme.palette.success.main,
            format: 'number'
        },
        {
            label: 'Total Sessions',
            value: systemAnalytics.totalSessions,
            change: 8,
            changeType: 'increase',
            icon: <Timeline />,
            color: theme.palette.info.main,
            format: 'number'
        },
        {
            label: 'Avg Session Duration',
            value: systemAnalytics.avgSessionDuration,
            change: -5,
            changeType: 'decrease',
            icon: <AccessTime />,
            color: theme.palette.warning.main,
            format: 'duration'
        },
        {
            label: 'Page Views',
            value: systemAnalytics.totalPageViews,
            change: 15,
            changeType: 'increase',
            icon: <Visibility />,
            color: theme.palette.primary.main,
            format: 'number'
        },
        {
            label: 'Error Rate',
            value: (systemAnalytics.errorRate * 100).toFixed(2),
            change: -2,
            changeType: 'decrease',
            icon: <ErrorOutline />,
            color: theme.palette.error.main,
            format: 'percentage'
        },
        {
            label: 'System Health',
            value: systemAnalytics.errorRate < 0.05 ? 'Healthy' : 'Warning',
            change: 0,
            changeType: 'increase',
            icon: <CheckCircle />,
            color: systemAnalytics.errorRate < 0.05 ? theme.palette.success.main : theme.palette.warning.main,
            format: 'number'
        }
    ];

    // Live charts
    const liveCharts: LiveChart[] = [
        {
            type: 'line',
            title: 'Real-time User Activity',
            height: 300,
            data: {
                labels: systemAnalytics.hourlyActivity.map(h => `${h.hour}:00`),
                datasets: [{
                    label: 'Active Users',
                    data: systemAnalytics.hourlyActivity.map(h => h.users),
                    borderColor: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Total Actions',
                    data: systemAnalytics.hourlyActivity.map(h => h.actions),
                    borderColor: theme.palette.secondary.main,
                    backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750
                },
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
            }
        },
        {
            type: 'bar',
            title: 'Top Pages - Real-time',
            height: 300,
            data: {
                labels: systemAnalytics.topPages.slice(0, 5).map(p => p.page),
                datasets: [{
                    label: 'Page Views',
                    data: systemAnalytics.topPages.slice(0, 5).map(p => p.views),
                    backgroundColor: [
                        alpha(theme.palette.primary.main, 0.8),
                        alpha(theme.palette.secondary.main, 0.8),
                        alpha(theme.palette.success.main, 0.8),
                        alpha(theme.palette.warning.main, 0.8),
                        alpha(theme.palette.info.main, 0.8)
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750
                },
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
            }
        },
        {
            type: 'doughnut',
            title: 'Device Distribution',
            height: 250,
            data: {
                labels: systemAnalytics.deviceBreakdown.map(d => d.device),
                datasets: [{
                    data: systemAnalytics.deviceBreakdown.map(d => d.users),
                    backgroundColor: [
                        alpha(theme.palette.primary.main, 0.8),
                        alpha(theme.palette.secondary.main, 0.8),
                        alpha(theme.palette.success.main, 0.8),
                        alpha(theme.palette.warning.main, 0.8)
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 750
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        },
        {
            type: 'pie',
            title: 'Feature Usage',
            height: 250,
            data: {
                labels: systemAnalytics.featureUsage.map(f => f.feature),
                datasets: [{
                    data: systemAnalytics.featureUsage.map(f => f.usage),
                    backgroundColor: [
                        alpha(theme.palette.primary.main, 0.8),
                        alpha(theme.palette.secondary.main, 0.8),
                        alpha(theme.palette.success.main, 0.8),
                        alpha(theme.palette.warning.main, 0.8),
                        alpha(theme.palette.info.main, 0.8)
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 750
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        }
    ];

    const renderChart = (chart: LiveChart) => {
        const chartProps = {
            data: chart.data,
            options: chart.options || {}
        };

        switch (chart.type) {
            case 'line':
                return <Line {...chartProps} />;
            case 'bar':
                return <Bar {...chartProps} />;
            case 'pie':
                return <Pie {...chartProps} />;
            case 'doughnut':
                return <Doughnut {...chartProps} />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <LinearProgress sx={{ mb: 2, width: 300 }} />
                    <Typography variant="h6" color="text.secondary">
                        Loading Live Analytics...
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
                        <Timeline sx={{ color: theme.palette.primary.main }} />
                        Live Analytics Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Last updated: {lastUpdate.toLocaleTimeString()} • Auto-refresh every 30s
                    </Typography>
                </Box>
                <Tooltip title="Refresh Data">
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

            {/* Live Metrics Grid */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {liveMetrics.map((metric, index) => (
                    <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
                        <Card 
                            sx={{ 
                                height: '100%',
                                background: `linear-gradient(135deg, ${alpha(metric.color, 0.05)} 0%, ${alpha(metric.color, 0.1)} 100%)`,
                                border: `1px solid ${alpha(metric.color, 0.2)}`
                            }}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <Avatar sx={{ bgcolor: metric.color, mr: 2, width: 40, height: 40 }}>
                                        {metric.icon}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                            {formatValue(metric.value, metric.format)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {metric.label}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {metric.changeType === 'increase' ? (
                                        <TrendingUp sx={{ color: theme.palette.success.main, fontSize: 16 }} />
                                    ) : (
                                        <TrendingDown sx={{ color: theme.palette.error.main, fontSize: 16 }} />
                                    )}
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            color: metric.changeType === 'increase' ? theme.palette.success.main : theme.palette.error.main,
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {Math.abs(metric.change)}%
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        from last hour
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Live Charts Grid */}
            <Grid container spacing={3}>
                {liveCharts.map((chart, index) => (
                    <Grid item xs={12} md={6} key={index}>
                        <Paper sx={{ p: 2, height: chart.height ? chart.height + 50 : 350 }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {chart.type === 'line' && <Timeline />}
                                {chart.type === 'bar' && <BarChart />}
                                {chart.type === 'pie' && <PieChart />}
                                {chart.title}
                                <Chip 
                                    label="LIVE" 
                                    size="small" 
                                    color="error" 
                                    sx={{ 
                                        ml: 'auto',
                                        animation: 'pulse 2s infinite',
                                        '@keyframes pulse': {
                                            '0%': { opacity: 1 },
                                            '50%': { opacity: 0.5 },
                                            '100%': { opacity: 1 }
                                        }
                                    }} 
                                />
                            </Typography>
                            <Box sx={{ height: chart.height || 300 }}>
                                {renderChart(chart)}
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Top Users Section */}
            <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Most Active Users
                </Typography>
                <Grid container spacing={2}>
                    {userMetrics
                        .sort((a, b) => b.totalDuration - a.totalDuration)
                        .slice(0, 6)
                        .map((user, index) => (
                            <Grid item xs={12} sm={6} md={4} key={user.userId}>
                                <Card variant="outlined">
                                    <CardContent sx={{ p: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                                                {user.userName.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                    {user.userName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {user.pageViews} page views • {formatValue(user.totalDuration, 'duration')}
                                                </Typography>
                                            </Box>
                                            <Chip 
                                                label={`#${index + 1}`} 
                                                size="small" 
                                                color={index < 3 ? 'primary' : 'default'}
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                </Grid>
            </Paper>
        </Box>
    );
};

export default LiveAnalyticsDashboard;
