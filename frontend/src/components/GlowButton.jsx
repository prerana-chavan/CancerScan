import { motion } from 'framer-motion';

export default function GlowButton({
    children,
    onClick,
    variant = 'cyan',    // cyan | purple | green | red
    className = '',
    disabled = false,
    type = 'button',
    fullWidth = false,
}) {
    const colors = {
        cyan: { bg: '#06B6D4', hover: '#22D3EE', shadow: 'rgba(6,182,212,0.4)' },
        purple: { bg: '#7C3AED', hover: '#A78BFA', shadow: 'rgba(124,58,237,0.4)' },
        green: { bg: '#10B981', hover: '#34D399', shadow: 'rgba(16,185,129,0.4)' },
        red: { bg: '#EF4444', hover: '#F87171', shadow: 'rgba(239,68,68,0.4)' },
    };
    const c = colors[variant] || colors.cyan;

    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`neon-btn ${fullWidth ? 'w-full' : ''} ${className}`}
            style={{
                background: c.bg,
                color: '#070B1A',
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            whileHover={!disabled ? {
                scale: 1.02,
                boxShadow: `0 0 25px ${c.shadow}, 0 0 60px ${c.shadow}`,
                background: c.hover,
            } : {}}
            whileTap={!disabled ? { scale: 0.98 } : {}}
            transition={{ duration: 0.2 }}
        >
            <span className="font-semibold">{children}</span>
        </motion.button>
    );
}
