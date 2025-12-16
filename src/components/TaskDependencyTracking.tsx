import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    IconButton,
    LinearProgress,
    Paper,
    Grid,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip,
    Badge,
    Timeline,
    TimelineItem,
    TimelineSeparator,
    TimelineConnector,
    TimelineContent,
    TimelineDot
} from '@mui/material';
import {
    DependencyGraph,
    Link,
    LinkOff,
    Warning,
    Error,
    Info,
    CheckCircle,
    Block,
    Schedule,
    ExpandMore,
    Visibility,
    Edit,
    Delete,
    Add,
    AccountTree,
    Timeline as TimelineIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ref, onValue, update } from 'firebase/database';
import { rtdb } from '../firebase';
import { Task, TaskDependency, TaskBottleneck } from '../types/task';

interface TaskDependencyTrackingProps {
    projectId: string;
    onDependencyUpdate?: (taskId: string, dependencies: TaskDependency[]) => void;
}

const TaskDependencyTracking: React.FC<TaskDependencyTrackingProps> = ({ projectId, onDependencyUpdate }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [bottlenecks, setBottlenecks] = useState<TaskBottleneck[]>([]);
    const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [availableDependencies, setAvailableDependencies] = useState<Task[]>([]);
    const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load tasks and analyze dependencies
    useEffect(() => {
        if (!user) return;

        const tasksRef = ref(rtdb, 'tasks');
        const unsubscribe = onValue(tasksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const tasksList: Task[] = Object.entries(data)
                    .map(([id, taskData]: [string, any]) => ({
                        id,
                        ...taskData
                    }))
                    .filter(task => task.projectId === projectId);
                setTasks(tasksList);
                analyzeBottlenecks(tasksList);
            }
            setLoading(false);
        }, (error) => {
            setError('Failed to load tasks');
            setLoading(false);
        });

        return unsubscribe;
    }, [user, projectId]);

    // Analyze bottlenecks
    const analyzeBottlenecks = (taskList: Task[]) => {
        const bottlenecks: TaskBottleneck[] = [];

        taskList.forEach(task => {
            // Check for dependency bottlenecks
            if (task.blockedBy && task.blockedBy.length > 0) {
                const blockingTasks = task.blockedBy.map(blockId => 
                    taskList.find(t => t.id === blockId)
                ).filter(Boolean);

                const incompleteBlockingTasks = blockingTasks.filter(t => 
                    t && t.status !== 'done'
                );

                if (incompleteBlockingTasks.length > 0) {
                    bottlenecks.push({
                        taskId: task.id,
                        taskTitle: task.title,
                        projectId: task.projectId,
                        projectName: task.projectName,
                        bottleneckType: 'dependency',
                        severity: incompleteBlockingTasks.length > 2 ? 'critical' : 
                                 incompleteBlockingTasks.length > 1 ? 'high' : 'medium',
                        description: `Task is blocked by ${incompleteBlockingTasks.length} incomplete dependencies`,
                        affectedTasks: [task.id],
                        suggestedAction: 'Complete blocking tasks or remove dependencies',
                        detectedAt: new Date().toISOString()
                    });
                }
            }

            // Check for overdue tasks
            if (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done') {
                const daysOverdue = Math.floor((new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                
                bottlenecks.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    projectId: task.projectId,
                    projectName: task.projectName,
                    bottleneckType: 'time',
                    severity: daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium',
                    description: `Task is ${daysOverdue} days overdue`,
                    affectedTasks: [task.id],
                    suggestedAction: 'Reassign task or adjust timeline',
                    detectedAt: new Date().toISOString()
                });
            }

            // Check for workload bottlenecks (tasks with too many dependencies)
            if (task.blocks && task.blocks.length > 5) {
                bottlenecks.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    projectId: task.projectId,
                    projectName: task.projectName,
                    bottleneckType: 'resource',
                    severity: task.blocks.length > 10 ? 'critical' : 'high',
                    description: `Task is blocking ${task.blocks.length} other tasks`,
                    affectedTasks: task.blocks,
                    suggestedAction: 'Prioritize this task to unblock dependent tasks',
                    detectedAt: new Date().toISOString()
                });
            }
        });

        setBottlenecks(bottlenecks);
    };

    // Open dependency dialog for a task
    const openDependencyDialog = (task: Task) => {
        setSelectedTask(task);
        
        // Get available tasks that can be dependencies (excluding current task and existing dependencies)
        const available = tasks.filter(t => 
            t.id !== task.id && 
            !task.dependencies.some(dep => dep.taskId === t.id) &&
            !task.blockedBy.includes(t.id)
        );
        
        setAvailableDependencies(available);
        setSelectedDependencies([]);
        setDependencyDialogOpen(true);
    };

    // Add dependencies to a task
    const handleAddDependencies = () => {
        if (!selectedTask || selectedDependencies.length === 0) return;

        const newDependencies: TaskDependency[] = selectedDependencies.map(depId => {
            const depTask = tasks.find(t => t.id === depId);
            return {
                taskId: depId,
                taskName: depTask?.title || '',
                isBlocking: true
            };
        });

        // Update current task dependencies
        const taskRef = ref(rtdb, `tasks/${selectedTask.id}`);
        update(taskRef, {
            dependencies: [...selectedTask.dependencies, ...newDependencies],
            blockedBy: [...selectedTask.blockedBy, ...selectedDependencies],
            updatedAt: new Date().toISOString()
        });

        // Update blocking tasks to show they block current task
        selectedDependencies.forEach(depId => {
            const depTaskRef = ref(rtdb, `tasks/${depId}`);
            const depTask = tasks.find(t => t.id === depId);
            if (depTask) {
                update(depTaskRef, {
                    blocks: [...(depTask.blocks || []), selectedTask.id],
                    updatedAt: new Date().toISOString()
                });
            }
        });

        onDependencyUpdate?.(selectedTask.id, [...selectedTask.dependencies, ...newDependencies]);
        setDependencyDialogOpen(false);
        setSelectedDependencies([]);
    };

    // Remove dependency
    const handleRemoveDependency = (taskId: string, dependencyId: string) => {
        const task = tasks.find(t => t.id === taskId);
        const dependencyTask = tasks.find(t => t.id === dependencyId);
        
        if (task && dependencyTask) {
            // Update current task
            const taskRef = ref(rtdb, `tasks/${taskId}`);
            update(taskRef, {
                dependencies: task.dependencies.filter(dep => dep.taskId !== dependencyId),
                blockedBy: task.blockedBy.filter(id => id !== dependencyId),
                updatedAt: new Date().toISOString()
            });

            // Update dependency task
            const depTaskRef = ref(rtdb, `tasks/${dependencyId}`);
            update(depTaskRef, {
                blocks: dependencyTask.blocks.filter(id => id !== taskId),
                updatedAt: new Date().toISOString()
            });
        }
    };

    // Get bottleneck severity color
    const getBottleneckColor = (severity: string) => {
        switch (severity) {
            case 'critical': return '#DC2626';
            case 'high': return '#EF4444';
            case 'medium': return '#F59E0B';
            case 'low': return '#10B981';
            default: return '#6B7280';
        }
    };

    // Get bottleneck icon
    const getBottleneckIcon = (type: string) => {
        switch (type) {
            case 'dependency': return <Link />;
            case 'time': return <Schedule />;
            case 'workload': return <Warning />;
            case 'resource': return <Block />;
            default: return <Info />;
        }
    };

    const DependencyCard = ({ task }: { task: Task }) => (
        <Card sx={{ mb: 2, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.05)' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" color="white" sx={{ fontSize: '1rem' }}>
                            {task.title}
                        </Typography>
                        <Typography variant="body2" color="rgba(255,255,255,0.6)">
                            {task.dependencies.length} dependencies • {task.blockedBy?.length || 0} blocking tasks
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => openDependencyDialog(task)}>
                        <Edit sx={{ color: 'white' }} />
                    </IconButton>
                </Box>

                {task.dependencies.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" color="white" gutterBottom>
                            Dependencies:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {task.dependencies.map((dep) => (
                                <Chip
                                    key={dep.taskId}
                                    label={dep.taskName}
                                    size="small"
                                    onDelete={() => handleRemoveDependency(task.id, dep.taskId)}
                                    sx={{ 
                                        bgcolor: dep.isBlocking ? '#EF4444' : '#3B82F6',
                                        color: 'white'
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                {task.blockedBy && task.blockedBy.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" color="white" gutterBottom>
                            Blocked by:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {task.blockedBy.map((blockingId) => {
                                const blockingTask = tasks.find(t => t.id === blockingId);
                                return blockingTask ? (
                                    <Chip
                                        key={blockingId}
                                        label={blockingTask.title}
                                        size="small"
                                        icon={<Block />}
                                        sx={{ 
                                            bgcolor: blockingTask.status === 'done' ? '#10B981' : '#EF4444',
                                            color: 'white'
                                        }}
                                    />
                                ) : null;
                            })}
                        </Box>
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    const BottleneckCard = ({ bottleneck }: { bottleneck: TaskBottleneck }) => (
        <Card sx={{ mb: 2, border: `1px solid ${getBottleneckColor(bottleneck.severity)}`, bgcolor: 'rgba(255,255,255,0.05)' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getBottleneckIcon(bottleneck.bottleneckType)}
                    <Typography variant="h6" color="white" sx={{ ml: 1, fontSize: '1rem' }}>
                        {bottleneck.taskTitle}
                    </Typography>
                    <Chip
                        label={bottleneck.severity.toUpperCase()}
                        size="small"
                        sx={{ 
                            ml: 2,
                            bgcolor: getBottleneckColor(bottleneck.severity),
                            color: 'white'
                        }}
                    />
                </Box>

                <Typography variant="body2" color="rgba(255,255,255,0.8)" paragraph>
                    {bottleneck.description}
                </Typography>

                <Typography variant="subtitle2" color="white" gutterBottom>
                    Suggested Action:
                </Typography>
                <Typography variant="body2" color="#10B981" paragraph>
                    {bottleneck.suggestedAction}
                </Typography>

                <Typography variant="caption" color="rgba(255,255,255,0.6)">
                    Detected: {new Date(bottleneck.detectedAt).toLocaleString()}
                </Typography>
            </CardContent>
        </Card>
    );

    if (loading) return <LinearProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" color="white" fontWeight="bold" mb={3}>
                Task Dependencies & Bottleneck Tracking
            </Typography>

            <Grid container spacing={3}>
                {/* Dependencies Overview */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="h6" color="white" mb={2}>
                            Task Dependencies
                        </Typography>

                        {tasks.filter(task => task.dependencies.length > 0 || (task.blockedBy && task.blockedBy.length > 0)).length === 0 ? (
                            <Alert severity="info">
                                No task dependencies configured yet.
                            </Alert>
                        ) : (
                            tasks
                                .filter(task => task.dependencies.length > 0 || (task.blockedBy && task.blockedBy.length > 0))
                                .map((task) => (
                                    <DependencyCard key={task.id} task={task} />
                                ))
                        )}
                    </Paper>
                </Grid>

                {/* Bottlenecks */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" color="white">
                                Detected Bottlenecks
                            </Typography>
                            <Badge 
                                badgeContent={bottlenecks.length} 
                                color="error"
                                sx={{ ml: 2 }}
                            />
                        </Box>

                        {bottlenecks.length === 0 ? (
                            <Alert severity="success">
                                No bottlenecks detected! All tasks are flowing smoothly.
                            </Alert>
                        ) : (
                            bottlenecks.map((bottleneck) => (
                                <BottleneckCard key={bottleneck.taskId} bottleneck={bottleneck} />
                            ))
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Dependency Management Dialog */}
            <Dialog open={dependencyDialogOpen} onClose={() => setDependencyDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Manage Dependencies - {selectedTask?.title}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="rgba(255,255,255,0.7)" paragraph>
                        Select tasks that this task depends on. The selected tasks must be completed before this task can be started.
                    </Typography>

                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Select Dependencies</InputLabel>
                        <Select
                            multiple
                            value={selectedDependencies}
                            onChange={(e) => setSelectedDependencies(e.target.value as string[])}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => {
                                        const task = availableDependencies.find(t => t.id === value);
                                        return (
                                            <Chip
                                                key={value}
                                                label={task?.title}
                                                size="small"
                                            />
                                        );
                                    })}
                                </Box>
                            )}
                        >
                            {availableDependencies.map((task) => (
                                <MenuItem key={task.id} value={task.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                        <Typography variant="body2">{task.title}</Typography>
                                        <Chip
                                            label={task.status}
                                            size="small"
                                            sx={{ ml: 2 }}
                                        />
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {selectedDependencies.length > 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                You've selected {selectedDependencies.length} dependenc{selectedDependencies.length === 1 ? 'y' : 'ies'}. 
                                This task will be blocked until these tasks are completed.
                            </Typography>
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDependencyDialogOpen(false)}>Cancel</Button>
                    <Button 
                        onClick={handleAddDependencies} 
                        variant="contained"
                        disabled={selectedDependencies.length === 0}
                    >
                        Add Dependencies
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TaskDependencyTracking;
