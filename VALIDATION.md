# Validação atual — Áudio 2.0 e Cozy Sound Mixer

Verificação de **29 de outubro de 2026**, em Windows x64, Node.js 22.18.0 e Microsoft Edge. As alterações locais anteriores de Garden e Journey foram preservadas; os registros abaixo permanecem como histórico e não substituem os testes desta mudança.

| Verificação executada no código final | Resultado |
| --- | --- |
| `npm test` | **67 passaram**, nenhum falhou |
| `npm run build` | Concluído; 78 módulos, sem novas dependências |
| `npm run test:e2e` | **51 passaram** em aproximadamente 1,3 minuto; código de saída 0 |
| `npx playwright test tests/e2e/haven.spec.js -g 'audio starts only' --repeat-each=3` | 3 repetições passaram após corrigir a restauração durante o carregamento |
| `npm run test:desktop` no build final | Passou; todas as 12 camadas decodificadas/iniciadas, quatro presets, contexto único, CSP e imersão nativa |
| `node scripts/prepare-audio.mjs` | Executado; oito WAVs preparados offline a partir dos originais licenciados |
| Conferência independente dos recursos | Oito hashes SHA-256, cabeçalhos PCM e picos conferidos; passaram |
| `git diff --check` | Sem erros de whitespace |
| Inspeção visual | Capturas do mixer desktop, mobile e imersivo abertas e revisadas |

## Comportamentos verificados

- **Mixer funcional:** drawer com cabeçalho, Atmosphere, Your Sounds, categorias recolhíveis, 12 switches/sliders/percentuais, volume geral fixo, ativação explícita e mute que preserva a mistura. Abrir/fechar não cria contexto nem interrompe a reprodução. Indicadores refletem fontes iniciadas, habilitação, volume e mute; não são visualizadores simulados.
- **Motor compartilhado:** um AudioContext criado somente pelo gesto de ativação, fontes independentes carregadas sob demanda, ganho por camada, master limitado a 0,25, fades finitos e overlap de até 750 ms nas bordas dos loops. Cada buffer fica limitado a pico absoluto de 0,24; mesmo 12 camadas no máximo têm teto somado de 0,72 após o master. Essa conta limita amplitude; não comprova equilíbrio perceptivo.
- **Ganho e recursos:** sondagens da topologia Web Audio real confirmam múltiplas fontes, independência dos sliders, reuso das fontes em ajustes, master proporcional, mute chegando a zero real e distinção entre habilitado com volume zero e desativado. Fontes retiradas da mistura são paradas/desconectadas e seus buffers liberados após 850 ms. Unitários cobrem stop/dispose durante carregamento, mudanças rápidas, falha parcial de alocação, falha de decodificação e nova tentativa.
- **Presets e navegação:** Rainy Evening, Morning Garden, Quiet Night e Peaceful Journey configuram camadas reais. Ajustes individuais selecionam Custom; trocar de preset preserva a última Custom para recuperar. Custom atravessa Room, Garden, Journey e Let It Float sem alterações. Fora de Custom, ambiente, clima e horário do jardim orientam a mistura, com fades; a configuração salva não é substituída ao iniciar o aplicativo.
- **Inicialização e persistência:** recarregar restaura master, mute, preset, camadas e Custom sem criar AudioContext. Preferências antigas mantêm luz/chuva/volume/escolha de áudio e recebem o mixer padrão. Renderer, preload e main validam o schema aninhado, rejeitando campos extras e texto sintético antes do IPC. Salvamento ordenado, restauração tardia e cópias independentes continuam cobertos.
- **Imersão e teclado:** M abre o mixer dentro da superfície fullscreen de Journey/Garden; Esc fecha primeiro o painel e preserva fullscreen, cenário, áudio e foco. O smoke nativo usa eventos reais, inclusive abrindo o mixer durante a ferramenta Mover do jardim e verificando que o Esc seguinte cancela a ferramenta antes de sair. A captura existente de Escape é compartilhada entre ferramentas e diálogos, sem novas permissões.
- **Acessibilidade e layout:** foco inicial/retorno, ciclo Tab/Shift+Tab, setas nos sliders, foco visível, movimento reduzido e janelas de 800 × 650, 390 × 844 e 360 × 400. A rolagem é interna e o master permanece visível. Os demais testes cobrem arte fullscreen, DPR fracionário, ferramentas, objetos do trem e layouts anteriores.
- **Regressões e segurança:** os 51 casos mantêm o ritual completo, confirmação de descarte, limpeza do texto antes da animação e ausência do texto sintético em armazenamento/requisições. Sandbox, isolamento, ausência de Node no renderer, quatro funções existentes da ponte, CSP e rejeição de recursos externos foram preservados. Nenhuma mudança na arte dos ambientes ou no ritual.

Uma execução completa encontrou a preferência de áudio sendo salva somente após a decodificação das gravações: recarregar logo após o contexto iniciar podia perder a indicação **Retomar som**. O salvamento agora ocorre assim que a ativação explícita inicia o contexto. Três repetições focadas e a suíte completa posterior passaram. A revisão também identificou e corrigiu o compartilhamento da captura de Escape entre mixer e ferramenta ativa do jardim, coberto por seis unitários e pelo teste nativo.

O smoke inicial dentro do sandbox foi impedido pela ACL do runtime Electron; os testes nativos finais foram executados fora dele, preservando `sandbox: true` no aplicativo. Uma rodada focada de interface aprovou os casos, mas ficou presa no encerramento do servidor dentro do sandbox; as execuções consolidadas fora dele encerraram normalmente. Os avisos de MockTimers, `NO_COLOR`/`FORCE_COLOR` e conversão de finais de linha não são falhas da aplicação.

## Biblioteca, arquivos e limites

Estão disponíveis três chuvas e vento procedurais, mais oito WAVs locais: folhas, pássaros, riacho, grilos, lareira, trilhos, rodas e interior do vagão. Os três perfis de trem derivam da mesma gravação real de **gryc**; o riacho é de **kurt**, ambos CC BY 3.0. As demais gravações são CC0. Folhas usa montagem de foley real de folhas secas de **qubodup**, não uma gravação de árvores ao vento. Origens, autores, adaptações, licenças e hashes constam em `public/assets/audio/README.md`, `manifest.json` e `public/licenses/Audio-*`.

Arquivos principais desta alteração:

- `src/services/audio/`: AudioEngine, preparo de camadas, biblioteca e presets; `ambientAudio.js` mantém apenas uma reexportação, sem um segundo motor.
- `src/components/audio/`, `src/components/Icon.jsx` e `src/app/App.jsx`: painel, controles, ícones e coordenação de áudio/ambientes.
- `shared/audio.js`, serviços de preferências do renderer/main e preload: schema limitado e migração, sem novos canais IPC.
- `src/services/fullscreenEscape.js`, viewport/hook imersivos e efeitos de captura nos diálogos/ferramentas existentes: integração de M/Esc sem perder a captura da ferramenta ativa.
- `scripts/local-audio-plugin.mjs`, `vite.config.js`, `scripts/prepare-audio.mjs` e smoke desktop: bytes locais sob demanda, preparo reproduzível e verificação nativa.
- Testes de áudio, preferências e Escape; `tests/e2e/audio-mixer.spec.js`, helper de sondagem e atualização das verificações de áudio de Garden/Journey. README e roadmap atualizados pontualmente.

Os WAVs somam **12.029.266 bytes**. Para manter `connect-src 'none'` no desktop, o build os entrega também como módulos JavaScript locais codificados em base64, importados somente ao ativar a camada. Há custo adicional de disco/memória e avisos do Vite por chunks acima de 500 kB; não foram ocultados. Otimizar essa duplicação é uma melhoria futura, sem necessidade de ampliar permissões ou acrescentar backend.

Não foram realizadas escuta subjetiva em fones/caixas, avaliação de fadiga em sessões longas, medição de heap, ensaio de desempenho com todas as camadas no máximo, Narrador ou avaliação abrangente de monitores/GPU/DPI. O trecho de grilos tem 11 segundos; a percepção de repetição e as junções precisam de escuta manual. A verificação automatizada comprova fontes/buffers/ganhos reais, não a qualidade percebida do áudio. Próximas melhorias sugeridas: normalização perceptiva, trechos mais longos e gravações independentes das partes do trem.

Capturas locais não versionadas: `outputs/Little-Haven-Mixer-desktop.png`, `outputs/Little-Haven-Mixer-mobile.png` e `outputs/Little-Haven-Mixer-immersive.png`. Não foi executado empacotamento nem atualizado o portátil. Não houve commit, push, merge ou release.

Para conferir manualmente, execute `npm start` após o build. Abra **Mixer**, escolha **Rainy Evening** e clique em **Ativar áudio**. Ajuste chuva para 25%, lareira para 40% e vento; altere o master e teste mute/reativação. Feche, navegue entre os ambientes e confirme que Custom permanece. Em Journey/Garden, entre no Modo Imersivo, pressione M e depois Esc. Reabra o aplicativo: as escolhas devem voltar visualmente e o áudio deve aguardar um novo gesto. Faça a escuta com volume confortável, incluindo junções de loops e cada camada isolada.

---

# Validação anterior — The Garden

Verificação de **28 de outubro de 2026**, em Windows x64, Node.js 22.18.0 e Microsoft Edge. Esta entrega implementa o jardim com hibisco rosa e gato laranja; os registros anteriores permanecem abaixo como histórico.

| Verificação executada | Resultado |
| --- | --- |
| `npm test` | 51 passaram; nenhum falhou |
| `npm run build` | Concluído; 61 módulos, sem novas dependências |
| `npm run test:e2e` | 43 passaram em aproximadamente 1,1 minuto; código de saída 0 |
| Rechecagens focadas de cultivo e imersão | Passaram; última rodada de imersão: 4/4, incluindo 320 × 240 e DPR 1,25/2 |
| `npm run test:desktop` | Passou; ponte, arquivos locais, segurança, gato, contextos, Esc e fullscreen nativo/DOM |
| `node scripts/garden-performance.mjs` | Ensaio de 60 segundos concluído; sem erros de renderer ou tarefas longas |
| `git diff --check` | Sem erros de whitespace |

## Funcionalidades verificadas

- **Arte e cultivo:** SVG original de 480 × 270 com quatro canteiros, quatro vasos, árvore, cerca, caminho e lago. Margarida, lavanda, hibisco rosa, samambaia e suculenta têm desenhos próprios nos quatro estágios. Testes com relógio controlado verificam crescimento cumulativo aos 2/8/20 minutos, tempo entre visitas e restauração após reload. Não há morte, regressão, economia ou necessidade de visitas diárias.
- **Cuidado e organização:** regador, gotas e reação das plantas; bônus de 20% da duração do estágio uma única vez por estágio não adulto. Rega adulta continua visual. Vasos trocam aparência e planta juntos, inclusive quando ocupados. Substituição confirmada ocorre numa única alteração. Banco, lanternas, pedras e cogumelos respeitam pontos compatíveis. Lanternas acesas e apagadas são distintas também de dia.
- **Fauna:** duas borboletas, seis vagalumes noturnos, três peixes e um gato laranja com três esconderijos possíveis. Gato aparece e retorna, mantém alvo/foco de teclado e alterna poses imediatamente com movimento reduzido. Lago oferece reação e alimento simbólico sem inventário. Respostas dos animais também possuem aviso acessível discreto.
- **Atmosfera e áudio:** dia, pôr do sol e noite combinados com clima limpo ou chuva. Vento/água, pássaros e insetos são sintetizados localmente. Testes verificam ausência de autoplay, contexto único, ganho limitado, mudanças de perfil e liberação de fontes, inclusive após falha parcial de alocação. Room e Journey mantêm a chuva anterior.
- **Persistência:** `garden.json` desktop e `haven.garden.v1` web, separados das quatro preferências existentes. Validação compartilhada no main/renderer e validação restrita no preload; campos desconhecidos são rejeitados antes do IPC. Cobertura de posições duplicadas, incompatibilidade, arquivo ausente/inválido/grande, versões futuras, concorrência, ACK antigo, falha e nova tentativa. Versão futura permite sessão temporária sem sobrescrever o original ou oferecer tentativa de gravação inútil.
- **Privacidade e segurança:** texto sintético de Let It Float permanece ausente do armazenamento do jardim; confirmação de descarte e texto efêmero continuam cobertos. O preload adiciona somente `getGarden` e `saveGarden`. Sandbox, isolamento, CSP, origem IPC e negação de recursos remotos foram preservados.
- **Imersão e acesso:** mesmo SVG e estado ao entrar/sair, escala inteira física quando possível, cursor utilizável e ferramentas integradas no baú/placa. Esc fecha primeiro o contexto ou cancela a ferramenta. O teste nativo aguarda o Keyboard Lock existente, valida clique real no gato, foco e restauração, e repete as regressões de Journey. O botão de cancelamento devolve o foco ao baú; o aviso fica no topo para não cobrir vasos em áreas pequenas.

Uma execução dentro do sandbox completou os casos, mas ficou presa ao encerrar o servidor de teste e foi interrompida. A repetição fora do sandbox encerrou normalmente; a suíte consolidada final de 43 casos terminou com código 0. Os avisos de `NO_COLOR`/`FORCE_COLOR` e do MockTimers experimental não indicaram falhas.

## Inspeção visual e desempenho

Foram abertas e revisadas capturas de dia/noite, jardim com oito plantas adultas, chuva, janela de 390 px e fullscreen desktop. Os testes também cobrem pôr do sol, 800 × 650, fullscreen 1920 × 1080, área reduzida de 320 × 240 e DPR 1,25/2. A escala padrão DPR 1 e o mecanismo compartilhado continuam cobertos; múltiplos monitores não receberam uma avaliação manual específica nesta entrega. O caso de DPR 2 foi acrescentado depois da suíte completa e passou na rodada focada de quatro testes de imersão.

Ensaio local com **Intel Core i5-13450HX, 24 GiB de RAM, Windows 10.0.26200, Edge 156.0.4314.50 headless**, viewport 1440 × 960/DPR 1: oito plantas adultas, seis decorações, noite, chuva, peixes e vagalumes; áudio desligado.

- Duração: 60.004 ms; 14.401 callbacks de `requestAnimationFrame`, cadência média de aproximadamente 240/s e intervalo p95 de **4,3 ms**.
- Nenhum intervalo acima de 33,5 ms, nenhuma tarefa longa registrada e nenhuma mutação no SVG durante a observação sem interação.
- 558 elementos no SVG noturno. Após mudar para dia e navegar vinte vezes, a contagem permaneceu em **537 antes e depois**; nenhum erro de renderer.

A cadência de callbacks headless não comprova FPS apresentados por um monitor físico. Esta medição não substitui profiling de GPU/heap, desempenho com áudio ligado ou ensaios em outros computadores. As fontes de áudio e a ausência de duplicação são verificadas separadamente pelos testes de serviço e interface.

Artefatos locais, sem versionamento: `outputs/garden-performance.json`, `outputs/Little-Haven-Garden-grown-day.png`, `outputs/Little-Haven-Garden-grown-night.png`, capturas de atmosfera/responsividade e `outputs/Little-Haven-Garden-immersive-desktop.png`.

## Arquivos e limites

- Cena e interações em `src/scenes/Garden/`; crescimento, catálogo e validação em `shared/garden.js`.
- Estado em `src/hooks/useGarden.js` e `src/services/garden.js`; arquivo desktop em `electron/services/garden.js`, com integração mínima de main/preload.
- Áudio, coordenação de App e componentes imersivos receberam alterações pontuais. Nenhuma arte ou fluxo de Room, Journey ou Let It Float foi reescrito.
- Testes novos de modelo, store, arquivo/preload, fauna, cultivo, áudio e imersão; smoke desktop e documentação atualizados. `shared/**/*` foi incluído na distribuição, sem mudar dependências.

Os canteiros são fixos; não há arrastar e soltar ou transplante entre canteiros e vasos. O gato escolhe um esconderijo por visita e não tem alimentação, miado ou deslocamento entre arbustos. Ferramentas, efeitos e animais não são persistidos.

Não foram feitos testes manuais com Narrador, escuta subjetiva do áudio, medição de heap ou avaliação de todas as combinações de monitores/GPU/DPI. Também não foi gerado executável portátil nesta entrega. Não houve commit, push, merge ou release.

Alterações confirmadas são preservadas; o encerramento normal aguarda gravações já aceitas pelo main. Não há promessa de recuperação de uma ação ainda não confirmada, encerramento forçado ou falha do sistema. Limpar o texto do ritual continua sem prometer eliminação forense de memória.

Para testar manualmente, execute `npm start` após o build e abra **The Garden**. Plante um hibisco rosa, regue, reorganize vasos e decorações, procure o gato, toque no lago e alterne luz/clima. Ative som por clique, entre na imersão, abra ferramentas e confirme a prioridade de Esc. Reabra o aplicativo para conferir o jardim salvo. Repita usando Tab/Enter/Espaço e movimento reduzido.

---

# Validação anterior — expansão interativa de The Journey

Verificação de 23 de outubro de 2026, em Windows x64 e Node.js 22.18.0. Os resultados históricos abaixo permanecem separados desta entrega.

| Verificação executada | Resultado |
| --- | --- |
| `npm test` | 27 passaram; nenhum falhou |
| `npm run build` | Build concluído; 50 módulos, sem novas dependências |
| `npm run test:e2e` no Edge, build final | 32 passaram em 55,0 s; código de saída 0 |
| `npm run test:desktop` no build final | Passou; objetos, Esc contextual, fullscreen DOM/nativo, foco e janela normal/maximizada |
| `git diff --check` | Sem erros de whitespace |

## Funcionalidades e verificações

- **Interior preservado:** a grade original de 480 × 270, janela, porta de passagem, assentos, bagageiro, mesa suspensa, mala e arte das três paisagens anteriores foram mantidos. Os elementos novos seguem o mesmo desenho SVG com bordas nítidas, sem fotografias, vídeos ou sprites externos.
- **Luminária:** clique, Enter ou Espaço alternam o estado; vidro, luz quente na parede e reflexo próximo ao assento acompanham a escolha com transição suave. Testes verificam o estado acessível e a opacidade efetiva das duas regiões de iluminação.
- **Cortinas:** abertura e fechamento em duas folhas plissadas, com deslocamento discreto em passos de pixels. Fechadas, recobrem a janela; abertas, deixam a vista livre entre as bordas. Testes conferem os dois deslocamentos, teclado e preservação do estado ao trocar de paisagem.
- **Chá:** cada preparo responde com uma pequena animação da xícara e vapor. Depois de 12 segundos o vapor diminui; depois de mais 18 segundos desaparece. O teste usa relógio controlado para validar resfriamento e repreparo, inclusive com o trem parado. Há somente um timeout ativo por estágio, limpo ao preparar novamente ou desmontar a cena.
- **Livro:** quatro páginas com mensagens e ilustrações originais. A viagem continua animando atrás dele. Testes verificam avanço/retorno, nome acessível, foco inicial, ciclo de Tab/Shift+Tab, Esc, botão de fechamento e retorno ao objeto.
- **Bilhete:** mostra a paisagem selecionada e sua descrição poética; não há reservas, pagamentos, horários ou destino obrigatório. Diálogo temático usa a mesma disciplina de foco e fechamento do livro.
- **Snowy Mountains:** montanhas em profundidade, neve lenta em duas escalas, pinheiros nevados e relevo. **Morning Lake:** lago, colinas, amanhecer suave, reflexos, névoa, pássaros e vegetação. Ambos usam três camadas em loops de 320 pixels e respeitam pausa, retomada e movimento reduzido.
- **Imersão:** mesmo SVG, objetos e estados antes, durante e depois do fullscreen. O primeiro Tab oferece a saída; os seguintes percorrem os objetos. Esc fecha primeiro o contextual. A restauração do foco após a saída aguarda o próximo frame para ocorrer depois da restauração nativa do Chromium. Não foram adicionados menus permanentes.
- **Acessibilidade e telas pequenas:** controles SVG têm função de botão, nomes, estados, feedback de hover e foco visível. Os diálogos usam semântica modal nativa e ciclo explícito de foco. Movimento reduzido mantém estados estáticos equivalentes. Capturas desktop, fullscreen e de 390px foram abertas e revisadas, além dos testes existentes de outras resoluções e DPR fracionário.
- **Regressão:** os testes anteriores de Room, Let It Float, rascunho privado, chuva, áudio sem autoplay, preferências, navegação, pausa e escala continuam aprovados. Testes de Journey não observaram erros de renderer nem requisições externas. CSP, preload, canais IPC, lista de preferências, The Room, Garden e Let It Float permanecem sem alteração.
- **Desktop e segurança:** o teste nativo confirma cliques reais na luminária, livro e bilhete; Esc fecha cada contextual preservando fullscreen DOM/nativo e o foco volta ao objeto. O Esc seguinte sai e restaura a janela normal/maximizada, com a mesma arte. Sandbox, isolamento, ponte, preferências e confirmação nativa de descarte continuam aprovados. Foi necessária uma exceção de `keyboardLock`, limitada ao mesmo webContents/frame principal e URL local exata já confiáveis, somente quando a janela está em fullscreen. Somente o diálogo desktop pede `navigator.keyboard.lock(['Escape'])`, liberado ao fechar/desmontar; não há registro de teclas, captura de texto ou atalhos globais. Teste unitário cobre negação fora de fullscreen e para outras páginas, frames, webContents e permissões.

A primeira rodada encontrou um ciclo de foco incompleto nos diálogos; foi corrigido. Outra rodada identificou o Chromium restaurando o foco no último objeto depois da saída do fullscreen; a reposição foi movida para um frame posterior. As expectativas antigas de três paisagens e seletores que passaram a corresponder a mais de um elemento foram atualizadas. A suíte completa foi executada novamente e passou. A primeira execução isolada no sandbox precisou ser interrompida depois dos casos por ficar presa ao encerrar o servidor; as execuções consolidadas fora dele encerraram normalmente.

O teste nativo adicional revelou que Electron consome o keydown de Escape antes de enviá-lo ao renderer quando está em HTML fullscreen. Isso foi observado com eventos do próprio teste e corresponde à precedência do gerenciador de acesso exclusivo no [código do Electron](https://github.com/electron/electron/blob/main/shell/browser/api/electron_api_web_contents.cc). A [permissão Keyboard Lock documentada pelo Electron](https://www.electronjs.org/docs/latest/api/session) permitiu a correção restrita acima, sem novos canais IPC ou alteração da CSP. A instrumentação temporária foi removida. O helper de cliques nativos também passou a evitar `show()` em uma janela já visível e aguarda a geometria normal assentar depois da saída; a validação final passou.

## Arquivos criados

- `src/scenes/Journey/JourneyObjects.jsx`: cortinas, livro no banco e áreas interativas do cenário.
- `src/scenes/Journey/useJourneyObjects.js`: estados dos objetos e ciclo do chá, sem persistência.
- `src/scenes/Journey/JourneyKeepsake.jsx` e `JourneyKeepsake.css`: livro e bilhete contextuais.
- `src/scenes/Journey/sceneries.js`: catálogo de paisagens, descrições acessíveis e textos dos bilhetes.
- `src/scenes/Journey/JourneyLandscapes.css`: animações ambientais das novas paisagens.
- `tests/e2e/journey-interactions.spec.js`: seis casos novos de interação e regressão.

## Arquivos modificados

- `src/scenes/Journey/Journey.jsx`, `Journey.css`, `JourneyCarriage.jsx`, `JourneyLandscape.jsx`: integração dos objetos, iluminação, arte e cenários adicionais.
- `src/components/ImmersiveViewport/ImmersiveViewport.jsx` e `src/hooks/useImmersiveMode.js`: teclado contextual e restauração de foco.
- `src/app/App.jsx`: nomes das novas paisagens no indicador de ambiente e dica dos objetos.
- `tests/e2e/journey.spec.js` e `tests/e2e/immersive.spec.js`: cinco paisagens e navegação de teclado ampliada.
- `scripts/desktop-smoke-main.mjs`: verificação nativa dos objetos, contextuais e Esc.
- `electron/main/index.js`, `electron/services/security.js` e `tests/electron-security.test.js`: permissão de Escape contextual restrita e sua cobertura de segurança.
- `README.md`, `ROADMAP.md` e `VALIDATION.md`: comportamento, estágio do projeto e resultados atuais.

## Limites e continuidade

Luminária, cortinas e chá reiniciam ao sair para outro ambiente; a paisagem, chuva e pausa mantêm seu comportamento anterior de sessão. O chá continua esfriando durante a pausa do trem. As paisagens são loops, sem novos sons de trem. Não foram avaliados leitores de tela manualmente, desempenho em vários computadores ou todas as combinações de monitores, DPI e GPU do Windows. As capturas ficam em `outputs/` e `test-results/`, sem versionamento. Não foi gerado novo executável portátil nem realizados commit, push ou merge.

Próximos refinamentos sugeridos: avaliação em equipamentos com diferentes escalas de tela, teste manual com leitores de tela e sons locais de trilhos com controle explícito do usuário.

Para experimentar, execute `npm start` após o build, abra The Journey e explore os cinco objetos. Alterne as cinco paisagens, pause e retome. Entre no modo imersivo, abra livro ou bilhete e confira que o primeiro Esc fecha o contextual e o seguinte retorna à interface; repita com Tab e com movimento reduzido.

---

# Validação anterior — Modo Imersivo de The Journey

Verificação de 20 de outubro de 2026, em Windows x64, Node.js 22.18.0 e npm 10.9.3. Resultados desta implementação, separados do histórico abaixo.

| Verificação executada | Resultado |
| --- | --- |
| `npm test` | 26 passaram; nenhum falhou |
| `npm run build` | Build de produção concluído |
| `npm run test:e2e` no Edge | 26 passaram em 46,1 s; código de saída 0 |
| `npm run test:desktop` no build final | Passou; fullscreen DOM e nativo, Esc e restauração da janela |
| `git diff --check` | Sem erros de whitespace |
| Inspeção visual | Capturas de fullscreen em 1920 × 1080, 2560 × 1440, 1440 × 960, 320 × 240 e Electron abertas e revisadas |

## Comportamentos verificados

- O ícone de expandir de Journey tem nome acessível e tooltip **Modo Imersivo**. O alvo real de `document.fullscreenElement` é somente o viewport da arte: cabeçalho, título, navegação, molduras externas e controles de paisagem ficam fora dele, sem bordas ou rolagem. Os elementos externos também ficam `inert` durante o modo e são restaurados ao sair.
- O mesmo SVG e a mesma instância da animação permanecem montados. Paisagem selecionada, chuva e pausa são preservadas; parallax e chuva continuam animando quando estavam ativos. O áudio não inicia por entrar em fullscreen e o AudioContext já ativado continua o mesmo, em execução, ao entrar e sair.
- **Esc** restaura a interface e o foco no botão de entrada. O botão de saída só aparece no canto superior direito com movimento do cursor ou por **Tab**; ele some por inatividade e permanece visível enquanto recebe foco de teclado. Clique e Enter também encerram o modo.
- A composição mantém 16:9, toda a arte visível e `image-rendering: pixelated` / `shape-rendering: crispEdges`. O ajuste usa escala inteira em pixels físicos e posicionamento alinhado à grade física, considerando DPR. Em 1920 × 1080 (DPR 1), usa escala 4 sem margens; em 2560 × 1440, escala 5 e margens de 80 px nas laterais e 45 px acima/abaixo. DPR 1,25 também foi verificado. Em 320 × 240, reduz proporcionalmente para 320 × 180, centralizado sem recorte.
- Movimento reduzido mantém a arte estática antes, durante e após fullscreen. Indisponibilidade e recusa da API exibem um status na interface normal, sem ativar um modo falso ou deixar controles inertes; uma nova tentativa com a API real funciona.
- No Electron, entrada foi feita por evento de mouse real e saída por Escape. O teste confirmou eventos de fullscreen HTML, `BrowserWindow.isFullScreen()`, restauração dos limites normais, estado maximizado, foco, mesma arte e cenário. Sandbox, isolamento, ausência de Node no renderer, duas funções da ponte, preferências e confirmação nativa de descarte continuaram aprovados.
- Apenas a permissão `fullscreen` recebe uma exceção para o webContents confiável, frame principal e URL local exata. Testes unitários negam outras janelas/frames/URLs, `automatic-fullscreen` e outras permissões. Preload, canais IPC, CSP e dependências não foram ampliados. Arte do vagão, paisagens, The Room e Let It Float não foram alterados.

A primeira execução de interface encontrou uma disputa de foco ao revelar a saída por teclado; o foco passou a aguardar a aplicação da visibilidade no próximo frame. A verificação de centralização também foi ajustada para considerar o alinhamento à grade física em vez de exigir uma origem fracionária em DPR 1,25. A suíte completa foi executada novamente e passou. O teste Electron foi repetido no build final e passou.

Capturas locais, não versionadas: `outputs/Little-Haven-Journey-immersive-1920x1080.png`, `outputs/Little-Haven-Journey-immersive-2560x1440.png`, `outputs/Little-Haven-Journey-immersive-1440x960.png`, `outputs/Little-Haven-Journey-immersive-320x240.png` e `outputs/Little-Haven-Journey-immersive-desktop.png`.

## Limites e verificação manual

O fullscreen precisa ser permitido pelo navegador e acionado por um gesto do usuário. Avisos transitórios de segurança do próprio navegador dependem dele. Margens são intencionais para manter escala inteira; telas menores que a grade original usam redução e podem perder detalhes. Os testes não substituem avaliação manual com leitores de tela, múltiplos monitores ou todas as configurações de DPI/GPU do Windows. O smoke nativo usa um perfil isolado e renderização por software, conforme o padrão anterior.

Não foi executado empacotamento nem atualizado o executável portátil. Para experimentar o build atual, execute `npm start`, entre em Journey, escolha uma paisagem e acione **Modo Imersivo**. Confira Esc, a saída pelo canto/Tab, continuidade das animações e movimento reduzido. Não foram feitos commit ou push.

---

# Validação anterior — revisão visual do interior de The Journey

Revisão de 20 de outubro de 2026, em Windows x64. Esta alteração refaz a arte do interior, mantendo a grade SVG de 480 × 270 e a abertura da janela em `x=83, y=42, largura=316, altura=119`. A paisagem externa, seus loops, estados, navegação, áudio e controles não foram modificados.

O novo interior inclui porta de passagem com soleira, teto facetado, bagageiro metálico com malas, duas poltronas frente a frente com cabeceiras e pedestais fixos, radiador, molduras mecânicas, pega de apoio, luminária de parede e mesa suspensa com chá e ticket. A arte foi separada em `src/scenes/Journey/JourneyCarriage.jsx`; a descrição acessível foi atualizada. Foram retirados tapete, quadro, cortinas, planta e mobiliário doméstico da composição anterior, junto da animação de folhas sem uso.

| Verificação executada nesta revisão | Resultado |
| --- | --- |
| `npm test` | 22 passaram; nenhum falhou |
| `npm run build` | Build concluído; repetido após o ajuste final da placa do vagão |
| `npm run test:e2e` no Microsoft Edge | 19 passaram em 37,4 s; código de saída 0 |
| `npx playwright test tests/e2e/journey.spec.js -g "keyboard controls"` | 1 passou após o ajuste final da placa; capturas atualizadas |
| `git diff --check` | Sem erros de whitespace |
| Inspeção visual | Três cenários desktop e layout de 360 × 780 abertos e revisados; placa final conferida em desktop e mobile |

As verificações de interface cobrem navegação entre Room, Journey e Let It Float, proteção de rascunhos sintéticos, troca das três paisagens, chuva, pausa/retomada, áudio sem autoplay, teclado, foco, movimento reduzido e layouts menores. Não foram observados erros de renderer/console nem requisições externas nos testes de Journey. A suíte foi executada fora do sandbox para permitir que o Playwright encerrasse seu próprio servidor, conforme a limitação de ambiente registrada na entrega anterior.

A composição mantém a janela como elemento dominante; apenas os encostos recobrem uma pequena parte dos cantos inferiores, como assentos vistos de lado. As silhuetas de porta, poltronas e bagageiro continuam reconhecíveis no mobile. As capturas atualizadas estão em `outputs/Little-Haven-Journey-{rainy-night,forest,sunset,mobile}.png` e não são versionadas.

## Limites desta revisão visual

Porta, ticket e bagagens são detalhes da arte, sem novas interações. As limitações anteriores de três paisagens em loop e áudio apenas de chuva continuam. Não foram executados smoke nativo do Electron, empacotamento ou testes manuais com leitores de tela/DPI variados. The Room, Let It Float, Electron e dependências não foram alterados. Não foi gerado um novo executável portátil, commit ou push.

Para conferir manualmente, execute `npm start` após o build, abra **The Journey** e alterne as três paisagens. Confira também pausa/retomada, navegação e a cena estática com movimento reduzido.

---

# Validação anterior — primeira versão de The Journey

Verificações desta implementação, executadas em Windows x64, Node.js 22.18.0 e npm 10.9.3. O histórico da Fase 1 abaixo permanece separado e não serve como prova de validação desta mudança.

| Verificação executada | Resultado |
| --- | --- |
| `npm test` após a implementação | 22 passaram; nenhum falhou |
| `npm run build` | Build de produção concluído |
| `npm run test:e2e` no Microsoft Edge | 19 passaram; nenhum falhou; encerramento com código 0 |
| `git diff --check` | Sem erros de whitespace |
| Inspeção visual das quatro capturas de Journey | Três paisagens desktop e uma captura de 360 × 780 abertas e revisadas |

A primeira execução de interface no sandbox apresentou os 19 casos aprovados, mas ficou presa ao encerrar o servidor de teste e foi interrompida. A execução final fora do sandbox validou a arte corrigida, gerou novamente as capturas e encerrou normalmente com `19 passed (37.2s)`.

## Comportamentos verificados nesta mudança

- **Navegação:** Room → Journey → Let It Float e retorno ao quarto; Journey abre a experiência real e recebe foco no título. Garden continua planejado. Um rascunho sintético exige confirmação antes de sair para Journey; continuar preserva o texto e descartar o remove.
- **Paisagens e chuva:** noite chuvosa, floresta e pôr do sol alteram a cena e o indicador de ambiente. A chuva da viagem é independente da chuva do quarto, só aparece na noite e pode ser desligada. As escolhas da viagem sobrevivem à troca de ambiente e reiniciam ao recarregar, sem novas preferências persistentes.
- **Movimento:** as transformações das camadas mudam ao longo do tempo, permanecem iguais durante a pausa e voltam a mudar após retomar. A pausa permanece ativa ao trocar a paisagem; os estilos das animações ambientais também são verificados.
- **Movimento reduzido:** as três paisagens ficam sem animações e sem transições; chuva e seleção continuam utilizáveis. A mudança da preferência do sistema durante a sessão preserva cenário, chuva e a escolha explícita de pausa.
- **Áudio:** nenhum AudioContext é criado antes do gesto de ativação. O ganho da chuva acompanha o ambiente e o toggle da viagem, silencia em floresta, pôr do sol e Garden, e volta a seguir a preferência do quarto em Room/Let It Float. Recarregar exige novo gesto.
- **Teclado e layout:** navegação com Tab/Enter/Espaço, seleção com teclado e foco visível. Controles e cena verificados em 1440 × 960, 800 × 650, 390 × 844 e 360 × 780, sem transbordamento horizontal. As capturas mostram pixels nítidos e cores distintas nos três cenários.
- **Regressões:** suíte anterior de Room e Let It Float passou, incluindo ritual completo, proteção e privacidade do rascunho, preferências e áudio. Os testes novos não observaram erros de renderer/console nem requisições externas.

Capturas locais, não versionadas: `outputs/Little-Haven-Journey-rainy-night.png`, `outputs/Little-Haven-Journey-forest.png`, `outputs/Little-Haven-Journey-sunset.png` e `outputs/Little-Haven-Journey-mobile.png`.

## Limites desta validação e da versão inicial

Não foram executados nesta tarefa o smoke test nativo do Electron, empacotamento, testes do executável portátil, leitores de tela ou avaliação subjetiva do áudio em equipamentos reais. Os módulos Electron, a CSP, a ponte e a lista de preferências persistentes não foram alterados. O executável anterior não foi atualizado; para experimentar o código atual, use `npm run dev` ou `npm start` após o build.

The Journey oferece três paisagens em loop e a camada sonora existente de chuva, sem sons próprios de trilhos ou do vagão. O pause automático quando o documento fica oculto foi revisado no código; não foi acrescentado um teste específico desse comportamento de Journey. Não há progressão ou destino obrigatório. As escolhas de cenário, chuva e pausa duram apenas a sessão. Próximas evoluções: áudio local próprio com controle explícito, pequenas interações no vagão e maior variedade de paisagens.

## Verificação manual sugerida

1. Execute `npm run dev` na raiz do projeto e escolha **The Journey**.
2. Troque as três paisagens, pause e retome; na noite, desligue e ligue a chuva. Ative o som por clique para ouvir a chuva e confira o silêncio nos outros cenários.
3. Volte ao quarto, entre em Let It Float e escreva somente um texto de teste. Tente abrir Journey, escolha continuar e depois confirme o descarte.
4. Percorra os controles com Tab, use as setas no seletor e ative movimento reduzido no sistema; a cena deve ficar estática.

---

# Little Haven 0.1.0 — validação da Fase 1 (histórico anterior)

Data da entrega: 19 de outubro de 2026. Ambiente: Windows x64, Node.js 22.18.0, npm 10.9.3. React 19.3.1, Vite 8.3.4 e Electron 44.9.0, com versões fixadas no lockfile.

## Resultados

| Verificação executada | Resultado |
| --- | --- |
| Instalação real de dependências (`npm install`) | Concluída |
| Build de produção (`npm run build`) | Concluído |
| Testes unitários (`npm test`) | 22 passaram; nenhum falhou |
| Interface de produção no Edge (`npm run test:e2e`) | 6 passaram; nenhum falhou |
| Electron de produção (`npm run test:desktop`) | Passou |
| Inicialização real `npm run dev` + encerramento de Vite (`node scripts/development-smoke.mjs`) | Passou |
| Distribuição Windows (`npm run package:win`) | Executável portátil x64 gerado |
| Aplicativo empacotado (`node scripts/package-smoke.mjs`) | Passou |
| Lançador portátil `.exe` (`node scripts/portable-smoke.mjs`) | Abriu o quarto e encerrou normalmente |

O teste de teclado encontrou inicialmente uma disputa de foco entre o título e o campo de escrita. A correção foi aplicada e a suíte de interface foi executada novamente com sucesso. A versão final também mantém o controle de volume visível em janelas pequenas.

## O que foi observado

- **Quarto:** clique na luminária altera a luz; clique na janela altera a chuva. Preferências de luz, chuva e volume sobrevivem ao recarregamento.
- **Ritual:** o caderno abre o papel, o rascunho exige confirmação antes de sair e o cancelamento preserva o texto. A sequência completa de dobra, travessia e conclusão foi acompanhada por aproximadamente 17 segundos.
- **Privacidade:** um texto sintético de teste não apareceu no DOM após envio, em localStorage, sessionStorage, no JSON de preferências ou nas requisições observadas. Campos extras, incluindo texto, foram rejeitados pela ponte. O descarte do estado React é testado separadamente. Não foram usados pensamentos reais.
- **Acessibilidade:** entrada por teclado, foco no campo, diálogo com foco protegido, Escape para continuar e conclusão imediata com movimento reduzido. Layout verificado em 1440 × 960, 800 × 650 e 390 × 844; sem transbordamento horizontal.
- **Áudio:** ausência de autoplay, ativação por clique, retomada exigindo novo gesto, ganho limitado, fades, chuva desligada e liberação de recursos. O som é sintetizado no dispositivo.
- **Desktop:** React, arte e ícone carregaram de `app.asar`; sandbox e isolamento ativos; Node ausente no renderer; somente duas funções na ponte. As preferências sobreviveram ao fechamento e à reabertura do aplicativo empacotado. A confirmação nativa de descarte bloqueou e permitiu o recarregamento conforme a escolha de teste.
- **Desenvolvimento:** o comando documentado abriu Vite e Electron, carregou o quarto sem violações de CSP e encerrou Vite ao fechar sua própria janela.
- **Console:** nenhum erro de renderer nas verificações nativas e nas verificações de interface que monitoram o console. Avisos de ferramentas sobre cores de terminal não são erros da aplicação.
- **Inspeção visual:** capturas do quarto e da escrita foram abertas e revisadas; cenário proporcional, pixels nítidos, controles legíveis e navegação visível na janela desktop de referência.

Os testes nativos usam perfis dentro de `work/`, sem modificar preferências pessoais. Alguns testes usam renderização por software para funcionar nesta sessão; a abertura normal mantém aceleração gráfica disponível.

## Limites da validação

Não foram avaliados manualmente leitores de tela, diferentes equipamentos de áudio, conforto sonoro subjetivo, outras versões do Windows, múltiplos monitores ou todas as escalas de DPI. Não houve distribuição em loja nem assinatura digital. O executável está identificado como `NotSigned` pelo Windows.

A auditoria `npm audit --omit=dev` encontrou **zero vulnerabilidades nas dependências de produção**. A árvore das ferramentas de empacotamento apresenta **8 avisos moderados**, todos decorrentes da mesma dependência transitiva `sprintf-js`; não há correção publicada para esse pacote na versão consultada. Não foi forçado um downgrade amplo nem uma substituição de versão principal. [Aviso oficial GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). Revisar essa cadeia ao atualizar o empacotador.

## Arquivos principais

| Arquivo | Responsabilidade |
| --- | --- |
| `package.json`, `package-lock.json`, `vite.config.js` | Dependências fixadas, scripts e build |
| `electron/main/index.js` | Janela, carregamento, políticas e confirmação nativa |
| `electron/preload/index.cjs` | Ponte isolada e limitada |
| `electron/services/preferences.js`, `security.js` | Persistência validada e controle de recursos |
| `src/app/App.jsx`, `App.css` | Navegação, coordenação e apresentação |
| `src/scenes/Room/Room.jsx`, `Room.css` | Arte original, chuva e objetos |
| `src/scenes/LetItFloat/` | Papel, rio, barco e estados do ritual |
| `src/scenes/Planned/` | Apresentação honesta de Garden e Journey |
| `src/services/`, `src/hooks/` | Áudio, preferências e movimento reduzido |
| `tests/`, `scripts/*smoke*.mjs` | Testes unitários, interface e integração desktop |
| `public/assets/`, `public/licenses/` | Ícones originais, orientação de áudio e licenças |
| `README.md`, `ROADMAP.md` | Execução, arquitetura e continuidade |

O código editável fica na raiz do projeto. O ZIP de código-fonte contém esses arquivos e não inclui dependências instaladas, builds, perfis de teste nem pensamentos.
