# PROMPT COMPLETO — CONTINUIDADE DO REVO PROCESSOS

Copie este documento inteiro para a outra IA de programação e forneça também o código da branch indicada. Este texto descreve o histórico, a implementação existente e as restrições do projeto; não é uma ordem para refazer o sistema ou publicar serviços automaticamente.

## 1. Sua missão e a fonte de verdade

Você assumirá a continuidade de uma aplicação existente chamada **REVO Processos**, uma esteira de processos para gerenciar lojas, desenvolvida com auxílio do Codex. Sou o proprietário, tenho pouca familiaridade com infraestrutura e preciso de instruções simples, resultados verificáveis e proteção contra perda de trabalho.

Primeiro analise os arquivos recebidos, execute o projeto e relate seu estado. **Não reconstrua do zero se o código já estiver disponível.** Leia README.md, package.json, package-lock.json, os módulos e os testes antes de propor mudanças. O código e os testes são a fonte de verdade; avise se houver divergência com este documento.

Repositório utilizado no desenvolvimento atual: **wilsonrvmartins-source/Revo_Esteira_V2**.
Branch com a aplicação: **codex/revo-processos**.
Commit da implementação mais recente até este documento: **b65274b81fabf968fad1586d67ab1401e4fd6d6d**.
URL: https://github.com/wilsonrvmartins-source/Revo_Esteira_V2/tree/codex/revo-processos

A branch main originalmente continha somente um README. Não baixe main presumindo que contém a aplicação. Confirme a branch e o SHA. Não substitua main, não faça force push e não altere o destino remoto sem autorização. Se a IA não tiver acesso ao GitHub, use o ZIP de código fornecido pelo proprietário e preserve o histórico que estiver disponível.

## 2. Origem e evolução, da versão zero à última atualização

O proprietário tentou recuperar um projeto anterior chamado Revo_Esteira. A conversa antiga estava travada e foi informado o erro `timed out recovering environment readiness from ERS`. Na investigação realizada naquela ocasião, o GitHub de Revo_Esteira tinha somente um commit inicial de README; não foram encontrados branches adicionais, tags, PRs, issues ou releases que recuperassem a aplicação. O disco da sessão anterior não estava acessível. Não se deve afirmar que todo o código antigo foi definitivamente perdido nem que foi recuperado: a aplicação atual foi construída posteriormente em Revo_Esteira_V2.

A sequência abaixo é um histórico de etapas, não uma lista de tags formais de releases. O package.json atual continua com versão 1.0.0.

| Etapa                     | Commit  | O que foi entregue                                                                                                                                                          |
| ------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versão zero               | c44a32d | Revo_Esteira_V2 com README inicial, sem aplicação.                                                                                                                          |
| Base funcional            | 8799059 | Node/Express, SQLite, autenticação, perfis, SSE e importação protegida.                                                                                                     |
| Painel e planilha real    | 219eee7 | React responsivo, Kanban/lista, timeline, importação por Merchant ID e primeiros testes.                                                                                    |
| Operação detalhada        | dfdea10 | Percentual por loja, buscas por etapa, histórico, backups e validação completa.                                                                                             |
| Acesso inicial simples    | dc7c2b1 | Preparação local do administrador com senha aleatória privada, sem exigir que o proprietário configure tokens.                                                              |
| Marca aprovada            | 293fa03 | Arte original REVO, subtítulo PROCESSOS, menu com transparência, marca d’água e ícone original.                                                                             |
| Fundo em toda a aplicação | f82a46c | Azul-claro no painel, menu um pouco mais escuro e logo inteira, adaptada de celular a monitor grande.                                                                       |
| Última implementação      | b65274b | Pasta central monitorada, envio por várias sessões, proteção contra duplicidades e edições manuais, dados externos recentes, histórico da automação e demonstração gravada. |

O ambiente do Codex foi publicado e restaurado posteriormente em uma nova instância. Na conferência de 30/10/2026, a aplicação permaneceu no SHA b65274b, sem alterações locais pendentes; a compilação, os 39 testes com o relatório real e a validação em navegador passaram. O banco restaurado continha 330 lojas, um administrador, um registro de importação automática e integridade OK. Isso demonstra a restauração verificada daquela instância; não garante disponibilidade permanente ou restauração de qualquer sessão antiga.

## 3. Objetivo do produto

Aplicação web leve, segura e responsiva, com aparência de app, para poucos usuários simultâneos acompanharem lojas em uma esteira. O pedido inicial citava a referência visual de onboarding do iFood. O nome da operação e da interface é **Processos**, e não Delivery.

Acesso por navegador em computador e celular. A instalação no celular como aplicativo/PWA, com manifest e service worker, **ainda não foi implementada**. Existe ícone da aba do navegador; não confunda isso com um app nativo ou uma PWA instalável.

## 4. Status e percentual de cada loja

A ordem é estrita:

| Índice | Status           | Progresso |
| ------ | ---------------- | --------- |
| 0      | Não reivindicado | 0%        |
| 1      | Reivindicado     | 25%       |
| 2      | Entrando         | 50%       |
| 3      | Pré-Abertura     | 75%       |
| 4      | Cooperando       | 100%      |
| 5      | Fechado          | 100%      |
| 6      | Offline          | 100%      |

Cadastro manual começa em Não reivindicado. Mudanças manuais podem manter o estado ou avançar apenas para o próximo: não podem pular etapas ou voltar. O usuário pode usar o seletor ou arrastar o cartão no Kanban; a regra é validada no servidor.

O percentual deve aparecer **na loja**, no cartão, na lista/exportação e nos detalhes. Não é calculado pelo preenchimento do checklist. Cooperando, Fechado e Offline têm 100% por definição expressa do proprietário.

A lista e os cartões são ordenados pela **última alteração**, mais recente primeiro. Adicionar uma nota também atualiza a versão e a data da loja. Há busca geral por nome/ID/responsável/cidade, filtro de etapa, busca em cada coluna do Kanban e busca dentro de cada seção da integração.

## 5. Integração detalhada, independente do status geral

A tela de cada loja tem uma timeline horizontal e colunas de integração inspiradas na imagem enviada pelo proprietário. As seções são:

1. **Assinando:** assinatura, contrato, hora da aprovação, conclusão do contrato e assinatura do comerciante.
2. **Pré-abertura:** informações da loja, qualificação, entrega, contato, parceria e repasse.
3. **Aceitação de pedidos:** método e rota de aceitação.
4. **Cardápio e itens:** cardápio, itens visíveis e pendências.
5. **Promoção:** campanhas, itens promocionais e condições.
6. **Verificação de qualidade:** validação de cadastro, operação e pendências.
7. **Empresa:** razão social, documento e contato.

Cada seção permite Pendente, Em andamento, Concluído ou Bloqueado e campos textuais. Esse checklist é independente do status geral e do percentual da loja. Não deduza que a integração está concluída só porque a loja veio em Cooperando na planilha.

Além disso, existem parâmetros textuais por etapa da esteira e orientações comuns configuráveis pelo administrador. Não confunda os parâmetros por etapa com as sete seções do checklist.

Nos detalhes há abas de dados/etapas, integração, notas, histórico, planilha original e, quando disponível, última planilha automática. O resumo inclui responsável BD, líder, AOR, marca, categoria e fornecedor PDV quando presentes.

## 6. Perfis e acesso

RBAC aplicado no backend:

- **Administrador:** acesso total, usuários, parâmetros e ativação/pausa da automação.
- **Operador (BD/Líder):** cadastro/edição de lojas, transições permitidas, notas, parâmetros, integração, importação/exportação e envio para a pasta automática.
- **Visualizador:** leitura e exportação; não altera dados ou usuários.

A aplicação usa senha com scrypt e salt; sessões de até 12 horas em cookie HttpOnly/SameSite Strict, com token de sessão armazenado em hash no banco. Produção usa cookie Secure. Há controle de origem/CSRF, cabeçalhos de segurança e limitação de tentativas de login. Não trate isso como certificação de segurança completa; valide alterações e os requisitos do ambiente de publicação.

Administradores podem criar, mudar perfil, ativar/desativar e redefinir senhas de outros usuários. Não podem desativar ou rebaixar a si mesmos. Troca de senha própria exige a senha atual e revoga as sessões antigas. A desativação de usuário revoga suas sessões. Não há exclusão de lojas/usuários pela interface.

A preparação local usa `npm run prepare-owner`, **somente em instalação nova, sem usuários**. Cria o identificador local `admin@revo.local` e uma senha aleatória, salva em `data/revo-acesso-inicial.txt` com permissão privada; não imprime a senha e não sobrescreve usuários ou arquivo existente. Esse identificador não é uma caixa de e-mail real. Senhas aceitas têm de 12 a 128 caracteres.

O bootstrap web alternativo usa SETUP_TOKEN apenas enquanto não houver usuário. Na instalação já preparada ele é bloqueado e esse token não é necessário. Não exija que o proprietário invente tokens nem recrie contas para contornar acesso. Não inclua senhas, cookies, tokens ou conteúdo do arquivo de acesso em logs, prompts, Git ou resposta pública.

## 7. Atualização simultânea e concorrência

Foi escolhido **Server-Sent Events (SSE)**, não Socket.io. Alterações devem aparecer entre usuários sem F5. O backend fornece `/api/events` e envia eventos de mudança; o frontend recarrega os dados pertinentes.

Lojas têm controle de versão otimista. A edição envia `version`; uma versão antiga retorna conflito e não sobrescreve o trabalho de outra pessoa. Se chegarem mudanças remotas durante uma edição, preserve os campos digitados, mostre o aviso e solicite recarga antes de salvar. Não substitua silenciosamente o formulário com rascunho do usuário.

O proxy de produção precisa permitir conexões SSE, sem buffering e com timeout compatível com os keepalives. A arquitetura atual é de um único processo; não distribua as sessões de eventos ou prévias em múltiplas instâncias sem projetar compartilhamento de estado.

## 8. A planilha recebida e a identidade da loja

Arquivo original analisado: `temp_shop_1793305177494.xlsx`, primeira aba `shop`, com **330 linhas de lojas e 48 colunas**.

- Merchant ID estava preenchido e era único nas 330 lojas.
- Merchant Code estava vazio.
- Merchant Name tinha repetição e Customer ID não era único.
- Portanto **Merchant ID é a chave da loja**. Não deduplique por nome, telefone, endereço ou Customer ID.

O ID é texto, com espaços externos removidos, normalização Unicode NFKC e maiúsculas; há UNIQUE no banco e ele não pode ser alterado pela edição da loja. Não invente IDs. Zeros já perdidos por formatação numérica no Excel não podem ser recuperados: mantenha IDs como texto na origem.

Mapeamento principal:

| Relatório              | Campo interno | Modelo REVO                      |
| ---------------------- | ------------- | -------------------------------- |
| Merchant ID            | code          | Código da loja                   |
| Merchant Name          | name          | Nome                             |
| Merchant Contact Phone | contact       | Contato                          |
| Merchant Owner         | owner         | Responsável                      |
| Second City Name       | city          | Cidade                           |
| Merchant Status        | initialStage  | Status inicial quando disponível |
| Método de aceitação    | method        | Método de aceitação              |

O parser também aceita Status como coluna de estado inicial. A comparação dos valores de status ignora diferenças de maiúsculas/minúsculas; valores desconhecidos são recusados. Os nomes das colunas seguem os mapeamentos explícitos do parser.

As 48 colunas do relatório analisado, para referência técnica, foram:

Merchant ID; Merchant Code; Merchant Name; Merchant Latitude; Merchant Longitude; Google Search Latitude; Google Search Longitude; Merchant Address; Merchant Contact Phone; Primary Category; Support Category; Merchant Owner; Merchant Status; Merchant Owner Type; Merchant Open Service; Brand Owner; Brand ID; Brand Name; Customer ID; Aor Name; Merchant Bind OpenApi; OpenApi Menu Push Time; Merchant Activity Summary; Merchant Owner Superior; Today Business Hour; Within Business Hours; visible spu count; Second City Name; Group ID; Group Name; Position offset distance from algorithm(meter); Position offset distance confidence; Full Reduce(Pickup); Full Reduce(Delivery); Full Discount(Pickup); Full Discount(Delivery); Meal for one(Pickup); Meal for one(Delivery); Number of promo items(Pickup); Number of promo items(Delivery); Reduce Delivery Fee; KP phone; Google Search POI-Merchant Distance (Unit: meters); BD Visit-Merchant Distance (Unit: meters); API Latitude; API Longitude; Expected PDV (API) provider; API-Merchant Distance (Unit: meters).

Os nomes originais das colunas são preservados como dados de origem. Isso não exige chamar o produto de Delivery. Não use nem divulgue os contatos reais em testes públicos.

## 9. Excel manual e trava de duplicidade

Usa ExcelJS e Multer em memória. Aceita `.xlsx`, primeira aba, até 3 MB, 2.000 linhas de dados e 100 colunas. Há verificação prévia de estrutura ZIP, até 500 entradas e até 30 MB descompactados. Recusa fórmulas, cabeçalhos mapeados repetidos, arquivos inválidos e `.xls`.

Fluxo manual:

1. Baixar modelo opcional ou enviar o relatório original.
2. Ver prévia de novas lojas, existentes, IDs repetidos no arquivo e linhas inválidas.
3. Confirmar a importação. A prévia pertence ao usuário, expira em 10 minutos e é descartada após uso ou reinício do servidor.
4. Por padrão, **preservar integralmente as lojas existentes**.
5. Atualizar existentes exige escolher explicitamente o modo e os campos presentes na planilha. Só valores não vazios e diferentes são aplicados.
6. Código, status existente, notas, integração, parâmetros e origem inicial não são substituídos pelo Excel. O status informado só inicializa lojas novas; sem status, novas lojas começam em Não reivindicado.
7. Linhas inválidas/repetidas são contabilizadas e ignoradas no fluxo manual. Uma falha de concorrência na confirmação reverte o lote inteiro.
8. Campos alterados por atualização manual explícita são protegidos contra automação posterior.

Exportação respeita busca geral e filtro de status; inclui dados, status, progresso e parâmetros. Buscas locais de cada coluna são apenas para navegação e não mudam a exportação. Há aba Origem preservada e, quando houver dados, Origem automática. A primeira origem é imutável; a origem automática é uma referência externa atualizada separadamente.

## 10. Pasta automática, vários computadores e preservação de dados

Pasta padrão: `data/importacao/entrada`, relativa ao diretório do banco. No ambiente original: `/workspace/Revo_Esteira_V2/data/importacao/entrada`. `IMPORT_DIR` pode apontar para outra pasta realmente montada no servidor; o padrão funciona sem configurar essa variável.

O monitor começa com o servidor, verifica a cada 5 segundos e aguarda pelo menos 3 segundos de estabilidade de tamanho/data do arquivo antes de ler. Não precisa clicar em confirmar. A importação é transacional e seu resultado fica no histórico.

Regras específicas:

- SHA-256 do conteúdo identifica o arquivo; o controle é persistido no SQLite. Mesmo conteúdo com outro nome, enviado por outra sessão ou reencontrado após reinício não reaplica dados.
- Merchant ID identifica a loja e continua protegido por UNIQUE.
- Novas lojas são criadas com estado inicial da planilha ou Não reivindicado.
- Em existentes, nome, contato, responsável, cidade e método podem ser atualizados se presentes, não vazios e ainda iguais à origem conhecida.
- Campos editados pela interface ou em atualização manual explícita ficam protegidos. `manual_overrides` e `import_baseline` sustentam essa regra. Para lojas anteriores à automação, a origem preservada ajuda a identificar edições já feitas.
- Não sobrescreva status operacional, notas, parâmetros ou checklist existentes.
- Dados externos recentes ficam em `source_latest` e aparecem em Última planilha; a origem inicial em `source_data` permanece intacta. Categorias/PDV recentes podem ser consultados sem substituir o trabalho manual.
- Vazios não apagam valores anteriores. Dados externos são mesclados conservadoramente.
- O monitor ordena arquivos pela data de modificação e nome. Não regride uma loja usando arquivo de modificação anterior à última origem aceita. A data considerada é a do arquivo no servidor, não uma data comercial inferida do relatório; uploads recebem a data de envio.
- Na automação, IDs repetidos, linhas inválidas ou erro no lote **recusam o arquivo inteiro**. Isso é deliberadamente mais rigoroso que a importação manual com prévia. O histórico mostra o erro; corrigir o conteúdo gera novo hash para processamento.
- Originais não são apagados, movidos ou renomeados pelo monitor. Temporários `~$` do Excel e links simbólicos são ignorados.
- Upload pela interface grava temporário e só depois o disponibiliza como `.xlsx`, com nome único, sem sobrescrever outro arquivo.
- Ações são registradas como importação automática, associadas ao primeiro administrador ativo. Sem administrador ativo, o monitor aguarda.
- Administrador ativa/pausa. Administrador e operador podem enviar arquivos, consultar o histórico e pedir verificação.

**Mais de um computador:** já é possível enviar para a pasta central pela interface web usando sessões diferentes. NÃO existe conexão automática pronta com pastas do Windows, OneDrive, Google Drive ou outros computadores. Isso exige um conector/sincronização até a origem central. Não afirme que o navegador monitora permanentemente o Explorador de Arquivos do usuário. Essa integração externa continua pendente.

## 11. Identidade visual e preferências aprovadas

Marca: **REVO PROCESSOS**. O proprietário forneceu PDFs Ativo 9, Ativo 10 e Ativo 14 e rejeitou uma logo inicialmente aproximada por fonte. O desenho oficial é a referência.

- `client/public/branding/revo-original.pdf`: Ativo 10 preservado, sem alterações. Seu conteúdo original tem a palavra DELIVERY.
- `client/public/brand.svg`: conversão vetorial fiel desse PDF, sem redesenhar o desenho REVO.
- `client/src/Brand.jsx`: apresenta o desenho REVO, oculta no layout apenas o subtítulo antigo e mostra PROCESSOS como texto separado, conforme pedido posterior explícito.
- `client/public/app-icon.svg`: redução original do Ativo 14 para ícone da aba; não substitua por uma letra de fonte.
- As imagens geradas para discutir espessura e formato do ícone foram prévias; não são autorização para substituir a arte oficial por uma logo inventada.

Preferência visual aprovada: **transparência/marca d’água**. Fundo azul-claro em toda a página (`#eaf1fb`), menu lateral um pouco mais escuro (`#d5e2f4`), destaque azul (`#216cdb`) e azul-marinho (`#0d203a`). Logo no topo e marcas d’água leves no painel, menu e entrada. Referências de opacidade: lateral 8,5%, principal 5,5%, com ajustes de posição/tamanho para celular e entrada.

Nunca estique a logo, mude suas cores, altere o desenho ou corte a palavra PROCESSOS. Use proporção e área de segurança. As caixas do conteúdo devem continuar legíveis sobre a marca d’água. A interface foi verificada de 320 px a 1920 px, incluindo 390, 768, 1024 e 1440 px. Preserve acessibilidade, contraste, navegação por teclado e adaptação móvel.

## 12. Arquitetura e arquivos

Stack já implementada:

- Node.js **24+**, módulos ES, Express 5 e SQLite nativo `node:sqlite`/DatabaseSync.
- React 19, Vite 7 e CSS próprio; sem dependência obrigatória de Tailwind.
- SSE para atualização ao vivo.
- ExcelJS 4.4 e Multer 2 para planilhas.
- Testes `node:test`, Playwright com Chromium para interface e Prettier.
- Lockfile versionado. Existe override de uuid usado por ExcelJS; não remova sem revisar compatibilidade e segurança.

Backend:

- `server/index.js`: servidor, autenticação, permissões, rotas, SSE e integração do monitor.
- `server/db.js`: schema, conexão e transações; WAL, foreign keys e busy timeout.
- `server/domain.js`: estados, perfis, validação, normalização de ID e planejamento de importação.
- `server/spreadsheet.js`: parser compartilhado, mapeamentos, baseline e proteção manual.
- `server/xlsx-guard.js`: inspeção do ZIP antes da descompressão.
- `server/auto-import.js`: monitor, deduplicação, proteção, histórico e aplicação atômica.
- `server/provision.js`: criação local e segura do primeiro administrador.
- `server/backup.js`: backup consistente e verificação de integridade.

Frontend:

- `client/src/App.jsx`: estado principal, autenticação, SSE, painel, filtros e modais.
- `StoreDetail.jsx`: loja, etapas, integração, notas, histórico e origens.
- `ImportPanel.jsx`: prévia e confirmação da importação manual.
- `AutomationPanel.jsx`: pasta monitorada, envio, status e histórico.
- `AdminPanels.jsx`: usuários e parâmetros.
- `Brand.jsx`, `components.jsx`, `constants.js`, `api.js`, `dates.js`, `main.jsx` e `style.css`.
- `client/index.html`, `client/public`, `vite.config.js`.

Tabelas existentes:

`users`, `sessions`, `stores`, `stage_fields`, `parameters`, `integrations`, `source_data`, `source_latest`, `notes`, `audit`, `import_baseline`, `manual_overrides`, `app_settings`, `auto_import_files`.

Não apague tabelas ou faça migração destrutiva para facilitar um teste. As tabelas podem conter a operação real. As proteções e hashes precisam sobreviver a reinícios.

Rotas relevantes, para confirmar no código:

- GET `/api/health`, GET/POST `/api/setup`.
- POST `/api/login`, POST `/api/logout`, GET `/api/me`, POST `/api/password`.
- GET `/api/events`.
- GET `/api/config`, PUT `/api/config/:stage`.
- GET/POST `/api/stores`, GET/PATCH `/api/stores/:id`, POST `/api/stores/:id/notes`.
- GET `/api/template.xlsx`, POST `/api/import/preview`, POST `/api/import/commit`, GET `/api/export.xlsx`.
- GET/POST `/api/users`, PATCH `/api/users/:id`.
- GET/PUT `/api/automation/import`, POST `/api/automation/import/files`, POST `/api/automation/import/scan`.

## 13. Execução, configuração e portabilidade

Na pasta do projeto, com Node 24+:

```bash
npm ci
# Apenas em instalação nova, sem usuário e sem arquivo de acesso anterior:
npm run prepare-owner
npm run dev
```

Porta padrão 3000, HOST 127.0.0.1, DB_PATH `data/revo.sqlite`. Frontend e API usam a mesma origem. Desenvolvimento usa middleware Vite; produção serve `dist` após `npm run build`.

Comandos existentes: `dev`, `build`, `start`, `test`, `backup`, `format:check`, `test:browser`, `prepare-owner`.

Produção em shell compatível:

```bash
npm run build
HOST=0.0.0.0 NODE_ENV=production npm start
```

`COOKIE_SECURE=false` é exclusivamente para testes locais por HTTP. Não desative proteção de produção para obter um teste verde. Não exponha uma instalação sem proteção ou dados reais por um túnel público sem autorização.

O script `start` usa sintaxe POSIX para variável de ambiente. **Um iniciador simples e portátil para Windows ainda não foi preparado.** O proprietário usa Windows e deseja conseguir testar localmente sem comandos técnicos; trate isso como uma possível próxima etapa, não como recurso já entregue. Caminhos `/workspace` e `/usr/bin/chromium` são do ambiente de desenvolvimento e podem precisar ser adaptados em outra máquina. `CHROMIUM_PATH` permite indicar outro executável para testes de interface.

## 14. Testes e evidências de funcionamento

Executar:

```bash
npm run build
npm test
npm run test:browser
npm run format:check
```

Para incluir a planilha real, sem colocá-la no Git:

```bash
FIXTURE_PATH=/caminho/privado/relatorio.xlsx npm test
```

A versão até este documento tem **39 testes**, todos aprovados na última verificação com o relatório disponível. Sem FIXTURE_PATH, dois testes de planilha real ficam explicitamente ignorados; não diga que todos executaram. `test:browser` valida separadamente login, cadastro, avanço a 25%, integração, buscas, importação automática, envio repetido e layout de 320 a 1920 px.

Testes usam bancos e pastas temporários isolados. Nenhum teste deve apontar para a base das 330 lojas. Na automação, a pasta padrão acompanha o diretório do banco, para impedir que testes monitorem a pasta real.

CI em `.github/workflows/checks.yml`: Node 24, npm ci, formatação, build e testes. Não afirme que o GitHub Actions executou se você apenas rodou localmente.

Há demonstração em vídeo do sistema funcionando com dados fictícios. `RECORD_DEMO=1 npm run test:browser` usa Chromium e o FFmpeg instalado, por screencast local, sem precisar baixar FFmpeg do Playwright ou usar serviço externo. As capturas/vídeos do ambiente não estão necessariamente no clone do GitHub. Não confunda vídeo com acesso interativo ao sistema.

## 15. Dados, backup e transferência segura

O banco real, os anexos com contatos, o acesso inicial, `data/`, `.env`, node_modules e dist **não são parte do código no GitHub**. Um clone ou ZIP só de código não conterá automaticamente o administrador ou as 330 lojas.

A base com 330 lojas existe no ambiente preparado e nos backups privados entregues. Não coloque esses dados em um repositório ou em demonstração pública. Não leia ou divulgue credenciais apenas para documentar o projeto. Solicite ao proprietário o backup privado apenas se uma restauração real for necessária.

Backup:

```bash
npm run backup
# Ou use um destino novo, privado:
npm run backup -- /caminho/privado/revo-backup.sqlite
```

Usa VACUUM INTO, verifica PRAGMA integrity_check, restringe permissão e recusa sobrescrever destino. Não copie só o .sqlite de um banco ativo, pois o WAL pode conter operações pendentes.

Restauração: extraia/copie para caminho novo, valide integridade, aponte DB_PATH e confira login, lojas, notas e histórico. Nunca sobrescreva uma base para testar se o backup funciona. Guarde também uma cópia fora do ambiente: Git protege o código, não os dados operacionais.

Pacotes privados entregues no ambiente original incluíam código, banco e arquivo de acesso. Esses pacotes são confidenciais e não devem ser reenviados ao GitHub. Este prompt e o ZIP somente de código foram preparados sem incluir o banco, a senha ou a planilha real.

## 16. O que foi feito e o que NÃO foi concluído

Feito: aplicação funcional e responsiva; RBAC; autenticação; Kanban/lista; sequência de etapas; progresso por loja; integração e parâmetros; buscas; notas/histórico; SSE; importação/exportação Excel; proteção contra duplicatas; monitor de pasta central; envio por múltiplas sessões; proteção de edição manual; origem mais recente separada; backups, restauração testada, CI e testes; identidade REVO Processos aprovada; demonstração gravada.

Ainda não concluído/configurado:

- Hospedagem pública da aplicação e domínio/HTTPS para acesso interativo externo.
- PWA instalável ou aplicativo nativo.
- Sincronização automática de pastas de vários PCs/Drive/OneDrive com o servidor.
- Iniciador local simples para Windows e pacote de demonstração local de um clique.
- Backups externos agendados com retenção e restauração periódica.
- Migração para PostgreSQL e coordenação de eventos/arquivos para várias instâncias.
- Recuperação de senha por e-mail, MFA e login corporativo.
- Prazos/SLA, alertas, notificações, anexos privados e indicadores avançados por responsável/líder.
- Liberação de proteção manual de campos por uma tela dedicada; hoje ela não é removida automaticamente.
- Paginação/virtualização para bases grandes e revisão de desempenho em volume maior.
- Integração operacional com a plataforma original das lojas: os campos de API, promoção e geolocalização do relatório são referências, não execução desses serviços.

Esses pontos são pendências ou sugestões. Não diga que já existem e não implemente tudo automaticamente sem alinhar a próxima etapa com o proprietário.

## 17. Situação da publicação e da demonstração

O proprietário publicou **o ambiente de desenvolvimento do Codex**, e a restauração foi verificada. Isso não publica automaticamente uma aplicação na internet.

Ele quer testar a interface clicando e aceita uma demonstração temporária com **dados fictícios**, separada dos dados reais. Autorizou remover essa demonstração depois do teste; isso não autoriza apagar produção, código, backups ou as 330 lojas. Não há hospedagem pública de demonstração já provisionada neste histórico.

Uma possibilidade discutida foi uma hospedagem gratuita para teste; disponibilidade e condições precisam ser verificadas na ocasião. Não prometa gratuidade permanente ou persistência de disco. Em serviços com disco temporário, SQLite e a pasta de entrada podem ser perdidos ao reiniciar. Para demonstração descartável isso pode ser aceitável; para uso real precisa de persistência adequada.

No contexto do Codex usado, não havia ferramenta de hospedagem conectada nem suporte a preview de localhost na interface de onboarding. Outra IA pode ter capacidades diferentes: verifique as ferramentas reais, não repita essa limitação como universal e não invente um link público. Nunca confunda salvar no GitHub, publicar um ambiente, gravar um vídeo e publicar um site.

## 18. Regras de trabalho exigidas pelo proprietário

1. Preserve código, banco, arquivos existentes e histórico. Não faça reset, force push, exclusão, substituição de banco, restauração sobre arquivos existentes ou reconstrução arbitrária.
2. Após cada etapa relevante, faça commit, envie ao remoto autorizado e confira o SHA. Um commit só local não é salvamento no GitHub. Se houver bloqueio, explique o motivo e entregue cópia recuperável, sem inventar sucesso.
3. Código atual é Revo_Esteira_V2 na branch indicada. Revo_Esteira é o repositório anterior, distinto. Confirme o destino antes de qualquer escrita remota.
4. Não publique ambiente ou serviço sem autorização. A instrução após a publicação do ambiente foi aguardar novas alterações, sem reaplicar mudanças antigas. O pedido que originou este prompt foi apenas garantir o código no GitHub e entregar o histórico para outra IA; não é autorização para uma nova implantação.
5. Não imprima segredos, não coloque credenciais no prompt/README e não peça valores secretos no chat. Não invente credenciais de serviços externos.
6. Continue autonomamente instalação, diagnóstico, correções dentro do escopo e testes úteis. Não transfira ao proprietário decisões técnicas rotineiras ou uma sequência desnecessária de confirmações.
7. Para uma nova mudança visual de marca, mostre prévia se solicitado; preserve arte e cores. Pedidos mais recentes do proprietário prevalecem: o nome exibido é PROCESSOS.
8. Diferencie implementado, testado, ignorado, pendente e não acessível. Não diga “está tudo funcionando” apenas porque há um PID ou uma porta aberta.
9. Na comunicação, fale em português claro. Diga o que fez, onde ficou salvo, como foi verificado e o que ainda depende de conta/serviço/ação externa.
10. Use o ambiente e o checkout existentes quando houver; não crie worktree sem pedido. Não execute novamente tarefas já concluídas só porque recebeu este histórico.

## 19. Primeira resposta e primeiras ações esperadas da nova IA

Ao receber este prompt e o código:

1. Confirme que encontrou a aplicação e a branch/SHA corretos; se recebeu só este texto, peça o código antes de alegar que analisou o sistema.
2. Inspecione o estado local e proteja alterações do proprietário.
3. Confira Node 24+, lockfile, scripts e persistência. Determine se é base real, base restaurada ou demonstração vazia.
4. Rode o build e os testes adequados com dados temporários; verifique a interface de verdade quando houver navegador disponível.
5. Relate, de forma simples, o que funciona e as limitações encontradas. Não exija recriar administrador se já houver uma base existente.
6. Aguarde a próxima funcionalidade solicitada ou execute a tarefa adicional que o proprietário informar junto com este documento. Não reconstrua, não publique e não altere regras de negócio por conta própria.

**Resumo do proprietário:** quero uma esteira web com aparência de app, fácil para toda a equipe, com REVO PROCESSOS e transparência, status e percentuais claros por loja, atualização simultânea, planilhas sem duplicatas, automação que preserve o trabalho manual e o código salvo a cada etapa para não perdê-lo novamente.

## 20. Atualização de documentação e auditoria dos salvamentos

Após a implementação funcional b65274b, o proprietário solicitou que o próprio GitHub também contivesse este prompt e uma auditoria dos salvamentos. A aplicação não foi reconstruída; o código completo continua nas pastas de origem da raiz.

O repositório passou a conter:

- `docs/continuidade/PROMPT_COMPLETO_REVO_PROCESSOS.md` e `.txt`: este histórico completo para outra IA, a atualizar quando houver mudança relevante.
- `docs/auditoria/AUDITORIA.md`: índice dos marcos e explicação dos registros.
- `docs/auditoria/salvamentos/*.json`: registro automático de cada commit preparado pelo hook, com data, versão-base, árvore de código preparada e caminhos alterados, sem copiar dados privados.
- `.githooks/pre-commit` e scripts de instalação/geração de auditoria. O postinstall ativa o hook quando houver um checkout Git e não houver outro conjunto de hooks configurado.
- `npm run save -- "descrição"`: salva o que já foi colocado no staging, faz commit com auditoria, tenta push para a branch de desenvolvimento e confirma o SHA remoto. Não faz force push nem adiciona todos os arquivos automaticamente.
- `AGENTS.md`: exige que futuras IAs atualizem o prompt, preservem os dados e mantenham o salvamento auditado.

Uma auditoria incluída no próprio commit não pode conter antecipadamente o hash desse mesmo commit sem criar autorreferência. Por isso, o registro identifica a versão anterior e a árvore preparada antes de incluir a auditoria; o SHA final é consultado no Git e sua presença no remoto deve ser verificada após o push. O arquivo não afirma que houve push antes de ele ocorrer.

GitHub mantém o código completo em cada commit. Não copie a aplicação dentro de outra pasta a cada salvamento nem versione ZIPs, bancos e senhas para simular histórico. A auditoria automática exige o hook instalado; em um ZIP sem `.git`, não há commits nem hooks para registrar. Não sobrescreva hooks preexistentes sem autorização. Se o envio for recusado por autenticação ou revisão de aprovação, não o contorne por outro comando: explique a situação e preserve o commit local.

Validação desta atualização: três testes específicos da auditoria passaram (registro e hash exato do prompt, bloqueio de arquivo privado e preservação de hooks existentes), além da verificação de formatação. São adicionais aos 39 testes da aplicação; o total passa a 42 casos, com dois opcionais dependentes da planilha real. A lógica de negócio da aplicação não foi alterada nesta etapa.
