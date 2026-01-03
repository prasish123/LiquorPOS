import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ActionButtonProps {
    children: ReactNode;
    icon?: LucideIcon;
    variant?: ButtonVariant;
    size?: ButtonSize;
    onClick?: () => void;
    disabled?: boolean;
    fullWidth?: boolean;
    className?: string;
}

export function ActionButton({ 
    children, 
    icon: Icon, 
    variant = 'primary', 
    size = 'md',
    onClick, 
    disabled = false,
    fullWidth = false,
    className = ''
}: ActionButtonProps) {
    const baseClasses = `
        inline-flex items-center justify-center gap-2
        font-bold rounded-xl
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95
        touch-action-manipulation
    `;

    const variantClasses = {
        primary: `
            bg-gradient-to-r from-indigo-600 to-indigo-500 
            hover:from-indigo-500 hover:to-indigo-400
            text-white shadow-lg shadow-indigo-500/30
            hover:shadow-xl hover:shadow-indigo-500/40
            hover:scale-105
        `,
        secondary: `
            bg-slate-700 hover:bg-slate-600
            text-white
            hover:scale-105
        `,
        danger: `
            bg-gradient-to-r from-rose-600 to-rose-500
            hover:from-rose-500 hover:to-rose-400
            text-white shadow-lg shadow-rose-500/30
            hover:shadow-xl hover:shadow-rose-500/40
            hover:scale-105
        `,
        ghost: `
            bg-transparent hover:bg-slate-700/50
            text-slate-300 hover:text-white
            border border-slate-600 hover:border-slate-500
        `
    };

    const sizeClasses = {
        sm: 'px-3 py-2 text-sm min-h-[36px]',
        md: 'px-4 py-2 text-sm min-h-[40px]',
        lg: 'px-5 py-2.5 text-base min-h-[44px]',
        xl: 'px-6 py-3 text-base min-h-[48px]'
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                ${baseClasses}
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${widthClass}
                ${className}
            `}
        >
            {Icon && <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : size === 'lg' ? 18 : 20} strokeWidth={2.5} />}
            <span>{children}</span>
        </button>
    );
}

