# Regressões do Word

Com `npm run dev` ativo, abra `/tests/word-import-regression.html` no Chrome.
A página usa DOCX sintéticos, sem dados pessoais, e o importador/exportador real.
O resultado deve conter `passed: true`. Repita em alturas de janela diferentes:
a margem e a paginação devem permanecer iguais.

São verificados cabeçalhos ancorados, medidas físicas, estilos de parágrafos em
tabelas, bordas internas, contadores em células vazias, quebras de página e
exportação/reabertura. Os documentos reais continuam necessários para a revisão
visual de recursos avançados e diferentes seções.
