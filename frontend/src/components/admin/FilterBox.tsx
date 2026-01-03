import { LucideIcon } from 'lucide-react';

interface FilterBoxProps {
    icon: LucideIcon;
    label: string;
    count?: number;
    active?: boolean;
    onClick?: () => void;
}

export function FilterBox({ icon: Icon, label, count, active = false, onClick }: FilterBoxProps) {
    return (
        <button
            onClick={onClick}
            className={`
                flex flex-col items-center justify-center gap-1.5
                p-3 rounded-lg border 
                min-h-[72px] min-w-[90px]
                font-semibold text-xs
                transition-all duration-200
                touch-action-manipulation
                ${active 
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/30 scale-105' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600 hover:scale-105 active:scale-95'
                }
            `}
        >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span>{label}</span>
            {count !== undefined && (
                <span className={`
                    text-xs px-1.5 py-0.5 rounded-full
                    ${active ? 'bg-white/20' : 'bg-indigo-500/20 text-indigo-300'}
                `}>
                    {count}
                </span>
            )}
        </button>
    );
}

