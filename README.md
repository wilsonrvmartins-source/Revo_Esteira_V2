# REVO Processos

Aplicação web para acompanhar lojas em uma esteira de processos. React no frontend, Node.js 24+, Express, SQLite persistente e atualização entre sessões via Server-Sent Events (SSE). Sem banco ou serviço externo obrigatório; adequada para uma única instância e poucos usuários simultâneos.

## Iniciar

```bash
cd /workspace/Revo_Esteira_V2
npm ci
# Defina um token privado de configuração inicial no terminal ou gerenciador de segredos.
# SETUP_TOKEN não deve ser salvo no Git nem reutilizado como senha.
export SETUP_TOKEN='substitua-por-um-token-longo-e-aleatorio'
npm run dev
```

A aplicação usa a porta 3000, com interface e API na mesma origem. No primeiro acesso, informe o token e crie seu administrador com senha de pelo menos 12 caracteres. Não há senha padrão. Depois da criação do primeiro usuário, o bootstrap é bloqueado, mesmo com o token correto. O administrador cadastra os demais usuários na interface. Todos podem trocar a própria senha; administradores podem redefinir senhas da equipe.

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

A versão atual não faz sincronização com a plataforma que originou a planilha, envio de e-mails, geolocalização ou execução de campanhas. As colunas desses serviços são dados de referência. Antes de publicação: configurar HTTPS, administrador real e armazenamento/backup externo; revisar o fluxo com a equipe. Nenhuma disponibilidade permanente é prometida por um processo rodando nesta sessão.
