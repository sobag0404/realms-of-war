/**
 * I18nProvider — internationalization context provider.
 *
 * Provides a `t()` translation function and the current locale.
 * Loads comprehensive dictionaries from ru.ts / en.ts.
 *
 * Usage:
 *   const { t, locale } = useI18n();
 *   <span>{t('ui.startGame')}</span>
 */

'use client';

import { createContext, useContext, useMemo } from 'react';
import { useGameStore } from '@/store/useGameStore';
import type { Language } from '@/store/slices/settingsSlice';
import { RU } from '@/data/localization/ru';
import { EN } from '@/data/localization/en';

// ─── Translation Function ─────────────────────────────────────────────────────

/**
 * Translate a key with optional interpolation parameters.
 *
 * Looks up the key in the current locale's dictionary and
 * interpolates {param} placeholders with provided values.
 *
 * @param key - Translation key (dot-separated, e.g., "ui.startGame")
 * @param params - Optional interpolation parameters
 * @returns Translated string
 */
type TranslateFn = (key: string, params?: Record<string, string>) => string;

// ─── Context Interface ────────────────────────────────────────────────────────

interface I18nContext {
  /** Translate a key to the current locale's string. */
  t: TranslateFn;
  /** Current locale. */
  locale: Language;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const I18nContext = createContext<I18nContext>({
  t: (k) => k,
  locale: 'ru',
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Access the i18n context from any component inside I18nProvider. */
export const useI18n = (): I18nContext => useContext(I18nContext);

// ─── Dictionaries ─────────────────────────────────────────────────────────────

/**
 * Translation dictionaries for each supported language.
 * Keys are dot-separated identifiers (e.g., "ui.startGame"),
 * values are the translated strings with optional {param} placeholders.
 */
const DICTIONARIES: Record<Language, Record<string, string>> = {
  ru: RU,
  en: EN,
};

// ─── Interpolation Helper ─────────────────────────────────────────────────────

/**
 * Replace {param} placeholders in a string with values from params.
 *
 * @example
 *   interpolate("Hello {name}!", { name: "World" }) → "Hello World!"
 */
function interpolate(
  template: string,
  params?: Record<string, string>,
): string {
  if (!params) return template;

  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

// ─── Provider Component ───────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const language = useGameStore((s) => s.language);

  const contextValue = useMemo<I18nContext>(() => {
    const dictionary = DICTIONARIES[language] ?? {};

    const t: TranslateFn = (key, params) => {
      // Look up the key in the current locale's dictionary
      const template = dictionary[key] ?? key;
      return interpolate(template, params);
    };

    return {
      t,
      locale: language,
    };
  }, [language]);

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}
