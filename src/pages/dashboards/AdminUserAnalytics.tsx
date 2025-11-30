import React, { useEffect, useState } from 'react';
import { ref, onValue, set, get } from 'firebase/database';
import { rtdb } from '../../firebase';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import BugReportIcon from '@mui/icons-material/BugReport';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

interface User {
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: string;
  team?: string;
  projects?: string[];
  password?: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  team: string;
  progress: number;
  deadline: string;
  members: string[];
}

interface Stats {
  totalUsers: number;
  onlineUsers: number;
  activeUsers: number;
  admins: number;
  managers: number;
  developers: number;
  testers: number;
  inactiveUsers: number;
}

const AdminUserAnalytics: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'developer',
    status: 'active',
    password: '',
    team: '',
    projects: []
  });
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const projectsRef = ref(rtdb, 'projects');

    const unsubscribeUsers = onValue(usersRef, snapshot => {
      const data = snapshot.val() || {};
      const list: User[] = Object.entries(data).map(([uid, u]: [string, any]) => ({
        uid,
        name: u.name || 'Unknown',
        email: u.email || '',
        role: u.role || 'user',
        status: u.status || 'inactive',
        lastLogin: u.lastLogin || '',
        team: u.team || '',
        projects: u.projects || []
      }));
      setUsers(list);
      setLoading(false);
    });
    const unsubscribeProjects = onValue(projectsRef, snapshot => {
      const data = snapshot.val() || {};
      const list: Project[] = Object.entries(data).map(([id, p]: [string, any]) => ({
        id,
        name: p.name || 'Unnamed Project',
        status: p.status || 'planning',
        team: p.team || '',
        progress: p.progress || 0,
        deadline: p.deadline || '',
        members: p.members || [],
      }));
      setProjects(list);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeProjects();
    };
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter(u =>
          u.name.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower) ||
          u.role.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchTerm, users]);

  const stats: Stats = {
    totalUsers: users.length,
    onlineUsers: users.filter(u => u.status === 'online').length,
    activeUsers: users.filter(u => u.status === 'active' || u.status === 'online').length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    developers: users.filter(u => u.role === 'developer').length,
    testers: users.filter(u => u.role === 'tester').length,
    inactiveUsers: users.filter(u => u.status === 'offline' || u.status === 'inactive').length,
  };

  const activePercentage = stats.totalUsers
    ? Math.round((stats.activeUsers / stats.totalUsers) * 100)
    : 0;

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'manager': return 'warning';
      case 'developer': return 'primary';
      case 'tester': return 'success';
      default: return 'default';
    }
  };

  const getDisplayStatus = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'online') return 'Active';
    if (s === 'inactive' || s === 'offline') return 'Inactive';
    return status || 'Unknown';
  };

  const getProjectsForUser = (uid: string) =>
    projects.filter(p => Array.isArray(p.members) && p.members.includes(uid));

  const openEditDialog = (user: User) => {
    setEditUser(user);
    setEditDialogOpen(true);
  };

  const handleSaveEditUser = async () => {
    if (!editUser) return;
    try {
      const userRef = ref(rtdb, `users/${editUser.uid}`);
      await set(userRef, {
        email: editUser.email,
        name: editUser.name,
        role: editUser.role,
        status: editUser.status,
        lastLogin: editUser.lastLogin,
        team: editUser.team || '',
        projects: editUser.projects || [],
        password: editUser.password || ''
      });
      setEditDialogOpen(false);
    } catch (e) {
      console.error('Failed to update user', e);
    }
  };

  const handleCreateUser = async () => {
    setCreateError('');
    
    // Validate required fields
    if (!newUser.name?.trim() || !newUser.email?.trim() || !newUser.password?.trim()) {
      setCreateError('Name, email, and password are required');
      return;
    }

    // Check if email already exists
    try {
      const usersRef = ref(rtdb, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const emailExists = Object.values(usersData).some((user: any) => 
          user.email === newUser.email?.trim()
        );
        
        if (emailExists) {
          setCreateError('A user with this email already exists');
          return;
        }
      }

      // Generate unique UID
      const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Create new user
      const userData = {
        uid,
        email: newUser.email.trim(),
        name: newUser.name.trim(),
        role: newUser.role || 'developer',
        status: newUser.status || 'active',
        password: newUser.password.trim(),
        team: newUser.team || '',
        projects: newUser.projects || [],
        createdAt: new Date().toISOString(),
        lastLogin: ''
      };

      await set(ref(rtdb, `users/${uid}`), userData);
      
      // Reset form and close dialog
      setNewUser({
        name: '',
        email: '',
        role: 'developer',
        status: 'active',
        password: '',
        team: '',
        projects: []
      });
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating user:', error);
      setCreateError('Failed to create user. Please try again.');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage users, roles, and access permissions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add User
          </Button>
          <TextField
            size="small"
            placeholder="Search users..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Total Users</Typography>
                <Typography variant="h5">{stats.totalUsers}</Typography>
              </Box>
              <PeopleIcon color="primary" />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Online Now</Typography>
                <Typography variant="h5">{stats.onlineUsers}</Typography>
              </Box>
              <CheckCircleIcon color="success" />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Admins</Typography>
                <Typography variant="h5">{stats.admins}</Typography>
              </Box>
              <AdminPanelSettingsIcon color="error" />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Active Users %</Typography>
                <Typography variant="h5">{activePercentage}%</Typography>
              </Box>
              <TrendingUpIcon color="secondary" />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Role & status breakdown + online/offline bars */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>By Role</Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary={`Admins: ${stats.admins}`}
                  secondary={stats.totalUsers ? `${Math.round((stats.admins / stats.totalUsers) * 100)}% of users` : '—'}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={`Managers: ${stats.managers}`}
                  secondary={stats.totalUsers ? `${Math.round((stats.managers / stats.totalUsers) * 100)}% of users` : '—'}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={`Developers: ${stats.developers}`}
                  secondary={stats.totalUsers ? `${Math.round((stats.developers / stats.totalUsers) * 100)}% of users` : '—'}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={`Testers: ${stats.testers}`}
                  secondary={stats.totalUsers ? `${Math.round((stats.testers / stats.totalUsers) * 100)}% of users` : '—'}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>By Status</Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary={`Online: ${stats.onlineUsers}`}
                  secondary={stats.totalUsers ? `${Math.round((stats.onlineUsers / stats.totalUsers) * 100)}% of users` : '—'}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={`Active: ${stats.activeUsers}`}
                  secondary={stats.totalUsers ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of users` : '—'}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={`Inactive / Offline: ${stats.inactiveUsers}`}
                  secondary={stats.totalUsers ? `${Math.round((stats.inactiveUsers / stats.totalUsers) * 100)}% of users` : '—'}
                />
              </ListItem>
            </List>
            {/* Simple graphical bar for online vs offline */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">Online vs Offline</Typography>
              <Box sx={{ mt: 0.5, height: 10, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: '100%',
                    width: `${stats.totalUsers ? (stats.onlineUsers / stats.totalUsers) * 100 : 0}%`,
                    bgcolor: 'success.main',
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* User table */}
      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>All Users</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Active</TableCell>
                  <TableCell>Projects</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map(user => {
                    const userProjects = getProjectsForUser(user.uid);
                    return (
                    <TableRow key={user.uid} hover sx={{ cursor: 'pointer' }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ bgcolor: getRoleColor(user.role) }}>
                            {user.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">{user.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={user.role} size="small" color={getRoleColor(user.role) as any} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getDisplayStatus(user.status)}
                          size="small"
                          color={user.status.toLowerCase() === 'active' || user.status.toLowerCase() === 'online' ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell>{userProjects.length}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit User">
                          <IconButton size="small" onClick={() => openEditDialog(user)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )})}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredUsers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Box>
      </Paper>

      {/* Detail dialog (read-only) */}
      <Dialog open={!!selectedUser} onClose={() => setSelectedUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: getRoleColor(selectedUser.role) }}>
                  {selectedUser.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">{selectedUser.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{selectedUser.email}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip label={selectedUser.role} size="small" color={getRoleColor(selectedUser.role) as any} />
                <Chip
                  label={selectedUser.status}
                  size="small"
                  color={selectedUser.status === 'active' || selectedUser.status === 'online' ? 'success' : 'default'}
                  variant="outlined"
                />
                <Chip label={selectedUser.team ? `Team: ${selectedUser.team}` : 'No team'} size="small" />
                <Chip label={`Projects: ${selectedUser.projects?.length || 0}`} size="small" />
              </Box>
              <Box>
                <Typography variant="subtitle2">Last Active</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never logged in'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedUser(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          {editUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Name"
                fullWidth
                value={editUser.name}
                onChange={e => setEditUser({ ...editUser, name: e.target.value })}
              />
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={editUser.email}
                onChange={e => setEditUser({ ...editUser, email: e.target.value })}
              />
              <TextField
                select
                label="Role"
                fullWidth
                value={editUser.role}
                onChange={e => setEditUser({ ...editUser, role: e.target.value })}
              >
                <ListItemText primary="Admin" />
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="developer">Developer</MenuItem>
                <MenuItem value="tester">Tester</MenuItem>
                <MenuItem value="user">User</MenuItem>
              </TextField>
              <TextField
                select
                label="Status"
                fullWidth
                value={editUser.status}
                onChange={e => setEditUser({ ...editUser, status: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEditUser}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {createError && (
              <Typography color="error" variant="body2">
                {createError}
              </Typography>
            )}
            <TextField
              label="Name"
              fullWidth
              value={newUser.name || ''}
              onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              required
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={newUser.email || ''}
              onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              required
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={newUser.password || ''}
              onChange={e => setNewUser({ ...newUser, password: e.target.value })}
              required
            />
            <TextField
              select
              label="Role"
              fullWidth
              value={newUser.role || 'developer'}
              onChange={e => setNewUser({ ...newUser, role: e.target.value })}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="manager">Manager</MenuItem>
              <MenuItem value="developer">Developer</MenuItem>
              <MenuItem value="tester">Tester</MenuItem>
            </TextField>
            <TextField
              select
              label="Status"
              fullWidth
              value={newUser.status || 'active'}
              onChange={e => setNewUser({ ...newUser, status: e.target.value })}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
            <TextField
              label="Team (Optional)"
              fullWidth
              value={newUser.team || ''}
              onChange={e => setNewUser({ ...newUser, team: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateUser}>Create User</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUserAnalytics;
