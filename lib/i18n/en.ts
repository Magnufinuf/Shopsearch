// Engelske oversettelser. Nøkkelen er den norske teksten slik den står i koden.
import { EN_COMMON } from "./en-common";
import { EN_SEARCH } from "./en-search";

export const EN: Record<string, string> = {
  ...EN_COMMON,
  ...EN_SEARCH,
};
