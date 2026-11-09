# Little Haven — A Cozy Place to Breathe

Um pequeno refúgio desktop em pixel art: uma noite de chuva, uma luz quente e um lugar onde você pode apenas existir. Sem contas, metas, pontuações ou serviços em nuvem.

A fundação da Fase 1 entrega **The Room** e o ritual **Let It Float**. O aplicativo também oferece **The Journey**, uma viagem contemplativa de trem com cinco paisagens e pequenos objetos interativos, **The Garden**, um jardim para plantar e contemplar sem cobranças, e **The Memory Corner**, um mural pessoal de fotografias e bilhetes.

Esta é a **Beta experimental 0.2.0 (`0.2.0-beta.1`)**, destinada aos primeiros testes com amigos. O comando `npm run package:win` gera o executável em `outputs/desktop/Little-Haven-0.2.0-beta.1-x64.exe`. Depois de gerado, abra esse arquivo para usar o aplicativo sem instalar Node.js. A distribuição é portátil e não possui assinatura digital; o Windows pode mostrar avisos do SmartScreen. Confira origem e SHA-256 sem desativar proteções. O código-fonte editável fica na raiz deste projeto; dependências, builds, executáveis e perfis de teste são locais e não são versionados no Git.

O guia para compartilhar com os visitantes está em [TESTING.md](TESTING.md), as novidades e limitações em [BETA_NOTES.md](BETA_NOTES.md), e os resultados atuais, tamanho e SHA-256 em [VALIDATION.md](VALIDATION.md). Fotografias importantes devem ter cópias de segurança fora do aplicativo.

O diagnóstico de assinatura, SmartScreen e futuro canal MSIX/Store está em [WINDOWS_DISTRIBUTION.md](WINDOWS_DISTRIBUTION.md). O fluxo `package:win:signed` exige assinatura real e usa uma pasta separada; o portátil existente continua disponível. Nenhum comando de empacotamento publica automaticamente.

## Executar no Windows

Requisitos: **Windows x64**, **Node.js 22.12 ou superior** e npm. Abra o terminal na pasta do projeto.

```powershell
npm ci
npm run dev
```

O modo de desenvolvimento inicia o Vite em `http://127.0.0.1:5173` e abre o Electron. Fechar a janela encerra os processos iniciados por esse comando. A porta precisa estar livre.

Para executar a versão de produção local:

```powershell
npm run build
npm start
```

A instalação de dependências, o primeiro download do runtime Electron e as ferramentas de empacotamento precisam de conexão. Depois de preparado, o aplicativo desktop funciona sem internet.

| Comando | Finalidade |
| --- | --- |
| `npm ci` | Instalar as versões fixadas em `package-lock.json`. |
| `npm run dev` | Abrir o Electron com recarregamento durante o desenvolvimento. |
| `npm run dev:web` | Desenvolver somente a interface no navegador local. |
| `npm run build` | Gerar a interface de produção em `dist/`. |
| `npm start` | Abrir o Electron usando o último build de `dist/`. |
| `npm run preview` | Inspecionar o build no navegador em `127.0.0.1:4173`. |
| `npm run package:win` | Gerar a distribuição portátil Windows x64 em `outputs/desktop/`. |
| `npm run package:win:signed` | Exigir assinatura e timestamp; gerar e verificar o portátil em `outputs/desktop-signed/`. Requer credenciais válidas. |
| `npm run verify:win` | Inspecionar assinatura, metadados e SHA-256 do portátil existente e do executável interno; não os executa. |
| `npm test` | Executar os testes unitários. |
| `npm run test:e2e` | Gerar o build e executar os testes da interface. |
| `npm run test:desktop` | Abrir e verificar o Electron com um perfil de teste isolado; exige build prévio. |
| `npm run test:memory` | Verificar importação, originais, backup, privacidade e imersão do mural no Electron, com fotografias sintéticas e perfil isolado. |

## Primeiros momentos no refúgio

- Clique na **luminária** para mudar a luz do quarto.
- Clique na **janela** para ligar ou desligar a chuva. Os controles sob o cenário oferecem as mesmas ações.
- Clique no **caderno** ou escolha **Let It Float** para escrever um pensamento.
- Escolha **Let it float** para dobrar o papel e acompanhar o barquinho pelo rio. O texto não é exibido no barco.
- **Cancelar** e a navegação para outro ambiente pedem confirmação quando existe um rascunho. Fechar ou recarregar a janela desktop também permite continuar escrevendo antes de descartar.
- Ao final, volte ao quarto. Durante a animação, **Concluir sem animação** permite chegar diretamente ao momento final.
- Escolha **The Journey** para entrar em um vagão acolhedor. Em **Paisagem da viagem**, alterne entre noite chuvosa, floresta, pôr do sol, **Snowy Mountains** e **Morning Lake**, com paisagens em movimento contínuo pela janela. As montanhas têm neve lenta e pinheiros nevados; o lago ao amanhecer tem reflexos, névoa e pássaros distantes.
- Explore os objetos do vagão: acenda ou apague a **luminária**, abra ou feche as **cortinas**, prepare **chá**, leia o **livro** no banco e consulte o **bilhete** sobre a mesa. O livro tem quatro páginas originais; o bilhete acompanha a paisagem selecionada. A xícara pode ser preparada novamente: o vapor diminui após 12 segundos e termina após mais 18 segundos, mesmo com o trem parado.
- Pause ou retome a viagem pelos controles abaixo do cenário; a pausa congela as animações. Na paisagem noturna, ligue ou desligue a chuva. O botão de retorno leva ao quarto.
- Em The Journey, o botão com ícone de expandir e tooltip **Modo Imersivo** abre o cenário em tela cheia.
- Em **The Garden**, toque em um dos quatro canteiros ou quatro vasos para plantar margarida, lavanda, **hibisco rosa**, samambaia, suculenta ou as novas flores do **Little Bouquets**, descritas abaixo. Broto, planta jovem e adulta aparecem aos 2, 8 e 20 minutos acumulados, incluindo o tempo com o aplicativo fechado. As plantas nunca morrem ou regridem por ausência.
- Selecione **Regar** e toque na planta para ver regador, gotas e uma reação das folhas. A primeira rega de cada estágio não adulto acrescenta 20% da duração daquele estágio ao crescimento; repetir não acumula bônus. Plantas adultas continuam reagindo.
- Use **Mover** para selecionar dois vasos ou pontos decorativos compatíveis e trocar suas posições. Vasos levam planta e aparência juntos; canteiros permanecem fixos. **Esc** cancela a ferramenta. Toque em uma planta para mudar o vaso, substituir a espécie ou retirá-la com confirmação.
- Explore os pontos de decoração para colocar banco, lanternas, pedras e cogumelos. Há vasos de terracota ou madeira, lanternas que podem ser apagadas, borboletas, vagalumes noturnos e peixes que respondem ao toque no lago.
- Procure o **gato laranja entre as plantas**: orelhas e cauda espiam em um dos três arbustos. Clique ou use Tab e Enter para chamá-lo; ele aparece, pisca e volta a se esconder. Não exige alimento ou cuidados.
- Em **Luz e clima**, escolha dia, pôr do sol ou noite, com clima limpo ou chuva suave. O jardim possui o mesmo **Modo Imersivo** da viagem; o baú de ferramentas e a placa de atmosfera mantêm os controles acessíveis dentro do cenário.

### Little Bouquets — Flores para Você

No **The Garden**, toque na **mesa de florista** ou em **Oficina de buquês**. O ateliê reutiliza a arte SVG/CSS e o áudio do jardim; a criação funciona offline, também na imersão. Não há Aseprite, nova engine, serviço de envio remoto ou dependência adicional nesta implementação.

- O jardim agora inclui **girassol, rosa vermelha, rosa cor-de-rosa, tulipa, hortênsia, peônia, dália, flores-do-campo e cosmos**, além das cinco espécies anteriores. As novas flores usam os mesmos quatro estágios, rega e persistência. Flores adultas cultivadas ficam disponíveis para arranjos, sem consumo, remoção ou regressão da planta.
- Combine até **12 hastes**, limite visual da composição. Remova ou reorganize flores pelos controles, escolha cinco papéis e cinco laços, folhagens e etiqueta. Não é necessário arrastar objetos. A animação de acabamento é breve e respeita movimento reduzido.
- Escreva uma carta de até **1.000 caracteres**, com linhas, acentos e emojis; sugestões opcionais continuam editáveis. Escolha o papel da carta e personalize **Assunto do e-mail** (até 120 caracteres). Assunto vazio usa “Um pequeno buquê para você 💐”; espaços nas pontas são removidos, quebras de linha e controles são rejeitados.
- Revise **Para**, **Assunto**, **Mensagem** e **Presente** antes de compartilhar, podendo voltar à montagem ou à carta. A edição permanece na sessão ao visitar outro ambiente. Recarregar ou fechar encerra essa sessão.
- **Salvar rascunho** é explícito: guarda somente o arranjo por padrão; carta e assunto exigem marcar a opção correspondente. O destinatário nunca entra no rascunho. É possível excluir o rascunho local. No desktop, ele fica em `bouquet-draft.json`; na versão web, em `little-haven-bouquet-v1`, separado das preferências e do jardim.
- Exporte **PNG do buquê**, **PNG do cartão** com texto de alta resolução ou **cartão HTML** independente, com imagem embutida e texto legível. PNGs com muitas linhas têm limite de altura; HTML mantém cartas desse tipo sem reduzir a fonte. Destinatário e assunto não são incluídos nos arquivos. O diálogo nativo permite escolher o destino no Windows.
- **Abrir meu e-mail** prepara um `mailto:` com destinatário opcional, assunto personalizado e carta codificados. É necessário um cliente de e-mail configurado. Nada é enviado automaticamente; seu endereço pessoal pode aparecer. **Anexe manualmente o cartão exportado**: o aplicativo não promete um anexo automático.

Cartas extensas podem ultrapassar o limite de abertura de links do Windows. Nesse caso, **Abrir e-mail sem a carta no corpo** é uma ação separada: mantém destinatário e assunto, deixa a carta intacta na oficina e orienta anexar o cartão completo. A mensagem nunca é truncada silenciosamente. O limite de 2.081 caracteres da integração está documentado na [API shell do Electron](https://www.electronjs.org/docs/latest/api/shell#shellopenexternalurl-options).

O envio intermediado sem revelar o e-mail pessoal ao destinatário está indisponível. A [proposta técnica separada](BOUQUETS_DELIVERY_PLAN.md) descreve infraestrutura, confirmação por envio, autenticação, prevenção de abuso, bloqueios e retenção mínima. Ela não instala nem ativa um serviço. O mural não recebe cartas automaticamente e Let It Float permanece independente.

A representação das flores é modular em `GardenPlants.jsx`; a composição em `src/scenes/Bouquets/` usa posições próprias, separadas dos dados em `shared/bouquets.js`. Refinamentos visuais e futuros sprites podem substituir as artes sem mudar o modelo do arranjo. Resultados de testes desta entrega estão em `VALIDATION.md`.

### The Memory Corner — A Place for What Matters

Escolha **The Memory Corner** na navegação para entrar em um cantinho com mural de cortiça, madeira, pequenas flores e luzes. Ele começa vazio: você escolhe o que deseja manter por perto.

- **Add a Memory** abre o seletor do computador e aceita várias fotografias JPG/JPEG, PNG ou WebP. O conteúdo real é validado e decodificado; SVG, GIF e imagens animadas não são aceitos. Cada imagem pode ter até **20 MiB**, **40 megapixels** e **16.000 pixels por lado**. O mural comporta **60 itens**; o conjunto de originais tem uma cota um pouco inferior a **512 MiB**, reservando espaço para os metadados do backup. Mensagens de erro explicam os limites.
- Selecione uma fotografia e escolha **Editar** para acrescentar ou remover uma legenda e escolher Polaroid, madeira clara, madeira escura, papel fotográfico ou detalhes florais. As fotos mantêm proporção, nitidez e cores; as molduras não alteram os arquivos.
- **Write a Note** cria um bilhete com até 2.000 caracteres, acentos, Unicode e múltiplas linhas. Escolha uma das cinco cores e papel simples, pautado ou com borda artesanal. **A Little Reminder** oferece oito mensagens opcionais, que só entram no mural após sua confirmação. O texto permanece texto nativo, legível, sem rasterização.
- Arraste os cartões para reorganizar. Selecione com Tab/Espaço e use as setas (Shift move um pouco mais) ou os botões direcionais. É possível inclinar em −8°, −4°, 0°, +4° e +8° e alterar a sobreposição. As posições relativas se adaptam à janela; o arrasto só grava ao soltar.
- Dois cliques, **Enter** ou **Ampliar** abrem a fotografia original ou o bilhete inteiro. Fotos oferecem zoom, ajuste à janela, arrasto e barras de rolagem; somente o original aberto é carregado. **Remover** pede confirmação, e **Desfazer remoção** recupera o último cartão durante a visita. Os arquivos da pasta de origem permanecem intactos.
- **Seu cantinho** oferece Warm Memories, Moonlight Notes e Garden Keepsakes, além de luzes, flores e estrelas opcionais. O **Modo Imersivo** reutiliza o mecanismo existente com fotografias e textos em resolução nativa. M abre o mixer, C abre My Companion e Esc fecha primeiro o diálogo ou as ferramentas, depois sai da imersão. O gatinho permanece nos ambientes anteriores; não foi acrescentado sobre o mural.

Ao entrar no mural, a combinação de áudio atual continua sem troca automática nem reprodução inesperada. O volume, mute, Custom e os controles do Cozy Sound Mixer são compartilhados com os demais ambientes.

#### Armazenamento e backup das lembranças

No desktop, `app.getPath('userData')/memory-corner/` guarda `board.json`, `images/` e `thumbnails/`. O JSON versionado contém os textos, legendas, posições, tema e referências internas, sem caminhos de origem ou fotografias em base64. Os originais são copiados **byte por byte**, incluindo sua resolução e metadados, com identificadores UUID. Mover ou apagar a fonte não remove a cópia do aplicativo. Miniaturas PNG de até 640 pixels são derivadas e recriáveis; a visualização ampliada usa o original com orientação de exibição respeitada. Fotografias nunca recebem `image-rendering: pixelated`.

O decodificador do Chromium trabalha em uma janela oculta de curta duração, com sandbox, isolamento e sessão efêmera sem rede. Ele considera EXIF e WebP, gera a miniatura e libera o bitmap; não altera os bytes originais. Isso evita depender da [API nativeImage, que não considera EXIF](https://www.electronjs.org/docs/latest/api/native-image). A janela principal recebe somente URLs internas `haven-memory://local/<UUID>/thumbnail` ou `/original`, nunca acesso a caminhos arbitrários.

Cada alteração confirmada é enviada imediatamente para gravação atômica. O fechamento normal aguarda as operações aceitas. Falhas deixam a sessão disponível, com aviso e **Tentar novamente**; documentos corrompidos ou de versões futuras ficam protegidos contra sobrescrita automática. Remoções deixam a cópia disponível para desfazer durante a sessão; cópias sem referência são limpas no encerramento normal. Não há promessa de eliminação forense, recuperação de mudanças não confirmadas ou proteção contra falha de disco/encerramento forçado.

Em **Seu cantinho → Exportar backup**, escolha um destino para o arquivo **`.haven-memory`**. Ele inclui os originais intactos, mensagens, legendas, posições, ordem, tema e decorações, em formato binário versionado, sem compressão ou fotos dentro de JSON. A restauração é explícita, pede confirmação e valida estrutura, limites, hashes SHA-256 e decodificação das imagens antes de trocar os metadados. Se falhar, o mural atual permanece. Exporte uma cópia do mural atual antes de substituí-lo se quiser conservar os dois. O pacote pode ser restaurado em outra instalação desta versão; uma captura de tela não substitui esse backup.

As lembranças ficam **somente neste computador**, sem upload, análise, sincronização ou criptografia implementada pelo aplicativo. Proteja o computador e os backups conforme sua preferência. No desenvolvimento pelo navegador, o mural usa um banco IndexedDB separado (`little-haven-memory-v1`), com imagens em registros Blob, independente dos dados desktop. Backup/restauração completos são oferecidos no desktop. O conteúdo do **Let It Float continua efêmero e nunca entra no mural automaticamente**.

### The Cozy Kitchen — A Recipe for Focus

Uma cozinha original em pixel art para acompanhar uma sessão de foco sem cobranças. Abra **The Cozy Kitchen** e toque no **livro de receitas**: Chá Quentinho (5 minutos), Torradas da Manhã (10), Biscoitos Caseiros (15), Sopa Aconchegante (25), Macarrão Caseiro (35), Pão Quentinho (45) e Bolo de Cenoura com Chocolate (60). Todas estão disponíveis desde o início. A duração personalizada aceita de 5 a 60 minutos inteiros, com a receita visual escolhida. São tempos simbólicos de foco, não instruções culinárias reais.

O relógio permite consultar o restante, pausar, retomar, encerrar antecipadamente e reiniciar por escolha. Há somente uma sessão ativa. Navegar, minimizar, suspender o computador e fechar o aplicativo contam como passagem de tempo para uma sessão em andamento. Ao reabrir, a mesma receita é recuperada ou sua conclusão fica disponível; uma sessão pausada permanece pausada. Não há início automático de outra receita nem notificações do sistema.

Os sete pratos têm arte e mensagens próprias. O bolo passa por ingredientes, massa, forno, crescimento/douramento, chocolate e finalização. O companheiro mantém nome, pelagem e visibilidade, com chapéu e avental de chef somente na cozinha. Ao terminar, ele apresenta o prato e uma mensagem acolhedora uma vez. **Descansar um pouquinho** dispensa o cartão, **Preparar outra receita** abre o livro sem iniciar uma sessão e **Fechar** fecha o cartão. O prato permanece consultável sem repetir a celebração. Em outro ambiente ou com a janela minimizada, a apresentação espera o retorno à cozinha.

As falas e a conclusão acompanham a cabeça do chef no mesmo grupo de movimento do SVG; o texto mantém tamanho legível ao redimensionar ou entrar em imersão. Quando necessário, o balão muda de lado, respeita as bordas e oferece rolagem interna, com fechamento e ações acessíveis. O chef se prepara, caminha por trajetos de piso diante da mesa e à direita dela, chega à estação e só então começa a ação. Pausar mantém seu pixel atual; voltar de uma cena oculta sincroniza a etapa atual, sem reproduzir um percurso antigo. Esse movimento não altera o tempo da receita.

O livro fechado fica sobre um suporte de madeira no trecho livre da bancada, ao lado da pia. Ao abrir, mostra as páginas ampliadas e centralizadas; somente o corpo do cardápio rola, mantendo **Fechar** visível. Esc fecha primeiro o livro e devolve o foco ao objeto, inclusive na imersão. Abrir o livro suspende somente os movimentos visuais do chef; o Pomodoro continua.

Explore luminárias, janela, geladeira, utensílios, chaleira e bilhetes mesmo sem preparar uma receita. Essas interações não alteram o temporizador. As mensagens ocasionais durante o preparo podem ser ocultadas. O sino de conclusão e os efeitos da cozinha são opcionais, inicialmente desligados, sintetizados localmente pelo mesmo motor do mixer e dependem da ativação explícita do áudio. Entrar na cozinha preserva Custom; os demais presets acompanham o ambiente com Cozy Kitchen, sem chuva obrigatória. O modo imersivo reutiliza os controles M/C/Esc e os objetos por teclado.

O documento local `kitchen.json`, em `app.getPath('userData')`, guarda somente a sessão atual, suas marcas temporais, apresentação do resultado e opções da cozinha. No navegador, usa `haven.kitchen.v1`, independentemente do desktop. Não armazena histórico de produtividade nem conteúdo de Let It Float. O processo principal é a autoridade temporal no desktop; callbacks apenas solicitam atualizações, sem contar segundos. Escritas são atômicas e o fechamento normal aguarda as operações aceitas. Arquivos inválidos, excessivos ou de versão futura são preservados; nesse caso, a cozinha informa que a experiência é temporária, sem sobrescrever o original.

Se o relógio retroceder enquanto o aplicativo estiver fechado, a receita é recuperada pausada com uma explicação. Alterações de horário durante o fechamento não podem ser distinguidas perfeitamente da passagem real de tempo sem uma fonte externa. Falhas de disco ou encerramento forçado podem impedir a recuperação da última alteração ou da marca de apresentação; o aplicativo informa erros de salvamento. Não há promessa de apresentação exatamente uma vez diante de uma falha entre gravar o estado e desenhar a interface.

### Little Companion

Um pequeno gatinho em SVG pixel art descansa no quarto e acompanha você no jardim e no trem. Não tem fome, pontuação, missões, recompensas ou penalidades por ausência. O primeiro carinho abre uma pequena apresentação para escolher seu nome; **Escolher depois**, fechar ou Esc permitem continuar sem nome e sem repetir a apresentação. O nome padrão de identificação é **Seu gatinho**, sem impor um nome próprio.

Abra **Companion** no cabeçalho para acessar **My Companion**: renomeie, mostre/oculte o personagem ou escolha pelagem creme e cinza, laranja ou noite. O campo aceita nomes Unicode com até 24 caracteres percebidos, incluindo acentos combinados e outros idiomas. Espaços nas pontas são removidos; nomes vazios, quebras de linha e controles recebem uma mensagem amigável. Nomes longos não são truncados. Cancelar uma edição preserva o nome salvo.

Em **My Companion → Seu companheiro**, escolha **Dálmata** para usar as sete spritesheets aprovadas no quarto, jardim, trem e cozinha. A escolha persiste junto das preferências existentes; voltar a **Gatinho** conserva sua pelagem. O dálmata senta, levanta, caminha, deita, dorme e acorda com os tempos originais dos frames; na cozinha, mexe massa durante a etapa correspondente. Carinho mantém a pose e responde pelo texto contextual. A arte disponível só tem caminhada orientada à direita, sem espelhamento, e não inclui ações próprias de leitura, forno ou decoração. Cadastro, transições e instruções para próximos pets estão em [DALMATIAN_INTEGRATION.md](DALMATIAN_INTEGRATION.md). Para executar esta integração localmente, use `npm run build` e `npm start`; o portátil anterior não é atualizado por esses comandos.

O companheiro respira, senta, caminha, dorme, deita, se espreguiça, observa e reage ao carinho com olhos/cauda. Há descansos longos e percursos predefinidos: cama e piso do quarto, faixa livre de gramado junto ao lago e um assento do trem. O gato laranja que se esconde nos arbustos continua sendo um animal residente separado. O companheiro não aparece em **Let It Float**, preservando a simplicidade do ritual.

Clique, Enter ou Espaço fazem carinho; cliques rápidos não reiniciam a reação continuamente. Na imersão de Garden/Journey, **C** abre My Companion e Esc fecha primeiro o painel; **M** continua abrindo o mixer. Movimento reduzido mantém o gatinho estático e interativo. As opções ficam salvas somente neste dispositivo; posição e comportamento são temporários. Esta versão é visual e silenciosa: ronronar/miado ficam para uma expansão com recursos licenciados, usando o motor de áudio compartilhado.

O botão de som inicia a ambientação local. O volume geral começa em 25% e tem ganho de saída limitado. Mesmo com a preferência de áudio salva, cada abertura exige um novo clique em **Retomar som** ou **Ativar áudio**; abrir o mixer, restaurar preferências e navegar não iniciam áudio.

### Cozy Sound Mixer

Use **Mixer** no cabeçalho para abrir o pequeno rádio de sons. O cenário permanece visível e o áudio continua ao fechar o painel. Escolha **Rainy Evening**, **Morning Garden**, **Quiet Night**, **Peaceful Journey** ou **Cozy Kitchen**, ative camadas e ajuste seus volumes com os sliders ou as setas do teclado. O volume geral afeta todas proporcionalmente; **Silenciar tudo** preserva cada ajuste e atinge silêncio em uma rampa curta de 25 ms.

A biblioteca inclui três chuvas (suave, intensa e na janela), vento, folhas, pássaros, riacho, grilos, lareira, trilhos, rodas, interior do vagão e **Café na Cozinha**. São 13 fontes contínuas e um controle separado de **Sons da cozinha** para os efeitos contextuais. As folhas combinam foley real com rajadas irregulares; o trem combina a gravação licenciada com articulação original das juntas, grave e texturas complementares em ciclos de 48 segundos. Origem, licenças e preparo estão em [`public/assets/audio/README.md`](public/assets/audio/README.md); diagnóstico, inventário e limitações em [AUDIO_AUDIT.md](AUDIO_AUDIT.md).

**Café na Cozinha** é uma composição instrumental original de 3min12s, a 80 BPM, com teclado elétrico, cordas pinçadas, baixo e percussão discreta sintetizados localmente. O arquivo estéreo Ogg Opus está incluído no aplicativo e carrega somente quando necessário. Sua melodia, harmonia, produção e medições estão em [CAFE-NA-COZINHA.md](public/assets/audio/CAFE-NA-COZINHA.md). O preset **Cozy Kitchen** usa música a 30% e efeitos a 65%, sem chuva. Os efeitos ainda dependem das opções em **Luz e sons**, inicialmente desligadas; nenhum preset liga essas opções. No mixer, é possível usar música a 30% e efeitos a 15%, por exemplo, sem alterar o volume geral.

A música toca somente na cozinha e exige a mesma ativação explícita de áudio da sessão. Pausar, retomar ou concluir uma receita, mudar a animação do gato e entrar na imersão mantêm a fonte musical. Ao sair da cozinha, a música reduz até zero e libera a fonte após 850 ms; voltar respeita as configurações. Um retorno durante o fade mantém a fonte atual. Após a liberação, a faixa recomeça do início; não há posição musical persistida. Áudio já autorizado pode continuar com a janela minimizada.

Alterar uma camada seleciona **Custom** e salva sua combinação. Ela acompanha você entre os ambientes; escolher um preset mantém a última Custom disponível para recuperar pelo seletor. Uma camada ativada com volume zero permanece ativada e inaudível; desativá-la preserva seu volume para a próxima vez.

Após uma troca de ambiente, os presets acompanham o lugar: Rainy Evening no quarto, Morning Garden/Quiet Night conforme a luz do jardim, Peaceful Journey no trem e Cozy Kitchen na cozinha. Clima e chuva ajustam a camada de chuva desses perfis. **Custom nunca é sobrescrita por essas trocas**; o painel oferece a sugestão do lugar para aplicar por escolha. A combinação salva é restaurada sem alterações ao abrir o aplicativo, e documentos v1 anteriores recebem somente os novos controles com valores seguros. As chuvas visuais continuam independentes da combinação Custom. A música da cozinha fica inaudível nos outros ambientes mesmo em Custom.

No Modo Imersivo de Garden, Journey, Memory Corner ou Kitchen, pressione **M** para ajustar os sons sem sair da tela cheia. **Esc** fecha primeiro o mixer; outro Esc segue as regras existentes de contexto/ferramentas/saída. Fechar o mixer devolve o foco ao cenário e deixa somente a arte. O áudio iniciado continua com a janela sem foco. O painel possui foco protegido, grupos recolhíveis, volume geral fixo e rolagem interna em janelas menores.

Os objetos, a navegação e os botões funcionam com **Tab**, **Enter** ou **Espaço**, com foco visível. O volume e a seleção de paisagem aceitam as setas do teclado. Os diálogos mantêm o foco e **Esc** preserva o rascunho. A preferência de movimento reduzido do sistema interrompe as animações ambientais e conclui o ritual com uma alternativa estática. Na viagem, mantém a cena estática e desabilita o controle de pausa; a troca de paisagem e o retorno ao quarto continuam disponíveis.

### Modo Imersivo de The Journey

Em tela cheia, a arte do vagão e da paisagem fica centralizada, sem o cabeçalho, títulos, navegação ou controles de paisagem da interface normal. Os cinco objetos continuam utilizáveis. Pressione **Esc** para voltar; quando livro ou bilhete estiver aberto, o primeiro **Esc** fecha apenas esse elemento e devolve o foco ao objeto. Um botão temporário de saída aparece ao mover o cursor para o canto superior direito ou no primeiro **Tab**, com foco visível; os próximos **Tab** percorrem os objetos e retornam à saída. O botão desaparece quando deixa de ser usado. Os diálogos mantêm o foco e têm botões de fechamento próprios.

A composição preserva a proporção de 480 × 270, sem recorte ou distorção, com margens na cor do cenário (`#1e3531`). O ajuste usa escala inteira em pixels físicos, considerando o `devicePixelRatio` do monitor, sempre que uma grade inteira cabe na área disponível. Quando nem a grade original cabe, usa uma redução fracionária para manter toda a arte visível.

O cenário permanece no mesmo DOM ao entrar e sair: paisagem selecionada, chuva, pausa, animações e áudio já ativado continuam no estado anterior. Movimento reduzido também continua respeitado. The Garden reutiliza esse mecanismo, com cursor visível, objetos e ferramentas contextuais; Esc fecha primeiro o contexto ou cancela uma ação e depois sai da imersão. No navegador, a entrada exige suporte e permissão para a Fullscreen API e uma ação do usuário; uma recusa exibe uma mensagem de erro e mantém a interface normal.

## Privacidade e preferências

### Uma pequena surpresa

A estrela em pixel art ao lado da marca abre uma carta pessoal de André por clique, Enter ou Espaço. O papel tem rolagem, foco protegido e fechamento por botão ou Esc, devolvendo o foco à estrela. A carta mantém cenário, rascunho e áudio; funciona offline e respeita movimento reduzido. O texto fica em `src/components/developer/developerLetterContent.js` e os contatos públicos confirmados em `shared/developer.js`.

E-mail e LinkedIn só abrem após acionamento explícito. No desktop, `openDeveloperContact('email' | 'linkedin')` valida a origem IPC e resolve o destino exato no processo principal, sem aceitar URLs da interface. Se a abertura do e-mail falhar, o endereço pode ser copiado por escolha do usuário. A prévia web utiliza links nativos.

### Dados locais

O rascunho existe somente no estado React da sessão. Ao confirmar **Let it float**, seu conteúdo é removido desse estado **antes** da animação; descartar ou reiniciar o ritual também limpa o estado. O texto não é enviado ao processo principal, a arquivos, ao armazenamento do navegador, a logs ou à rede. Não há análise de emoções, IA ou aconselhamento.

Limpar o estado da aplicação não promete eliminação forense de dados da memória do sistema operacional, de capturas de tela ou de ferramentas externas.

Somente estas preferências são persistidas:

| Chave | Padrão |
| --- | --- |
| `lampOn` | `true` |
| `rainOn` | `true` |
| `audioEnabled` | `false` |
| `volume` | `0.25`, entre `0` e `1` |
| `mixer` | Documento v1: preset, mute, camadas habilitadas/volumes e última Custom |
| `companion` | Visível, sem nome, espécie `cat`, pelagem `default`, sons desativados e apresentação pendente |

No Electron, o arquivo é `preferences.json` dentro de `app.getPath('userData')`, normalmente `%APPDATA%\Little Haven` no Windows. O processo principal valida os campos e grava o JSON de forma atômica. Campos desconhecidos, inclusive dentro das camadas e do companheiro, são rejeitados. Preferências antigas recebem os padrões ausentes preservando luz, chuva, volume, escolha de áudio e mixer. No navegador, as preferências usam a chave existente `haven.preferences.v1` do `localStorage`; esse armazenamento é independente do desktop. O nome escolhido é o único texto livre do companheiro, limitado e validado; pensamentos do ritual nunca entram nesse campo automaticamente ou são enviados para ele.

Paisagem, pausa e chuva de The Journey ficam apenas no estado React da sessão. Essas escolhas permanecem ao trocar de ambiente e reiniciam ao reabrir ou recarregar o aplicativo. Luminária, cortinas e chá pertencem à visita atual ao vagão e reiniciam ao sair para outro ambiente. Todos os estados são preservados ao trocar de paisagem ou entrar e sair do modo imersivo. A viagem não adiciona preferências persistentes e sua chuva é independente da preferência `rainOn` do quarto.

O jardim usa um documento separado e versionado: `garden.json` no mesmo diretório desktop e `haven.garden.v1` no navegador. Salva somente espécies, pontos de plantio, progresso temporal e marcas de rega, estilos de vaso, decorações, lanternas, atmosfera e clima. Gato, animais, ferramentas e efeitos são temporários. Não há texto livre nesse modelo; pensamentos nunca entram no jardim ou no IPC. As duas formas de armazenamento continuam independentes.

Cada alteração é enviada imediatamente. No desktop, a confirmação só ocorre após a escrita atômica; o encerramento normal aguarda as operações aceitas pelo processo principal. Falhas mantêm a sessão utilizável com aviso e tentativa de salvar novamente. Uma versão futura do documento não é sobrescrita. Não há garantia de recuperação de alterações ainda não confirmadas, encerramento forçado ou falha do sistema.

## Arquitetura

JavaScript com ES Modules, React, Vite, Electron e CSS organizado por experiência. A arte usa SVG original desenhado em uma grade de pixels; o quarto e o vagão têm resolução lógica de 480 × 270. Formas com bordas nítidas e escalas proporcionais preservam o desenho. As paisagens da viagem usam camadas de parallax horizontal em loop. Não há engine gráfica ou biblioteca de animação adicional.

```text
electron/
  main/index.js                 Janela, navegação, segurança e handlers IPC
  preload/index.cjs             Ponte mínima isolada para preferências
  services/preferences.js       Validação e gravação local
  services/bouquets.js          Rascunho explícito, exportação e mailto restritos
  services/security.js          Políticas de recursos e CSP
  services/memoryCorner.js       Originais, miniaturas e metadados atômicos do mural
  services/memoryBackup.js       Pacote local restaurável com hashes e limites
  services/memoryBridge.js       Diálogos nativos, protocolo de imagens e decoder isolado
src/
  app/App.jsx                   Navegação e coordenação das experiências
  components/                   Ícones, confirmação, mixer e viewport imersivo
  components/companion/         Gatinho SVG, animações e painel My Companion
  hooks/                        Preferências, movimento reduzido e modo imersivo
  scenes/Room/                  Arte e objetos interativos do quarto
  scenes/LetItFloat/            Escrita, estados do ritual e rio
  scenes/Journey/               Vagão, paisagens e controles da viagem
  scenes/Garden/                Jardim, plantas, ferramentas, decoração e fauna
  scenes/Bouquets/              Ateliê, composição SVG, carta, revisão e exportação
  scenes/MemoryCorner/          Mural, cartões, editores e visualizações ampliadas
  scenes/Kitchen/               Cozinha, livro, pratos e objetos interativos
  services/audio/               Motor compartilhado, camadas, biblioteca e presets
  services/                     Preferências e persistência do jardim
  styles/                       Estilos e fontes locais
public/
  assets/icons/                 Ícones originais SVG, PNG e ICO
  assets/audio/                 Gravações locais, manifest e procedência
  licenses/                     Licenças das fontes e créditos/licenças de áudio
scripts/                        Inicialização de desenvolvimento e teste nativo
shared/garden.js                Modelo puro, crescimento, posições e validação do jardim
shared/bouquets.js              Arranjos, consentimento, assunto, carta e validação de e-mail
shared/audio.js                 Schema do mixer e configurações dos presets
shared/companion.js             Nome Unicode e preferências limitadas do companheiro
shared/memory.js                Schema e limites do mural; inspeção segura de imagens
shared/memoryImage.js           Miniaturas com orientação no Chromium
shared/kitchen.js               Modelo temporal, comandos e documento da cozinha
shared/kitchenRecipes.js        Catálogo em português e mensagens das sete receitas
tests/                          Testes unitários e de interface
```

O ritual tem estados explícitos de escrita, dobra, navegação do barco e conclusão, em `src/scenes/LetItFloat/ritual.js`. O conteúdo escrito não faz parte dos serviços de preferências ou jardim. `useGarden` mantém a store acima das cenas e agenda somente o próximo estágio enquanto o jardim está visível. O motor de áudio libera fontes, conexões e contexto ao ser descartado; camadas retiradas da mistura são liberadas após o fade, inclusive ao mudar de ambiente fora de Custom.

O hook `useImmersiveMode` coordena a DOM Fullscreen API e o componente `ImmersiveViewport` envolve a arte SVG, sem remontar a cena. Garden, Journey, Memory Corner e Kitchen reutilizam esse mecanismo.

### Limites de segurança do desktop

Para a cozinha, a ponte acrescenta apenas `getKitchen()`, `commandKitchen(command)` e `onKitchenChanged(callback)`, que retorna uma função para remover o listener. Os comandos aceitam somente tipos predefinidos, receitas conhecidas, durações limitadas, identificadores de sessão e opções validadas; não aceitam texto livre ou caminhos. O processo principal valida novamente o comando e a origem antes de executá-lo.

O renderer usa `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true`. A ponte expõe `window.haven.getPreferences()`, `savePreferences(prefs)`, `getGarden()` e `saveGarden(snapshot)`, cinco ações explícitas do mural (`memoryGet()`, `memorySave(board)`, `memoryImport()`, `memoryExport()` e `memoryRestore()`) e `openDeveloperContact(id)` para os dois destinos públicos configurados. Há validação na ponte e no processo principal, incluindo a origem do pedido IPC. As ações de arquivo não recebem caminhos do renderer; os destinos e fontes são escolhidos por diálogos nativos. Campos desconhecidos são rejeitados antes do IPC. Somente uma instância pode escrever em cada perfil: abrir novamente restaura e focaliza a janela existente.

O processo principal usa ESM. O preload tem extensão **`.cjs`** porque o sandbox fornece um ambiente CommonJS limitado, sem um carregador ESM completo. Isso permite manter o sandbox e oferecer apenas a interface necessária. Consulte a [segurança do Electron](https://www.electronjs.org/docs/latest/tutorial/security), o [sandbox de processos](https://www.electronjs.org/docs/latest/tutorial/sandbox) e as [regras de ESM](https://www.electronjs.org/docs/latest/tutorial/esm).

Em produção, o Electron carrega `dist/index.html`, bloqueia requisições de rede e arquivos fora do bundle, nega novas janelas solicitadas pelo conteúdo, downloads e navegações externas. A exceção de imagens do mural usa somente o protocolo local com UUID autorizado e tipo de recurso `image`, na janela principal; o renderer não recebe acesso `file://` ao diretório pessoal. A permissão `fullscreen` é limitada ao frame principal da janela e à página local confiável esperada. Para que Esc feche primeiro um diálogo no desktop, `keyboardLock` também recebe uma exceção para esse mesmo frame/URL, somente quando a janela já está em fullscreen. O diálogo solicita apenas a tecla Escape e libera a captura ao fechar ou desmontar; não captura texto nem registra teclas. `automatic-fullscreen`, `pointerLock` e as demais permissões continuam negadas. O modo imersivo usa a DOM Fullscreen API, sem novos canais IPC de tela cheia. A CSP mantém scripts locais, frames negados e `connect-src 'none'`; a origem de imagem `haven-memory://local` é autorizada apenas para as fotografias gerenciadas. O desenvolvimento habilita apenas o servidor local explícito `127.0.0.1:5173` e seu WebSocket; esse modo é ignorado no aplicativo empacotado. Não há backend, autenticação, telemetria ou atualização automática.

## Testes

Os testes da cozinha cobrem as sete conclusões, etapas do bolo, duração personalizada, temporização/persistência, áudio opcional e imersão. Após `npm run build`, `node scripts/kitchen-smoke.mjs` verifica quatro aberturas reais do Electron com estado sintético e perfis isolados: pausa persistida, conclusão com janela minimizada, ausência de repetição ao reabrir e caminhada/falas/livro com captura nativa. A suspensão real do Windows e a escuta em diferentes equipamentos continuam na validação manual.

```powershell
npm test
npm run test:e2e
npm run build
npm run test:desktop
```

Os testes unitários cobrem o ritual, a lista permitida de preferências, restauração, concorrência de gravações, áudio, políticas de segurança e escala física da pixel art. Os testes de interface cobrem luz, chuva, escrita, confirmação de descarte, barco, privacidade do texto, áudio, teclado, telas menores, movimento reduzido e fullscreen real com restauração de estado e foco. Na viagem, incluem os cinco objetos, abertura das cortinas, iluminação, preparo e resfriamento do chá, páginas do livro, bilhete contextual e as cinco paisagens com pausa e retomada.

O jardim acrescenta testes de crescimento e rega limitada, relógio retrocedendo, trocas de vasos/decorações, substituição confirmada, dados inválidos, gravações concorrentes, falhas, versões futuras, privacidade, gato/fauna, clima, áudio, imersão e DPR fracionário. O smoke desktop também usa cliques reais no gato e contextos do jardim, incluindo prioridade de Esc.

Após o build, `node scripts/garden-performance.mjs` executa um ensaio visual de 60 segundos no Edge headless, com oito plantas adultas, seis decorações e chuva noturna. Gera capturas e métricas locais em `outputs/`, usa perfil temporário e encerra seu servidor. Esse ensaio não substitui medições em outros equipamentos ou avaliação perceptiva de áudio.

O Playwright usa o **Microsoft Edge instalado** por padrão. Como alternativa, instale seu Chromium e selecione-o no PowerShell:

```powershell
npx playwright install chromium
$env:HAVEN_TEST_BROWSER = 'chromium'
npm run test:e2e
```

O teste desktop verifica o carregamento de produção, a montagem React, o sandbox, a ponte, a gravação e restauração de preferências e a confirmação nativa de descarte. Também entra no modo imersivo por um clique real, verifica fullscreen DOM e nativo, escala, animações e a saída por Esc com restauração da janela normal/maximizada. Usa `work/desktop-smoke-profile`, sem alterar as preferências pessoais; a renderização por software fica limitada a esse teste para funcionar em sessões sem GPU disponível.

`npm run test:memory` usa outro perfil temporário, fotografias sintéticas e respostas de diálogos limitadas às próprias fixtures. Exercita a aplicação real, o decoder, a ponte e o protocolo de imagens. Os testes unitários específicos cobrem schema, posições, persistência, concorrência, falhas, exclusão segura e pacotes inválidos; a interface acrescenta notas, imagens, temas, teclado, imersão e separação do ritual.

Após o build, `node scripts/memory-performance.mjs` executa um ensaio com 12 imagens sintéticas de 4000 × 3000, miniaturas, originais abertos individualmente, teclado, restauração e capturas desktop/DPR 2/mobile. Usa servidor em porta livre e contexto efêmero, sem perfil pessoal; registra `outputs/memory-performance.json`. As medidas de heap JavaScript não abrangem todos os buffers de imagens, processos nativos ou GPU.

Verificações adicionais de integração, sempre com perfis isolados:

```powershell
node scripts/development-smoke.mjs
npm run package:win
node scripts/package-smoke.mjs
node scripts/portable-smoke.mjs
node scripts/inspect-package.mjs
node scripts/beta-performance.mjs
```

Elas verificam o ciclo real de desenvolvimento e encerramento do Vite, o aplicativo empacotado e seu lançamento portátil. O teste portátil abre temporariamente uma porta local de depuração só para inspecionar sua própria janela e a encerra ao terminar. Essa opção não é utilizada na abertura normal do aplicativo. `inspect-package` confere recursos, licenças, versão, raízes e padrões limitados de credenciais no arquivo `app.asar`, sem ler perfis pessoais. O ensaio `beta-performance` usa outro perfil isolado e seis amostras de oito segundos para registrar CPU/RAM de Room/Garden/Journey visíveis e minimizados, além de pausa visual e continuidade do áudio. Amostras curtas não comprovam ausência de vazamentos em sessões prolongadas.

Os resultados e limites das verificações desta entrega estão em [`VALIDATION.md`](VALIDATION.md).

## Arte, áudio e licenças

O quarto, o rio, o barquinho, o vagão, as paisagens, o jardim, suas plantas e animais, o Little Companion e os ícones são desenhos originais produzidos no código do projeto, sem sprites de jogos existentes. O companheiro usa SVG e animações CSS, sem novos recursos de terceiros. O áudio combina texturas procedurais de chuva/vento e gravações locais licenciadas em CC0 ou CC BY 3.0. Consulte [`public/assets/audio/README.md`](public/assets/audio/README.md) para autores, fontes, tratamentos e hashes; os avisos acompanham a biblioteca. Não há captura de microfone, streaming ou downloads durante o uso.

O motor compartilhado fica em `src/services/audio/`, com um único AudioContext criado por gesto, ganho por camada, master limitado, fades finitos e loops com sobreposição de bordas. Gravações são decodificadas somente ao ativar a camada. O plugin local de Vite em `scripts/local-audio-plugin.mjs` entrega os bytes como módulos JavaScript locais sob demanda, permitindo decodificação no Electron com a CSP de produção `connect-src 'none'` preservada, sem ampliar a ponte IPC. Fontes desativadas são liberadas após o fade; fechar o aplicativo libera o contexto.

**DM Sans**, **Fraunces** e **Pixelify Sans** são distribuídas localmente por Fontsource sob **SIL Open Font License 1.1**. Os avisos e textos completos estão em [`public/licenses/`](public/licenses/). Preserve esses arquivos ao redistribuir as fontes. Os direitos pertencem, respectivamente, aos autores dos projetos DM Sans (2014), Fraunces (2020) e Pixelify Sans (2021). As demais dependências mantêm suas próprias licenças.

## Limitações e continuidade

A versão atual oferece quarto, ritual, viagem, jardim e mural de lembranças. The Journey tem cinco paisagens em loop, cinco objetos interativos e camadas locais de trem, sem destino, progressão, missões ou contagem de tempo de viagem. O jardim usa pontos predefinidos: quatro canteiros fixos e quatro vasos reorganizáveis, sem arrastar e soltar ou transplante entre canteiros e vasos. O gato escolhe um esconderijo por visita, sem deslocamento entre eles. Não há histórico dos textos do ritual, sincronização, economia ou obrigações de cultivo. Os bilhetes explicitamente fixados no Memory Corner são persistentes e independentes do ritual.

O mural não possui desfazer geral, arrasto entre ambientes, sincronização ou suporte a imagens animadas. A remoção pode ser desfeita durante a visita; depois de sair da cena, o último cartão removido não é oferecido novamente. O backup usa formato próprio v1 e está disponível no desktop. Ensaios abrangentes de heap, telas/GPU e leitor de tela continuam necessários antes de distribuição pública ampla.

As próximas etapas incluem refinar a experiência em janelas e dispositivos reais, revisar acessibilidade e desempenho e ampliar os detalhes dos ambientes. O plano completo está em [`ROADMAP.md`](ROADMAP.md).
