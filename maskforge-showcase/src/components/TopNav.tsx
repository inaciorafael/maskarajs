export type Locale = 'pt-BR' | 'en'
export type Theme = 'light' | 'dark'

type TopNavProps = {
  locale: Locale
  onLocaleChange: (locale: Locale) => void
  languageLabel: string
  theme: Theme
  onThemeChange: (theme: Theme) => void
  themeLabel: string
  themeOptions: Record<Theme, string>
  onDonate: () => void
  donateLabel: string
}

const switchClass = 'inline-grid grid-cols-2 gap-1 rounded-full border border-line/80 bg-surface-glass p-1 shadow-maskara-soft backdrop-blur-2xl'
const switchButtonClass = 'min-h-8 cursor-pointer rounded-full border-0 bg-transparent px-3 text-xs font-black text-muted aria-pressed:bg-ink aria-pressed:text-ink-contrast'

export function TopNav({
  locale,
  onLocaleChange,
  languageLabel,
  theme,
  onThemeChange,
  themeLabel,
  themeOptions,
  onDonate,
  donateLabel,
}: TopNavProps) {
  return (
    <header className="pointer-events-none fixed left-4 right-4 top-[18px] z-[34] flex items-center justify-between gap-3.5 min-[1220px]:left-[calc((100vw-1180px)/2)] min-[1220px]:right-[calc((100vw-1180px)/2)]">
      <a className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full border border-line/80 bg-surface-glass py-2 pr-3 pl-2 font-black text-ink no-underline shadow-maskara-soft backdrop-blur-2xl max-sm:[&>span]:hidden" href="#top" aria-label="maskarajs">
        <span>maskarajs</span>
      </a>

      <div className="pointer-events-auto flex items-center gap-2.5">
        <button className="relative isolate min-h-12 overflow-hidden rounded-full border border-white/30 bg-[linear-gradient(135deg,var(--teal),blue_54%,var(--coral))] px-5 text-sm font-black text-white shadow-[0_16px_40px_rgb(8_127_114_/_26%),0_0_0_0_rgb(8_127_114_/_22%)] transition duration-200 animate-[pix-button-pulse_2.4s_ease-in-out_infinite] hover:-translate-y-0.5 hover:scale-[1.025] hover:saturate-[1.08] max-sm:px-4" type="button" onClick={onDonate}>
          {donateLabel}
        </button>
        <div className={switchClass} aria-label={themeLabel}>
          {(['light', 'dark'] as Theme[]).map((item) => (
            <button className={switchButtonClass} key={item} type="button" aria-pressed={theme === item} onClick={() => onThemeChange(item)}>
              <span className="max-sm:hidden">{themeOptions[item]}</span>
              <span className="hidden max-sm:inline" aria-hidden="true">{item === 'light' ? '☼' : '◐'}</span>
            </button>
          ))}
        </div>
        <div className={switchClass} aria-label={languageLabel}>
          {(['pt-BR', 'en'] as Locale[]).map((item) => (
            <button className={switchButtonClass} key={item} type="button" aria-pressed={locale === item} onClick={() => onLocaleChange(item)}>
              <span>{item === 'pt-BR' ? 'PT-BR' : 'EN'}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
