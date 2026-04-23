import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { isDarkMode, toggleTheme } = useTheme()

  // ── Profile state ──────────────────────────────
  const displayName    = user?.fullName
                      || user?.full_name
                      || user?.name
                      || 'Clinical Professional'
  const displayInitials = displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  // ── Password change state ──────────────────────
  const [pwForm, setPwForm] = useState({
    currentPassword:  '',
    newPassword:      '',
    confirmPassword:  '',
  })
  const [pwError,   setPwError]   = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [showPw, setShowPw] = useState({
    current: false,
    newPw:   false,
    confirm: false,
  })

  // ── Preferences state ──────────────────────────
  const [alertsEnabled, setAlertsEnabled] = useState(
    () => localStorage.getItem('alertsEnabled') === 'true'
  )

  // ── Active section ─────────────────────────────
  const [activeSection, setActiveSection] = useState('profile')

  // ── Change password handler ────────────────────
  const handleChangePassword = async () => {
    setPwError('')
    setPwSuccess('')

    if (!pwForm.currentPassword ||
        !pwForm.newPassword     ||
        !pwForm.confirmPassword) {
      setPwError('All fields are required')
      return
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('Minimum 8 characters required')
      return
    }
    if (!/[A-Z]/.test(pwForm.newPassword)) {
      setPwError('Must include an uppercase letter')
      return
    }
    if (!/[a-z]/.test(pwForm.newPassword)) {
      setPwError('Must include a lowercase letter')
      return
    }
    if (!/[0-9]/.test(pwForm.newPassword)) {
      setPwError('Must include a number')
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match')
      return
    }
    if (pwForm.newPassword === pwForm.currentPassword) {
      setPwError('New password must differ from current')
      return
    }

    setPwLoading(true)
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword,
      })
      const data = res.data || res
      if (data.success) {
        setPwSuccess('Password updated! Logging you out...')
        setPwForm({
          currentPassword: '',
          newPassword:     '',
          confirmPassword: '',
        })
        setTimeout(() => {
          logout()
          navigate('/')
        }, 2000)
      } else {
        setPwError(data.error || 'Update failed')
      }
    } catch (err) {
      const msg = err.response?.data?.error
               || err.message
               || 'Failed to update password'
      setPwError(msg)
    } finally {
      setPwLoading(false)
    }
  }

  // ── Toggle dark mode via ThemeContext ───────────
  const handleToggleDarkMode = () => {
    toggleTheme()
  }

  // ── Toggle alerts ──────────────────────────────
  const handleToggleAlerts = () => {
    const newVal = !alertsEnabled
    setAlertsEnabled(newVal)
    localStorage.setItem('alertsEnabled',
      newVal ? 'true' : 'false')

    if (newVal &&
        'Notification' in window &&
        Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        console.log('[PREFS] Notification:', p)
      })
    }
  }

  // ── Password strength calc ─────────────────────
  const getStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: '' }
    let score = 0
    if (pw.length >= 8)           score++
    if (/[A-Z]/.test(pw))         score++
    if (/[a-z]/.test(pw))         score++
    if (/[0-9]/.test(pw))         score++
    if (/[^A-Za-z0-9]/.test(pw))  score++
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
    const clrs   = ['', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4']
    return { score, label: labels[score], color: clrs[score] }
  }

  // ── Styles ─────────────────────────────────────
  const colors = {
    bg:       'var(--bg-primary)',
    surface:  'var(--bg-surface-alt)',
    card:     'var(--bg-surface)',
    border:   'var(--border-subtle)',
    teal:     'var(--accent-teal)',
    tealDim:  'var(--accent-teal-light)',
    red:      'var(--status-danger)',
    redDim:   'var(--status-danger-bg)',
    text:     'var(--text-primary)',
    textDim:  'var(--text-secondary)',
    success:  'var(--status-success)',
    successDim:'var(--status-success-bg)',
    inputBg:  'var(--bg-surface-alt)',
    btnText:  '#FFFFFF',
  }

  const navItems = [
    { id: 'profile',     label: 'Doctor Profile',   icon: '👤' },
    { id: 'password',    label: 'Change Password',  icon: '🔒' },
    { id: 'preferences', label: 'App Preferences',  icon: '⚙️' },
  ]

  const strength = getStrength(pwForm.newPassword)

  return (
    <div style={{
      display:         'flex',
      minHeight:       '100vh',
      backgroundColor: colors.bg,
      color:           colors.text,
      fontFamily:      "'Inter', sans-serif",
    }}>

      {/* ── Left nav ── */}
      <div style={{
        width:           '220px',
        flexShrink:      0,
        backgroundColor: colors.surface,
        borderRight:     `1px solid ${colors.border}`,
        padding:         '32px 0',
      }}>
        <div style={{
          padding:      '0 20px 24px',
          borderBottom: `1px solid ${colors.border}`,
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '11px', color: colors.textDim,
            letterSpacing: '2px', fontWeight: 600 }}>
            SYSTEM SETTINGS
          </div>
        </div>

        {navItems.map(item => (
          <button key={item.id}
            onClick={() => setActiveSection(item.id)}
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             '12px',
              width:           '100%',
              padding:         '12px 20px',
              background:      activeSection === item.id
                                 ? colors.tealDim : 'transparent',
              border:          'none',
              borderLeft:      activeSection === item.id
                                 ? `3px solid ${colors.teal}`
                                 : '3px solid transparent',
              color:           activeSection === item.id
                                 ? colors.teal : colors.textDim,
              cursor:          'pointer',
              fontSize:        '14px',
              fontWeight:      activeSection === item.id ? 600 : 400,
              textAlign:       'left',
              transition:      'all 0.15s',
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, padding: '40px 48px', maxWidth: '760px' }}>

        {/* ════ SECTION: Doctor Profile ════ */}
        {activeSection === 'profile' && (
          <div>
            <SectionHeader
              title="Doctor Profile"
              subtitle="Your clinical identity and credentials"
              colors={colors}
            />

            <div style={{
              display:         'flex',
              alignItems:      'center',
              gap:             '20px',
              backgroundColor: colors.card,
              border:          `1px solid ${colors.border}`,
              borderRadius:    '12px',
              padding:         '24px',
              marginBottom:    '20px',
            }}>
              <div style={{
                width:           '64px',
                height:          '64px',
                borderRadius:    '50%',
                backgroundColor: colors.tealDim,
                border:          `2px solid ${colors.teal}`,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                fontSize:        '22px',
                fontWeight:      700,
                color:           colors.teal,
                flexShrink:      0,
              }}>
                {displayInitials}
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700,
                  color: colors.text }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '13px', color: colors.teal,
                  marginTop: '2px' }}>
                  {user?.specialization || user?.role || 'Pathologist'}
                </div>
                <div style={{ fontSize: '12px', color: colors.textDim,
                  marginTop: '4px' }}>
                  License: {user?.medicalLicenseId
                          || user?.medical_license_id
                          || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{
              display:             'grid',
              gridTemplateColumns: '1fr 1fr',
              gap:                 '16px',
            }}>
              {[
                { label: 'Email Address',   value: user?.email },
                { label: 'Hospital Network',value: user?.hospital },
                { label: 'Specialization',  value: user?.specialization || '—' },
                { label: 'Account Role',    value: user?.role || 'Pathologist' },
              ].map(({ label, value }) => (
                <InfoCard key={label} label={label}
                  value={value} colors={colors} />
              ))}
            </div>

            <div style={{
              marginTop:    '20px',
              padding:      '14px 18px',
              borderRadius: '8px',
              background:   colors.tealDim,
              border:       `1px solid ${colors.teal}44`,
              fontSize:     '13px',
              color:        colors.textDim,
            }}>
              ℹ️ Profile details are managed by your system administrator.
              Contact support to update credentials.
            </div>
          </div>
        )}

        {/* ════ SECTION: Change Password ════ */}
        {activeSection === 'password' && (
          <div>
            <SectionHeader
              title="Change Password"
              subtitle="Update your account security credentials"
              colors={colors}
            />

            <div style={{
              backgroundColor: colors.card,
              border:          `1px solid ${colors.border}`,
              borderRadius:    '12px',
              padding:         '28px',
            }}>
              {/* Requirements info */}
              <div style={{
                padding:      '12px 16px',
                borderRadius: '8px',
                background:   colors.tealDim,
                border:       `1px solid ${colors.teal}33`,
                fontSize:     '12px',
                color:        colors.textDim,
                marginBottom: '24px',
                lineHeight:   '1.8',
              }}>
                ℹ️ Minimum 8 characters · Uppercase · Lowercase · Number
              </div>

              {/* Error message */}
              {pwError && (
                <div style={{
                  padding:      '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize:     '13px',
                  background:   colors.redDim,
                  border:       `1px solid ${colors.red}44`,
                  color:        colors.red,
                }}>
                  ❌ {pwError}
                </div>
              )}

              {/* Success message */}
              {pwSuccess && (
                <div style={{
                  padding:      '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize:     '13px',
                  background:   colors.successDim,
                  border:       `1px solid ${colors.success}44`,
                  color:        colors.success,
                }}>
                  ✅ {pwSuccess}
                </div>
              )}

              {/* Current Password */}
              <PasswordFieldEnhanced
                label="Current Password"
                value={pwForm.currentPassword}
                onChange={v => setPwForm(p => ({...p, currentPassword: v}))}
                show={showPw.current}
                onToggle={() => setShowPw(p => ({...p, current: !p.current}))}
                colors={colors}
              />

              {/* New Password */}
              <PasswordFieldEnhanced
                label="New Password"
                value={pwForm.newPassword}
                onChange={v => setPwForm(p => ({...p, newPassword: v}))}
                show={showPw.newPw}
                onToggle={() => setShowPw(p => ({...p, newPw: !p.newPw}))}
                colors={colors}
              />

              {/* Strength bar */}
              {pwForm.newPassword && (
                <div style={{
                  marginTop:    '-8px',
                  marginBottom: '16px',
                  display:      'flex',
                  gap:          '4px',
                  alignItems:   'center',
                }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      height:       '4px',
                      flex:         1,
                      borderRadius: '2px',
                      background:   i <= strength.score
                        ? strength.color : colors.border,
                      transition:   'background 0.3s',
                    }} />
                  ))}
                  <span style={{
                    fontSize:   '11px',
                    color:      strength.color,
                    fontWeight: 600,
                    minWidth:   '75px',
                    textAlign:  'right',
                  }}>
                    {strength.label}
                  </span>
                </div>
              )}

              {/* Confirm Password */}
              <PasswordFieldEnhanced
                label="Confirm New Password"
                value={pwForm.confirmPassword}
                onChange={v => setPwForm(p => ({...p, confirmPassword: v}))}
                show={showPw.confirm}
                onToggle={() => setShowPw(p => ({...p, confirm: !p.confirm}))}
                colors={colors}
                borderOverride={
                  pwForm.confirmPassword &&
                  pwForm.confirmPassword !== pwForm.newPassword
                    ? colors.red : undefined
                }
                last
              />

              {/* Match indicator */}
              {pwForm.confirmPassword && (
                <div style={{
                  fontSize:     '11px',
                  marginTop:    '-16px',
                  marginBottom: '20px',
                  color:        pwForm.confirmPassword === pwForm.newPassword
                    ? '#22c55e' : '#ef4444',
                }}>
                  {pwForm.confirmPassword === pwForm.newPassword
                    ? '✅ Passwords match'
                    : '❌ Passwords do not match'}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleChangePassword}
                disabled={pwLoading}
                style={{
                  width:           '100%',
                  padding:         '14px',
                  backgroundColor: pwLoading ? colors.teal + '88' : colors.teal,
                  color:           colors.btnText,
                  border:          'none',
                  borderRadius:    '8px',
                  fontSize:        '15px',
                  fontWeight:      700,
                  cursor:          pwLoading ? 'not-allowed' : 'pointer',
                  letterSpacing:   '0.5px',
                  transition:      'opacity 0.15s',
                }}
              >
                {pwLoading ? '⏳ Updating...' : '🔒 Update Password'}
              </button>
            </div>
          </div>
        )}

        {/* ════ SECTION: App Preferences ════ */}
        {activeSection === 'preferences' && (
          <div>
            <SectionHeader
              title="App Preferences"
              subtitle="Customise your workspace experience"
              colors={colors}
            />

            <div style={{
              backgroundColor: colors.card,
              border:          `1px solid ${colors.border}`,
              borderRadius:    '12px',
              overflow:        'hidden',
            }}>
              <ToggleRow
                icon={isDarkMode ? '🌙' : '☀️'}
                title="Dark Medical Dashboard"
                subtitle={isDarkMode
                  ? 'Dark theme active — low-light optimised'
                  : 'Light theme active — standard display'}
                checked={isDarkMode}
                onChange={handleToggleDarkMode}
                colors={colors}
              />
              <div style={{ height: '1px',
                background: colors.border }} />
              <ToggleRow
                icon="🔔"
                title="Pipeline Desktop Alerts"
                subtitle={alertsEnabled
                  ? 'Notifications enabled for analysis'
                  : 'Show desktop alert when ML inference completes'}
                checked={alertsEnabled}
                onChange={handleToggleAlerts}
                colors={colors}
                last
              />
            </div>

            <div style={{
              marginTop:    '16px',
              padding:      '14px 18px',
              borderRadius: '8px',
              background:   colors.tealDim,
              border:       `1px solid ${colors.teal}44`,
              fontSize:     '13px',
              color:        colors.textDim,
            }}>
              ℹ️ Preferences are saved to this device
              and persist across sessions.
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────

function SectionHeader({ title, subtitle, colors }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700,
        color: colors.text, margin: 0 }}>
        {title}
      </h2>
      <p style={{ fontSize: '13px', color: colors.textDim,
        margin: '6px 0 0' }}>
        {subtitle}
      </p>
      <div style={{ width: '40px', height: '3px',
        background: colors.teal, borderRadius: '2px',
        marginTop: '12px' }} />
    </div>
  )
}

function InfoCard({ label, value, colors }) {
  return (
    <div style={{
      backgroundColor: colors.surface,
      border:          `1px solid ${colors.border}`,
      borderRadius:    '10px',
      padding:         '16px 18px',
    }}>
      <div style={{ fontSize: '11px', color: colors.textDim,
        letterSpacing: '1.5px', fontWeight: 600,
        marginBottom: '8px' }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: '14px', color: colors.text,
        fontWeight: 500 }}>
        {value || '—'}
      </div>
    </div>
  )
}

function PasswordFieldEnhanced({
  label, value, onChange, show, onToggle,
  colors, borderOverride, last
}) {
  return (
    <div style={{ marginBottom: last ? '24px' : '16px' }}>
      <label style={{ display: 'block', fontSize: '12px',
        color: colors.textDim, letterSpacing: '1px',
        fontWeight: 600, marginBottom: '8px' }}>
        {label.toUpperCase()}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
          style={{
            width:           '100%',
            padding:         '12px 44px 12px 16px',
            backgroundColor: colors.inputBg,
            border:          `1px solid ${borderOverride || colors.border}`,
            borderRadius:    '8px',
            color:           colors.text,
            fontSize:        '14px',
            boxSizing:       'border-box',
            outline:         'none',
            transition:      'border-color 0.2s',
          }}
        />
        <button
          onClick={onToggle}
          type="button"
          style={{
            position:  'absolute', right: '12px',
            top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none',
            color: colors.textDim, cursor: 'pointer',
            fontSize: '16px', padding: 0,
          }}
        >
          {show ? '👁️' : '🙈'}
        </button>
      </div>
    </div>
  )
}

function ToggleRow({ icon, title, subtitle, checked,
                     onChange, colors, last }) {
  return (
    <div style={{
      display:    'flex',
      alignItems: 'center',
      padding:    '20px 24px',
      gap:        '16px',
    }}>
      <div style={{ fontSize: '22px', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600,
          color: colors.text }}>
          {title}
        </div>
        <div style={{ fontSize: '12px', color: colors.textDim,
          marginTop: '3px', lineHeight: '1.5' }}>
          {subtitle}
        </div>
      </div>
      {/* Toggle switch */}
      <div
        onClick={onChange}
        style={{
          width:           '52px',
          height:          '28px',
          borderRadius:    '14px',
          backgroundColor: checked ? colors.teal : colors.border,
          position:        'relative',
          cursor:          'pointer',
          transition:      'background 0.25s',
          flexShrink:      0,
        }}
      >
        <div style={{
          position:        'absolute',
          top:             '3px',
          left:            checked ? '27px' : '3px',
          width:           '22px',
          height:          '22px',
          borderRadius:    '50%',
          backgroundColor: '#fff',
          transition:      'left 0.25s',
          boxShadow:       '0 1px 4px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  )
}
