# Café na Cozinha

Faixa instrumental original composta e sintetizada para Little Haven. Não usa
gravações, samples, soundfonts, melodias ou arranjos de terceiros. Não é uma música
comercial adaptada. A partitura de eventos e os timbres estão integralmente em
`scripts/compose-kitchen-music.mjs`.

## Forma musical

São **64 compassos, 4/4, 80 BPM, 3 minutos e 12 segundos**. O centro tonal é Fá maior,
com acordes maiores com nona, menores com sétima/nona e dominantes suaves. Cinco
frases de oito compassos têm notas, durações e pausas escritas; oito seções alteram
densidade, acompanhamento, respostas e instrumentação. O retorno do tema conserva
o motivo com variações. A melodia não é um arpejo aleatório curto.

| Compassos | Seção | Papel |
| --- | --- | --- |
| 1–8 | Janela da manhã | Introdução espaçada de teclado e baixo |
| 9–16 | Café na mesa | Tema principal com cordas e percussão suave |
| 17–24 | Uma conversa sem palavras | Resposta melódica em registro mais alto |
| 25–32 | Luz na bancada | Ponte harmônica e outra frase |
| 33–40 | O perfume do café | Desenvolvimento do tema da ponte |
| 41–48 | De volta à mesa | Retorno variado do tema principal |
| 49–56 | Um pouco de silêncio | Respiro, menos notas e sem percussão |
| 57–64 | A manhã continua | Retorno delicado e dominante para o primeiro acorde |

O teclado combina fundamentais arredondadas, pares levemente desafinados e parciais
de decaimento diferente, com ataque e soltura macios. As cordas pinçadas usam
parciais com inarmonicidade discreta, decaimentos dependentes do harmônico e pequenos
atrasos entre notas do acorde. O baixo tem poucas parciais e articulação curta;
vassourinhas, aro de madeira e pulso grave ficam ao fundo. Reflexões curtas dão
largura estéreo. Não há voz, fala, compressão dinâmica ou limitador agressivo.

## Arquivo e repetição

`cafe-na-cozinha.ogg` usa **Ogg Opus estéreo**, taxa variável de aproximadamente
112 kbps, cerca de 3 MB. A síntese é feita a 24 kHz; Opus usa a grade temporal de
48 kHz. O manifesto `cafe-na-cozinha.json` registra o tamanho, SHA-256, duração
decodificada, pico de amostra, RMS, diferença entre canais, junção e partitura final.

A renderização é circular: notas e reflexões que ultrapassam o último compasso
continuam no início. Há 120 ms de pré-rolagem musical para aquecer o codec; o
`pre-skip` Ogg descarta essa preparação somente depois da decodificação. O granule
final elimina o preenchimento do encoder e mantém exatamente 192 segundos.
**Não aplicar o overlap ambiental de 750 ms** a esta faixa, pois isso removeria
parte do último compasso e prejudicaria o pulso. O `AudioBufferSourceNode` pode
repetir o buffer inteiro. O fade de entrada/saída da camada continua no motor.

O preparo aplica somente um ganho linear à faixa completa com alvo de pico 0,205,
deixando margem para a codificação. O script decodifica e mede o Ogg final; falha
se o pico exceder 0,24 ou se a duração se afastar da extensão musical esperada.
Essas são medições de amostra, não medições LUFS ou certificação de true peak.

## Origem, direitos e reprodução

Composição, síntese e empacotamento foram criados diretamente neste repositório
para o projeto. Não há material sonoro externo nem atribuição de samples a fazer.
O áudio é material original do Little Haven e segue as condições de distribuição
do projeto, atualmente `UNLICENSED`; este documento não concede uma nova licença
aberta nem altera as licenças das outras gravações do mixer.

Para reproduzir o preparo, com Node.js e as dependências de desenvolvimento já
instaladas, execute:

```powershell
node scripts/compose-kitchen-music.mjs
```

O script usa apenas Node.js e o Edge/Playwright já adotados pelo projeto. Um servidor
temporário ligado somente a `127.0.0.1` fornece exclusivamente o PCM sintético ao
encoder WebCodecs local; fecha ao terminar. Não há upload, download ou serviço de
IA de áudio. Não modifica preferências nem inicia reprodução nos alto-falantes.
Mudanças de versão do navegador/encoder podem mudar o SHA-256 do Ogg.

## Escuta pendente

O arquivo final foi decodificado e medido automaticamente. Não houve escuta humana
real neste ambiente. Naturalidade dos timbres, conforto em sessões de 5–60 minutos,
equilíbrio com chaleira/sino, junção percebida e adequação em fones e caixas comuns
precisam de avaliação humana. A composição e o arquivo existem integralmente;
aprovação musical subjetiva não é simulada por testes de software.
