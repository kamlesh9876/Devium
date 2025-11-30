
import { Typography, Paper, Grid } from '@mui/material';

export default function TesterDashboard() {
    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Typography variant="h4">Tester Dashboard</Typography>
            </Grid>
            <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6">Bug Tracker</Typography>
                    <Typography>Log new bugs and verify fixes.</Typography>
                </Paper>
            </Grid>
        </Grid>
    );
}
