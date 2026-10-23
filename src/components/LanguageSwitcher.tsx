import { useLanguage } from '../i18n/LanguageContext'
import type { Language } from '../i18n/types'

const AVAILABLE_LANGUAGES: { key: Language; label: string; fullTitle: string }[] = [
  { key: 'ru', label: 'RU', fullTitle: 'Русский' },
  { key: 'uk', label: 'UK', fullTitle: 'Українська' },
  { key: 'en', label: 'EN', fullTitle: 'English' },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.35rem',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '0.2rem',
        background: 'rgba(5, 12, 30, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '2rem',
        padding: '0.22rem 0.28rem',
        border: '1px solid rgba(80, 140, 255, 0.35)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.65), 0 0 20px rgba(64, 196, 255, 0.12)',
      }}
      role="group"
      aria-label="Language selection"
    >
      {AVAILABLE_LANGUAGES.map((languageOption) => {
        const isSelected = language === languageOption.key

        return (
          <button
            key={languageOption.key}
            onClick={() => setLanguage(languageOption.key)}
            title={languageOption.fullTitle}
            aria-pressed={isSelected}
            style={{
              cursor: 'pointer',
              border: isSelected
                ? '1px solid rgba(120, 200, 255, 0.8)'
                : '1px solid transparent',
              background: isSelected
                ? 'linear-gradient(135deg, rgba(64, 196, 255, 0.4), rgba(124, 77, 255, 0.4))'
                : 'transparent',
              color: isSelected
                ? '#ffffff'
                : 'rgba(160, 195, 240, 0.72)',
              borderRadius: '1.6rem',
              padding: '0.32rem 0.62rem',
              fontSize: '0.72rem',
              fontWeight: isSelected ? 700 : 500,
              letterSpacing: '0.08em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              transition: 'all 0.2s ease',
              boxShadow: isSelected
                ? '0 0 14px rgba(64, 196, 255, 0.45)'
                : 'none',
              outline: 'none',
            }}
          >
            {languageOption.label}
          </button>
        )
      })}
    </div>
  )
}
