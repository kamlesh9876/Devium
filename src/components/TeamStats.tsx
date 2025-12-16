import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  People,
  TrendingUp,
  Schedule,
  Assignment
} from '@mui/icons-material';

interface TeamStatsProps {
  selectedTeam: any;
  teams: any[];
}

const TeamStats: React.FC<TeamStatsProps> = ({ selectedTeam, teams }) => {
  const StatCard = ({ title, value, icon, color }: any) => (
    <Paper
      sx={{
        p: 3,
        textAlign: 'center',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
        border: `1px solid ${color}30`,
        borderRadius: 2,
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3
        }
      }}
    >
      <Box sx={{ color: color, mb: 1 }}>
        {icon}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
    </Paper>
  );

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Team Members"
          value={selectedTeam?.members?.length || 0}
          icon={<People />}
          color="#3b82f6"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Active Projects"
          value={selectedTeam?.projects?.length || Math.floor(Math.random() * 8) + 3}
          icon={<Assignment />}
          color="#10b981"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Avg Performance"
          value={`${Math.floor(Math.random() * 30) + 70}%`}
          icon={<TrendingUp />}
          color="#f59e0b"
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          title="Hours Today"
          value={`${Math.floor(Math.random() * 40) + 20}h`}
          icon={<Schedule />}
          color="#ef4444"
        />
      </Grid>
    </Grid>
  );
};

export default TeamStats;
