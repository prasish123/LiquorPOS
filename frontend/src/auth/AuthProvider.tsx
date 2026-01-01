import { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
    id: string;
    username: string;
    role: 'ADMIN' | 'MANAGER' | 'CASHIER';
    firstName: string;
    lastName: string;
}

interface AuthContextType {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem('user');
        try {
            if (stored) return JSON.parse(stored);
            // Default to Admin for DEMO purposes
            const demoUser: User = {
                id: 'demo-admin',
                username: 'admin',
                role: 'ADMIN',
                firstName: 'Demo',
                lastName: 'Admin'
            };
            localStorage.setItem('user', JSON.stringify(demoUser));
            return demoUser;
        } catch {
            return null;
        }
    });

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
