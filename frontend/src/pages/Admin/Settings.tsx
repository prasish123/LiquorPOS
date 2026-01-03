import { Settings as SettingsIcon, Store, Bell, Shield, Database, Palette, Zap, Info } from 'lucide-react';
import { ModuleCard } from '../../components/admin/ModuleCard';
import { StatusBadge } from '../../components/admin/StatusBadge';

export function AdminSettings() {
    return (
        <div style={{ padding: '24px', maxWidth: '1800px', margin: '0 auto' }}>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }} className="animate-fadeInUp">
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'var(--font-display)' }}>
                    System Settings
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Configure your POS system preferences and options</p>
            </div>

            {/* Configuration Modules Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <ConfigModule
                    icon={Store}
                    title="Store Information"
                    description="Business details, location, and contact information"
                    delay="0s"
                />
                <ConfigModule
                    icon={Bell}
                    title="Notifications"
                    description="Configure alerts, emails, and system notifications"
                    delay="0.05s"
                />
                <ConfigModule
                    icon={Shield}
                    title="Security & Access"
                    description="Password policies, session timeout, and authentication"
                    delay="0.1s"
                />
                <ConfigModule
                    icon={Database}
                    title="Data & Backup"
                    description="Backup schedules, data retention, and recovery options"
                    delay="0.15s"
                />
                <ConfigModule
                    icon={Palette}
                    title="Appearance"
                    description="Theme, language, and display preferences"
                    delay="0.2s"
                />
                <ConfigModule
                    icon={Zap}
                    title="Integrations"
                    description="API keys, webhooks, and third-party services"
                    delay="0.25s"
                />
            </div>

            {/* Quick Settings Module */}
            <ModuleCard variant="expanded" style={{ animationDelay: '0.3s', marginBottom: '24px' }}>
                <ModuleCard.Header
                    icon={SettingsIcon}
                    title="Quick Settings"
                    subtitle="Frequently used configuration options"
                />
                <ModuleCard.Content>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                        <ToggleSetting
                            label="Enable offline mode"
                            description="Allow POS to function without internet connection"
                            defaultChecked={true}
                        />
                        <ToggleSetting
                            label="Age verification prompts"
                            description="Require age verification for restricted products"
                            defaultChecked={true}
                        />
                        <ToggleSetting
                            label="Receipt printing"
                            description="Automatically print receipts after checkout"
                            defaultChecked={false}
                        />
                        <ToggleSetting
                            label="Sound effects"
                            description="Play sounds for scans and transactions"
                            defaultChecked={true}
                        />
                        <ToggleSetting
                            label="Email notifications"
                            description="Send email alerts for important events"
                            defaultChecked={true}
                        />
                        <ToggleSetting
                            label="Auto-backup"
                            description="Automatically backup data daily"
                            defaultChecked={true}
                        />
                    </div>
                </ModuleCard.Content>
            </ModuleCard>

            {/* System Info Module */}
            <ModuleCard variant="expanded" style={{ animationDelay: '0.4s' }}>
                <ModuleCard.Header
                    icon={Info}
                    title="System Information"
                    subtitle="Current system status and metrics"
                    badge={<StatusBadge variant="success" size="sm">Healthy</StatusBadge>}
                />
                <ModuleCard.Content>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <InfoItem label="Version" value="1.0.0" status="success" />
                        <InfoItem label="Database" value="PostgreSQL 16" status="success" />
                        <InfoItem label="Last Backup" value="2 hours ago" status="success" />
                        <InfoItem label="Uptime" value="15 days" status="success" />
                        <InfoItem label="Storage Used" value="2.4 GB / 50 GB" status="success" />
                        <InfoItem label="Active Sessions" value="4" status="info" />
                        <InfoItem label="Total Users" value="24" status="info" />
                        <InfoItem label="Total Products" value="247" status="info" />
                        <InfoItem label="Orders Today" value="45" status="success" />
                    </div>
                </ModuleCard.Content>
            </ModuleCard>
        </div>
    );
}

function ConfigModule({ icon: Icon, title, description, delay }: any) {
    return (
        <ModuleCard 
            variant="standard" 
            onClick={() => console.log('Open config:', title)}
            style={{ animationDelay: delay, cursor: 'pointer' }}
        >
            <ModuleCard.Content>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ padding: '10px', borderRadius: '8px', background: 'var(--gradient-subtle)', color: 'var(--color-primary)' }}>
                            <Icon size={22} strokeWidth={2} />
                        </div>
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>
                            {title}
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                            {description}
                        </p>
                    </div>
                </div>
            </ModuleCard.Content>
        </ModuleCard>
    );
}

function ToggleSetting({ label, description, defaultChecked }: any) {
    return (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.3)', border: '1px solid var(--color-border)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: '600', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{description}</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-indigo-500 shadow-inner"></div>
                </label>
            </div>
        </div>
    );
}

function InfoItem({ label, value, status }: any) {
    const statusVariant = status === 'success' ? 'success' : status === 'warning' ? 'warning' : 'info';
    
    return (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.3)', border: '1px solid var(--color-border)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{label}</div>
                <StatusBadge variant={statusVariant} size="sm">
                    {status}
                </StatusBadge>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{value}</div>
        </div>
    );
}
