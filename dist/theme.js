/* Generated from the typed catalog. App data wins after boot. */
(() => {
  let mode = 'system', accent = 'graphite', palette = 'neutral';
  try {
    const saved = JSON.parse(localStorage.getItem('steadybar-appearance') || '{}');
    if (saved && typeof saved === 'object') {
      if (['system', 'light', 'dark'].includes(saved.mode)) mode = saved.mode;
      if (["graphite","blue","sky","cyan","teal","forest","mint","lime","yellow","amber","orange","red","rose","pink","plum","violet"].includes(saved.accent)) accent = saved.accent;
      if (["neutral","black","slate","midnight","dusk","aubergine","coffee","sand"].includes(saved.palette)) palette = saved.palette;
    }
  } catch { /* Storage restrictions or malformed hints must not prevent startup. */ }
  const theme = mode === 'system' ? (typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
  Object.assign(document.documentElement.dataset, { theme, mode, accent, palette });
  document.documentElement.style.colorScheme = theme;
})();
