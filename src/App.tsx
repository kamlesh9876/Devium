import React from 'react';
import { ThemeProvider, CssBaseline, CircularProgress, Box, Typography } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ActivityAnalyticsProvider } from './contexts/ActivityAnalyticsContext';
import { ErrorMonitoringProvider } from './contexts/ErrorMonitoringContext';
import { CollaborationProvider } from './contexts/CollaborationContext';
import { DataSyncProvider } from './contexts/DataSyncContext';
import { SecurityMonitoringProvider } from './contexts/SecurityMonitoringContext';
import { ChatProvider } from './contexts/ChatContext';
import { NotificationToast } from './components/Notifications';
import { LiveCursorOverlay, TypingIndicator, CollaborationPanel } from './components/LiveCursors';
import ChatSidebar from './components/Chat/ChatSidebar';
import { rtdb } from './firebase';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import WorkInProgress from './pages/WorkInProgress';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import AdminAnalytics from './pages/dashboards/AdminAnalytics';
import AdminUserAnalytics from './pages/dashboards/AdminUserAnalytics';
import UserAnalytics from './pages/dashboards/UserAnalytics';
import ManagerManagement from './pages/dashboards/ManagerDashboard';
import SystemHealth from './pages/dashboards/SystemHealth';
import SecurityAudit from './pages/dashboards/SecurityAudit';
import UserActivityMonitor from './pages/dashboards/UserActivityMonitor';
import BulkUserOperations from './pages/dashboards/BulkUserOperations';
import FeatureFlags from './pages/dashboards/FeatureFlags';
import ErrorLogs from './pages/dashboards/ErrorLogs';
import Family from './pages/Team';
import Projects from './pages/Projects';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#90caf9' },
    secondary: { main: '#f48fb1' }
  }
});

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles = [] }: ProtectedRouteProps) => {
  const { user, loading, role } = useAuth();
  console.log('ProtectedRoute - User:', user);
  console.log('ProtectedRoute - Role:', role);
  console.log('ProtectedRoute - Loading:', loading);
  console.log('ProtectedRoute - Allowed Roles:', allowedRoles);
  
  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <CircularProgress />
      <Typography variant="h6" sx={{ mt: 2 }}>Loading...</Typography>
    </Box>
  );
  
  if (!user) return <Navigate to="/login" />;
  
  // Check role-based access if allowedRoles is specified and not empty
  if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">Access Denied</Typography>
        <Typography>Current Role: <strong>{role || 'None'}</strong></Typography>
        <Typography>Required Roles: <strong>{allowedRoles.join(', ')}</strong></Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          You don't have permission to access this page.
        </Typography>
      </Box>
    );
  }
  
  return <>{children}</>;
};



const DashboardRouter = () => {
  const { role, user } = useAuth();
  console.log('DashboardRouter - Role:', role);
  console.log('DashboardRouter - User:', user);
  
  switch (role) {
    case 'admin': return <AdminDashboard />;
    case 'manager': return <ManagerManagement />;
    case 'developer': 
    case 'tester': return <WorkInProgress />;
    default: return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">Access Denied</Typography>
        <Typography>Current Role: <strong>{role || 'None'}</strong></Typography>
        <Typography>User ID: <strong>{user?.uid}</strong></Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Please ensure your user ID in Firebase Realtime Database has a "role" field set to one of:
          admin, manager, developer, tester.
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          Path: users/&#123;uid&#125;/role
        </Typography>
        <Typography variant="caption" display="block">
          Database URL: {rtdb.app.options.databaseURL || 'Default'}
        </Typography>
      </Box>
    );
  }
};

// Authenticated Chat Sidebar Component
function AuthenticatedChatSidebar() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  return (
    <ChatSidebar
      userId={user.uid}
      userName={user.email || 'User'}
      userEmail={user.email || 'user@example.com'}
    />
  );
}

function App() {
  const { user } = useAuth();
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SecurityMonitoringProvider>
        <DataSyncProvider>
          <CollaborationProvider>
            <ErrorMonitoringProvider>
              <ActivityAnalyticsProvider>
                <NotificationProvider>
                  <AuthProvider>
                    <ChatProvider>
                      <Router>
                        <Routes>
                          <Route path="/login" element={<Login />} />
                          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                            <Route index element={<DashboardRouter />} />
                            <Route path="analytics" element={<ProtectedRoute allowedRoles={['manager', 'admin']}><UserAnalytics /></ProtectedRoute>} />
                            <Route path="admin-analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
                            <Route path="admin-users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUserAnalytics /></ProtectedRoute>} />
                            <Route path="system-health" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><SystemHealth /></ProtectedRoute>} />
                            <Route path="security-audit" element={<ProtectedRoute allowedRoles={['admin']}><SecurityAudit /></ProtectedRoute>} />
                            <Route path="user-activity" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><UserActivityMonitor /></ProtectedRoute>} />
                            <Route path="bulk-operations" element={<ProtectedRoute allowedRoles={['admin']}><BulkUserOperations /></ProtectedRoute>} />
                            <Route path="feature-flags" element={<ProtectedRoute allowedRoles={['admin']}><FeatureFlags /></ProtectedRoute>} />
                            <Route path="error-logs" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ErrorLogs /></ProtectedRoute>} />
                            <Route path="wip" element={<WorkInProgress />} />
                            <Route path="family" element={<Family />} />
                            <Route path="team" element={<Navigate to="/family" replace />} />
                            <Route path="projects" element={<Projects />} />
                            <Route path="bugs" element={<div>Bugs Page (Coming Soon)</div>} />
                          </Route>
                        </Routes>
                      </Router>
                      <NotificationToast />
                      <LiveCursorOverlay />
                      <TypingIndicator />
                      <CollaborationPanel />
                      <AuthenticatedChatSidebar />
                    </ChatProvider>
                  </AuthProvider>
                </NotificationProvider>
              </ActivityAnalyticsProvider>
            </ErrorMonitoringProvider>
          </CollaborationProvider>
        </DataSyncProvider>
      </SecurityMonitoringProvider>
    </ThemeProvider>
  );
}

export default App;
