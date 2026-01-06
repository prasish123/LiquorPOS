import { ReactNode, CSSProperties } from 'react';
import { LucideIcon } from 'lucide-react';

interface ModuleCardProps {
    children: ReactNode;
    variant?: 'compact' | 'standard' | 'expanded';
    onClick?: () => void;
    className?: string;
    style?: CSSProperties;
}

export function ModuleCard({ children, variant = 'standard', onClick, className = '', style }: ModuleCardProps) {
    // Use the existing tile-card class from index.css
    const baseClasses = "tile-card";
    const variantClasses = {
        compact: "",
        standard: "",
        expanded: ""
    };
    const interactiveClasses = onClick ? "cursor-pointer" : "";

    return (
        <div 
            className={`${baseClasses} ${variantClasses[variant]} ${interactiveClasses} ${className}`}
            onClick={onClick}
            style={style}
        >
            {children}
        </div>
    );
}

interface ModuleHeaderProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    badge?: ReactNode;
    action?: ReactNode;
}

export function ModuleHeader({ icon: Icon, title, subtitle, badge, action }: ModuleHeaderProps) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--gradient-subtle)', color: 'var(--color-primary)' }}>
                    <Icon size={18} strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{title}</h3>
                        {badge}
                    </div>
                    {subtitle && (
                        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{subtitle}</p>
                    )}
                </div>
            </div>
            {action && (
                <div style={{ marginLeft: '12px' }}>
                    {action}
                </div>
            )}
        </div>
    );
}

interface ModuleContentProps {
    children: ReactNode;
    className?: string;
    scrollable?: boolean;
}

export function ModuleContent({ children, className = '', scrollable = false }: ModuleContentProps) {
    return (
        <div style={{ padding: '16px', overflowY: scrollable ? 'auto' : 'visible' }} className={className}>
            {children}
        </div>
    );
}

interface ModuleFooterProps {
    children: ReactNode;
    className?: string;
}

export function ModuleFooter({ children, className = '' }: ModuleFooterProps) {
    return (
        <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '12px' }} className={className}>
            {children}
        </div>
    );
}

// Compound component pattern
ModuleCard.Header = ModuleHeader;
ModuleCard.Content = ModuleContent;
ModuleCard.Footer = ModuleFooter;

