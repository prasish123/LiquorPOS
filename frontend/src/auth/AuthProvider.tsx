import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem('user');
        try {
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    // Validate session on mount
    useEffect(() => {
        const validateSession = async () => {
            if (user) {
                try {
                    const response = await fetch(`${API_URL}/auth/validate`, {
                        credentials: 'include',
                    });
                    if (!response.ok) {
                        // Cookie invalid or expired, clear user
                        setUser(null);
                        localStorage.removeItem('user');
                    }
                } catch (err) {
                    // Network error or backend down, clear user to be safe
                    console.error('Session validation failed:', err);
                    setUser(null);
                    localStorage.removeItem('user');
                }
            }
        };
        validateSession();
    }, []); // Run once on mount

    const login = (userData: User) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = async () => {
        try {
            // Get CSRF token for logout
            const csrfResponse = await fetch(`${API_URL}/auth/csrf-token`, {
                credentials: 'include',
            });
            
            if (csrfResponse.ok) {
                const { csrfToken } = await csrfResponse.json();
                
                await fetch(`${API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'x-csrf-token': csrfToken,
                    },
                    credentials: 'include',
                });
            }
        } catch (err) {
            console.error('Logout request failed:', err);
        } finally {
            // Always clear local state even if backend call fails
            setUser(null);
            localStorage.removeItem('user');
        }
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
