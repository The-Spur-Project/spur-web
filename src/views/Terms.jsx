const section = 'mb-7'
const h2 = 'mb-2 text-base font-semibold text-(--white)'
const p = 'm-0 text-[14px] leading-[1.6] text-(--muted)'

export default function Terms() {
  return (
    <div className="mx-auto max-w-[480px] flex-1 px-6 pt-8 pb-16 text-(--white)">
      <h1 className="mb-2 font-['Plus_Jakarta_Sans',sans-serif] text-[28px] font-extrabold">
        Terms & Conditions
      </h1>
      <p className="mb-8 text-[13px] text-(--muted)">Last updated: March 2026</p>

      <section className={section}>
        <h2 className={h2}>Program description</h2>
        <p className={p}>
          Spur is a spontaneous meetup app for college students. By creating an account you agree to receive SMS messages from Spur, including one-time verification codes and meetup notifications sent by friends you have added in the app.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>Message & data rates</h2>
        <p className={p}>
          Message and data rates may apply. Message frequency varies based on app activity — typically 1–5 messages per day depending on how active your friend group is.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>Opt-out</h2>
        <p className={p}>
          Reply <strong>STOP</strong> to any message to unsubscribe from all SMS notifications. You will receive one final confirmation message and no further messages will be sent.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>Help</h2>
        <p className={p}>
          Reply <strong>HELP</strong> for help, or contact us at thespurproject@gmail.com.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>Eligibility</h2>
        <p className={p}>
          Spur is currently in private beta. Access requires an invitation or beta password. You must be 13 or older to use this service.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>Contact</h2>
        <p className={p}>
          Email:{' '}
          <a href="mailto:thespurproject@gmail.com" className="text-(--blue-light)">
            thespurproject@gmail.com
          </a>
        </p>
      </section>
    </div>
  )
}
