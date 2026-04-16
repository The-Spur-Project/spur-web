import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/cn'

export default function Auth() {
  const { setUser, setAuthStatus } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) { setError('Enter your name'); return }
    if (!phone || phone.replace(/\D/g, '').length < 10) { setError('Enter a 10-digit phone number'); return }

    setLoading(true)
    setError('')

    const digits = phone.replace(/\D/g, '').slice(0, 10)
    const email = `${digits}@demo.spur.app`
    const password = `spur_${digits}_demo`
    const fullPhone = `+1${digits}`

    // Try sign-in first (returning user)
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })

    let uid = signInData?.user?.id

    // New user — sign up
    if (signInErr || !uid) {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) {
        setError(signUpErr.message)
        setLoading(false)
        return
      }
      uid = signUpData?.user?.id
    }

    if (!uid) {
      setError('Could not create session — try again.')
      setLoading(false)
      return
    }

    // Fetch or create the public.users profile
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('auth_uid', uid)
      .single()

    if (existing) {
      setUser(existing)
      setAuthStatus('ready')
      setLoading(false)
      return
    }

    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({ auth_uid: uid, name: name.trim(), phone: fullPhone })
      .select()
      .single()

    if (insertErr) {
      setError(insertErr.message)
      setLoading(false)
      return
    }

    setUser(newUser)
    setAuthStatus('ready')
    setLoading(false)
  }

  const inputClass =
    'w-full rounded-xl border-[1.5px] border-(--border) bg-(--surface) px-4 py-[13px] text-[15px] text-(--white) outline-none'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 py-6">
      <h1 className="m-0 font-['Plus_Jakarta_Sans',sans-serif] text-[40px] font-extrabold text-(--white)">
        spur<span className="text-(--blue)">.</span>
      </h1>
      <form onSubmit={handleJoin} className="flex w-full max-w-[320px] flex-col gap-3">
        <p className="m-0 text-center text-[14px] text-(--muted)">
          Enter your info to get started
        </p>
        <input
          className={inputClass}
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          autoFocus
        />
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
          />
        </div>
        {error && <span className="text-[13px] text-[#ef4444]">{error}</span>}
        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full cursor-pointer rounded-xl border-none bg-(--blue) py-[13px] text-[15px] font-semibold text-white',
            loading && 'cursor-not-allowed opacity-60',
          )}
        >
          {loading ? 'Joining…' : "Let's go 🔥"}
        </button>
      </form>
    </div>
  )
}
