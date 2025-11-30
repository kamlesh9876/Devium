import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  Person,
  Computer,
  AccessTime,
  TrendingUp,
  Group,
  Timeline,
  BarChart,
  PieChart,
  Activity,
  Wifi,
  WifiOff
} from '@mui/icons-material';
import { ref, onValue, get } from 'firebase/database';
import { rtdb } from '../../firebase';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface User {
  uid: string;
  email: string;
  name: string;
  role: string;
  status?: string;
  lastLogin?: string;
  device?: string;
}

interface Session {
  uid: string;
  email: string;
  name: string;
  role: string;
  status: 'online' | 'offline';
  device: string;
  lastSeen: any;
  connectedAt: any;
  userAgent: string;
}

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function UserAnalytics() {
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    // Fetch users and sessions
    const fetchUsers = async () => {
      try {
        const usersRef = ref(rtdb, 'users');
        const usersSnapshot = await get(usersRef);
        
        if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val();
          const usersList = Object.entries(usersData).map(([uid, data]: [string, any]) => ({
            uid,
            ...data
          }));
          setUsers(usersList);
        }

        const sessionsRef = ref(rtdb, 'sessions');
        const sessionsSnapshot = await get(sessionsRef);
        
        if (sessionsSnapshot.exists()) {
          const sessionsData = sessionsSnapshot.val();
          const sessionsList = Object.entries(sessionsData).map(([uid, data]: [string, any]) => ({
            uid,
            ...data,
            userAgent: data.userAgent || 'Unknown'
          }));
          setSessions(sessionsList);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();

    // Set up real-time listeners
    const usersRef = ref(rtdb, 'users');
    const sessionsRef = ref(rtdb, 'sessions');

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersList = Object.entries(usersData).map(([uid, data]: [string, any]) => ({
          uid,
          ...data
        }));
        setUsers(usersList);
      }
    });

    const unsubscribeSessions = onValue(sessionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const sessionsData = snapshot.val();
        const sessionsList = Object.entries(sessionsData).map(([uid, data]: [string, any]) => ({
          uid,
          ...data,
          userAgent: data.userAgent || 'Unknown'
        }));
        setSessions(sessionsList);
      }
    });

    return () => {
      unsubscribeUsers();
      unsubscribeSessions();
    };
  }, []);

  const onlineUsers = sessions.filter(s => s.status === 'online');
  const offlineUsers = sessions.filter(s => s.status === 'offline');
  const totalUsers = users.length;

  // Analytics data
  const roleDistribution = [
    { name: 'Admin', value: users.filter(u => u.role === 'admin').length, color: '#8884d8' },
    { name: 'Manager', value: users.filter(u => u.role === 'manager').length, color: '#82ca9d' },
    { name: 'Developer', value: users.filter(u => u.role === 'developer').length, color: '#ffc658' },
    { name: 'Tester', value: users.filter(u => u.role === 'tester').length, color: '#ff7300' }
  ];

  const activityData = [
    { time: '00:00', online: 2, total: 10 },
    { time: '04:00', online: 1, total: 10 },
    { time: '08:00', online: 5, total: 10 },
    { time: '12:00', online: 8, total: 10 },
    { time: '16:00', online: 6, total: 10 },
    { time: '20:00', online: 3, total: 10 },
    { time: '23:59', online: 1, total: 10 }
  ];

  const deviceData = [
    { 
      device: 'Chrome', 
      count: sessions.filter(s => 
        s.userAgent && 
        s.userAgent.includes('Chrome') && 
        !s.userAgent.includes('Edg') && 
        !s.userAgent.includes('OPR')
      ).length 
    },
    { 
      device: 'Firefox', 
      count: sessions.filter(s => 
        s.userAgent && 
        s.userAgent.includes('Firefox')
      ).length 
    },
    { 
      device: 'Safari', 
      count: sessions.filter(s => 
        s.userAgent && 
        s.userAgent.includes('Safari') && 
        !s.userAgent.includes('Chrome') && 
        !s.userAgent.includes('Chromium') && 
        !s.userAgent.includes('Edg') && 
        !s.userAgent.includes('OPR')
      ).length 
    },
    { 
      device: 'Edge', 
      count: sessions.filter(s => 
        s.userAgent && 
        (s.userAgent.includes('Edg') || s.userAgent.includes('Edge'))
      ).length 
    }
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#4caf50';
      case 'offline': return '#9e9e9e';
      case 'active': return '#2196f3';
      default: return '#9e9e9e';
    }
  };

  const formatLastSeen = (lastSeen: any) => {
    if (!lastSeen) return 'Never';
    const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading analytics...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Analytics Dashboard
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: '#4caf50', mr: 2 }}>
                  <Group />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h5">{totalUsers}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: '#4caf50', mr: 2 }}>
                  <Wifi />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Online Now
                  </Typography>
                  <Typography variant="h5">{onlineUsers.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: '#9e9e9e', mr: 2 }}>
                  <WifiOff />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Offline
                  </Typography>
                  <Typography variant="h5">{offlineUsers.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: '#2196f3', mr: 2 }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Activity Rate
                  </Typography>
                  <Typography variant="h5">
                    {totalUsers > 0 ? Math.round((onlineUsers.length / totalUsers) * 100) : 0}%
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="User Status" />
          <Tab label="Activity Graphs" />
          <Tab label="Device Analytics" />
          <Tab label="Role Distribution" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* User Status Cards */}
          {users.map((user) => {
            const session = sessions.find(s => s.uid === user.uid);
            const isOnline = session?.status === 'online';
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={user.uid}>
                <Card sx={{ 
                  height: '100%',
                  border: isOnline ? '2px solid #4caf50' : '1px solid #e0e0e0',
                  boxShadow: isOnline ? '0 4px 12px rgba(76, 175, 80, 0.3)' : 'none'
                }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar sx={{ 
                        bgcolor: isOnline ? '#4caf50' : '#9e9e9e',
                        mr: 2 
                      }}>
                        <Person />
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" noWrap>
                          {user.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" noWrap>
                          {user.email}
                        </Typography>
                      </Box>
                      <Chip
                        icon={isOnline ? <Wifi /> : <WifiOff />}
                        label={isOnline ? 'Online' : 'Offline'}
                        color={isOnline ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Box mb={1}>
                      <Typography variant="body2" color="textSecondary">
                        Role: <Chip label={user.role} size="small" variant="outlined" />
                      </Typography>
                    </Box>
                    
                    {session && (
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Device: {session.device}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Last Seen: {formatLastSeen(session.lastSeen)}
                        </Typography>
                        {isOnline && (
                          <Typography variant="body2" color="primary">
                            Connected: {formatLastSeen(session.connectedAt)}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                User Activity Timeline
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="online" stackId="1" stroke="#4caf50" fill="#4caf50" />
                  <Area type="monotone" dataKey="total" stackId="2" stroke="#2196f3" fill="#2196f3" />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Activity Stats
              </Typography>
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Peak Activity Time
                </Typography>
                <Typography variant="h6">12:00 - 16:00</Typography>
              </Box>
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary">
                  Average Online Users
                </Typography>
                <Typography variant="h6">
                  {Math.round(onlineUsers.length * 1.2)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Total Sessions Today
                </Typography>
                <Typography variant="h6">{sessions.length}</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Device Usage
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={deviceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="device" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Device Breakdown
              </Typography>
              {deviceData.map((device) => (
                <Box key={device.device} mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    {device.device}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(device.count / sessions.length) * 100} 
                    sx={{ mt: 1 }}
                  />
                  <Typography variant="caption">
                    {device.count} users
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Role Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Role Details
              </Typography>
              {roleDistribution.map((role) => (
                <Box key={role.name} mb={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">
                      {role.name}
                    </Typography>
                    <Typography variant="h6">
                      {role.value}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={(role.value / totalUsers) * 100} 
                    sx={{ mt: 1 }}
                  />
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}
