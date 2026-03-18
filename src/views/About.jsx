import { cn } from '../lib/cn'

const section = 'mb-8'
const h2 = 'mb-[10px] text-base font-semibold text-(--white)'
const p = 'm-0 text-[14px] leading-[1.6] text-(--muted)'

export default function About() {
  return (
    <div className="mx-auto max-w-[480px] flex-1 px-6 pt-8 pb-16 text-(--white)">
      <h1 className="mb-2 font-['Plus_Jakarta_Sans',sans-serif] text-[28px] font-extrabold">
        About Spur
      </h1>
      <p className="mb-8 text-[13px] text-(--muted)">Beta v0.1</p>

      <section className={section}>
        <p className={cn(p, 'text-base text-(--white) leading-[1.7]')}>
          Spur is a spontaneous meetup app for college students. Stop overthinking plans — just fire a spur and see who&apos;s down.
        </p>
      </section>

      <section className={section}>
        <h2 className={h2}>How it works</h2>
        <div className="flex flex-col gap-3">
          {[
            { emoji: '🔥', text: 'Pick a vibe — hangout, food, store run, or library' },
            { emoji: '📲', text: 'Select friends and fire the spur — they get a text instantly' },
            { emoji: '✅', text: 'They reply YES or NO, or open the link to chat' },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-xl">{emoji}</span>
              <p className={cn(p, 'm-0')}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={section}>
        <h2 className={h2}>Contact</h2>
        <p className={p}>
          Questions or feedback?{' '}
          <a href="mailto:thespurproject@gmail.com" className="text-(--blue-light)">
            thespurproject@gmail.com
          </a>
        </p>
      </section>
    </div>
  )
}
