# Áudio do Little Haven — Cozy Sound Mixer

A biblioteca funciona offline. Chuva suave, chuva intensa, chuva na janela e vento
são síntese original do projeto. Pássaros, riacho, grilos, lareira, folhas e os três
perfis do trem usam gravações locais com procedência e licenças abaixo. Não há
streaming, microfone, telemetria ou download durante o uso.

## Procedência e atribuições

| Arquivos locais | Obra original e autor | Licença | Adaptação |
| --- | --- | --- | --- |
| `birds.wav` | [Ambient Bird Sounds — isaiah658](https://opengameart.org/content/ambient-bird-sounds) | CC0 1.0 | Trecho a partir de 2 s; redução a mono/32 kHz, filtro suave, remoção de DC e ganho limitado. |
| `fire.wav` | [Fireplace Sound loop — PagDev](https://opengameart.org/content/fireplace-sound-loop) | CC0 1.0 | Trecho a partir de 2 s; mono/32 kHz, filtro suave, remoção de DC e ganho limitado. |
| `stream.wav` | [Stream Sounds — kurt](https://opengameart.org/content/stream-sounds), arquivo `stream-waterfall/stream1.ogg` | CC BY 3.0 Unported | Trecho de 1 a 31 s; mono/32 kHz, filtro suave, remoção de DC e ganho limitado. |
| `crickets.wav` | [Crickets Ambient Noise - loopable — Wolfgang_ / Ted Kerr](https://opengameart.org/content/crickets-ambient-noise-loopable) | CC0 1.0 | Primeiros 11 s; mono/32 kHz, filtro suave, remoção de DC e ganho limitado. |
| `train-track.wav`, `train-wheels.wav`, `carriage.wav` | [Background Rumble Noise — gryc](https://opengameart.org/content/background-rumble-noise) | CC BY 3.0 Unported | Trecho de 4 a 25 s da mesma gravação real de uma viagem de trem; perfis filtrados descritos abaixo, mono/32 kHz, remoção de DC e ganho limitado. |
| `leaves.wav` | [20 Rustles of dry leaves — qubodup](https://opengameart.org/content/20-rustles-dry-leaves) | CC0 1.0 | Foley de folhas secas gravado pelo autor na cozinha. Montagem de `rustle02/05/09/12.flac` com envelopes suaves e intervalos, filtro e ganho limitado; não é uma gravação de árvores ao vento. |

**Crédito CC BY obrigatório ao redistribuir:** “Stream Sounds”, por kurt, e
“Background Rumble Noise”, por gryc, disponíveis no OpenGameArt sob Creative Commons
Attribution 3.0 Unported. Adaptados para Little Haven conforme descrito nesta página.
Os autores não endossam este aplicativo. Preserve os links das obras e os avisos.

Os três controles do trem destacam regiões diferentes da **mesma gravação de
interior**, e não representam três gravações isoladas: trilhos usa 70–3000 Hz;
rodas usa 550–5000 Hz; vagão tem passa-baixas de 320 Hz. Os controles e ganhos são
independentes, mas outras partes do trem continuam audíveis em cada perfil.

Textos oficiais completos distribuídos com o aplicativo:

- [`Audio-CC0-1.0.txt`](../../licenses/Audio-CC0-1.0.txt) — [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).
- [`Audio-CC-BY-3.0.txt`](../../licenses/Audio-CC-BY-3.0.txt) — [CC BY 3.0 Unported](https://creativecommons.org/licenses/by/3.0/).
- [`Audio-CREDITS.txt`](../../licenses/Audio-CREDITS.txt) — créditos em texto simples para redistribuição.

Consulta das páginas originais e obtenção dos arquivos: **29 de outubro de 2026**.
A dedicatória/licença de cada arquivo foi conferida na página do próprio upload.
O projeto continua `UNLICENSED`; as licenças acima se aplicam somente aos recursos
identificados, sem alterar a licença do código.

## Reprodução e recursos

`src/services/audio/AudioEngine.js` possui um único AudioContext compartilhado.
Construir o serviço, restaurar preferências, selecionar camadas ou abrir o painel
não autoriza reprodução. `start()` é acionado somente pelo controle explícito de
áudio; uma nova abertura exige nova ação, mesmo com preferências restauradas.

Cada camada tem ganho independente e passa pelo volume master, limitado a 0.25.
O preparo do motor faz overlap de 750 ms no encontro do final/início, sem uma pausa
periódica até silêncio, e limita cada buffer a pico absoluto de 0.24. Fades finitos
chegam a zero real. Fontes desativadas são liberadas após o fade; `dispose()` para
as fontes, desconecta nós e fecha o contexto. O mute preserva os volumes.

As gravações são WAV PCM mono, 16 bits, 32 kHz, cerca de 12 MB no total. Cada gravação
é importada sob demanda como módulo local pelo plugin de build
`scripts/local-audio-plugin.mjs`; não há fetch remoto nem ampliação da CSP.
O custo de módulos codificados e buffers decodificados é maior que o tamanho WAV;
a escolha favorece compatibilidade offline com as restrições atuais do desktop.

Os picos e RMS técnicos não equivalem a loudness perceptivo. A avaliação subjetiva
em fones, caixas e longas sessões continua necessária, incluindo naturalidade das
junções, equilíbrio entre camadas e repetição dos grilos de 11 segundos.

## Reprodução do preparo dos recursos

O aplicativo já inclui os WAVs finais; este procedimento opcional é somente para
manutenção, sem adicionar dependências. Baixe os originais abaixo para
`work/audio-sources/` com os nomes indicados, extraia os dois arquivos compactados
para essa pasta e execute `node scripts/prepare-audio.mjs`.

| Nome esperado | Download original |
| --- | --- |
| `birds.ogg` | https://opengameart.org/sites/default/files/birds-isaiah658_0.ogg |
| `fire.wav` | https://opengameart.org/sites/default/files/fire.wav |
| `train.ogg` | https://opengameart.org/sites/default/files/background_ambience.ogg |
| `crickets.mp3` | https://opengameart.org/sites/default/files/crickets_1.mp3 |
| `stream.zip` | https://opengameart.org/sites/default/files/stream-waterfall.zip |
| `leaves.7z` | https://opengameart.org/sites/default/files/qubodup-rustle.7z |

O script usa o decoder do Edge instalado via Playwright, renderiza offline os
filtros, grava PCM e gera `manifest.json` com SHA-256 de cada original utilizado e
de cada WAV final, duração, pico, RMS e parâmetros. Não reproduz som, não envia
arquivos à rede e não altera preferências. A decodificação pode apresentar pequenas
diferenças entre versões de navegador; o manifest entregue identifica este preparo.
Os originais temporários em `work/` não são empacotados nem versionados.
