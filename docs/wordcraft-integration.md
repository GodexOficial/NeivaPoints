# WordCraft experimental

O aplicativo aparece em **Aplicativos → Abrir WordCraft**. O Word anterior permanece disponível, sem migração automática de documentos ou alteração das posições da grade.

## Distribuição e licença

Distribuição web oficial **0.18.1**, sem modificações, de https://github.com/storytold/wordcraft/releases/tag/v0.18.1. Arquivos em `public/wordcraft/0.18.1`; procedência e hashes em `public/wordcraft/manifest.json`. O arquivo ZIP foi conferido com o SHA-256 publicado na versão oficial. Licenças MIT/Apache, NOTICE, atribuições e licenças das fontes acompanham a distribuição. O editor mantém a identidade e os créditos originais. Não depende da instalação do ArtCraft.

O WASM tem aproximadamente 61 MB sem compressão e só é carregado ao abrir um documento no editor experimental. Publicar todos os arquivos da pasta, mantendo os caminhos relativos e o MIME `application/wasm`. A configuração atual do Vite copia os arquivos para `dist`. Hospedar em HTTPS; a abertura direta de arquivos locais exige Chrome/Edge e permissão da pasta.

## Documentos e histórico

Reutiliza a pasta conectada pelo Word atual. Em `WordCraft/<UUID>/`, `documento.json` mantém o índice e `versoes/<UUID>.<ext>` mantém cada versão binária. A importação guarda os bytes originais, sem converter para HTML. Alterações são gravadas por Salvar/Ctrl+S, ou pelo salvamento automático do próprio WordCraft quando ativado. O arquivo de origem não é sobrescrito. O histórico permite baixar ou restaurar uma versão; restaurar cria outra versão.

Nenhum conteúdo de documento ou histórico é guardado em localStorage. O acesso à pasta é lembrado no IndexedDB pelo serviço existente; o WordCraft mantém preferências próprias do editor no navegador. Não há upload de documentos ao Supabase. Os arquivos existentes `.neiva-word.json` continuam no Word anterior; para transferir, exportar DOCX e abrir uma cópia no WordCraft.

O host valida origem e janela de cada mensagem. Só informa gravação concluída após fechamento e conferência do arquivo e índice no disco. Mantém hash SHA-256/tamanho por versão, verifica conflitos entre versões e utiliza Web Locks para serializar gravações em abas cooperantes da mesma origem. Uma falha conserva o arquivo recebido em memória para tentar novamente ou baixar uma cópia de recuperação. Fechar ou sair com alterações não confirmadas exige confirmação. Limite local de 64 MB por arquivo; histórico guarda versões completas e consome espaço no disco.

## Limitações e validação

É um editor experimental, não uma implementação do Microsoft Word. Fontes ausentes, paginação e recursos complexos podem diferir. Importar uma cópia e comparar antes de usar como editor principal. Recursos que o motor não suporta não são implementados pelo host; a versão original permanece disponível no histórico.

Executar `npm run build` e `npm run lint`. Testes de integração: com Vite iniciado na porta 4186 e Playwright disponível, executar `node tests/wordcraft-regression.cjs`. Variáveis opcionais: `PLAYWRIGHT_MODULE` (caminho do módulo instalado), `WORD_TEST_URL`, `WORD_TEST_BROWSER` (padrão msedge), `WORDCRAFT_TEST_DOCX` (caminhos de arquivos separados por `|`). Os testes usam uma pasta simulada e não modificam os arquivos originais; resultados e imagens ficam em `output/playwright`, ignorado pelo Git.

Os testes cobrem abertura/edição nativa, salvamento, histórico, restauração, falha no disco, recuperação, integridade, conflito e arquivos maiores que a quota usual do localStorage. Quando fornecidos DOCX locais, verificam edição, desfazer, tabelas na exportação e integridade do original. Não equivalem a uma certificação de compatibilidade com todos os documentos Word.
