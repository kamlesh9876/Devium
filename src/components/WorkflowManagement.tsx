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
    TextField,
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
    ListItemSecondaryAction,
    Alert,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Tooltip
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    DragIndicator,
    ExpandMore,
    PlayArrow,
    CheckCircle,
    Block,
    Assignment,
    Workflow,
    Settings,
    ArrowForward,
    ArrowBack
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { rtdb } from '../firebase';
import { CustomWorkflow, WorkflowStep, TaskStatus } from '../types/task';

interface WorkflowManagementProps {
    projectId: string;
    projectName: string;
}

const WorkflowManagement: React.FC<WorkflowManagementProps> = ({ projectId, projectName }) => {
    const { user } = useAuth();
    const [workflows, setWorkflows] = useState<CustomWorkflow[]>([]);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState<CustomWorkflow | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        defaultAssignee: ''
    });

    // Workflow steps state
    const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
        { id: '1', name: 'To Do', status: 'todo', order: 0, isRequired: true },
        { id: '2', name: 'In Progress', status: 'in-progress', order: 1, isRequired: true },
        { id: '3', name: 'Review', status: 'in-progress', order: 2, isRequired: false },
        { id: '4', name: 'Done', status: 'done', order: 3, isRequired: true }
    ]);

    // Load workflows from Firebase
    useEffect(() => {
        if (!user) return;

        const workflowsRef = ref(rtdb, 'workflows');
        const unsubscribe = onValue(workflowsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const workflowsList: CustomWorkflow[] = Object.entries(data)
                    .map(([id, workflowData]: [string, any]) => ({
                        id,
                        ...workflowData
                    }))
                    .filter(workflow => workflow.projectId === projectId);
                setWorkflows(workflowsList);
            }
            setLoading(false);
        }, (error) => {
            setError('Failed to load workflows');
            setLoading(false);
        });

        return unsubscribe;
    }, [user, projectId]);

    // CRUD Operations
    const handleCreateWorkflow = () => {
        if (!user) return;

        const workflowsRef = ref(rtdb, 'workflows');
        const newWorkflow = {
            projectId,
            name: formData.name,
            steps: workflowSteps.map((step, index) => ({
                ...step,
                order: index,
                id: `step-${Date.now()}-${index}`
            })),
            defaultAssignee: formData.defaultAssignee || null,
            createdBy: user.uid,
            createdAt: new Date().toISOString()
        };

        push(workflowsRef, newWorkflow);
        setCreateDialogOpen(false);
        resetForm();
    };

    const handleUpdateWorkflow = () => {
        if (!selectedWorkflow) return;

        const workflowRef = ref(rtdb, `workflows/${selectedWorkflow.id}`);
        const updatedWorkflow = {
            ...selectedWorkflow,
            name: formData.name,
            steps: workflowSteps.map((step, index) => ({
                ...step,
                order: index
            })),
            defaultAssignee: formData.defaultAssignee || null,
            updatedAt: new Date().toISOString()
        };

        update(workflowRef, updatedWorkflow);
        setEditDialogOpen(false);
        resetForm();
    };

    const handleDeleteWorkflow = (workflowId: string) => {
        const workflowRef = ref(rtdb, `workflows/${workflowId}`);
        remove(workflowRef);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            defaultAssignee: ''
        });
        setWorkflowSteps([
            { id: '1', name: 'To Do', status: 'todo', order: 0, isRequired: true },
            { id: '2', name: 'In Progress', status: 'in-progress', order: 1, isRequired: true },
            { id: '3', name: 'Review', status: 'in-progress', order: 2, isRequired: false },
            { id: '4', name: 'Done', status: 'done', order: 3, isRequired: true }
        ]);
    };

    const addWorkflowStep = () => {
        const newStep: WorkflowStep = {
            id: `step-${Date.now()}`,
            name: 'New Step',
            status: 'in-progress',
            order: workflowSteps.length,
            isRequired: true
        };
        setWorkflowSteps([...workflowSteps, newStep]);
    };

    const updateWorkflowStep = (stepId: string, updates: Partial<WorkflowStep>) => {
        setWorkflowSteps(workflows.map(step => 
            step.id === stepId ? { ...step, ...updates } : step
        ));
    };

    const removeWorkflowStep = (stepId: string) => {
        setWorkflowSteps(workflows.filter(step => step.id !== stepId));
    };

    const moveStepUp = (index: number) => {
        if (index > 0) {
            const newSteps = [...workflowSteps];
            [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
            setWorkflowSteps(newSteps);
        }
    };

    const moveStepDown = (index: number) => {
        if (index < workflowSteps.length - 1) {
            const newSteps = [...workflowSteps];
            [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
            setWorkflowSteps(newSteps);
        }
    };

    const getStatusIcon = (status: TaskStatus) => {
        switch (status) {
            case 'todo': return <Assignment />;
            case 'in-progress': return <PlayArrow />;
            case 'blocked': return <Block />;
            case 'done': return <CheckCircle />;
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

    const WorkflowCard = ({ workflow }: { workflow: CustomWorkflow }) => (
        <Card sx={{ mb: 2, border: '1px solid rgba(255,255,255,0.1)', bgcolor: 'rgba(255,255,255,0.05)' }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                        <Typography variant="h6" color="white" sx={{ fontSize: '1.1rem' }}>
                            {workflow.name}
                        </Typography>
                        <Typography variant="body2" color="rgba(255,255,255,0.6)">
                            {workflow.steps.length} steps
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton size="small" onClick={() => { setSelectedWorkflow(workflow); setFormData({ name: workflow.name, description: '', defaultAssignee: workflow.defaultAssignee || '' }); setWorkflowSteps(workflow.steps); setEditDialogOpen(true); }}>
                            <Edit sx={{ color: 'white' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDeleteWorkflow(workflow.id)}>
                            <Delete sx={{ color: '#EF4444' }} />
                        </IconButton>
                    </Box>
                </Box>

                <Stepper activeStep={-1} orientation="vertical">
                    {workflow.steps.map((step, index) => (
                        <Step key={step.id}>
                            <StepLabel
                                icon={<Box sx={{ display: 'flex', alignItems: 'center' }}>{getStatusIcon(step.status)}</Box>}
                            >
                                <Typography variant="body2" color="white">
                                    {step.name}
                                </Typography>
                            </StepLabel>
                            <StepContent>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Chip
                                        label={step.status.replace('-', ' ').toUpperCase()}
                                        size="small"
                                        sx={{ bgcolor: getStatusColor(step.status), color: 'white' }}
                                    />
                                    {step.isRequired && (
                                        <Chip
                                            label="Required"
                                            size="small"
                                            sx={{ bgcolor: '#10B981', color: 'white' }}
                                        />
                                    )}
                                    {step.assignToRole && (
                                        <Chip
                                            label={`Role: ${step.assignToRole}`}
                                            size="small"
                                            sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                        />
                                    )}
                                </Box>
                            </StepContent>
                        </Step>
                    ))}
                </Stepper>
            </CardContent>
        </Card>
    );

    if (loading) return <LinearProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" color="white" fontWeight="bold">
                    Workflow Management
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setCreateDialogOpen(true)}
                    sx={{ bgcolor: '#3B82F6' }}
                >
                    Create Workflow
                </Button>
            </Box>

            <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Typography variant="h6" color="white" mb={2}>
                    Workflows for {projectName}
                </Typography>

                {workflows.length === 0 ? (
                    <Alert severity="info">
                        No workflows created yet. Create your first custom workflow!
                    </Alert>
                ) : (
                    workflows.map((workflow) => (
                        <WorkflowCard key={workflow.id} workflow={workflow} />
                    ))
                )}
            </Paper>

            {/* Create Workflow Dialog */}
            <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create Custom Workflow</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Workflow Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        
                        <Grid item xs={12}>
                            <Typography variant="h6" color="white" gutterBottom>
                                Workflow Steps
                            </Typography>
                            
                            {workflowSteps.map((step, index) => (
                                <Card key={step.id} sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                                    <CardContent>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={1}>
                                                <DragIndicator sx={{ color: 'rgba(255,255,255,0.5)' }} />
                                            </Grid>
                                            <Grid item xs={3}>
                                                <TextField
                                                    fullWidth
                                                    label="Step Name"
                                                    value={step.name}
                                                    onChange={(e) => updateWorkflowStep(step.id, { name: e.target.value })}
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={2}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Status</InputLabel>
                                                    <Select
                                                        value={step.status}
                                                        onChange={(e) => updateWorkflowStep(step.id, { status: e.target.value as TaskStatus })}
                                                    >
                                                        <MenuItem value="todo">To Do</MenuItem>
                                                        <MenuItem value="in-progress">In Progress</MenuItem>
                                                        <MenuItem value="blocked">Blocked</MenuItem>
                                                        <MenuItem value="done">Done</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={3}>
                                                <TextField
                                                    fullWidth
                                                    label="Assign to Role (optional)"
                                                    value={step.assignToRole || ''}
                                                    onChange={(e) => updateWorkflowStep(step.id, { assignToRole: e.target.value })}
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={2}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Tooltip title="Required Step">
                                                        <Chip
                                                            label={step.isRequired ? 'Required' : 'Optional'}
                                                            size="small"
                                                            onClick={() => updateWorkflowStep(step.id, { isRequired: !step.isRequired })}
                                                            sx={{ 
                                                                bgcolor: step.isRequired ? '#10B981' : 'rgba(255,255,255,0.1)',
                                                                color: 'white',
                                                                cursor: 'pointer'
                                                            }}
                                                        />
                                                    </Tooltip>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={1}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <IconButton size="small" onClick={() => moveStepUp(index)} disabled={index === 0}>
                                                        <ArrowBack sx={{ color: 'white', fontSize: 16 }} />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => moveStepDown(index)} disabled={index === workflowSteps.length - 1}>
                                                        <ArrowForward sx={{ color: 'white', fontSize: 16 }} />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => removeWorkflowStep(step.id)}>
                                                        <Delete sx={{ color: '#EF4444', fontSize: 16 }} />
                                                    </IconButton>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            ))}
                            
                            <Button
                                variant="outlined"
                                startIcon={<Add />}
                                onClick={addWorkflowStep}
                                sx={{ mt: 2, color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                            >
                                Add Step
                            </Button>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateWorkflow} variant="contained">Create Workflow</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Workflow Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Edit Workflow</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Workflow Name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        
                        <Grid item xs={12}>
                            <Typography variant="h6" color="white" gutterBottom>
                                Workflow Steps
                            </Typography>
                            
                            {workflowSteps.map((step, index) => (
                                <Card key={step.id} sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                                    <CardContent>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={1}>
                                                <DragIndicator sx={{ color: 'rgba(255,255,255,0.5)' }} />
                                            </Grid>
                                            <Grid item xs={3}>
                                                <TextField
                                                    fullWidth
                                                    label="Step Name"
                                                    value={step.name}
                                                    onChange={(e) => updateWorkflowStep(step.id, { name: e.target.value })}
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={2}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Status</InputLabel>
                                                    <Select
                                                        value={step.status}
                                                        onChange={(e) => updateWorkflowStep(step.id, { status: e.target.value as TaskStatus })}
                                                    >
                                                        <MenuItem value="todo">To Do</MenuItem>
                                                        <MenuItem value="in-progress">In Progress</MenuItem>
                                                        <MenuItem value="blocked">Blocked</MenuItem>
                                                        <MenuItem value="done">Done</MenuItem>
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={3}>
                                                <TextField
                                                    fullWidth
                                                    label="Assign to Role (optional)"
                                                    value={step.assignToRole || ''}
                                                    onChange={(e) => updateWorkflowStep(step.id, { assignToRole: e.target.value })}
                                                    size="small"
                                                />
                                            </Grid>
                                            <Grid item xs={2}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Tooltip title="Required Step">
                                                        <Chip
                                                            label={step.isRequired ? 'Required' : 'Optional'}
                                                            size="small"
                                                            onClick={() => updateWorkflowStep(step.id, { isRequired: !step.isRequired })}
                                                            sx={{ 
                                                                bgcolor: step.isRequired ? '#10B981' : 'rgba(255,255,255,0.1)',
                                                                color: 'white',
                                                                cursor: 'pointer'
                                                            }}
                                                        />
                                                    </Tooltip>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={1}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                    <IconButton size="small" onClick={() => moveStepUp(index)} disabled={index === 0}>
                                                        <ArrowBack sx={{ color: 'white', fontSize: 16 }} />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => moveStepDown(index)} disabled={index === workflowSteps.length - 1}>
                                                        <ArrowForward sx={{ color: 'white', fontSize: 16 }} />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => removeWorkflowStep(step.id)}>
                                                        <Delete sx={{ color: '#EF4444', fontSize: 16 }} />
                                                    </IconButton>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            ))}
                            
                            <Button
                                variant="outlined"
                                startIcon={<Add />}
                                onClick={addWorkflowStep}
                                sx={{ mt: 2, color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                            >
                                Add Step
                            </Button>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateWorkflow} variant="contained">Update Workflow</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default WorkflowManagement;
