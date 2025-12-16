import { useState, useEffect } from 'react';
import { ref, onValue, push, set } from 'firebase/database';
import { rtdb } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { 
    Box, 
    Typography, 
    Paper, 
    Select, 
    MenuItem, 
    FormControl, 
    InputLabel, 
    Button, 
    TextField, 
    Card, 
    CardContent, 
    IconButton, 
    Avatar, 
    Chip, 
    Grid, 
    LinearProgress, 
    Alert, 
    TableContainer, 
    Table, 
    TableHead, 
    TableRow, 
    TableCell
} from '@mui/material';
import {
    Visibility,
    Edit,
    Delete
} from '@mui/icons-material';

import TeamStats from '../../components/TeamStats';
import MemberCard from '../../components/MemberCard';
import MemberDialog from '../../components/MemberDialog';

/* ================= TYPES ================= */

interface TeamMember {
    uid: string;
    name: string;
    email: string;
    role: string;
    status: string;
    tasksCompleted: number;
    performance: number;
}

interface Project {
    id: string;
    name: string;
    status: string;
    progress: number;
    tasks: number;
    completedTasks: number;
}

interface Team {
    id: string;
    name: string;
    managerId: string;
    members: TeamMember[];
    projects: Project[];
    performance: number;
    growth: number;
    teamDescription: string;
    teamLogo: string;
}

/* ================= COMPONENT ================= */

export default function ManagerDashboard() {
    const { user } = useAuth();

    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

    const handleViewDetails = (member: TeamMember) => {
        setSelectedMember(member);
        setDetailsDialogOpen(true);
    };

    const handleViewAnalytics = (member: TeamMember) => {
        setSelectedMember(member);
        setAnalyticsDialogOpen(true);
    };

    const handleCloseDetails = () => {
        setDetailsDialogOpen(false);
        setSelectedMember(null);
    };

    const handleCloseAnalytics = () => {
        setAnalyticsDialogOpen(false);
        setSelectedMember(null);
    };

    /* ================= DATA LOAD ================= */

    useEffect(() => {
        if (!user) {
            setError('User not authenticated');
            setLoading(false);
            return;
        }

        const usersRef = ref(rtdb, 'users');
        const teamsRef = ref(rtdb, 'teams');
        const projectsRef = ref(rtdb, 'projects');

        let usersData: any = {};
        let projectsData: any[] = [];

        const unsubUsers = onValue(usersRef, snap => {
            usersData = snap.val() || {};
        });

        const unsubProjects = onValue(projectsRef, snap => {
            const data = snap.val();
            if (data) {
                projectsData = Object.entries(data).map(([id, projectData]: [string, any]) => ({
                    id,
                    ...projectData
                }));
            }
        });

        const unsubTeams = onValue(
            teamsRef,
            snap => {
                const data = snap.val();
                if (!data) {
                    setTeams([]);
                    setProjects([]);
                    setLoading(false);
                    return;
                }

                const allTeams: Team[] = Object.entries(data).map(
                    ([id, teamData]: [string, any]) => {
                        let members: TeamMember[] = [];

                        if (Array.isArray(teamData?.members)) {
                            members = teamData.members.map((uid: any) => {
                                const u = usersData[uid] || {};
                                return {
                                    uid,
                                    name: u.name || `User ${uid.slice(-4)}`,
                                    email: u.email || '',
                                    role: u.role || 'developer',
                                    status: u.status || 'active',
                                    tasksCompleted: Math.floor(Math.random() * 20) + 5,
                                    performance: Math.floor(Math.random() * 30) + 70,
                                };
                            });
                        }

                        return {
                            id,
                            name: teamData?.name || 'Unnamed Team',
                            managerId: teamData?.managerId || '',
                            members,
                            projects: teamData?.projects || [],
                            performance: teamData?.performance || 0,
                            growth: teamData?.growth || 0,
                            teamDescription: teamData?.teamDescription || '',
                            teamLogo: teamData?.teamLogo || '', // ✅ FIXED
                        };
                    }
                );

                const visibleTeams = allTeams.filter(
                    team =>
                        team.managerId === user.uid ||
                        team.members.some(m => m.uid === user.uid)
                );

                setTeams(visibleTeams);
                setSelectedTeam(visibleTeams[0] || null);
                setProjects(projectsData);
                setLoading(false);
            },
            () => {
                setError('Failed to load teams');
                setLoading(false);
            }
        );

        return () => {
            unsubUsers();
            unsubTeams();
            unsubProjects();
        };
    }, [user]);

    if (loading) {
        return (
            <Box sx={{ width: '100%' }}>
                <LinearProgress />
            </Box>
        );
    }

    /* ================= UI ================= */

    return (
        <Box sx={{ p: 3 }}>
            {/* Enhanced Header Section */}
            <Box sx={{ 
                textAlign: 'center', 
                mb: 6,
                position: 'relative',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: -50,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    zIndex: -1
                }
            }}>
                <Typography 
                    variant="h2" 
                    fontWeight="bold" 
                    mb={2}
                    sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontSize: { xs: '2.5rem', md: '3.5rem' },
                        letterSpacing: '-0.02em'
                    }}
                >
                    Team Management
                </Typography>
                <Typography 
                    variant="h6" 
                    color="text.secondary"
                    sx={{ 
                        maxWidth: 700, 
                        mx: 'auto', 
                        lineHeight: 1.6,
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: { xs: '1rem', md: '1.1rem' }
                    }}
                >
                    Manage your teams and track performance
                </Typography>
                
                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mt: 4, maxWidth: 800, mx: 'auto' }}>
                    <Grid item xs={12} sm={4}>
                        <Box sx={{
                            p: 3,
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
                            borderRadius: '16px',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <Typography variant="h3" sx={{ 
                                fontWeight: 'bold', 
                                color: '#3b82f6',
                                mb: 1 
                            }}>
                                {teams.length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                Total Teams
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Box sx={{
                            p: 3,
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)',
                            borderRadius: '16px',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <Typography variant="h3" sx={{ 
                                fontWeight: 'bold', 
                                color: '#10b981',
                                mb: 1 
                            }}>
                                {teams.reduce((acc, team) => acc + team.members.length, 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                Team Members
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Box sx={{
                            p: 3,
                            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
                            borderRadius: '16px',
                            border: '1px solid rgba(251, 191, 36, 0.2)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <Typography variant="h3" sx={{ 
                                fontWeight: 'bold', 
                                color: '#fbbf24',
                                mb: 1 
                            }}>
                                {projects.length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                Active Projects
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Box>

            {error && (
                <Alert severity="error" sx={{ 
                    mb: 3,
                    bgcolor: 'rgba(244, 67, 54, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(244, 67, 54, 0.3)'
                }}>
                    {error}
                </Alert>
            )}

            {teams.length === 0 ? (
                <Paper sx={{ 
                    p: 6, 
                    textAlign: 'center',
                    background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    borderRadius: '16px'
                }}>
                    <Typography variant="h5" color="white" gutterBottom fontWeight="bold">
                        No Teams Assigned
                    </Typography>
                    <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" sx={{ maxWidth: 400, mx: 'auto' }}>
                        You haven't been assigned to any teams yet. Contact your administrator to get started.
                    </Typography>
                </Paper>
            ) : (
                <>
                    {/* Enhanced Team Selection */}
                    <Paper sx={{ 
                        p: 4, 
                        mb: 4,
                        background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                        borderRadius: '16px',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
                            borderRadius: '16px 16px 0 0'
                        }
                    }}>
                        <Typography variant="h6" fontWeight="bold" mb={3} color="white" sx={{ fontSize: '1.3rem' }}>
                            Team Selection
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel sx={{ 
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    '&.Mui-focused': { color: '#3b82f6' }
                                }}>Select Team</InputLabel>
                                <Select
                                    value={selectedTeam?.id || ''}
                                    label="Select Team"
                                    onChange={e =>
                                        setSelectedTeam(
                                            teams.find(t => t.id === e.target.value) || null
                                        )
                                    }
                                    sx={{ 
                                        color: 'white',
                                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '12px',
                                        '& .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(255, 255, 255, 0.2)'
                                        },
                                        '&:hover .MuiOutlinedInput-notchedOutline': {
                                            borderColor: 'rgba(255, 255, 255, 0.3)'
                                        },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                            borderColor: '#3b82f6',
                                            borderWidth: '2px'
                                        },
                                        '& .MuiSvgIcon-root': {
                                            color: 'white'
                                        }
                                    }}
                                >
                                    {teams.map(team => (
                                        <MenuItem key={team.id} value={team.id} sx={{ color: 'black' }}>
                                            {team.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Paper>

                <TeamStats selectedTeam={selectedTeam} teams={teams} />

                {/* Team Overview */}
                {selectedTeam && (
                    <Grid container spacing={3}>
                        {selectedTeam.members.map(member => (
                            <Grid item xs={12} md={6} lg={4} key={member.uid}>
                                <Card 
                                    sx={{ 
                                        height: '100%',
                                        borderRadius: 3,
                                        overflow: 'hidden',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                        '&:hover': { 
                                            transform: 'translateY(-8px)', 
                                            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
                                            borderColor: 'rgba(255, 255, 255, 0.2)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                                            <Box flex={1}>
                                                <Typography variant="h6" fontWeight="bold" color="white">
                                                    {member.name}
                                                </Typography>
                                                <Typography variant="body2" color="rgba(255, 255, 255, 0.8)" sx={{ mb: 2 }}>
                                                    {member.email}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                                    <Chip 
                                                        label={member.role} 
                                                        size="small" 
                                                        sx={{ 
                                                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                            color: 'white',
                                                            border: '1px solid rgba(255, 255, 255, 0.2)'
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <IconButton 
                                                    size="small"
                                                    sx={{ 
                                                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                        color: 'white',
                                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                                        '&:hover': { 
                                                            bgcolor: 'rgba(255, 255, 255, 0.2)',
                                                            transform: 'scale(1.1)'
                                                        },
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    title="View Details"
                                                    onClick={() => handleViewDetails(member)}
                                                >
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Box>

                                        {/* Performance Stats */}
                                        <Grid container spacing={2} sx={{ mb: 3 }}>
                                            <Grid item xs={6}>
                                                <Box sx={{ 
                                                    textAlign: 'center', 
                                                    p: 2, 
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    borderRadius: 2,
                                                    border: '1px solid rgba(102, 126, 234, 0.3)',
                                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)'
                                                }}>
                                                    <Typography variant="h6" color="white" fontWeight="bold">
                                                        {member.tasksCompleted}
                                                    </Typography>
                                                    <Typography variant="caption" color="rgba(255, 255, 255, 0.9)">Tasks</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Box sx={{ 
                                                    textAlign: 'center', 
                                                    p: 2, 
                                                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                                    borderRadius: 2,
                                                    border: '1px solid rgba(245, 87, 108, 0.3)',
                                                    boxShadow: '0 4px 12px rgba(245, 87, 108, 0.2)'
                                                }}>
                                                    <Typography variant="h6" color="white" fontWeight="bold">
                                                        {member.performance}%
                                                    </Typography>
                                                    <Typography variant="caption" color="rgba(255, 255, 255, 0.9)">Performance</Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>

                                        {/* Status and Actions */}
                                        <Box sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            p: 2,
                                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: 2,
                                            border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                            <Chip
                                                label={member.status}
                                                size="small"
                                                sx={{ 
                                                    bgcolor: member.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white',
                                                    border: member.status === 'active' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)'
                                                }}
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}

                {/* Projects Overview */}
                <Paper sx={{ 
                    p: 3, 
                    mb: 3,
                    background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                    <Typography variant="h6" fontWeight="bold" mb={2} color="white">
                        Your Projects
                    </Typography>
                    {(() => {
                        if (!user || !projects) return null;
                        
                        // Debug: Log the projects and user info
                        console.log('User ID:', user.uid);
                        console.log('All Projects:', projects);
                        console.log('Selected Team ID:', selectedTeam?.id);
                        
                        // Debug: Log each project's teamId
                        projects.forEach(project => {
                            console.log(`Project "${project.name}" - teamId: ${project.teamId}`);
                        });
                        
                        // Temporarily show all projects to see their structure
                        const filteredProjects = projects;
                        
                        console.log('Filtered Projects Count:', filteredProjects.length);
                        
                        return filteredProjects.length > 0 ? (
                            <Grid container spacing={3}>
                                {filteredProjects.map((project) => (
                                    <Grid item xs={12} md={6} lg={4} key={project.id}>
                                        <Card 
                                            sx={{ 
                                                height: '100%',
                                                borderRadius: 3,
                                                overflow: 'hidden',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                                '&:hover': { 
                                                    transform: 'translateY(-8px)', 
                                                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
                                                    borderColor: 'rgba(255, 255, 255, 0.2)'
                                                }
                                            }}
                                        >
                                            <CardContent sx={{ p: 3 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                                                    <Box flex={1}>
                                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="white" sx={{ fontSize: '1.1rem' }}>
                                                            {project?.name}
                                                        </Typography>
                                                        <Typography variant="body2" color="rgba(255, 255, 255, 0.8)" sx={{ mb: 2 }}>
                                                            {project?.description || 'No description available'}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                                            <Chip
                                                                label={project?.status?.replace('-', ' ').toUpperCase() || 'UNKNOWN'}
                                                                size="small"
                                                                sx={{ 
                                                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                                    color: 'white',
                                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                    fontSize: '0.7rem'
                                                                }}
                                                            />
                                                            <Chip
                                                                label={project?.priority?.toUpperCase() || 'MEDIUM'}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{ 
                                                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                                    color: 'white',
                                                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                                                    fontSize: '0.7rem'
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                
                                                {/* Progress Section */}
                                                <Box sx={{ mb: 3 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                                        <Typography variant="body2" fontWeight="600" color="white">
                                                            Progress
                                                        </Typography>
                                                        <Typography variant="body2" color="rgba(255, 255, 255, 0.8)">
                                                            {project?.progress || 0}%
                                                        </Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={project?.progress || 0}
                                                        sx={{ 
                                                            height: 8, 
                                                            borderRadius: 4,
                                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                            '& .MuiLinearProgress-bar': {
                                                                borderRadius: 4,
                                                                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                                
                                                {/* Project Info */}
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center',
                                                    p: 2,
                                                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                                                    borderRadius: 2,
                                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                                }}>
                                                    <Typography variant="caption" color="rgba(255, 255, 255, 0.8)">
                                                        {project?.completedTasks || 0}/{project?.tasks || 0} tasks
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <Paper sx={{ 
                                p: 4, 
                                textAlign: 'center', 
                                background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                            }}>
                                <Typography variant="h6" color="white" gutterBottom>
                                    No Projects Assigned
                                </Typography>
                                <Typography variant="body2" color="rgba(255, 255, 255, 0.8)">
                                    You have no projects assigned to you
                                </Typography>
                            </Paper>
                        );
                        })()}
                    </Paper>
                </>
            )}
        </Box>
    );
};
