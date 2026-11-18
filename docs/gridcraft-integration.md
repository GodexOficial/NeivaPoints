# GridCraft no NeivaPoints

O GridCraft 0.19.1 ocupa a posição do Excel em Aplicativos, mantendo o identificador excel e os mesmos espaços/posições dos outros atalhos. Abre em tela cheia. O motor só é carregado quando uma planilha é aberta. O PhotoCraft não foi incluído nesta alteração.

## Procedência e compactação

Pacote oficial: https://github.com/storytold/gridcraft/releases/tag/v0.19.1, gridcraft-web-0.19.1.zip. SHA-256 do arquivo validado contra o digest publicado no GitHub: 48c5d1b101befebb3c5ba3b7a14914f01c3207934813ed07dc4251b7ae116a78. Licenças MIT/Apache, NOTICE, atribuições e demais arquivos da distribuição foram preservados.

O motor original de 26.298.748 bytes foi compactado para 9.658.977 bytes em gzip. A descompressão conserva o SHA-256 original; não foram removidos recursos do motor. O carregador HTML foi adaptado para descompressão no navegador e inicialização da interface nativa em português. O manifesto public/gridcraft/manifest.json registra hashes e modificações. O script scripts/compact-gridcraft.cjs pode ser repetido para conferir/recriar a compactação. Arquivos do fornecedor são protegidos de conversão de quebra de linha por .gitattributes e excluídos da análise do código próprio pelo linter.

Hospedar todo dist em HTTPS, preservando os caminhos relativos. O carregador reconstrói uma Response com MIME application/wasm antes de inicializar o motor. Não depende de headers de compressão especiais no GitHub Pages e não precisa de COOP/COEP. Navegadores modernos com DecompressionStream e WebGPU ou WebGL2 são necessários. npm run build confere o limite de 50.000.000 bytes para a publicação completa.

## Arquivos e histórico

Ponte same-origin host=parent, com validação da janela e origem de cada mensagem. O armazenamento usa IndexedDB, separado por conta: neiva-gridcraft-workbooks para o modo local e um sufixo da conta nas sessões autenticadas. Os dados do Word não são alterados. Limites por conta: cinco arquivos, três versões por arquivo, 20 MiB por arquivo e 25 MiB no conjunto de versões. As transações são atômicas; falhas de quota não removem os backups já confirmados. Não há seleção de pasta nem envio de arquivos ao Supabase.

O host pede salvamento automático após dois segundos de alterações. Salvar e Baixar arquivo usam request(app.save), que passa pelo fluxo de download da interface web e entrega XLSX ao host. engine.execute(file.save) é um comando de disco nativo e não deve ser usado aqui. O arquivo só é mostrado como salvo após a transação IndexedDB concluir. O host mantém seu próprio estado de alterações, pois o motor considera o arquivo salvo antes de a gravação do host concluir. Falhas permitem nova tentativa ou download de recuperação. O estado dirty agregado do motor também impede limpar a indicação quando outro workbook nativo ainda tem alterações.

Restaurar reutiliza o renderer ativo e abre os bytes recuperados pela ponte oficial, evitando destruir e recriar um iframe WebGPU durante a troca. Os timers de autosave são cancelados ao abrir outra versão e quando o motor confirma que está limpo. Há um botão de compatibilidade na inicialização que utiliza o parâmetro webgl suportado pelo motor, para tentar WebGL2 quando a inicialização gráfica falhar.

Abrir aceita XLSX, XLSM, XLSB, XLS, ODS, CSV, TSV, TXT e JSON suportados pelo motor. Formatos avançados podem ter limitações da versão upstream, especialmente importação de dados de XLSB/ODS e macros; a integração não certifica compatibilidade total com Excel. Os bytes importados ficam no histórico até a política de retenção substituí-los. Salvar usa XLSX. Exportações CSV/PDF e outros formatos são downloads, sem substituir silenciosamente a cópia de trabalho por um formato com perdas.

Limpar os dados do site remove os arquivos locais; Baixar arquivo cria uma cópia portátil. Os arquivos não são sincronizados entre navegadores/dispositivos. A interface mantém esse aviso.

## Planilhas do editor anterior

O Excel anterior e suas dependências foram mantidos como recuperação, acessíveis pelo botão Abrir planilhas do editor anterior somente quando a conta atual tem registros neiva_excel_v1. Nenhum registro antigo é apagado ou convertido automaticamente. Para transferir, abrir no editor anterior, baixar XLSX e importar uma cópia no GridCraft. A ponte de armazenamento não mistura contas, nem altera a ordenação dos aplicativos.

## Verificações

Com Vite na porta 4186 e Playwright disponível: node tests/gridcraft-regression.cjs. Variáveis opcionais PLAYWRIGHT_MODULE e GRID_TEST_URL. O teste usa Edge e IndexedDB isolados, com planilhas sintéticas; não modifica arquivos pessoais. Confere fórmulas, salvamento automático/manual, download XLSX, reabertura, desfazer/refazer, histórico, mensagens de outra janela, quota, conflito, limites e isolamento entre contas/Word. Artefatos ficam em output/playwright, ignorado pelo Git.
