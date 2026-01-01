export function AdminDashboard() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">Dashboard Review</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Sales" value="$1,234.56" change="+12%" />
                <StatCard title="Total Orders" value="45" change="+5%" />
                <StatCard title="Active Users" value="8" change="0%" />
            </div>

            <div className="mt-12 bg-slate-900 rounded-2xl p-6 border border-slate-800">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="flex gap-4">
                    <ActionButton label="Add Product" />
                    <ActionButton label="Import CSV" />
                    <ActionButton label="Create User" />
                    <ActionButton label="Update Discounts" />
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, change }: any) {
    return (
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
            <div className="text-3xl font-bold text-white mb-2">{value}</div>
            <div className="text-green-400 text-sm font-medium">{change} from yesterday</div>
        </div>
    )
}

function ActionButton({ label }: { label: string }) {
    return (
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-medium transition-colors">
            {label}
        </button>
    )
}
