import { useMemo } from 'react';
import { locales, scannerStrings } from '../locales.js';

// Returns a `t(key)` translator for the active language, merging the scanner
// string table on top of the base locale, with zh-TW as the final fallback.
export function useTranslation(lang) {
  return useMemo(() => {
    const base = locales[lang] || locales['zh-TW'];
    const dict = { ...base, ...(scannerStrings[lang] || {}) };
    const fallback = { ...locales['zh-TW'], ...scannerStrings['zh-TW'] };
    return (key) => dict[key] || fallback[key] || key;
  }, [lang]);
}
