# Auditoria dos salvamentos — REVO Processos

O código completo está nas pastas da raiz do repositório. Cada commit guarda a árvore completa da versão, mesmo que o diff mostre somente os arquivos alterados. O prompt integral fica em [continuidade](../continuidade/PROMPT_COMPLETO_REVO_PROCESSOS.md).

## Histórico anterior à auditoria automática

Os marcos abaixo foram extraídos do Git; não foram inventados registros retroativos de testes ou envio remoto.

| Commit  | Data registrada no Git    | Etapa                                                                        |
| ------- | ------------------------- | ---------------------------------------------------------------------------- |
| c44a32d | 2026-10-29T19:51:16-03:00 | Initial commit                                                               |
| 8799059 | 2026-10-29T23:02:38Z      | feat: base persistente com autenticação, perfis, SSE e importação protegida  |
| 219eee7 | 2026-10-29T23:06:55Z      | feat: painel responsivo, timeline, progresso e importação por Merchant ID    |
| dfdea10 | 2026-10-29T23:12:35Z      | feat: progresso por loja, busca por etapa, backups e validação completa      |
| dc7c2b1 | 2026-10-30T00:21:44Z      | feat: preparar acesso inicial sem configuração manual de tokens              |
| 293fa03 | 2026-10-30T00:46:50Z      | feat: identidade REVO Processos com menu transparente e arte original        |
| f82a46c | 2026-10-30T00:52:08Z      | feat: fundo de marca responsivo em toda a interface sem cortar a logo        |
| b65274b | 2026-10-30T01:05:39Z      | feat: importação automática de pasta central com proteção contra duplicidade |

## Auditoria a partir desta atualização

Cada novo commit com o hook ativo adiciona um JSON em `salvamentos/`, com data UTC e de São Paulo, commit anterior, árvore preparada antes da própria auditoria, caminhos alterados e resumo. Consulte o commit que contém esse JSON para identificar o SHA final. O arquivo não afirma um push que ainda não aconteceu.

Ativação: `npm run audit:setup`. O postinstall também ativa o hook em checkouts Git sem outro conjunto de hooks configurado. Em outro clone a configuração local precisa ser ativada; num ZIP sem `.git` não existe histórico Git a auditar. Hooks existentes são preservados.

Para salvar uma etapa, coloque somente seus arquivos no staging e execute `npm run save -- "descrição"`. O comando cria commit auditado, tenta o push para a branch `codex/revo-processos` e compara o SHA local com o remoto. O commit permanece local se o envio falhar. Não use o script para contornar uma rejeição de autorização.

O registro não inclui patches completos, senhas, bancos ou planilhas privadas. A inspeção por nome de arquivo é uma proteção adicional e não substitui a revisão dos arquivos antes do envio. Uma auditoria Git não garante autenticidade inviolável: mantenha as permissões do repositório e confirme as versões remotamente.

## Validação de referência da aplicação

A implementação funcional b65274b foi validada com build, 39 testes com a planilha real e teste em navegador. A inclusão deste conjunto documental e de hooks deve ser verificada separadamente, sem afirmar que mudou a lógica da aplicação.
