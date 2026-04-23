import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
    const { register } = useAuth();
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        medicalLicenseId: '',
        hospital: 'City General Hospital',
        specialization: 'Histopathology'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [statusIdx, setStatusIdx] = useState(0);
    const navigate = useNavigate();

    const bgRef = useRef(null);
    const cellRef = useRef(null);
    const cursorRef = useRef(null);
    const cursor2Ref = useRef(null);

    const STATUS_MSGS = ['All Systems Online', 'Neural Engine Active', 'Scanning Node…', 'HIPAA Secure', 'Analysis Ready'];

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    // Rotate status messages
    useEffect(() => {
        const interval = setInterval(() => setStatusIdx(i => (i + 1) % STATUS_MSGS.length), 4200);
        return () => clearInterval(interval);
    }, []);

    // Custom cursor
    useEffect(() => {
        let mx = 0, my = 0, rx = 0, ry = 0;
        const onMove = (e) => { mx = e.clientX; my = e.clientY; };
        document.addEventListener('mousemove', onMove);
        let raf;
        const loop = () => {
            rx += (mx - rx) * 0.1;
            ry += (my - ry) * 0.1;
            if (cursorRef.current) { cursorRef.current.style.left = mx + 'px'; cursorRef.current.style.top = my + 'px'; }
            if (cursor2Ref.current) { cursor2Ref.current.style.left = rx + 'px'; cursor2Ref.current.style.top = ry + 'px'; }
            raf = requestAnimationFrame(loop);
        };
        loop();
        return () => { document.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
    }, []);

    // Background canvas — hexagonal grid + floating particles
    useEffect(() => {
        const canvas = bgRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
        resize();
        window.addEventListener('resize', resize);

        const pts = Array.from({ length: 85 }, () => ({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.18, vy: -(Math.random() * 0.3 + 0.05),
            r: Math.random() * 1.5 + 0.3, a: Math.random() * 0.35 + 0.05,
            ph: Math.random() * Math.PI * 2, ps: 0.007 + Math.random() * 0.012,
            t: Math.random() < 0.65 ? 0 : 1
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const g1 = ctx.createRadialGradient(0, canvas.height, 0, 0, canvas.height, 500);
            g1.addColorStop(0, 'rgba(6,182,212,0.06)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g1; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const g2 = ctx.createRadialGradient(canvas.width * 0.7, canvas.height * 0.2, 0, canvas.width * 0.7, canvas.height * 0.2, 380);
            g2.addColorStop(0, 'rgba(8,145,178,0.05)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g2; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const gs = 70;
            ctx.strokeStyle = 'rgba(6,182,212,0.025)'; ctx.lineWidth = 0.5;
            for (let col = 0; col * gs < canvas.width + gs; col++) {
                for (let row = 0; row * gs < canvas.height + gs; row++) {
                    const cx = col * gs + (row % 2 ? gs / 2 : 0), cy = row * gs;
                    ctx.beginPath();
                    for (let s = 0; s < 6; s++) {
                        const a = Math.PI / 3 * s - Math.PI / 6;
                        const px = cx + gs / 2.45 * Math.cos(a), py = cy + gs / 2.45 * Math.sin(a);
                        s ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
                    }
                    ctx.closePath(); ctx.stroke();
                }
            }
            pts.forEach(p => {
                p.ph += p.ps; p.x += p.vx; p.y += p.vy;
                const pa = p.a * (0.4 + 0.6 * Math.sin(p.ph));
                const pr = p.r * (0.8 + 0.3 * Math.sin(p.ph));
                const col = [6, 182, 212];
                ctx.shadowBlur = pr * 4; ctx.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},.55)`;
                ctx.beginPath(); ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${pa})`; ctx.fill(); ctx.shadowBlur = 0;
                if (p.y < -8) { p.y = canvas.height + 8; p.x = Math.random() * canvas.width; }
            });
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    // Cell strip canvas
    useEffect(() => {
        const cc = cellRef.current;
        if (!cc) return;
        const cx = cc.getContext('2d');
        let cw, ch, animId;
        const dpr = window.devicePixelRatio || 1;
        const resize = () => { cw = cc.offsetWidth; ch = cc.offsetHeight; cc.width = cw * dpr; cc.height = ch * dpr; cx.scale(dpr, dpr); };
        resize();
        const ro = new ResizeObserver(resize); ro.observe(cc);

        const rx3 = (p, a) => ({ x: p.x, y: p.y * Math.cos(a) - p.z * Math.sin(a), z: p.y * Math.sin(a) + p.z * Math.cos(a) });
        const ry3 = (p, a) => ({ x: p.x * Math.cos(a) + p.z * Math.sin(a), y: p.y, z: -p.x * Math.sin(a) + p.z * Math.cos(a) });
        const pj = (p, f, ox, oy) => { const z = p.z + f; return { x: ox + p.x * f / z, y: oy + p.y * f / z, s: f / z }; };

        let rot = 0;
        const draw = () => {
            cx.clearRect(0, 0, cw, ch);
            const COUNT = 4;
            for (let ci = 0; ci < COUNT; ci++) {
                const ox = cw * (ci + 0.5) / COUNT, oy = ch / 2, sc = 34, fov = 200;
                const ry = rot + ci * 1.5;
                const atm = cx.createRadialGradient(ox, oy, 0, ox, oy, sc * 2);
                atm.addColorStop(0, 'rgba(6,182,212,0.07)'); atm.addColorStop(1, 'rgba(0,0,0,0)');
                cx.beginPath(); cx.arc(ox, oy, sc * 2, 0, Math.PI * 2); cx.fillStyle = atm; cx.fill();
                for (let i = 0; i < 18; i++) {
                    const phi = Math.acos(1 - 2 * (i + 0.5) / 18), theta = Math.PI * (1 + Math.sqrt(5)) * i;
                    let p = { x: Math.sin(phi) * Math.cos(theta), y: Math.sin(phi) * Math.sin(theta), z: Math.cos(phi) };
                    p = ry3(p, ry);
                    const pp = pj({ x: p.x * sc, y: p.y * sc, z: p.z * sc }, fov, ox, oy);
                    cx.beginPath(); cx.arc(pp.x, pp.y, 1.5 * pp.s, 0, Math.PI * 2); cin: cx.fillStyle = `rgba(6, 182, 212, ${0.2 + 0.4 * pp.s})`; cx.fill();
                }
            }
            rot += 0.01;
            animId = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(animId); ro.disconnect(); };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirmPassword) return setError('Passwords do not match');
        const licenseRegex = /^MD-\d{4}-\d{4}$/;
        if (!licenseRegex.test(form.medicalLicenseId)) return setError('Invalid license format (MD-XXXX-XXXX)');

        setLoading(true);
        try {
            const result = await register(form);
            if (result.success) {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3500);
            } else {
                setError(result.error || 'Registration failed');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    const fd = "'Unbounded', sans-serif";
    const fb = "'DM Sans', system-ui, sans-serif";
    const fm = "'Azeret Mono', monospace";

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 468px', width: '100vw', height: '100vh', overflow: 'hidden', cursor: 'none' }}>
            <div ref={cursorRef} style={{ position: 'fixed', width: 9, height: 9, background: '#06b6d4', borderRadius: '50%', pointerEvents: 'none', zIndex: 99999, transform: 'translate(-50%,-50%)', boxShadow: '0 0 14px rgba(6,182,212,.8), 0 0 28px rgba(6,182,212,.3)' }} />
            <div ref={cursor2Ref} style={{ position: 'fixed', width: 30, height: 30, border: '1.5px solid rgba(6,182,212,.38)', borderRadius: '50%', pointerEvents: 'none', zIndex: 99998, transform: 'translate(-50%,-50%)', transition: 'width .38s, height .38s' }} />

            <div style={{ background: '#080E18', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <canvas ref={bgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }} />
                <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', padding: '42px 50px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{ width: 42, height: 42, background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(6,182,212,.25)' }}>
                                <svg viewBox="0 0 24 24" style={{ width: 19, height: 19, stroke: '#080E18', strokeWidth: 2.5, fill: 'none' }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                            </div>
                            <div style={{ fontFamily: fd, fontSize: 18, fontWeight: 700, color: '#E2EEF8', letterSpacing: -0.5 }}>Cancer<span style={{ color: '#06b6d4' }}>Scan</span></div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 99, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', fontFamily: fm, fontSize: 9, fontWeight: 700, color: '#06b6d4' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 10px #06b6d4' }} />
                            {STATUS_MSGS[statusIdx]}
                        </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
                            <span style={{ width: 28, height: 1.5, background: '#06b6d4' }} />
                            <span style={{ fontFamily: fm, fontSize: 11, letterSpacing: 3, color: '#22d3ee', textTransform: 'uppercase' }}>CLINICAL ACCESS REQUEST</span>
                        </div>
                        <h1 style={{ fontFamily: fd, fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 900, lineHeight: 1.0, color: '#ffffff', marginBottom: 18 }}>
                            Register Your<br />
                            <span style={{ color: '#06b6d4', textShadow: '0 0 40px #06b6d433' }}>Medical Node</span>
                        </h1>
                        <p style={{ fontFamily: fb, fontSize: 15, lineHeight: 1.8, color: '#94a3b8', maxWidth: 460, marginBottom: 32 }}>
                            Join the next generation of <strong style={{color:'#22d3ee'}}>precision oncology</strong>. Gain access to AI-powered diagnostics, survival modeling, and real-time histopathology analysis.
                        </p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,.055)', borderRadius: 16, overflow: 'hidden' }}>
                            {[{ n: 'HIPAA', k: 'SECURE' }, { n: '256-bit', k: 'ENCRYPTED' }, { n: 'Verified', k: 'CLINICAL' }].map(s => (
                                <div key={s.n} style={{ background: '#0D1520', padding: '18px 20px' }}>
                                    <div style={{ fontFamily: fd, fontSize: 24, fontWeight: 900, color: '#ffffff', marginBottom: 4 }}>{s.n}</div>
                                    <div style={{ fontFamily: fm, fontSize: 9, color: '#64748b', letterSpacing: 2 }}>{s.k}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ height: 170, position: 'relative', borderTop: '1px solid rgba(255,255,255,.055)', background: '#040810', margin: '0 -50px -42px', overflow: 'hidden' }}>
                        <canvas ref={cellRef} style={{ width: '100%', height: '100%' }} />
                        <div style={{ position: 'absolute', top: 13, left: 18, fontFamily: fm, fontSize: 10, color: '#06b6d4', letterSpacing: 2 }}>● NEURAL CORE PROTOTYPE — ACTIVE</div>
                    </div>
                </div>
            </div>

            <div style={{ background: '#FFFFFF', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid rgba(6,182,212,0.1)' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.08) 1px, transparent 1px)', backgroundSize: '35px 35px' }} />
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 50px', position: 'relative', zIndex: 1, overflowY: 'auto' }}>
                    <div style={{ margin: '40px 0' }}>
                        <h2 style={{ fontFamily: fd, fontSize: 26, fontWeight: 700, color: '#06b6d4', marginBottom: 8 }}>Register Account.</h2>
                        <p style={{ fontSize: 13, color: '#64748b', fontFamily: fb }}>Enter your clinical credentials to begin session.</p>

                        {success ? (
                            <div style={{ marginTop: 40, padding: 30, background: 'rgba(6,182,212,0.05)', borderRadius: 16, border: '1px solid rgba(6,182,212,0.2)', textAlign: 'center' }}>
                                <div style={{ width: 50, height: 50, background: '#06b6d4', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg viewBox="0 0 24 24" style={{ width: 24, height: 24, stroke: '#fff', strokeWidth: 3, fill: 'none' }}><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <h3 style={{ fontFamily: fd, fontSize: 18, color: '#030816' }}>Request Received.</h3>
                                <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>Review in progress. Redirecting shortly...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: fm }}>Full Name</label>
                                    <input type="text" value={form.fullName} onChange={set('fullName')} placeholder="Dr. Jonathan Doe" required
                                        style={{ width: '100%', padding: '12px 14px', background: '#F8FAFC', border: '1.5px solid rgba(6,182,212,0.15)', borderRadius: 10, fontSize: 13, fontFamily: fb, outline: 'none', color: '#0B1220' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: fm }}>Clinical Email</label>
                                    <input type="email" value={form.email} onChange={set('email')} placeholder="dr.doe@hospital.org" required
                                        style={{ width: '100%', padding: '12px 14px', background: '#F8FAFC', border: '1.5px solid rgba(6,182,212,0.15)', borderRadius: 10, fontSize: 13, fontFamily: fb, outline: 'none', color: '#0B1220' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: fm }}>License ID</label>
                                        <input type="text" value={form.medicalLicenseId} onChange={set('medicalLicenseId')} placeholder="MD-2024-0001" required
                                            style={{ width: '100%', padding: '12px 14px', background: '#F8FAFC', border: '1.5px solid rgba(6,182,212,0.15)', borderRadius: 10, fontSize: 13, fontFamily: fb, outline: 'none', color: '#0B1220' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: fm }}>Institution</label>
                                        <select value={form.hospital} onChange={set('hospital')} style={{ width: '100%', padding: '12px 14px', background: '#F8FAFC', border: '1.5px solid rgba(6,182,212,0.15)', borderRadius: 10, fontSize: 13, fontFamily: fb, outline: 'none', color: '#0B1220' }}>
                                            <option>City General Hospital</option>
                                            <option>Apollo Medical Center</option>
                                            <option>AIIMS Hospital</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: fm }}>Password</label>
                                        <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required
                                            style={{ width: '100%', padding: '12px 14px', background: '#F8FAFC', border: '1.5px solid rgba(6,182,212,0.15)', borderRadius: 10, fontSize: 13, fontFamily: fb, outline: 'none', color: '#0B1220' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: fm }}>Confirm</label>
                                        <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="••••••••" required
                                            style={{ width: '100%', padding: '12px 14px', background: '#F8FAFC', border: '1.5px solid rgba(6,182,212,0.15)', borderRadius: 10, fontSize: 13, fontFamily: fb, outline: 'none', color: '#0B1220' }}
                                        />
                                    </div>
                                </div>

                                {error && <p style={{ fontSize: 12, color: '#FF4F6B', background: 'rgba(255,79,107,.08)', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,79,107,.2)' }}>{error}</p>}

                                <button type="submit" disabled={loading} style={{ marginTop: 10, padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, fontFamily: fb, cursor: 'none', boxShadow: '0 4px 15px rgba(6,182,212,0.3)' }}>
                                    {loading ? 'Processing...' : '→ Request Clinical Access'}
                                </button>
                            </form>
                        )}

                        <div style={{ marginTop: 24, textAlign: 'center' }}>
                            <Link to="/welcome" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', fontFamily: fb }}>Already have an account? <span style={{ color: '#06b6d4', fontWeight: 700 }}>Sign in</span></Link>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes lf { 0% { transform: rotateY(0) rotateX(0); } 20% { transform: rotateY(20deg) rotateX(-10deg); } 45% { transform: rotateY(-12deg) rotateX(8deg); } 65% { transform: rotateY(14deg) rotateX(-6deg); } 85% { transform: rotateY(-7deg) rotateX(10deg); } 100% { transform: rotateY(0) rotateX(0); } }
                @keyframes bk { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
                @keyframes up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
                @keyframes pp { 0%, 100% { border-color: rgba(6,182,212,.22); color: #374A5E; } 50% { border-color: rgba(6,182,212,.55); color: #22d3ee; box-shadow: 0 0 12px rgba(6,182,212,.14); } }
                @keyframes bob { 0%, 100% { transform: translateY(0) rotate(0); } 30% { transform: translateY(-2px) rotate(3deg); } 70% { transform: translateY(-1px) rotate(-2deg); } }
            `}</style>
        </div>
    );
}
