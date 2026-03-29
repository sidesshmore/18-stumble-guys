import { cookies } from 'next/headers'
import { translations, t as tFn, type Lang, type TranslationKey } from './i18n'

export async function getServerT() {
  const store = await cookies()
  const lang = (store.get('ui_lang')?.value ?? 'en') as Lang
  const dict = translations[lang] ?? translations.en
  return {
    lang,
    t: (key: TranslationKey, vars?: Record<string, string | number>) => tFn(dict, key, vars),
  }
}
