// Engelske oversettelser. Nøkkelen er den norske teksten slik den står i koden.
import { EN_COMMON } from "./en-common";
import { EN_SEARCH } from "./en-search";
import { EN_ADVERTS } from "./en-adverts";
import { EN_ACCOUNT } from "./en-account";

export const EN: Record<string, string> = {
  ...EN_COMMON,
  ...EN_SEARCH,
  ...EN_ADVERTS,
  ...EN_ACCOUNT,
};
