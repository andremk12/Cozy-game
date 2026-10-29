# Little Haven — A Cozy Place to Breathe

Um pequeno refúgio desktop em pixel art: uma noite de chuva, uma luz quente e um lugar onde você pode apenas existir. Sem contas, metas, pontuações ou serviços em nuvem.

A fundação da Fase 1 entrega **The Room** e o ritual **Let It Float**. O aplicativo também oferece **The Journey**, uma viagem contemplativa de trem com cinco paisagens e pequenos objetos interativos, e **The Garden**, um jardim original para plantar, cuidar e contemplar sem cobranças.

O comando `npm run package:win` gera o executável em `outputs/desktop/Little-Haven-0.1.0-x64.exe`. Depois de gerado, abra esse arquivo para usar o aplicativo sem instalar Node.js. A distribuição é portátil e ainda não possui assinatura digital. O código-fonte editável fica na raiz deste projeto; dependências, builds, executáveis e perfis de teste são locais e não são versionados no Git.

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
| `npm test` | Executar os testes unitários. |
| `npm run test:e2e` | Gerar o build e executar os testes da interface. |
| `npm run test:desktop` | Abrir e verificar o Electron com um perfil de teste isolado; exige build prévio. |

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
- Em **The Garden**, toque em um dos quatro canteiros ou quatro vasos para plantar margarida, lavanda, **hibisco rosa**, samambaia ou suculenta. Broto, planta jovem e adulta aparecem aos 2, 8 e 20 minutos acumulados, incluindo o tempo com o aplicativo fechado. As plantas nunca morrem ou regridem por ausência.
- Selecione **Regar** e toque na planta para ver regador, gotas e uma reação das folhas. A primeira rega de cada estágio não adulto acrescenta 20% da duração daquele estágio ao crescimento; repetir não acumula bônus. Plantas adultas continuam reagindo.
- Use **Mover** para selecionar dois vasos ou pontos decorativos compatíveis e trocar suas posições. Vasos levam planta e aparência juntos; canteiros permanecem fixos. **Esc** cancela a ferramenta. Toque em uma planta para mudar o vaso, substituir a espécie ou retirá-la com confirmação.
- Explore os pontos de decoração para colocar banco, lanternas, pedras e cogumelos. Há vasos de terracota ou madeira, lanternas que podem ser apagadas, borboletas, vagalumes noturnos e peixes que respondem ao toque no lago.
- Procure o **gato laranja entre as plantas**: orelhas e cauda espiam em um dos três arbustos. Clique ou use Tab e Enter para chamá-lo; ele aparece, pisca e volta a se esconder. Não exige alimento ou cuidados.
- Em **Luz e clima**, escolha dia, pôr do sol ou noite, com clima limpo ou chuva suave. O jardim possui o mesmo **Modo Imersivo** da viagem; o baú de ferramentas e a placa de atmosfera mantêm os controles acessíveis dentro do cenário.

### Little Companion

Um pequeno gatinho em SVG pixel art descansa no quarto e acompanha você no jardim e no trem. Não tem fome, pontuação, missões, recompensas ou penalidades por ausência. O primeiro carinho abre uma pequena apresentação para escolher seu nome; **Escolher depois**, fechar ou Esc permitem continuar sem nome e sem repetir a apresentação. O nome padrão de identificação é **Seu gatinho**, sem impor um nome próprio.

Abra **Companion** no cabeçalho para acessar **My Companion**: renomeie, mostre/oculte o personagem ou escolha pelagem creme e cinza, laranja ou noite. O campo aceita nomes Unicode com até 24 caracteres percebidos, incluindo acentos combinados e outros idiomas. Espaços nas pontas são removidos; nomes vazios, quebras de linha e controles recebem uma mensagem amigável. Nomes longos não são truncados. Cancelar uma edição preserva o nome salvo.

O companheiro respira, senta, caminha, dorme, deita, se espreguiça, observa e reage ao carinho com olhos/cauda. Há descansos longos e percursos predefinidos: cama e piso do quarto, faixa livre de gramado junto ao lago e um assento do trem. O gato laranja que se esconde nos arbustos continua sendo um animal residente separado. O companheiro não aparece em **Let It Float**, preservando a simplicidade do ritual.

Clique, Enter ou Espaço fazem carinho; cliques rápidos não reiniciam a reação continuamente. Na imersão de Garden/Journey, **C** abre My Companion e Esc fecha primeiro o painel; **M** continua abrindo o mixer. Movimento reduzido mantém o gatinho estático e interativo. As opções ficam salvas somente neste dispositivo; posição e comportamento são temporários. Esta versão é visual e silenciosa: ronronar/miado ficam para uma expansão com recursos licenciados, usando o motor de áudio compartilhado.

O botão de som inicia a ambientação local. O volume geral começa em 25% e tem ganho de saída limitado. Mesmo com a preferência de áudio salva, cada abertura exige um novo clique em **Retomar som** ou **Ativar áudio**; abrir o mixer, restaurar preferências e navegar não iniciam áudio.

### Cozy Sound Mixer

Use **Mixer** no cabeçalho para abrir o pequeno rádio de sons. O cenário permanece visível e o áudio continua ao fechar o painel. Escolha **Rainy Evening**, **Morning Garden**, **Quiet Night** ou **Peaceful Journey**, ative camadas e ajuste seus volumes com os sliders ou as setas do teclado. O volume geral afeta todas proporcionalmente; **Silenciar tudo** preserva cada ajuste e atinge silêncio em uma rampa curta de 25 ms.

A biblioteca inclui três chuvas (suave, intensa e na janela), vento, folhas, pássaros, riacho, grilos, lareira, trilhos, rodas e interior do vagão. As gravações são locais e os sons procedurais são gerados no dispositivo. As três camadas do trem são tratamentos diferentes da mesma gravação real, com origem e licenças em [`public/assets/audio/README.md`](public/assets/audio/README.md).

Alterar uma camada seleciona **Custom** e salva sua combinação. Ela acompanha você entre os ambientes; escolher um preset mantém a última Custom disponível para recuperar pelo seletor. Uma camada ativada com volume zero permanece ativada e inaudível; desativá-la preserva seu volume para a próxima vez.

Após uma troca de ambiente, os presets acompanham o lugar: Rainy Evening no quarto, Morning Garden/Quiet Night conforme a luz do jardim e Peaceful Journey no trem. Clima e chuva ajustam a camada de chuva desses perfis. **Custom nunca é sobrescrita por essas trocas**; o painel oferece a sugestão do lugar para aplicar por escolha. A combinação salva é restaurada sem alterações ao abrir o aplicativo. As chuvas visuais continuam independentes da combinação Custom.

No Modo Imersivo de Garden ou Journey, pressione **M** para ajustar os sons sem sair da tela cheia. **Esc** fecha primeiro o mixer; outro Esc segue as regras existentes de contexto/ferramentas/saída. Fechar o mixer devolve o foco ao cenário e deixa somente a arte. O áudio iniciado continua com a janela sem foco. O painel possui foco protegido, grupos recolhíveis, volume geral fixo e rolagem interna em janelas menores.

Os objetos, a navegação e os botões funcionam com **Tab**, **Enter** ou **Espaço**, com foco visível. O volume e a seleção de paisagem aceitam as setas do teclado. Os diálogos mantêm o foco e **Esc** preserva o rascunho. A preferência de movimento reduzido do sistema interrompe as animações ambientais e conclui o ritual com uma alternativa estática. Na viagem, mantém a cena estática e desabilita o controle de pausa; a troca de paisagem e o retorno ao quarto continuam disponíveis.

### Modo Imersivo de The Journey

Em tela cheia, a arte do vagão e da paisagem fica centralizada, sem o cabeçalho, títulos, navegação ou controles de paisagem da interface normal. Os cinco objetos continuam utilizáveis. Pressione **Esc** para voltar; quando livro ou bilhete estiver aberto, o primeiro **Esc** fecha apenas esse elemento e devolve o foco ao objeto. Um botão temporário de saída aparece ao mover o cursor para o canto superior direito ou no primeiro **Tab**, com foco visível; os próximos **Tab** percorrem os objetos e retornam à saída. O botão desaparece quando deixa de ser usado. Os diálogos mantêm o foco e têm botões de fechamento próprios.

A composição preserva a proporção de 480 × 270, sem recorte ou distorção, com margens na cor do cenário (`#1e3531`). O ajuste usa escala inteira em pixels físicos, considerando o `devicePixelRatio` do monitor, sempre que uma grade inteira cabe na área disponível. Quando nem a grade original cabe, usa uma redução fracionária para manter toda a arte visível.

O cenário permanece no mesmo DOM ao entrar e sair: paisagem selecionada, chuva, pausa, animações e áudio já ativado continuam no estado anterior. Movimento reduzido também continua respeitado. The Garden reutiliza esse mecanismo, com cursor visível, objetos e ferramentas contextuais; Esc fecha primeiro o contexto ou cancela uma ação e depois sai da imersão. No navegador, a entrada exige suporte e permissão para a Fullscreen API e uma ação do usuário; uma recusa exibe uma mensagem de erro e mantém a interface normal.

## Privacidade e preferências

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
| `companion` | Visível, sem nome, pelagem `default`, sons desativados e apresentação pendente |

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
  services/security.js          Políticas de recursos e CSP
src/
  app/App.jsx                   Navegação e coordenação das experiências
  components/                   Ícones, confirmação, mixer e viewport imersivo
  components/companion/         Gatinho SVG, animações e painel My Companion
  hooks/                        Preferências, movimento reduzido e modo imersivo
  scenes/Room/                  Arte e objetos interativos do quarto
  scenes/LetItFloat/            Escrita, estados do ritual e rio
  scenes/Journey/               Vagão, paisagens e controles da viagem
  scenes/Garden/                Jardim, plantas, ferramentas, decoração e fauna
  services/audio/               Motor compartilhado, camadas, biblioteca e presets
  services/                     Preferências e persistência do jardim
  styles/                       Estilos e fontes locais
public/
  assets/icons/                 Ícones originais SVG, PNG e ICO
  assets/audio/                 Gravações locais, manifest e procedência
  licenses/                     Licenças das fontes e créditos/licenças de áudio
scripts/                        Inicialização de desenvolvimento e teste nativo
shared/garden.js                Modelo puro, crescimento, posições e validação do jardim
shared/audio.js                 Schema do mixer e configurações dos presets
shared/companion.js             Nome Unicode e preferências limitadas do companheiro
tests/                          Testes unitários e de interface
```

O ritual tem estados explícitos de escrita, dobra, navegação do barco e conclusão, em `src/scenes/LetItFloat/ritual.js`. O conteúdo escrito não faz parte dos serviços de preferências ou jardim. `useGarden` mantém a store acima das cenas e agenda somente o próximo estágio enquanto o jardim está visível. O motor de áudio libera fontes, conexões e contexto ao ser descartado; camadas retiradas da mistura são liberadas após o fade, inclusive ao mudar de ambiente fora de Custom.

O hook `useImmersiveMode` coordena a DOM Fullscreen API e o componente `ImmersiveViewport` envolve a arte SVG, sem remontar a cena. A lógica de entrada, saída e ajuste de escala pode ser reutilizada por outros ambientes, que ainda não expõem esse modo.

### Limites de segurança do desktop

O renderer usa `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true`. A ponte expõe somente `window.haven.getPreferences()`, `window.haven.savePreferences(prefs)`, `window.haven.getGarden()` e `window.haven.saveGarden(snapshot)`. Há validação na ponte e no processo principal, incluindo a origem do pedido IPC. Campos desconhecidos ou posições incompatíveis do jardim são rejeitados.

O processo principal usa ESM. O preload tem extensão **`.cjs`** porque o sandbox fornece um ambiente CommonJS limitado, sem um carregador ESM completo. Isso permite manter o sandbox e oferecer apenas a interface necessária. Consulte a [segurança do Electron](https://www.electronjs.org/docs/latest/tutorial/security), o [sandbox de processos](https://www.electronjs.org/docs/latest/tutorial/sandbox) e as [regras de ESM](https://www.electronjs.org/docs/latest/tutorial/esm).

Em produção, o Electron carrega `dist/index.html`, bloqueia requisições de rede e arquivos fora do bundle, nega novas janelas, downloads e navegações externas. A permissão `fullscreen` é limitada ao frame principal da janela e à página local confiável esperada. Para que Esc feche primeiro livro ou bilhete no desktop, `keyboardLock` também recebe uma exceção para esse mesmo frame/URL, somente quando a janela já está em fullscreen. O diálogo solicita apenas a tecla Escape e libera a captura ao fechar ou desmontar; não captura texto nem registra teclas. `automatic-fullscreen`, `pointerLock` e as demais permissões continuam negadas. O modo imersivo usa a DOM Fullscreen API, sem adicionar funções ao preload ou novos canais IPC. A CSP permanece a mesma, restringindo scripts a arquivos locais e impedindo conexões. O desenvolvimento habilita apenas o servidor local explícito `127.0.0.1:5173` e seu WebSocket; esse modo é ignorado no aplicativo empacotado. Não há backend, autenticação, telemetria ou atualização automática.

## Testes

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

Verificações adicionais de integração, sempre com perfis isolados:

```powershell
node scripts/development-smoke.mjs
npm run package:win
node scripts/package-smoke.mjs
node scripts/portable-smoke.mjs
```

Elas verificam, respectivamente, o ciclo real de desenvolvimento e encerramento do Vite, o aplicativo empacotado e seu lançamento portátil. O teste portátil abre temporariamente uma porta local de depuração só para inspecionar sua própria janela e a encerra ao terminar. Essa opção não é utilizada na abertura normal do aplicativo.

Os resultados e limites das verificações desta entrega estão em [`VALIDATION.md`](VALIDATION.md).

## Arte, áudio e licenças

O quarto, o rio, o barquinho, o vagão, as paisagens, o jardim, suas plantas e animais, o Little Companion e os ícones são desenhos originais produzidos no código do projeto, sem sprites de jogos existentes. O companheiro usa SVG e animações CSS, sem novos recursos de terceiros. O áudio combina texturas procedurais de chuva/vento e gravações locais licenciadas em CC0 ou CC BY 3.0. Consulte [`public/assets/audio/README.md`](public/assets/audio/README.md) para autores, fontes, tratamentos e hashes; os avisos acompanham a biblioteca. Não há captura de microfone, streaming ou downloads durante o uso.

O motor compartilhado fica em `src/services/audio/`, com um único AudioContext criado por gesto, ganho por camada, master limitado, fades finitos e loops com sobreposição de bordas. Gravações são decodificadas somente ao ativar a camada. O plugin local de Vite em `scripts/local-audio-plugin.mjs` entrega os bytes como módulos JavaScript locais sob demanda, permitindo decodificação no Electron com a CSP de produção `connect-src 'none'` preservada, sem ampliar a ponte IPC. Fontes desativadas são liberadas após o fade; fechar o aplicativo libera o contexto.

**DM Sans**, **Fraunces** e **Pixelify Sans** são distribuídas localmente por Fontsource sob **SIL Open Font License 1.1**. Os avisos e textos completos estão em [`public/licenses/`](public/licenses/). Preserve esses arquivos ao redistribuir as fontes. Os direitos pertencem, respectivamente, aos autores dos projetos DM Sans (2014), Fraunces (2020) e Pixelify Sans (2021). As demais dependências mantêm suas próprias licenças.

## Limitações e continuidade

A versão atual oferece quarto, ritual, viagem e jardim. The Journey tem cinco paisagens em loop, cinco objetos interativos e camadas locais de trem, sem destino, progressão, missões ou contagem de tempo de viagem. O jardim usa pontos predefinidos: quatro canteiros fixos e quatro vasos reorganizáveis, sem arrastar e soltar ou transplante entre canteiros e vasos. O gato escolhe um esconderijo por visita, sem deslocamento entre eles. Não há histórico de textos, sincronização, economia ou obrigações de cultivo.

As próximas etapas incluem refinar a experiência em janelas e dispositivos reais, revisar acessibilidade e desempenho e ampliar os detalhes dos ambientes. O plano completo está em [`ROADMAP.md`](ROADMAP.md).
