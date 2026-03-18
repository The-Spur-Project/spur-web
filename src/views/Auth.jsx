import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'

export default function Auth() {
  const [searchParams] = useSearchParams()
  const dest = searchParams.get('from') ? decodeURIComponent(searchParams.get('from')) : '/home'
  const [phase, setPhase] = useState(searchParams.get('step') === 'name' ? 'name' : 'phone')
  const [phone, setPhone] = useState('')
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const digitRefs = useRef([])
  const navigate = useNavigate()
  const { authStatus, setUser, setAuthStatus } = useAuth()

  async function sendCode(e) {
    e.preventDefault()
    if (phone.length !== 10) { setError('Enter a 10-digit US number'); return }
    setLoading(true); setError('')
    const fullPhone = '+1' + phone
    console.log('[Auth] sendCode → signInWithOtp for', fullPhone)
    const { error: err } = await supabase.auth.signInWithOtp({
      phone: fullPhone,
      options: { channel: 'sms' },
    })
    setLoading(false)
    if (err) {
      console.error('[Auth] sendCode error:', err.message, err)
      setError(err.message)
      return
    }
    console.log('[Auth] sendCode success → moving to OTP phase')
    setPhase('otp')
  }

  /* eslint-disable react-hooks/set-state-in-effect -- intentional: reacting to external authStatus from App.jsx */
  useEffect(() => {
    if (authStatus === 'needs-profile' && phase === 'phone') {
      setPhase('name')
    }
    if (authStatus === 'ready' && phase === 'phone') {
      navigate(dest, { replace: true })
    }
  }, [authStatus, phase, navigate, dest])

  useEffect(() => {
    if (phase !== 'otp' || !loading) return
    if (authStatus === 'ready') {
      navigate(dest, { replace: true })
    } else if (authStatus === 'needs-profile') {
      setLoading(false)
      setPhase('name')
    }
  }, [authStatus, phase, loading, navigate, dest])
  /* eslint-enable react-hooks/set-state-in-effect */

  async function verifyCode(overrideDigits) {
    const token = (overrideDigits ?? digits).join('')
    if (token.length < 6) return
    setLoading(true); setError('')
    const fullPhone = '+1' + phone

    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: fullPhone,
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

    if (!data?.session) {
      setLoading(false)
      setError('Verification succeeded but no session returned — try again.')
      return
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
    console.log('[Auth] registerName → inserting user, uid:', uid, 'name:', name.trim(), 'phone:', '+1' + phone)
    const { data: newUser, error: err } = await supabase
      .from('users')
      .insert({ auth_uid: uid, name: name.trim(), phone: '+1' + phone })
      .select()
      .single()
    setLoading(false)
    if (err) {
      console.error('[Auth] registerName insert error:', err.message, err)
      setError(err.message)
      return
    }
    console.log('[Auth] registerName success:', newUser)
    setUser(newUser)
    setAuthStatus('ready')
    navigate(dest, { replace: true })
  }

  function handleDigit(i, val) {
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

  const inputClass =
    'w-full rounded-xl border-[1.5px] border-(--border) bg-(--surface) px-4 py-[13px] text-[15px] text-(--white) outline-none'

  const submitClass = cn(
    'w-full cursor-pointer rounded-xl border-none bg-(--blue) py-[13px] text-[15px] font-semibold text-white',
    loading && 'cursor-not-allowed opacity-60',
  )

  const logo = (
    <h1 className="m-0 font-['Plus_Jakarta_Sans',sans-serif] text-[40px] font-extrabold text-(--white)">
      spur<span className="text-(--blue)">.</span>
    </h1>
  )

  if (phase === 'phone') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 py-6">
        {logo}
        <form onSubmit={sendCode} className="flex w-full max-w-[320px] flex-col gap-3">
          <p className="m-0 text-center text-[14px] text-(--muted)">
            Enter your US phone number to get started
          </p>
          <div className="flex gap-2">
            <span className={cn(inputClass, 'w-auto shrink-0 px-[14px] text-(--muted)')}>
              +1
            </span>
            <input
              className={inputClass}
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="2135550100"
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError('') }}
              autoFocus
            />
          </div>
          {error && <span className="text-[13px] text-[#ef4444]">{error}</span>}
          <button type="submit" className={submitClass} disabled={loading}>
            {loading ? 'Sending…' : 'Send code'}
          </button>
        </form>
      </div>
    )
  }

  if (phase === 'otp') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 py-6">
        {logo}
        <div className="flex w-full max-w-[320px] flex-col items-center gap-4">
          <p className="m-0 text-center text-[14px] text-(--muted)">
            Enter the 6-digit code sent to<br />
            <span className="font-medium text-(--white)">+1 {phone}</span>
          </p>

          <div className="flex gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { digitRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleDigitKey(i, e)}
                className={cn(
                  'h-[52px] w-11 rounded-[10px] bg-(--surface) text-center text-[22px] font-bold text-(--white) outline-none',
                  error ? 'border-[1.5px] border-[#ef4444]' : 'border-[1.5px] border-(--border)',
                )}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {error && (
            <div className="box-border w-full rounded-[10px] border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.12)] px-[14px] py-[10px]">
              <span className="text-[13px] text-[#f87171]">{error}</span>
            </div>
          )}

          {loading && (
            <span className="text-[13px] text-(--muted)">Verifying…</span>
          )}

          <button
            type="button"
            className={cn(submitClass, 'max-w-[320px]')}
            onClick={() => verifyCode()}
            disabled={loading || digits.some((x) => !x)}
          >
            Verify
          </button>

          <div className="flex gap-5">
            <button
              type="button"
              onClick={() => { setPhase('phone'); setError(''); setDigits(['', '', '', '', '', '']) }}
              className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-(--muted)"
            >
              ← Wrong number
            </button>
            <button
              type="button"
              onClick={resendCode}
              disabled={loading}
              className="cursor-pointer border-none bg-transparent p-0 text-[13px] text-(--blue-light) disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 py-6">
      {logo}
      <form onSubmit={registerName} className="flex w-full max-w-[320px] flex-col gap-3">
        <p className="m-0 text-center text-[14px] text-(--muted)">
          What&apos;s your name?
        </p>
        <input
          className={inputClass}
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          autoFocus
        />
        {error && <span className="text-[13px] text-[#ef4444]">{error}</span>}
        <button type="submit" className={submitClass} disabled={loading}>
          {loading ? 'Saving…' : "Let's go"}
        </button>
      </form>
    </div>
  )
}
