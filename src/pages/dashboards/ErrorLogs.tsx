import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Alert,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Tooltip,
    LinearProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Pagination
} from '@mui/material';
import {
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    BugReport as BugIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Visibility as VisibilityIcon,
    Download as DownloadIcon,
    FilterList as FilterIcon,
    ExpandMore as ExpandMoreIcon,
    AccessTime as TimeIcon,
    Person as PersonIcon,
    Computer as ComputerIcon,
    Code as CodeIcon,
    Close as CloseIcon
} from '@mui/icons-material';

interface ErrorLog {
    id: string;
    level: 'error' | 'warning' | 'info' | 'debug';
    message: string;
    stackTrace?: string;
    component: string;
    userId?: string;
    userName?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
    resolved: boolean;
    assignedTo?: string;
    tags: string[];
    context?: Record<string, any>;
}

interface ErrorStats {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    debug: number;
    resolved: number;
    unresolved: number;
    critical: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
}

const ErrorLogs: React.FC = () => {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<ErrorLog[]>([]);
    const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
    const [stats, setStats] = useState<ErrorStats>({
        total: 0,
        errors: 0,
        warnings: 0,
        info: 0,
        debug: 0,
        resolved: 0,
        unresolved: 0,
        critical: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [levelFilter, setLevelFilter] = useState('all');
    const [resolvedFilter, setResolvedFilter] = useState('all');
    const [componentFilter, setComponentFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    useEffect(() => {
        // Generate sample error logs
        const sampleLogs: ErrorLog[] = [
            {
                id: '1',
                level: 'error',
                message: 'Database connection timeout after 30 seconds',
                stackTrace: 'Error: Database connection timeout\n    at Database.connect (/app/src/database.js:45:12)\n    at async User.authenticate (/app/src/auth.js:23:8)',
                component: 'Database',
                userId: 'user123',
                userName: 'John Doe',
                sessionId: 'sess_abc123',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                resolved: false,
                tags: ['database', 'critical', 'timeout'],
                context: {
                    query: 'SELECT * FROM users WHERE id = ?',
                    timeout: 30000,
                    attempts: 3
                }
            },
            {
                id: '2',
                level: 'warning',
                message: 'API rate limit approaching threshold',
                component: 'API Gateway',
                userId: 'user456',
                userName: 'Jane Smith',
                sessionId: 'sess_def456',
                ipAddress: '192.168.1.101',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                resolved: false,
                tags: ['api', 'rate-limit', 'performance'],
                context: {
                    endpoint: '/api/users',
                    currentRate: 95,
                    limit: 100,
                    window: '1h'
                }
            },
            {
                id: '3',
                level: 'error',
                message: 'Failed to send email notification',
                stackTrace: 'Error: SMTP connection failed\n    at EmailService.send (/app/src/email.js:78:15)\n    at NotificationService.notify (/app/src/notifications.js:34:12)',
                component: 'Email Service',
                userId: 'user789',
                userName: 'Mike Johnson',
                sessionId: 'sess_ghi789',
                ipAddress: '192.168.1.102',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                resolved: true,
                assignedTo: 'admin@example.com',
                tags: ['email', 'smtp', 'external-service'],
                context: {
                    template: 'welcome-email',
                    recipient: 'newuser@example.com',
                    provider: 'sendgrid'
                }
            },
            {
                id: '4',
                level: 'info',
                message: 'User login successful',
                component: 'Authentication',
                userId: 'user101',
                userName: 'Sarah Wilson',
                sessionId: 'sess_jkl101',
                ipAddress: '192.168.1.103',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
                timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
                resolved: true,
                tags: ['auth', 'login', 'info'],
                context: {
                    method: 'password',
                    mfa: false,
                    location: 'New York, US'
                }
            },
            {
                id: '5',
                level: 'error',
                message: 'Memory usage exceeded 90% threshold',
                component: 'System Monitor',
                timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                resolved: false,
                tags: ['system', 'memory', 'performance', 'critical'],
                context: {
                    currentUsage: 92,
                    threshold: 90,
                    available: '128MB',
                    total: '2GB'
                }
            },
            {
                id: '6',
                level: 'warning',
                message: 'Deprecated API endpoint used',
                component: 'API Gateway',
                userId: 'user202',
                userName: 'Tom Brown',
                sessionId: 'sess_mno202',
                ipAddress: '192.168.1.104',
                userAgent: 'PostmanRuntime/7.29.0',
                timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
                resolved: false,
                tags: ['api', 'deprecated', 'warning'],
                context: {
                    endpoint: '/api/v1/users',
                    deprecatedVersion: 'v1',
                    recommendedVersion: 'v2',
                    removalDate: '2024-01-01'
                }
            }
        ];

        setLogs(sampleLogs);
        
        // Calculate stats
        const today = new Date().toDateString();
        const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const newStats: ErrorStats = {
            total: sampleLogs.length,
            errors: sampleLogs.filter(log => log.level === 'error').length,
            warnings: sampleLogs.filter(log => log.level === 'warning').length,
            info: sampleLogs.filter(log => log.level === 'info').length,
            debug: sampleLogs.filter(log => log.level === 'debug').length,
            resolved: sampleLogs.filter(log => log.resolved).length,
            unresolved: sampleLogs.filter(log => !log.resolved).length,
            critical: sampleLogs.filter(log => log.tags.includes('critical')).length,
            today: sampleLogs.filter(log => new Date(log.timestamp).toDateString() === today).length,
            thisWeek: sampleLogs.filter(log => new Date(log.timestamp) >= thisWeek).length,
            thisMonth: sampleLogs.filter(log => new Date(log.timestamp) >= thisMonth).length
        };

        setStats(newStats);
        setFilteredLogs(sampleLogs);
        setLoading(false);
    }, []);

    useEffect(() => {
        let filtered = logs;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(log =>
                log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.userName && log.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                log.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply level filter
        if (levelFilter !== 'all') {
            filtered = filtered.filter(log => log.level === levelFilter);
        }

        // Apply resolved filter
        if (resolvedFilter !== 'all') {
            filtered = filtered.filter(log => 
                resolvedFilter === 'resolved' ? log.resolved : !log.resolved
            );
        }

        // Apply component filter
        if (componentFilter !== 'all') {
            filtered = filtered.filter(log => log.component === componentFilter);
        }

        setFilteredLogs(filtered);
        setPage(1);
    }, [logs, searchTerm, levelFilter, resolvedFilter, componentFilter]);

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'error';
            case 'warning': return 'warning';
            case 'info': return 'info';
            case 'debug': return 'default';
            default: return 'default';
        }
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'error': return <ErrorIcon color="error" />;
            case 'warning': return <WarningIcon color="warning" />;
            case 'info': return <InfoIcon color="info" />;
            case 'debug': return <BugIcon />;
            default: return <InfoIcon />;
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const getRelativeTime = (timestamp: string) => {
        const now = new Date();
        const logTime = new Date(timestamp);
        const diffMs = now.getTime() - logTime.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const handleResolveLog = async (logId: string) => {
        try {
            setLogs(logs.map(log => 
                log.id === logId ? { ...log, resolved: true } : log
            ));
        } catch (error) {
            console.error('Error resolving log:', error);
        }
    };

    const handleExportLogs = () => {
        const csvContent = [
            ['Timestamp', 'Level', 'Message', 'Component', 'User', 'Resolved', 'Tags'].join(','),
            ...filteredLogs.map(log => [
                log.timestamp,
                log.level,
                `"${log.message}"`,
                log.component,
                log.userName || '',
                log.resolved.toString(),
                `"${log.tags.join(';')}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const paginatedLogs = filteredLogs.slice(
        (page - 1) * rowsPerPage,
        page * rowsPerPage
    );

    const components = [...new Set(logs.map(log => log.component))];

    if (loading) {
        return <Box sx={{ p: 3 }}>Loading error logs...</Box>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Error Logs Viewer
            </Typography>

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <BugIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Total</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {stats.total}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <ErrorIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Errors</Typography>
                            </Box>
                            <Typography variant="h4" color="error">
                                {stats.errors}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <WarningIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Warnings</Typography>
                            </Box>
                            <Typography variant="h4" color="warning">
                                {stats.warnings}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <ErrorIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Critical</Typography>
                            </Box>
                            <Typography variant="h4" color="error">
                                {stats.critical}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <CloseIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Unresolved</Typography>
                            </Box>
                            <Typography variant="h4" color="warning">
                                {stats.unresolved}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <TimeIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Today</Typography>
                            </Box>
                            <Typography variant="h4" color="info">
                                {stats.today}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Critical Alerts */}
            {stats.critical > 0 && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    <Typography variant="subtitle1">
                        {stats.critical} critical errors require immediate attention
                    </Typography>
                </Alert>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                        <TextField
                            fullWidth
                            label="Search logs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Level</InputLabel>
                            <Select
                                value={levelFilter}
                                onChange={(e) => setLevelFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Levels</MenuItem>
                                <MenuItem value="error">Error</MenuItem>
                                <MenuItem value="warning">Warning</MenuItem>
                                <MenuItem value="info">Info</MenuItem>
                                <MenuItem value="debug">Debug</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={resolvedFilter}
                                onChange={(e) => setResolvedFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="resolved">Resolved</MenuItem>
                                <MenuItem value="unresolved">Unresolved</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Component</InputLabel>
                            <Select
                                value={componentFilter}
                                onChange={(e) => setComponentFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Components</MenuItem>
                                {components.map(component => (
                                    <MenuItem key={component} value={component}>
                                        {component}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Refresh">
                                <IconButton>
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Export">
                                <IconButton onClick={handleExportLogs}>
                                    <DownloadIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Error Logs Table */}
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell width="80">Level</TableCell>
                                <TableCell>Message</TableCell>
                                <TableCell width="120">Component</TableCell>
                                <TableCell width="150">User</TableCell>
                                <TableCell width="120">Time</TableCell>
                                <TableCell width="100">Status</TableCell>
                                <TableCell width="150">Tags</TableCell>
                                <TableCell width="100">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedLogs.map((log) => (
                                <TableRow key={log.id} hover>
                                    <TableCell>
                                        {getLevelIcon(log.level)}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ 
                                            maxWidth: 300, 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {log.message}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                            {log.component}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {log.userName ? (
                                            <Box>
                                                <Typography variant="body2">
                                                    {log.userName}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {log.ipAddress}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">
                                                System
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2">
                                                {getRelativeTime(log.timestamp)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatTimestamp(log.timestamp)}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={log.resolved ? 'Resolved' : 'Open'}
                                            color={log.resolved ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {log.tags.slice(0, 2).map((tag, index) => (
                                                <Chip
                                                    key={index}
                                                    label={tag}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                                />
                                            ))}
                                            {log.tags.length > 2 && (
                                                <Chip
                                                    label={`+${log.tags.length - 2}`}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.7rem', height: 20 }}
                                                />
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <Tooltip title="View Details">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedLog(log);
                                                        setDetailDialogOpen(true);
                                                    }}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {!log.resolved && (
                                                <Tooltip title="Mark as Resolved">
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() => handleResolveLog(log.id)}
                                                    >
                                                        <CloseIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Showing {paginatedLogs.length} of {filteredLogs.length} logs
                    </Typography>
                    <Pagination
                        count={Math.ceil(filteredLogs.length / rowsPerPage)}
                        page={page}
                        onChange={(e, newPage) => setPage(newPage)}
                        color="primary"
                    />
                </Box>
            </Paper>

            {/* Detail Dialog */}
            <Dialog 
                open={detailDialogOpen} 
                onClose={() => setDetailDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Error Log Details</DialogTitle>
                <DialogContent>
                    {selectedLog && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {getLevelIcon(selectedLog.level)}
                                <Typography variant="h6">
                                    {selectedLog.level.toUpperCase()}
                                </Typography>
                                <Chip
                                    label={selectedLog.resolved ? 'Resolved' : 'Open'}
                                    color={selectedLog.resolved ? 'success' : 'warning'}
                                    size="small"
                                />
                            </Box>

                            {/* Message */}
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Message
                                </Typography>
                                <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                                    {selectedLog.message}
                                </Typography>
                            </Box>

                            {/* Metadata */}
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Component
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                        {selectedLog.component}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Timestamp
                                    </Typography>
                                    <Typography variant="body2">
                                        {formatTimestamp(selectedLog.timestamp)}
                                    </Typography>
                                </Grid>
                                {selectedLog.userName && (
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            User
                                        </Typography>
                                        <Typography variant="body2">
                                            {selectedLog.userName} ({selectedLog.ipAddress})
                                        </Typography>
                                    </Grid>
                                )}
                                {selectedLog.sessionId && (
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Session ID
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                            {selectedLog.sessionId}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>

                            {/* Tags */}
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>
                                    Tags
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {selectedLog.tags.map((tag, index) => (
                                        <Chip
                                            key={index}
                                            label={tag}
                                            size="small"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </Box>

                            {/* Stack Trace */}
                            {selectedLog.stackTrace && (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Stack Trace
                                    </Typography>
                                    <Typography 
                                        variant="body2" 
                                        component="pre"
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: 'grey.900', 
                                            color: 'grey.100',
                                            borderRadius: 1,
                                            fontSize: '0.8rem',
                                            overflow: 'auto',
                                            maxHeight: 200
                                        }}
                                    >
                                        {selectedLog.stackTrace}
                                    </Typography>
                                </Box>
                            )}

                            {/* Context */}
                            {selectedLog.context && (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Context
                                    </Typography>
                                    <Typography 
                                        variant="body2" 
                                        component="pre"
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: 'grey.100', 
                                            borderRadius: 1,
                                            fontSize: '0.8rem',
                                            overflow: 'auto',
                                            maxHeight: 150
                                        }}
                                    >
                                        {JSON.stringify(selectedLog.context, null, 2)}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
                    {!selectedLog?.resolved && (
                        <Button 
                            variant="contained" 
                            onClick={() => {
                                if (selectedLog) {
                                    handleResolveLog(selectedLog.id);
                                    setDetailDialogOpen(false);
                                }
                            }}
                        >
                            Mark as Resolved
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ErrorLogs;
