import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Trash2, Edit2, Search, UserCheck, UserX, UserSearch, X, Shield, RefreshCw } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAdmin } from '../context/AdminContext';

export default function UserManagementPage() {
    const { addNotification } = useNotifications();
    const { doctors, loading, approveDoctor, deleteDoctor, refreshData, resetPassword } = useAdmin();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [showProvisionModal, setShowProvisionModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const filteredUsers = doctors.filter(u => {
        const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.hospital?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'All' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleToggleStatus = async (user) => {
        try {
            await approveDoctor(user.id);
            const newStatus = !user.is_approved;
            addNotification(
                newStatus ? 'Access Granted' : 'Access Restricted', 
                `Investigator ${user.full_name} permissions updated.`, 
                newStatus ? 'success' : 'warning'
            );
        } catch (err) {
            addNotification('Sync Error', 'Node synchronization failed.', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Remove this user from the clinical registry? This will revoke all access keys.')) {
            try {
                await deleteDoctor(id);
                addNotification('Registry Updated', 'Clinical user account has been de-provisioned.', 'info');
            } catch (err) {
                addNotification('Deletion Failed', 'Node authorization required.', 'error');
            }
        }
    };

    const handleProvision = (e) => {
        // ... handled by RegisterPage for now, or add adminProvisionDoctor API
        e.preventDefault();
        addNotification('Restricted Action', 'Manual provisioning disabled. Use registration portal.', 'warning');
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black text-[color:var(--text-primary)] tracking-tight uppercase font-display">User Governance</h2>
                    <p className="text-xs font-bold text-[color:var(--text-secondary)] uppercase tracking-widest">Control access, assign clinical roles, and monitor investigator activity</p>
                </div>
                <button
                    onClick={() => setShowProvisionModal(true)}
                    className="px-6 py-2.5 rounded-xl bg-teal-500 text-white hover:bg-teal-400 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 group cursor-pointer uppercase tracking-widest"
                >
                    <UserPlus size={18} className="group-hover:rotate-12 transition-transform" />
                    Provision User
                </button>
            </div>

            <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[color:var(--border-subtle)] flex items-center gap-4 bg-[color:var(--bg-surface-alt)]">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" size={16} />
                        <input
                            className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-xl pl-10 pr-4 py-2 w-full text-sm font-bold text-[color:var(--text-primary)] focus:border-[color:var(--accent-teal)] outline-none transition-all"
                            placeholder="Find investigators by name, email, or hospital..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[color:var(--text-muted)] uppercase tracking-widest">Filter:</span>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-bold text-[color:var(--text-primary)] outline-none"
                        >
                            <option value="All">All Roles</option>
                            <option value="doctor">Pathologists</option>
                            <option value="researcher">Researchers</option>
                            <option value="admin">System Admins</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[color:var(--bg-surface-alt)] text-[color:var(--text-muted)] text-[10px] uppercase font-black tracking-widest">
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Investigator & Hospital</th>
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Clinical Role</th>
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Contact Email</th>
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Access Status</th>
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)] text-right">Management</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[color:var(--border-subtle)]">
                            <AnimatePresence>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-12 text-center text-[color:var(--text-muted)] font-black uppercase tracking-widest text-[10px]">No investigator artifacts found in clinical registry.</td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <motion.tr
                                            key={u.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="hover:bg-[color:var(--bg-surface-alt)] transition-colors"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[color:var(--text-primary)] text-sm">{u.full_name}</span>
                                                    <span className="text-[10px] text-[color:var(--text-secondary)] font-black uppercase tracking-widest">{u.hospital}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center px-[8px] py-[2px] rounded-md text-[9px] font-black uppercase tracking-widest border ${u.role === 'admin' ? 'bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger)] border-[color:var(--status-danger)]/20' :
                                                    u.role === 'researcher' ? 'bg-[color:var(--accent-blue-light)] text-[color:var(--accent-blue)] border-[color:var(--accent-blue)]/20' :
                                                        'bg-[color:var(--status-success-bg)] text-[color:var(--status-success)] border-[color:var(--status-success)]/20'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-[color:var(--text-secondary)] text-sm font-medium">{u.email}</td>
                                            <td className="px-6 py-5 border-t-[0px]">
                                                <span className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest ${u.is_approved ? 'text-[color:var(--status-success)]' : 'text-[color:var(--status-warning)]'}`} title={u.is_approved ? 'Approved' : 'Access Restricted'}>
                                                    <div className={`w-2 h-2 rounded-full ${u.is_approved ? 'bg-[color:var(--status-success)]' : 'bg-[color:var(--status-warning)]'} animate-pulse`} />
                                                    {u.is_approved ? 'Approved' : 'Restricted'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right border-t-[0px]">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleToggleStatus(u)}
                                                        className={`p-2 rounded-lg transition-all ${u.is_approved ? 'bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)] hover:brightness-110' : 'bg-[color:var(--status-success-bg)] text-[color:var(--status-success)] hover:brightness-110'} cursor-pointer`}
                                                        title={u.is_approved ? 'Restrict Clinical License' : 'Grant Full Node Access'}
                                                    >
                                                        <UserCheck size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingUser(u)}
                                                        className="p-2 rounded-lg hover:bg-[color:var(--bg-surface-alt)] text-[color:var(--text-secondary)] hover:text-[color:var(--accent-teal)] transition-all cursor-pointer"
                                                        title="Revise investigator Profile"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(u.id)}
                                                        className="p-2 rounded-lg hover:bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger)] transition-all cursor-pointer"
                                                        title="Revoke and Erase Registry Account"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Provision Modal */}
            <AnimatePresence>
                {showProvisionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="med-card w-full max-w-[500px] shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold text-[color:var(--text-primary)] flex items-center gap-2">
                                    <Shield className="text-[color:var(--accent-teal)]" />
                                    Provision Clinical User
                                </h2>
                                <button onClick={() => setShowProvisionModal(false)} className="text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleProvision} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-[color:var(--text-muted)] uppercase mb-1.5">Full Name</label>
                                    <input name="name" required className="med-input w-full" placeholder="Dr. Jane Doe" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[color:var(--text-muted)] uppercase mb-1.5">Clinical Role</label>
                                        <select name="role" className="med-input w-full">
                                            <option>Pathologist</option>
                                            <option>Researcher</option>
                                            <option>Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[color:var(--text-muted)] uppercase mb-1.5">Email</label>
                                        <input name="email" type="email" required className="med-input w-full" placeholder="jane@hospital.org" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[color:var(--text-muted)] uppercase mb-1.5">Affiliated Hospital</label>
                                    <input name="hospital" required className="med-input w-full" placeholder="Central Medical Hub" />
                                </div>
                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setShowProvisionModal(false)} className="med-btn-secondary flex-1">Cancel</button>
                                    <button type="submit" className="med-btn-primary flex-1">Provision Account</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Edit Modal (Mock) */}
            <AnimatePresence>
                {editingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="med-card w-full max-w-[400px]"
                        >
                            <h2 className="text-xl font-bold text-[color:var(--text-primary)] mb-4">Edit investigator Profile</h2>
                            <p className="text-sm text-[color:var(--text-muted)] mb-6">Updating details for <strong>{editingUser.name}</strong></p>
                            <div className="space-y-4">
                                <input className="med-input w-full" defaultValue={editingUser.name} placeholder="Name" />
                                <input className="med-input w-full" defaultValue={editingUser.email} placeholder="Email" />
                                <button
                                    onClick={() => {
                                        setEditingUser(null);
                                        addNotification('Profile Updated', 'Investigator record has been synchronized.', 'success');
                                    }}
                                    className="med-btn-primary w-full"
                                >
                                    Save Changes
                                </button>
                                <button onClick={() => setEditingUser(null)} className="med-btn-secondary w-full">Dismiss</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
