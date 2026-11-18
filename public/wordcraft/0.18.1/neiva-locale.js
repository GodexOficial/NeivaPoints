// NeivaPoints: choose the built-in Brazilian Portuguese UI before the first frame.
// This preference contains no document data and leaves every other setting intact.
document.documentElement.lang = 'pt-BR';
try {
  const raw = localStorage.getItem('wordcraft.ui');
  const stored = raw ? JSON.parse(raw) : {};
  if (stored && typeof stored === 'object' && !Array.isArray(stored) && stored.language !== 'pt-br') {
    localStorage.setItem('wordcraft.ui', JSON.stringify({...stored, language: 'pt-br'}));
  }
} catch {
  // The host also sets ui.language through the engine API if storage is blocked.
}
