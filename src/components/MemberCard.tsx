import React from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Avatar,
  Typography,
  Chip,
  LinearProgress,
  Button
} from '@mui/material';

interface MemberCardProps {
  member: any;
  onViewAnalytics: (member: any) => void;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, onViewAnalytics }) => {
  const getActivityLevel = () => {
    const performance = member.performance || Math.floor(Math.random() * 100);
    if (performance >= 80) return { label: 'High', color: 'success' };
    if (performance >= 60) return { label: 'Medium', color: 'warning' };
    return { label: 'Low', color: 'error' };
  };

  const activityLevel = getActivityLevel();

  return (
    <TableRow>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            sx={{ 
              bgcolor: member.role === 'developer' ? '#3b82f6' : '#10b981', 
              mr: 2, 
              width: 32, 
              height: 32 
            }}
          >
            {member.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              {member.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {member.email}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={member.role}
          size="small"
          color={member.role === 'developer' ? 'primary' : 'success'}
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Chip
          label={member.status}
          size="small"
          color={member.status === 'active' ? 'success' : 'default'}
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2" fontWeight="medium">
          {member.tasksCompleted || Math.floor(Math.random() * 20) + 5}
        </Typography>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            {member.performance || Math.floor(Math.random() * 100)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={member.performance || Math.floor(Math.random() * 100)}
            sx={{ width: 60 }}
          />
        </Box>
      </TableCell>
      <TableCell>
        <Chip
          label={activityLevel.label}
          size="small"
          color={activityLevel.color as any}
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Button 
          size="small" 
          variant="outlined" 
          onClick={() => onViewAnalytics(member)}
        >
          Analytics
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default MemberCard;
