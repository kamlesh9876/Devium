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
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Card,
    CardContent,
    Alert,
    Tooltip,
    IconButton,
    Pagination
} from '@mui/material';
import {
    Security as SecurityIcon,
    Person as PersonIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    Info as InfoIcon,
    Login as LoginIcon,
    Logout as LogoutIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    AdminPanelSettings as AdminIcon,
    Search as SearchIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { rtdb } from '../../firebase';

interface AuditLog {
    id: string;
    action: string;
    userId: string;
    userName: string;
    userEmail: string;
    resource: string;
    details: string;
    ipAddress: string;
    userAgent: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'authentication' | 'authorization' | 'data' | 'system' | 'security';
}

const SecurityAudit: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [stats, setStats] = useState({
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        today: 0
    });

    useEffect(() => {
        // Generate sample audit logs (in production, this would come from your audit logging system)
        const sampleLogs: AuditLog[] = [
            {
                id: '1',
                action: 'LOGIN_SUCCESS',
                userId: 'user123',
                userName: 'John Doe',
                userEmail: 'john@example.com',
                resource: 'Authentication',
                details: 'User logged in successfully',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
                severity: 'low',
                category: 'authentication'
            },
            {
                id: '2',
                action: 'USER_CREATED',
                userId: 'admin456',
                userName: 'Admin User',
                userEmail: 'admin@example.com',
                resource: 'User Management',
                details: 'Created new user: jane.smith@example.com',
                ipAddress: '192.168.1.50',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
                severity: 'medium',
                category: 'authorization'
            },
            {
                id: '3',
                action: 'LOGIN_FAILED',
                userId: 'unknown',
                userName: 'Unknown',
                userEmail: 'hacker@malicious.com',
                resource: 'Authentication',
                details: 'Failed login attempt - invalid credentials',
                ipAddress: '10.0.0.1',
                userAgent: 'Mozilla/5.0 (compatible; scanner/1.0)',
                timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                severity: 'high',
                category: 'security'
            },
            {
                id: '4',
                action: 'PERMISSION_CHANGED',
                userId: 'admin456',
                userName: 'Admin User',
                userEmail: 'admin@example.com',
                resource: 'Authorization',
                details: 'Changed user role from user to manager for user789',
                ipAddress: '192.168.1.50',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
                severity: 'high',
                category: 'authorization'
            },
            {
                id: '5',
                action: 'DATA_EXPORT',
                userId: 'manager123',
                userName: 'Manager User',
                userEmail: 'manager@example.com',
                resource: 'Data Management',
                details: 'Exported user analytics data (250 records)',
                ipAddress: '192.168.1.75',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
                severity: 'medium',
                category: 'data'
            },
            {
                id: '6',
                action: 'SYSTEM_ERROR',
                userId: 'system',
                userName: 'System',
                userEmail: 'system@internal',
                resource: 'System',
                details: 'Database connection timeout - automatic recovery initiated',
                ipAddress: 'localhost',
                userAgent: 'Internal System',
                timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
                severity: 'critical',
                category: 'system'
            }
        ];

        setLogs(sampleLogs);
        setFilteredLogs(sampleLogs);
        
        // Calculate stats
        const today = new Date().toDateString();
        const todayLogs = sampleLogs.filter(log => 
            new Date(log.timestamp).toDateString() === today
        );
        
        setStats({
            total: sampleLogs.length,
            critical: sampleLogs.filter(log => log.severity === 'critical').length,
            high: sampleLogs.filter(log => log.severity === 'high').length,
            medium: sampleLogs.filter(log => log.severity === 'medium').length,
            low: sampleLogs.filter(log => log.severity === 'low').length,
            today: todayLogs.length
        });
        
        setLoading(false);
    }, []);

    useEffect(() => {
        let filtered = logs;

        // Apply search filter
        if (searchTerm) {
            filtered = filtered.filter(log =>
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.details.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply severity filter
        if (severityFilter !== 'all') {
            filtered = filtered.filter(log => log.severity === severityFilter);
        }

        // Apply category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(log => log.category === categoryFilter);
        }

        setFilteredLogs(filtered);
        setPage(1);
    }, [logs, searchTerm, severityFilter, categoryFilter]);

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'error';
            case 'high': return 'warning';
            case 'medium': return 'info';
            case 'low': return 'success';
            default: return 'default';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'authentication': return <LoginIcon />;
            case 'authorization': return <AdminIcon />;
            case 'data': return <InfoIcon />;
            case 'system': return <ErrorIcon />;
            case 'security': return <SecurityIcon />;
            default: return <InfoIcon />;
        }
    };

    const getActionIcon = (action: string) => {
        if (action.includes('LOGIN')) return <LoginIcon />;
        if (action.includes('LOGOUT')) return <LogoutIcon />;
        if (action.includes('CREATE')) return <EditIcon />;
        if (action.includes('DELETE')) return <DeleteIcon />;
        if (action.includes('FAILED')) return <WarningIcon />;
        if (action.includes('ERROR')) return <ErrorIcon />;
        return <InfoIcon />;
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const paginatedLogs = filteredLogs.slice(
        (page - 1) * rowsPerPage,
        page * rowsPerPage
    );

    if (loading) {
        return <Box sx={{ p: 3 }}>Loading security logs...</Box>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Security Audit Log
            </Typography>

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="primary">
                                {stats.total}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Events
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="error">
                                {stats.critical}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Critical
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="warning">
                                {stats.high}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                High Priority
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="info">
                                {stats.medium}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Medium Priority
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="success">
                                {stats.low}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Low Priority
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={2}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="primary">
                                {stats.today}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Today
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Critical Alerts */}
            {stats.critical > 0 && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    <Typography variant="subtitle1">
                        {stats.critical} critical security events require immediate attention
                    </Typography>
                </Alert>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Search logs"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Severity</InputLabel>
                            <Select
                                value={severityFilter}
                                onChange={(e) => setSeverityFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Severities</MenuItem>
                                <MenuItem value="critical">Critical</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="low">Low</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Categories</MenuItem>
                                <MenuItem value="authentication">Authentication</MenuItem>
                                <MenuItem value="authorization">Authorization</MenuItem>
                                <MenuItem value="data">Data</MenuItem>
                                <MenuItem value="system">System</MenuItem>
                                <MenuItem value="security">Security</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Tooltip title="Refresh logs">
                            <IconButton>
                                <RefreshIcon />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Paper>

            {/* Audit Logs Table */}
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Timestamp</TableCell>
                                <TableCell>Action</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Resource</TableCell>
                                <TableCell>Details</TableCell>
                                <TableCell>IP Address</TableCell>
                                <TableCell>Severity</TableCell>
                                <TableCell>Category</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedLogs.map((log) => (
                                <TableRow key={log.id} hover>
                                    <TableCell>
                                        {formatTimestamp(log.timestamp)}
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {getActionIcon(log.action)}
                                            <Typography variant="body2">
                                                {log.action}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2">
                                                {log.userName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {log.userEmail}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{log.resource}</TableCell>
                                    <TableCell>
                                        <Tooltip title={log.details}>
                                            <Typography variant="body2" sx={{ 
                                                maxWidth: 200, 
                                                overflow: 'hidden', 
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {log.details}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                            {log.ipAddress}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={log.severity.toUpperCase()}
                                            color={getSeverityColor(log.severity) as any}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {getCategoryIcon(log.category)}
                                            <Typography variant="body2">
                                                {log.category}
                                            </Typography>
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
                        onChange={handleChangePage}
                        color="primary"
                    />
                </Box>
            </Paper>
        </Box>
    );
};

export default SecurityAudit;
