# REVO Processos

Aplicação web para acompanhar lojas em uma esteira de processos. React no frontend, Node.js 24+, Express, SQLite persistente e atualização entre sessões via Server-Sent Events (SSE). Sem banco ou serviço externo obrigatório; adequada para uma única instância e poucos usuários simultâneos.

## Iniciar

```bash
cd /workspace/Revo_Esteira_V2
npm ci
# Somente no primeiro uso, se ainda não houver usuários:
npm run prepare-owner
npm run dev
```

O comando de preparação cria o administrador com senha aleatória e salva o acesso em `data/revo-acesso-inicial.txt`, com permissão privada e fora do Git. Ele não imprime a senha, não sobrescreve arquivos existentes e recusa alterar uma conta já criada. O proprietário pode abrir esse arquivo e entrar com o usuário local `admin@revo.local`; essa identificação não é uma caixa de e-mail. Depois do login, use Minha conta para trocar a senha. Não é necessário escolher tokens ou outras configurações técnicas para esse fluxo.

A aplicação usa a porta 3000, com interface e API na mesma origem. O administrador cadastra os demais usuários na interface. Todos podem trocar a própria senha; administradores podem redefinir senhas da equipe.

Como alternativa para uma instalação remota sem acesso ao terminal, o bootstrap web exige SETUP_TOKEN privado e permite criar o primeiro administrador pela interface. Esse token é desnecessário quando o comando local já preparou a conta. A criação inicial é bloqueada assim que houver usuário.

Cada tarefa de nuvem já é isolada: reutilize o checkout existente, sem criar worktrees. Não reinicialize nem substitua um banco existente. Não use o banco de testes como banco real.

```bash
npm run build
# Produção requer HTTPS via proxy reverso e SETUP_TOKEN apenas no primeiro uso.
HOST=0.0.0.0 NODE_ENV=production npm start
```

Cookies de produção exigem HTTPS. `COOKIE_SECURE=false` é uma exceção para testes locais por HTTP, nunca para publicação. `HOST` padrão: `127.0.0.1`; `PORT` padrão: `3000`; `DB_PATH` padrão: `data/revo.sqlite`. Um único processo gerencia as conexões SSE e as prévias de importação. Configure o proxy reverso com buffering desativado para `/api/events` e tempo de leitura maior que 20 segundos. Publicação/hospedagem e HTTPS não são feitos automaticamente por este repositório.

## Funcionamento

- Status em sequência: Não reivindicado → Reivindicado → Entrando → Pré-Abertura → Cooperando → Fechado → Offline. Cadastro manual começa no primeiro; transições manuais só avançam uma etapa, via seletor ou arrastar e soltar no Kanban.
- Progresso por loja: 0%, 25%, 50%, 75%, 100%, 100%, 100%. É calculado pelo status geral, não pela quantidade de campos preenchidos.
- Timeline de integração independente com Assinando, Pré-abertura, Aceitação de pedidos, Cardápio e itens, Promoção, Verificação de qualidade e Empresa. Cada seção tem Pendente, Em andamento, Concluído ou Bloqueado e campos textuais.
- Lojas ordenadas pela última alteração; notas também atualizam essa ordenação. Busca geral, filtro de etapa, busca dentro de cada coluna e em cada seção da integração. Kanban e lista, com layout responsivo.
- Parâmetros de texto por etapa, orientações configuráveis pelo administrador, notas com autor/data e histórico persistente. A interface apresenta os últimos 100 eventos da loja; o banco retém o histórico completo.
- Administrador: usuários, configuração e operação. Operador (BD/Líder): lojas, integração, notas e Excel. Visualizador: leitura e exportação. As permissões são verificadas na API.
- SSE atualiza o painel e os detalhes abertos. Campos em edição são preservados quando chega mudança remota: aparece aviso para recarregar; a API recusa sobrescrever uma versão desatualizada.
- Usuários e lojas não são excluídos pela interface. É possível desativar usuários e revogar suas sessões. Não há exclusão de dados em massa por Excel.

## Excel e trava de duplicidade

A planilha recebida `temp_shop_1793305177494.xlsx` foi analisada: 330 lojas, 48 colunas, Merchant ID preenchido e único nas 330 linhas; Merchant Code vazio; nomes e Customer ID não são únicos. Por isso, **Merchant ID é a identidade da loja**. Ele é tratado como texto, normalizado para maiúsculas e espaços externos removidos, protegido por índice UNIQUE no SQLite e não pode ser editado.

O importador aceita o relatório original `shop`, com até 100 colunas, ou o modelo baixável na interface. Lê apenas a primeira aba, até 2.000 linhas e 3 MB, com limite de descompressão de 30 MB. Códigos com zeros à esquerda devem estar formatados como texto no Excel; zeros já perdidos no arquivo não podem ser recuperados. Fórmulas são recusadas. Não é aceito `.xls`.

Mapeamento do relatório:

| Origem                 | Campo da aplicação                                 |
| ---------------------- | -------------------------------------------------- |
| Merchant ID            | Código único / Merchant ID                         |
| Merchant Name          | Nome                                               |
| Merchant Contact Phone | Contato                                            |
| Merchant Owner         | Responsável                                        |
| Second City Name       | Cidade                                             |
| Merchant Status        | Status inicial, somente ao cadastrar uma nova loja |

Todas as colunas originais são preservadas como registro da primeira importação e podem ser consultadas na loja e exportadas na aba `Origem preservada`. Categoria, liderança, AOR, marca e fornecedor de PDV aparecem também no resumo da integração. Não inferimos a conclusão de um checklist a partir do status geral.

1. O upload gera uma **prévia** de novas lojas, existentes, duplicatas no arquivo e linhas inválidas. Ela expira em 10 minutos ou após confirmação; reiniciar o servidor também invalida prévias.
2. Por padrão, existentes são **preservadas integralmente**. Reimportar o mesmo relatório não duplica lojas e não apaga dados.
3. Atualizar existentes exige escolher esse modo e selecionar os campos. Só os campos selecionados e não vazios são atualizados. Código, status, integração, notas, parâmetros e registro de origem nunca são alterados pelo Excel.
4. Novas lojas recebem o status da planilha, se presente e reconhecido; caso contrário, Não reivindicado. Não é possível inferir as datas reais das etapas anteriores.
5. A confirmação é transacional: erro de concorrência reverte o lote inteiro. Duplicatas e linhas inválidas da prévia são ignoradas e contabilizadas.
6. A exportação respeita busca geral e filtro de etapa; inclui status, percentual e parâmetros. Buscas locais das colunas são apenas para navegação e não alteram a exportação.

Os relatórios anexados têm dados de contato. Os anexos, bancos e dados das lojas **não são enviados ao GitHub**. A planilha real foi usada somente em banco temporário de teste; para operar de verdade, importe-a com seu usuário autenticado.

## Verificação

```bash
npm run build
npm test
# Opcional: testar o próprio relatório sem publicar seus dados ou alterar o banco real.
FIXTURE_PATH=/caminho/relatorio.xlsx npm test
# Validação de interface com Chromium instalado:
npm run test:browser
npm audit --omit=dev
npm run format:check
```

Testes de API usam banco temporário isolado: autenticação, RBAC, CSRF, sequência de status, concorrência, rollback, notas, parâmetros, integração, importação idempotente, atualização seletiva, fórmulas, exportação e SSE. O teste do relatório real só roda quando `FIXTURE_PATH` é fornecido. Testes visuais usam Chromium em `/usr/bin/chromium` (ou `CHROMIUM_PATH`), criam banco temporário e o removem ao final. Capturas ficam em `/tmp`.

## Backup e restauração

**Commit e push protegem o código. Não fazem backup dos dados operacionais.** O banco e os anexos são ignorados pelo Git. Verifique o último commit remotamente após cada etapa; o trabalho está na branch `codex/revo-processos`, sem substituir `main`.

```bash
npm run backup
# Ou destino explícito, sempre um arquivo novo:
npm run backup -- /caminho/privado/revo-2026-10-29.sqlite
```

O comando usa `VACUUM INTO` para copiar consistentemente um banco em uso, verifica `PRAGMA integrity_check`, restringe permissões do arquivo e recusa sobrescrever um destino existente. **Guarde cópias fora deste ambiente**, com acesso restrito, rotina de retenção e proteção dos dados pessoais. Um backup guardado apenas no mesmo ambiente também pode ser perdido. Nunca faça backup de um SQLite em uso copiando apenas o arquivo `.sqlite`, pois pode haver dados no WAL.

Para restaurar sem sobrescrever nada: pare somente o processo da aplicação, copie o backup para um **novo caminho**, valide sua integridade e inicie apontando `DB_PATH` para essa cópia. Faça login e confira lojas, notas e histórico antes de usar. Não execute seed, reset ou importação de teste sobre o banco restaurado.

## Evolução e limites

A separação entre autenticação, domínio, persistência, importação e frontend permite evoluir sem mudar a identidade das lojas. SQLite usa WAL, transações e controle de versão para poucos usuários; múltiplas instâncias exigirão PostgreSQL e um barramento compartilhado para eventos e prévias.

Próximas melhorias recomendadas após observar o uso real: prazos por etapa e alertas de atraso; indicadores por responsável/líder; regras obrigatórias antes de avançar; anexos com armazenamento privado; login corporativo/MFA e recuperação de senha; backups externos agendados com teste de restauração; paginação para bases maiores. Não foi inventada uma regra de negócio para bloquear etapas por campos vazios.

A versão atual não faz sincronização com a plataforma que originou a planilha, envio de e-mails, geolocalização ou execução de campanhas. As colunas desses serviços são dados de referência. Antes de publicação: configurar HTTPS e armazenamento/backup externo; revisar o fluxo com a equipe. Nenhuma disponibilidade permanente é prometida por um processo rodando nesta sessão.

## Identidade visual

O tema aprovado usa azul-claro em toda a página, com o menu lateral em um tom um pouco mais escuro. Marcas d’água proporcionais se adaptam à tela de entrada, ao painel e ao celular; o desenho REVO e a palavra PROCESSOS ficam inteiros dentro de cada área. A marca d’água lateral usa opacidade de 8,5%, e o fundo principal, 5,5%. O efeito é aplicado somente por CSS e não modifica a arte. A logo principal, a marca d’água e a tela de acesso preservam o desenho REVO do Ativo 10. Por pedido posterior do proprietário, o subtítulo exibido é PROCESSOS: o layout oculta apenas o subtítulo antigo do arquivo e apresenta o novo nome como texto, sem redesenhar o símbolo ou modificar o arquivo original. O nome da aplicação é REVO Processos.

O PDF recebido foi preservado sem alterações em `client/public/branding/revo-original.pdf`. `brand.svg` é a conversão vetorial para exibição no navegador, sem redesenho, troca de cores ou deformação. O ícone da aba utiliza a redução original do Ativo 14, também convertida para SVG sem redesenho.

## Importação automática e mais de um computador

A aplicação monitora a pasta `data/importacao/entrada` (relativa ao diretório do banco). A variável opcional `IMPORT_DIR` permite apontar para outra pasta **montada no servidor**. Nenhum token ou credencial adicional é necessário para a pasta local.

- O monitor roda junto com o servidor, a cada 5 segundos, e aguarda o arquivo ficar estável por pelo menos 3 segundos. A pasta é criada automaticamente. O serviço precisa continuar ligado; esta sessão de desenvolvimento não garante funcionamento permanente.
- Copie novos arquivos `.xlsx` para essa pasta ou use **Importação automática → Enviar para a pasta**. Administradores e operadores podem enviar arquivos de vários computadores; apenas administradores ativam ou pausam o monitor.
- Cada arquivo é identificado pelo SHA-256 do conteúdo. O mesmo arquivo com outro nome, enviado por outra sessão ou encontrado após reinício, não reaplica dados. O controle é persistente no SQLite; a unicidade de Merchant ID continua obrigatória.
- Novas lojas são criadas. Nas existentes, atualiza nome, contato, responsável, cidade e método de aceitação quando disponíveis, não vazios e ainda iguais à origem conhecida. Edições feitas pela interface ou por atualização manual explícita ficam protegidas da automação. Os campos protegidos aparecem no histórico da pasta; a versão atual não remove essa proteção automaticamente.
- Status operacional, notas, parâmetros e checklist de integração existentes nunca são sobrescritos pelo monitor. O status da planilha só inicializa lojas novas.
- A primeira planilha permanece em **Planilha original**. Dados de referência mais recentes, como categoria e PDV, são preservados separadamente em **Última planilha** e usados no resumo da loja. Valores vazios não apagam referências anteriores. A exportação inclui a aba **Origem automática** quando houver dados.
- Arquivos são processados por data de modificação, com desempate pelo nome. Um arquivo com modificação anterior à última origem aceita de uma loja não regride os dados dessa loja. Isso usa a data do arquivo no servidor, não identifica a data comercial do relatório; uploads pela interface recebem a data do envio.
- Arquivos com Merchant IDs repetidos, linhas inválidas, fórmulas, estrutura inválida ou tamanho acima dos limites não são aplicados. Uma falha durante o lote reverte os dados do lote inteiro. Corrija o conteúdo e envie novamente; o histórico mostra o motivo. Até 100 conflitos são detalhados por execução.
- Os originais não são movidos, renomeados nem apagados pelo monitor. Arquivos temporários do Excel e links simbólicos são ignorados. O upload usa um nome de destino exclusivo e só expõe o `.xlsx` ao monitor depois de terminar a gravação.
- A auditoria identifica ações como **importação automática** e registra o administrador ativo que autorizou a operação (o primeiro administrador ativo da instalação). Sem administrador ativo, o monitor aguarda.

**Pastas em vários computadores:** vários usuários já podem alimentar a pasta central pela aplicação web. Monitorar automaticamente o Explorador de Arquivos de cada computador exige uma solução de sincronização ou um conector até a pasta central (por exemplo, uma pasta compartilhada de OneDrive/Drive disponibilizada ao servidor). Não foi instalada nem presumida nenhuma integração externa, conta, VPN ou acesso ao computador pessoal. O navegador sozinho não recebe acesso permanente a pastas do computador.

Para testar a automação: `npm test`. Com `FIXTURE_PATH`, o relatório real é verificado também pelo monitor em banco temporário. `npm run test:browser` valida o envio e o processamento na interface. Opcionalmente `RECORD_DEMO=1 npm run test:browser` grava uma demonstração com dados de teste; esse modo usa o FFmpeg já instalado no sistema e salva o vídeo em `/workspace/shared/revo-demonstracao-automatizacao.webm`.
