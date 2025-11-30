
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Projects' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const location = useLocation();
  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Devium
        </Typography>
        <Box>
          {links.map((l) => (
            <Button
              key={l.to}
              component={RouterLink}
              to={l.to}
              color={location.pathname === l.to ? 'primary' : 'inherit'}
              sx={{ mx: 1 }}
            >
              {l.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
