import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const body = await req.text()
  const params = new URLSearchParams(body)
  const from = params.get('From') ?? ''
  const text = (params.get('Body') ?? '').trim().toUpperCase()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let intent: 'yes' | 'no' | 'unknown' = 'unknown'
  if (['YES', 'Y', 'YEP', 'YEAH'].includes(text)) intent = 'yes'
  else if (['NO', 'N', 'NOPE', 'NAH'].includes(text)) intent = 'no'

  const twimlHeader = { 'Content-Type': 'text/xml' }
  const baseUrl = Deno.env.get('APP_BASE_URL')

  if (intent === 'unknown') {
    return new Response(
      '<Response><Message>Reply YES or NO to respond to your spur.</Message></Response>',
      { headers: twimlHeader }
    )
  }

  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('phone', from)
    .single()

  if (!user) {
    return new Response(
      "<Response><Message>We couldn't find your account. Visit the app to sign up.</Message></Response>",
      { headers: twimlHeader }
    )
  }

  const { data: sr } = await supabase
    .from('spur_recipients')
    .select('id, spur_id')
    .eq('recipient_id', user.id)
    .in('status', ['pending', 'seen'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!sr) {
    return new Response(
      '<Response><Message>No open spurs found for you right now.</Message></Response>',
      { headers: twimlHeader }
    )
  }

  await supabase.from('spur_recipients').update({ status: intent }).eq('id', sr.id)

  const replyMsg =
    intent === 'yes'
      ? `You're in! Open the spur to chat: ${baseUrl}/spur/${sr.spur_id}`
      : `Got it, maybe next time!`

  return new Response(
    `<Response><Message>${replyMsg}</Message></Response>`,
    { headers: twimlHeader }
  )
})
