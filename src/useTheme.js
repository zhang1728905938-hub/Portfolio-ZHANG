import { useLayoutEffect, useState } from 'react';

// This key is also read by the small pre-paint script in index.html.
const STORAGE_KEY = 'rui-zhang-theme';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light'; }
    catch { return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; }
  });

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff');
    try { localStorage.setItem(STORAGE_KEY, theme); }
    catch { /* Switching still works when browser storage is unavailable. */ }
  }, [theme]);

  return { theme, toggleTheme: () => setTheme(current => current === 'light' ? 'dark' : 'light') };
}
