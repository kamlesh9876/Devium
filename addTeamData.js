import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get } from 'firebase/database';

// Your Firebase config (from .env file)
const firebaseConfig = {
    apiKey: 'AIzaSyCp1CCrgCpyTsCaELhU6y8cyTkVgFP4_fc',
    authDomain: 'devium-4d44c.firebaseapp.com',
    projectId: 'devium-4d44c',
    storageBucket: 'devium-4d44c.firebasestorage.app',
    messagingSenderId: '47305189323',
    appId: '1:47305189323:web:a2c9e128c70486aabe384e',
    measurementId: 'G-LDXSYDKT2X',
    databaseURL: 'https://devium-4d44c-default-rtdb.firebaseio.com'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);

// Team members data
const teamMembers = [
    {
        id: 1,
        name: "John Doe",
        role: "Lead Developer",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
        bio: "Full-stack developer with expertise in React, Node.js, and cloud architecture. Passionate about building scalable solutions.",
        skills: ["React", "Node.js", "TypeScript", "AWS", "Firebase"],
        social: {
            github: "https://github.com/johndoe",
            linkedin: "https://linkedin.com/in/johndoe",
            twitter: "https://twitter.com/johndoe",
            email: "john@devium.com"
        }
    },
    {
        id: 2,
        name: "Jane Smith",
        role: "UI/UX Designer",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
        bio: "Creative designer focused on user experience and modern interface design. Specialized in Material Design and responsive layouts.",
        skills: ["UI Design", "UX Research", "Figma", "Material-UI", "Prototyping"],
        social: {
            github: "https://github.com/janesmith",
            linkedin: "https://linkedin.com/in/janesmith",
            email: "jane@devium.com"
        }
    },
    {
        id: 3,
        name: "Mike Johnson",
        role: "Backend Developer",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
        bio: "Backend specialist with strong knowledge of APIs, databases, and system architecture. Experienced in Python and FastAPI.",
        skills: ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"],
        social: {
            github: "https://github.com/mikejohnson",
            linkedin: "https://linkedin.com/in/mikejohnson",
            email: "mike@devium.com"
        }
    },
    {
        id: 4,
        name: "Sarah Williams",
        role: "DevOps Engineer",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        bio: "DevOps expert focused on CI/CD pipelines, containerization, and cloud infrastructure. Ensuring smooth deployment processes.",
        skills: ["Docker", "Kubernetes", "CI/CD", "AWS", "Terraform"],
        social: {
            github: "https://github.com/sarahwilliams",
            linkedin: "https://linkedin.com/in/sarahwilliams",
            email: "sarah@devium.com"
        }
    },
    {
        id: 5,
        name: "David Brown",
        role: "Mobile Developer",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
        bio: "Mobile app developer with experience in React Native and Flutter. Creating seamless cross-platform mobile experiences.",
        skills: ["React Native", "Flutter", "iOS", "Android", "Firebase"],
        social: {
            github: "https://github.com/davidbrown",
            linkedin: "https://linkedin.com/in/davidbrown",
            email: "david@devium.com"
        }
    },
    {
        id: 6,
        name: "Emily Davis",
        role: "QA Engineer",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
        bio: "Quality assurance specialist focused on automated testing and ensuring product reliability. Experienced in various testing frameworks.",
        skills: ["Jest", "Cypress", "Selenium", "Test Planning", "Agile"],
        social: {
            github: "https://github.com/emilydavis",
            linkedin: "https://linkedin.com/in/emilydavis",
            email: "emily@devium.com"
        }
    }
];

// Add team members to Firebase
async function addTeamMembersToFirebase() {
    try {
        console.log('🚀 Adding members to Firebase...');
        
        // Add each team member
        for (const member of teamMembers) {
            const memberRef = ref(rtdb, `members/${member.id}`);
            await set(memberRef, {
                ...member,
                createdAt: new Date().toISOString(),
                isActive: true
            });
            console.log(`✅ Added member: ${member.name} (${member.role})`);
        }
        
        console.log('🎉 All members added successfully!');
        console.log('📍 Data stored at: /members/ in Firebase Realtime Database');
        
        // Verify the data was added
        console.log('\n🔍 Verifying data...');
        const membersRef = ref(rtdb, 'members');
        const snapshot = await get(membersRef);
        
        if (snapshot.exists()) {
            const membersData = snapshot.val();
            console.log(`✅ Found ${Object.keys(membersData).length} members in database`);
            Object.values(membersData).forEach((member) => {
                console.log(`   - ${member.name}: ${member.role}`);
            });
        } else {
            console.log('❌ No members data found');
        }
        
    } catch (error) {
        console.error('❌ Error adding members:', error);
    }
}

// Update an existing user to be admin for testing
async function updateTestUser() {
    const userId = 'zIbIQaZBzrZ4ucizkm4IIoNWomZ2'; // The user ID from previous error message
    
    try {
        const userRef = ref(rtdb, `users/${userId}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            const updatedData = {
                ...userData,
                role: 'admin',
                status: 'active',
                updatedAt: new Date().toISOString()
            };
            
            await set(userRef, updatedData);
            console.log('✅ Test user updated to admin for team page access');
        } else {
            console.log('❌ Test user not found');
        }
    } catch (error) {
        console.error('❌ Error updating test user:', error);
    }
}

// Run both functions
async function setupTeamData() {
    await addTeamMembersToFirebase();
    await updateTestUser();
}

setupTeamData();
