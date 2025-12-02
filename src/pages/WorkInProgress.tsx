import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  Construction,
  Schedule,
  Update,
  Build
} from '@mui/icons-material';

const WorkInProgress: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Construction sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
            Work In Progress
          </Typography>
          <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
            This feature is currently under development
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <Chip
            icon={<Schedule />}
            label="Coming Soon"
            color="secondary"
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white' }}
          />
          <Chip
            icon={<Update />}
            label="Under Development"
            color="secondary"
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white' }}
          />
          <Chip
            icon={<Build />}
            label="Beta Testing"
            color="secondary"
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white' }}
          />
        </Box>

        <Alert
          severity="info"
          sx={{
            mb: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white'
            }
          }}
        >
          <Typography variant="body1">
            We're working hard to bring you this feature. Please check back later!
          </Typography>
        </Alert>

        <Box sx={{ mt: 4 }}>
          <CircularProgress size={40} sx={{ color: 'white', mb: 2 }} />
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Estimated completion: Coming soon
          </Typography>
        </Box>

        <Box sx={{ mt: 4, p: 2, backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>What to expect:</strong>
          </Typography>
          <Typography variant="body2" component="div">
            <ul style={{ textAlign: 'left', margin: 0, paddingLeft: '1.5em' }}>
              <li>Enhanced dashboard functionality</li>
              <li>Advanced analytics and reporting</li>
              <li>Improved collaboration tools</li>
              <li>Mobile-responsive design</li>
            </ul>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default WorkInProgress;
