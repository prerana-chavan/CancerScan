import { motion } from 'framer-motion';

export default function ResultCard({ result }) {
    if (!result) return null;

    const isCancer = result.status?.includes('Cancer Detected');
    const statusColor = isCancer ? 'var(--color-red)' : 'var(--color-green)';
    const statusGlow = isCancer ? 'glow-red' : 'glow-green';

    const rows = [
        { label: 'Detection Status', value: result.status, color: statusColor },
        { label: 'Confidence', value: `${result.confidence}%`, color: 'var(--color-cyan)' },
        { label: 'Subtype', value: result.subtype || 'N/A', color: 'var(--color-purple-glow)' },
        { label: 'Subtype Confidence', value: result.subtype_confidence ? `${result.subtype_confidence}%` : 'N/A', color: 'var(--color-purple-glow)' },
        { label: '5-Year Survival', value: result.survival || 'N/A', color: 'var(--color-cyan-glow)' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
        >
            {/* Status Badge */}
            <div className={`flex items-center gap-3 p-4 rounded-xl ${statusGlow}`}
                style={{ background: `${statusColor}15`, border: `1px solid ${statusColor}40` }}>
                <div className="w-3 h-3 rounded-full pulse-ring" style={{ background: statusColor }} />
                <span className="font-bold text-lg" style={{ color: statusColor }}>
                    {isCancer ? '⚠️ Cancer Detected' : '✅ Benign — No Cancer Detected'}
                </span>
            </div>

            {/* Result Rows */}
            <div className="space-y-2">
                {rows.map((row, i) => (
                    <motion.div
                        key={row.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between py-3 px-4 rounded-lg"
                        style={{ background: 'rgba(30, 41, 59, 0.5)' }}
                    >
                        <span className="text-sm text-[var(--color-muted)] font-medium">{row.label}</span>
                        <span className="text-sm font-bold" style={{ color: row.color }}>{row.value}</span>
                    </motion.div>
                ))}
            </div>

            {/* Confidence Bar */}
            {result.confidence > 0 && (
                <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--color-muted)]">Model Confidence</span>
                        <span className="text-[var(--color-cyan)]">{result.confidence}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--color-bg-mid)] overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, var(--color-cyan), ${statusColor})` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${result.confidence}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            )}

            {/* Patient ID */}
            {result.patient_id && (
                <p className="text-xs text-[var(--color-muted)] mt-2">
                    Record saved — Patient ID: <span className="text-[var(--color-cyan)]">{result.patient_id}</span>
                </p>
            )}
        </motion.div>
    );
}
