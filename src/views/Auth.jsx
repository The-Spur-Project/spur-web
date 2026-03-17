import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Auth() {
  const [phase, setPhase] = useState('phone')
  const [phone, setPhone] = useState('')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const digitRefs = useRef([])
  const navigate = useNavigate()
  const { setUser } = useAuth()

  async function sendCode(e) {
    e.preventDefault()
    if (phone.length !== 10) { setError('Enter a 10-digit US number'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: '+1' + phone,
      options: { channel: 'sms' },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setPhase('otp')
  }

  async function verifyCode(overrideDigits) {
    const token = (overrideDigits ?? digits).join('')
    if (token.length < 6) return
    setLoading(true); setError('')

    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: '+1' + phone,
      token,
      type: 'sms',
    })

    if (err) {
      setLoading(false)
      setError(err.message)
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => digitRefs.current[0]?.focus(), 50)
      return
    }

    const session = data?.session
    if (!session) {
      setLoading(false)
      setError('Verification succeeded but no session returned — try again.')
      return
    }

    const { data: existingUser, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('auth_uid', session.user.id)
      .single()

    setLoading(false)

    if (userErr && userErr.code !== 'PGRST116') {
      setError('Account lookup failed: ' + userErr.message)
      return
    }

    if (existingUser) {
      setUser(existingUser)
      navigate('/home')
    } else {
      setPhase('name')
    }
  }

  async function resendCode() {
    setError('')
    setDigits(['', '', '', '', '', ''])
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: '+1' + phone,
      options: { channel: 'sms' },
    })
    setLoading(false)
    if (err) setError(err.message)
    else setTimeout(() => digitRefs.current[0]?.focus(), 50)
  }

  async function registerName(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Enter your name'); return }
    setLoading(true); setError('')
    const { data: sessionData } = await supabase.auth.getSession()
    const uid = sessionData.session?.user?.id
    const { data: newUser, error: err } = await supabase
      .from('users')
      .insert({ auth_uid: uid, name: name.trim(), phone: '+1' + phone })
      .select()
      .single()
    setLoading(false)
    if (err) { setError(err.message); return }
    setUser(newUser)
    navigate('/home')
  }

  function handleDigit(i, val) {
    // Handle paste of full code into any box
    if (val.length > 1) {
      const pasted = val.replace(/\D/g, '').slice(0, 6)
      if (pasted.length === 6) {
        const next = pasted.split('')
        setDigits(next)
        digitRefs.current[5]?.focus()
        verifyCode(next)
        return
      }
    }
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    if (val && i < 5) digitRefs.current[i + 1]?.focus()
    if (next.every(Boolean)) {
      verifyCode(next)
    }
  }

  function handleDigitKey(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      digitRefs.current[i - 1]?.focus()
    }
  }

  const containerStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 28,
  }

  const inputStyle = {
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 12,
    padding: '13px 16px',
    color: 'var(--white)',
    fontSize: 15,
    outline: 'none',
    width: '100%',
  }

  const submitBtn = {
    background: 'var(--blue)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    opacity: loading ? 0.6 : 1,
  }

  const logo = (
    <h1
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 40,
        fontWeight: 800,
        margin: 0,
        color: 'var(--white)',
      }}
    >
      spur<span style={{ color: 'var(--blue)' }}>.</span>
    </h1>
  )

  if (phase === 'phone') {
    return (
      <div style={containerStyle}>
        {logo}
        <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>
            Enter your US phone number to get started
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ ...inputStyle, width: 'auto', padding: '13px 14px', flexShrink: 0, color: 'var(--muted)' }}>
              +1
            </span>
            <input
              style={inputStyle}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="2135550100"
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
              autoFocus
            />
          </div>
          {error && <span style={{ color: '#ef4444', fontSize: 13 }}>{error}</span>}
          <button type="submit" style={submitBtn} disabled={loading}>
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      </div>
    )
  }

  if (phase === 'otp') {
    return (
      <div style={containerStyle}>
        {logo}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 320, alignItems: 'center' }}>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>
            Enter the 6-digit code sent to<br />
            <span style={{ color: 'var(--white)', fontWeight: 500 }}>+1 {phone}</span>
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (digitRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleDigitKey(i, e)}
                style={{
                  width: 44,
                  height: 52,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 700,
                  background: 'var(--surface)',
                  border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
                  borderRadius: 10,
                  color: 'var(--white)',
                  outline: 'none',
                }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '10px 14px', width: '100%', boxSizing: 'border-box' }}>
              <span style={{ color: '#f87171', fontSize: 13 }}>{error}</span>
            </div>
          )}

          {loading && (
            <span style={{ color: 'var(--muted)', fontSize: 13 }}>Verifying…</span>
          )}

          <button
            style={{ ...submitBtn, maxWidth: 320 }}
            onClick={() => verifyCode()}
            disabled={loading || digits.some((d) => !d)}
          >
            Verify
          </button>

          <div style={{ display: 'flex', gap: 20 }}>
            <button
              onClick={() => { setPhase('phone'); setError(''); setDigits(['','','','','','']) }}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', padding: 0 }}
            >
              ← Wrong number
            </button>
            <button
              onClick={resendCode}
              disabled={loading}
              style={{ background: 'none', border: 'none', color: 'var(--blue-light)', fontSize: 13, cursor: 'pointer', padding: 0 }}
            >
              Resend code
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {logo}
      <form onSubmit={registerName} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 320 }}>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>
          What's your name?
        </p>
        <input
          style={inputStyle}
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          autoFocus
        />
        {error && <span style={{ color: '#ef4444', fontSize: 13 }}>{error}</span>}
        <button type="submit" style={submitBtn} disabled={loading}>
          {loading ? 'Saving…' : "Let's go"}
        </button>
      </form>
    </div>
  )
}
