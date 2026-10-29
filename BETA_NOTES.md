# Little Haven — Beta 0.2.0

**Versão:** `0.2.0-beta.1` · **Destino:** Windows x64 · **Distribuição:** executável portátil para testes com amigos.

Esta versão é experimental. As funcionalidades abaixo existem no código; a lista não substitui o resultado dos testes da entrega. Consulte [VALIDATION.md](VALIDATION.md) para verificações realmente executadas, limitações, tamanho e SHA-256 do artefato final. O guia para visitantes está em [TESTING.md](TESTING.md).

## Experiências disponíveis

- **The Room:** quarto em pixel art original, luminária e chuva interativas, preferências locais.
- **The Garden:** quatro canteiros e quatro vasos, cinco espécies, crescimento sem punições, rega com bônus limitado, decoração, luz, clima e pequenos animais.
- **The Journey:** trem contemplativo com cinco paisagens em loop, pausa, chuva noturna e cinco objetos interativos: luminária, cortinas, chá, livro e bilhete.
- **Let It Float:** escrita privada e efêmera, confirmação antes de descartar um rascunho e ritual do barquinho. O texto sai do estado da aplicação antes da animação e não vira uma lembrança automaticamente.
- **The Memory Corner:** importação de JPG/PNG/WebP com cópias originais intactas, miniaturas, visualização ampliada com zoom, legendas, molduras, bilhetes, organização por mouse/teclado, temas e backup completo `.haven-memory`.
- **Little Companion:** gatinho no quarto, jardim e trem, carinho, nome/renomeação, três pelagens e visibilidade persistente; sem obrigações de cuidado.
- **Cozy Sound Mixer:** 12 camadas locais/procedurais, volumes individuais e geral, mute, quatro presets e Custom persistente. O áudio exige ação do usuário a cada abertura.
- **Modo Imersivo:** jardim, trem e mural; diálogos e ferramentas mantêm prioridade de Esc, com M para mixer e C para My Companion.

## Novidades e correções desta preparação

- Carta pessoal de André em papel acolhedor com arte original de envelope, flores e estrelas. Abertura por um único acionamento, teclado, fechamento por botão/Esc, rolagem para janelas menores e movimento reduzido.
- Contatos reais fornecidos pelo desenvolvedor: e-mail e perfil público do LinkedIn. A carta funciona offline; os destinos externos só são acionados explicitamente. A ponte aceita identificadores fechados, valida a origem IPC e resolve destinos exatos no processo principal, mantendo a janela do aplicativo protegida contra navegação arbitrária.
- Identificação de Beta e versão `0.2.0-beta.1` nos metadados e na interface.
- Trava de instância por perfil: uma segunda abertura retorna à janela existente. Isso evita gravações concorrentes por aplicativos independentes sobre o mesmo mural, jardim e preferências.
- Electron atualizado de `44.9.0` para `44.10.0`; dependência transitiva `fast-uri` atualizada para `3.1.9` no lockfile. Os resultados da auditoria de dependências desta entrega devem ser consultados em `VALIDATION.md`.
- Guia de testes em português e questionário voluntário, sem coleta automática de feedback.

## Dados e privacidade

Preferências, jardim e mural usam arquivos separados no perfil local do Windows, normalmente `%APPDATA%\Little Haven`. A Beta mantém os formatos existentes; o mural continua no formato v1. Documentos inválidos ou de versões futuras ficam protegidos contra sobrescrita automática.

Os originais do mural são copiados sem recompressão. O backup inclui esses bytes, textos e organização, com limites e verificação de hashes antes da restauração. Ele não inclui o jardim ou as preferências. Dados e backups não têm criptografia implementada pelo aplicativo; mantenha cópias externas de conteúdo importante.

O ritual continua separado desses arquivos. Não há backend, login, telemetria, análise de conteúdo, upload, sincronização ou atualização automática. Os contatos externos não recebem fotos, bilhetes ou pensamentos.

## Limitações conhecidas

- Distribuição portátil Windows x64 sem assinatura digital; o SmartScreen pode exibir avisos. Confira origem e hash, sem desativar proteções do Windows.
- O jardim usa pontos predefinidos. Canteiros são fixos e vasos/decorações se movem por seleção e destino, sem posicionamento livre ou transplante entre tipos de espaço.
- As paisagens do trem se repetem em loop; paisagem, chuva e pausa duram a sessão. As três camadas sonoras do trem derivam da mesma gravação licenciada.
- O companheiro é visual e silencioso, tem percursos predefinidos e não aparece no ritual ou sobre o mural. O painel global continua acessível.
- O mural comporta até 60 itens; cada imagem tem limite de 20 MiB, 40 MP e 16.000 pixels por lado. A cota de originais reserva espaço para um backup de até 512 MiB. GIF, SVG e imagens animadas não são suportados.
- Há desfazer da última remoção durante a visita ao mural, sem histórico geral. Exporte um backup antes de substituir o mural por outro.
- Falhas ao salvar mantêm mudanças na sessão e exibem uma tentativa de recuperação. Fechamento forçado, falha de energia ou disco podem perder mudanças não confirmadas. O aplicativo não promete recuperação forense de dados.
- O funcionamento de `mailto:` depende de um aplicativo de e-mail configurado; a carta oferece o endereço para cópia quando a abertura falha. LinkedIn depende do navegador e de acesso à internet; o restante da carta é local.

## Validação e distribuição

O registro atual dos testes e os dados do executável final ficam em [VALIDATION.md](VALIDATION.md). Não trate resultados de versões anteriores como prova desta Beta.

Antes de recomendar o arquivo para os amigos, verifique no relatório se a geração do executável e seu teste de inicialização foram concluídos e se há bloqueadores pendentes. Compartilhe o `.exe`, [TESTING.md](TESTING.md) e o SHA-256 registrado para esse mesmo arquivo. Não envie a pasta de perfil, fotografias pessoais, `work/`, dependências ou arquivos de desenvolvimento.

Validação em uma máquina Windows sem Node.js, cobertura de leitores de tela, diferentes GPUs/DPI, equipamentos de áudio e sessões prolongadas exigem registro explícito. Na ausência desse registro, permanecem pendentes; o empacotamento isoladamente não comprova esses cenários.

## Próximos refinamentos

- Reunir feedback voluntário sobre conforto, clareza dos controles, áudio e estabilidade em computadores diferentes.
- Ampliar verificações com Narrador, escalas de tela, múltiplos monitores e equipamentos de áudio reais.
- Observar CPU, memória nativa/GPU e muitas fotografias durante sessões longas, preservando o carregamento de originais sob demanda.
- Refinar detalhes dos ambientes e do companheiro conforme evidências dos testes, mantendo privacidade, uso offline e ausência de cobranças.
