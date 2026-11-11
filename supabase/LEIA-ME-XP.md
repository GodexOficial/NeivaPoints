# Atualização do XP por presença

## Aplicar no projeto do site

1. Abra `login_xp.sql`, nesta pasta, e copie todo o conteúdo.
2. No Supabase, abra o projeto usado pelo site e acesse **SQL Editor → New query**.
3. Cole o SQL e execute **Run**. Aguarde o término sem erros.
4. Atualize a página do aluno. O botão retoma uma sessão ativa; não cria um segundo período.

O arquivo é uma atualização completa e reaplicável. Preserva alunos, pontos, histórico e configurações já salvas. As alterações são executadas em uma transação: um erro cancela a instalação inteira. As tabelas existentes `students`, `point_transactions` e `app_settings` são necessárias.

As alterações do banco **não foram aplicadas remotamente pelo assistente**. O acesso público do site não equivale a uma conexão administrativa para executar SQL. A interface mantém compatibilidade com a resposta antiga; a retomada entre dispositivos, a recuperação dos minutos atrasados e a proteção global entre sessões exigem o SQL v2.

## Correções

- Retoma a mesma sessão ao recarregar ou abrir outra aba/dispositivo.
- Uma trava no aluno e outra na sessão serializam os créditos. Um cursor global por aluno impede que sessões sobrepostas recebam o mesmo intervalo novamente.
- Chamadas repetidas não repetem um crédito. O histórico possui uma identificação determinística por lote creditado.
- Crédito, histórico e avanço do cursor são gravados juntos. Falhas não deixam pontos sem histórico nem consomem um crédito que não foi salvo.
- Minutos completos atrasados são recuperados somente dentro da janela confirmada e do horário permitido. O último minuto é pago mesmo se a requisição chegar depois do encerramento.
- O próximo crédito segue o horário previsto; a demora da resposta não reinicia um minuto inteiro.
- A taxa de XP fica registrada no início da sessão. Alterações na configuração valem para novas sessões.
- A antiga RPC de confirmação não estende mais indefinidamente a janela. Uma nova janela exige um novo início após o encerramento.
- A interface não anuncia créditos locais fictícios. Sem banco ou confirmação, não aumenta o saldo.
- A barra abaixo do controle mostra saldo confirmado, nível e progresso. A confirmação do servidor atualiza o saldo imediatamente, sem aguardar o carregamento dos demais dados.

O horário continua sendo `America/Fortaleza`, preservando a regra existente. O período de cada confirmação é limitado a 120 minutos e a taxa a 10.000 XP/minuto. Os valores comuns existentes são preservados.

## Limite de segurança encontrado

Este projeto utiliza login próprio salvo no navegador, sem uma identidade assinada do Supabase Auth. Além disso, `rls_policies.sql` concede escrita pública em alunos e transações. Assim, alguém que contorne a interface ainda pode adulterar pontos por outras rotas. O SQL de presença impede duplicações neste fluxo, mas **não torna seguro o acesso geral ao banco**.

A correção completa dessa exposição requer migrar a autenticação e substituir as políticas públicas, incluindo os fluxos do professor. Não revogue essas permissões isoladamente: isso interromperia os cadastros e a administração atuais. O clique também não é uma prova criptográfica de presença humana; ele autoriza somente a janela limitada configurada.

## Verificações realizadas

- SQL executado e reaplicado em PostgreSQL isolado (PGlite), sem dados reais.
- 30 inícios e 40 reivindicações repetidas, sessões sobrepostas, resgate atrasado, último minuto, nova janela e falha simulada do histórico.
- Verificação de reversão transacional, taxa capturada e configurações inválidas.
- PGlite usa uma conexão; a ordem das travas foi revisada, mas esse teste não substitui um teste de carga com várias conexões no projeto real.
- Navegador com respostas simuladas: clique duplo, recarga, duas abas, relógio local alterado, falha de rede, retomada e passagem de nível.
- Layout de desktop e celular; nenhum aluno real recebeu XP durante os testes.
