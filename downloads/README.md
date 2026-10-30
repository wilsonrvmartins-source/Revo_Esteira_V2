# Baixar e abrir o teste no Windows

**[Clique aqui para baixar o pacote pronto](https://github.com/wilsonrvmartins-source/Revo_Esteira_V2/raw/refs/heads/codex/revo-processos/downloads/REVO-Processos-Teste-Local-Windows.zip)**

Se o link direto pedir acesso, entre na conta GitHub que tem permissão neste repositório. Também é possível abrir o arquivo `REVO-Processos-Teste-Local-Windows.zip` nesta pasta e clicar em **Download raw file** (ícone de download).

1. Baixe o ZIP completo (aproximadamente 47 MiB).
2. No Windows, clique com o botão direito no ZIP e escolha **Extrair Tudo**.
3. Abra a pasta `REVO-Processos-Offline`.
4. Dê dois cliques em **INICIAR-REVO.bat**.
5. O navegador abrirá. Escolha **Entrar como Administrador**.

Não é preciso instalar ferramentas nem digitar senha. Mantenha a janela preta aberta enquanto testa. Depois do download, o pacote funciona sem internet e usa somente o próprio computador.

O teste gera 330 lojas fictícias e arquivos de exemplo. Não inclui as lojas reais, senhas privadas ou banco operacional. Os testes são salvos na pasta `data-demo` da demonstração e continuam na próxima abertura.

O runtime é Node.js 24 LTS oficial para Windows x64, conferido contra o checksum do distribuidor e acompanhado da licença. O manifesto JSON desta pasta identifica o checksum e o commit funcional do pacote. O fluxo foi validado em Linux; a execução nativa do `.bat`/`node.exe` precisa ser confirmada no Windows do proprietário. Não desative antivírus ou proteções para executar o teste.

Não use **Code → Download ZIP** para iniciar diretamente o sistema: esse botão baixa o repositório de desenvolvimento. Use o pacote pronto acima.
