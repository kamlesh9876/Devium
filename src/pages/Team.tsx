// Family page component - displays family members from Firebase users collection
import { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Avatar,
    Chip,
    Paper,
    CircularProgress
} from '@mui/material';
import {
    GitHub as GitHubIcon,
    LinkedIn as LinkedInIcon,
    Twitter as TwitterIcon,
    Email as EmailIcon
} from '@mui/icons-material';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase';

interface FamilyMember {
    id?: string;
    uid?: string;
    name: string;
    role: string;
    avatar?: string;
    bio?: string;
    skills?: string[];
    social?: {
        github?: string;
        linkedin?: string;
        twitter?: string;
        email?: string;
    };
    createdAt?: string;
    isActive?: boolean;
    email?: string;
    status?: string;
}

export default function Family() {
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('🔍 Family component: Setting up Firebase listener for /users');
        const usersRef = ref(rtdb, 'users');
        
        const unsubscribe = onValue(usersRef, (snapshot) => {
            console.log('📥 Family component: Received data from Firebase');
            const data = snapshot.val();
            console.log('📊 Raw data from Firebase:', data);
            
            if (data) {
                const users = Object.values(data) as any[];
                console.log('👥 Processed users:', users);
                
                // Filter users that have family member properties and are active
                const familyMembers = users.filter(user => 
                    user.isActive !== false && 
                    user.name && 
                    user.role && 
                    user.role !== 'user' // Exclude regular users, show only team roles
                );
                console.log('✅ Family members:', familyMembers);
                setFamilyMembers(familyMembers);
            } else {
                console.log('❌ No data found in Firebase at /users');
                setFamilyMembers([]);
            }
            setLoading(false);
        }, (error) => {
            console.error('❌ Error fetching users data:', error);
            setLoading(false);
        });

        return () => {
            console.log('🔌 Family component: Cleaning up Firebase listener');
            unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 6 }}>
                {/* Header Section */}
                <Box sx={{ textAlign: 'center', mb: 6 }}>
                    <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        Our Family
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                        Meet the talented people behind Devium
                    </Typography>
                    <Paper sx={{ p: 3, mb: 4, backgroundColor: 'background.default' }}>
                        <Typography variant="body1" sx={{ textAlign: 'center' }}>
                            We are a diverse family of passionate developers, designers, and engineers 
                            working together to build innovative solutions that make a difference.
                        </Typography>
                    </Paper>
                </Box>

                {/* Family Grid */}
                <Grid container spacing={4}>
                    {familyMembers.map((member) => (
                        <Grid item xs={12} sm={6} md={4} key={member.uid || member.id || Math.random()}>
                            <Card 
                                sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 4
                                    }
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                                    {/* Avatar */}
                                    <Avatar
                                        src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                                        alt={member.name}
                                        sx={{ 
                                            width: 120, 
                                            height: 120, 
                                            mx: 'auto', 
                                            mb: 2,
                                            border: '3px solid',
                                            borderColor: 'primary.main'
                                        }}
                                    />
                                    
                                    {/* Name and Role */}
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        {member.name}
                                    </Typography>
                                    <Typography variant="body2" color="primary" sx={{ mb: 2, fontWeight: 'medium' }}>
                                        {member.role}
                                    </Typography>
                                    
                                    {/* Bio */}
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                        {member.bio || `${member.role} at Devium. Passionate about building great products.`}
                                    </Typography>
                                    
                                    {/* Skills */}
                                    <Box sx={{ mb: 3 }}>
                                        {(member.skills || []).slice(0, 3).map((skill, index) => (
                                            <Chip
                                                key={index}
                                                label={skill}
                                                size="small"
                                                variant="outlined"
                                                sx={{ mr: 0.5, mb: 0.5 }}
                                            />
                                        ))}
                                        {(member.skills || []).length > 3 && (
                                            <Chip
                                                label={`+${(member.skills || []).length - 3} more`}
                                                size="small"
                                                variant="outlined"
                                                sx={{ mr: 0.5, mb: 0.5 }}
                                            />
                                        )}
                                        {(!member.skills || member.skills.length === 0) && (
                                            <Chip
                                                label={member.role}
                                                size="small"
                                                variant="outlined"
                                                sx={{ mr: 0.5, mb: 0.5 }}
                                            />
                                        )}
                                    </Box>
                                    
                                    {/* Social Links */}
                                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                        {member.social?.github && (
                                            <Box
                                                component="a"
                                                href={member.social.github}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    '&:hover': { color: 'primary.main' }
                                                }}
                                            >
                                                <GitHubIcon />
                                            </Box>
                                        )}
                                        {member.social?.linkedin && (
                                            <Box
                                                component="a"
                                                href={member.social.linkedin}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    '&:hover': { color: 'primary.main' }
                                                }}
                                            >
                                                <LinkedInIcon />
                                            </Box>
                                        )}
                                        {member.social?.twitter && (
                                            <Box
                                                component="a"
                                                href={member.social.twitter}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    '&:hover': { color: 'primary.main' }
                                                }}
                                            >
                                                <TwitterIcon />
                                            </Box>
                                        )}
                                        {member.email && (
                                            <Box
                                                component="a"
                                                href={`mailto:${member.email}`}
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    '&:hover': { color: 'primary.main' }
                                                }}
                                            >
                                                <EmailIcon />
                                            </Box>
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Empty State */}
                {familyMembers.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            No family members found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Users data will appear here once available in Firebase
                        </Typography>
                    </Box>
                )}

                {/* Join Us Section */}
                <Paper sx={{ mt: 6, p: 4, textAlign: 'center', backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                        Want to Join Our Family?
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                        We're always looking for talented individuals to help us build amazing products.
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        Check our careers page or send us your resume at careers@devium.com
                    </Typography>
                </Paper>
            </Box>
        </Container>
    );
}
