# WordCraft

O WordCraft substitui o editor anterior na primeira posição de Aplicativos. Os componentes, estilos, importador, exportador e testes do editor antigo foram removidos; os arquivos pessoais anteriormente salvos no computador não foram apagados. Para continuar um documento antigo, abrir seu DOCX original pelo botão Abrir do computador.

## Pacote abaixo de 50 MB

Base: distribuição web oficial 0.18.1, https://github.com/storytold/wordcraft/releases/tag/v0.18.1. As licenças MIT/Apache, NOTICE, atribuições e licenças das fontes acompanham os arquivos. O motor foi compactado em gzip: a descompressão produz os mesmos bytes e SHA-256 oficiais. O carregador HTML foi adaptado em 18/11/2026 para descomprimir no navegador, sem alterar o motor. A procedência, alterações e hashes estão em `public/wordcraft/manifest.json`.

`scripts/compact-wordcraft.cjs` gera/confere o gzip e adapta o carregador; pode ser executado novamente. Navegadores modernos com DecompressionStream são necessários. O carregador aceita servidores que enviam o arquivo como gzip bruto ou com Content-Encoding gzip. Não manter outra cópia `.wasm` sem compressão em public. Preservar a integridade dos módulos JS e seus caminhos. `.gitattributes` impede conversão de quebra de linha dos arquivos distribuídos. Hospedar em HTTPS para clipboard e recursos gráficos.

`npm run build` verifica automaticamente que **dist inteiro** não ultrapassa 50.000.000 bytes. O limite inclui WordCraft e o restante do site. A pasta de desenvolvimento também inclui node_modules, Git e resultados privados de testes, que não são publicados e não integram esse limite. Compactação reduz disco/download, não o tamanho do motor em memória durante a execução.

## Armazenamento automático

Documentos binários e metadados ficam no IndexedDB `neiva-wordcraft-documents`, nas tabelas documents e versions, sem seleção de pasta e sem conteúdo em localStorage. O navegador recebe um pedido de persistência ao criar/importar um documento; ele pode conceder ou recusar. A aplicação continua funcionando nos dois casos.

Política: **5 documentos**, **3 versões por documento**, **20 MiB por arquivo**, **25 MiB no conjunto de versões**. Depois de alterações, o host solicita salvamento ao motor após dois segundos. Salvar/Ctrl+S também grava imediatamente. As versões mais antigas podem ser removidas para cumprir o orçamento, mantendo a última versão de cada documento. Nenhum documento inteiro é removido automaticamente. No sexto documento ou quando as versões atuais excedem o orçamento, o usuário precisa baixar/excluir um item dos recentes.

Leitura, comparação de versão, redução do histórico e gravação são feitas na mesma transação IndexedDB. Uma falha de quota cancela toda a operação, preservando as versões anteriores. Há verificação SHA-256 ao reabrir e proteção contra gravações de abas desatualizadas. O host só marca como salvo após a transação concluir. Uma gravação mais antiga não limpa a indicação de alterações feitas enquanto ela estava pendente. Origem e janela de cada mensagem são verificadas.

Baixar arquivo exporta uma cópia portátil, inclusive se não houver espaço para salvar no navegador. Falhas também permitem baixar a cópia recebida do motor ou tentar novamente. Restaurar uma versão cria uma nova versão dentro do limite de três.

Os dados pertencem à origem/perfil do navegador. Limpar dados do site, usar outro navegador/endereço, modo privado ou eventual remoção pelo navegador afeta a disponibilidade. A interface explica isso e oferece download permanente. Não é sincronização entre dispositivos nem envio ao Supabase. Arquivos de versões anteriores em pastas locais permanecem intactos e podem ser abertos pelo seletor comum de arquivo; não existe pedido de acesso a pasta.

## Validação

`npm run build`; `npm run lint`; com Vite ativo em 4186, `node tests/wordcraft-regression.cjs`. Variáveis: PLAYWRIGHT_MODULE (módulo instalado), WORD_TEST_URL, WORD_TEST_BROWSER (padrão msedge), WORDCRAFT_TEST_DOCX (caminhos separados por `|`). Testes rodam em um perfil isolado e usam IndexedDB real, sem alterar os documentos fornecidos. Resultados/imagens em output/playwright, ignorados pelo Git.

WordCraft continua sendo um motor experimental: fontes ausentes e recursos complexos podem produzir diferenças em relação ao Microsoft Word. Os testes não certificam compatibilidade com todo DOCX.

## Fontes por link

O arquivo único `public/wordcraft/fontes.json` centraliza as famílias e variações disponíveis. Não contém fontes binárias: somente nomes, links HTTPS diretos TTF/OTF, estilo, peso, licença e SHA-256 opcional. As entradas iniciais são Lato, Open Sans, Roboto, Montserrat, Atkinson Hyperlegible e Lora, todas OFL-1.1, com links fixados em uma revisão oficial do Google Fonts e hashes verificados. Cada licença pode ser consultada pela aba Fontes.

Ao detectar pelo motor uma família ausente que tenha correspondência exata no catálogo, o host transfere seus dados com fetch e os entrega a `font.add` em memória. O texto e o nome da fonte no documento não são reescritos. A aba Fontes também permite carregar uma família manualmente para usá-la na lista nativa do editor. Fontes fora do catálogo são exibidas como ausentes; não há substituição silenciosa por uma família de nome diferente, nem download de fontes proprietárias.

Os dados são limitados a 4 MiB por arquivo e 16 MiB por sessão do editor, carregados em sequência e reaproveitados dentro da sessão. Há validação de formato, hash, tamanho durante a transferência, tempo limite, cancelamento ao sair e indicação de falhas com nova tentativa. O servidor dos arquivos precisa permitir acesso CORS. A transferência não leva cookies, credenciais ou conteúdo do documento. fetch usa no-store; os dados não são instalados no sistema, não geram Downloads e não são persistidos em cache próprio.

O shell upstream normalmente grava fontes adicionadas em IndexedDB. A integração intercepta apenas os puts de chaves com o prefixo reservado `neiva-session-font-` no object store wordcraft/fonts dentro do iframe. Esses puts tornam-se leituras sem escrita, mantendo a fonte funcional no motor durante a sessão. Fontes importadas manualmente pelo próprio WordCraft, preferências e documentos usam seus comportamentos normais. O motor oficial e seus módulos não foram alterados para isso. O guard continua instalado até o descarte do iframe para cobrir gravações assíncronas pendentes.

Para adicionar uma família, copie uma entrada do JSON e informe o nome real da família, a licença e links diretos para suas variações. Links de páginas e de folhas CSS não são arquivos de fonte. O nome precisa corresponder ao nome interno do TTF/OTF; uma divergência é informada. O hash pode ser omitido para links próprios, mas é recomendado. Não colocar fontes abertas diferentes como aliases de fontes proprietárias: isso não recupera a fonte original e pode mudar a paginação.

`node tests/wordcraft-fonts.cjs` testa a carga real por links, normal/negrito/itálico, preservação do conteúdo, ausência de persistência e Downloads, recarga de sessão e tratamento de falhas. Usa o mesmo PLAYWRIGHT_MODULE e WORD_TEST_URL dos demais testes. Não requer acesso a fontes instaladas na máquina nem abre permissões de fontes locais.
