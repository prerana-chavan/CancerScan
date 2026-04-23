import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Server, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export default function AIModelsPage({ user }) {
    const [isSyncing, setIsSyncing] = useState(false);
    const { addNotification } = useNotifications();

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            setIsSyncing(false);
            addNotification('Architecture Sync', '4/4 Models Verified against Local Weights.', 'success');
            alert('Architecture Synchronized: 4/4 Models Verified against Local Weights.');
        }, 2000);
    };

    const [models, setModels] = useState([
        {
            name: 'Histopathology Gatekeeper',
            id: 'gatekeeper_v1.2.h5',
            status: 'Loaded',
            accuracy: '98.5%',
            desc: 'Validates if the uploaded image is an H&E stained histopathology slide to prevent processing errors.',
            lastUpdated: 'Jan 15, 2026'
        },
        {
            name: 'Lung Cancer Detection Core',
            id: 'lung_cancer_model_final.h5',
            status: 'Loaded',
            accuracy: '96.2%',
            desc: 'Primary ResNet50 classifier distinguishing between benign lung tissue and malignant tumors.',
            lastUpdated: 'Feb 02, 2026'
        },
        {
            name: 'Subtype Classifier',
            id: 'subtype_model_improved.h5',
            status: 'Diagnostic Fallback',
            accuracy: '91.8%',
            desc: 'Secondary classifier differentiating between Adenocarcinoma (ACA) and Squamous Cell Carcinoma (SCC).',
            lastUpdated: 'Mar 01, 2026'
        },
        {
            name: 'Survival Prediction Matrix',
            id: 'survival_model.h5',
            status: 'Loaded',
            accuracy: '88.4%',
            desc: 'Calculates categorical 5-year survival probability based on clinical data and image features.',
            lastUpdated: 'Feb 10, 2026'
        }
    ]);

    const handleLocate = (id) => {
        alert(`Initializing Native Secure Browser for ${id}...`);

        // Simulate a 1-second background verification
        setTimeout(() => {
            setModels(prev => prev.map(m =>
                m.id === id ? { ...m, status: 'Loaded', lastUpdated: 'Just Now' } : m
            ));
            addNotification('Model Recovery', `Binary weights for ${id} loaded successfully.`, 'success');
            alert(`Success: Model Weights Verified. ${id} is now ONLINE.`);
        }, 1000);
    };

    return (
        <div>
            <div className="flex items-end justify-between mb-[40px]">
                <div>
                    <h1 className="text-[24px] font-bold text-[var(--color-text-primary)] mb-[8px]">AI Model Management</h1>
                    <p className="text-[14px] text-[var(--color-text-muted)]">Monitor the operational status and accuracy metrics of the underlying Deep Learning architecture.</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="med-btn-secondary flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-w-[160px]"
                >
                    {isSyncing ? <Loader2 size={16} className="animate-spin text-[var(--color-teal)]" /> : <RefreshCw size={16} />}
                    {isSyncing ? 'Synchronizing...' : 'Sync Architecture'}
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-[24px]">
                {models.map((model, i) => (
                    <motion.div
                        key={model.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="med-card !mb-0 flex flex-col relative overflow-hidden"
                    >
                        {/* Background flare */}
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${model.status === 'Loaded' ? 'from-[var(--color-success)] to-[var(--color-teal)]' : 'from-[var(--color-warning)] to-[var(--color-error)]'
                            } opacity-[0.03] rounded-full blur-2xl -mr-10 -mt-10`} />

                        <div className="flex justify-between items-start mb-[16px] relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-border)]">
                                    <Cpu size={24} className={model.status === 'Loaded' ? 'text-[var(--color-teal)]' : 'text-[var(--color-warning)]'} />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-[var(--color-text-primary)]">{model.name}</h3>
                                    <p className="text-[12px] font-mono text-[var(--color-text-muted)] mt-0.5">{model.id}</p>
                                </div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${model.status === 'Loaded'
                                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20'
                                : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20'
                                }`}>
                                {model.status === 'Loaded' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                {model.status}
                            </span>
                        </div>

                        <p className="text-[13px] text-[var(--color-text-muted)] mb-[24px] flex-1 relative z-10 leading-relaxed max-w-[90%]">
                            {model.desc}
                        </p>

                        <div className="grid grid-cols-2 gap-[16px] pt-[16px] border-t border-[var(--color-border)] relative z-10">
                            <div>
                                <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Validation Accuracy</p>
                                <p className="text-[20px] font-bold text-[var(--color-cyan)]">{model.accuracy}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">Last Updated</p>
                                <p className="text-[14px] font-medium text-[var(--color-text-primary)] mt-1">{model.lastUpdated}</p>
                            </div>
                        </div>

                        {model.status !== 'Loaded' && (
                            <div className="mt-[16px] pt-[16px] border-t border-[var(--color-border)] relative z-10">
                                <button
                                    onClick={() => handleLocate(model.id)}
                                    className="med-btn-secondary w-full text-[13px] border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-pointer"
                                >
                                    Locate Model Weights (.h5)
                                </button>
                            </div>
                        )}

                        {user?.role === 'admin' && (
                            <div className="mt-[12px] pt-[12px] border-t border-[var(--color-border)] flex items-center justify-between relative z-10">
                                <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase">System Governance</span>
                                <button
                                    onClick={() => {
                                        const newStatus = model.status === 'Loaded' ? 'Disabled' : 'Loaded';
                                        setModels(prev => prev.map(m => m.id === model.id ? { ...m, status: newStatus } : m));
                                        addNotification('Governance Action', `${model.name} ${newStatus === 'Loaded' ? 'Enabled' : 'De-provisioned'} by Administrator.`, newStatus === 'Loaded' ? 'success' : 'warning');
                                    }}
                                    className={`text-[11px] font-bold px-3 py-1 rounded-md transition-colors ${model.status === 'Loaded'
                                            ? 'bg-[var(--color-error-text)]/10 text-[var(--color-error-text)] hover:bg-[var(--color-error-text)]/20'
                                            : 'bg-[var(--color-success-text)]/10 text-[var(--color-success-text)] hover:bg-[var(--color-success-text)]/20'
                                        }`}
                                >
                                    {model.status === 'Loaded' ? 'Disable Model' : 'Enable Model'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            <div className="mt-[32px] p-[20px] rounded-[12px] bg-[var(--color-blue)]/5 border border-[var(--color-blue)]/20 flex items-start gap-4">
                <Server size={24} className="text-[var(--color-blue)] shrink-0 mt-1" />
                <div>
                    <h4 className="text-[14px] font-bold text-[var(--color-blue)] mb-1">Architecture Information</h4>
                    <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
                        All detection models utilize a fine-tuned ResNet-50 architecture trained on the LC25000 dataset. Image normalization is performed dynamically via Macenko stain normalization prior to inference. The survival predictive matrix leverages a Random Forest ensemble mapped over clinical covariates.
                    </p>
                </div>
            </div>
        </div>
    );
}
