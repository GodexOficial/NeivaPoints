# DeckCraft no NeivaPoints

DeckCraft 0.18.1 ocupa o terceiro atalho padrão de Aplicativos, no lugar do PowerPoint que estava marcado como indisponível. O identificador `powerpoint` e as posições dos atalhos existentes foram mantidos. O motor é carregado somente ao abrir uma apresentação, em tela cheia dentro do site.

## Origem e compactação

Distribuição oficial: https://github.com/storytold/deckcraft/releases/tag/v0.18.1, arquivo `deckcraft-web-0.18.1.zip`. SHA-256 conferido: `3196e537fcfab538aaa2e88584bc74e29bb584459b916ab584ac22fbafe32db5`. Licenças MIT/Apache, NOTICE e arquivos de atribuição foram preservados.

Motor original: 33.159.566 bytes. Gzip nível 9: 11.907.551 bytes. A descompressão conserva o SHA-256 original (`3f36d649160abb0c0547574c6b0787208db7b1a48137401e2d5933c95b4cb955`). Nenhum recurso foi removido do motor. O carregador HTML descompacta o arquivo no navegador; os módulos JS e suas verificações SRI permanecem intactos. `scripts/compact-deckcraft.cjs` permite conferir/recriar a compactação, e `public/deckcraft/manifest.json` registra os hashes.

A apresentação `public/deckcraft/blank.pptx` foi gerada pelo comando nativo `file.saveBytes` em uma sessão vazia do próprio DeckCraft. O pacote final completo do sistema ocupa aproximadamente 47,52 MB, abaixo do limite de 50.000.000 bytes verificado em toda compilação.

## Arquivos e histórico

A ponte oficial `host=parent` recebe e devolve os arquivos com validação de origem e janela. Salvar usa `app.save`, inclusive para documentos sem nome. PPTX, POTX, PPSX e DECKCRAFT são formatos editáveis; TXT, MD e RTF podem ser importados como roteiro. O primeiro salvamento de um roteiro cria uma apresentação no formato nativo DECKCRAFT e preserva o roteiro original nos recentes. Exportações como PDF são cópias para download e não substituem o arquivo editável. A verificação de PDF usa o botão nativo Create PDF: a chamada de automação `app.export` com um caminho destina-se ao desktop.

IndexedDB independente (`neiva-deckcraft-presentations`, com sufixo por conta): até cinco arquivos, três versões por arquivo, 20 MiB por arquivo e 25 MiB para as versões armazenadas. Não solicita pastas, não envia os arquivos ao Supabase e não altera os registros do WordCraft/GridCraft. Transações atômicas preservam os dados confirmados quando há falha de quota. Gravações com versão desatualizada são recusadas. Não há exclusão automática de documentos para criar espaço; versões antigas são limitadas. Limpar os dados do site remove estes arquivos; Baixar arquivo guarda uma cópia independente.

O histórico restaura no renderizador existente e fecha a apresentação nativa anterior antes de abrir a versão restaurada. Isso evita criar várias abas internas durante a restauração e recriar o contexto gráfico.

## Interface e limites

A página inicial, os controles de salvamento e o histórico do NeivaPoints estão em português. O motor oficial desta versão possui menus em inglês e não expõe comando de tradução da interface; não foi simulada tradução com substituições de texto de documentos. A compatibilidade com cada apresentação depende do suporte do DeckCraft; a integração não promete equivalência completa ao Microsoft PowerPoint. Arquivos PPT binários antigos não são aceitos pelo seletor.

## Verificação

Com Vite na porta 4187 e Playwright disponível: `node tests/deckcraft-regression.cjs`. Variáveis opcionais: `PLAYWRIGHT_MODULE` e `DECK_TEST_URL`. Edge isolado e documentos sintéticos: abertura do motor compactado, criação, salvamento automático/manual, download de PPTX real, importação, reabertura, desfazer/refazer, restauração, apresentação, PDF, limites de armazenamento, falhas de quota, conflitos e isolamento de contas/planilhas. Artefatos em `output/playwright`, fora da publicação. Compilação e análise do código completam a verificação.
