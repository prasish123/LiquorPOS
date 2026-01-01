import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-white flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">Admin Portal</h2>
                    <p className="text-xs text-slate-500 mt-1">Welcome, {user?.firstName}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavLink to="/admin" label="Dashboard" icon="📊" />
                    <NavLink to="/admin/products" label="Products" icon="📦" />
                    <NavLink to="/admin/users" label="Users" icon="👥" />
                    <NavLink to="/admin/settings" label="Settings" icon="⚙️" />
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={() => navigate('/pos')} className="w-full mb-2 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-sm font-medium transition-colors">
                        Open POS Terminal
                    </button>
                    <button onClick={logout} className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-2 rounded-lg text-sm font-medium transition-colors">
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    );
}

function NavLink({ to, label, icon }: { to: string, label: string, icon: string }) {
    const navigate = useNavigate();
    return (
        <div
            onClick={() => navigate(to)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
        >
            <span>{icon}</span>
            <span className="font-medium">{label}</span>
        </div>
    )
}
