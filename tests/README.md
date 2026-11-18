# Testes do WordCraft

GridCraft: `node tests/gridcraft-regression.cjs`, com Vite na porta 4186. `PLAYWRIGHT_MODULE` aponta para Playwright e `GRID_TEST_URL` muda o endereço. Usa planilhas sintéticas, Edge e IndexedDB isolados para conferir fórmulas, autosave, XLSX, reabertura, desfazer/refazer, versões, conflitos, falha de quota, limites e separação de contas/arquivos Word. Não modifica arquivos pessoais.

Idioma: `node tests/wordcraft-locale.cjs`. Verifica PT-BR em navegador en-US, preferências anteriores em inglês, preservação do tema/autoria, conteúdo e idiomas de revisão en-US/fr-FR após exportação, reabertura e armazenamento de preferências bloqueado. Usa Playwright/Edge isolado e documentos sintéticos.

Com `npm run dev -- --host 127.0.0.1 --port 4186 --strictPort` ativo e Playwright instalado, execute `node tests/wordcraft-regression.cjs`.

`PLAYWRIGHT_MODULE` informa o caminho de uma instalação existente de Playwright. `WORD_TEST_URL` muda o endereço e `WORD_TEST_BROWSER` o navegador (msedge por padrão). `WORDCRAFT_TEST_DOCX` permite testar DOCX reais: caminhos separados por `|`. Os arquivos originais não são modificados.

Os testes usam navegador e IndexedDB isolados. Verificam abertura sem pasta, salvamento automático, recuperação após recarregar, copiar/colar tabelas, desfazer, download, documento maior que localStorage, limites de versões/itens/bytes, remoção física de versões, conflitos e rollback de falha de quota. Artefatos ficam em output/playwright e não são versionados.

`npm run build` também confere o tamanho total da publicação contra o teto de 50 MB. `npm run lint` confere o código próprio; o motor de terceiros é preservado.

Fontes por link: `node tests/wordcraft-fonts.cjs`. O teste usa fontes abertas do catálogo oficial; requer acesso à internet. Confere importação nativa, preservação do documento, ausência de persistência/Downloads, reuso por sessão, licença, links inválidos, falha de rede, hash e nova tentativa. Os arquivos de fonte não são adicionados ao projeto. O catálogo editável fica em public/wordcraft/fontes.json.

Cabeçalho/rodapé: `node tests/wordcraft-header.cjs`. Confere abertura por comando e duplo clique real, botão contextual, retorno ao corpo, foco de teclado e preservação dos conteúdos e do desfazer. O botão usa `insert.closeHeader`, a saída nativa do motor; não apaga nem recria partes do documento.
