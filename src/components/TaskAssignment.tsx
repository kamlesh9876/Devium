import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Avatar,
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
    LinearProgress,
    Badge,
    Tooltip,
    Alert,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    IconButton
} from '@mui/material';
import {
    Person,
    Assignment,
    AssignmentTurnedIn,
    SwapHoriz,
    TrendingUp,
    Warning,
    CheckCircle,
    Schedule,
    Work
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ref, onValue, update } from 'firebase/database';
import { rtdb } from '../firebase';
import { Task, WorkloadMetrics } from '../types/task';

interface TeamMember {
    uid: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
}

interface TaskAssignmentProps {
    projectId: string;
    onTaskAssigned?: (taskId: string, assignedTo: string) => void;
}

const TaskAssignment: React.FC<TaskAssignmentProps> = ({ projectId, onTaskAssigned }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [workloadMetrics, setWorkloadMetrics] = useState<WorkloadMetrics[]>([]);
    const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedMember, setSelectedMember] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load tasks and team members
    useEffect(() => {
        if (!user) return;

        const tasksRef = ref(rtdb, 'tasks');
        const usersRef = ref(rtdb, 'users');

        const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const tasksList: Task[] = Object.entries(data)
                    .map(([id, taskData]: [string, any]) => ({
                        id,
                        ...taskData
                    }))
                    .filter(task => task.projectId === projectId);
                setTasks(tasksList);
            }
        });

        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const members: TeamMember[] = Object.entries(data)
                    .map(([uid, userData]: [string, any]) => ({
                        uid,
                        name: userData.name || 'Unknown',
                        email: userData.email || '',
                        role: userData.role || 'developer',
                        avatar: userData.avatar
                    }));
                setTeamMembers(members);
            }
        });

        return () => {
            unsubscribeTasks();
            unsubscribeUsers();
        };
    }, [user, projectId]);

    // Calculate workload metrics
    useEffect(() => {
        const metrics: WorkloadMetrics[] = teamMembers.map(member => {
            const memberTasks = tasks.filter(task => task.assignedTo === member.uid);
            const completedTasks = memberTasks.filter(task => task.status === 'done');
            const inProgressTasks = memberTasks.filter(task => task.status === 'in-progress');
            const blockedTasks = memberTasks.filter(task => task.status === 'blocked');
            
            const totalEstimatedHours = memberTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
            const totalActualHours = memberTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0);
            
            // Calculate workload score (0-100)
            const workloadScore = Math.min(100, (memberTasks.length * 10) + (inProgressTasks.length * 20) + (blockedTasks.length * 30));
            
            // Calculate efficiency (actual vs estimated)
            const efficiency = totalEstimatedHours > 0 ? (totalActualHours / totalEstimatedHours) * 100 : 100;

            return {
                userId: member.uid,
                userName: member.name,
                totalTasks: memberTasks.length,
                completedTasks: completedTasks.length,
                inProgressTasks: inProgressTasks.length,
                blockedTasks: blockedTasks.length,
                totalEstimatedHours,
                totalActualHours,
                workloadScore,
                efficiency: Math.min(100, efficiency)
            };
        });

        setWorkloadMetrics(metrics);
        setLoading(false);
    }, [tasks, teamMembers]);

    // Get best assignee for workload balancing
    const getBestAssignee = (currentAssignee?: string): string => {
        const availableMembers = workloadMetrics
            .filter(metric => currentAssignee ? metric.userId !== currentAssignee : true)
            .sort((a, b) => {
                // Prioritize lower workload score
                if (a.workloadScore !== b.workloadScore) {
                    return a.workloadScore - b.workloadScore;
                }
                // Then prioritize higher efficiency
                return b.efficiency - a.efficiency;
            });

        return availableMembers[0]?.userId || '';
    };

    // Handle task reassignment
    const handleReassignTask = () => {
        if (!selectedTask || !selectedMember) return;

        const taskRef = ref(rtdb, `tasks/${selectedTask.id}`);
        const member = teamMembers.find(m => m.uid === selectedMember);
        
        update(taskRef, {
            assignedTo: selectedMember,
            assignedToName: member?.name || 'Unknown',
            updatedAt: new Date().toISOString()
        });

        onTaskAssigned?.(selectedTask.id, selectedMember);
        setReassignDialogOpen(false);
        setSelectedTask(null);
        setSelectedMember('');
    };

    // Get workload color based on score
    const getWorkloadColor = (score: number) => {
        if (score < 30) return '#10B981'; // Green - Low workload
        if (score < 60) return '#F59E0B'; // Yellow - Medium workload
        if (score < 80) return '#EF4444'; // Red - High workload
        return '#DC2626'; // Dark Red - Critical workload
    };

    // Get efficiency color
    const getEfficiencyColor = (efficiency: number) => {
        if (efficiency <= 100) return '#10B981'; // Green - On track
        if (efficiency <= 120) return '#F59E0B'; // Yellow - Slightly over
        return '#EF4444'; // Red - Over budget
    };

    const MemberWorkloadCard = ({ metric }: { metric: WorkloadMetrics }) => (
        <Card sx={{ 
            mb: 2, 
            border: '1px solid rgba(255,255,255,0.1)', 
            bgcolor: 'rgba(255,255,255,0.05)',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
        }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: '#3B82F6' }}>
                        {metric.userName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" color="white" sx={{ fontSize: '1rem' }}>
                            {metric.userName}
                        </Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.6)">
                            {metric.totalTasks} tasks total
                        </Typography>
                    </Box>
                    <Badge 
                        badgeContent={metric.workloadScore} 
                        color="primary"
                        sx={{ 
                            '& .MuiBadge-badge': { 
                                bgcolor: getWorkloadColor(metric.workloadScore),
                                color: 'white'
                            } 
                        }}
                    >
                        <Work sx={{ color: 'white' }} />
                    </Badge>
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <Typography variant="body2" color="rgba(255,255,255,0.6)">
                            Active Tasks
                        </Typography>
                        <Typography variant="h6" color="white">
                            {metric.inProgressTasks + metric.blockedTasks}
                        </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="body2" color="rgba(255,255,255,0.6)">
                            Completed
                        </Typography>
                        <Typography variant="h6" color="#10B981">
                            {metric.completedTasks}
                        </Typography>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="rgba(255,255,255,0.6)">
                            Workload Score
                        </Typography>
                        <Typography variant="caption" color={getWorkloadColor(metric.workloadScore)}>
                            {metric.workloadScore}%
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={metric.workloadScore}
                        sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'rgba(255,255,255,0.1)',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                bgcolor: getWorkloadColor(metric.workloadScore)
                            }
                        }}
                    />
                </Box>

                {metric.totalEstimatedHours > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" color="rgba(255,255,255,0.6)">
                                Efficiency
                            </Typography>
                            <Typography variant="caption" color={getEfficiencyColor(metric.efficiency)}>
                                {Math.round(metric.efficiency)}%
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(100, metric.efficiency)}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.1)',
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 3,
                                    bgcolor: getEfficiencyColor(metric.efficiency)
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
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" color="white" fontWeight="bold" mb={3}>
                Task Assignment & Workload Balancing
            </Typography>

            <Grid container spacing={3}>
                {/* Workload Overview */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="h6" color="white" mb={2}>
                            Team Workload Overview
                        </Typography>
                        
                        {workloadMetrics.map((metric) => (
                            <MemberWorkloadCard key={metric.userId} metric={metric} />
                        ))}

                        <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                Workload Score is calculated based on active tasks, priority, and complexity.
                            </Typography>
                        </Alert>
                    </Paper>
                </Grid>

                {/* Task Reassignment */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Typography variant="h6" color="white" mb={2}>
                            Quick Reassignment
                        </Typography>

                        <List>
                            {tasks
                                .filter(task => task.status !== 'done')
                                .map((task) => {
                                    const bestAssignee = getBestAssignee(task.assignedTo);
                                    const currentAssignee = teamMembers.find(m => m.uid === task.assignedTo);
                                    const suggestedAssignee = teamMembers.find(m => m.uid === bestAssignee);
                                    
                                    return (
                                        <ListItem key={task.id} sx={{ bgcolor: 'rgba(255,255,255,0.02)', mb: 1 }}>
                                            <ListItemIcon>
                                                <Assignment sx={{ color: 'white' }} />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Typography variant="body1" color="white">
                                                        {task.title}
                                                    </Typography>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Typography variant="body2" color="rgba(255,255,255,0.6)">
                                                            Currently: {currentAssignee?.name || 'Unassigned'}
                                                        </Typography>
                                                        {suggestedAssignee && suggestedAssignee.uid !== task.assignedTo && (
                                                            <Typography variant="body2" color="#10B981">
                                                                Suggested: {suggestedAssignee.name}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                }
                                            />
                                            <IconButton
                                                onClick={() => {
                                                    setSelectedTask(task);
                                                    setSelectedMember(bestAssignee);
                                                    setReassignDialogOpen(true);
                                                }}
                                                sx={{ color: '#3B82F6' }}
                                            >
                                                <SwapHoriz />
                                            </IconButton>
                                        </ListItem>
                                    );
                                })}
                        </List>

                        {tasks.filter(task => task.status !== 'done').length === 0 && (
                            <Alert severity="success">
                                No active tasks to reassign!
                            </Alert>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Reassignment Dialog */}
            <Dialog open={reassignDialogOpen} onClose={() => setReassignDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reassign Task</DialogTitle>
                <DialogContent>
                    {selectedTask && (
                        <Box>
                            <Typography variant="h6" color="white" gutterBottom>
                                {selectedTask.title}
                            </Typography>
                            <Typography variant="body2" color="rgba(255,255,255,0.7)" paragraph>
                                {selectedTask.description}
                            </Typography>
                            
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel>Assign To</InputLabel>
                                <Select
                                    value={selectedMember}
                                    onChange={(e) => setSelectedMember(e.target.value)}
                                >
                                    {teamMembers.map((member) => {
                                        const metric = workloadMetrics.find(m => m.userId === member.uid);
                                        return (
                                            <MenuItem key={member.uid} value={member.uid}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                    <Avatar sx={{ mr: 2, width: 24, height: 24 }}>
                                                        {member.name.charAt(0).toUpperCase()}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body2">{member.name}</Typography>
                                                        {metric && (
                                                            <Typography variant="caption" color="rgba(255,255,255,0.6)">
                                                                {metric.totalTasks} tasks • {Math.round(metric.workloadScore)}% workload
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    {metric && (
                                                        <Chip
                                                            size="small"
                                                            label={Math.round(metric.workloadScore) + '%'}
                                                            sx={{
                                                                bgcolor: getWorkloadColor(metric.workloadScore),
                                                                color: 'white',
                                                                ml: 1
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReassignDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleReassignTask} variant="contained">Reassign</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TaskAssignment;
