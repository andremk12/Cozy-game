# Revisão de áudio — Little Haven — 31 de outubro de 2026

Esta é uma auditoria de código, fontes, PCM e mixagem offline. **Não houve escuta humana em fones ou caixas**. Identidade percebida, naturalidade, conforto por 5–60 minutos e eventuais artefatos audíveis continuam sujeitos à aprovação humana. Pico, RMS, crest factor e continuidade matemática não substituem essa avaliação. Nenhum resultado abaixo é LUFS.

## Causas confirmadas antes da alteração

- **Folhas quase ausentes:** a montagem antiga distribuía somente quatro foleys de 0,63–0,99 s em 28 s. O PCM tinha pico 0,60 e RMS 0,01639, com 88,9% das janelas de 100 ms abaixo de RMS 0,003. O teto do motor, 0,24, derrubava o RMS efetivo para **0,00661**; após essa preparação, 90,4% das janelas estavam quase silenciosas. Aumentar o slider elevava sobretudo contatos isolados.
- **Trem sem articulação própria:** três controles usavam o mesmo trecho de uma gravação de rumble, filtrada em 70–3000, 550–5000 e abaixo de 320 Hz. Essa sobreposição não produzia por si só ritmo de rodas sobre juntas. Não havia uma camada independente com pares de contatos ferroviários.
- **Desequilíbrio de arranjo:** Morning Garden nem incluía folhas. Peaceful Journey usava trilhos/rodas/vento, sem o corpo grave separado do vagão. A chuva na janela podia mascarar texturas semelhantes no trem; competir apenas por ganho seria inadequado.
- **Picos de arquivo não são o ganho final:** várias gravações tinham pico 0,60 e eram reduzidas para 0,24 no motor. Por exemplo, riacho ficava com RMS 0,033, enquanto pássaros/lareira ficavam em aproximadamente 0,017. Essa diferença é compatível com funções diferentes; não justifica igualar todos os RMS.
- **Loop curto conhecido:** grilos têm 10,25 s efetivos após o overlap. Não houve evidência técnica suficiente para substituir uma gravação funcional; repetitividade em sessões longas requer escuta.

## Arquitetura e limites

O motor é Web Audio API, em `src/services/audio/AudioEngine.js`. Um único `AudioContext` é compartilhado por ambientes, música e efeitos finitos. Existe um ganho por camada e um ganho master; o teto master é **0,25**, multiplicado pelo volume geral salvo. O padrão de volume geral é 25%, portanto o ganho efetivo inicial é 0,0625, antes dos sliders individuais. Volume do sistema, hardware e acústica também afetam a percepção.

As texturas procedurais de chuva e vento são geradas localmente em buffers estéreo. As gravações WAV e a composição local são carregadas sob demanda; bytes locais passam pelo plugin Vite, sem streaming nem modificação de CSP. O motor aplica teto de pico e overlap de 750 ms para as gravações ambientais. Fades finitos alcançam zero. Camadas retiradas são paradas/desconectadas após o fade; solicitações antigas de decode não podem iniciar fontes desativadas. O mixer possui 14 controles: 13 camadas contínuas e um bus de efeitos contextuais da cozinha; o bus não cria um loop extra.

Construção do serviço, restauração das preferências, entrada no ambiente e abertura do mixer não autorizam reprodução. A autorização exige o controle explícito da sessão. O mute preserva volumes; preferências contêm somente IDs, booleans e números validados, sem pensamentos ou arquivos pessoais. Não há texto do Let It Float, microfone, rede, telemetria ou mudanças de segurança nesta revisão.

O áudio independe das animações do jardim e da troca de paisagens da viagem. Não foi acrescentada sincronização com a vegetação: o farfalhar continua funcionando com movimento reduzido e com a janela minimizada, evitando um relógio visual necessário à reprodução.

## Inventário técnico

RMS abaixo é **antes** do slider individual e do master, a 32 kHz e após o preparo efetivo do loop. Procedurais usam seed 717 nesta medição. Para uma camada inicialmente desligada, o slider padrão é 35%; os valores ativos dos presets aparecem abaixo. “Percepção pendente” significa que a inspeção da fonte ou do sinal não é uma alegação de escuta.

| Camada / ambientes usuais | Origem e tipo | Ganho de referência | RMS efetivo / ciclo | Clareza, loop, problema e decisão |
| --- | --- | --- | --- | --- |
| Chuva suave / Room, Garden | Síntese original, ruído suavizado estéreo | Room 40%; Garden chuvoso conforme política do ambiente | 0,05781 / 15,25 s | Textura ampla; distinta da chuva intensa por densidade. Preservada. Overlap sem fade periódico a silêncio; percepção pendente. |
| Chuva intensa / mixer | Síntese original, filtro mais aberto estéreo | Desligada; slider 35% | 0,07299 / 15,25 s | Maior energia e brilho do conjunto de chuvas; não amplificada. Atenção ao mascaramento quando escolhida manualmente. |
| Chuva na janela / Journey | Síntese original, base de chuva e gotas ressonantes esparsas | 35% na noite chuvosa | 0,05894 / 15,25 s | Gotas locais distinguem da base ampla. Preservada; testada por soma com o trem revisto. |
| Vento / todos | Síntese original, ruído fortemente suavizado com swells | Room/Garden 15%; Journey 8%; Quiet Night 20% | 0,04580 / 15,25 s | Textura grave contínua; difere da montagem de folhas. Preservada; participação reduzida nos presets Garden/Journey para reservar espaço. |
| Folhas / Garden, mixer | `leaves.wav`; 20 foleys reais CC0, qubodup, montagem local | Morning Garden 42% | **0,02513 / 48 s** | Antes 0,00661/27,25 s. Agora movimento sobreposto com rajadas e transientes suavizados, sem longos silêncios. Reconhecimento e naturalidade pendentes de escuta. |
| Pássaros / Garden | `birds.wav`; gravação CC0, isaiah658 | Morning Garden 38% | 0,01743 / 27,94 s | Eventos reais com pausas naturais, crest alto. Preservada; ganho do preset reduzido de 50% para equilibrar folhas/riacho. |
| Riacho / Garden | `stream.wav`; gravação CC BY 3.0, kurt | Morning Garden 25%; Quiet Night 10% | 0,03316 / 29,25 s | Fonte contínua de água; pode mascarar folhas. Preservada; ganho do preset reduzido de 35%. |
| Grilos / Garden noturno | `crickets.wav`; gravação CC0, Wolfgang_ / Ted Kerr | Quiet Night 40% | 0,04162 / 10,25 s | Gravação real; ciclo mais curto da biblioteca. Preservada; escuta prolongada de repetição pendente. |
| Lareira / Room | `fire.wav`; gravação CC0, PagDev | Rainy Evening 25% | 0,01708 / 26,51 s | Crepitações ocasionais abaixo do fundo de chuva, pico limitado. Preservada sem normalização de loudness. |
| Trilhos / Journey | `train-track.wav`; gryc CC BY 3.0 + articulação original | Peaceful Journey 45% | **0,03547 / 48 s** | 100–1400 Hz e pares arredondados das juntas; aumenta informação rítmica sem elevar o teto. Antes RMS 0,04496 a 35%: a contribuição média final do preset permanece próxima. |
| Rodas / Journey | `train-wheels.wav`; mesma gravação CC BY + síntese original | Peaceful Journey 22% | **0,03543 / 48 s** | 380–2100 Hz e articulação mais leve; evita duplicar o perfil largo anterior. Ataques suaves, sem metal agudo exposto. |
| Interior do vagão / Journey | `carriage.wav`; mesma gravação CC BY 3.0 | Peaceful Journey 16% | **0,04800 / 48 s** | Corpo de 45–260 Hz e oscilação lenta; presente como apoio contínuo no preset, sem efeito de motor industrial acrescentado. |
| Café na Cozinha / Kitchen | Composição/síntese original local; arquivo e métricas próprios em `public/assets/audio/CAFE-NA-COZINHA.md` | Cozy Kitchen 30%; master e mute compartilhados | Ver documentação musical | Melodia, harmonia e acompanhamento dedicados; camada específica da cozinha, independente do Pomodoro e dos efeitos. Aprovação artística por escuta pendente. |
| Conclusão / Kitchen | Síntese original finita; sino harmônico de 1,6 s | Camada Sons da cozinha + opção contextual | 0,02393; pico 0,13710 | Sinal único delicado; bordas em zero. Não fica enfileirado para tocar depois de mute. |
| Chaleira / Kitchen | Síntese original finita, ruído filtrado e tom suave; 1,8 s | Mesma camada de efeitos + opção contextual | 0,02065; pico 0,09617 | Curto e contextual. Preservado; percepção de chaleira pendente. |
| Utensílio / Kitchen | Síntese original finita, duas ressonâncias amortecidas; 0,45 s | Mesma camada de efeitos + opção contextual | 0,01662; pico 0,10406 | Toque discreto, bordas suaves. Preservado. |
| Cozimento / Kitchen | Síntese original finita, ruído suave e corpo grave; 2,4 s | Mesma camada de efeitos + opção contextual | 0,00964; pico 0,04936 | Complementar; não deve ter o mesmo nível médio da música. Preservado. |
| Companheiro / demais ambientes | Nenhuma fonte sonora própria implementada | — | — | Não foram inventados ronronados/miados. Os efeitos presentes são da cozinha e compartilham o motor. |
| Interface / demais ações | Sem alerta sonoro global adicional | — | — | Nenhum beep ou notificação insistente foi acrescentado. |

As atribuições completas, links e licenças já distribuídas permanecem em `public/assets/audio/README.md`, `public/licenses/Audio-CREDITS.txt`, `Audio-CC0-1.0.txt` e `Audio-CC-BY-3.0.txt`. Nenhuma fonte de terceiros foi obtida nesta revisão. Foram reutilizados os originais locais cujo histórico de procedência já constava do projeto; não houve nova verificação online de licenças. A síntese de juntas ferroviárias e o arranjo de folhas são trabalho original do Little Haven sobre essas fontes licenciadas. A licença do código permanece `UNLICENSED`.

## Folhas: intervenção e medidas

O arranjo usa `rustle01–20.flac`. Fragmentos de aproximadamente 0,35–0,75 s são sobrepostos em posições, velocidades e intensidades variadas. Três envelopes lentos descrevem rajadas; contatos isolados de crest excessivo são excluídos, sem cortar picos das amostras. Cada gesto recebe somente ganho linear antes da soma. Dois estágios suaves na fonte e um passa-baixas de saída a 2,6 kHz contêm aspereza dos foleys secos e da transposição.

O RMS efetivo subiu **11,6 dB**, de 0,00661 para 0,02513, enquanto o pico **caiu** de 0,240 para 0,235 e o crest passou de 31,19 para 19,42 dB. A maior variação entre amostras caiu de 0,2503 para 0,0720. Quase silêncio em janelas de 100 ms caiu de 90,4% para 0,8%. Isso corrige a densidade e a distribuição do movimento; não é um aumento global de volume.

Não se declara que foley de folhas secas seja uma gravação externa de árvores. É um arranjo artesanal de movimentos reais de folhas; o timbre deve ser aprovado por escuta em contexto.

## Trem: intervenção e continuidade

Uma base da gravação real, entre 4 e 21 s, é sobreposta internamente em ciclos de 16 s. O arranjo de 48 s acrescenta oscilação lenta e **40 pares de contatos**, com espaçamento aproximado de 1,2 s por par, 185 ms dentro do par e variação cíclica de até 75 ms. Os ataques de aproximadamente 11 ms, ressonâncias graves/médias amortecidas e caudas suaves evitam choques metálicos pontiagudos. O vagão mantém o corpo contínuo grave.

Os quatro novos WAVs ambientais têm 48,75 s PCM16 mono/32 kHz. Os últimos 750 ms são cópia exata do começo; o overlap existente do motor consome esse apêndice e resulta em **48 s exatos**, preservando a cadência. A diferença absoluta entre a última e primeira amostras preparadas é no máximo 0,000153. Não há fade periódico para silêncio. Os testes também comparam energia dos contatos com os intervalos para impedir que uma futura mudança torne o ritmo mascarado pelo rumble novamente.

Trocar paisagens ou entrar/sair da imersão usa as mesmas fontes; somente uma mudança real de camada causa fade/liberação. Não há reinício do trem por paisagem nem vínculo com a animação visual.

## Mixagens reais medidas

`node scripts/audit-audio.mjs` soma **120 s** por combinação, a 32 kHz, incluindo pelo menos duas passagens dos novos loops. Fontes começam alinhadas; o resultado é estado estável anterior aos fades. Sliders usam os presets atuais. Journey acrescenta chuva na janela a 35%. A saída detalhada fica em `outputs/audio-mix-audit.json`, não versionada. Os números são unidades lineares de full scale, separados como **pico / RMS**.

| Combinação | Master 25% (ganho 0,0625) | Master 50% (ganho 0,125) | Master 100% (ganho 0,25) |
| --- | --- | --- | --- |
| Room: chuva 40%, lareira 25%, vento 15% | 0,00739 / 0,00163 | 0,01478 / 0,00326 | 0,02956 / 0,00652 |
| Garden: folhas 42%, pássaros 38%, riacho 25%, vento 15% | 0,00887 / 0,00103 | 0,01774 / 0,00207 | 0,03549 / 0,00413 |
| Journey: trilhos 45%, rodas 22%, vagão 16%, vento 8%, chuva 35% | 0,01151 / 0,00213 | 0,02302 / 0,00426 | 0,04605 / 0,00851 |

Nenhuma dessas somas clipou. Um limite absoluto conservador com **13 camadas contínuas em pico 0,24**, mais **quatro efeitos simultâneos no teto 0,16 cada**, todos os sliders e master no máximo, resulta em **0,94**, abaixo de 1. Usando os picos efetivamente medidos dos efeitos, esse limite cai para **0,87668**. Não há compressor, limitador, normalização automática de loudness nem ducking agressivo. A margem matemática não certifica conforto auditivo ou volume seguro em um dispositivo concreto.

O master inicial preserva a política confortável existente, mas os níveis digitais são baixos; testadores devem comparar controles em fones e alto-falantes e informar o volume do sistema usado. Não foram elevadas indiscriminadamente as camadas existentes. O equilíbrio Garden/Journey foi ajustado por função e distribuição espectral/temporal.

## Música e integração da cozinha

A composição, renderização reproduzível, instrumentos, duração, formato, tamanho, pico, RMS e estratégia de loop são detalhados em **`public/assets/audio/CAFE-NA-COZINHA.md`**. O relatório final de integração e testes do motor/mixer consta em `VALIDATION.md`. A camada de música e a camada de efeitos têm controles independentes, pertencem ao mesmo master e não dependem do estado temporal da receita. O preset Cozy Kitchen não exige chuva.

## Arquivos desta revisão

As alterações anteriores do usuário foram preservadas. Este trabalho modificou somente as partes relacionadas ao áudio nos arquivos compartilhados abaixo; não criou commits ou publicou artefatos.

| Área | Criados | Modificados |
| --- | --- | --- |
| Motor e controles | — | `shared/audio.js`, `src/services/audio/{AudioEngine,AudioLayer,audioLibrary,audioPresets}.js`, `src/components/audio/{SoundMixer,SoundLayerControl}.jsx`, `src/components/Icon.jsx`, coordenação de áudio em `src/app/App.jsx`, schema de áudio em `electron/preload/index.cjs` |
| Recursos | `public/assets/audio/cafe-na-cozinha.ogg`, `cafe-na-cozinha.json`, `CAFE-NA-COZINHA.md`, `environment-audit.json` | `public/assets/audio/{leaves,train-track,train-wheels,carriage}.wav`, `manifest.json`, `README.md`, `public/licenses/Audio-CREDITS.txt` |
| Manutenção e validação | `scripts/{audio-metrics,audit-audio,compose-kitchen-music,refine-environment-audio,music-smoke}.mjs` | `scripts/prepare-audio.mjs`, expectativas de presets em `scripts/desktop-smoke-main.mjs` |
| Testes | `tests/{environment-audio-assets,kitchen-music,kitchen-score}.test.js`, `tests/e2e/kitchen-music.spec.js` | `tests/audio-mixer.test.js`, `tests/kitchen-effects.test.js`, `tests/e2e/{audio-mixer,garden-audio,kitchen-audio}.spec.js` |
| Documentação | `AUDIO_AUDIT.md` | `README.md`, `ROADMAP.md`, `VALIDATION.md` |

Os campos da cozinha, receitas, mensagens, cenários, dados pessoais e configurações de segurança do Electron não foram modificados nesta revisão. A nova música e a síntese ferroviária são trabalho original do projeto; as gravações-base mantêm CC0/CC BY 3.0 conforme os créditos. O relatório de validação distingue a cópia empacotada para teste da distribuição portátil anterior.

## Reproduzir e validar

- `node scripts/refine-environment-audio.mjs`: refaz apenas folhas e os três perfis do trem a partir de `work/audio-sources/`, sem rede; usa o decoder do Edge já empregado no projeto. O manifest registra hashes de todos os originais e resultados.
- `node scripts/prepare-audio.mjs`: refaz a biblioteca de gravações e finaliza com o refinamento atual. Não é requisito para executar o aplicativo, pois os WAVs já estão incluídos.
- `node scripts/audit-audio.mjs`: repete as medições de camadas, efeitos, três mixes e limite conservador; não toca som.
- `node --test tests/environment-audio-assets.test.js`: **3 testes passaram nesta etapa**, cobrindo hashes/procedência, apêndice idêntico, duração/energia/junção, teto/DC, densidade e dinâmica das folhas e presença energética dos pares ferroviários. Não avaliam reconhecimento humano.
- Validação integrada com `npm test`, build, e2e e desktop: resultados correntes documentados pelo trabalho de integração em `VALIDATION.md`; resultados antigos não são prova desta entrega.

Para a escuta manual, inicie áudio explicitamente, isole cada camada, compare Garden com folhas/pássaros/riacho e Journey com e sem chuva nas cinco paisagens. Repita em 25%, 50% e 100% de master, ajustando o volume físico gradualmente; observe duas junções de 48 s e sessões de 5–60 minutos. Compare folhas com vento, chuva e riacho para julgar distinção. Verifique a música sozinha, junto dos efeitos, pausa/conclusão de receita, minimização, saída/retorno e nova abertura sem autoplay. Registre fones/caixas, volume e impressões. **Essas escutas ainda não foram realizadas por uma pessoa nesta revisão.**
