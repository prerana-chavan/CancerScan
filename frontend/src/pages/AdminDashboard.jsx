import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Activity, Trash2, Key, 
    CheckCircle2, AlertCircle, Search, RefreshCcw, X
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';

export default function AdminDashboard() {
    const { 
        stats, doctors, loading, refreshData, 
        approveDoctor, deleteDoctor, resetPassword 
    } = useAdmin();

    const [search, setSearch] = useState('');
    const [notif, setNotif] = useState(null);
    const [resetModalId, setResetModalId] = useState(null);
    const [newPassword, setNewPassword] = useState('Reset@1234');

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const showNotif = (msg, type = 'success') => {
        setNotif({ msg, type });
        setTimeout(() => setNotif(null), 4000);
    };

    const handleApprove = async (id) => {
        try {
            await approveDoctor(id);
            showNotif('Doctor approved successfully');
        } catch (err) {
            showNotif(err.message || 'Failed to approve doctor', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Permanently remove this account?')) return;
        try {
            await deleteDoctor(id);
            showNotif('Account deleted');
        } catch (err) {
            showNotif(err.message || 'Failed to delete account', 'error');
        }
    };

    const handleResetClick = (id) => {
        setResetModalId(id);
        setNewPassword('Reset@1234');
    };

    const confirmReset = async () => {
        if (!newPassword || !resetModalId) return;
        try {
            await resetPassword(resetModalId, newPassword);
            showNotif(`Password reset successfully`);
            setResetModalId(null);
        } catch (err) {
            showNotif('Failed to reset password', 'error');
        }
    };

    const pending = doctors?.filter(d => !d.is_approved) || [];
    const approved = doctors?.filter(d => d.is_approved) || [];
    
    const filtered = (list) => list.filter(d => 
        d.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.email?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading && !stats) return (
        <div className="flex h-screen items-center justify-center bg-[color:var(--bg-primary)]">
            <RefreshCcw className="animate-spin text-[color:var(--accent-teal)]" size={40} />
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-[color:var(--text-primary)] tracking-tight uppercase font-display">Command Center</h2>
                <p className="text-xs font-bold text-[color:var(--text-secondary)] uppercase tracking-widest">Global System Status and User Lifecycle Management</p>
            </div>

            {/* Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<Users />} label="Total Doctors" val={stats?.totalDoctors} color="#06b6d4" />
                <StatCard icon={<Activity />} label="Total Scans" val={stats?.totalScans} color="#06b6d4" />
                <StatCard icon={<AlertCircle />} label="Cancer Detected" val={stats?.cancerDetected} color="#ef4444" />
            </div>

            <AnimatePresence>
                {notif && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-xl border flex items-center gap-3 ${
                            notif.type === 'error' 
                            ? 'bg-red-500/10 border-red-500/20 text-red-400' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}
                    >
                        {notif.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}
                        <span className="font-medium text-sm">{notif.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 gap-8">
                {/* Management Section */}
                <section>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[color:var(--accent-blue-light)] flex items-center justify-center">
                                <Users size={18} className="text-[color:var(--accent-blue)]" />
                            </div>
                            <h2 className="text-xl font-black text-[color:var(--text-primary)] uppercase tracking-tight">Active Registrations</h2>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" size={18} />
                            <input 
                                type="text"
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-[color:var(--bg-surface-alt)] border border-[color:var(--border-subtle)] rounded-xl pl-10 pr-4 py-2.5 w-full md:w-[320px] focus:outline-none focus:border-[color:var(--accent-teal)] focus:ring-1 focus:ring-[color:var(--accent-teal)] transition-all text-sm font-bold text-[color:var(--text-primary)]"
                            />
                        </div>
                    </div>

                    <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-2xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-[color:var(--bg-surface-alt)] text-[color:var(--text-muted)] text-[11px] uppercase tracking-wider font-bold">
                                <tr>
                                    <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Clinical Identity</th>
                                    <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Hospital / Entity</th>
                                    <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">License ID</th>
                                    <th className="px-6 py-4 border-b border-[color:var(--border-subtle)] text-right">Administrative Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[color:var(--border-subtle)]">
                                {filtered(approved).map(doc => (
                                    <tr key={doc.id} className="hover:bg-[color:var(--bg-surface-alt)] transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-[color:var(--bg-surface-alt)] border border-[color:var(--border-subtle)] flex items-center justify-center font-bold text-[color:var(--accent-teal)]">
                                                    {doc.full_name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-[color:var(--text-primary)]">{doc.full_name}</div>
                                                    <div className="text-xs text-[color:var(--text-secondary)] font-bold uppercase tracking-widest">{doc.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-[color:var(--text-primary)]">
                                            <div className="text-sm font-bold text-[color:var(--text-secondary)]">{doc.hospital}</div>
                                            <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-muted)] font-black">{doc.specialization}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <code className="text-[11px] bg-[color:var(--accent-teal-light)] border border-[color:var(--accent-teal)]/20 px-2 py-1 rounded text-[color:var(--accent-teal)] font-black tracking-widest">
                                                {doc.medical_license_id}
                                            </code>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleResetClick(doc.id)}
                                                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer group/btn"
                                                    title="Reset Password"
                                                >
                                                    <Key size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer group/btn"
                                                    title="Revoke Access"
                                                >
                                                    <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered(approved).length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-12 text-center text-[color:var(--text-muted)] font-black uppercase tracking-widest text-[10px]">Registry is clean. No active doctors.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* Reset Password Modal */}
            <AnimatePresence>
                {resetModalId && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] p-6 rounded-2xl w-full max-w-[400px] shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                                    <Key className="text-[color:var(--accent-teal)]" />
                                    Reset Password
                                </h2>
                                <button onClick={() => setResetModalId(null)} className="text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[color:var(--text-muted)] uppercase mb-1.5">New Password</label>
                                    <input 
                                        type="text"
                                        className="bg-[color:var(--bg-surface-alt)] border border-[color:var(--border-subtle)] rounded-xl px-4 py-2 w-full text-sm font-bold text-[color:var(--text-primary)] focus:outline-none focus:border-[color:var(--accent-teal)]" 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => setResetModalId(null)} className="flex-1 py-2 rounded-xl border border-[color:var(--border-subtle)] font-bold text-xs uppercase tracking-widest text-[color:var(--text-muted)] hover:bg-[color:var(--bg-surface-alt)] transition-all">Cancel</button>
                                    <button onClick={confirmReset} className="flex-1 py-2 rounded-xl bg-[color:var(--accent-teal)] text-white font-bold text-xs uppercase tracking-widest hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/20">Reset Password</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function StatCard({ icon, label, val, color, pulse }) {
    // Determine custom colors for statcards
    const isCyan = color === '#06b6d4';
    const isRed = color === '#ef4444';
    
    const iconColor = isCyan ? 'var(--accent-teal)' : isRed ? 'var(--status-danger)' : color;
    const bgLightColor = isCyan ? 'var(--accent-teal-light)' : isRed ? 'var(--status-danger-bg)' : color;

    return (
        <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] p-6 rounded-2xl relative overflow-hidden group shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
            {pulse && (
                <div className="absolute top-2 right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--status-warning)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[color:var(--status-warning)]"></span>
                </div>
            )}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all group-hover:scale-110`} style={{ background: bgLightColor, color: iconColor }}>
                {icon}
            </div>
            <div className="text-3xl font-black mb-1 text-[color:var(--text-primary)]">{val ?? 0}</div>
            <div className="text-[11px] uppercase tracking-widest text-[color:var(--text-muted)] font-bold">{label}</div>
            <div className="absolute bottom-0 left-0 h-[3px] w-0 group-hover:w-full transition-all duration-500" style={{ background: iconColor }} />
        </div>
    );
}

