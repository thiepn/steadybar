/* Apply only validated color hints before the stylesheet paints. App data wins after boot. */
(() => {
  let mode = 'system', accent = 'graphite';
  try {
    const saved = JSON.parse(localStorage.getItem('steadybar-appearance') || '{}');
    if (['system', 'light', 'dark'].includes(saved.mode)) mode = saved.mode;
    if (['graphite', 'blue', 'forest', 'plum', 'amber', 'rose'].includes(saved.accent)) accent = saved.accent;
  } catch { /* A denied or invalid cache must not prevent the app from opening. */ }
  const theme = mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
  Object.assign(document.documentElement.dataset, { theme, mode, accent });
  document.documentElement.style.colorScheme = theme;
})();
