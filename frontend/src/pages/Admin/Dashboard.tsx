import { TrendingUp, ShoppingCart, Users, DollarSign, Package, FileText, UserPlus, Tag, ArrowRight } from 'lucide-react';
import { ModuleCard } from '../../components/admin/ModuleCard';
import { ActionButton } from '../../components/admin/ActionButton';
import { StatusBadge } from '../../components/admin/StatusBadge';

export function AdminDashboard() {
    return (
        <div style={{ padding: '24px', maxWidth: '1800px', margin: '0 auto' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }} className="animate-fadeInUp">
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'var(--font-display)' }}>
                    Control Panel
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>System overview and quick actions</p>
            </div>

            {/* Stats Module Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <StatModule
                    icon={DollarSign}
                    title="Total Sales"
                    value="$1,234.56"
                    change="+12%"
                    trend="up"
                    delay="0s"
                />
                <StatModule
                    icon={ShoppingCart}
                    title="Total Orders"
                    value="45"
                    change="+5%"
                    trend="up"
                    delay="0.1s"
                />
                <StatModule
                    icon={Users}
                    title="Active Users"
                    value="8"
                    change="0%"
                    trend="neutral"
                    delay="0.2s"
                />
                <StatModule
                    icon={Package}
                    title="Products"
                    value="247"
                    change="+3 new"
                    trend="up"
                    delay="0.3s"
                />
            </div>

            {/* Quick Actions Module */}
            <ModuleCard variant="standard" style={{ animationDelay: '0.4s', marginBottom: '24px' }}>
                <ModuleCard.Header
                    icon={Tag}
                    title="Quick Actions"
                    subtitle="Common tasks and shortcuts"
                />
                <ModuleCard.Content>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <ActionButton icon={Package} size="md" fullWidth>
                            Add Product
                        </ActionButton>
                        <ActionButton icon={FileText} size="md" variant="secondary" fullWidth>
                            Import CSV
                        </ActionButton>
                        <ActionButton icon={UserPlus} size="md" variant="secondary" fullWidth>
                            Create User
                        </ActionButton>
                        <ActionButton icon={Tag} size="md" variant="secondary" fullWidth>
                            Manage Discounts
                        </ActionButton>
                    </div>
                </ModuleCard.Content>
            </ModuleCard>

            {/* Activity Module */}
            <ModuleCard variant="expanded" className="animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
                <ModuleCard.Header
                    icon={TrendingUp}
                    title="Recent Activity"
                    subtitle="Latest system events and transactions"
                    action={
                        <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                            View All <ArrowRight size={14} />
                        </button>
                    }
                />
                <ModuleCard.Content scrollable className="max-h-[400px]">
                    <div className="space-y-3">
                        <ActivityItem
                            icon={ShoppingCart}
                            title="New order #1234"
                            description="$45.99 • 3 items"
                            time="5 minutes ago"
                            status="success"
                        />
                        <ActivityItem
                            icon={Users}
                            title="New user registered"
                            description="Mike Cashier"
                            time="1 hour ago"
                            status="info"
                        />
                        <ActivityItem
                            icon={Package}
                            title="Product updated"
                            description="Premium Vodka stock adjusted"
                            time="2 hours ago"
                            status="neutral"
                        />
                        <ActivityItem
                            icon={TrendingUp}
                            title="Sales milestone reached"
                            description="$10,000 this month"
                            time="3 hours ago"
                            status="success"
                        />
                        <ActivityItem
                            icon={Package}
                            title="Low stock alert"
                            description="8 products need restocking"
                            time="4 hours ago"
                            status="warning"
                        />
                    </div>
                </ModuleCard.Content>
            </ModuleCard>
        </div>
    );
}

function StatModule({ icon: Icon, title, value, change, trend, delay }: any) {
    const trendColors = {
        up: '#10b981',  // emerald-500
        down: '#ef4444', // rose-500
        neutral: '#64748b' // slate-500
    };

    return (
        <ModuleCard variant="compact" style={{ animationDelay: delay, height: '128px', padding: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--gradient-subtle)', color: 'var(--color-primary)' }}>
                        <Icon size={22} strokeWidth={2.5} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: trendColors[trend] }}>
                        {change}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>{value}</div>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>{title}</div>
                </div>
            </div>
        </ModuleCard>
    );
}

function ActivityItem({ icon: Icon, title, description, time, status }: any) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.2s' }} className="activity-item">
            <div style={{ padding: '6px', borderRadius: '6px', background: 'var(--gradient-subtle)', color: 'var(--color-primary)', flexShrink: 0 }}>
                <Icon size={16} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                        <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '500', marginBottom: '2px' }}>{title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{description}</div>
                    </div>
                    <StatusBadge variant={status} size="sm">
                        {status}
                    </StatusBadge>
                </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', flexShrink: 0 }}>{time}</div>
        </div>
    );
}
