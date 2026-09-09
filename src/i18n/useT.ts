import { create } from 'zustand';
import { translate, type Language } from './translations';

const STORAGE_KEY = 'backgammon:language';

function loadInitialLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'he') return stored;
  } catch {
    // ignore — localStorage unavailable
  }
  return 'en';
}

interface LanguageStore {
  language: Language;
  setLanguage: (l: Language) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: loadInitialLanguage(),
  setLanguage: (language) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }
    set({ language });
  },
}));

/** React hook: returns a `t(key, params?)` function bound to the current language. */
export function useT() {
  const language = useLanguageStore((s) => s.language);
  return (key: string, params?: Record<string, string | number>) => translate(language, key, params);
}
