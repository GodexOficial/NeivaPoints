// NeivaPoints: Brazilian Portuguese labels, without changing workbook values or formulas.
document.documentElement.lang = 'pt-BR';
try {
  const raw = localStorage.getItem('gridcraft.ui');
  const stored = raw ? JSON.parse(raw) : {};
  if (stored && typeof stored === 'object' && !Array.isArray(stored) && stored.language !== 'pt') {
    localStorage.setItem('gridcraft.ui', JSON.stringify({...stored, language: 'pt'}));
  }
} catch { /* The host also sets app.language.set after startup. */ }
