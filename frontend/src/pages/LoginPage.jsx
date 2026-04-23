import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Eye, EyeOff, Loader2, X, Send, CheckCircle2 } from 'lucide-react';
import ParticleBackground from '../components/ParticleBackground';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgotModal, setShowForgotModal] = useState(false);
    const navigate = useNavigate();

    const [loginMode, setLoginMode] = useState('doctor'); // 'doctor' or 'admin'

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Basic frontend validation
        if (!email || !password) return setError('Please enter both email and password');

        setLoading(true);

        try {
            const result = await login(email, password);
            if (result.success) {
                if (result.user.role === 'admin') {
                    navigate('/admin/dashboard'); // → Admin Dashboard
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(result.error || result.message || 'Invalid email or password');
            }
        } catch (err) {
            setError('Server connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative w-full h-screen flex overflow-hidden bg-[var(--color-bg)] transition-colors duration-300">
            <ParticleBackground />

            {/* Left — Branding */}
            <div className="hidden lg:flex w-[55%] flex-col justify-center items-center relative z-10 px-12">
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.7 }}
                    className="max-w-[460px] text-center"
                >
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <Activity size={48} className="text-[var(--color-teal)]" />
                        <h1 className="text-[32px] font-bold text-[var(--color-text-primary)]">CancerScan</h1>
                    </div>
                    <p className="text-[var(--color-text-muted)] text-[16px] leading-relaxed">
                        Sign in to access secure patient records, run deep learning histopathology analysis, and generate clinical reports.
                    </p>
                </motion.div>
            </div>

            {/* Right — Login Card */}
            <div className="w-full lg:w-[45%] h-full flex items-center justify-center relative z-10 lg:border-l lg:border-[var(--color-border)] bg-[var(--color-bg)]/50 backdrop-blur-sm px-6">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="med-card w-full max-w-[420px] p-[28px] !mb-0 shadow-2xl"
                >
                    {/* Mobile brand */}
                    <div className="flex items-center gap-3 mb-6 lg:hidden justify-center">
                        <Activity size={28} className="text-[var(--color-teal)]" />
                        <span className="text-[20px] font-bold text-[var(--color-text-primary)]">CancerScan</span>
                    </div>

                    <h2 className="text-[20px] font-bold text-[var(--color-text-primary)] mb-1">Welcome Back</h2>
                    <p className="text-[14px] text-[var(--color-text-muted)] mb-8">Sign in to your clinical dashboard</p>

                    {/* Tab Toggle */}
                    <div style={{
                        display:       'flex',
                        background:    '#111827',
                        borderRadius:  '10px',
                        padding:       '4px',
                        marginBottom:  '28px',
                        border:        '1px solid #1e3a5f',
                    }}>
                        {['doctor', 'admin'].map(mode => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setLoginMode(mode)}
                                style={{
                                    flex:            1,
                                    padding:         '10px',
                                    background:      loginMode === mode
                                                        ? '#06b6d4' : 'transparent',
                                    color:           loginMode === mode
                                                        ? '#0a0f1e' : '#64748b',
                                    border:          'none',
                                    borderRadius:    '8px',
                                    fontWeight:      700,
                                    fontSize:        '13px',
                                    cursor:          'pointer',
                                    transition:      'all 0.2s',
                                    letterSpacing:   '1px',
                                }}
                            >
                                {mode === 'doctor' ? '👨⚕️ DOCTOR' : '🔐 ADMIN'}
                            </button>
                        ))}
                    </div>

                    {loginMode === 'admin' && (
                        <div style={{
                            padding:      '10px 14px',
                            background:   '#06b6d411',
                            border:       '1px solid #06b6d433',
                            borderRadius: '8px',
                            fontSize:     '12px',
                            color:        '#06b6d4',
                            marginBottom: '16px',
                        }}>
                            🔐 Admin Portal — restricted access
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-[16px]">
                        {/* Email Address */}
                        <div>
                            <label className="block text-[12px] font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Email Address</label>
                            <input
                                type="email"
                                className={`med-input ${error.includes('email') ? 'border-red-500/50' : ''}`}
                                placeholder="dr.name@hospital.org"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[12px] font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    className={`med-input pr-10 ${error.includes('Password') ? 'border-red-500/50' : ''}`}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                    onClick={() => setShowPw(!showPw)}
                                >
                                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message Area */}
                        <AnimatePresence>
                            {error && !error.includes('pending_approval') && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="pt-2"
                                >
                                    <p className="text-[12px] text-[var(--color-error)] font-medium">
                                        {error}
                                    </p>
                                </motion.div>
                            )}
                            {error?.includes('pending_approval') && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="pt-2"
                                >
                                    <div style={{
                                        padding:      '14px',
                                        background:   '#f59e0b22',
                                        border:       '1px solid #f59e0b44',
                                        borderRadius: '8px',
                                        color:        '#f59e0b',
                                        fontSize:     '13px',
                                    }}>
                                        ⏳ Your account is pending admin approval.
                                        Please wait for the administrator to
                                        activate your account before logging in.
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="med-btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    '→ Access Dashboard'
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-[var(--color-border)] flex flex-col items-center gap-3">
                        <button
                            onClick={() => navigate('/forgot-password')}
                            className="text-[13px] text-[var(--color-blue)] hover:text-[var(--color-cyan)] transition-colors cursor-pointer"
                        >
                            Forgot password?
                        </button>
                        <p className="text-center text-[13px] text-[var(--color-text-muted)]">
                            Already have an account? Sign in →{' '}
                            <Link to="/register" className="text-[var(--color-teal)] hover:underline font-medium">
                                Request Clinical Access
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Forgot Password Modal */}
            <AnimatePresence>
                {showForgotModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                        <ForgotPasswordModal onClose={() => setShowForgotModal(false)} />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ForgotPasswordModal({ onClose }) {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulation for visual feedback
        setTimeout(() => {
            setSent(true);
            setLoading(false);
        }, 1500);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-[400px] bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-xl p-6 shadow-2xl relative"
        >
            <button onClick={onClose} className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white">
                <X size={20} />
            </button>

            {sent ? (
                <div className="text-center py-4">
                    <div className="flex justify-center mb-4">
                        <CheckCircle2 size={48} className="text-[var(--color-teal)]" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Check your email</h3>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">
                        If this email exists in our registry, a password reset link has been sent.
                    </p>
                    <button onClick={onClose} className="med-btn-primary w-full py-2">Got it</button>
                </div>
            ) : (
                <>
                    <h3 className="text-lg font-bold text-white mb-2">Reset Password</h3>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">Enter your registered email to receive a reset link.</p>
                    <form onSubmit={handleSend} className="space-y-4">
                        <input
                            type="email"
                            className="med-input"
                            placeholder="Enter your registered email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading} className="med-btn-primary w-full py-2.5 flex items-center justify-center gap-2">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                </>
            )}
        </motion.div>
    );
}
