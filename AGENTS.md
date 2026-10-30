# Instruções do proprietário para este repositório

- Preserve o código existente, os dados reais, os anexos e o histórico. Não reconstrua do zero nem publique ambientes ou serviços sem pedido.
- Código completo fica na raiz, em client/, server/, tests/ e scripts/. Não crie cópias aninhadas do projeto nem versione ZIPs como substituto do histórico Git.
- A cada etapa relevante, atualize docs/continuidade/PROMPT_COMPLETO_REVO_PROCESSOS.md e sua cópia .txt, descrevendo o que mudou, o que foi validado e as pendências. Preserve o histórico desde a versão zero.
- Todo commit deve incluir auditoria em docs/auditoria/salvamentos/. npm run audit:setup ativa o hook .githooks/pre-commit quando não há hooks conflitantes. Não ignore o hook com --no-verify.
- Prepare explicitamente apenas os arquivos da etapa. npm run save -- "descrição" cria commit auditado, envia à branch codex/revo-processos e verifica o SHA remoto. Um commit local não prova salvamento no GitHub.
- Não faça force push nem substitua main. Confirme o destino origin: wilsonrvmartins-source/Revo_Esteira_V2. Respeite bloqueios de acesso e aprovação, sem contorná-los por scripts.
- Nunca envie data/, bancos, planilhas privadas, .env, acesso inicial, senhas ou backups com dados ao GitHub. O código no Git não substitui backup externo do banco.
- Execute as verificações proporcionais à mudança. Mudanças documentais não exigem repetir testes da aplicação já aprovados; mudanças de lógica precisam de testes pertinentes. Informe resultados verdadeiros, distinguindo testes opcionais ignorados.
- Use português claro e resolva escolhas técnicas rotineiras sem transferi-las ao proprietário. Não confunda GitHub, ambiente publicado, vídeo de demonstração e site público.
