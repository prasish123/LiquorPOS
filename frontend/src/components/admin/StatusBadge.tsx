import { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
    variant: BadgeVariant;
    children: ReactNode;
    icon?: ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ variant, children, icon, size = 'md' }: StatusBadgeProps) {
    const variantClasses = {
        success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        error: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        info: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        neutral: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    };

    const sizeClasses = {
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2'
    };

    return (
        <span className={`
            inline-flex items-center gap-1.5 
            rounded-full font-semibold border
            transition-all duration-200
            ${variantClasses[variant]} 
            ${sizeClasses[size]}
        `}>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
        </span>
    );
}

