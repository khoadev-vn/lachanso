import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { vi } from '../i18n/vi';
import { en } from '../i18n/en';

type Lang = 'vi' | 'en';

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({ lang: 'vi', setLang: () => {}, t: (k) => k });

export function useLang() {
  return useContext(LangContext);
}

// Default to Vietnamese — most users are Vietnamese
function detectBrowserLang(): Lang {
  return 'vi';
}

// Load saved preference or detect
function getInitialLang(): Lang {
  const saved = localStorage.getItem('lcs_lang') as Lang | null;
  if (saved === 'vi' || saved === 'en') return saved;
  return detectBrowserLang();
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('lcs_lang', l);
  };

  const t = (key: string): string => {
    const dict = lang === 'en' ? en : vi;
    return dict[key] || vi[key] || key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}