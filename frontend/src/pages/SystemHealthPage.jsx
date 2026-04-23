import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartPulse, CheckCircle2, AlertCircle, Server, Database, Globe, Cpu, Activity, RefreshCw, CheckCircle } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function SystemHealthPage() {
    const { addNotification } = useNotifications();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [alertResolved, setAlertResolved] = useState(false);
    const [systems, setSystems] = useState([
        { name: 'Core Inference Server', status: 'Online', latency: '42ms', icon: Server, health: 100, load: '12%' },
        { name: 'Clinical Records DB', status: 'Online', latency: '12ms', icon: Database, health: 100, load: '5%' },
        { name: 'Deep Learning Cluster', status: 'Warning', latency: '850ms', icon: Cpu, health: 75, load: '94%' },
        { name: 'Pathology Registry API', status: 'Online', latency: '120ms', icon: Globe, health: 98, load: '22%' },
    ]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            setSystems(prev => prev.map(s => ({
                ...s,
                latency: `${Math.floor(Math.random() * 100) + 10}ms`,
                load: `${Math.floor(Math.random() * 50) + 5}%`
            })));
            addNotification('Telemetry Calibrated', 'System health metrics updated from cluster nodes.', 'success');
        }, 1500);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
        >
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-black text-[color:var(--text-primary)] tracking-tight uppercase font-display">System Integrity</h2>
                    <p className="text-xs font-bold text-[color:var(--text-secondary)] uppercase tracking-widest">Real-time health telemetry across clinical infrastructure nodes</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="px-6 py-2.5 rounded-xl border border-[color:var(--border-subtle)] text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-surface-alt)] hover:text-[color:var(--text-primary)] font-bold text-xs transition-all flex items-center gap-2 group disabled:opacity-50 cursor-pointer uppercase tracking-widest"
                >
                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    Recalibrate Telemetry
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {systems.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <motion.div
                            key={s.name}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-[color:var(--bg-surface)] border border-[color:var(--border-subtle)] p-6 rounded-2xl group hover:border-[color:var(--accent-blue)]/50 transition-all shadow-[var(--shadow-card)]"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-2 rounded-lg ${s.status === 'Online' ? 'bg-[color:var(--status-success-bg)] text-[color:var(--status-success)]' : 'bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]'}`}>
                                    <Icon size={20} />
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${s.status === 'Online' ? 'bg-[color:var(--status-success-bg)] text-[color:var(--status-success)] border-[color:var(--status-success)]/20' : 'bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)] border-[color:var(--status-warning)]/20'}`}>
                                    {s.status}
                                </span>
                            </div>
                            <h3 className="font-bold text-[color:var(--text-primary)] text-sm mb-1 uppercase tracking-tight">{s.name}</h3>
                            <div className="flex items-center justify-between text-[10px] font-black text-[color:var(--text-muted)] uppercase tracking-widest">
                                <span>Lat: {s.latency}</span>
                                <span>Load: {s.load}</span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <AnimatePresence>
                {!alertResolved && (
                    <motion.div
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="bg-[color:var(--status-danger-bg)]/50 border border-[color:var(--status-danger)]/20 rounded-2xl p-6 flex items-center gap-6"
                    >
                        <div className="p-4 rounded-full bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger)] animate-bounce">
                            <AlertCircle size={32} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-[color:var(--status-danger)] mb-1 uppercase tracking-tight">Compute Infrastructure Alert</h3>
                            <p className="text-sm text-[color:var(--text-secondary)] max-w-2xl leading-relaxed font-bold">
                                The **Deep Learning Cluster** is operating at 94% load. AI analysis requests may experience queuing delays. Automated node provisioning is currently in progress via System Governance.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                setAlertResolved(true);
                                addNotification('Alert Resolved', 'Infrastructure notification acknowledged. Auto-scaling initiated.', 'info');
                            }}
                            className="px-6 py-2.5 rounded-xl bg-[color:var(--status-danger)] text-white hover:opacity-90 font-bold text-xs transition-all flex items-center gap-2 group cursor-pointer uppercase tracking-widest"
                        >
                            <CheckCircle size={16} />
                            Resolve Alert
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
