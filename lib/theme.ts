// Lys / mørk / automatisk (følger telefonen eller PC-en). Lagres i nettleseren.
export type ThemeChoice = "light" | "dark" | "system";
export const THEME_KEY = "shopsearch_theme";

export function readTheme(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "dark" || saved === "system" ? saved : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}
