import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Language, UiTranslations } from './types'
import { UI_TRANSLATIONS } from './translations'

const LANGUAGE_STORAGE_KEY = 'yoga_language_preference'
const DEFAULT_LANGUAGE: Language = 'ru'

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE
  }
  try {
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (savedLanguage === 'ru' || savedLanguage === 'uk' || savedLanguage === 'en') {
      return savedLanguage
    }
  } catch (storageReadError) {
    return DEFAULT_LANGUAGE
  }
  return DEFAULT_LANGUAGE
}

interface LanguageContextValue {
  language: Language
  setLanguage: (nextLanguage: Language) => void
  translations: UiTranslations
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

interface LanguageProviderProps {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => getInitialLanguage())

  const handleLanguageChange = useCallback((nextLanguage: Language) => {
    setCurrentLanguage(nextLanguage)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    } catch (storageWriteError) {
      console.warn(storageWriteError)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = currentLanguage
    document.title = UI_TRANSLATIONS[currentLanguage].appTitle
  }, [currentLanguage])

  const contextValue: LanguageContextValue = {
    language: currentLanguage,
    setLanguage: handleLanguageChange,
    translations: UI_TRANSLATIONS[currentLanguage],
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
