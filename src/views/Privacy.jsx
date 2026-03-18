const section = 'mb-7'
const h2 = 'mb-2 text-base font-semibold text-(--white)'
const p = 'm-0 text-[14px] leading-[1.6] text-(--muted)'

export default function Privacy() {
  return (
    <div className="mx-auto max-w-[480px] flex-1 px-6 pt-8 pb-16 text-(--white)">
      <h1 className="mb-2 font-['Plus_Jakarta_Sans',sans-serif] text-[28px] font-extrabold">
        Privacy Policy
      </h1>
      <p className="mb-8 text-[13px] text-(--muted)">Last updated: March 2026</p>

      <section className={section}>
        <h2 className={h2}>What we collect</h2>
        <p className={p}>
          We collect your name, phone number, and account activity (spurs sent/received, RSVP responses, and in-app messages) to operate the Spur service.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>How we use it</h2>
        <p className={p}>
          Your phone number is used solely to authenticate your account and deliver meetup notifications from friends you have added. We do not use your data for advertising or sell it to third parties.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>SMS messaging</h2>
        <p className={p}>
          By creating an account you consent to receive SMS messages from Spur, including one-time verification codes and meetup notifications sent by your friends. Message and data rates may apply. Reply STOP to opt out at any time.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>Data sharing</h2>
        <p className={p}>
          We use Supabase for database and authentication, and Twilio for SMS delivery. These services process your phone number as necessary to operate the app. No other third parties receive your data.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>Data deletion</h2>
        <p className={p}>
          To delete your account and all associated data, contact us at thespurproject@gmail.com.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>Contact</h2>
        <p className={p}>
          Questions? Email{' '}
          <a href="mailto:thespurproject@gmail.com" className="text-(--blue-light)">
            thespurproject@gmail.com
          </a>
        </p>
      </section>
    </div>
  )
}
