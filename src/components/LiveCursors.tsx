import React, { memo } from 'react';
import { Box, Typography, Fade, useTheme, alpha } from '@mui/material';
import { useCollaboration } from '../contexts/CollaborationContext';

// Typing indicator component only - cursor functionality removed
export const TypingIndicator: React.FC = memo(() => {
    const { typingIndicators } = useCollaboration();
    const theme = useTheme();

    // Memoize unique elements calculation
    const uniqueElements = React.useMemo(() => 
        Array.from(new Set(typingIndicators.map(indicator => indicator.element))), 
        [typingIndicators]
    );

    if (uniqueElements.length === 0) return null;
    
    // Memoize typing elements
    const typingElements = React.useMemo(() => 
        uniqueElements.map((element) => {
            const usersTyping = typingIndicators.filter(indicator => indicator.element === element);
            return (
                <Fade key={element}>
                    <Box
                        sx={{
                            backgroundColor: alpha(theme.palette.background.paper, 0.9),
                            backdropFilter: 'blur(10px)',
                            borderRadius: 2,
                            p: 1,
                            mb: 1,
                            boxShadow: theme.shadows[2],
                            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                        }}
                    >
                        <Typography variant="caption" color="text.secondary">
                            {usersTyping.map(indicator => indicator.userName).join(', ')} 
                            {usersTyping.length === 1 ? ' is' : ' are'} typing in {element}
                        </Typography>
                    </Box>
                </Fade>
            );
        }), [uniqueElements, typingIndicators, theme]);
    
    return (
        <Box sx={{ position: 'fixed', bottom: 20, left: 20, zIndex: 9999 }}>
            {typingElements}
        </Box>
    );
});

// Hidden collaboration panel
export const CollaborationPanel: React.FC = memo(() => {
    return null; // Component hidden - no collaboration features needed
});

// Empty live cursor overlay - no cursor functionality
export const LiveCursorOverlay: React.FC = memo(() => {
    return null; // No cursor overlay
});
