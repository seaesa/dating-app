import i18next, { type i18n as I18nInstance } from "i18next";

import en from "./locales/en.json";
import vi from "./locales/vi.json";

export const SUPPORTED_LOCALES = ["vi", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "vi";

/**
 * Configuration only.
 *
 * The spec defers wiring this into components, so nothing imports `t` yet.
 * It exists so adding the first translated string is a one-line change rather
 * than a setup task — and so the API's error `type` keys have somewhere to map
 * to when they do get localized.
 */
export function createI18n(): I18nInstance {
  const instance = i18next.createInstance();
  void instance.init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: "translation",
    interpolation: { escapeValue: false },
  });
  return instance;
}

export const i18n = createI18n();
