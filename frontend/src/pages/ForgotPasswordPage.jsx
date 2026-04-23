import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const bgRef    = useRef(null)
  const cellRef  = useRef(null)

  const [step,      setStep]    = useState(1)
  const [email,     setEmail]   = useState('')
  const [otp,       setOtp]     = useState('')
  const [debugOtp,  setDebugOtp]= useState('')
  const [newPw,     setNewPw]   = useState('')
  const [confirmPw, setConfirm] = useState('')
  const [loading,   setLoading] = useState(false)
  const [error,     setError]   = useState('')
  const [doctorName,setName]    = useState('')
  const [showPw,    setShowPw]  = useState(false)
  const [showCPw,   setShowCPw] = useState(false)
  const [statusIdx, setStatusIdx] = useState(0)

  const STATUS_MSGS = ['All Systems Online', 'Neural Engine Active', 'Scanning Node…', 'HIPAA Secure', 'Analysis Ready']

  useEffect(() => {
    const interval = setInterval(() => setStatusIdx(i => (i + 1) % STATUS_MSGS.length), 4200)
    return () => clearInterval(interval)
  }, [])

  // ── Background canvas (exact copy from WelcomePage) ──
  useEffect(() => {
    const canvas = bgRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    const pts = Array.from({ length: 85 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.18, vy: -(Math.random() * 0.3 + 0.05),
      r: Math.random() * 1.5 + 0.3, a: Math.random() * 0.35 + 0.05,
      ph: Math.random() * Math.PI * 2, ps: 0.007 + Math.random() * 0.012,
      t: Math.random() < 0.65 ? 0 : 1
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const g1 = ctx.createRadialGradient(0, canvas.height, 0, 0, canvas.height, 500)
      g1.addColorStop(0, 'rgba(6,182,212,0.06)'); g1.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g1; ctx.fillRect(0, 0, canvas.width, canvas.height)
      const g2 = ctx.createRadialGradient(canvas.width * 0.7, canvas.height * 0.2, 0, canvas.width * 0.7, canvas.height * 0.2, 380)
      g2.addColorStop(0, 'rgba(8,145,178,0.05)'); g2.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g2; ctx.fillRect(0, 0, canvas.width, canvas.height)
      const gs = 70
      ctx.strokeStyle = 'rgba(6,182,212,0.025)'; ctx.lineWidth = 0.5
      for (let col = 0; col * gs < canvas.width + gs; col++) {
        for (let row = 0; row * gs < canvas.height + gs; row++) {
          const cx = col * gs + (row % 2 ? gs / 2 : 0), cy = row * gs
          ctx.beginPath()
          for (let s = 0; s < 6; s++) {
            const a = Math.PI / 3 * s - Math.PI / 6
            const px = cx + gs / 2.45 * Math.cos(a), py = cy + gs / 2.45 * Math.sin(a)
            s ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
          }
          ctx.closePath(); ctx.stroke()
        }
      }
      pts.forEach(p => {
        p.ph += p.ps; p.x += p.vx; p.y += p.vy
        const pa = p.a * (0.4 + 0.6 * Math.sin(p.ph))
        const pr = p.r * (0.8 + 0.3 * Math.sin(p.ph))
        const col = p.t === 0 ? [6, 182, 212] : [34, 211, 238]
        ctx.shadowBlur = pr * 4; ctx.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},.55)`
        ctx.beginPath(); ctx.arc(p.x, p.y, pr, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${pa})`; ctx.fill(); ctx.shadowBlur = 0
        if (p.y < -8) { p.y = canvas.height + 8; p.x = Math.random() * canvas.width }
        if (p.x < -10 || p.x > canvas.width + 10) p.x = Math.random() * canvas.width
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  // ── Cell strip canvas — 3D rotating spheres (exact copy from WelcomePage) ──
  useEffect(() => {
    const cc = cellRef.current
    if (!cc) return
    const cx = cc.getContext('2d')
    let cw, ch, animId
    const dpr = window.devicePixelRatio || 1
    const resize = () => { cw = cc.offsetWidth; ch = cc.offsetHeight; cc.width = cw * dpr; cc.height = ch * dpr; cx.scale(dpr, dpr) }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(cc)

    const rx3 = (p, a) => ({ x: p.x, y: p.y * Math.cos(a) - p.z * Math.sin(a), z: p.y * Math.sin(a) + p.z * Math.cos(a) })
    const ry3 = (p, a) => ({ x: p.x * Math.cos(a) + p.z * Math.sin(a), y: p.y, z: -p.x * Math.sin(a) + p.z * Math.cos(a) })
    const pj = (p, f, ox, oy) => { const z = p.z + f; return { x: ox + p.x * f / z, y: oy + p.y * f / z, s: f / z } }

    let rot = 0, tX = 0, tY = 0, tgX = 0, tgY = 0
    cc.addEventListener('mousemove', e => { const r = cc.getBoundingClientRect(); tgX = ((e.clientX - r.left) / r.width - 0.5) * 0.6; tgY = ((e.clientY - r.top) / r.height - 0.5) * 0.45 })
    cc.addEventListener('mouseleave', () => { tgX = 0; tgY = 0 })

    const draw = () => {
      cx.clearRect(0, 0, cw, ch)
      const COUNT = 4
      for (let ci = 0; ci < COUNT; ci++) {
        const ox = cw * (ci + 0.5) / COUNT, oy = ch / 2
        const sc = Math.min(cw / COUNT, ch) * 0.27, fov = 270
        const rYv = rot * (1 + ci * 0.12) + ci * 1.1 + tX * (1 + ci * 0.08)
        const rXv = tY * (1 + ci * 0.06)
        const atm = cx.createRadialGradient(ox, oy, 0, ox, oy, sc * 2)
        atm.addColorStop(0, 'rgba(6,182,212,0.07)'); atm.addColorStop(1, 'rgba(0,0,0,0)')
        cx.beginPath(); cx.arc(ox, oy, sc * 2, 0, Math.PI * 2); cx.fillStyle = atm; cx.fill()
        const POINTS_COUNT = 24
        for (let i = 0; i < POINTS_COUNT; i++) {
          const phi = Math.acos(1 - 2 * (i + 0.5) / POINTS_COUNT)
          const theta = Math.PI * (1 + Math.sqrt(5)) * i
          let p = { x: Math.sin(phi) * Math.cos(theta), y: Math.sin(phi) * Math.sin(theta), z: Math.cos(phi) }
          p = rx3(p, rXv); p = ry3(p, rYv)
          const pp = pj({ x: p.x * sc, y: p.y * sc, z: p.z * sc }, fov, ox, oy)
          const alpha = 0.2 + 0.45 * pp.s
          cx.beginPath(); cx.arc(pp.x, pp.y, 1.8 * pp.s, 0, Math.PI * 2)
          cx.fillStyle = `rgba(6, 182, 212, ${alpha})`; cx.fill()
          if (pp.s > 1.1) { cx.shadowBlur = 10; cx.shadowColor = 'rgba(6,182,212,0.6)'; cx.fill(); cx.shadowBlur = 0 }
        }
        cx.strokeStyle = 'rgba(6,182,212,0.08)'; cx.lineWidth = 0.6
        for (let i = 0; i < 15; i++) {
          let p1 = { x: Math.sin(i), y: Math.cos(i), z: Math.sin(i * 2) }
          let p2 = { x: Math.cos(i * 3), y: Math.sin(i * 2), z: Math.cos(i) }
          p1 = rx3(p1, rXv); p1 = ry3(p1, rYv); p2 = rx3(p2, rXv); p2 = ry3(p2, rYv)
          const pp1 = pj({ x: p1.x * sc, y: p1.y * sc, z: p1.z * sc }, fov, ox, oy)
          const pp2 = pj({ x: p2.x * sc, y: p2.y * sc, z: p2.z * sc }, fov, ox, oy)
          cx.beginPath(); cx.moveTo(pp1.x, pp1.y); cx.lineTo(pp2.x, pp2.y); cx.stroke()
        }
      }
      tX += (tgX - tX) * 0.07; tY += (tgY - tY) * 0.07; rot += 0.006
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); ro.disconnect() }
  }, [])

  // ── Step 1: Request OTP ─────────────────
  const handleRequestOtp = async () => {
    setError('')
    if (!email.trim()) { setError('Please enter your email'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() })
      const data = res.data || res
      if (data.success) {
        if (data.debug_otp) setDebugOtp(data.debug_otp)
        if (data.name) setName(data.name)
        setStep(2)
      } else {
        setError(data.error || 'Request failed')
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Server error. Check backend is running.')
    } finally { setLoading(false) }
  }

  // ── Step 2: Verify OTP + Reset ──────────
  const handleReset = async () => {
    setError('')
    if (!otp.trim()) { setError('Enter the OTP'); return }
    if (!newPw || !confirmPw) { setError('Enter new password'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return }
    if (newPw.length < 8) { setError('Minimum 8 characters'); return }
    setLoading(true)
    try {
      const res = await api.post('/auth/reset-password', {
        email, otp: otp.trim(), newPassword: newPw, confirmPassword: confirmPw,
      })
      const data = res.data || res
      if (data.success) { setStep(3) } else { setError(data.error || 'Reset failed') }
    } catch (e) {
      setError(e.response?.data?.error || 'Reset failed')
    } finally { setLoading(false) }
  }

  const fd = "'Unbounded', sans-serif"
  const fb = "'DM Sans', system-ui, sans-serif"
  const fm = "'Azeret Mono', monospace"

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 468px', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* ═══ LEFT PANEL — exact copy from WelcomePage ═══ */}
      <div style={{ background: '#080E18', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <canvas ref={bgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'rgba(6,182,212,.06)', top: -150, left: -100, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'rgba(8,145,178,.08)', bottom: -80, right: 40, filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, transparent 0%, rgba(6,182,212,.12) 20%, rgba(6,182,212,.38) 50%, rgba(6,182,212,.12) 80%, transparent 100%)', zIndex: 6 }} />

        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', padding: '42px 50px', overflow: 'hidden' }}>
          {/* Topbar — exact copy */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, perspective: 300, position: 'relative', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '1px dashed rgba(6,182,212,.15)', animation: 'spin 13s linear infinite', pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', width: 6, height: 6, background: '#06b6d4', borderRadius: '50%', top: -3, left: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 12px #22d3ee' }} />
                </div>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', transformStyle: 'preserve-3d', animation: 'lf 7s ease-in-out infinite', boxShadow: '0 6px 20px rgba(6,182,212,.25)' }}>
                  <svg viewBox="0 0 24 24" style={{ width: 19, height: 19, stroke: '#080E18', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round' }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: fd, fontSize: 18, fontWeight: 700, color: '#E2EEF8', letterSpacing: -0.5, lineHeight: 1 }}>Cancer<span style={{ color: '#06b6d4' }}>Scan</span></div>
                <div style={{ fontFamily: fm, fontSize: 8.5, letterSpacing: 2.8, color: '#0891b2', textTransform: 'uppercase', marginTop: 2 }}>Precision Oncology</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 99, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', fontFamily: fm, fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#06b6d4' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 10px #06b6d4', animation: 'bk 2s ease-in-out infinite' }} />
                <span key={statusIdx}>{STATUS_MSGS[statusIdx]}</span>
              </div>
              <div style={{ padding: '6px 14px', borderRadius: 99, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', fontFamily: fm, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#374A5E' }}>V 2.2.0</div>
            </div>
          </div>

          {/* Hero — exact copy */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 22, animation: 'up .7s .1s cubic-bezier(.16,1,.3,1) both' }}>
              <span style={{ width: 28, height: 1.5, background: '#06b6d4', borderRadius: 99, boxShadow: '0 0 6px #06b6d4', display: 'inline-block' }} />
              <span style={{ fontFamily: fm, fontSize: 11, letterSpacing: 3, color: '#22d3ee', textTransform: 'uppercase' }}>FINAL YEAR PROJECT · B.E. COMPUTER ENGINEERING · 2025–26</span>
              <span style={{ width: 28, height: 1.5, background: '#06b6d4', borderRadius: 99, boxShadow: '0 0 6px #06b6d4', display: 'inline-block' }} />
            </div>

            <h1 style={{ fontFamily: fd, fontSize: 'clamp(48px, 6vw, 80px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: -2, color: '#ffffff', marginBottom: 18, animation: 'up .8s .22s cubic-bezier(.16,1,.3,1) both' }}>
              AI-Powered<br />
              <span style={{ color: '#06b6d4', display: 'block', textShadow: '0 0 40px #06b6d433' }}>Lung Cancer</span>
              <span style={{ fontSize: 'clamp(18px, 2.5vw, 28px)', fontWeight: 300, letterSpacing: '0.5px', color: '#94a3b8', display: 'block', marginTop: 8, fontFamily: fb }}>Diagnostic Intelligence Platform</span>
            </h1>

            <p style={{ fontFamily: fb, fontSize: 15, lineHeight: 1.8, color: '#94a3b8', fontWeight: 400, maxWidth: 480, marginBottom: 32, animation: 'up .8s .34s cubic-bezier(.16,1,.3,1) both' }}>
              CancerScan uses <strong style={{ color: '#22d3ee', fontWeight: 600 }}>deep learning</strong> to detect and classify malignant lung cancer subtypes from whole-slide histopathology images — delivering pathologist-grade diagnostic intelligence with <strong style={{ color: '#22d3ee', fontWeight: 600 }}>subtype classification</strong>, <strong style={{ color: '#22d3ee', fontWeight: 600 }}>survival prediction</strong>, and clinical reporting.
            </p>

            {/* Tags — exact copy */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 34, animation: 'up .7s .46s cubic-bezier(.16,1,.3,1) both' }}>
              {['🔬 Histopathology Analysis', '🧬 Subtype Classification', '📈 Survival Prediction', '🔒 HIPAA Compliant', '⚡ Real-time AI Engine'].map(t => (
                <div key={t}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: '#121C2A', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 99, cursor: 'default', transition: 'color 0.2s ease', fontSize: 12, fontWeight: 500, color: '#6E90B0', fontFamily: fb, letterSpacing: '0.3px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#22d3ee'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6E90B0'}
                >{t}</div>
              ))}
            </div>

            {/* Stats — exact copy */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,.055)', border: '1px solid rgba(255,255,255,.055)', borderRadius: 16, overflow: 'hidden', animation: 'up .7s .58s cubic-bezier(.16,1,.3,1) both' }}>
              {[{ n: '25,000+', k: 'TRAINING IMAGES', c: '#ffffff' }, { n: '94.2%', k: 'MODEL ACCURACY', c: '#06b6d4' }, { n: '3', k: 'CANCER SUBTYPES', c: '#ffffff' }].map(st => (
                <div key={st.k} style={{ background: '#0D1520', padding: '18px 20px', cursor: 'default', transition: 'background .25s' }}>
                  <div style={{ fontFamily: fd, fontSize: 52, fontWeight: 900, color: st.c, lineHeight: 1, marginBottom: 6, letterSpacing: -1, transition: 'all 0.3s ease', textShadow: st.c === '#06b6d4' ? '0 0 30px #06b6d433' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.textShadow = '0 0 50px #06b6d488'}
                    onMouseLeave={e => e.currentTarget.style.textShadow = st.c === '#06b6d4' ? '0 0 30px #06b6d433' : 'none'}
                  >{st.n}</div>
                  <div style={{ fontFamily: fm, fontSize: 11, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>{st.k}</div>
                </div>
              ))}
            </div>

            {/* Trust badges — exact copy */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.055)', animation: 'up .6s .70s cubic-bezier(.16,1,.3,1) both' }}>
              {['🛡️ HIPAA', '🤖 4 AI Models', '🧠 CNN + ViT', '💾 SQLite DB'].map((t, i) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'default', transition: 'color 0.2s ease', color: '#64748b', fontSize: 11, fontWeight: 600, letterSpacing: '1.5px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#06b6d4'}
                  onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                >
                  {i > 0 && <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,.055)', marginRight: 9 }} />}
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cell Strip — 3D rotating spheres (exact copy from WelcomePage) */}
        <div style={{ height: 170, position: 'relative', borderTop: '1px solid rgba(255,255,255,.055)', background: '#040810', overflow: 'hidden', flexShrink: 0 }}>
          <canvas ref={cellRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(8,14,24,.8) 0%, transparent 18%, transparent 82%, rgba(8,14,24,.8) 100%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 12, left: 18, display: 'flex', alignItems: 'center', gap: 7, padding: '5px 13px', background: 'rgba(4,8,16,.82)', backdropFilter: 'blur(8px)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 99, fontFamily: fm, fontSize: 10, color: '#06b6d4', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 8px #22d3ee', animation: 'bk 1.5s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }} />
            DEEP LEARNING ENGINE · HISTOPATHOLOGY GRADE
          </div>
          <div style={{ position: 'absolute', top: 18, right: 18, textAlign: 'right', whiteSpace: 'nowrap' }}>
            <div style={{ fontFamily: fm, fontSize: 10, color: '#06b6d4', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500 }}>CONFIDENCE: 94.7% · NODE-2847-LCA · Stage III-A</div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Form (exact style from WelcomePage) ═══ */}
      <div style={{ background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 50px', position: 'relative', overflow: 'hidden', borderLeft: '1px solid rgba(6,182,212,0.1)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(6,182,212,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.08) 1px, transparent 1px)', backgroundSize: '35px 35px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 100%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: 356, position: 'relative', zIndex: 1, animation: 'up .9s .18s cubic-bezier(.16,1,.3,1) both' }}>
          {/* Header badge — exact copy */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '9px 18px', marginBottom: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', cursor: 'default' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 60%, #0891b2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(6,182,212,0.35)', animation: 'bob 4.5s ease-in-out infinite' }}>
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: '#FFFFFF', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round' }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            </div>
            <span style={{ fontFamily: fd, fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: -0.5 }}>Cancer<span style={{ color: '#06b6d4' }}>Scan</span></span>
          </div>

          {/* Step indicators */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[1,2,3].map(s => (
              <div key={s} style={{
                width: step === s ? 24 : 8, height: 8, borderRadius: 4,
                background: step > s ? '#22c55e' : step === s ? '#06b6d4' : '#e2e8f0',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          {/* ══ STEP 1: Email ═════════════════ */}
          {step === 1 && (
            <>
              <h2 style={{ fontFamily: fd, fontSize: 26, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6, lineHeight: 1.1 }}>
                Forgot Password?<br />
                <span style={{ color: '#06b6d4' }}>Reset it now.</span>
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55, fontFamily: fb, fontWeight: 400, marginBottom: 24 }}>
                Enter your registered clinical email to receive a one-time password.
              </p>

              {error && <p style={{ fontSize: 12, color: '#FF4F6B', background: 'rgba(255,79,107,.08)', padding: '8px 12px', borderRadius: 8, marginBottom: 12, border: '1px solid rgba(255,79,107,.2)', fontFamily: fb }}>❌ {error}</p>}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: fb }}>Clinical Email</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 12, pointerEvents: 'none', zIndex: 1 }}>
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#374A5E', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="dr.name@hospital.org"
                    onKeyDown={e => e.key === 'Enter' && handleRequestOtp()}
                    style={{ width: '100%', padding: '11px 14px 11px 38px', background: '#F8FAFC', border: '1.5px solid rgba(6,182,212,0.2)', borderRadius: 10, fontFamily: fb, fontSize: 13, color: '#0B1220', outline: 'none', caretColor: '#06b6d4' }}
                    onFocus={e => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,.15)'; e.target.style.background = '#FFFFFF' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(6,182,212,0.2)'; e.target.style.boxShadow = 'none'; e.target.style.background = '#F8FAFC' }}
                  />
                </div>
              </div>

              <button type="button" onClick={handleRequestOtp} disabled={loading} style={{
                width: '100%', padding: 15, background: loading ? '#94a3b8' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                border: 'none', borderRadius: 12, fontFamily: fb, fontSize: 15, fontWeight: 700,
                color: '#FFFFFF', letterSpacing: '0.5px', cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 10px 40px rgba(6,182,212,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16,
                transition: 'all .3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
                onMouseEnter={e => { if(!loading){e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 45px rgba(6,182,212,.45)'}}}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(6,182,212,.35)'}}
              >
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: '#FFFFFF', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }}><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0' }}>
                <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase' }}>or</span>
                <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>

              <button onClick={() => navigate('/')} style={{
                display: 'block', width: '100%', padding: 14, background: '#FFFFFF',
                border: '1.5px solid rgba(6,182,212,0.22)', borderRadius: 12, fontFamily: fb, fontSize: 14, fontWeight: 700,
                color: '#374151', cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
                transition: 'all 0.2s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
              }}
                onMouseEnter={e => { e.currentTarget.style.color = '#06b6d4'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.45)'; e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = 'rgba(6,182,212,0.22)'; e.currentTarget.style.background = '#FFFFFF' }}
              >
                ← Back to Login
              </button>
            </>
          )}

          {/* ══ STEP 2: OTP + Password ═══════ */}
          {step === 2 && (
            <>
              <h2 style={{ fontFamily: fd, fontSize: 26, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 6, lineHeight: 1.1 }}>
                Reset your<br /><span style={{ color: '#06b6d4' }}>Password.</span>
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55, fontFamily: fb, fontWeight: 400, marginBottom: 16 }}>
                {doctorName ? `Hi ${doctorName}, enter` : 'Enter'} the OTP and set a new password.
              </p>

              {debugOtp && (
                <div style={{ background: '#f0fdf4', border: '2px dashed #22c55e', borderRadius: 12, padding: '14px', textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#16a34a', marginBottom: 4 }}>🔐 YOUR OTP CODE</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: '#15803d', letterSpacing: 10 }}>{debugOtp}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Valid 10 min · Academic demo mode</div>
                </div>
              )}

              {error && <p style={{ fontSize: 12, color: '#FF4F6B', background: 'rgba(255,79,107,.08)', padding: '8px 12px', borderRadius: 8, marginBottom: 12, border: '1px solid rgba(255,79,107,.2)', fontFamily: fb }}>❌ {error}</p>}

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: fb }}>Enter OTP</label>
                <input type="text" placeholder="------" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))}
                  style={{ width: '100%', padding: '11px 14px', background: '#F8FAFC', border: '1.5px solid rgba(6,182,212,0.2)', borderRadius: 10, fontFamily: fb, fontSize: 22, fontWeight: 700, letterSpacing: 8, textAlign: 'center', color: '#0B1220', outline: 'none', caretColor: '#06b6d4', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,.15)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(6,182,212,0.2)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: fb }}>New Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 12, pointerEvents: 'none', zIndex: 1 }}>
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#374A5E', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  </span>
                  <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 · Uppercase · Number"
                    style={{ width: '100%', padding: '11px 40px 11px 38px', background: '#F8FAFC', border: '1.5px solid rgba(6,182,212,0.2)', borderRadius: 10, fontFamily: fb, fontSize: 13, color: '#0B1220', outline: 'none', caretColor: '#06b6d4' }}
                    onFocus={e => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,.15)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(6,182,212,0.2)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>{showPw ? '👁️' : '🙈'}</button>
                </div>
              </div>

              <div style={{ marginBottom: 6 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: fb }}>Confirm Password</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 12, pointerEvents: 'none', zIndex: 1 }}>
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#374A5E', strokeWidth: 2, fill: 'none', strokeLinecap: 'round' }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  </span>
                  <input type={showCPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirm(e.target.value)} placeholder="Repeat new password"
                    style={{ width: '100%', padding: '11px 40px 11px 38px', background: '#F8FAFC', border: `1.5px solid ${confirmPw && confirmPw !== newPw ? '#fca5a5' : 'rgba(6,182,212,0.2)'}`, borderRadius: 10, fontFamily: fb, fontSize: 13, color: '#0B1220', outline: 'none', caretColor: '#06b6d4' }}
                    onFocus={e => { e.target.style.borderColor = '#06b6d4'; e.target.style.boxShadow = '0 0 0 3px rgba(6,182,212,.15)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(6,182,212,0.2)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button onClick={() => setShowCPw(p => !p)} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>{showCPw ? '👁️' : '🙈'}</button>
                </div>
              </div>

              {confirmPw && <div style={{ fontSize: 11, marginBottom: 14, color: confirmPw === newPw ? '#16a34a' : '#dc2626', fontFamily: fb }}>{confirmPw === newPw ? '✅ Passwords match' : '❌ Passwords do not match'}</div>}

              <button type="button" onClick={handleReset} disabled={loading} style={{
                width: '100%', padding: 15, background: loading ? '#94a3b8' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                border: 'none', borderRadius: 12, fontFamily: fb, fontSize: 15, fontWeight: 700, color: '#FFFFFF',
                cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 10px 40px rgba(6,182,212,.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16,
                transition: 'all .3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
                onMouseEnter={e => { if(!loading){e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 45px rgba(6,182,212,.45)'}}}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(6,182,212,.35)'}}
              >
                {loading ? '⏳ Resetting...' : '🔒 Reset Password'}
              </button>

              <button onClick={() => { setStep(1); setError(''); setOtp(''); setNewPw(''); setConfirm('') }} style={{
                display: 'block', width: '100%', padding: 14, background: '#FFFFFF',
                border: '1.5px solid rgba(6,182,212,0.22)', borderRadius: 12, fontFamily: fb, fontSize: 14, fontWeight: 700,
                color: '#374151', cursor: 'pointer', textAlign: 'center',
              }}>← Try different email</button>
            </>
          )}

          {/* ══ STEP 3: Success ═══════════════ */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontFamily: fd, fontSize: 26, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: 8, lineHeight: 1.1 }}>
                Password<br /><span style={{ color: '#06b6d4' }}>Reset!</span>
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55, fontFamily: fb, fontWeight: 400, marginBottom: 28 }}>
                Your password has been updated successfully. You can now login with your new password.
              </p>
              <button onClick={() => navigate('/')} style={{
                width: '100%', padding: 15, background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                border: 'none', borderRadius: 12, fontFamily: fb, fontSize: 15, fontWeight: 700, color: '#FFFFFF',
                cursor: 'pointer', boxShadow: '0 10px 40px rgba(6,182,212,.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all .3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 12px 45px rgba(6,182,212,.45)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(6,182,212,.35)' }}
              >
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: '#FFFFFF', strokeWidth: 3, fill: 'none', strokeLinecap: 'round' }}><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                Go to Login
              </button>
            </div>
          )}

          {/* Footer — exact copy */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: '#374A5E', strokeWidth: 2.5, fill: 'none' }}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
              <span style={{ fontFamily: fm, fontSize: 11, color: '#94a3b8', letterSpacing: '0.5px' }}>256-bit encrypted · HIPAA Compliant · </span>
            </div>
            <span style={{ fontSize: 11, color: '#06b6d4', fontWeight: 700, cursor: 'default', transition: 'all 0.15s ease' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >Privacy Policy</span>
          </div>
        </div>
      </div>

      {/* Keyframe animations — exact copy from WelcomePage */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes lf { 0% { transform: rotateY(0) rotateX(0); } 20% { transform: rotateY(20deg) rotateX(-10deg); } 45% { transform: rotateY(-12deg) rotateX(8deg); } 65% { transform: rotateY(14deg) rotateX(-6deg); } 85% { transform: rotateY(-7deg) rotateX(10deg); } 100% { transform: rotateY(0) rotateX(0); } }
        @keyframes bk { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        @keyframes pp { 0%, 100% { border-color: rgba(6,182,212,.22); color: #374A5E; } 50% { border-color: rgba(6,182,212,.55); color: #22d3ee; box-shadow: 0 0 12px rgba(6,182,212,.14); } }
        @keyframes bob { 0%, 100% { transform: translateY(0) rotate(0); } 30% { transform: translateY(-2px) rotate(3deg); } 70% { transform: translateY(-1px) rotate(-2deg); } }
      `}</style>
    </div>
  )
}
