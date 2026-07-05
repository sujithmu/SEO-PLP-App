export interface LocaleConfig {
  code: string;
  language: string;
  measurement: "imperial" | "metric";
  currency: string;
  region: string;
  terminology: {
    wallpaper: string;
    adhesive: string;
  };
}

export const locales: Record<string, LocaleConfig> = {
  "en-us": {
    code: "en-us",
    language: "English",
    measurement: "imperial",
    currency: "USD",
    region: "United States",
    terminology: { wallpaper: "wallpaper", adhesive: "wallpaper paste" },
  },
  "en-au": {
    code: "en-au",
    language: "English",
    measurement: "metric",
    currency: "AUD",
    region: "Australia",
    terminology: { wallpaper: "wallpaper", adhesive: "wallpaper adhesive" },
  },
  "en-gb": {
    code: "en-gb",
    language: "English",
    measurement: "metric",
    currency: "GBP",
    region: "United Kingdom",
    terminology: { wallpaper: "wallpaper", adhesive: "wallpaper paste" },
  },
  "en-ca": {
    code: "en-ca",
    language: "English",
    measurement: "metric",
    currency: "CAD",
    region: "Canada",
    terminology: { wallpaper: "wallpaper", adhesive: "wallpaper paste" },
  },
};

export function getLocaleConfig(locale: string = "en-us"): LocaleConfig {
  return locales[locale] || locales["en-us"];
}

export function getMeasurementSystem(locale: string): string {
  return getLocaleConfig(locale).measurement;
}

export function getCurrency(locale: string): string {
  return getLocaleConfig(locale).currency;
}