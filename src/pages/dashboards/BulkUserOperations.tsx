import React, { useState, useRef } from 'react';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
    Stepper,
    Step,
    StepLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import {
    Upload as UploadIcon,
    Download as DownloadIcon,
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Group as GroupIcon,
    PersonAdd as PersonAddIcon,
    PersonRemove as PersonRemoveIcon,
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { ref, set, remove, get, update } from 'firebase/database';
import { rtdb } from '../../firebase';
import * as XLSX from 'xlsx';

interface BulkUser {
    name: string;
    email: string;
    role: string;
    status: string;
    team?: string;
    projects?: string[];
}

interface BulkOperation {
    type: 'create' | 'update' | 'delete';
    users: BulkUser[];
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress: number;
    results: Array<{ user: BulkUser; success: boolean; message?: string }>;
}

const BulkUserOperations: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [operationType, setOperationType] = useState<'create' | 'update' | 'delete'>('create');
    const [users, setUsers] = useState<BulkUser[]>([]);
    const [currentOperation, setCurrentOperation] = useState<BulkOperation | null>(null);
    const [previewData, setPreviewData] = useState<BulkUser[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [success, setSuccess] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const steps = ['Select Operation', 'Upload/Configure', 'Preview & Validate', 'Execute Operation', 'Results'];

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

                const parsedUsers: BulkUser[] = jsonData.map(row => ({
                    name: row.name || '',
                    email: row.email || '',
                    role: row.role || 'user',
                    status: row.status || 'active',
                    team: row.team || '',
                    projects: row.projects ? (row.projects as string).split(',').map((p: string) => p.trim()) : []
                }));

                setUsers(parsedUsers);
                setPreviewData(parsedUsers.slice(0, 5));
                validateUsers(parsedUsers);
                setActiveStep(2);
            } catch (error) {
                setErrors(['Failed to parse file. Please ensure it\'s a valid Excel/CSV file.']);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const validateUsers = (usersToValidate: BulkUser[]) => {
        const validationErrors: string[] = [];
        
        usersToValidate.forEach((user, index) => {
            if (!user.name.trim()) {
                validationErrors.push(`Row ${index + 1}: Name is required`);
            }
            if (!user.email.trim()) {
                validationErrors.push(`Row ${index + 1}: Email is required`);
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
                validationErrors.push(`Row ${index + 1}: Invalid email format`);
            }
            if (!['admin', 'manager', 'developer', 'tester', 'user'].includes(user.role)) {
                validationErrors.push(`Row ${index + 1}: Invalid role`);
            }
            if (!['active', 'inactive', 'suspended'].includes(user.status)) {
                validationErrors.push(`Row ${index + 1}: Invalid status`);
            }
        });

        setErrors(validationErrors);
        return validationErrors.length === 0;
    };

    const handleCreateUsers = async () => {
        if (!validateUsers(users)) return;

        const operation: BulkOperation = {
            type: 'create',
            users,
            status: 'processing',
            progress: 0,
            results: []
        };

        setCurrentOperation(operation);
        setActiveStep(3);

        try {
            const results = [];
            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                
                try {
                    // Check if user already exists
                    const usersRef = ref(rtdb, 'users');
                    const snapshot = await get(usersRef);
                    const existingUsers = snapshot.val() || {};
                    
                    const userExists = Object.values(existingUsers).some((existingUser: any) => 
                        existingUser.email === user.email
                    );

                    if (userExists) {
                        results.push({
                            user,
                            success: false,
                            message: 'User with this email already exists'
                        });
                    } else {
                        // Create new user
                        const newUserRef = ref(rtdb, `users/${Date.now()}_${i}`);
                        await set(newUserRef, {
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            status: user.status,
                            team: user.team || '',
                            projects: user.projects || [],
                            device: '',
                            lastLogin: '',
                            createdAt: new Date().toISOString()
                        });

                        results.push({
                            user,
                            success: true,
                            message: 'User created successfully'
                        });
                    }
                } catch (error) {
                    results.push({
                        user,
                        success: false,
                        message: 'Failed to create user'
                    });
                }

                // Update progress
                operation.progress = ((i + 1) / users.length) * 100;
                operation.results = results;
                setCurrentOperation({ ...operation });
            }

            operation.status = 'completed';
            setCurrentOperation({ ...operation });
            setActiveStep(4);
            
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            
            if (errorCount === 0) {
                setSuccess([`Successfully created ${successCount} users`]);
            } else {
                setErrors([`Created ${successCount} users, ${errorCount} failed`]);
            }

        } catch (error) {
            operation.status = 'error';
            setCurrentOperation({ ...operation });
            setErrors(['Operation failed due to server error']);
        }
    };

    const handleUpdateUsers = async () => {
        if (!validateUsers(users)) return;

        const operation: BulkOperation = {
            type: 'update',
            users,
            status: 'processing',
            progress: 0,
            results: []
        };

        setCurrentOperation(operation);
        setActiveStep(3);

        try {
            const results = [];
            const usersRef = ref(rtdb, 'users');
            const snapshot = await get(usersRef);
            const existingUsers = snapshot.val() || {};

            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                
                try {
                    // Find user by email
                    const userKey = Object.keys(existingUsers).find(key => 
                        existingUsers[key].email === user.email
                    );

                    if (!userKey) {
                        results.push({
                            user,
                            success: false,
                            message: 'User not found'
                        });
                    } else {
                        // Update user
                        await update(ref(rtdb, `users/${userKey}`), {
                            name: user.name,
                            role: user.role,
                            status: user.status,
                            team: user.team || existingUsers[userKey].team,
                            projects: user.projects || existingUsers[userKey].projects,
                            updatedAt: new Date().toISOString()
                        });

                        results.push({
                            user,
                            success: true,
                            message: 'User updated successfully'
                        });
                    }
                } catch (error) {
                    results.push({
                        user,
                        success: false,
                        message: 'Failed to update user'
                    });
                }

                // Update progress
                operation.progress = ((i + 1) / users.length) * 100;
                operation.results = results;
                setCurrentOperation({ ...operation });
            }

            operation.status = 'completed';
            setCurrentOperation({ ...operation });
            setActiveStep(4);
            
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            
            if (errorCount === 0) {
                setSuccess([`Successfully updated ${successCount} users`]);
            } else {
                setErrors([`Updated ${successCount} users, ${errorCount} failed`]);
            }

        } catch (error) {
            operation.status = 'error';
            setCurrentOperation({ ...operation });
            setErrors(['Operation failed due to server error']);
        }
    };

    const handleDeleteUsers = async () => {
        const operation: BulkOperation = {
            type: 'delete',
            users,
            status: 'processing',
            progress: 0,
            results: []
        };

        setCurrentOperation(operation);
        setActiveStep(3);

        try {
            const results = [];
            const usersRef = ref(rtdb, 'users');
            const snapshot = await get(usersRef);
            const existingUsers = snapshot.val() || {};

            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                
                try {
                    // Find user by email
                    const userKey = Object.keys(existingUsers).find(key => 
                        existingUsers[key].email === user.email
                    );

                    if (!userKey) {
                        results.push({
                            user,
                            success: false,
                            message: 'User not found'
                        });
                    } else {
                        // Delete user
                        await remove(ref(rtdb, `users/${userKey}`));

                        results.push({
                            user,
                            success: true,
                            message: 'User deleted successfully'
                        });
                    }
                } catch (error) {
                    results.push({
                        user,
                        success: false,
                        message: 'Failed to delete user'
                    });
                }

                // Update progress
                operation.progress = ((i + 1) / users.length) * 100;
                operation.results = results;
                setCurrentOperation({ ...operation });
            }

            operation.status = 'completed';
            setCurrentOperation({ ...operation });
            setActiveStep(4);
            
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            
            if (errorCount === 0) {
                setSuccess([`Successfully deleted ${successCount} users`]);
            } else {
                setErrors([`Deleted ${successCount} users, ${errorCount} failed`]);
            }

        } catch (error) {
            operation.status = 'error';
            setCurrentOperation({ ...operation });
            setErrors(['Operation failed due to server error']);
        }
    };

    const executeOperation = () => {
        switch (operationType) {
            case 'create':
                handleCreateUsers();
                break;
            case 'update':
                handleUpdateUsers();
                break;
            case 'delete':
                handleDeleteUsers();
                break;
        }
    };

    const downloadTemplate = () => {
        const template = [
            {
                name: 'John Doe',
                email: 'john@example.com',
                role: 'developer',
                status: 'active',
                team: 'Team A',
                projects: 'project1, project2'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'bulk_users_template.xlsx');
    };

    const exportCurrentUsers = async () => {
        try {
            const usersRef = ref(rtdb, 'users');
            const snapshot = await get(usersRef);
            const usersData = snapshot.val() || {};

            const exportData = Object.entries(usersData).map(([key, user]: [string, any]) => ({
                name: user.name || '',
                email: user.email || '',
                role: user.role || '',
                status: user.status || '',
                team: user.team || '',
                projects: (user.projects || []).join(', ')
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Users');
            XLSX.writeFile(wb, 'users_export.xlsx');
        } catch (error) {
            setErrors(['Failed to export users']);
        }
    };

    const resetOperation = () => {
        setActiveStep(0);
        setUsers([]);
        setCurrentOperation(null);
        setPreviewData([]);
        setErrors([]);
        setSuccess([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Bulk User Operations
            </Typography>

            {/* Stepper */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Stepper activeStep={activeStep} alternativeLabel>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>
            </Paper>

            {/* Errors and Success Messages */}
            {errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {errors.map((error, index) => (
                        <div key={index}>{error}</div>
                    ))}
                </Alert>
            )}

            {success.length > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success.map((message, index) => (
                        <div key={index}>{message}</div>
                    ))}
                </Alert>
            )}

            {/* Step Content */}
            {activeStep === 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Select Operation Type
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <Card 
                                sx={{ cursor: 'pointer', border: operationType === 'create' ? 2 : 1, borderColor: operationType === 'create' ? 'primary.main' : 'grey.300' }}
                                onClick={() => setOperationType('create')}
                            >
                                <CardContent>
                                    <PersonAddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                                    <Typography variant="h6">Create Users</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Add multiple new users to the system
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card 
                                sx={{ cursor: 'pointer', border: operationType === 'update' ? 2 : 1, borderColor: operationType === 'update' ? 'primary.main' : 'grey.300' }}
                                onClick={() => setOperationType('update')}
                            >
                                <CardContent>
                                    <EditIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                                    <Typography variant="h6">Update Users</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Update existing user information
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card 
                                sx={{ cursor: 'pointer', border: operationType === 'delete' ? 2 : 1, borderColor: operationType === 'delete' ? 'error.main' : 'grey.300' }}
                                onClick={() => setOperationType('delete')}
                            >
                                <CardContent>
                                    <PersonRemoveIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                                    <Typography variant="h6">Delete Users</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Remove multiple users from the system
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                        <Button variant="outlined" onClick={downloadTemplate} startIcon={<DownloadIcon />}>
                            Download Template
                        </Button>
                        <Button variant="outlined" onClick={exportCurrentUsers} startIcon={<DownloadIcon />}>
                            Export Current Users
                        </Button>
                    </Box>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" onClick={() => setActiveStep(1)}>
                            Next
                        </Button>
                    </Box>
                </Paper>
            )}

            {activeStep === 1 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Upload User Data
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Upload an Excel or CSV file with user information. The file should contain columns for name, email, role, status, team, and projects.
                    </Typography>
                    
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        id="file-upload"
                    />
                    <label htmlFor="file-upload">
                        <Button
                            variant="contained"
                            component="span"
                            startIcon={<UploadIcon />}
                            fullWidth
                            sx={{ py: 3, border: '2px dashed', borderColor: 'primary.main' }}
                        >
                            Click to Upload File
                        </Button>
                    </label>

                    <Accordion sx={{ mt: 3 }}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>File Format Requirements</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography variant="body2" component="div">
                                <p><strong>Required Columns:</strong></p>
                                <ul>
                                    <li>name: User's full name</li>
                                    <li>email: User's email address (must be unique)</li>
                                    <li>role: admin, manager, developer, tester, or user</li>
                                    <li>status: active, inactive, or suspended</li>
                                </ul>
                                <p><strong>Optional Columns:</strong></p>
                                <ul>
                                    <li>team: Team name or ID</li>
                                    <li>projects: Comma-separated list of project IDs</li>
                                </ul>
                            </Typography>
                        </AccordionDetails>
                    </Accordion>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                        <Button onClick={() => setActiveStep(0)}>
                            Back
                        </Button>
                    </Box>
                </Paper>
            )}

            {activeStep === 2 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Preview & Validate
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Found {users.length} users in the uploaded file. Showing first 5:
                    </Typography>

                    <TableContainer sx={{ mb: 3 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Team</TableCell>
                                    <TableCell>Projects</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {previewData.map((user, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Chip label={user.role} size="small" />
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={user.status} 
                                                size="small" 
                                                color={user.status === 'active' ? 'success' : user.status === 'suspended' ? 'error' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>{user.team || '-'}</TableCell>
                                        <TableCell>{user.projects?.join(', ') || '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button onClick={() => setActiveStep(1)}>
                            Back
                        </Button>
                        <Button 
                            variant="contained" 
                            onClick={executeOperation}
                            disabled={errors.length > 0}
                        >
                            Execute {operationType === 'create' ? 'Creation' : operationType === 'update' ? 'Update' : 'Deletion'}
                        </Button>
                    </Box>
                </Paper>
            )}

            {activeStep === 3 && currentOperation && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Executing Operation...
                    </Typography>
                    
                    <LinearProgress 
                        variant="determinate" 
                        value={currentOperation.progress} 
                        sx={{ mb: 2 }}
                    />
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Progress: {Math.round(currentOperation.progress)}% ({currentOperation.results.length} / {currentOperation.users.length})
                    </Typography>

                    {currentOperation.results.slice(-5).map((result, index) => (
                        <Alert 
                            key={index} 
                            severity={result.success ? 'success' : 'error'} 
                            sx={{ mb: 1 }}
                        >
                            {result.user.email}: {result.message}
                        </Alert>
                    ))}
                </Paper>
            )}

            {activeStep === 4 && currentOperation && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Operation Results
                    </Typography>
                    
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                                    <Typography variant="h4" color="success.main">
                                        {currentOperation.results.filter(r => r.success).length}
                                    </Typography>
                                    <Typography variant="body2">
                                        Successful
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <ErrorIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                                    <Typography variant="h4" color="error.main">
                                        {currentOperation.results.filter(r => !r.success).length}
                                    </Typography>
                                    <Typography variant="body2">
                                        Failed
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <GroupIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                                    <Typography variant="h4" color="info.main">
                                        {currentOperation.results.length}
                                    </Typography>
                                    <Typography variant="body2">
                                        Total Processed
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    <Typography variant="h6" gutterBottom>
                        Detailed Results
                    </Typography>
                    
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Message</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {currentOperation.results.map((result, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="body2">
                                                    {result.user.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {result.user.email}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={result.success ? <CheckCircleIcon /> : <ErrorIcon />}
                                                label={result.success ? 'Success' : 'Failed'}
                                                color={result.success ? 'success' : 'error'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2">
                                                {result.message}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" onClick={resetOperation}>
                            New Operation
                        </Button>
                    </Box>
                </Paper>
            )}
        </Box>
    );
};

export default BulkUserOperations;
