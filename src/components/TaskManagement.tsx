import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Avatar,
    LinearProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Badge,
    Alert,
    Tabs,
    Tab
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Visibility,
    Assignment,
    AssignmentTurnedIn,
    AssignmentLate,
    Block,
    PlayArrow,
    Done,
    Warning,
    People,
    Schedule,
    TrendingUp
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { rtdb } from '../firebase';
import { Task, TaskStatus, TaskPriority, TaskFilter, TaskDependency } from '../types/task';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`task-tabpanel-${index}`}
            aria-labelledby={`task-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

const TaskManagement: React.FC = () => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [filter, setFilter] = useState<TaskFilter>({});

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: 'todo' as TaskStatus,
        priority: 'medium' as TaskPriority,
        projectId: '',
        assignedTo: '',
        dueDate: '',
        estimatedHours: '',
        tags: ''
    });

    // Load tasks from Firebase
    useEffect(() => {
        if (!user) return;

        const tasksRef = ref(rtdb, 'tasks');
        const unsubscribe = onValue(tasksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const tasksList: Task[] = Object.entries(data).map(([id, taskData]: [string, any]) => ({
                    id,
                    title: taskData.title || '',
                    description: taskData.description || '',
                    status: taskData.status || 'todo',
                    priority: taskData.priority || 'medium',
                    projectId: taskData.projectId || '',
                    projectName: taskData.projectName || '',
                    assignedTo: taskData.assignedTo || '',
                    assignedToName: taskData.assignedToName || '',
                    createdBy: taskData.createdBy || user.uid,
                    createdByName: taskData.createdByName || user.name || 'Unknown',
                    createdAt: taskData.createdAt || new Date().toISOString(),
                    updatedAt: taskData.updatedAt || new Date().toISOString(),
                    dueDate: taskData.dueDate,
                    estimatedHours: taskData.estimatedHours,
                    actualHours: taskData.actualHours,
                    progress: taskData.progress || 0,
                    tags: taskData.tags || [],
                    dependencies: taskData.dependencies || [],
                    blockedBy: taskData.blockedBy || [],
                    blocks: taskData.blocks || [],
                    workflowId: taskData.workflowId,
                    workflowStep: taskData.workflowStep,
                    attachments: taskData.attachments || [],
                    comments: taskData.comments || [],
                    subtasks: taskData.subtasks || [],
                    parentTask: taskData.parentTask
                }));
                setTasks(tasksList);
            }
            setLoading(false);
        }, (error) => {
            setError('Failed to load tasks');
            setLoading(false);
        });

        return unsubscribe;
    }, [user]);

    // Filter tasks based on current tab
    const getFilteredTasks = () => {
        let filtered = tasks;

        // Apply status filter based on active tab
        if (tabValue === 1) filtered = filtered.filter(t => t.status === 'todo');
        else if (tabValue === 2) filtered = filtered.filter(t => t.status === 'in-progress');
        else if (tabValue === 3) filtered = filtered.filter(t => t.status === 'blocked');
        else if (tabValue === 4) filtered = filtered.filter(t => t.status === 'done');

        // Apply other filters
        if (filter.assignedTo?.length) {
            filtered = filtered.filter(t => filter.assignedTo!.includes(t.assignedTo));
        }
        if (filter.priority?.length) {
            filtered = filtered.filter(t => filter.priority!.includes(t.priority));
        }
        if (filter.projectId?.length) {
            filtered = filtered.filter(t => filter.projectId!.includes(t.projectId));
        }
        if (filter.searchQuery) {
            const query = filter.searchQuery.toLowerCase();
            filtered = filtered.filter(t => 
                t.title.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query)
            );
        }

        return filtered;
    };

    // CRUD Operations
    const handleCreateTask = () => {
        if (!user) return;

        const tasksRef = ref(rtdb, 'tasks');
        const newTask = {
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            projectId: formData.projectId,
            projectName: '', // This would be populated based on projectId
            assignedTo: formData.assignedTo,
            assignedToName: '', // This would be populated based on assignedTo
            createdBy: user.uid,
            createdByName: user.name || 'Unknown',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dueDate: formData.dueDate || null,
            estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
            actualHours: null,
            progress: 0,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            dependencies: [],
            blockedBy: [],
            blocks: [],
            attachments: [],
            comments: [],
            subtasks: []
        };

        push(tasksRef, newTask);
        setCreateDialogOpen(false);
        resetForm();
    };

    const handleUpdateTask = () => {
        if (!selectedTask) return;

        const taskRef = ref(rtdb, `tasks/${selectedTask.id}`);
        const updatedTask = {
            ...selectedTask,
            title: formData.title,
            description: formData.description,
            status: formData.status,
            priority: formData.priority,
            assignedTo: formData.assignedTo,
            dueDate: formData.dueDate || null,
            estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
            updatedAt: new Date().toISOString()
        };

        update(taskRef, updatedTask);
        setEditDialogOpen(false);
        resetForm();
    };

    const handleDeleteTask = (taskId: string) => {
        const taskRef = ref(rtdb, `tasks/${taskId}`);
        remove(taskRef);
    };

    const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
        const taskRef = ref(rtdb, `tasks/${taskId}`);
        update(taskRef, {
            status: newStatus,
            updatedAt: new Date().toISOString(),
            progress: newStatus === 'done' ? 100 : newStatus === 'in-progress' ? 50 : 0
        });
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            status: 'todo',
            priority: 'medium',
            projectId: '',
            assignedTo: '',
            dueDate: '',
            estimatedHours: '',
            tags: ''
        });
    };

    const getStatusIcon = (status: TaskStatus) => {
        switch (status) {
            case 'todo': return <Assignment />;
            case 'in-progress': return <PlayArrow />;
            case 'blocked': return <Block />;
            case 'done': return <Done />;
            default: return <Assignment />;
        }
    };

    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case 'todo': return '#6B7280';
            case 'in-progress': return '#3B82F6';
            case 'blocked': return '#EF4444';
            case 'done': return '#10B981';
            default: return '#6B7280';
        }
    };

    const getPriorityColor = (priority: TaskPriority) => {
        switch (priority) {
            case 'low': return '#10B981';
            case 'medium': return '#F59E0B';
            case 'high': return '#EF4444';
            case 'critical': return '#DC2626';
            default: return '#6B7280';
        }
    };

    const TaskCard = ({ task }: { task: Task }) => (
        <Card sx={{ mb: 2, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.05)' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(task.status)}
                        <Typography variant="h6" color="white" sx={{ fontSize: '1rem' }}>
                            {task.title}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton size="small" onClick={() => { setSelectedTask(task); setDetailsDialogOpen(true); }}>
                            <Visibility sx={{ color: 'white' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => { setSelectedTask(task); setFormData({ ...formData, ...task, tags: task.tags.join(', ') }); setEditDialogOpen(true); }}>
                            <Edit sx={{ color: 'white' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteTask(task.id)}>
                            <Delete sx={{ color: '#EF4444' }} />
                        </IconButton>
                    </Box>
                </Box>

                <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mb: 2 }}>
                    {task.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                        icon={getStatusIcon(task.status)}
                        label={task.status.replace('-', ' ').toUpperCase()}
                        size="small"
                        sx={{ bgcolor: getStatusColor(task.status), color: 'white' }}
                    />
                    <Chip
                        label={task.priority.toUpperCase()}
                        size="small"
                        sx={{ bgcolor: getPriorityColor(task.priority), color: 'white' }}
                    />
                    {task.dueDate && (
                        <Chip
                            icon={<Schedule />}
                            label={new Date(task.dueDate).toLocaleDateString()}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                        />
                    )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="rgba(255,255,255,0.6)">
                        Assigned to: {task.assignedToName || 'Unassigned'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {task.status !== 'done' && (
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleStatusChange(task.id, task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'done' : 'in-progress')}
                                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                            >
                                {task.status === 'todo' ? 'Start' : task.status === 'in-progress' ? 'Complete' : 'Resume'}
                            </Button>
                        )}
                    </Box>
                </Box>

                {task.progress > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress
                            variant="determinate"
                            value={task.progress}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.1)',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 3,
                                    bgcolor: getStatusColor(task.status)
                                }
                            }}
                        />
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    if (loading) return <LinearProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box sx={{ p: 3, bgcolor: 'transparent' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" color="white" fontWeight="bold">
                    Task Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{ bgcolor: '#3B82F6' }}
                >
                    Create Task
                </Button>
            </Box>

            <Paper sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
                >
                    <Tab label={`All Tasks (${tasks.length})`} sx={{ color: 'white' }} />
                    <Tab label={`To Do (${tasks.filter(t => t.status === 'todo').length})`} sx={{ color: 'white' }} />
                    <Tab label={`In Progress (${tasks.filter(t => t.status === 'in-progress').length})`} sx={{ color: 'white' }} />
                    <Tab label={`Blocked (${tasks.filter(t => t.status === 'blocked').length})`} sx={{ color: 'white' }} />
                    <Tab label={`Done (${tasks.filter(t => t.status === 'done').length})`} sx={{ color: 'white' }} />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <Grid container spacing={2}>
                        {getFilteredTasks().map((task) => (
                            <Grid item xs={12} md={6} lg={4} key={task.id}>
                                <TaskCard task={task} />
                            </Grid>
                        ))}
                    </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Grid container spacing={2}>
                        {getFilteredTasks().map((task) => (
                            <Grid item xs={12} md={6} lg={4} key={task.id}>
                                <TaskCard task={task} />
                            </Grid>
                        ))}
                    </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <Grid container spacing={2}>
                        {getFilteredTasks().map((task) => (
                            <Grid item xs={12} md={6} lg={4} key={task.id}>
                                <TaskCard task={task} />
                            </Grid>
                        ))}
                    </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                    <Grid container spacing={2}>
                        {getFilteredTasks().map((task) => (
                            <Grid item xs={12} md={6} lg={4} key={task.id}>
                                <TaskCard task={task} />
                            </Grid>
                        ))}
                    </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={4}>
                    <Grid container spacing={2}>
                        {getFilteredTasks().map((task) => (
                            <Grid item xs={12} md={6} lg={4} key={task.id}>
                                <TaskCard task={task} />
                            </Grid>
                        ))}
                    </Grid>
                </TabPanel>
            </Paper>

            {/* Create Task Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Task Title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                                >
                                    <MenuItem value="todo">To Do</MenuItem>
                                    <MenuItem value="in-progress">In Progress</MenuItem>
                                    <MenuItem value="blocked">Blocked</MenuItem>
                                    <MenuItem value="done">Done</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Priority</InputLabel>
                                <Select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                                >
                                    <MenuItem value="low">Low</MenuItem>
                                    <MenuItem value="medium">Medium</MenuItem>
                                    <MenuItem value="high">High</MenuItem>
                                    <MenuItem value="critical">Critical</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Due Date"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Estimated Hours"
                                type="number"
                                value={formData.estimatedHours}
                                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Tags (comma separated)"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                helperText="Enter tags separated by commas"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateTask} variant="contained">Create Task</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Task Title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description"
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                                >
                                    <MenuItem value="todo">To Do</MenuItem>
                                    <MenuItem value="in-progress">In Progress</MenuItem>
                                    <MenuItem value="blocked">Blocked</MenuItem>
                                    <MenuItem value="done">Done</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Priority</InputLabel>
                                <Select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                                >
                                    <MenuItem value="low">Low</MenuItem>
                                    <MenuItem value="medium">Medium</MenuItem>
                                    <MenuItem value="high">High</MenuItem>
                                    <MenuItem value="critical">Critical</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Due Date"
                                type="date"
                                InputLabelProps={{ shrink: true }}
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Estimated Hours"
                                type="number"
                                value={formData.estimatedHours}
                                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Tags (comma separated)"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                helperText="Enter tags separated by commas"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateTask} variant="contained">Update Task</Button>
                </DialogActions>
            </Dialog>

            {/* Task Details Dialog */}
            <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Task Details</DialogTitle>
                <DialogContent>
                    {selectedTask && (
                        <Box>
                            <Typography variant="h6" color="white" gutterBottom>
                                {selectedTask.title}
                            </Typography>
                            <Typography variant="body2" color="rgba(255,255,255,0.7)" paragraph>
                                {selectedTask.description}
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="white">Status:</Typography>
                                    <Chip label={selectedTask.status} size="small" sx={{ mt: 1 }} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="white">Priority:</Typography>
                                    <Chip label={selectedTask.priority} size="small" sx={{ mt: 1 }} />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="white">Assigned To:</Typography>
                                    <Typography variant="body2" color="rgba(255,255,255,0.7)">
                                        {selectedTask.assignedToName || 'Unassigned'}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="white">Created:</Typography>
                                    <Typography variant="body2" color="rgba(255,255,255,0.7)">
                                        {new Date(selectedTask.createdAt).toLocaleDateString()}
                                    </Typography>
                                </Grid>
                                {selectedTask.dueDate && (
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2" color="white">Due Date:</Typography>
                                        <Typography variant="body2" color="rgba(255,255,255,0.7)">
                                            {new Date(selectedTask.dueDate).toLocaleDateString()}
                                        </Typography>
                                    </Grid>
                                )}
                                {selectedTask.estimatedHours && (
                                    <Grid item xs={6}>
                                        <Typography variant="subtitle2" color="white">Estimated Hours:</Typography>
                                        <Typography variant="body2" color="rgba(255,255,255,0.7)">
                                            {selectedTask.estimatedHours}
                                        </Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TaskManagement;
