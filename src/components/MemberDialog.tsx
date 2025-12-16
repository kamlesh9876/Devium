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
  Avatar,
  Chip,
  LinearProgress
} from '@mui/material';
import { Close } from '@mui/icons-material';

interface MemberDialogProps {
  open: boolean;
  onClose: () => void;
  selectedMember: any;
  dialogType: 'details' | 'analytics';
}

const MemberDialog: React.FC<MemberDialogProps> = ({ 
  open, 
  onClose, 
  selectedMember, 
  dialogType 
}) => {
  if (!selectedMember) return null;

  const renderDialogContent = () => {
    if (dialogType === 'details') {
      return (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  mx: 'auto', 
                  mb: 2, 
                  bgcolor: selectedMember.role === 'developer' ? '#3b82f6' : '#10b981' 
                }}
              >
                {selectedMember.name.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="h6">{selectedMember.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedMember.email}
              </Typography>
              <Chip label={selectedMember.role} size="small" sx={{ mt: 1 }} />
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {selectedMember.tasksCompleted}
                  </Typography>
                  <Typography variant="caption">Tasks Completed</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {selectedMember.performance}%
                  </Typography>
                  <Typography variant="caption">Performance Score</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Status</Typography>
                  <Chip 
                    label={selectedMember.status} 
                    color={selectedMember.status === 'active' ? 'success' : 'default'}
                    sx={{ mr: 1 }}
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {selectedMember.status === 'active' ? 'Currently working and available' : 'Away or offline'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      );
    }

    // Analytics dialog content
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Performance Overview</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>Overall Performance</Typography>
              <LinearProgress 
                variant="determinate" 
                value={selectedMember.performance} 
                sx={{ mb: 1 }}
              />
              <Typography variant="caption">{selectedMember.performance}%</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>Task Completion Rate</Typography>
              <LinearProgress 
                variant="determinate" 
                value={(selectedMember.tasksCompleted / 30) * 100} 
                sx={{ mb: 1 }}
              />
              <Typography variant="caption">{selectedMember.tasksCompleted} tasks completed</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Activity Metrics</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="h5" color="primary">
                    {Math.floor(Math.random() * 8) + 4}
                  </Typography>
                  <Typography variant="caption">Hours Today</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="h5" color="success.main">
                    {Math.floor(Math.random() * 5) + 2}
                  </Typography>
                  <Typography variant="caption">Active Projects</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="h5" color="warning.main">
                    {Math.floor(Math.random() * 20) + 10}
                  </Typography>
                  <Typography variant="caption">This Week</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="h5" color="info.main">
                    {Math.floor(Math.random() * 50) + 30}
                  </Typography>
                  <Typography variant="caption">This Month</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth={dialogType === 'details' ? 'md' : 'lg'} 
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {dialogType === 'details' ? 'Team Member Details' : 'Performance Analytics'}
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
      </DialogActions>
    </Dialog>
  );
};

export default MemberDialog;
