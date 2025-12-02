import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import {
    Box,
    Fade,
    Slide,
    Zoom,
    Grow,
    Skeleton,
    CircularProgress,
    Paper,
    Typography,
    useTheme,
    alpha,
    keyframes
} from '@mui/material';
import { useDataSync } from '../contexts/DataSyncContext';
import { useNotifications } from '../contexts/NotificationContext';

// Animation keyframes
const shimmerAnimation = keyframes`
    0% {
        transform: translateX(-100%);
    }
    100% {
        transform: translateX(100%);
    }
`;

const floatAnimation = keyframes`
    0%, 100% {
        transform: translateY(0px);
    }
    50% {
        transform: translateY(-10px);
    }
`;

interface AnimatedCardProps {
    children: React.ReactNode;
    delay?: number;
    animation?: 'fade' | 'slide' | 'zoom' | 'grow';
    direction?: 'up' | 'down' | 'left' | 'right';
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
    children, 
    delay = 0, 
    animation = 'fade',
    direction = 'up'
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => setIsVisible(true), delay);
                }
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => {
            if (cardRef.current) {
                observer.unobserve(cardRef.current);
            }
        };
    }, [delay]);

    const getAnimationComponent = () => {
        const commonProps = { in: isVisible, timeout: 600 };

        switch (animation) {
            case 'slide':
                return (
                    <Slide {...commonProps} direction={direction}>
                        <Box ref={cardRef}>{children}</Box>
                    </Slide>
                );
            case 'zoom':
                return (
                    <Zoom {...commonProps}>
                        <Box ref={cardRef}>{children}</Box>
                    </Zoom>
                );
            case 'grow':
                return (
                    <Grow {...commonProps}>
                        <Box ref={cardRef}>{children}</Box>
                    </Grow>
                );
            default:
                return (
                    <Fade {...commonProps}>
                        <Box ref={cardRef}>{children}</Box>
                    </Fade>
                );
        }
    };

    return getAnimationComponent();
};

interface LiveUpdateIndicatorProps {
    isUpdating: boolean;
    size?: 'small' | 'medium' | 'large';
    color?: string;
}

export const LiveUpdateIndicator: React.FC<LiveUpdateIndicatorProps> = ({ 
    isUpdating, 
    size = 'small',
    color
}) => {
    const theme = useTheme();
    const indicatorColor = color || theme.palette.primary.main;

    const getSize = () => {
        switch (size) {
            case 'small': return 16;
            case 'medium': return 24;
            case 'large': return 32;
            default: return 16;
        }
    };

    return (
        <Box sx={{ 
            position: 'relative', 
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <CircularProgress
                size={getSize()}
                sx={{
                    color: indicatorColor,
                    animation: isUpdating ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                    }
                }}
            />
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: getSize() * 0.6,
                    height: getSize() * 0.6,
                    borderRadius: '50%',
                    backgroundColor: indicatorColor,
                    animation: isUpdating ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    '@keyframes pulse': {
                        '0%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
                        '50%': { transform: 'translate(-50%, -50%) scale(0.8)', opacity: 0.5 },
                        '100%': { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
                    }
                }}
            />
        </Box>
    );
};

interface SyncStatusIndicatorProps {
    showText?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ showText = true }) => {
    const { isOnline, pendingOperations } = useDataSync();
    const theme = useTheme();

    const getStatusColor = () => {
        if (!isOnline) return theme.palette.error.main;
        if (pendingOperations > 0) return theme.palette.warning.main;
        return theme.palette.success.main;
    };

    const getStatusText = () => {
        if (!isOnline) return 'Offline';
        if (pendingOperations > 0) return `Syncing (${pendingOperations})`;
        return 'Synced';
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
                sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: getStatusColor(),
                    animation: isOnline && pendingOperations === 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                    '@keyframes pulse': {
                        '0%': { transform: 'scale(1)', opacity: 1 },
                        '50%': { transform: 'scale(1.2)', opacity: 0.7 },
                        '100%': { transform: 'scale(1)', opacity: 1 }
                    }
                }}
            />
            {showText && (
                <Typography variant="caption" color="text.secondary">
                    {getStatusText()}
                </Typography>
            )}
        </Box>
    );
};

interface RippleEffectProps {
    children: React.ReactNode;
    onClick?: () => void;
    color?: string;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({ children, onClick, color }) => {
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
    const theme = useTheme();
    const rippleColor = color || alpha(theme.palette.primary.main, 0.3);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const newRipple = {
            id: Date.now(),
            x,
            y
        };

        setRipples(prev => [...prev, newRipple]);

        // Remove ripple after animation
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== newRipple.id));
        }, 600);

        if (onClick) {
            onClick();
        }
    };

    return (
        <Box
            sx={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
            onClick={handleClick}
        >
            {children}
            {ripples.map(ripple => (
                <Box
                    key={ripple.id}
                    sx={{
                        position: 'absolute',
                        left: ripple.x,
                        top: ripple.y,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: rippleColor,
                        transform: 'translate(-50%, -50%)',
                        animation: 'ripple 0.6s ease-out',
                        '@keyframes ripple': {
                            '0%': { transform: 'translate(-50%, -50%) scale(0)', opacity: 1 },
                            '100%': { transform: 'translate(-50%, -50%) scale(4)', opacity: 0 }
                        }
                    }}
                />
            ))}
        </Box>
    );
};

interface LoadingSkeletonProps {
    variant?: 'text' | 'rectangular' | 'circular';
    width?: number | string;
    height?: number | string;
    animation?: 'pulse' | 'wave' | false;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
    variant = 'text',
    width,
    height,
    animation = 'pulse'
}) => {
    return (
        <Skeleton
            variant={variant}
            width={width}
            height={height}
            animation={animation}
            sx={{
                bgcolor: 'action.hover',
                '&::after': {
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
                }
            }}
        />
    );
};

interface ProgressRingProps {
    value: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
    value,
    size = 120,
    strokeWidth = 8,
    color,
    backgroundColor
}) => {
    const theme = useTheme();
    const progressColor = color || theme.palette.primary.main;
    const bgColor = backgroundColor || alpha(theme.palette.divider, 0.2);

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
            <svg width={size} height={size}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={bgColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={progressColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{
                        transform: 'rotate(-90deg)',
                        transformOrigin: '50% 50%',
                        transition: 'stroke-dashoffset 0.5s ease-in-out'
                    }}
                />
            </svg>
            <Box
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {Math.round(value)}%
                </Typography>
            </Box>
        </Box>
    );
};

interface FloatingActionProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
}

export const FloatingAction: React.FC<FloatingActionProps> = ({
    children,
    delay = 0,
    duration = 3
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <Box
            sx={{
                animation: isVisible ? `float ${duration}s ease-in-out infinite` : 'none',
                '@keyframes float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-10px)' }
                }
            }}
        >
            {children}
        </Box>
    );
};

interface ShimmerEffectProps {
    children: React.ReactNode;
    isLoading: boolean;
}

export const ShimmerEffect: React.FC<ShimmerEffectProps> = ({ children, isLoading }) => {
    const theme = useTheme();

    return (
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            {children}
            {isLoading && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.common.white, 0.2)}, transparent)`,
                        animation: 'shimmer 1.5s infinite',
                        '@keyframes shimmer': {
                            '0%': { transform: 'translateX(-100%)' },
                            '100%': { transform: 'translateX(100%)' }
                        }
                    }}
                />
            )}
        </Box>
    );
};

// Main Real-Time UI Component
export const RealTimeUI: React.FC = () => {
    const { syncErrors } = useDataSync();
    const { notifications } = useNotifications();
    const [showErrors, setShowErrors] = useState(false);

    useEffect(() => {
        if (syncErrors.length > 0) {
            setShowErrors(true);
            const timer = setTimeout(() => setShowErrors(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [syncErrors]);

    return (
        <Box sx={{ position: 'fixed', top: 20, left: 20, zIndex: 9999 }}>
            {/* Sync Status */}
            <AnimatedCard delay={0} animation="slide" direction="down">
                <Paper sx={{ p: 2, mb: 2, minWidth: 200 }}>
                    <SyncStatusIndicator />
                </Paper>
            </AnimatedCard>

            {/* Recent Notifications */}
            {notifications.slice(0, 3).map((notification, index) => (
                <AnimatedCard key={notification.id} delay={index * 100} animation="slide" direction="down">
                    <Paper sx={{ p: 2, mb: 2, minWidth: 200 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {notification.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {notification.message}
                        </Typography>
                    </Paper>
                </AnimatedCard>
            ))}

            {/* Sync Errors */}
            {showErrors && syncErrors.slice(0, 3).map((error, index) => (
                <AnimatedCard key={error.id} delay={index * 100} animation="fade">
                    <Paper sx={{ p: 2, mb: 2, minWidth: 200, bgcolor: 'error.dark' }}>
                        <Typography variant="body2" color="error.light">
                            Sync Error: {error.error}
                        </Typography>
                    </Paper>
                </AnimatedCard>
            ))}
        </Box>
    );
};

export default memo(RealTimeUI);
