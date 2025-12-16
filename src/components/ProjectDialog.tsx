import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Grid,
    Paper,
    Typography,
    Box,
    Chip,
    LinearProgress,
    Avatar,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider
} from '@mui/material';
import {
    Close,
    Assignment,
    Schedule,
    TrendingUp,
    People,
    CheckCircle,
    RadioButtonUnchecked
} from '@mui/icons-material';

interface ProjectDialogProps {
    open: boolean;
    onClose: () => void;
    selectedProject: any;
    dialogType: 'view' | 'edit';
}

const ProjectDialog: React.FC<ProjectDialogProps> = ({ 
    open, 
    onClose, 
    selectedProject, 
    dialogType 
}) => {
    if (!selectedProject) return null;

    const renderDialogContent = () => {
        return (
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Project Overview</Typography>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Status
                            </Typography>
                            <Chip 
                                label={selectedProject.status} 
                                color={selectedProject.status === 'active' ? 'success' : 'default'}
                            />
                        </Box>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Progress
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={selectedProject.progress} 
                                sx={{ mb: 1 }}
                            />
                            <Typography variant="caption">{selectedProject.progress}% Complete</Typography>
                        </Box>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Tasks
                            </Typography>
                            <Typography variant="h6">
                                {selectedProject.completedTasks || 0} / {selectedProject.tasks || 0}
                            </Typography>
                            <Typography variant="caption">Completed</Typography>
                        </Box>
                    </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Project Metrics</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                                    <Typography variant="h5" color="primary.main">
                                        {Math.floor(Math.random() * 5) + 2}
                                    </Typography>
                                    <Typography variant="caption">Team Members</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                                    <Typography variant="h5" color="success.main">
                                        {Math.floor(Math.random() * 20) + 5}d
                                    </Typography>
                                    <Typography variant="caption">Time Remaining</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
                                    <Typography variant="h5" color="warning.main">
                                        {Math.floor(Math.random() * 8) + 3}
                                    </Typography>
                                    <Typography variant="caption">Milestones</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={6}>
                                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                                    <Typography variant="h5" color="info.main">
                                        {Math.floor(Math.random() * 100) + 20}h
                                    </Typography>
                                    <Typography variant="caption">Total Hours</Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Recent Activity</Typography>
                        <List>
                            <ListItem>
                                <ListItemIcon>
                                    <CheckCircle color="success" />
                                </ListItemIcon>
                                <ListItemText 
                                    primary="Task completed: Design review"
                                    secondary="2 hours ago"
                                />
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemIcon>
                                    <RadioButtonUnchecked color="primary" />
                                </ListItemIcon>
                                <ListItemText 
                                    primary="New task added: API integration"
                                    secondary="5 hours ago"
                                />
                            </ListItem>
                            <Divider />
                            <ListItem>
                                <ListItemIcon>
                                    <Schedule color="warning" />
                                </ListItemIcon>
                                <ListItemText 
                                    primary="Milestone deadline approaching"
                                    secondary="1 day ago"
                                />
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        );
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="lg" 
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                        {dialogType === 'view' ? 'Project Details' : 'Edit Project'} - {selectedProject.name}
                    </Typography>
                    <IconButton onClick={onClose}>
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent>
                {renderDialogContent()}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
                {dialogType === 'edit' && (
                    <Button variant="contained">Save Changes</Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ProjectDialog;
