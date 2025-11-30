import { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Alert } from '@mui/material';
import { ref, get, set } from 'firebase/database';
import { rtdb } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            console.log('Attempting login with email:', email);
            
            // Step 1: Query users from Realtime Database
            const usersRef = ref(rtdb, 'users');
            const snapshot = await get(usersRef);

            if (!snapshot.exists()) {
                console.log('No users found in database');
                setError('No users found in the system.');
                setLoading(false);
                return;
            }

            const users = snapshot.val();
            console.log('All users in database:', users);
            let foundUser: any = null;
            let userId: string = '';

            // Step 2: Find user by email
            console.log('Searching for user with email:', email);
            Object.entries(users).forEach(([uid, userData]: [string, any]) => {
                console.log('Checking user:', uid, userData.email);
                if (userData.email === email) {
                    foundUser = userData;
                    userId = uid;
                    console.log('Found matching user:', uid);
                }
            });

            if (!foundUser) {
                console.log('User not found with email:', email);
                setError('Invalid email or password.');
                setLoading(false);
                return;
            }

            console.log('User found:', foundUser);

            // Step 3: Check password
            if (foundUser.password !== password) {
                console.log('Password mismatch');
                setError('Invalid email or password.');
                setLoading(false);
                return;
            }

            // Step 4: Check if user has valid role
            const validRoles = ['admin', 'manager', 'developer', 'tester'];
            if (!foundUser.role || !validRoles.includes(foundUser.role)) {
                console.log('Invalid role:', foundUser.role);
                setError(`Invalid user role: ${foundUser.role}. Please contact administrator.`);
                setLoading(false);
                return;
            }

            // Step 5: Check if user account is active
            if (foundUser.status === 'suspended') {
                console.log('Account is suspended');
                setError('Your account is suspended. Please contact an administrator.');
                setLoading(false);
                return;
            }

            // Step 6: Update login time and status
            console.log('All validations passed, updating login time...');
            const updatedData = {
                ...foundUser,
                status: 'active',
                lastLogin: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await set(ref(rtdb, `users/${userId}`), updatedData);
            
            // Step 7: Store session and redirect
            console.log('Login successful, storing session...');
            localStorage.setItem('devium_user', JSON.stringify({
                uid: userId,
                email: foundUser.email,
                name: foundUser.name,
                role: foundUser.role
            }));

            console.log('Session stored, navigating to dashboard...');
            setLoading(false);
            navigate('/');
        } catch (err: any) {
            console.log('Login error:', err);
            setError('An error occurred during login. Please try again.');
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xs">
            <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">
                    Devium Login
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Enter your credentials to access the system
                </Typography>
                {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
                <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Email Address"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </Button>
                </Box>
            </Box>
        </Container>
    );
}
