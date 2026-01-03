import { useState } from 'react';
import { Users as UsersIcon, UserPlus, Search, Shield, User, Crown } from 'lucide-react';
import { ModuleCard } from '../../components/admin/ModuleCard';
import { ActionButton } from '../../components/admin/ActionButton';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { FilterBox } from '../../components/admin/FilterBox';

type RoleFilter = 'all' | 'admin' | 'manager' | 'cashier';

export function AdminUsers() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<RoleFilter>('all');

    // Mock data for demonstration
    const users = [
        { id: 1, name: 'John Admin', email: 'john@liquorpos.com', role: 'ADMIN', status: 'Active', lastLogin: '2 hours ago', avatar: 'JA' },
        { id: 2, name: 'Sarah Manager', email: 'sarah@liquorpos.com', role: 'MANAGER', status: 'Active', lastLogin: '5 hours ago', avatar: 'SM' },
        { id: 3, name: 'Mike Cashier', email: 'mike@liquorpos.com', role: 'CASHIER', status: 'Active', lastLogin: '1 day ago', avatar: 'MC' },
        { id: 4, name: 'Lisa Cashier', email: 'lisa@liquorpos.com', role: 'CASHIER', status: 'Inactive', lastLogin: '3 days ago', avatar: 'LC' },
        { id: 5, name: 'Tom Manager', email: 'tom@liquorpos.com', role: 'MANAGER', status: 'Active', lastLogin: '4 hours ago', avatar: 'TM' },
        { id: 6, name: 'Emma Cashier', email: 'emma@liquorpos.com', role: 'CASHIER', status: 'Active', lastLogin: '30 min ago', avatar: 'EC' },
        { id: 7, name: 'David Admin', email: 'david@liquorpos.com', role: 'ADMIN', status: 'Active', lastLogin: '1 hour ago', avatar: 'DA' },
        { id: 8, name: 'Anna Cashier', email: 'anna@liquorpos.com', role: 'CASHIER', status: 'Active', lastLogin: '2 hours ago', avatar: 'AC' },
    ];

    const filteredUsers = users.filter(u => {
        if (activeFilter === 'admin') return u.role === 'ADMIN';
        if (activeFilter === 'manager') return u.role === 'MANAGER';
        if (activeFilter === 'cashier') return u.role === 'CASHIER';
        return true;
    });

    const stats = {
        all: users.length,
        admin: users.filter(u => u.role === 'ADMIN').length,
        manager: users.filter(u => u.role === 'MANAGER').length,
        cashier: users.filter(u => u.role === 'CASHIER').length
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1800px', margin: '0 auto' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }} className="animate-fadeInUp">
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'var(--font-display)' }}>
                    User Management
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Manage user accounts, roles, and permissions</p>
            </div>

            {/* Search & Actions Module */}
            <ModuleCard variant="standard" style={{ animationDelay: '0.1s', marginBottom: '24px' }}>
                <ModuleCard.Content>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', flexWrap: 'wrap' }}>
                        {/* Search */}
                        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} size={16} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search users by name or email..."
                                style={{ width: '100%', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid var(--color-border)', borderRadius: '8px', paddingLeft: '40px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', fontSize: '14px', color: 'var(--color-text-primary)', outline: 'none', transition: 'all 0.2s' }}
                            />
                        </div>

                        {/* Actions */}
                        <ActionButton icon={UserPlus} size="md">
                            Add User
                        </ActionButton>
                    </div>
                </ModuleCard.Content>
            </ModuleCard>

            {/* Role Filter Module */}
            <ModuleCard variant="standard" style={{ animationDelay: '0.2s', marginBottom: '24px' }}>
                <ModuleCard.Content>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <FilterBox
                            icon={UsersIcon}
                            label="All Users"
                            count={stats.all}
                            active={activeFilter === 'all'}
                            onClick={() => setActiveFilter('all')}
                        />
                        <FilterBox
                            icon={Crown}
                            label="Admins"
                            count={stats.admin}
                            active={activeFilter === 'admin'}
                            onClick={() => setActiveFilter('admin')}
                        />
                        <FilterBox
                            icon={Shield}
                            label="Managers"
                            count={stats.manager}
                            active={activeFilter === 'manager'}
                            onClick={() => setActiveFilter('manager')}
                        />
                        <FilterBox
                            icon={User}
                            label="Cashiers"
                            count={stats.cashier}
                            active={activeFilter === 'cashier'}
                            onClick={() => setActiveFilter('cashier')}
                        />
                    </div>
                </ModuleCard.Content>
            </ModuleCard>

            {/* User Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {filteredUsers.map((user, index) => (
                    <UserCard 
                        key={user.id} 
                        user={user} 
                        delay={`${0.3 + (index * 0.05)}s`}
                    />
                ))}
            </div>
        </div>
    );
}

function UserCard({ user, delay }: any) {
    const getRoleConfig = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return { variant: 'error' as const, icon: Crown };
            case 'MANAGER':
                return { variant: 'info' as const, icon: Shield };
            case 'CASHIER':
                return { variant: 'success' as const, icon: User };
            default:
                return { variant: 'neutral' as const, icon: User };
        }
    };

    const roleConfig = getRoleConfig(user.role);
    const RoleIcon = roleConfig.icon;

    return (
        <ModuleCard 
            variant="standard" 
            onClick={() => console.log('Edit user:', user.id)}
            style={{ animationDelay: delay, cursor: 'pointer' }}
        >
            {/* User Avatar */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '24px', paddingBottom: '16px' }}>
                <div style={{ width: '96px', height: '96px', borderRadius: '50%', background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)', fontFamily: 'var(--font-display)' }}>
                    {user.avatar}
                </div>
            </div>

            {/* User Info */}
            <ModuleCard.Content>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>
                            {user.name}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{user.email}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <StatusBadge variant={roleConfig.variant} icon={<RoleIcon size={14} />}>
                            {user.role}
                        </StatusBadge>
                        <StatusBadge variant={user.status === 'Active' ? 'success' : 'neutral'} size="sm">
                            {user.status}
                        </StatusBadge>
                    </div>

                    <div style={{ paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Last login</div>
                        <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500' }}>{user.lastLogin}</div>
                    </div>
                </div>
            </ModuleCard.Content>

            {/* Quick Actions */}
            <ModuleCard.Footer>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <ActionButton size="sm" variant="ghost" fullWidth>
                        Edit User
                    </ActionButton>
                </div>
            </ModuleCard.Footer>
        </ModuleCard>
    );
}
