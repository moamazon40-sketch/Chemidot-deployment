const TOKEN_KEY = "chemidot_token";
const LANG_KEY = "chemidot_lang";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredLang(): string | null {
  return localStorage.getItem(LANG_KEY);
}

export function setStoredLang(lang: string): void {
  localStorage.setItem(LANG_KEY, lang);
}
