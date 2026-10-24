# Little Haven — A Cozy Place to Breathe

Um pequeno refúgio desktop em pixel art: uma noite de chuva, uma luz quente e um lugar onde você pode apenas existir. Sem contas, metas, pontuações ou serviços em nuvem.

A fundação da Fase 1 entrega **The Room** e o ritual **Let It Float**. O aplicativo também oferece **The Journey**, uma viagem contemplativa de trem com cinco paisagens e pequenos objetos interativos. **The Garden** permanece identificado como planejado.

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

O botão de som inicia uma chuva suave sintetizada no dispositivo. O volume começa em 25% e tem ganho de saída limitado. No quarto e em Let It Float, essa camada acompanha a chuva do quarto; em The Journey, só toca na paisagem noturna com a chuva da viagem ligada. As outras quatro paisagens são silenciosas. Mesmo com a preferência de áudio salva, cada abertura exige um novo clique em **Retomar som**; o aplicativo não inicia áudio sozinho.

Os objetos, a navegação e os botões funcionam com **Tab**, **Enter** ou **Espaço**, com foco visível. O volume e a seleção de paisagem aceitam as setas do teclado. Os diálogos mantêm o foco e **Esc** preserva o rascunho. A preferência de movimento reduzido do sistema interrompe as animações ambientais e conclui o ritual com uma alternativa estática. Na viagem, mantém a cena estática e desabilita o controle de pausa; a troca de paisagem e o retorno ao quarto continuam disponíveis.

### Modo Imersivo de The Journey

Em tela cheia, a arte do vagão e da paisagem fica centralizada, sem o cabeçalho, títulos, navegação ou controles de paisagem da interface normal. Os cinco objetos continuam utilizáveis. Pressione **Esc** para voltar; quando livro ou bilhete estiver aberto, o primeiro **Esc** fecha apenas esse elemento e devolve o foco ao objeto. Um botão temporário de saída aparece ao mover o cursor para o canto superior direito ou no primeiro **Tab**, com foco visível; os próximos **Tab** percorrem os objetos e retornam à saída. O botão desaparece quando deixa de ser usado. Os diálogos mantêm o foco e têm botões de fechamento próprios.

A composição preserva a proporção de 480 × 270, sem recorte ou distorção, com margens na cor do cenário (`#1e3531`). O ajuste usa escala inteira em pixels físicos, considerando o `devicePixelRatio` do monitor, sempre que uma grade inteira cabe na área disponível. Quando nem a grade original cabe, usa uma redução fracionária para manter toda a arte visível.

O cenário permanece no mesmo DOM ao entrar e sair: paisagem selecionada, chuva, pausa, animações e áudio já ativado continuam no estado anterior. Movimento reduzido também continua respeitado. Apenas The Journey oferece o botão nesta versão. No navegador, a entrada exige suporte e permissão para a Fullscreen API e uma ação do usuário; uma recusa exibe uma mensagem de erro e mantém a interface normal.

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

No Electron, o arquivo é `preferences.json` dentro de `app.getPath('userData')`, normalmente `%APPDATA%\Little Haven` no Windows. O processo principal valida os campos e grava o JSON de forma atômica. Campos desconhecidos são rejeitados. No modo de navegador, essas quatro preferências usam a chave `haven.preferences.v1` do `localStorage`; esse armazenamento é independente do desktop.

Paisagem, pausa e chuva de The Journey ficam apenas no estado React da sessão. Essas escolhas permanecem ao trocar de ambiente e reiniciam ao reabrir ou recarregar o aplicativo. Luminária, cortinas e chá pertencem à visita atual ao vagão e reiniciam ao sair para outro ambiente. Todos os estados são preservados ao trocar de paisagem ou entrar e sair do modo imersivo. A viagem não adiciona preferências persistentes e sua chuva é independente da preferência `rainOn` do quarto.

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
  components/                   Ícones, confirmação e viewport imersivo
  hooks/                        Preferências, movimento reduzido e modo imersivo
  scenes/Room/                  Arte e objetos interativos do quarto
  scenes/LetItFloat/            Escrita, estados do ritual e rio
  scenes/Journey/               Vagão, paisagens e controles da viagem
  scenes/Planned/               Apresentação de Garden
  services/                     Preferências do renderer e motor de áudio
  styles/                       Estilos e fontes locais
public/
  assets/icons/                 Ícones originais SVG, PNG e ICO
  assets/audio/README.md        Orientações para ampliar o áudio
  licenses/                     Licenças das fontes distribuídas
scripts/                        Inicialização de desenvolvimento e teste nativo
tests/                          Testes unitários e de interface
```

O ritual tem estados explícitos de escrita, dobra, navegação do barco e conclusão, em `src/scenes/LetItFloat/ritual.js`. O conteúdo escrito não faz parte do serviço de preferências. O motor de áudio libera fontes, conexões e contexto ao ser descartado.

O hook `useImmersiveMode` coordena a DOM Fullscreen API e o componente `ImmersiveViewport` envolve a arte SVG, sem remontar a cena. A lógica de entrada, saída e ajuste de escala pode ser reutilizada por outros ambientes, que ainda não expõem esse modo.

### Limites de segurança do desktop

O renderer usa `contextIsolation: true`, `nodeIntegration: false` e `sandbox: true`. A ponte expõe somente `window.haven.getPreferences()` e `window.haven.savePreferences(prefs)`. Há validação na ponte e no processo principal, incluindo a origem do pedido IPC.

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

O quarto, o rio, o barquinho, o vagão, as paisagens e os ícones são desenhos originais produzidos no código do projeto, sem sprites de jogos existentes. A chuva sonora é procedural, gerada por Web Audio, sem gravações de terceiros, captura de microfone ou downloads durante o uso. The Journey reutiliza essa camada de chuva, sem novas faixas sonoras. Para adicionar gravações próprias ou licenciadas, siga `public/assets/audio/README.md` e mantenha a origem e a licença junto de cada arquivo.

**DM Sans**, **Fraunces** e **Pixelify Sans** são distribuídas localmente por Fontsource sob **SIL Open Font License 1.1**. Os avisos e textos completos estão em [`public/licenses/`](public/licenses/). Preserve esses arquivos ao redistribuir as fontes. Os direitos pertencem, respectivamente, aos autores dos projetos DM Sans (2014), Fraunces (2020) e Pixelify Sans (2021). As demais dependências mantêm suas próprias licenças.

## Limitações e continuidade

A versão atual oferece um quarto, um ritual, uma viagem de trem e uma camada sonora de chuva. The Journey tem cinco paisagens em loop e cinco objetos interativos, sem destino, progressão, missões ou contagem de tempo de viagem. Não há sons próprios do trem ou dos trilhos nem novas trilhas de áudio. Garden segue como proposta planejada. Não há personalização, histórico de textos, sincronização ou cultivo.

As próximas etapas incluem refinar a experiência em janelas e dispositivos reais, revisar acessibilidade e desempenho, evoluir a ambientação da viagem e implementar o jardim sem punições por ausência. O plano completo está em [`ROADMAP.md`](ROADMAP.md).
