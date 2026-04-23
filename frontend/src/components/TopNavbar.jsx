import { Bell, UserCircle, X, Clock, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function TopNavbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { notifications, unreadCount, markAsRead } = useNotifications();
    const [showNotifs, setShowNotifs] = useState(false);

    // Map paths to readable strings
    const pathNameMap = {
        '/dashboard': 'System Overview',
        '/analysis': 'Diagnostic Workspace',
        '/patients': 'Patient Intelligence',
        '/reports': 'Clinical Reports',
        '/settings': 'System Settings',
        '/admin/dashboard': 'Admin Command Center',
        '/admin/users': 'User Governance',
        '/admin/audit': 'Security Traceability',
    };

    const pageTitle = pathNameMap[location.pathname] || 'CancerScan Workspace';

    return (
        <header className="h-[64px] px-[24px] flex items-center justify-between bg-[color:var(--bg-surface)]/80 backdrop-blur-md border-b border-[color:var(--border-subtle)] shadow-sm relative z-30 transition-all duration-300">

            {/* Left side (Context) */}
            <div className="flex items-center gap-4">
                <h1 className="text-[20px] font-bold text-[color:var(--text-primary)] tracking-tight font-display">{pageTitle}</h1>
            </div>

            {/* Right side (Controls) */}
            <div className="ml-auto flex items-center gap-6">

                {/* Status Indicator */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[color:var(--status-success)]/10 border border-[color:var(--status-success)]/20">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--status-success)] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--status-success)]"></span>
                    </span>
                    <span className="text-[10px] font-extrabold text-[color:var(--status-success)] uppercase tracking-widest font-display">Secure Connection</span>
                </div>

                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowNotifs(!showNotifs);
                            if (!showNotifs) markAsRead();
                        }}
                        className="relative p-1 text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] transition-colors cursor-pointer"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-0.5 right-1 h-2 w-2 rounded-full bg-[color:var(--status-danger)] border-[1.5px] border-[color:var(--bg-surface)]" />
                        )}
                    </button>

                    <AnimatePresence>
                        {showNotifs && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-3 w-[360px] bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] rounded-xl shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="p-4 border-b border-[color:var(--border-subtle)] flex items-center justify-between bg-[color:var(--bg-surface-alt)]">
                                        <h3 className="text-[14px] font-bold text-[color:var(--text-primary)] uppercase tracking-wider">Clinical Alerts</h3>
                                        <button onClick={() => setShowNotifs(false)} className="text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"><X size={16} /></button>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-[color:var(--text-muted)]">No active alerts.</div>
                                        ) : (
                                            notifications.map((notif) => (
                                                <div key={notif.id} className="p-4 border-b border-[color:var(--border-subtle)]/50 hover:bg-[color:var(--bg-surface-alt)]/30 transition-colors">
                                                    <div className="flex gap-3">
                                                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${notif.type === 'success' ? 'bg-[color:var(--status-success)]' :
                                                            notif.type === 'error' ? 'bg-[color:var(--status-danger)]' : 'bg-[color:var(--status-warning)]'
                                                            }`} />
                                                        <div className="flex-1">
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <h4 className="text-[13px] font-bold text-[color:var(--text-primary)]">{notif.title}</h4>
                                                                <span className="text-[10px] text-[color:var(--text-muted)] flex items-center gap-1"><Clock size={10} />{notif.time}</span>
                                                            </div>
                                                            <p className="text-[12px] text-[color:var(--text-muted)] leading-tight">{notif.message}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="p-3 bg-[color:var(--bg-surface-alt)] text-center border-t border-[color:var(--border-subtle)]">
                                        <button
                                            onClick={() => {
                                                setShowNotifs(false);
                                                navigate('/admin/audit');
                                            }}
                                            className="text-[11px] font-bold text-[color:var(--accent-teal)] uppercase tracking-widest hover:text-[color:var(--accent-teal)] transition-colors cursor-pointer"
                                        >
                                            View Traceability Logs
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* User Identity Indicator */}
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/settings')}>
                    <div className="flex flex-col items-end hidden sm:flex">
                        <span className="text-[12px] font-bold text-[color:var(--text-primary)] leading-none mb-1">{user?.fullName || 'Clinical Professional'}</span>
                        <div className="flex items-center gap-1">
                            <ShieldCheck size={10} className="text-[color:var(--accent-teal)]" />
                            <span className="text-[9px] font-bold text-[color:var(--text-muted)] uppercase tracking-widest">Authenticated</span>
                        </div>
                    </div>
                    <UserCircle size={24} className="text-[color:var(--text-muted)] group-hover:text-[color:var(--text-primary)] transition-colors" />
                </div>
            </div>
        </header>
    );
}
