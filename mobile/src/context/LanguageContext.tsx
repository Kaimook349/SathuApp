import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Lang = 'th' | 'en';

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  isEN: boolean;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('th');

  useEffect(() => {
    AsyncStorage.getItem('app_lang').then((v) => {
      if (v === 'th' || v === 'en') setLangState(v);
    });
  }, []);

  const setLang = async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem('app_lang', l);
  };

  const value = useMemo(
    () => ({
      lang,
      setLang,
      isEN: lang === 'en',
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}