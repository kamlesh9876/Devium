import React, { useState, useEffect } from 'react';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { rtdb } from '../../firebase';

import {
    CheckCircle as CheckCircleIcon,
    People as PeopleIcon,
    Person as PersonIcon,
    Delete as DeleteIcon,
    AdminPanelSettings as AdminPanelSettingsIcon,
    AccessTime as AccessTimeIcon,
    Group as GroupIcon,
    BugReport as BugReportIcon,
    TrendingUp as TrendingUpIcon,
    Add as AddIcon
} from '@mui/icons-material';
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
    FormControl,
    InputLabel,
    Select
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

interface Team {
    id: string;
    name: string;
    managerId: string;
    managerName: string;
    members: string[];
    createdAt: string;
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
    const [teams, setTeams] = useState<Team[]>([]);
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
    const [teamDialogOpen, setTeamDialogOpen] = useState(false);
    const [recentActivity, setRecentActivity] = useState<User[]>([]);

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
                // Load users
                const usersRef = ref(rtdb, 'users');
                const usersUnsubscribe = onValue(usersRef, (snapshot) => {
                    try {
                        if (!isMounted) return;
                        
                        const data = snapshot.val();
                        if (!data) {
                            console.log('No user data available');
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
                    } catch (error) {
                        console.error('Error processing user data:', error);
                    }
                }, (error) => {
                    console.error('Firebase read failed:', error);
                });

                // Load teams
                const teamsRef = ref(rtdb, 'teams');
                const teamsUnsubscribe = onValue(teamsRef, (snapshot) => {
                    try {
                        if (!isMounted) return;
                        
                        const data = snapshot.val();
                        if (data) {
                            const teamsList: Team[] = Object.entries(data).map(([id, teamData]: [string, any]) => ({
                                id,
                                name: teamData?.name || 'Unknown Team',
                                managerId: teamData?.managerId || '',
                                managerName: teamData?.managerName || 'Unknown Manager',
                                members: teamData?.members || [],
                                createdAt: teamData?.createdAt || new Date().toISOString(),
                            }));
                            setTeams(teamsList);
                        }
                    } catch (error) {
                        console.error('Error processing team data:', error);
                    }
                });

                return () => {
                    try {
                        usersUnsubscribe();
                        teamsUnsubscribe();
                    } catch (error) {
                        console.error('Error unsubscribing:', error);
                    }
                };
            } catch (error) {
                console.error('Error setting up Firebase listener:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleCreateTeam = async (teamName: string, managerId: string) => {
        try {
            const manager = users.find(u => u.uid === managerId);
            if (!manager) {
                console.error('Selected manager not found');
                return;
            }

            const newTeamRef = push(ref(rtdb, 'teams'));
            const teamData = {
                name: teamName,
                managerId: managerId,
                managerName: manager.name,
                members: [],
                createdAt: new Date().toISOString(),
                performance: 0,
                growth: 0,
                projects: []
            };

            await set(newTeamRef, teamData);
            setTeamDialogOpen(false);
        } catch (error) {
            console.error('Error creating team:', error);
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        if (window.confirm('Are you sure you want to delete this team?')) {
            await remove(ref(rtdb, `teams/${teamId}`));
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

            {/* Team Management Section */}
            <Paper sx={{ p: 3, mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Team Management
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setTeamDialogOpen(true)}
                    >
                        Create Team
                    </Button>
                </Box>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Team Name</TableCell>
                                <TableCell>Manager</TableCell>
                                <TableCell>Members</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {teams.map((team) => (
                                <TableRow key={team.id}>
                                    <TableCell>{team.name}</TableCell>
                                    <TableCell>{team.managerName}</TableCell>
                                    <TableCell>{team.members.length}</TableCell>
                                    <TableCell>{new Date(team.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteTeam(team.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Team Creation Dialog */}
            <Dialog open={teamDialogOpen} onClose={() => setTeamDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Team Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        sx={{ mb: 2 }}
                        id="team-name-input"
                    />
                    <FormControl fullWidth>
                        <InputLabel>Assign Manager</InputLabel>
                        <Select
                            label="Assign Manager"
                            id="manager-select"
                        >
                            {users.filter(u => u.role === 'manager').map((manager) => (
                                <MenuItem key={manager.uid} value={manager.uid}>
                                    {manager.name} ({manager.email})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTeamDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            const teamName = (document.getElementById('team-name-input') as HTMLInputElement)?.value;
                            const managerId = (document.getElementById('manager-select') as HTMLSelectElement)?.value;
                            if (teamName && managerId) {
                                handleCreateTeam(teamName, managerId);
                            }
                        }}
                        variant="contained"
                    >
                        Create Team
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
