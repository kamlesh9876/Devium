import React, { useState, useEffect } from 'react';
import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { rtdb } from '../../firebase';
import {
    Download as DownloadIcon,
    People as PeopleIcon,
    Person as PersonIcon,
    Group as GroupIcon,
    Assessment as AssessmentIcon,
    Timeline as TimelineIcon,
    BarChart as BarChartIcon,
    PieChart as PieChartIcon,
    TableChart as TableChartIcon,
    AccessTime as AccessTimeIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Folder as FolderIcon
} from '@mui/icons-material';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    Avatar,
    Tooltip,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    TextField,
    InputAdornment,
    CircularProgress,
    Checkbox,
    List,
    ListItem,
    ListItemSecondaryAction,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    FormControl,
    InputLabel,
    ListItemIcon as MuiListItemIcon
} from '@mui/material';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip as ChartTooltip, Legend, Filler } from 'chart.js';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// Register ChartJS components
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

interface User {
    uid: string;
    name: string;
    email: string;
    role: string;
    status: string;
    lastLogin: string;
    projects?: string[];
    team?: string;
    device?: string;
}

interface Project {
    id: string;
    name: string;
    status: string;
    team: string;
    progress: number;
    deadline: string;
    members: string[];
    files?: ProjectFile[];
}

interface ProjectFile {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
    url?: string;
}

interface Team {
    id: string;
    name: string;
    members: string[];
    projects: string[];
}

interface AdminTodo {
    id: string;
    title: string;
    completed: boolean;
    createdAt: string;
}

const AdminAnalytics: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [exportType, setExportType] = useState<'csv' | 'xlsx'>('xlsx');
    const [todos, setTodos] = useState<AdminTodo[]>([]);
    const [newTodoText, setNewTodoText] = useState('');
    const [creatingTeam, setCreatingTeam] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamMembers, setNewTeamMembers] = useState<string[]>([]);
    const [creatingProject, setCreatingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectStatus, setNewProjectStatus] = useState<'planning' | 'in-progress' | 'testing' | 'completed'>('planning');
    const [newProjectTeam, setNewProjectTeam] = useState<string>('');
    const [editTeamDialogOpen, setEditTeamDialogOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [editTeamMembers, setEditTeamMembers] = useState<string[]>([]);
    const [editTeamProjects, setEditTeamProjects] = useState<string[]>([]);
    
    // Project management states
    const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [projectFilesDialogOpen, setProjectFilesDialogOpen] = useState(false);
    const [selectedProjectFiles, setSelectedProjectFiles] = useState<ProjectFile[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);

    // Fetch data from Firebase
    useEffect(() => {
        const usersRef = ref(rtdb, 'users');
        const projectsRef = ref(rtdb, 'projects');
        const teamsRef = ref(rtdb, 'teams');
        const todosRef = ref(rtdb, 'adminTodos');

        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            const usersData = snapshot.val() || {};
            const usersList = Object.entries(usersData).map(([uid, userData]: [string, any]) => ({
                uid,
                name: userData.name || 'Unknown',
                email: userData.email || '',
                role: userData.role || 'user',
                status: userData.status || 'inactive',
                lastLogin: userData.lastLogin || '',
                projects: userData.projects || [],
                team: userData.team || '',
                device: userData.device || ''
            }));
            setUsers(usersList);
        });

        const unsubscribeProjects = onValue(projectsRef, (snapshot) => {
            const projectsData = snapshot.val() || {};
            const projectsList = Object.entries(projectsData).map(([id, projectData]: [string, any]) => ({
                id,
                name: projectData.name || 'Unnamed Project',
                status: projectData.status || 'planning',
                team: projectData.team || '',
                progress: projectData.progress || 0,
                deadline: projectData.deadline || '',
                members: projectData.members || [],
                files: projectData.files || []
            }));
            setProjects(projectsList);
        });

        const unsubscribeTeams = onValue(teamsRef, (snapshot) => {
            const teamsData = snapshot.val() || {};
            const teamsList = Object.entries(teamsData).map(([id, teamData]: [string, any]) => {
                // Calculate projects dynamically based on actual projects data
                const teamProjects = projects.filter(p => p.team === id);
                return {
                    id,
                    name: teamData.name || 'Unnamed Team',
                    members: teamData.members || [],
                    projects: teamProjects.map(p => p.id) // Store actual project IDs
                };
            });
            setTeams(teamsList);
        });

        const unsubscribeTodos = onValue(todosRef, (snapshot) => {
            const todosData = snapshot.val() || {};
            const todoList: AdminTodo[] = Object.entries(todosData).map(([id, todo]: [string, any]) => ({
                id,
                title: todo.title || 'Untitled',
                completed: !!todo.completed,
                createdAt: todo.createdAt || ''
            }));
            setTodos(todoList.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')));
            setLoading(false);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeProjects();
            unsubscribeTeams();
            unsubscribeTodos();
        };
    }, []);

    // Recalculate team projects when projects data changes
    useEffect(() => {
        if (projects.length > 0) {
            const teamsRef = ref(rtdb, 'teams');
            get(teamsRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const teamsData = snapshot.val() || {};
                    const teamsList = Object.entries(teamsData).map(([id, teamData]: [string, any]) => {
                        // Calculate projects dynamically based on actual projects data
                        const teamProjects = projects.filter(p => p.team === id);
                        return {
                            id,
                            name: teamData.name || 'Unnamed Team',
                            members: teamData.members || [],
                            projects: teamProjects.map(p => p.id) // Store actual project IDs
                        };
                    });
                    setTeams(teamsList);
                }
            });
        }
    }, [projects]);

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return;
        try {
            setCreatingTeam(true);
            const teamsRef = ref(rtdb, 'teams');
            const newRef = push(teamsRef);
            const teamId = newRef.key;

            await set(newRef, {
                name: newTeamName.trim(),
                members: newTeamMembers,
                projects: []
            });

            // Also assign selected users to this team
            if (teamId && newTeamMembers.length > 0) {
                const updates: { [path: string]: any } = {};
                newTeamMembers.forEach((uid) => {
                    updates[`users/${uid}/team`] = teamId;
                });
                await update(ref(rtdb), updates);

                // Create a basic notification for each assigned user
                const now = new Date().toISOString();
                await Promise.all(
                    newTeamMembers.map(async (uid) => {
                        const notifRef = push(ref(rtdb, `notifications/${uid}`));
                        await set(notifRef, {
                            type: 'team_assigned',
                            teamId,
                            teamName: newTeamName.trim(),
                            createdAt: now,
                            read: false,
                        });
                    })
                );
            }

            setNewTeamName('');
            setNewTeamMembers([]);
        } catch (error) {
            console.error('Error creating team', error);
        } finally {
            setCreatingTeam(false);
        }
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            setCreatingProject(true);
            const projectsRef = ref(rtdb, 'projects');
            const newRef = push(projectsRef);
            const projectId = newRef.key;

            // If a team is assigned, automatically assign all team members to the project
            let projectMembers: string[] = [];
            if (newProjectTeam) {
                const team = teams.find(t => t.id === newProjectTeam);
                if (team && team.members.length > 0) {
                    projectMembers = team.members;
                }
            }

            await set(newRef, {
                name: newProjectName.trim(),
                status: newProjectStatus,
                team: newProjectTeam || '',
                progress: 0,
                deadline: '',
                members: projectMembers,
                files: []
            });
            setNewProjectName('');
            setNewProjectStatus('planning');
            setNewProjectTeam('');
        } catch (error) {
            console.error('Error creating project', error);
        } finally {
            setCreatingProject(false);
        }
    };

    const openEditTeamDialog = (team: Team) => {
        setEditingTeam(team);
        setEditTeamMembers(team.members || []);
        setEditTeamProjects(team.projects || []);
        setEditTeamDialogOpen(true);
    };

    const handleSaveTeamMembers = async () => {
        if (!editingTeam) return;
        try {
            const teamId = editingTeam.id;

            // Update team members and projects
            await update(ref(rtdb, `teams/${teamId}`), {
                members: editTeamMembers,
                projects: editTeamProjects
            });

            // Update users' team assignments
            const updates: { [path: string]: any } = {};
            editTeamMembers.forEach((uid) => {
                updates[`users/${uid}/team`] = teamId;
            });

            // Remove team from users who are no longer in the team
            const allUsers = users.filter(u => u.team === teamId);
            allUsers.forEach((user) => {
                if (!editTeamMembers.includes(user.uid)) {
                    updates[`users/${user.uid}/team`] = '';
                }
            });

            if (Object.keys(updates).length > 0) {
                await update(ref(rtdb), updates);
            }

            // Update projects' team assignments
            const projectUpdates: { [path: string]: any } = {};
            editTeamProjects.forEach((projectId) => {
                projectUpdates[`projects/${projectId}/team`] = teamId;
            });

            // Remove team from projects that are no longer assigned
            const allTeamProjects = projects.filter(p => p.team === teamId);
            allTeamProjects.forEach((project) => {
                if (!editTeamProjects.includes(project.id)) {
                    projectUpdates[`projects/${project.id}/team`] = '';
                }
            });

            if (Object.keys(projectUpdates).length > 0) {
                await update(ref(rtdb), projectUpdates);
            }

            setEditTeamDialogOpen(false);
        } catch (error) {
            console.error('Error updating team:', error);
        }
    };

    const handleDeleteTeam = async (teamId: string, teamName: string) => {
        if (window.confirm(`Are you sure you want to delete the team "${teamName}"? This will also remove team assignments from all members and projects.`)) {
            try {
                // Remove team from all users who were in this team
                const teamUsers = users.filter(u => u.team === teamId);
                const userUpdates: { [path: string]: any } = {};
                teamUsers.forEach((user) => {
                    userUpdates[`users/${user.uid}/team`] = '';
                });

                // Remove team from all projects that were assigned to this team
                const teamProjects = projects.filter(p => p.team === teamId);
                const projectUpdates: { [path: string]: any } = {};
                teamProjects.forEach((project) => {
                    projectUpdates[`projects/${project.id}/team`] = '';
                });

                // Apply all updates
                const allUpdates = { ...userUpdates, ...projectUpdates };
                if (Object.keys(allUpdates).length > 0) {
                    await update(ref(rtdb), allUpdates);
                }

                // Delete the team
                await remove(ref(rtdb, `teams/${teamId}`));

                console.log(`Team "${teamName}" deleted successfully`);
            } catch (error) {
                console.error('Error deleting team:', error);
            }
        }
    };

    // Project management functions
    const openEditProjectDialog = (project: Project) => {
        console.log('Opening edit dialog for project:', project.name);
        setEditingProject(project);
        setEditProjectDialogOpen(true);
    };

    const handleSaveProject = async () => {
        if (!editingProject) return;
        try {
            // If a team is assigned, automatically assign all team members to the project
            let projectMembers = editingProject.members;
            if (editingProject.team) {
                const team = teams.find(t => t.id === editingProject.team);
                if (team && team.members.length > 0) {
                    projectMembers = [...new Set([...projectMembers, ...team.members])];
                }
            }

            await update(ref(rtdb, `projects/${editingProject.id}`), {
                name: editingProject.name,
                status: editingProject.status,
                team: editingProject.team,
                progress: editingProject.progress,
                deadline: editingProject.deadline,
                members: projectMembers
            });
            setEditProjectDialogOpen(false);
            setEditingProject(null);
        } catch (error) {
            console.error('Error updating project:', error);
        }
    };

    const handleDeleteProject = async (projectId: string, projectName: string) => {
        if (window.confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
            try {
                await remove(ref(rtdb, `projects/${projectId}`));
                console.log(`Project "${projectName}" deleted successfully`);
            } catch (error) {
                console.error('Error deleting project:', error);
            }
        }
    };

    const openProjectFilesDialog = (project: Project) => {
        console.log('Opening files dialog for project:', project.name);
        setSelectedProjectFiles(project.files || []);
        setEditingProject(project);
        setProjectFilesDialogOpen(true);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !editingProject) return;

        try {
            setUploadingFile(true);
            
            // Create file record with proper file URL
            const fileRecord: ProjectFile = {
                id: Date.now().toString(),
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                uploadedBy: 'admin', // You can get this from auth context
                url: URL.createObjectURL(file) // Create blob URL for viewing
            };

            // Update project files
            const updatedFiles = [...(editingProject.files || []), fileRecord];
            await update(ref(rtdb, `projects/${editingProject.id}`), {
                files: updatedFiles
            });

            // Update local state
            setSelectedProjectFiles(updatedFiles);
            setEditingProject({...editingProject, files: updatedFiles});
            
            // Reset file input
            event.target.value = '';
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setUploadingFile(false);
        }
    };

    const handleViewFile = (file: ProjectFile) => {
        if (file.url) {
            window.open(file.url, '_blank');
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        if (!editingProject) return;
        
        try {
            const updatedFiles = (editingProject.files || []).filter(f => f.id !== fileId);
            await update(ref(rtdb, `projects/${editingProject.id}`), {
                files: updatedFiles
            });
            setSelectedProjectFiles(updatedFiles);
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    };

    const handleToggleTodo = async (todo: AdminTodo) => {
        try {
            const todoRef = ref(rtdb, `adminTodos/${todo.id}`);
            await update(todoRef, { completed: !todo.completed });
        } catch (error) {
            console.error('Error updating todo', error);
        }
    };

    const handleDeleteTodo = async (todoId: string) => {
        try {
            const todoRef = ref(rtdb, `adminTodos/${todoId}`);
            await remove(todoRef);
        } catch (error) {
            console.error('Error deleting todo', error);
        }
    };

    const handleAddTodo = async () => {
        if (!newTodoText.trim()) return;
        try {
            const todosRef = ref(rtdb, 'adminTodos');
            const newRef = push(todosRef);
            await set(newRef, {
                title: newTodoText.trim(),
                completed: false,
                createdAt: new Date().toISOString()
            });
            setNewTodoText('');
        } catch (error) {
            console.error('Error adding todo', error);
        }
    };

    const handleCloseUserDialog = () => {
        setSelectedUser(null);
    };

    // Filter users based on search term
    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate statistics
    const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active' || u.status === 'online').length,
        totalProjects: projects.length,
        inProgressProjects: projects.filter(p => p.status === 'in-progress').length,
        totalTeams: teams.length,
        teamMembers: teams.reduce((acc, team) => acc + team.members.length, 0)
    };

    // Handle export data
    const handleExport = (data: any[], fileName: string) => {
        if (exportType === 'csv') {
            const csvContent = [
                Object.keys(data[0]).join(','),
                ...data.map(item => Object.values(item).join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, `${fileName}.csv`);
        } else {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        }
    };

    // Handle menu open/close
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    // Handle tab change
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // Handle page change
    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Chart data
    const userActivityData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Active Users',
                data: [12, 19, 3, 5, 2, 3, 8],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: true,
                backgroundColor: 'rgba(75, 192, 192, 0.2)'
            }
        ]
    };

    const projectStatusData = {
        labels: ['Planning', 'In Progress', 'Testing', 'Completed'],
        datasets: [
            {
                data: [
                    projects.filter(p => p.status === 'planning').length,
                    projects.filter(p => p.status === 'in-progress').length,
                    projects.filter(p => p.status === 'testing').length,
                    projects.filter(p => p.status === 'completed').length
                ],
                backgroundColor: [
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(75, 192, 192, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 206, 86, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }
        ]
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        Admin Analytics Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Real-time statistics and insights
                    </Typography>
                </Box>
                <Box>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<DownloadIcon />}
                        onClick={handleMenuOpen}
                    >
                        Export Data
                    </Button>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                    >
                        <MenuItem onClick={() => { setExportType('xlsx'); handleMenuClose(); }}>
                            <ListItemIcon>
                                <TableChartIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Export as Excel</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { setExportType('csv'); handleMenuClose(); }}>
                            <ListItemIcon>
                                <TableChartIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Export as CSV</ListItemText>
                        </MenuItem>
                    </Menu>
                </Box>
            </Box>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 3 }}
            >
                <Tab label="User Analytics" icon={<PersonIcon />} iconPosition="start" />
                <Tab label="Project Analytics" icon={<AssessmentIcon />} iconPosition="start" />
                <Tab label="Team Analytics" icon={<GroupIcon />} iconPosition="start" />
            </Tabs>

            {/* Tab Panels */}
            {activeTab === 0 && (
                <Box>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={8}>
                            <Paper sx={{ p: 2, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>User Activity</Typography>
                                <Box sx={{ height: 300 }}>
                                    <Line data={userActivityData} options={{ responsive: true, maintainAspectRatio: false }} />
                                </Box>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper sx={{ p: 2, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>User Distribution</Typography>
                                <Box sx={{ height: 300 }}>
                                    <Pie data={{
                                        labels: ['Admins', 'Managers', 'Developers', 'Testers', 'Users'],
                                        datasets: [{
                                            data: [
                                                users.filter(u => u.role === 'admin').length,
                                                users.filter(u => u.role === 'manager').length,
                                                users.filter(u => u.role === 'developer').length,
                                                users.filter(u => u.role === 'tester').length,
                                                users.filter(u => !['admin', 'manager', 'developer', 'tester'].includes(u.role)).length
                                            ],
                                            backgroundColor: [
                                                'rgba(255, 99, 132, 0.7)',
                                                'rgba(54, 162, 235, 0.7)',
                                                'rgba(255, 206, 86, 0.7)',
                                                'rgba(75, 192, 192, 0.7)',
                                                'rgba(153, 102, 255, 0.7)'
                                            ]
                                        }]
                                    }} />
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">User List</Typography>
                            <TextField
                                size="small"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>User</TableCell>
                                        <TableCell>Role</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Last Active</TableCell>
                                        <TableCell>Projects</TableCell>
                                        <TableCell>Team</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredUsers
                                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                        .map((user) => (
                                            <TableRow key={user.uid} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Avatar sx={{ bgcolor: getRoleColor(user.role) }}>
                                                            {user.name.charAt(0)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography variant="subtitle2">{user.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {user.email}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={user.role}
                                                        size="small"
                                                        color={getRoleColor(user.role) as any}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={user.status.toLowerCase() === 'active' || user.status.toLowerCase() === 'online' ? 'Active' : 'Inactive'}
                                                        size="small"
                                                        color={user.status.toLowerCase() === 'active' || user.status.toLowerCase() === 'online' ? 'success' : 'default'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                                                </TableCell>
                                                <TableCell>{user.projects?.length || 0}</TableCell>
                                                <TableCell>
                                                    {user.team || 'None'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="View Details">
                                                        <IconButton size="small" onClick={() => setSelectedUser(user)}>
                                                            <AssessmentIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Export Data">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleExport([user], `user_${user.uid}`)}
                                                        >
                                                            <DownloadIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25]}
                            component="div"
                            count={filteredUsers.length}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                    </Paper>

                    {/* Detailed user analytics panel */}
                    <Dialog
                        open={!!selectedUser}
                        onClose={handleCloseUserDialog}
                        maxWidth="sm"
                        fullWidth
                    >
                        <DialogTitle>User Analytics</DialogTitle>
                        <DialogContent>
                            {selectedUser && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ bgcolor: getRoleColor(selectedUser.role) }}>
                                            {selectedUser.name.charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="subtitle1">{selectedUser.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {selectedUser.email}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        <Chip
                                            label={selectedUser.role}
                                            size="small"
                                            color={getRoleColor(selectedUser.role) as any}
                                        />
                                        <Chip
                                            label={selectedUser.status}
                                            size="small"
                                            color={selectedUser.status === 'active' || selectedUser.status === 'online' ? 'success' : 'default'}
                                            variant="outlined"
                                        />
                                        <Chip
                                            label={selectedUser.team ? `Team: ${selectedUser.team}` : 'No team'}
                                            size="small"
                                        />
                                        <Chip
                                            label={`Projects: ${selectedUser.projects?.length || 0}`}
                                            size="small"
                                        />
                                    </Box>

                                    <Box>
                                        <Typography variant="subtitle2">Last Active</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {selectedUser.lastLogin
                                                ? new Date(selectedUser.lastLogin).toLocaleString()
                                                : 'Never logged in'}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Projects</Typography>
                                        {projects.filter(p => (selectedUser.projects || []).includes(p.id)).length === 0 ? (
                                            <Typography variant="body2" color="text.secondary">
                                                No projects linked to this user.
                                            </Typography>
                                        ) : (
                                            <List dense>
                                                {projects
                                                    .filter(p => (selectedUser.projects || []).includes(p.id))
                                                    .map((p) => (
                                                        <ListItem key={p.id} disableGutters>
                                                            <ListItemText
                                                                primary={p.name}
                                                                secondary={`Status: ${p.status} • Progress: ${p.progress}%`}
                                                            />
                                                        </ListItem>
                                                    ))}
                                            </List>
                                        )}
                                    </Box>
                                </Box>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseUserDialog}>Close</Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            )}

            {activeTab === 1 && (
                <Box>
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Create New Project</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <TextField
                                label="Project name"
                                size="small"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                sx={{ minWidth: 220 }}
                            />
                            <TextField
                                select
                                size="small"
                                label="Status"
                                value={newProjectStatus}
                                onChange={(e) => setNewProjectStatus(e.target.value as any)}
                                sx={{ minWidth: 160 }}
                            >
                                <MenuItem value="planning">Planning</MenuItem>
                                <MenuItem value="in-progress">In Progress</MenuItem>
                                <MenuItem value="testing">Testing</MenuItem>
                                <MenuItem value="completed">Completed</MenuItem>
                            </TextField>
                            <TextField
                                select
                                size="small"
                                label="Team (optional)"
                                value={newProjectTeam}
                                onChange={(e) => setNewProjectTeam(e.target.value)}
                                sx={{ minWidth: 200 }}
                            >
                                <MenuItem value="">
                                    <em>Unassigned</em>
                                </MenuItem>
                                {teams.map((team) => (
                                    <MenuItem key={team.id} value={team.id}>
                                        {team.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <Button
                                variant="contained"
                                onClick={handleCreateProject}
                                disabled={creatingProject || !newProjectName.trim()}
                            >
                                {creatingProject ? 'Creating...' : 'Create Project'}
                            </Button>
                        </Box>
                    </Paper>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Project Status</Typography>
                                <Box sx={{ height: 300 }}>
                                    <Pie data={projectStatusData} />
                                </Box>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Project Progress</Typography>
                                <Box sx={{ height: 300 }}>
                                    <Bar
                                        data={{
                                            labels: projects.slice(0, 5).map(p => p.name),
                                            datasets: [
                                                {
                                                    label: 'Progress %',
                                                    data: projects.slice(0, 5).map(p => p.progress),
                                                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                                                    borderColor: 'rgba(54, 162, 235, 1)',
                                                    borderWidth: 1
                                                }
                                            ]
                                        }}
                                        options={{
                                            indexAxis: 'y',
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            scales: {
                                                x: {
                                                    beginAtZero: true,
                                                    max: 100
                                                }
                                            }
                                        }}
                                    />
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>All Projects</Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Project Name</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Progress</TableCell>
                                        <TableCell>Team</TableCell>
                                        <TableCell>Members</TableCell>
                                        <TableCell>Deadline</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {projects.map((project) => (
                                        <TableRow key={project.id} hover>
                                            <TableCell>{project.name}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={project.status}
                                                    size="small"
                                                    color={
                                                        project.status === 'completed' ? 'success' :
                                                        project.status === 'in-progress' ? 'primary' :
                                                        project.status === 'testing' ? 'warning' : 'default'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ width: '100%', mr: 1 }}>
                                                        <Box 
                                                            sx={{
                                                                height: 8,
                                                                borderRadius: 4,
                                                                bgcolor: 'rgba(0, 0, 0, 0.1)',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    height: '100%',
                                                                    width: `${project.progress}%`,
                                                                    bgcolor: 'primary.main',
                                                                    transition: 'width 0.3s ease'
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {project.progress}%
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>{project.team || 'Unassigned'}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2">
                                                        {project.members.length} members
                                                    </Typography>
                                                    {project.members.length > 0 && (
                                                        <Tooltip title={
                                                            <Box>
                                                                {project.members.map(memberId => {
                                                                    const member = users.find(u => u.uid === memberId);
                                                                    return member ? member.name : 'Unknown';
                                                                }).join(', ')}
                                                            </Box>
                                                        }>
                                                            <IconButton size="small">
                                                                <PeopleIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {project.members.length === 0 && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            No members assigned
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'No deadline'}
                                            </TableCell>
                                            <TableCell align="right">
                                                <Tooltip title="View Files">
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => openProjectFilesDialog(project)}
                                                    >
                                                        <FolderIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Edit Project">
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={() => openEditProjectDialog(project)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Project">
                                                    <IconButton 
                                                        size="small" 
                                                        color="error"
                                                        onClick={() => handleDeleteProject(project.id, project.name)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            )}

            {activeTab === 2 && (
                <Box>
                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>Create New Team</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                            <TextField
                                label="Team name"
                                size="small"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                sx={{ minWidth: 220 }}
                            />
                            <Button
                                variant="contained"
                                onClick={handleCreateTeam}
                                disabled={creatingTeam || !newTeamName.trim()}
                            >
                                {creatingTeam ? 'Creating...' : 'Create Team'}
                            </Button>
                        </Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Assign Members (optional)</Typography>
                        <TextField
                            select
                            SelectProps={{
                                multiple: true,
                                renderValue: (selected) => {
                                    const ids = selected as string[];
                                    const names = users
                                        .filter(u => ids.includes(u.uid))
                                        .map(u => u.name);
                                    return names.join(', ');
                                }
                            }}
                            size="small"
                            fullWidth
                            value={newTeamMembers}
                            onChange={(e) => {
                                const value = e.target.value;
                                setNewTeamMembers(typeof value === 'string' ? value.split(',') : value);
                            }}
                            placeholder="Select members to assign"
                        >
                            {users.map((user) => (
                                <MenuItem key={user.uid} value={user.uid}>
                                    <Checkbox checked={newTeamMembers.indexOf(user.uid) > -1} />
                                    <ListItemText primary={user.name} secondary={user.email} />
                                </MenuItem>
                            ))}
                        </TextField>
                    </Paper>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Team Distribution</Typography>
                                <Box sx={{ height: 300 }}>
                                    <Bar
                                        data={{
                                            labels: teams.map(t => t.name),
                                            datasets: [
                                                {
                                                    label: 'Members',
                                                    data: teams.map(t => t.members.length),
                                                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                                                    borderColor: 'rgba(75, 192, 192, 1)',
                                                    borderWidth: 1
                                                },
                                                {
                                                    label: 'Projects',
                                                    data: teams.map(t => t.projects.length),
                                                    backgroundColor: 'rgba(255, 159, 64, 0.7)',
                                                    borderColor: 'rgba(255, 159, 64, 1)',
                                                    borderWidth: 1
                                                }
                                            ]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    ticks: {
                                                        stepSize: 1
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </Box>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2, mb: 3 }}>
                                <Typography variant="h6" gutterBottom>Team Performance</Typography>
                                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography color="text.secondary">Performance metrics coming soon</Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>

                    <Paper sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>All Teams</Typography>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Team Name</TableCell>
                                        <TableCell>Members</TableCell>
                                        <TableCell>Projects</TableCell>
                                        <TableCell>Avg. Project Progress</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {teams.map((team) => {
                                        const teamProjects = projects.filter(p => p.team === team.id);
                                        const avgProgress = teamProjects.length > 0
                                            ? Math.round(teamProjects.reduce((sum, p) => sum + p.progress, 0) / teamProjects.length)
                                            : 0;

                                        return (
                                            <TableRow key={team.id} hover>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Avatar sx={{ bgcolor: stringToColor(team.name) }}>
                                                            {team.name.charAt(0)}
                                                        </Avatar>
                                                        {team.name}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{team.members.length} members</TableCell>
                                                <TableCell>{team.projects.length} projects</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: '100%', mr: 1 }}>
                                                            <Box 
                                                                sx={{
                                                                    height: 8,
                                                                    borderRadius: 4,
                                                                    bgcolor: 'rgba(0, 0, 0, 0.1)',
                                                                    overflow: 'hidden'
                                                                }}
                                                            >
                                                                <Box
                                                                    sx={{
                                                                        height: '100%',
                                                                        width: `${avgProgress}%`,
                                                                        bgcolor: 'primary.main',
                                                                        transition: 'width 0.3s ease'
                                                                    }}
                                                                />
                                                            </Box>
                                                        </Box>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {avgProgress}%
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Edit Members">
                                                        <IconButton size="small" onClick={() => openEditTeamDialog(team)}>
                                                            <PeopleIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Export Data">
                                                        <IconButton size="small" onClick={() => handleExport([team], `team_${team.id}`)}>
                                                            <DownloadIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete Team">
                                                        <IconButton 
                                                            size="small" 
                                                            color="error"
                                                            onClick={() => handleDeleteTeam(team.id, team.name)}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Box>
            )}

            <Paper sx={{ p: 2, mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Admin Todo & Checklist</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Add new admin task"
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTodo();
                            }
                        }}
                    />
                    <Button
                        variant="contained"
                        onClick={handleAddTodo}
                        disabled={!newTodoText.trim()}
                    >
                        Add
                    </Button>
                </Box>
                {todos.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No tasks yet. Add your first admin todo above.
                    </Typography>
                ) : (
                    <List>
                        {todos.map((todo) => (
                            <ListItem key={todo.id} dense divider>
                                <Checkbox
                                    edge="start"
                                    checked={todo.completed}
                                    tabIndex={-1}
                                    disableRipple
                                    onChange={() => handleToggleTodo(todo)}
                                />
                                <Box sx={{ flex: 1 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            textDecoration: todo.completed ? 'line-through' : 'none',
                                            color: todo.completed ? 'text.disabled' : 'text.primary'
                                        }}
                                    >
                                        {todo.title}
                                    </Typography>
                                    {todo.createdAt && (
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(todo.createdAt).toLocaleString()}
                                        </Typography>
                                    )}
                                </Box>
                                <ListItemSecondaryAction>
                                    <Tooltip title="Delete">
                                        <IconButton edge="end" size="small" onClick={() => handleDeleteTodo(todo.id)}>
                                            <DownloadIcon sx={{ opacity: 0, width: 0 }} />
                                        </IconButton>
                                    </Tooltip>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            {/* Edit team members dialog */}
            <Dialog
                open={editTeamDialogOpen}
                onClose={() => setEditTeamDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Edit Team Members</DialogTitle>
                <DialogContent>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Team: {editingTeam?.name}
                    </Typography>
                    
                    {/* Team Members Section */}
                    <Typography variant="subtitle1" sx={{ mb: 1, mt: 2 }}>
                        Team Members
                    </Typography>
                    <TextField
                        select
                        SelectProps={{
                            multiple: true,
                            renderValue: (selected) => {
                                const ids = selected as string[];
                                const names = users
                                    .filter(u => ids.includes(u.uid))
                                    .map(u => u.name);
                                return names.join(', ');
                            }
                        }}
                        size="small"
                        fullWidth
                        value={editTeamMembers}
                        onChange={(e) => {
                            const value = e.target.value;
                            setEditTeamMembers(typeof value === 'string' ? value.split(',') : value);
                        }}
                        placeholder="Select team members"
                    >
                        {users.map((user) => (
                            <MenuItem key={user.uid} value={user.uid}>
                                <Checkbox checked={editTeamMembers.indexOf(user.uid) > -1} />
                                <ListItemText primary={user.name} secondary={user.email} />
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Team Projects Section */}
                    <Typography variant="subtitle1" sx={{ mb: 1, mt: 3 }}>
                        Team Projects
                    </Typography>
                    <TextField
                        select
                        SelectProps={{
                            multiple: true,
                            renderValue: (selected) => {
                                const ids = selected as string[];
                                const names = projects
                                    .filter(p => ids.includes(p.id))
                                    .map(p => p.name);
                                return names.join(', ');
                            }
                        }}
                        size="small"
                        fullWidth
                        value={editTeamProjects}
                        onChange={(e) => {
                            const value = e.target.value;
                            setEditTeamProjects(typeof value === 'string' ? value.split(',') : value);
                        }}
                        placeholder="Select projects for this team"
                    >
                        {projects.map((project) => (
                            <MenuItem key={project.id} value={project.id}>
                                <Checkbox checked={editTeamProjects.indexOf(project.id) > -1} />
                                <ListItemText 
                                    primary={project.name} 
                                    secondary={`${project.status} - ${project.progress}%`}
                                />
                            </MenuItem>
                        ))}
                    </TextField>

                    {/* Current Projects Summary */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Currently assigned: {editTeamProjects.length} projects, {editTeamMembers.length} members
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditTeamDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveTeamMembers}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Project Dialog */}
            <Dialog
                open={editProjectDialogOpen}
                onClose={() => setEditProjectDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Edit Project</DialogTitle>
                <DialogContent>
                    {editingProject && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField
                                label="Project Name"
                                fullWidth
                                value={editingProject.name}
                                onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                            />
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={editingProject.status}
                                    onChange={(e) => setEditingProject({...editingProject, status: e.target.value})}
                                >
                                    <MenuItem value="planning">Planning</MenuItem>
                                    <MenuItem value="in-progress">In Progress</MenuItem>
                                    <MenuItem value="testing">Testing</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Team</InputLabel>
                                <Select
                                    value={editingProject.team}
                                    onChange={(e) => {
                                        const newTeam = e.target.value;
                                        setEditingProject({...editingProject, team: newTeam});
                                        
                                        // Automatically assign team members when team is selected
                                        if (newTeam) {
                                            const team = teams.find(t => t.id === newTeam);
                                            if (team && team.members.length > 0) {
                                                setEditingProject(prev => ({
                                                    ...prev,
                                                    team: newTeam,
                                                    members: [...new Set([...prev.members, ...team.members])]
                                                }));
                                            }
                                        }
                                    }}
                                >
                                    <MenuItem value="">
                                        <em>Unassigned</em>
                                    </MenuItem>
                                    {teams.map((team) => (
                                        <MenuItem key={team.id} value={team.id}>
                                            {team.name} ({team.members.length} members)
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField
                                label="Progress (%)"
                                type="number"
                                fullWidth
                                inputProps={{ min: 0, max: 100 }}
                                value={editingProject.progress}
                                onChange={(e) => setEditingProject({...editingProject, progress: parseInt(e.target.value) || 0})}
                            />
                            <TextField
                                label="Deadline"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={editingProject.deadline || ''}
                                onChange={(e) => setEditingProject({...editingProject, deadline: e.target.value})}
                            />
                            <TextField
                                select
                                label="Members"
                                SelectProps={{
                                    multiple: true,
                                    renderValue: (selected) => {
                                        const ids = selected as string[];
                                        const names = users
                                            .filter(u => ids.includes(u.uid))
                                            .map(u => u.name);
                                        return names.join(', ');
                                    }
                                }}
                                fullWidth
                                value={editingProject.members}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setEditingProject({
                                        ...editingProject, 
                                        members: typeof value === 'string' ? value.split(',') : value
                                    });
                                }}
                            >
                                {users.map((user) => (
                                    <MenuItem key={user.uid} value={user.uid}>
                                        <Checkbox checked={editingProject.members.indexOf(user.uid) > -1} />
                                        <ListItemText primary={user.name} secondary={user.email} />
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditProjectDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveProject}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* Project Files Dialog */}
            <Dialog
                open={projectFilesDialogOpen}
                onClose={() => setProjectFilesDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>Project Files - {editingProject?.name}</DialogTitle>
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Button
                            variant="contained"
                            component="label"
                            disabled={uploadingFile}
                            startIcon={<AddIcon />}
                        >
                            Upload File
                            <input
                                type="file"
                                hidden
                                onChange={handleFileUpload}
                            />
                        </Button>
                    </Box>
                    
                    {selectedProjectFiles.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                            No files uploaded yet
                        </Typography>
                    ) : (
                        <List>
                            {selectedProjectFiles.map((file) => (
                                <ListItem key={file.id} divider>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle2">{file.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {file.type} • {(file.size / 1024).toFixed(1)} KB • 
                                            Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                    <ListItemSecondaryAction>
                                        <Tooltip title="View File">
                                            <IconButton 
                                                edge="start" 
                                                onClick={() => handleViewFile(file)}
                                                sx={{ mr: 1 }}
                                            >
                                                <FolderIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete File">
                                            <IconButton 
                                                edge="end" 
                                                onClick={() => handleDeleteFile(file.id)}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setProjectFilesDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// Helper functions
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

const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
        case 'admin': return 'error';
        case 'manager': return 'warning';
        case 'developer': return 'info';
        case 'tester': return 'success';
        default: return 'default';
    }
};

const stringToColor = (string: string) => {
    let hash = 0;
    let i;
    for (i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (i = 0; i < 3; i += 1) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
};

export default AdminAnalytics;
