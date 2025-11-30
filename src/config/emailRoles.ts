// Email-based role configuration
// Add user emails and their assigned roles here

export const emailRoleMapping: Record<string, string> = {
    // Admin users
    'kamleshsharadpawar@gmail.com': 'admin',

    // Manager users
    // 'manager@example.com': 'manager',

    // Developer users
    // 'dev@example.com': 'developer',

    // Tester users
    // 'tester@example.com': 'tester',
};

// Default role for users not in the mapping
export const DEFAULT_ROLE = 'guest';
