export default function Terms() {
  return (
    <div style={{ flex: 1, padding: '32px 24px 64px', maxWidth: 480, margin: '0 auto', color: 'var(--white)' }}>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        Terms & Conditions
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 32 }}>Last updated: March 2026</p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Program description</h2>
        <p style={pStyle}>
          Spur is a spontaneous meetup app for college students. By creating an account you agree to receive SMS messages from Spur, including one-time verification codes and meetup notifications sent by friends you have added in the app.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Message & data rates</h2>
        <p style={pStyle}>
          Message and data rates may apply. Message frequency varies based on app activity — typically 1–5 messages per day depending on how active your friend group is.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Opt-out</h2>
        <p style={pStyle}>
          Reply <strong>STOP</strong> to any message to unsubscribe from all SMS notifications. You will receive one final confirmation message and no further messages will be sent.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Help</h2>
        <p style={pStyle}>
          Reply <strong>HELP</strong> for help, or contact us at thespurproject@gmail.com.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Eligibility</h2>
        <p style={pStyle}>
          Spur is currently in private beta. Access requires an invitation or beta password. You must be 13 or older to use this service.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Contact</h2>
        <p style={pStyle}>
          Email: <a href="mailto:thespurproject@gmail.com" style={{ color: 'var(--blue-light)' }}>thespurproject@gmail.com</a>
        </p>
      </section>
    </div>
  )
}

const sectionStyle = { marginBottom: 28 }
const h2Style = { fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--white)' }
const pStyle = { fontSize: 14, color: 'var(--muted)', lineHeight: '1.6', margin: 0 }
