import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', glow = false, ...props }) {
    return (
        <motion.div
            className={`glass-card ${glow ? 'glow-cyan' : ''} ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            {...props}
        >
            {children}
        </motion.div>
    );
}
