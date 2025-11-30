
import { Typography, Paper, Grid } from '@mui/material';

export default function ManagerDashboard() {
    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Typography variant="h4">Manager Dashboard</Typography>
            </Grid>
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6">Project Overview</Typography>
                    <Typography>Track project progress and assign tasks.</Typography>
                </Paper>
            </Grid>
        </Grid>
    );
}
