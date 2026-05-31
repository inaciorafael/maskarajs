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
