// Nettbutikkplattformer butikker kan søke etter når de kobler til Scavenger.
// shopify/woocommerce/wix har egne tilkoblinger; resten kobles til med produktfeed.

export type Platform = {
  name: string;
  aliases?: string[];
  kind: "shopify" | "woocommerce" | "wix" | "feed";
  hint?: string; // ekstra tips for akkurat denne plattformen
};

const EXTENSION_HINT = "Har dere ikke en feed ennå, finnes det utvidelser for Google Shopping-feed (mange er gratis). Kopier lenken den lager.";
const ASK_DEVELOPER = "Driftes nettbutikken av et byrå eller en utvikler, kan de lage eller finne feed-lenken for dere.";

export const PLATFORMS: Platform[] = [
  { name: "Shopify", kind: "shopify" },
  { name: "WooCommerce", aliases: ["wordpress", "woo"], kind: "woocommerce" },
  { name: "Wix", aliases: ["wix stores", "wix studio"], kind: "wix" },
  { name: "Mystore", aliases: ["my store"], kind: "feed", hint: "Se etter Google Shopping, Facebook/Meta eller Prisjakt under markedsføring eller integrasjoner." },
  { name: "Quickbutikk", aliases: ["quick butikk"], kind: "feed", hint: "Se etter Google Shopping, Facebook/Meta eller Prisjakt under markedsføring eller integrasjoner." },
  { name: "Centra", kind: "feed", hint: `Centra kan lage produktfeeder, for eksempel til Google eller Meta. ${ASK_DEVELOPER}` },
  { name: "Magento", aliases: ["adobe commerce"], kind: "feed", hint: EXTENSION_HINT },
  { name: "Squarespace", kind: "feed" },
  { name: "BigCommerce", aliases: ["big commerce"], kind: "feed" },
  { name: "PrestaShop", kind: "feed", hint: EXTENSION_HINT },
  { name: "OpenCart", kind: "feed", hint: EXTENSION_HINT },
  { name: "Shopware", kind: "feed", hint: EXTENSION_HINT },
  { name: "Salesforce Commerce Cloud", aliases: ["demandware", "sfcc"], kind: "feed", hint: ASK_DEVELOPER },
  { name: "SAP Commerce", aliases: ["hybris"], kind: "feed", hint: ASK_DEVELOPER },
  { name: "Ecwid", aliases: ["lightspeed ecwid"], kind: "feed" },
  { name: "Lightspeed eCom", aliases: ["lightspeed", "seoshop"], kind: "feed" },
  { name: "Webflow", kind: "feed" },
  { name: "Jimdo", kind: "feed" },
  { name: "Square Online", aliases: ["weebly", "square"], kind: "feed" },
  { name: "Big Cartel", aliases: ["bigcartel"], kind: "feed" },
  { name: "Shopline", kind: "feed" },
  { name: "Volusion", kind: "feed" },
  { name: "Shift4Shop", aliases: ["3dcart"], kind: "feed" },
  { name: "Odoo", kind: "feed" },
  { name: "Abicart", aliases: ["textalk"], kind: "feed" },
  { name: "Norce", aliases: ["jetshop"], kind: "feed", hint: ASK_DEVELOPER },
  { name: "Litium", kind: "feed", hint: ASK_DEVELOPER },
  { name: "Starweb", kind: "feed" },
  { name: "Askås", aliases: ["askas"], kind: "feed" },
  { name: "Wikinggruppen", aliases: ["wikinggruppen", "wiking"], kind: "feed" },
  { name: "DanDomain", aliases: ["dandomain webshop"], kind: "feed" },
  { name: "SmartWeb", aliases: ["smart web"], kind: "feed" },
  { name: "Shoporama", kind: "feed" },
  { name: "Egenutviklet nettbutikk", aliases: ["custom", "eget system", "annet", "other"], kind: "feed", hint: "Be utvikleren lage en Google Shopping-feed (XML) eller en CSV-fil med produktene." },
];

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function searchPlatforms(query: string): Platform[] {
  const q = normalize(query);
  if (!q) return [];
  return PLATFORMS.filter((p) => [p.name, ...(p.aliases || [])].some((n) => normalize(n).includes(q))).slice(0, 8);
}
