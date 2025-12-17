
import { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { rtdb } from '../firebase';
import TaskManagement from '../components/TaskManagement';
import TaskAssignment from '../components/TaskAssignment';
import WorkflowManagement from '../components/WorkflowManagement';
import TaskDependencyTracking from '../components/TaskDependencyTracking';
import {
    Container,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    LinearProgress,
    Paper,
    IconButton,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    Assignment as AssignmentIcon,
    Search as SearchIcon,
    Grid3x3 as GridViewIcon,
    ViewList as ListViewIcon,
    People as PeopleIcon,
    AccountTree as AccountTreeIcon
} from '@mui/icons-material';

interface Project {
    id: string;
    name: string;
    description: string;
    status: 'planning' | 'in-progress' | 'testing' | 'completed' | 'on-hold';
    progress: number;
    teamId: string;
    teamName: string;
    tasks: number;
    completedTasks: number;
    startDate: string;
    endDate?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignedMembers: string[];
}

export default function Projects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [viewMode, setViewMode] = useState('grid');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        description: '',
        status: 'planning' as Project['status'],
        priority: 'medium' as Project['priority'],
        progress: 0,
        tasks: 0,
        completedTasks: 0
    });

    useEffect(() => {
        const loadData = () => {
            // Load projects
            const projectsRef = ref(rtdb, 'projects');
            const projectsUnsubscribe = onValue(projectsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const projectsList: Project[] = Object.entries(data).map(([id, projectData]: [string, any]) => ({
                        id,
                        name: projectData?.name || 'Unknown Project',
                        description: projectData?.description || '',
                        status: projectData?.status || 'planning',
                        progress: projectData?.progress || 0,
                        teamId: projectData?.teamId || '',
                        teamName: projectData?.teamName || 'Unassigned',
                        tasks: projectData?.tasks || 0,
                        completedTasks: projectData?.completedTasks || 0,
                        startDate: projectData?.startDate || new Date().toISOString(),
                        endDate: projectData?.endDate,
                        priority: projectData?.priority || 'medium',
                        assignedMembers: projectData?.assignedMembers || []
                    }));
                    setProjects(projectsList);
                }
                setLoading(false);
            });

            return () => {
                projectsUnsubscribe();
            };
        };

        loadData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'success';
            case 'in-progress': return 'primary';
            case 'testing': return 'warning';
            case 'on-hold': return 'error';
            default: return 'default';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'error';
            case 'high': return 'warning';
            case 'medium': return 'info';
            case 'low': return 'success';
            default: return 'default';
        }
    };

    // Filter and sort projects
    const filteredAndSortedProjects = projects
        .filter(project => {
            const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               project.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
            return matchesSearch && matchesStatus && matchesPriority;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'progress':
                    return b.progress - a.progress;
                case 'startDate':
                    return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
                case 'priority':
                    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                default:
                    return 0;
            }
        });

    const handleViewProject = (project: Project) => {
        setSelectedProject(project);
        setDetailsDialogOpen(true);
    };

    const handleEditProject = (project: Project) => {
        setSelectedProject(project);
        setEditForm({
            name: project.name,
            description: project.description,
            status: project.status,
            priority: project.priority,
            progress: project.progress,
            tasks: project.tasks,
            completedTasks: project.completedTasks
        });
        setEditDialogOpen(true);
    };

    const handleDeleteProject = (project: Project) => {
        setSelectedProject(project);
        setDeleteDialogOpen(true);
    };

    // Task Management Handlers
    const [selectedProjectForTasks, setSelectedProjectForTasks] = useState<Project | null>(null);
    const [taskManagementView, setTaskManagementView] = useState<'tasks' | 'assignment' | 'workflow' | 'dependencies' | null>(null);

    const handleManageTasks = (project: Project) => {
        setSelectedProjectForTasks(project);
        setTaskManagementView('tasks');
    };

    const handleTaskAssignment = (project: Project) => {
        setSelectedProjectForTasks(project);
        setTaskManagementView('assignment');
    };

    const handleWorkflowManagement = (project: Project) => {
        setSelectedProjectForTasks(project);
        setTaskManagementView('workflow');
    };

    const handleUpdateProject = async () => {
        if (!selectedProject) return;
        
        try {
            const projectRef = ref(rtdb, `projects/${selectedProject.id}`);
            await update(projectRef, {
                name: editForm.name,
                description: editForm.description,
                status: editForm.status,
                priority: editForm.priority,
                progress: editForm.progress,
                tasks: editForm.tasks,
                completedTasks: editForm.completedTasks,
                updatedAt: new Date().toISOString()
            });
            
            setEditDialogOpen(false);
            setSelectedProject(null);
        } catch (error) {
            console.error('Error updating project:', error);
        }
    };

    const handleConfirmDelete = async () => {
        if (!selectedProject) return;
        
        try {
            const projectRef = ref(rtdb, `projects/${selectedProject.id}`);
            await remove(projectRef);
            
            setDeleteDialogOpen(false);
            setSelectedProject(null);
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ my: 6 }}>
                    <LinearProgress />
                </Box>
            </Container>
        );
    }

    return (
    <Container maxWidth="xl">
        <Box sx={{ py: 6 }}>
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
                    Projects Dashboard
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
                    Manage and track all your projects in one place. Monitor progress, collaborate with your team, and achieve your goals efficiently.
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
                                {projects.length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                Total Projects
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
                                {projects.filter(p => p.status === 'completed').length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                Completed
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
                                {projects.filter(p => p.status === 'in-progress').length}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                In Progress
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Box>

            {/* Enhanced Search and Filter Controls */}
            <Paper sx={{ 
                p: 3, 
                mb: 4,
                background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
                    <Grid container spacing={3} alignItems="center">
                        {/* Enhanced Search Bar */}
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                placeholder="Search projects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.6)' }} />
                                        </InputAdornment>
                                    ),
                                    sx: {
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
                                        }
                                    }
                                }}
                                sx={{
                                    '& .MuiInputLabel-root': {
                                        color: 'rgba(255, 255, 255, 0.8)'
                                    }
                                }}
                            />
                        </Grid>

                        {/* Enhanced Status Filter */}
                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth>
                                <InputLabel sx={{ 
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    '&.Mui-focused': { color: '#3b82f6' }
                                }}>Status</InputLabel>
                                <Select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
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
                                            color: 'rgba(255, 255, 255, 0.8)'
                                        }
                                    }}
                                >
                                    <MenuItem value="all" sx={{ color: 'black' }}>All Status</MenuItem>
                                    <MenuItem value="planning" sx={{ color: 'black' }}>Planning</MenuItem>
                                    <MenuItem value="in-progress" sx={{ color: 'black' }}>In Progress</MenuItem>
                                    <MenuItem value="testing" sx={{ color: 'black' }}>Testing</MenuItem>
                                    <MenuItem value="completed" sx={{ color: 'black' }}>Completed</MenuItem>
                                    <MenuItem value="on-hold" sx={{ color: 'black' }}>On Hold</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Enhanced Priority Filter */}
                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth>
                                <InputLabel sx={{ 
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    '&.Mui-focused': { color: '#3b82f6' }
                                }}>Priority</InputLabel>
                                <Select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
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
                                            color: 'rgba(255, 255, 255, 0.8)'
                                        }
                                    }}
                                >
                                    <MenuItem value="all" sx={{ color: 'black' }}>All Priority</MenuItem>
                                    <MenuItem value="critical" sx={{ color: 'black' }}>Critical</MenuItem>
                                    <MenuItem value="high" sx={{ color: 'black' }}>High</MenuItem>
                                    <MenuItem value="medium" sx={{ color: 'black' }}>Medium</MenuItem>
                                    <MenuItem value="low" sx={{ color: 'black' }}>Low</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Enhanced Sort Options */}
                        <Grid item xs={12} md={2}>
                            <FormControl fullWidth>
                                <InputLabel sx={{ 
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    '&.Mui-focused': { color: '#3b82f6' }
                                }}>Sort By</InputLabel>
                                <Select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
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
                                            color: 'rgba(255, 255, 255, 0.8)'
                                        }
                                    }}
                                >
                                    <MenuItem value="name" sx={{ color: 'black' }}>Name</MenuItem>
                                    <MenuItem value="progress" sx={{ color: 'black' }}>Progress</MenuItem>
                                    <MenuItem value="startDate" sx={{ color: 'black' }}>Start Date</MenuItem>
                                    <MenuItem value="priority" sx={{ color: 'black' }}>Priority</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Enhanced View Mode Toggle */}
                        <Grid item xs={12} md={2}>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                <IconButton
                                    onClick={() => setViewMode('grid')}
                                    sx={{ 
                                        color: viewMode === 'grid' ? 'white' : 'rgba(255, 255, 255, 0.6)',
                                        bgcolor: viewMode === 'grid' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                        border: viewMode === 'grid' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '12px',
                                        padding: '8px'
                                    }}
                                >
                                    <GridViewIcon />
                                </IconButton>
                                <IconButton
                                    onClick={() => setViewMode('list')}
                                    sx={{ 
                                        color: viewMode === 'list' ? 'white' : 'rgba(255, 255, 255, 0.6)',
                                        bgcolor: viewMode === 'list' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                        border: viewMode === 'list' ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '12px',
                                        padding: '8px'
                                    }}
                                >
                                    <ListViewIcon />
                                </IconButton>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Statistics Dashboard */}
                <Paper sx={{ 
                    p: 3, 
                    mb: 4,
                    background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}>
                    <Typography variant="h6" fontWeight="bold" mb={3} color="white">
                        Project Statistics
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ 
                                textAlign: 'center', 
                                p: 2, 
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: 2,
                                border: '1px solid rgba(102, 126, 234, 0.3)',
                                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)'
                            }}>
                                <Typography variant="h4" color="white" fontWeight="bold">
                                    {projects.length}
                                </Typography>
                                <Typography variant="body2" color="rgba(255, 255, 255, 0.9)">
                                    Total Projects
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ 
                                textAlign: 'center', 
                                p: 2, 
                                background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                                borderRadius: 2,
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                            }}>
                                <Typography variant="h4" color="white" fontWeight="bold">
                                    {projects.filter(p => p.status === 'completed').length}
                                </Typography>
                                <Typography variant="body2" color="rgba(255, 255, 255, 0.9)">
                                    Completed
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ 
                                textAlign: 'center', 
                                p: 2, 
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                borderRadius: 2,
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
                            }}>
                                <Typography variant="h4" color="white" fontWeight="bold">
                                    {projects.filter(p => p.status === 'in-progress').length}
                                </Typography>
                                <Typography variant="body2" color="rgba(255, 255, 255, 0.9)">
                                    In Progress
                                </Typography>
                            </Box>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Box sx={{ 
                                textAlign: 'center', 
                                p: 2, 
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                borderRadius: 2,
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                            }}>
                                <Typography variant="h4" color="white" fontWeight="bold">
                                    {projects.filter(p => p.priority === 'critical').length}
                                </Typography>
                                <Typography variant="body2" color="rgba(255, 255, 255, 0.9)">
                                    Critical Priority
                                </Typography>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Enhanced Projects Grid */}
                {filteredAndSortedProjects.length > 0 ? (
                    <Grid container spacing={4}>
                        {filteredAndSortedProjects.map((project) => (
                            <Grid item xs={12} sm={6} md={4} lg={3} key={project.id}>
                                <Card 
                                    sx={{ 
                                        height: '100%', 
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        borderRadius: 3,
                                        overflow: 'hidden',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                        '&:hover': { 
                                            transform: 'translateY(-8px)', 
                                            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
                                            borderColor: 'rgba(255, 255, 255, 0.2)',
                                            '& .project-actions': {
                                                opacity: 1,
                                                transform: 'translateY(0)'
                                            }
                                        }
                                    }}
                                >
                                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                        {/* Project Header */}
                                        <Box sx={{ mb: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Box flex={1}>
                                                    <Typography 
                                                        variant="h6" 
                                                        fontWeight="bold" 
                                                        sx={{ 
                                                            lineHeight: 1.3,
                                                            mb: 1,
                                                            color: 'white',
                                                            fontSize: '1.1rem'
                                                        }}
                                                    >
                                                        {project.name}
                                                    </Typography>
                                                    <Typography 
                                                        variant="body2" 
                                                        color="rgba(255, 255, 255, 0.8)"
                                                        sx={{ 
                                                            lineHeight: 1.5,
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        {project.description}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            
                                            {/* Status and Priority Chips */}
                                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                <Chip
                                                    label={project.status.replace('-', ' ').toUpperCase()}
                                                    color={getStatusColor(project.status)}
                                                    size="small"
                                                    sx={{ 
                                                        fontWeight: 600,
                                                        fontSize: '0.65rem',
                                                        height: 24,
                                                        borderRadius: 1,
                                                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                        color: 'white',
                                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                                    }}
                                                />
                                                <Chip
                                                    label={project.priority.toUpperCase()}
                                                    color={getPriorityColor(project.priority)}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ 
                                                        fontWeight: 600,
                                                        fontSize: '0.65rem',
                                                        height: 24,
                                                        borderRadius: 1,
                                                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                        color: 'white',
                                                        borderColor: 'rgba(255, 255, 255, 0.3)'
                                                    }}
                                                />
                                            </Box>
                                        </Box>

                                        {/* Project Statistics */}
                                        <Box sx={{ mb: 3 }}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6}>
                                                    <Box sx={{ 
                                                        textAlign: 'center', 
                                                        p: 2, 
                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        borderRadius: 2,
                                                        border: '1px solid rgba(102, 126, 234, 0.3)',
                                                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)',
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: '0 6px 20px rgba(102, 126, 234, 0.3)'
                                                        }
                                                    }}>
                                                        <Typography variant="h5" color="white" fontWeight="bold">
                                                            {project.progress}%
                                                        </Typography>
                                                        <Typography variant="caption" color="rgba(255, 255, 255, 0.9)" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                                            Progress
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={6}>
                                                    <Box sx={{ 
                                                        textAlign: 'center', 
                                                        p: 2, 
                                                        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                                        borderRadius: 2,
                                                        border: '1px solid rgba(245, 87, 108, 0.3)',
                                                        boxShadow: '0 4px 12px rgba(245, 87, 108, 0.2)',
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: '0 6px 20px rgba(245, 87, 108, 0.3)'
                                                        }
                                                    }}>
                                                        <Typography variant="h5" color="white" fontWeight="bold">
                                                            {project.completedTasks}
                                                        </Typography>
                                                        <Typography variant="caption" color="rgba(255, 255, 255, 0.9)" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                                                            Tasks Done
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </Box>

                                        {/* Enhanced Progress Section */}
                                        <Box sx={{ mb: 3 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                                <Typography variant="body2" fontWeight="600" color="white">
                                                    Overall Progress
                                                </Typography>
                                                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)" sx={{ fontSize: '0.8rem' }}>
                                                    {project.completedTasks}/{project.tasks} tasks
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={project.progress}
                                                sx={{ 
                                                    height: 10, 
                                                    borderRadius: 5,
                                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 5,
                                                        background: project.progress >= 75 ? 'linear-gradient(90deg, #10b981, #34d399)' : 
                                                                     project.progress >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 
                                                                     'linear-gradient(90deg, #ef4444, #f87171)',
                                                    }
                                                }}
                                            />
                                        </Box>

                                        {/* Project Information */}
                                        <Box sx={{
                                            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                            borderRadius: '12px',
                                            p: 2,
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            mb: 2
                                        }}>
                                            <Typography variant="caption" color="rgba(255, 255, 255, 0.8)" sx={{ fontWeight: 500 }}>
                                                {new Date(project.startDate).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                    
                                    {/* Enhanced Card Actions */}
                                    <Box sx={{ 
                                        p: 2, 
                                        bgcolor: 'rgba(0, 0, 0, 0.3)',
                                        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                        <Box 
                                            className="project-actions"
                                            sx={{ 
                                                display: 'flex', 
                                                justifyContent: 'center',
                                                gap: 1.5, 
                                                opacity: 1,
                                                transform: 'translateY(0)',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                        >
                                            <IconButton 
                                                size="small"
                                                sx={{ 
                                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    width: 36,
                                                    height: 36,
                                                    '&:hover': { 
                                                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                                                        transform: 'scale(1.1)',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                                title="View Details"
                                                onClick={() => handleViewProject(project)}
                                            >
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton 
                                                size="small"
                                                sx={{ 
                                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    width: 36,
                                                    height: 36,
                                                    '&:hover': { 
                                                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                                                        transform: 'scale(1.1)',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                                title="Edit Project"
                                                onClick={() => handleEditProject(project)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton 
                                                size="small"
                                                sx={{ 
                                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    width: 36,
                                                    height: 36,
                                                    '&:hover': { 
                                                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                                                        transform: 'scale(1.1)',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                                title="Manage Tasks"
                                                onClick={() => handleManageTasks(project)}
                                            >
                                                <AssignmentIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton 
                                                size="small"
                                                sx={{ 
                                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    width: 36,
                                                    height: 36,
                                                    '&:hover': { 
                                                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                                                        transform: 'scale(1.1)',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                                title="Task Assignment"
                                                onClick={() => handleTaskAssignment(project)}
                                            >
                                                <PeopleIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton 
                                                size="small"
                                                sx={{ 
                                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                                    color: 'white',
                                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                                    width: 36,
                                                    height: 36,
                                                    '&:hover': { 
                                                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                                                            transform: 'scale(1.1)',
                                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                                title="Workflow Management"
                                                onClick={() => handleWorkflowManagement(project)}
                                            >
                                                <AccountTreeIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton 
                                                size="small"
                                                sx={{ 
                                                    bgcolor: 'rgba(244, 67, 54, 0.3)',
                                                    color: 'white',
                                                    border: '1px solid rgba(244, 67, 54, 0.3)',
                                                    width: 36,
                                                    height: 36,
                                                    '&:hover': { 
                                                        bgcolor: 'rgba(244, 67, 54, 0.3)',
                                                        transform: 'scale(1.1)',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                                                    },
                                                    transition: 'all 0.2s ease'
                                                }}
                                                title="Delete Project"
                                                onClick={() => handleDeleteProject(project)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Paper 
                        sx={{ 
                            p: 8, 
                            textAlign: 'center',
                            background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                            borderRadius: 3
                        }}
                    >
                        <Box sx={{ mb: 3 }}>
                            <AssignmentIcon 
                                sx={{ 
                                    fontSize: 80, 
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    opacity: 0.6
                                }} 
                            />
                        </Box>
                        <Typography variant="h4" color="white" gutterBottom fontWeight="bold">
                            {projects.length === 0 ? 'No Projects Yet' : 'No Projects Found'}
                        </Typography>
                        <Typography variant="h6" color="rgba(255, 255, 255, 0.8)" sx={{ mb: 3 }}>
                            {projects.length === 0 
                                ? 'Projects will appear here once assigned by your manager'
                                : 'Try adjusting your search or filters to find projects'
                            }
                        </Typography>
                        {projects.length === 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="h3" color="primary.main" fontWeight="bold">
                                        0
                                    </Typography>
                                    <Typography variant="body2" color="rgba(255, 255, 255, 0.8)">
                                        Active Projects
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="h3" color="success.main" fontWeight="bold">
                                        0
                                    </Typography>
                                    <Typography variant="body2" color="rgba(255, 255, 255, 0.8)">
                                        Completed Tasks
                                    </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="h3" color="warning.main" fontWeight="bold">
                                        0
                                    </Typography>
                                    <Typography variant="body2" color="rgba(255, 255, 255, 0.8)">
                                        Team Members
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                        <Typography variant="body1" color="rgba(255, 255, 255, 0.8)" sx={{ maxWidth: 400, mx: 'auto' }}>
                            {projects.length === 0 
                                ? 'Start collaborating with your team by creating and managing projects. Track progress, assign tasks, and monitor deadlines all in one place.'
                                : 'Use the search bar and filters above to narrow down your project list.'
                            }
                        </Typography>
                    </Paper>
                )}

                {/* Project Details Dialog */}
                <Dialog 
                    open={detailsDialogOpen} 
                    onClose={() => setDetailsDialogOpen(false)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: {
                            background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                        }
                    }}
                >
                    <DialogTitle sx={{ color: 'white' }}>
                        Project Details
                    </DialogTitle>
                    <DialogContent sx={{ color: 'white' }}>
                        {selectedProject && (
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    {selectedProject.name}
                                </Typography>
                                <Typography variant="body2" color="rgba(255, 255, 255, 0.8)" paragraph>
                                    {selectedProject.description}
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2">Status:</Typography>
                                        <Typography variant="body2">{selectedProject.status}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2">Priority:</Typography>
                                        <Typography variant="body2">{selectedProject.priority}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2">Progress:</Typography>
                                        <Typography variant="body2">{selectedProject.progress}%</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2">Team:</Typography>
                                        <Typography variant="body2">{selectedProject.teamName}</Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button 
                            onClick={() => setDetailsDialogOpen(false)}
                            sx={{ color: 'white' }}
                        >
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Edit Project Dialog */}
                <Dialog 
                    open={editDialogOpen} 
                    onClose={() => setEditDialogOpen(false)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: {
                            background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                        }
                    }}
                >
                    <DialogTitle sx={{ color: 'white' }}>
                        Edit Project
                    </DialogTitle>
                    <DialogContent sx={{ color: 'white' }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField
                                label="Project Name"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                fullWidth
                                sx={{ 
                                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.8)' },
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                                    }
                                }}
                            />
                            <TextField
                                label="Description"
                                value={editForm.description}
                                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                fullWidth
                                multiline
                                rows={3}
                                sx={{ 
                                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.8)' },
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                                    }
                                }}
                            />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <FormControl fullWidth>
                                        <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>Status</InputLabel>
                                        <Select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm({...editForm, status: e.target.value as Project['status']})}
                                            sx={{ 
                                                color: 'white',
                                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                                '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.8)' }
                                            }}
                                        >
                                            <MenuItem value="planning" sx={{ color: 'white' }}>Planning</MenuItem>
                                            <MenuItem value="in-progress" sx={{ color: 'white' }}>In Progress</MenuItem>
                                            <MenuItem value="testing" sx={{ color: 'white' }}>Testing</MenuItem>
                                            <MenuItem value="completed" sx={{ color: 'white' }}>Completed</MenuItem>
                                            <MenuItem value="on-hold" sx={{ color: 'white' }}>On Hold</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6}>
                                    <FormControl fullWidth>
                                        <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>Priority</InputLabel>
                                        <Select
                                            value={editForm.priority}
                                            onChange={(e) => setEditForm({...editForm, priority: e.target.value as Project['priority']})}
                                            sx={{ 
                                                color: 'white',
                                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                                '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.8)' }
                                            }}
                                        >
                                            <MenuItem value="low" sx={{ color: 'white' }}>Low</MenuItem>
                                            <MenuItem value="medium" sx={{ color: 'white' }}>Medium</MenuItem>
                                            <MenuItem value="high" sx={{ color: 'white' }}>High</MenuItem>
                                            <MenuItem value="critical" sx={{ color: 'white' }}>Critical</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <Grid container spacing={2}>
                                <Grid item xs={4}>
                                    <TextField
                                        label="Progress (%)"
                                        type="number"
                                        value={editForm.progress}
                                        onChange={(e) => setEditForm({...editForm, progress: parseInt(e.target.value) || 0})}
                                        fullWidth
                                        inputProps={{ min: 0, max: 100 }}
                                        sx={{ 
                                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.8)' },
                                            '& .MuiOutlinedInput-root': {
                                                color: 'white',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        label="Total Tasks"
                                        type="number"
                                        value={editForm.tasks}
                                        onChange={(e) => setEditForm({...editForm, tasks: parseInt(e.target.value) || 0})}
                                        fullWidth
                                        inputProps={{ min: 0 }}
                                        sx={{ 
                                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.8)' },
                                            '& .MuiOutlinedInput-root': {
                                                color: 'white',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                                            }
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <TextField
                                        label="Completed Tasks"
                                        type="number"
                                        value={editForm.completedTasks}
                                        onChange={(e) => setEditForm({...editForm, completedTasks: parseInt(e.target.value) || 0})}
                                        fullWidth
                                        inputProps={{ min: 0 }}
                                        sx={{ 
                                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.8)' },
                                            '& .MuiOutlinedInput-root': {
                                                color: 'white',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                                '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' }
                                            }
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button 
                            onClick={() => setEditDialogOpen(false)}
                            sx={{ color: 'white' }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="contained"
                            onClick={handleUpdateProject}
                            sx={{ 
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                                }
                            }}
                        >
                            Update Project
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog 
                    open={deleteDialogOpen} 
                    onClose={() => setDeleteDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                        }
                    }}
                >
                    <DialogTitle sx={{ color: 'white' }}>
                        Delete Project
                    </DialogTitle>
                    <DialogContent sx={{ color: 'white' }}>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Are you sure you want to delete the project:
                        </Typography>
                        <Typography variant="h6" color="primary.main" fontWeight="bold">
                            {selectedProject?.name}
                        </Typography>
                        <Typography variant="body2" color="rgba(255, 255, 255, 0.8)" sx={{ mt: 2 }}>
                            This action cannot be undone. All project data will be permanently deleted.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button 
                            onClick={() => setDeleteDialogOpen(false)}
                            sx={{ color: 'white' }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="contained"
                            onClick={handleConfirmDelete}
                            sx={{ 
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                                }
                            }}
                        >
                            Delete Project
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Create Project Dialog */}
                <Dialog 
                    open={createDialogOpen} 
                    onClose={() => setCreateDialogOpen(false)}
                    maxWidth="md"
                    fullWidth
                    PaperProps={{
                        sx: {
                            background: 'linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                        }
                    }}
                >
                    <DialogTitle sx={{ color: 'white' }}>
                        Create New Project
                    </DialogTitle>
                    <DialogContent sx={{ color: 'white' }}>
                        <Typography variant="body2" color="rgba(255, 255, 255, 0.8)">
                            Project creation functionality coming soon! This will allow you to create new projects with custom settings.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button 
                            onClick={() => setCreateDialogOpen(false)}
                            sx={{ color: 'white' }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="contained"
                            sx={{ 
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                                }
                            }}
                        >
                            Create Project
                        </Button>
                    </DialogActions>
                </Dialog>

            {/* Task Management Dialogs */}
            <Dialog 
                open={taskManagementView === 'tasks'} 
                onClose={() => setTaskManagementView(null)}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)'
                    }
                }}
            >
                <DialogTitle sx={{ color: 'white' }}>
                    Task Management - {selectedProjectForTasks?.name}
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {selectedProjectForTasks && (
                        <TaskManagement />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTaskManagementView(null)} sx={{ color: 'white' }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog 
                open={taskManagementView === 'assignment'} 
                onClose={() => setTaskManagementView(null)}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)'
                    }
                }}
            >
                <DialogTitle sx={{ color: 'white' }}>
                    Task Assignment - {selectedProjectForTasks?.name}
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {selectedProjectForTasks && (
                        <TaskAssignment 
                            projectId={selectedProjectForTasks.id}
                            onTaskAssigned={(taskId, assignedTo) => {
                                console.log(`Task ${taskId} assigned to ${assignedTo}`);
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTaskManagementView(null)} sx={{ color: 'white' }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog 
                open={taskManagementView === 'workflow'} 
                onClose={() => setTaskManagementView(null)}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)'
                    }
                }}
            >
                <DialogTitle sx={{ color: 'white' }}>
                    Workflow Management - {selectedProjectForTasks?.name}
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {selectedProjectForTasks && (
                        <WorkflowManagement 
                            projectId={selectedProjectForTasks.id}
                            projectName={selectedProjectForTasks.name}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTaskManagementView(null)} sx={{ color: 'white' }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog 
                open={taskManagementView === 'dependencies'} 
                onClose={() => setTaskManagementView(null)}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: {
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)'
                    }
                }}
            >
                <DialogTitle sx={{ color: 'white' }}>
                    Task Dependencies - {selectedProjectForTasks?.name}
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {selectedProjectForTasks && (
                        <TaskDependencyTracking 
                            projectId={selectedProjectForTasks.id}
                            onDependencyUpdate={(taskId, dependencies) => {
                                console.log(`Dependencies updated for task ${taskId}`);
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTaskManagementView(null)} sx={{ color: 'white' }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
            </Box>
        </Container>
    );
}
