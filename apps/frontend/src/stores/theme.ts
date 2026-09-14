const THEME_KEY = 'pik_theme';

export type Theme = 'light' | 'dark';

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function getSystemTheme(): Theme {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

let systemQuery: MediaQueryList | null = null;
let onSystemChange: (() => void) | null = null;

export function initTheme() {
  applyTheme(resolveTheme());

  // Sistem tercihi değiştiğinde kullanıcı manuel seçim yapmadıysa uygula
  if (!systemQuery && typeof matchMedia !== 'undefined') {
    systemQuery = matchMedia('(prefers-color-scheme: dark)');
    onSystemChange = () => {
      if (!getStoredTheme()) applyTheme(getSystemTheme());
    };
    systemQuery.addEventListener('change', onSystemChange);
  }
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // saklama alanı kullanılamazsa yalnızca oturum teması uygulanır
  }
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const next = resolveTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}