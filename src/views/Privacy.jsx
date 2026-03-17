export default function Privacy() {
  return (
    <div style={{ flex: 1, padding: '32px 24px 64px', maxWidth: 480, margin: '0 auto', color: 'var(--white)' }}>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        Privacy Policy
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 32 }}>Last updated: March 2026</p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>What we collect</h2>
        <p style={pStyle}>
          We collect your name, phone number, and account activity (spurs sent/received, RSVP responses, and in-app messages) to operate the Spur service.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>How we use it</h2>
        <p style={pStyle}>
          Your phone number is used solely to authenticate your account and deliver meetup notifications from friends you have added. We do not use your data for advertising or sell it to third parties.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>SMS messaging</h2>
        <p style={pStyle}>
          By creating an account you consent to receive SMS messages from Spur, including one-time verification codes and meetup notifications sent by your friends. Message and data rates may apply. Reply STOP to opt out at any time.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Data sharing</h2>
        <p style={pStyle}>
          We use Supabase for database and authentication, and Twilio for SMS delivery. These services process your phone number as necessary to operate the app. No other third parties receive your data.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Data deletion</h2>
        <p style={pStyle}>
          To delete your account and all associated data, contact us at privacy@spur-app.dev.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Contact</h2>
        <p style={pStyle}>
          Questions? Email <a href="mailto:privacy@spur-app.dev" style={{ color: 'var(--blue-light)' }}>privacy@spur-app.dev</a>
        </p>
      </section>
    </div>
  )
}

const sectionStyle = { marginBottom: 28 }
const h2Style = { fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--white)' }
const pStyle = { fontSize: 14, color: 'var(--muted)', lineHeight: '1.6', margin: 0 }
