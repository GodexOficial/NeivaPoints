# Regressões do Word

Com `npm run dev` ativo, abra `/tests/word-import-regression.html` no Chrome.
A página usa DOCX sintéticos, sem dados pessoais, e o importador/exportador real.
O resultado deve conter `passed: true`. Repita em alturas de janela diferentes:
a margem e a paginação devem permanecer iguais.

São verificados cabeçalhos ancorados, medidas físicas, estilos de parágrafos em
tabelas, bordas internas, contadores em células vazias, quebras de página e
exportação/reabertura. Os documentos reais continuam necessários para a revisão
visual de recursos avançados e diferentes seções.


## Armazenamento e histórico do Word

Com o servidor ativo, abra `/tests/word-storage-regression.html` no Chrome.
O resultado deve conter `passed: true` e 20 verificações aprovadas. A pasta é
simulada: os testes não abrem permissões nem alteram arquivos pessoais.
São cobertos migração com confirmação de leitura, falhas de gravação/permissão,
rascunhos, documento maior que 6 MB com localStorage indisponível, gravações
concorrentes, conflitos externos, arquivos inválidos, versões e restauração.

No uso real, abra Word → Escolher pasta no computador. Os documentos e a lista
de recentes vêm dos arquivos `.neiva-word.json` dessa pasta. O histórico fica em
`Historico-Word`, com cópias anteriores no primeiro salvamento de uma alteração,
nos salvamentos manuais seguintes e em intervalos de cinco minutos de mudanças.
Não há limpeza automática das versões. Exportar DOCX continua disponível.

A cópia antiga só é removida do localStorage depois de todos os documentos e
rascunhos terem sido gravados e relidos com conteúdo idêntico. A migração cobre
o endereço/navegador atual; outros perfis e endereços precisam abrir o Word e
selecionar a mesma pasta. O navegador pode pedir novamente a permissão após
reiniciar. IndexedDB guarda apenas a referência à pasta, sem conteúdo de arquivos.

Nesta implementação o Supabase continua responsável pelos dados já existentes
do sistema. Documentos e versões não são enviados à nuvem. Para uma futura opção
na nuvem serão necessários armazenamento privado, permissões por usuário e uma
política de versões, além da configuração da autenticação apropriada.


## Régua contextual

`/tests/word-ruler-regression.html` monta o editor com um DOCX sintético que passa
pelo exportador e importador reais. Inclui parágrafo centralizado, quebra de linha,
recuo negativo, células com recuos diferentes e célula mesclada.

Para automatizar, com Playwright disponível e o servidor ativo em 4186, execute
`node tests/word-ruler-regression.cjs`. `PLAYWRIGHT_MODULE` permite informar o
caminho do módulo instalado no ambiente, e `WORD_TEST_URL` permite trocar o
endereço do servidor. O teste usa Chrome isolado, verifica células únicas e
múltiplas, limites reais do texto, preservação das margens da página, zoom,
redimensionamento e rolagem horizontal. Não usa arquivos pessoais. Um endereço
opcional `WORD_RULER_REAL_FIXTURE_URL` pode apontar para um ambiente local de QA
que monte WordEditor com uma cópia de um documento real para a checagem adicional.


## Colagem e histórico de edição de documentos importados

`/tests/word-clipboard-regression.html` cria um DOCX sintético, importa-o pelo
importador real e abre o editor com uma folha vazia adicional. Com Playwright
instalado no ambiente e o servidor ativo, execute:

- `node tests/word-clipboard-regression.cjs` (25 verificações).
- `node tests/word-imported-editing-regression.cjs` (fluxo completo por interface).

Os scripts aceitam `PLAYWRIGHT_MODULE`, `WORD_TEST_URL` e `WORD_TEST_BROWSER`
(`chrome` por padrão; `msedge` para Edge isolado). A área de transferência é
simulada; o conteúdo pessoal da área de transferência do computador não é lido.
São verificados HTML versus texto simples, células mescladas, larguras de colunas,
conteúdo, colagem em múltiplas folhas, permissões negadas, cliques concorrentes,
editar/apagar texto em células importadas e Desfazer/Refazer por botão e teclado.

O segundo script aceita `WORD_IMPORTED_FIXTURE_URL` para um ambiente local de QA
que monte o mesmo WordEditor com uma cópia de um DOCX real. O original não deve
ser alterado. O fluxo compara as páginas anteriores, os dados e a largura da
tabela, apaga/restaura uma célula, desfaz/refaz a colagem e desfaz a nova folha.
Nenhum documento pessoal é incluído nos testes versionados.

O histórico do corpo do editor é mantido pelo aplicativo e sobrevive à troca do
DOM durante a paginação. Há até 50 operações, limitadas a aproximadamente 40 MB
para sessões comuns; uma operação grande permanece recuperável. Digitação
contínua é agrupada, uma nova edição invalida o Refazer e a abertura de outro
documento reinicia seu histórico de edição. O histórico de versões salvo no
disco é independente deste histórico de Desfazer/Refazer durante a sessão.
