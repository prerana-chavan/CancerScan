import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { BASE_URL } from '../config/api'
import { useTheme } from '../context/ThemeContext'

const FILTER_OPTIONS = [
  { value:'ALL',        label:'All Events'      },
  { value:'LOGIN',      label:'Logins'          },
  { value:'LOGIN_FAIL', label:'Failed Logins'   },
  { value:'SCAN',       label:'Scan Analysis'   },
  { value:'DELETE',     label:'Deletions'       },
  { value:'APPROVE',    label:'Approvals'       },
  { value:'REGISTER',   label:'Registrations'   },
]

export default function AuditLogsPage() {
  const [logs,    setLogs]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [pages,   setPages]   = useState(1)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // ── Read global theme from ThemeContext ─────
  const { isDarkMode: isDark } = useTheme()

  // ── Dynamic theme colors ───────────────────
  const C = isDark ? {
    bg:      '#0a0f1e',
    surface: '#111827',
    card:    '#1a2235',
    border:  '#1e3a5f',
    teal:    '#06b6d4',
    text:    '#e2e8f0',
    dim:     '#64748b',
    rowOdd:  '#ffffff08',
    rowEven: 'transparent',
    input:   '#1a2235',
    header:  '#111827',
    shadow:  'none',
  } : {
    bg:      '#f0f4f8',
    surface: '#ffffff',
    card:    '#ffffff',
    border:  '#e2e8f0',
    teal:    '#0891b2',
    text:    '#1e293b',
    dim:     '#64748b',
    rowOdd:  '#f8fafc',
    rowEven: '#ffffff',
    input:   '#ffffff',
    header:  '#f1f5f9',
    shadow:  '0 1px 3px rgba(0,0,0,0.08)',
  }

  // ── Theme-aware event badge config ─────────
  const EVENT_CONFIG = {
    LOGIN:      { label:'Login',        icon:'🔐',
      color: isDark ? '#06b6d4' : '#0369a1',
      bg:    isDark ? '#06b6d415' : '#e0f2fe' },
    LOGOUT:     { label:'Logout',       icon:'🚪',
      color: isDark ? '#94a3b8' : '#475569',
      bg:    isDark ? '#94a3b815' : '#f1f5f9' },
    LOGIN_FAIL: { label:'Failed Login', icon:'⚠️',
      color: isDark ? '#f59e0b' : '#b45309',
      bg:    isDark ? '#f59e0b15' : '#fef3c7' },
    SCAN:       { label:'Scan',         icon:'🔬',
      color: isDark ? '#06b6d4' : '#0369a1',
      bg:    isDark ? '#06b6d415' : '#e0f2fe' },
    DELETE:     { label:'Deletion',     icon:'🗑️',
      color: isDark ? '#ef4444' : '#b91c1c',
      bg:    isDark ? '#ef444415' : '#fee2e2' },
    APPROVE:    { label:'Approved',     icon:'✅',
      color: isDark ? '#22c55e' : '#15803d',
      bg:    isDark ? '#22c55e15' : '#dcfce7' },
    REJECT:     { label:'Rejected',     icon:'❌',
      color: isDark ? '#f59e0b' : '#b45309',
      bg:    isDark ? '#f59e0b15' : '#fef3c7' },
    REGISTER:   { label:'Register',     icon:'👤',
      color: isDark ? '#a78bfa' : '#6d28d9',
      bg:    isDark ? '#a78bfa15' : '#ede9fe' },
    PASSWORD:   { label:'Password',     icon:'🔑',
      color: isDark ? '#06b6d4' : '#0369a1',
      bg:    isDark ? '#06b6d415' : '#e0f2fe' },
    EXPORT:     { label:'Export',       icon:'📤',
      color: isDark ? '#22c55e' : '#15803d',
      bg:    isDark ? '#22c55e15' : '#dcfce7' },
  }

  // ── Data fetch ─────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/audit-logs', {
        params: { page, limit:20, search, type:filter }
      })
      const data = res.data || res
      setLogs(data.audit_logs || data.logs || [])
      setTotal(data.total || 0)
      setPages(data.pages || Math.ceil((data.total || 0) / 20) || 1)
    } catch(e) {
      console.error('Audit fetch failed:', e)
    } finally {
      setLoading(false)
    }
  }, [page, search, filter])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => { setPage(1) }, [search, filter])

  const handleExport = async () => {
    try {
      setExporting(true)
      const token = localStorage.getItem('cancerscan_token')

      const response = await fetch(
        `${BASE_URL}/api/admin/audit-logs/export`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      )

      if (!response.ok) {
        alert('Export failed')
        return
      }

      const blob = await response.blob()
      const url  = window.URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `CancerScan_AuditLog_${new Date().toISOString().slice(0,10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

    } catch (err) {
      alert('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const GRID = '150px 115px 160px 1fr 110px 160px'

  return (
    <div style={{
      padding:    '32px',
      background: C.bg,
      minHeight:  '100vh',
      color:      C.text,
      fontFamily: "'Inter',sans-serif",
    }}>

      {/* ── Header ── */}
      <div style={{ display:'flex',
        justifyContent:'space-between',
        alignItems:'flex-start',
        marginBottom:'28px' }}>
        <div>
          <h1 style={{ fontSize:'24px',
            fontWeight:800, margin:0,
            letterSpacing:'-0.5px',
            color: C.text }}>
            SECURITY TRACEABILITY
          </h1>
          <p style={{ fontSize:'12px',
            color: C.dim, margin:'6px 0 0',
            letterSpacing:'1px' }}>
            COMPREHENSIVE AUDIT TRAIL FOR
            MEDICAL COMPLIANCE
          </p>
        </div>
        <button onClick={handleExport}
          disabled={exporting}
          style={{
            display:'flex', alignItems:'center',
            gap:'8px',
            background:'transparent',
            border:`1px solid ${C.border}`,
            color: exporting ? C.dim : C.teal,
            padding:'10px 18px',
            borderRadius:'8px', cursor: exporting ? 'not-allowed' : 'pointer',
            fontSize:'13px', fontWeight:600,
          }}>
          {exporting ? '⏳ Exporting...' : '⬇️ EXPORT CSV'}
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display:'flex', gap:'12px',
        marginBottom:'24px', flexWrap:'wrap' }}>
        {[
          { label:'Total Events', value: total,
            color: C.teal },
          { label:'This Session',
            value: logs.filter(l=>
              l.event_type==='LOGIN').length,
            color: isDark ? '#22c55e' : '#16a34a' },
          { label:'Failed Logins',
            value: logs.filter(l=>
              l.event_type==='LOGIN_FAIL').length,
            color: isDark ? '#f59e0b' : '#d97706' },
          { label:'Deletions',
            value: logs.filter(l=>
              l.event_type==='DELETE').length,
            color: isDark ? '#ef4444' : '#dc2626' },
        ].map(({label, value, color}) => (
          <div key={label} style={{
            background:   C.card,
            border:       `1px solid ${C.border}`,
            borderRadius: '10px',
            padding:      '16px 20px',
            minWidth:     '140px',
            borderLeft:   `4px solid ${color}`,
            display:      'flex',
            flexDirection:'column',
            gap:          '4px',
            boxShadow:    C.shadow,
          }}>
            <div style={{
              fontSize:   '28px',
              fontWeight: 800,
              color,
              lineHeight: 1,
            }}>
              {value}
            </div>
            <div style={{
              fontSize:      '11px',
              color:         C.dim,
              letterSpacing: '0.5px',
              fontWeight:    500,
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter ── */}
      <div style={{ display:'flex', gap:'12px',
        marginBottom:'20px' }}>
        <div style={{ flex:1, position:'relative' }}>
          <span style={{ position:'absolute',
            left:'14px', top:'50%',
            transform:'translateY(-50%)',
            color: C.dim }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by doctor, action, patient ID..."
            style={{
              width:'100%', padding:'11px 14px 11px 40px',
              background: C.input,
              border:`1px solid ${C.border}`,
              borderRadius:'8px', color: C.text,
              fontSize:'13px', outline:'none',
              boxSizing:'border-box',
            }}
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            padding:'11px 16px',
            background: C.input,
            border:`1px solid ${C.border}`,
            borderRadius:'8px', color: C.text,
            fontSize:'13px', cursor:'pointer',
            outline:'none',
          }}>
          {FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}
              style={{ background: C.input, color: C.text }}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: C.card,
        border:`1px solid ${C.border}`,
        borderRadius:'12px', overflow:'hidden',
        boxShadow: C.shadow,
      }}>
        {/* Header */}
        <div style={{
          display:'grid',
          gridTemplateColumns: GRID,
          padding:'12px 20px',
          background: C.header,
          borderBottom:`1px solid ${C.border}`,
          fontSize:'11px', fontWeight:700,
          color: C.dim, letterSpacing:'1.5px',
        }}>
          <span>EVENT</span>
          <span>TYPE</span>
          <span>ACTOR</span>
          <span>DETAIL</span>
          <span>IP ADDRESS</span>
          <span style={{textAlign:'right'}}>
            TIMESTAMP
          </span>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding:'40px',
            textAlign:'center', color: C.dim }}>
            Loading audit logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding:'40px',
            textAlign:'center', color: C.dim }}>
            No audit events found.
          </div>
        ) : logs.map((log, i) => {
          const cfg = EVENT_CONFIG[log.event_type]
                   || EVENT_CONFIG['LOGIN']
          return (
            <div key={log.id} style={{
              display:'grid',
              gridTemplateColumns: GRID,
              padding:'16px 20px',
              borderBottom: i < logs.length-1
                ? `1px solid ${C.border}` : 'none',
              background: i%2===0
                ? C.rowEven : C.rowOdd,
              alignItems:'center',
              fontSize:'13px',
            }}>

              {/* Event ID + category */}
              <div>
                <div style={{ color: C.teal,
                  fontWeight:700, fontSize:'13px' }}>
                  {log.evt_id}
                </div>
                <div style={{ fontSize:'10px',
                  color: C.dim, marginTop:'2px',
                  letterSpacing:'1px' }}>
                  {log.category}
                </div>
              </div>

              {/* Type badge */}
              <div
                title={cfg.label}
                style={{
                  display:'inline-flex',
                  alignItems:'center',
                  gap:'4px',
                  padding:'4px 10px',
                  borderRadius:'20px',
                  background: cfg.bg,
                  border:`1px solid ${cfg.color}44`,
                  color: cfg.color,
                  fontSize:'11px',
                  fontWeight:700,
                  whiteSpace:'nowrap',
                  maxWidth:'105px',
                  overflow:'hidden',
                }}>
                <span>{cfg.icon}</span>
                <span style={{
                  overflow:'hidden',
                  textOverflow:'ellipsis',
                  whiteSpace:'nowrap',
                }}>
                  {cfg.label}
                </span>
              </div>

              {/* Actor */}
              <div style={{
                fontWeight:600,
                color: C.text,
                fontSize:'13px',
              }}>
                {log.actor_name}
              </div>

              {/* Detail */}
              <div>
                <div style={{
                  fontWeight:600,
                  color: C.text,
                  fontSize:'13px',
                }}>
                  {log.action}
                </div>
                <div style={{
                  fontSize:'11px',
                  color: C.dim,
                  marginTop:'3px',
                  letterSpacing:'0.2px',
                }}>
                  {log.detail}
                </div>
              </div>

              {/* IP */}
              <div style={{ fontSize:'12px',
                color: C.dim, fontFamily:'monospace' }}>
                {log.ip_address || 'localhost'}
              </div>

              {/* Timestamp */}
              <div style={{ textAlign:'right',
                fontSize:'12px', color: C.dim }}>
                {log.created_at}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Pagination ── */}
      <div style={{ display:'flex',
        justifyContent:'space-between',
        alignItems:'center',
        marginTop:'16px',
        fontSize:'13px', color: C.dim }}>
        <span>
          Showing {((page-1)*20)+1}–{Math.min(page*20, total)} of {total} events
        </span>
        <div style={{ display:'flex', gap:'8px' }}>
          <button
            onClick={() => setPage(p => Math.max(1,p-1))}
            disabled={page === 1}
            style={{
              padding:'6px 14px',
              background: page===1
                ? C.surface : C.card,
              border:`1px solid ${C.border}`,
              color: page===1 ? C.dim : C.text,
              borderRadius:'6px',
              cursor: page===1
                ? 'not-allowed' : 'pointer',
              fontSize:'13px',
            }}>
            ← Prev
          </button>
          <span style={{
            padding:'6px 14px',
            background: C.teal+'22',
            border:`1px solid ${C.teal}44`,
            color: C.teal, borderRadius:'6px',
            fontWeight:700,
          }}>
            {page} / {pages}
          </span>
          <button
            onClick={() =>
              setPage(p => Math.min(pages,p+1))}
            disabled={page === pages}
            style={{
              padding:'6px 14px',
              background: page===pages
                ? C.surface : C.card,
              border:`1px solid ${C.border}`,
              color: page===pages
                ? C.dim : C.text,
              borderRadius:'6px',
              cursor: page===pages
                ? 'not-allowed' : 'pointer',
              fontSize:'13px',
            }}>
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
