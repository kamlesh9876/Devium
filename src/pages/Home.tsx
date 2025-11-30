
import { Container, Box, Typography } from '@mui/material';

export default function Home() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 6 }}>
        <Typography variant="h3" gutterBottom>Home</Typography>
        <Typography>Welcome to Devium. Replace this content with your designed home page.</Typography>
      </Box>
    </Container>
  );
}
