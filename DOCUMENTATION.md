# Devium Project Documentation

## 1. Project Overview
**Devium** is a personal portfolio website designed to showcase your skills, projects, and contact information. It is built using modern web technologies to ensure high performance, type safety, and a great developer experience.

### Technology Stack
- **React**: Frontend library for building user interfaces.
- **Vite**: Next-generation frontend tooling for fast builds and hot module replacement (HMR).
- **TypeScript**: Adds static typing to JavaScript to prevent errors and improve code quality.
- **Material UI (MUI)**: A popular React UI framework for faster and easier web development.
- **React Router**: Standard routing library for React to handle navigation between pages.

## 2. Getting Started

### Prerequisites
Before you begin, ensure you have **Node.js** installed (version 14 or higher). You can check this by running `node -v` in your terminal.

### Installation
1.  Clone the repository or open the project folder.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally
To start the development server:
```bash
npm run dev
```
Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## 3. Project Structure

```text
Devium/
├── src/
│   ├── components/    # Reusable UI components
│   │   └── Navbar.tsx # The top navigation bar
│   ├── pages/         # Main page components
│   │   ├── Home.tsx
│   │   ├── About.tsx
│   │   ├── Projects.tsx
│   │   └── Contact.tsx
│   ├── App.tsx        # Main application component (Routing & Theme)
│   ├── main.tsx       # Entry point (renders App into DOM)
│   └── firebase.ts    # Firebase configuration
├── public/            # Static assets (images, icons)
├── index.html         # HTML entry point
├── package.json       # Project dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── vite.config.ts     # Vite configuration
```

## 4. Customization Guide

### Personalizing Content
- **Home Page**: Edit `src/pages/Home.tsx` to change the welcome message.
- **About Page**: Edit `src/pages/About.tsx` to add your bio.
- **Projects**: Edit `src/pages/Projects.tsx` to list your actual projects. You can create a JSON array of projects and map through them to render cards.
- **Contact**: Edit `src/pages/Contact.tsx` to add your email or a contact form.

### Navigation
To add or remove links from the navigation bar, modify the `links` array in `src/components/Navbar.tsx`:
```typescript
const links = [
  { to: '/', label: 'Home' },
  // Add new links here
];
```

### Theming
The application uses Material UI's theming system. You can customize colors, typography, and more in `src/App.tsx`:
```typescript
const theme = createTheme({
  palette: {
    mode: 'dark', // 'light' or 'dark'
    primary: { main: '#90caf9' }, // Change primary color
    // ...
  }
});
```

### Firebase Integration
The project is set up to use Firebase. To connect it to your Firebase project:
1.  Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2.  Register a web app and copy the configuration keys.
3.  Create a `.env` file in the root directory (do not commit this file to git):
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
    ...
    ```
4.  You can now import `app` from `src/firebase.ts` to use Firebase services (Auth, Firestore, etc.).

## 5. Deployment

### Building for Production
To create an optimized build for deployment:
```bash
npm run build
```
This will generate a `dist` folder containing your static website.

### Hosting Options
- **Vercel / Netlify**: Connect your GitHub repository and it will automatically detect Vite and deploy.
- **Firebase Hosting**:
    1.  Install Firebase CLI: `npm install -g firebase-tools`
    2.  Login: `firebase login`
    3.  Initialize: `firebase init` (choose Hosting, select `dist` as public directory).
    4.  Deploy: `firebase deploy`
