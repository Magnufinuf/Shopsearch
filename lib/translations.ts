export const translations = {
  en: {
    title: "Don't search. Ask.",
    installerTitle: "Install Shopsearch",
    installerSubtitle: "Enter your store's Shopify domain and we'll take you to Shopify's approval page. One click, done.",
    installerPlaceholder: "yourstore.myshopify.com",
    installerButton: "Install",
    successTitle: "Your store is connected!",
    successSubtitle: "Your products will now appear in search automatically.",
    successButton: "Go to search",
  },
  no: {
    title: "Don't search. Ask.",
    installerTitle: "Installer Shopsearch",
    installerSubtitle: "Skriv inn butikkens Shopify-domene, så tar vi deg til godkjenningssiden hos Shopify. Ett klikk, ferdig.",
    installerPlaceholder: "dinbutikk.myshopify.com",
    installerButton: "Installer",
    successTitle: "Butikken din er koblet til!",
    successSubtitle: "Produktene dine vil nå dukke opp i søket automatisk.",
    successButton: "Gå til søket",
  },
};

export type Locale = keyof typeof translations;

export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return "en";
  const lang = acceptLanguage.split(",")[0].split("-")[0].toLowerCase();
  return lang in translations ? (lang as Locale) : "en";
}
