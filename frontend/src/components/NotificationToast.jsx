import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Clock } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationToast() {
    const { notifications } = useNotifications();
    const [activeToast, setActiveToast] = useState(null);

    // Watch for new notifications and show the most recent one as a toast
    useEffect(() => {
        if (notifications.length > 0) {
            const latest = notifications[0];
            setActiveToast(latest);

            // Auto-hide after 4 seconds
            const timer = setTimeout(() => {
                setActiveToast(null);
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [notifications]);

    return (
        <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
            <AnimatePresence>
                {activeToast && (
                    <motion.div
                        key={activeToast.id}
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className="pointer-events-auto min-w-[320px] max-w-[400px] bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] overflow-hidden flex"
                    >
                        {/* Status Strip */}
                        <div className={`w-1.5 shrink-0 ${activeToast.type === 'success' ? 'bg-[var(--color-success)]' :
                                activeToast.type === 'error' ? 'bg-[var(--color-error)]' :
                                    activeToast.type === 'warning' ? 'bg-orange-500' : 'bg-[var(--color-info)]'
                            }`} />

                        <div className="p-4 flex gap-4 items-start flex-1">
                            <div className={`mt-0.5 p-2 rounded-lg ${activeToast.type === 'success' ? 'bg-[var(--color-success-text)]/10 text-[var(--color-success-text)]' :
                                    activeToast.type === 'error' ? 'bg-[var(--color-error-text)]/10 text-[var(--color-error-text)]' :
                                        'bg-[var(--color-info-text)]/10 text-[var(--color-info-text)]'
                                }`}>
                                {activeToast.type === 'success' ? <CheckCircle2 size={18} /> :
                                    activeToast.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="text-[14px] font-bold text-[var(--color-text-primary)] leading-tight">{activeToast.title}</h4>
                                    <button
                                        onClick={() => setActiveToast(null)}
                                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors p-1"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <p className="text-[12px] text-[var(--color-text-muted)] leading-relaxed">{activeToast.message}</p>

                                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-text-muted)]/50 uppercase tracking-widest">
                                    <Clock size={10} />
                                    Clinical Event Logged
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
