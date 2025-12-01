# Devium Team Ecosystem

A comprehensive team collaboration ecosystem built with React, TypeScript, and Vite. Devium enables multiple teams to form, collaborate, and manage multiple projects simultaneously with role-based access control.

[**📖 Read the Full Documentation**](./DOCUMENTATION.md)

## Features
- **Team Formation**: Create and manage multiple teams with custom members
- **Multi-Project Management**: Handle multiple projects across different teams simultaneously
- **Role-Based Access**: Admin, Manager, Developer, and Tester roles with specific permissions
- **Real-time Collaboration**: Live updates and notifications for team activities
- **Project Analytics**: Track progress, performance, and team productivity with charts
- **Resource Management**: Excel export for project data and team reports
- **Modern UI**: Built with Material UI (MUI) components
- **Real-time Data**: Firebase integration for authentication and database
- **Data Visualization**: Chart.js, Recharts for analytics and dashboards
- **File Management**: Excel export capabilities with XLSX
- **Fast Build**: Powered by Vite with hot module replacement
- **Type Safety**: Fully typed with TypeScript
- **Routing**: Client-side routing with React Router DOM

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Material UI (MUI) v5
- **Database**: Firebase (Authentication, Firestore)
- **Charts**: Chart.js, Recharts, React-ChartJS-2
- **State Management**: React Query (TanStack Query)
- **File Processing**: XLSX, File-Saver

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Development
Start the development server:
```bash
npm run dev
```

### Build
Build for production:
```bash
npm run build
```

## Project Structure
- `src/components`: Reusable UI components and layouts
- `src/pages`: Page components (19 pages including dashboard, admin, auth)
- `src/contexts`: React contexts for state management
- `src/config`: Configuration files and constants
- `src/layouts`: Layout components for different page structures
- `src/firebase.ts`: Firebase configuration and initialization
- `dist/`: Production build output
- `public/`: Static assets (sounds, favicon, logo)

## Configuration
To use Firebase features, create a `.env` file in the root directory with your Firebase config keys:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

## Available Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint for code quality
```

## Local Network Access

### Option 1: Access on Same WiFi Network
1. **Find your local IP address:**
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., `192.168.7.6`)

2. **Access from any device on same WiFi:**
   ```
   http://YOUR_IP_ADDRESS:5173
   ```
   Example: `http://192.168.7.6:5173`

3. **Test on mobile devices** connected to your WiFi

### Option 2: Internet Access (Tunneling)
If you need to access from outside your local network:

```bash
# Option A: Using localtunnel
npm install -g localtunnel
npx localtunnel --port 5173

# Option B: Using tunnelmole
npm install -g tunnelmole
npx tunnelmole 5173

# Option C: Using ngrok
npm install -g ngrok
ngrok http 5173
```

### Option 3: Quick Testing
Test on different browsers on the same computer:
- Chrome: `http://localhost:5173`
- Firefox: `http://localhost:5173`
- Edge: `http://localhost:5173`

## Firebase Setup
The project includes several utility scripts for Firebase management:
- `testFirebase.js` - Test Firebase connection
- `addTeamData.js` - Add initial team data
- `addUserRole.js` - Assign user roles
- `createDummyAdmin.js` - Create admin user
- `updateUserRole.js` - Update existing user roles

## Team Ecosystem Structure

### User Roles
- **Admin**: System-wide access, manage all teams and projects
- **Manager**: Create and manage teams, assign projects, oversee team performance
- **Developer**: Work on assigned projects, collaborate with team members
- **Tester**: Quality assurance, testing features, bug reporting

### Team Organization
- Multiple teams can be created and managed simultaneously
- Each team can handle multiple projects
- Cross-team collaboration support
- Hierarchical permissions and access control

### Project Management
- Unlimited project creation and management
- Project assignment to specific teams
- Progress tracking and analytics
- Resource allocation and monitoring

## Key Features
- **Multi-Team Environment**: Support for unlimited teams with hierarchical structure
- **Project Portfolio Management**: Handle multiple projects with different team assignments
- **Role-Based Permissions**: Granular access control for Admin, Manager, Developer, and Tester roles
- **Real-time Dashboard Analytics**: Team performance, project progress, and resource utilization charts
- **Collaboration Tools**: Live updates, notifications, and team communication
- **Data Export & Reporting**: Excel file generation for project data and team analytics
- **Responsive Design**: Mobile-friendly interface for remote team access
- **Real-time Updates**: Firebase real-time database synchronization across all teams
