
import { Typography, Paper, Grid } from '@mui/material';

export default function DeveloperDashboard() {
    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Typography variant="h4">Developer Dashboard</Typography>
            </Grid>
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6">My Tasks</Typography>
                    <Typography>View and update your assigned tasks.</Typography>
                </Paper>
            </Grid>
        </Grid>
    );
}
