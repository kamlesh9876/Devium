import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    Switch,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Tooltip,
    IconButton,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    LinearProgress
} from '@mui/material';
import {
    ToggleOn as ToggleOnIcon,
    ToggleOff as ToggleOffIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Settings as SettingsIcon,
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    History as HistoryIcon,
    Group as GroupIcon,
    DeveloperMode as DeveloperIcon
} from '@mui/icons-material';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { rtdb } from '../../firebase';

interface FeatureFlag {
    id: string;
    key: string;
    name: string;
    description: string;
    enabled: boolean;
    rolloutPercentage: number;
    targetUsers: string[];
    targetRoles: string[];
    targetTeams: string[];
    environment: 'development' | 'staging' | 'production';
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    tags: string[];
}

interface FlagHistory {
    id: string;
    flagId: string;
    action: string;
    oldValue: any;
    newValue: any;
    userId: string;
    userName: string;
    timestamp: string;
    details: string;
}

const FeatureFlags: React.FC = () => {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [flagHistory, setFlagHistory] = useState<FlagHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
    const [formData, setFormData] = useState<Partial<FeatureFlag>>({
        name: '',
        key: '',
        description: '',
        enabled: false,
        rolloutPercentage: 100,
        targetUsers: [],
        targetRoles: [],
        targetTeams: [],
        environment: 'development',
        tags: []
    });
    const [activeTab, setActiveTab] = useState(0);
    const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Generate sample feature flags
        const sampleFlags: FeatureFlag[] = [
            {
                id: '1',
                key: 'new_dashboard',
                name: 'New Dashboard UI',
                description: 'Enable the new dashboard interface for users',
                enabled: true,
                rolloutPercentage: 100,
                targetUsers: [],
                targetRoles: ['admin', 'manager'],
                targetTeams: [],
                environment: 'production',
                createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
                updatedAt: new Date(Date.now() - 3600000).toISOString(),
                createdBy: 'admin@example.com',
                tags: ['ui', 'dashboard', 'beta']
            },
            {
                id: '2',
                key: 'advanced_analytics',
                name: 'Advanced Analytics',
                description: 'Enable advanced analytics and reporting features',
                enabled: true,
                rolloutPercentage: 50,
                targetUsers: [],
                targetRoles: [],
                targetTeams: ['team1', 'team2'],
                environment: 'staging',
                createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
                updatedAt: new Date(Date.now() - 1800000).toISOString(),
                createdBy: 'admin@example.com',
                tags: ['analytics', 'reporting', 'beta']
            },
            {
                id: '3',
                key: 'real_time_notifications',
                name: 'Real-time Notifications',
                description: 'Enable real-time push notifications',
                enabled: false,
                rolloutPercentage: 0,
                targetUsers: ['user1', 'user2'],
                targetRoles: [],
                targetTeams: [],
                environment: 'development',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                updatedAt: new Date(Date.now() - 900000).toISOString(),
                createdBy: 'admin@example.com',
                tags: ['notifications', 'real-time', 'experimental']
            },
            {
                id: '4',
                key: 'bulk_operations',
                name: 'Bulk User Operations',
                description: 'Enable bulk user management features',
                enabled: true,
                rolloutPercentage: 100,
                targetUsers: [],
                targetRoles: ['admin'],
                targetTeams: [],
                environment: 'production',
                createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
                updatedAt: new Date(Date.now() - 7200000).toISOString(),
                createdBy: 'admin@example.com',
                tags: ['admin', 'bulk', 'operations']
            }
        ];

        const sampleHistory: FlagHistory[] = [
            {
                id: '1',
                flagId: '1',
                action: 'enabled',
                oldValue: false,
                newValue: true,
                userId: 'admin',
                userName: 'Admin User',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                details: 'Enabled feature for production environment'
            },
            {
                id: '2',
                flagId: '2',
                action: 'rollout_changed',
                oldValue: 25,
                newValue: 50,
                userId: 'admin',
                userName: 'Admin User',
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                details: 'Increased rollout percentage from 25% to 50%'
            },
            {
                id: '3',
                flagId: '3',
                action: 'disabled',
                oldValue: true,
                newValue: false,
                userId: 'admin',
                userName: 'Admin User',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                details: 'Disabled feature for maintenance'
            }
        ];

        setFlags(sampleFlags);
        setFlagHistory(sampleHistory);
        setLoading(false);
    }, []);

    const handleToggleFlag = async (flagId: string, enabled: boolean) => {
        try {
            const flag = flags.find(f => f.id === flagId);
            if (!flag) return;

            await update(ref(rtdb, `featureFlags/${flagId}`), {
                enabled,
                updatedAt: new Date().toISOString()
            });

            setFlags(flags.map(f => 
                f.id === flagId ? { ...f, enabled, updatedAt: new Date().toISOString() } : f
            ));

            // Add to history
            const historyEntry: FlagHistory = {
                id: Date.now().toString(),
                flagId,
                action: enabled ? 'enabled' : 'disabled',
                oldValue: !enabled,
                newValue: enabled,
                userId: 'admin',
                userName: 'Admin User',
                timestamp: new Date().toISOString(),
                details: `${enabled ? 'Enabled' : 'Disabled'} feature flag`
            };
            setFlagHistory([historyEntry, ...flagHistory]);
        } catch (error) {
            console.error('Error toggling flag:', error);
        }
    };

    const handleSaveFlag = async () => {
        try {
            if (editingFlag) {
                // Update existing flag
                await update(ref(rtdb, `featureFlags/${editingFlag.id}`), {
                    ...formData,
                    updatedAt: new Date().toISOString()
                });
                setFlags(flags.map(f => 
                    f.id === editingFlag.id ? { ...f, ...formData, updatedAt: new Date().toISOString() } : f
                ));
            } else {
                // Create new flag
                const newFlag: FeatureFlag = {
                    ...formData,
                    id: Date.now().toString(),
                    key: formData.key || formData.name?.toLowerCase().replace(/\s+/g, '_'),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdBy: 'admin@example.com'
                } as FeatureFlag;
                
                await set(ref(rtdb, `featureFlags/${newFlag.id}`), newFlag);
                setFlags([...flags, newFlag]);
            }

            setDialogOpen(false);
            setEditingFlag(null);
            setFormData({
                name: '',
                key: '',
                description: '',
                enabled: false,
                rolloutPercentage: 100,
                targetUsers: [],
                targetRoles: [],
                targetTeams: [],
                environment: 'development',
                tags: []
            });
        } catch (error) {
            console.error('Error saving flag:', error);
        }
    };

    const handleDeleteFlag = async (flagId: string) => {
        if (!window.confirm('Are you sure you want to delete this feature flag?')) return;

        try {
            await remove(ref(rtdb, `featureFlags/${flagId}`));
            setFlags(flags.filter(f => f.id !== flagId));
        } catch (error) {
            console.error('Error deleting flag:', error);
        }
    };

    const getEnvironmentColor = (environment: string) => {
        switch (environment) {
            case 'production': return 'error';
            case 'staging': return 'warning';
            case 'development': return 'success';
            default: return 'default';
        }
    };

    const getRolloutStatus = (flag: FeatureFlag) => {
        if (!flag.enabled) return { color: 'default', text: 'Disabled' };
        if (flag.rolloutPercentage === 100) return { color: 'success', text: 'Full Rollout' };
        if (flag.rolloutPercentage === 0) return { color: 'warning', text: 'Testing' };
        return { color: 'info', text: `${flag.rolloutPercentage}% Rollout` };
    };

    const filteredFlags = flags.filter(flag => {
        const matchesSearch = searchTerm === '' || 
            flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            flag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            flag.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesEnvironment = selectedEnvironment === 'all' || flag.environment === selectedEnvironment;
        
        return matchesSearch && matchesEnvironment;
    });

    const environmentStats = {
        all: flags.length,
        development: flags.filter(f => f.environment === 'development').length,
        staging: flags.filter(f => f.environment === 'staging').length,
        production: flags.filter(f => f.environment === 'production').length
    };

    if (loading) {
        return <Box sx={{ p: 3 }}>Loading feature flags...</Box>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Feature Flags Manager
            </Typography>

            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <SettingsIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Total Flags</Typography>
                            </Box>
                            <Typography variant="h4" color="primary">
                                {flags.length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <ToggleOnIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Active</Typography>
                            </Box>
                            <Typography variant="h4" color="success">
                                {flags.filter(f => f.enabled).length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <ToggleOffIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Inactive</Typography>
                            </Box>
                            <Typography variant="h4" color="error">
                                {flags.filter(f => !f.enabled).length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <DeveloperIcon sx={{ mr: 1 }} />
                                <Typography variant="h6">Production</Typography>
                            </Box>
                            <Typography variant="h4" color="warning">
                                {environmentStats.production}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Controls */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Search flags"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Environment</InputLabel>
                            <Select
                                value={selectedEnvironment}
                                onChange={(e) => setSelectedEnvironment(e.target.value)}
                            >
                                <MenuItem value="all">All Environments</MenuItem>
                                <MenuItem value="development">Development</MenuItem>
                                <MenuItem value="staging">Staging</MenuItem>
                                <MenuItem value="production">Production</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => {
                                    setEditingFlag(null);
                                    setFormData({
                                        name: '',
                                        key: '',
                                        description: '',
                                        enabled: false,
                                        rolloutPercentage: 100,
                                        targetUsers: [],
                                        targetRoles: [],
                                        targetTeams: [],
                                        environment: 'development',
                                        tags: []
                                    });
                                    setDialogOpen(true);
                                }}
                            >
                                New Feature Flag
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            {/* Feature Flags Table */}
            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Status</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Key</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell>Environment</TableCell>
                                <TableCell>Rollout</TableCell>
                                <TableCell>Targeting</TableCell>
                                <TableCell>Updated</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredFlags.map((flag) => {
                                const rolloutStatus = getRolloutStatus(flag);
                                return (
                                    <TableRow key={flag.id} hover>
                                        <TableCell>
                                            <Switch
                                                checked={flag.enabled}
                                                onChange={() => handleToggleFlag(flag.id, !flag.enabled)}
                                                color="primary"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="subtitle2">
                                                {flag.name}
                                            </Typography>
                                            <Box sx={{ mt: 0.5 }}>
                                                {flag.tags.map((tag, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={tag}
                                                        size="small"
                                                        sx={{ mr: 0.5, fontSize: '0.7rem' }}
                                                        variant="outlined"
                                                    />
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {flag.key}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ maxWidth: 200 }}>
                                                {flag.description}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={flag.environment}
                                                color={getEnvironmentColor(flag.environment) as any}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                <Chip
                                                    label={rolloutStatus.text}
                                                    color={rolloutStatus.color as any}
                                                    size="small"
                                                    sx={{ mb: 0.5 }}
                                                />
                                                {flag.enabled && flag.rolloutPercentage < 100 && (
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={flag.rolloutPercentage}
                                                        sx={{ height: 4 }}
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box>
                                                {flag.targetRoles.length > 0 && (
                                                    <Tooltip title={`Roles: ${flag.targetRoles.join(', ')}`}>
                                                        <Chip
                                                            label={`${flag.targetRoles.length} roles`}
                                                            size="small"
                                                            sx={{ mr: 0.5, mb: 0.5 }}
                                                        />
                                                    </Tooltip>
                                                )}
                                                {flag.targetTeams.length > 0 && (
                                                    <Tooltip title={`Teams: ${flag.targetTeams.join(', ')}`}>
                                                        <Chip
                                                            label={`${flag.targetTeams.length} teams`}
                                                            size="small"
                                                            sx={{ mr: 0.5, mb: 0.5 }}
                                                        />
                                                    </Tooltip>
                                                )}
                                                {flag.targetUsers.length > 0 && (
                                                    <Tooltip title={`Users: ${flag.targetUsers.length} specific users`}>
                                                        <Chip
                                                            label={`${flag.targetUsers.length} users`}
                                                            size="small"
                                                        />
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(flag.updatedAt).toLocaleDateString()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            setEditingFlag(flag);
                                                            setFormData(flag);
                                                            setDialogOpen(true);
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDeleteFlag(flag.id)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingFlag ? 'Edit Feature Flag' : 'Create Feature Flag'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Key"
                                value={formData.key}
                                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                                helperText="Auto-generated from name if empty"
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                multiline
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Environment</InputLabel>
                                <Select
                                    value={formData.environment}
                                    onChange={(e) => setFormData({ ...formData, environment: e.target.value as any })}
                                >
                                    <MenuItem value="development">Development</MenuItem>
                                    <MenuItem value="staging">Staging</MenuItem>
                                    <MenuItem value="production">Production</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                label="Rollout Percentage"
                                type="number"
                                inputProps={{ min: 0, max: 100 }}
                                value={formData.rolloutPercentage}
                                onChange={(e) => setFormData({ ...formData, rolloutPercentage: parseInt(e.target.value) || 0 })}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth>
                                <InputLabel>Target Roles</InputLabel>
                                <Select
                                    multiple
                                    value={formData.targetRoles || []}
                                    onChange={(e) => setFormData({ ...formData, targetRoles: e.target.value as string[] })}
                                    renderValue={(selected) => (selected as string[]).join(', ')}
                                >
                                    <MenuItem value="admin">Admin</MenuItem>
                                    <MenuItem value="manager">Manager</MenuItem>
                                    <MenuItem value="developer">Developer</MenuItem>
                                    <MenuItem value="tester">Tester</MenuItem>
                                    <MenuItem value="user">User</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveFlag}>
                        {editingFlag ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* History Section */}
            <Accordion sx={{ mt: 3 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">Recent Changes</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <List>
                        {flagHistory.slice(0, 10).map((history) => (
                            <React.Fragment key={history.id}>
                                <ListItem>
                                    <ListItemIcon>
                                        <HistoryIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box>
                                                <Typography variant="body2">
                                                    {history.userName} {history.action} feature flag
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(history.timestamp).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        }
                                        secondary={history.details}
                                    />
                                </ListItem>
                                <Divider variant="inset" component="li" />
                            </React.Fragment>
                        ))}
                    </List>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};

export default FeatureFlags;
