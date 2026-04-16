/// <reference path="./deno.d.ts" />
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const { spur_id, recipient_id } = await req.json()

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

  // When recipient_id is provided, SMS only that one spur_recipients row (for +1 adds).
  // Otherwise SMS all recipients — existing send-spur behavior unchanged.
  let recipientsQuery = supabase
    .from('spur_recipients')
    .select('recipient:users!recipient_id(phone, name)')
    .eq('spur_id', spur_id)

  if (recipient_id) {
    recipientsQuery = recipientsQuery.eq('id', recipient_id)
  }

  const { data: recipients } = await recipientsQuery

  const baseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://spur.app'
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const messagingSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')!

  let sent = 0
  const errors: string[] = []

  for (const row of (recipients ?? [])) {
    const recipient = row.recipient
    if (!recipient?.phone) {
      errors.push(`Skipped recipient with no phone`)
      continue
    }

    const body =
      `${spur.sender.name} fired a spur 🔥\n` +
      `"${spur.message ?? spur.note ?? ''}"\n` +
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

    if (res.ok) {
      sent++
    } else {
      const errText = await res.text()
      errors.push(`Failed to SMS ${recipient.name ?? recipient.phone}: ${res.status} ${errText}`)
    }
  }

  return new Response(JSON.stringify({ success: true, sent, errors }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
