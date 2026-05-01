import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Microscope, Search, RefreshCw, Trash2, Calendar, Building2, User, ShieldAlert, CheckCircle, Loader2, Activity } from 'lucide-react';
import { getPatients, searchPatients, deletePatient, adminGetPatients } from '../services/api';
import { useNotifications } from '../context/NotificationContext';

export default function ScanMonitoringPage({ user }) {
    const { addNotification } = useNotifications();
    const [scans, setScans] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleteId, setDeleteId] = useState(null);

    const loadScans = useCallback(async (manual = false) => {
        setLoading(true);
        if (manual) await new Promise(resolve => setTimeout(resolve, 800));

        try {
            // Admin uses a separate endpoint to see ALL patients across all doctors
            const data = searchQuery
                ? await searchPatients(searchQuery)
                : await adminGetPatients();

            const results = data.patients || (Array.isArray(data) ? data : []);
            setScans(results);

            if (manual) {
                addNotification('Data Synchronized', 'Scan registry updated with latest clinical uploads.', 'success');
            }
        } catch (err) {
            console.error('Registry Sync Error:', err);
            addNotification('Registry Warning', 'Failed to synchronize with clinical node. Remote registry offline.', 'error');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, addNotification]);

    useEffect(() => { loadScans(); }, [loadScans]);

    const handleDelete = async (id) => {
        if (!window.confirm('CRITICAL: Are you sure you want to permanently delete this clinical scan record? This action is logged.')) return;

        setDeleteId(id);
        try {
            await deletePatient(id);
            setScans(prev => prev.filter(p => p.id !== id));
            addNotification('Record Purged', 'Scan artifact permanently removed from registry.', 'info');
        } catch {
            addNotification('Action Blocked', 'Failed to erase scan record. Node permissions required.', 'error');
        } finally {
            setDeleteId(null);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black text-[color:var(--text-primary)] tracking-tight uppercase font-display">Operational Monitoring</h2>
                    <p className="text-xs font-bold text-[color:var(--text-secondary)] uppercase tracking-widest">Real-time oversight of clinical uploads and analysis pipeline</p>
                </div>
                <div className="px-4 py-2 bg-[color:var(--bg-surface-alt)] border border-[color:var(--border-subtle)] rounded-lg text-xs text-[color:var(--text-secondary)] font-black uppercase tracking-widest">
                    Registry Sector: <span className="text-[color:var(--accent-teal)]">{scans.length} Node Artifacts</span>
                </div>
            </div>

            <div className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-[color:var(--border-subtle)] flex items-center gap-4 bg-[color:var(--bg-surface-alt)]">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" size={16} />
                        <input
                            className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-xl pl-10 pr-4 py-2 w-full text-sm font-bold text-[color:var(--text-primary)] focus:border-[color:var(--accent-teal)] outline-none transition-all"
                            placeholder="Filter by Scan ID, Patient ID, or Pathologist..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => loadScans(true)}
                        disabled={loading}
                        className="bg-[color:var(--bg-surface-alt)] border border-[color:var(--border-subtle)] rounded-xl px-4 py-2 text-xs font-bold text-[color:var(--accent-teal)] hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50 min-w-[130px]"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        {loading ? 'Syncing...' : 'Sync Data'}
                    </button>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[color:var(--bg-surface-alt)] text-[color:var(--text-muted)] text-[10px] uppercase font-black tracking-widest">
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Clinical Patient</th>
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Registry ID</th>
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Status</th>
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Priority</th>
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)]">Telemetry</th>
                                <th className="px-6 py-4 border-b border-[color:var(--border-subtle)] text-right">Monitoring</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[color:var(--border-subtle)]">
                            <AnimatePresence mode='wait'>
                                {loading && scans.length === 0 ? (
                                    <tr key="loading">
                                        <td colSpan="6" className="py-24 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <Loader2 size={32} className="animate-spin text-[color:var(--accent-teal)] opacity-50" />
                                                <p className="text-xs font-black text-[color:var(--text-muted)] uppercase tracking-widest animate-pulse">Synchronizing with Clinical Node...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : scans.length === 0 ? (
                                    <tr key="empty">
                                        <td colSpan="6" className="py-24 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 text-[color:var(--text-muted)]">
                                                <ShieldAlert size={32} className="opacity-20" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">No monitored scans found in this registry sector.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    scans.map((scan) => (
                                        <motion.tr
                                            key={scan.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="hover:bg-[color:var(--bg-surface-alt)] transition-colors"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-[color:var(--text-primary)] text-sm">{scan.patient_id}</span>
                                                        <span className="px-1.5 py-0.5 rounded bg-[color:var(--accent-teal-light)] text-[9px] text-[color:var(--accent-teal)] font-black border border-[color:var(--accent-teal)]/20 uppercase tracking-widest">PATIENT</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <User size={10} className="text-[color:var(--text-muted)]" />
                                                        <span className="text-[10px] text-[color:var(--text-secondary)] font-bold uppercase tracking-tight">Investigator: {scan.doctor_name || 'System Generated'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Building2 size={10} className="text-[color:var(--text-muted)]" />
                                                        <span className="text-[10px] text-[color:var(--text-muted)] font-black uppercase tracking-widest">{scan.hospital_name || scan.doctor_hospital || 'Central Registry Node'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 font-technical text-[color:var(--accent-teal)] font-black text-[11px] tracking-widest">
                                                <div className="bg-[color:var(--accent-teal-light)] border border-[color:var(--accent-teal)]/20 rounded px-2 py-1 inline-block">
                                                    #{scan.id}
                                                </div>
                                            </td>
                                            <td className="px-6">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${scan.status === 'Completed' ? 'bg-[color:var(--status-success-bg)] text-[color:var(--status-success)] border-[color:var(--status-success)]/20' :
                                                    scan.status === 'In Progress' ? 'bg-[color:var(--accent-blue-light)] text-[color:var(--accent-blue)] border-[color:var(--accent-blue)]/20' :
                                                        'bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)] border-[color:var(--status-warning)]/20'
                                                    }`}>
                                                    <Activity size={10} className={scan.status === 'In Progress' ? 'animate-pulse' : ''} />
                                                    {scan.status}
                                                </span>
                                            </td>
                                            <td className="px-6">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${scan.priority === 'Urgent' ? 'text-[color:var(--status-danger)] bg-[color:var(--status-danger-bg)] border border-[color:var(--status-danger)]/20' : 'text-[color:var(--text-muted)]'}`}>
                                                    {scan.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 font-technical text-[color:var(--text-muted)] text-[10px] font-black uppercase tracking-widest">{scan.telemetry}</td>
                                            <td className="text-right px-6">
                                                <button
                                                    onClick={() => handleDelete(scan.id)}
                                                    disabled={deleteId === scan.id}
                                                    className="p-2 rounded-lg hover:bg-[color:var(--status-danger-bg)] text-[color:var(--text-muted)] hover:text-[color:var(--status-danger)] transition-all cursor-pointer disabled:opacity-30"
                                                    title="Revoke and Erase Scan Artifact"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
}
