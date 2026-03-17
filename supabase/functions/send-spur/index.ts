/// <reference path="./deno.d.ts" />
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const { spur_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: spur } = await supabase
    .from('spurs')
    .select('*, sender:users!sender_id(name)')
    .eq('id', spur_id)
    .single()

  if (!spur) {
    return new Response(JSON.stringify({ error: 'Spur not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { data: recipients } = await supabase
    .from('spur_recipients')
    .select('recipient:users!recipient_id(phone, name)')
    .eq('spur_id', spur_id)

  const typeEmojis: Record<string, string> = {
    hangout: '👋',
    food: '🍔',
    store_run: '🛒',
    library: '📚',
  }

  const emoji = typeEmojis[spur.type] ?? '🔥'
  const noteText = spur.note ? `\n${spur.note}` : ''
  const baseUrl = Deno.env.get('APP_BASE_URL')
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const messagingSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')!

  let sent = 0
  for (const { recipient } of (recipients ?? [])) {
    const body =
      `${spur.sender.name} just fired a Spur! 🔥\n` +
      `${emoji} ${spur.type.replace('_', ' ')}${noteText}\n` +
      `Jump in: ${baseUrl}/spur/${spur_id}`

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: recipient.phone,
          MessagingServiceSid: messagingSid,
          Body: body,
        }),
      }
    )
    if (res.ok) sent++
  }

  return new Response(JSON.stringify({ success: true, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
