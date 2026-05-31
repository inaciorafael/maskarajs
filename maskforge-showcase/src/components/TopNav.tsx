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
    <header className="top-nav">
      <a className="site-logo" href="#top" aria-label="maskarajs">
        <svg viewBox="0 0 64 64" role="img" aria-label="maskarajs logo">
          <path className="rune-plate" d="M13 15 C22 8, 43 8, 52 15 C58 24, 57 42, 51 50 C41 58, 23 58, 13 50 C7 41, 7 24, 13 15 Z" />
          <path d="M20 43 C25 36, 29 28, 33 18" />
          <path d="M33 18 C38 28, 43 36, 48 43" />
          <path d="M25 34 C30 31, 35 31, 40 34" />
          <path d="M24 22 C28 25, 31 27, 35 30" />
          <path d="M42 22 C38 26, 35 29, 31 33" />
          <path className="rune-accent" d="M18 47 C27 51, 39 51, 48 47" />
          <circle cx="24" cy="39" r="1.7" />
          <circle cx="42" cy="39" r="1.7" />
        </svg>
        <span>maskarajs</span>
      </a>

      <div className="top-nav-actions">
        <button className="top-donate-button" type="button" onClick={onDonate}>
          {donateLabel}
        </button>
        <div className="theme-switch" aria-label={themeLabel}>
          {(['light', 'dark'] as Theme[]).map((item) => (
            <button key={item} type="button" aria-pressed={theme === item} onClick={() => onThemeChange(item)}>
              <span className="nav-full">{themeOptions[item]}</span>
              <span className="nav-icon" aria-hidden="true">{item === 'light' ? '☼' : '◐'}</span>
            </button>
          ))}
        </div>
        <div className="language-switch" aria-label={languageLabel}>
          {(['pt-BR', 'en'] as Locale[]).map((item) => (
            <button key={item} type="button" aria-pressed={locale === item} onClick={() => onLocaleChange(item)}>
              <span className="nav-full">{item === 'pt-BR' ? 'PT-BR' : 'EN'}</span>
              <span className="nav-icon" aria-hidden="true">{item === 'pt-BR' ? 'PT' : 'EN'}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
