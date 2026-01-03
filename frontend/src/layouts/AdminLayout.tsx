import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div style={{ minHeight: '100vh', background: 'var(--gradient-bg)', display: 'flex', flexDirection: 'column' }}>
            {/* Top Navigation Bar */}
            <header style={{ background: 'white', borderBottom: '2px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
                    {/* Brand */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'var(--font-display)', margin: 0 }}>
                            Control Panel
                        </h1>
                        <div style={{ height: '32px', width: '2px', background: 'var(--color-border)' }} />
                        <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Welcome, {user?.firstName}</span>
                    </div>

                    {/* Tab Navigation */}
                    <nav style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <TabLink to="/admin" label="Dashboard" icon="📊" exact />
                        <TabLink to="/admin/products" label="Products" icon="📦" />
                        <TabLink to="/admin/users" label="Users" icon="👥" />
                        <TabLink to="/admin/settings" label="Settings" icon="⚙️" />
                    </nav>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button 
                            onClick={() => navigate('/pos')} 
                            style={{ 
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
                                color: 'white', 
                                padding: '10px 20px', 
                                borderRadius: '10px', 
                                fontSize: '14px', 
                                fontWeight: 'bold', 
                                border: 'none', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.3)';
                            }}
                        >
                            <span>🖥️</span>
                            <span>Open POS</span>
                        </button>
                        <button 
                            onClick={logout} 
                            style={{ 
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                                color: 'white', 
                                padding: '10px 20px', 
                                borderRadius: '10px', 
                                fontSize: '14px', 
                                fontWeight: 'bold', 
                                border: 'none', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                            }}
                        >
                            <span>🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main style={{ flex: 1, overflowY: 'auto' }}>
                <Outlet />
            </main>
        </div>
    );
}

function TabLink({ to, label, icon, exact = false }: { to: string, label: string, icon: string, exact?: boolean }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Determine if this tab is active
    const isActive = exact 
        ? location.pathname === to 
        : location.pathname.startsWith(to) && (to !== '/admin' || location.pathname === '/admin');
    
    return (
        <button
            onClick={() => navigate(to)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                color: isActive ? 'white' : 'var(--color-text-primary)',
                boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                position: 'relative',
                fontFamily: 'var(--font-display)'
            }}
            onMouseEnter={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.color = 'var(--color-primary)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                }
            }}
        >
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <span>{label}</span>
            {isActive && (
                <div style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60%',
                    height: '3px',
                    background: 'white',
                    borderRadius: '2px 2px 0 0'
                }} />
            )}
        </button>
    );
}
