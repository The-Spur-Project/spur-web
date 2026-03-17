export default function About() {
  return (
    <div style={{ flex: 1, padding: '32px 24px 64px', maxWidth: 480, margin: '0 auto', color: 'var(--white)' }}>
      <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        About Spur
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 32 }}>Beta v0.1</p>

      <section style={sectionStyle}>
        <p style={{ ...pStyle, fontSize: 16, color: 'var(--white)', lineHeight: '1.7' }}>
          Spur is a spontaneous meetup app for college students. Stop overthinking plans — just fire a spur and see who's down.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>How it works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { emoji: '🔥', text: 'Pick a vibe — hangout, food, store run, or library' },
            { emoji: '📲', text: 'Select friends and fire the spur — they get a text instantly' },
            { emoji: '✅', text: 'They reply YES or NO, or open the link to chat' },
          ].map(({ emoji, text }) => (
            <div key={text} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }}>{emoji}</span>
              <p style={{ ...pStyle, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Contact</h2>
        <p style={pStyle}>
          Questions or feedback?{' '}
          <a href="mailto:thespurproject@gmail.com" style={{ color: 'var(--blue-light)' }}>
            thespurproject@gmail.com
          </a>
        </p>
      </section>
    </div>
  )
}

const sectionStyle = { marginBottom: 32 }
const h2Style = { fontSize: 16, fontWeight: 600, marginBottom: 10, color: 'var(--white)' }
const pStyle = { fontSize: 14, color: 'var(--muted)', lineHeight: '1.6', margin: 0 }
