// Engelske oversettelser. Nøkkelen er den norske teksten slik den står i koden.
import { EN_COMMON } from "./en-common";
import { EN_SEARCH } from "./en-search";
import { EN_ADVERTS } from "./en-adverts";
import { EN_ACCOUNT } from "./en-account";
import { EN_OUTFIT } from "./en-outfit";
import { EN_ALERTS } from "./en-alerts";
import { EN_SWIPE } from "./en-swipe";

export const EN: Record<string, string> = {
  ...EN_COMMON,
  ...EN_SEARCH,
  ...EN_ADVERTS,
  ...EN_ACCOUNT,
  ...EN_OUTFIT,
  ...EN_ALERTS,
  ...EN_SWIPE,
};
