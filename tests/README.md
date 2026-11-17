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
