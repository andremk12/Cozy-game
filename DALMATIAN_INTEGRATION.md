# Dálmata — integração ao companheiro

Integração de 7 de novembro de 2026 no repositório `joguinho/Cozy-game` (Little Haven / Cozy Chilling). Para selecionar, abra **My Companion → Seu companheiro → Dálmata**. A seleção, o nome e a visibilidade usam as preferências locais existentes. Voltar a **Gatinho** recupera a pelagem anteriormente escolhida.

O dálmata participa dos quatro ambientes que já recebem o companheiro: **The Room**, **The Garden**, **The Journey** e **The Cozy Kitchen**. Ele não foi acrescentado ao Let It Float ou ao mural. O gato escondido nos arbustos do jardim continua sendo um elemento independente.

## Arquivos e carregamento

- `shared/pets.js`: cadastro de espécies, nomes e identificadores `cat`/`dalmatian`.
- `shared/companion.js`: preferência `companion.petId`, validação e migração de configurações antigas para `cat`. A validação equivalente no preload continua limitada aos identificadores conhecidos.
- `src/components/companion/CompanionPanel.jsx`: seleção acessível e retrato estático da folha aprovada; mantém as três pelagens do gato.
- `src/services/petAnimations.js`: importa o manifesto no build, monta `SPRITE_PETS`, calcula os frames por duração e adapta as transições aos comportamentos existentes.
- `src/components/companion/SpriteSheet.jsx`: recorta uma célula da folha com SVG e usa a âncora declarada no manifesto. `AnimatedPetSprite.jsx` controla o relógio dos frames e sua pausa.
- `src/hooks/useCompanion.js` e `src/components/companion/Companion.jsx`: continuam responsáveis pelo comportamento, deslocamento, interação, pausa e posicionamento do companheiro; selecionam o renderer apropriado.
- `src/components/companion/CompanionPanel.css`: estilos do seletor e dimensionamento do retrato sem alterar o tamanho da célula interna.
- `electron/preload/index.cjs`: aceita somente `cat`/`dalmatian` no novo campo, mantendo a validação estrita e a ponte existente.

Cobertura em `tests/dalmatian-assets.test.js`, `tests/pet-animations.test.js`, `tests/companion-preferences.test.js` e `tests/e2e/dalmatian.spec.js`. O smoke existente, `scripts/desktop-smoke-main.mjs`, também seleciona o dálmata, verifica os sete PNGs via `file:`, persistência pelo IPC e restauração após recarga. `README.md` orienta o uso e `VALIDATION.md` registra os resultados e limites atuais.

As sete folhas permanecem intactas em `public/assets/pets/dalmatian/animations/`. O Vite copia esses arquivos para `dist/assets/pets/dalmatian/`; os URLs usam `import.meta.env.BASE_URL`, compatível com o build local do Electron. Não há download ou serviço externo. O empacotamento já inclui `dist/**/*`.

O [manifesto](public/assets/pets/dalmatian/animation-manifest.json) e o [README original dos assets](public/assets/pets/dalmatian/README.md) foram preservados como registro da entrega anterior. Seus campos e trechos “ainda não integrado” descrevem aquela entrega; este documento descreve a conexão atual ao jogo. O manifesto continua sendo a fonte técnica de dimensões, ordem, tempos, âncoras e hashes.

## Animações e estados

Todas as células têm **64 × 64 pixels**, uma linha horizontal, transparência e âncora de pés **(32, 55)**. A renderização usa escala lógica **1**, mantém o canvas completo, aplica `image-rendering: pixelated` e não acrescenta respiração, acessórios ou efeitos SVG aos movimentos já desenhados.

| Estado do asset | Frames | Folha | Duração do ciclo | Uso no jogo |
| --- | ---: | --- | ---: | --- |
| `seated_idle` | 4 | 256 × 64 | 5.400 ms | Descanso sentado; loop |
| `stand_up` | 7 | 448 × 64 | 1.420 ms | Levanta antes de caminhar; uma execução |
| `walk` | 4 | 256 × 64 | 800 ms | Loop durante o deslocamento |
| `lie_down` | 6 | 384 × 64 | 1.600 ms | Transição para dormir; uma execução |
| `sleep` | 4 | 256 × 64 | 6.500 ms | Loop de sono, incluindo o “zzz” original |
| `wake_up` | 7 | 448 × 64 | 2.360 ms | Acorda e termina sentado; uma execução |
| `cook` | 8 | 512 × 64 | 2.800 ms | Loop ao mexer massa na estação de preparo |

Os tempos individuais vêm de `durationsMs`; não se impõe um FPS uniforme. `frameOrder` conserva as repetições intencionais A–B–C–B. As transições mantêm seu último quadro até a próxima etapa, sem repetir o clipe inteiro.

As sequências principais são `seated_idle → lie_down → sleep → wake_up → seated_idle` e `seated_idle → stand_up → walk`. O controlador espera os pontos de ligação declarados no manifesto: idle 3 antes de deitar, sleep 3 antes de acordar e idle 0 antes de levantar. Acordar termina sentado; uma caminhada posterior passa por `stand_up`. O deslocamento usa as rotas e os tempos do comportamento existente, separado da cadência do bitmap.

Na cozinha, `cook` exige `kitchenPhase === 'acting'` e `action === 'mixing'`: começa na estação, acompanha a ação real e deixa de ser usado quando ela muda. A pausa da receita pausa a imagem. Chapéu, avental, tigela e colher vêm do PNG. A integração não altera duração de receitas, progresso ou persistência do Pomodoro.

Mudanças de destino durante uma transição substituem a fila antiga e respeitam o término da transição em andamento. Carinho usa a resposta acessível existente e preserva a pose; o estado interrompido pode continuar. Trocar de espécie reinicia apenas o companheiro renderizado. Painéis abertos, foco/hover, ocultação e movimento reduzido respeitam as pausas do sistema existente.

## Limitações artísticas atuais

- A caminhada aprovada olha para a direita. Orelhas e manchas são assimétricas e o manifesto proíbe espelhamento automático. Trajetos à esquerda conservam essa orientação; uma caminhada esquerda precisa de arte aprovada própria.
- Não há clipe para sentar depois de caminhar ou sair da cozinha: o retorno usa a pose sentada disponível. Não se reproduz `stand_up` ao contrário.
- Não há folhas próprias de carinho, alongamento, observação ou salto. Carinho conserva o quadro atual; as demais poses usam o repouso disponível, e saltos já existentes usam um quadro estático durante o deslocamento.
- `cook` representa **mexer massa**. Leitura, mexer outras receitas, forno, decoração e apresentação continuam funcionando no sistema culinário, mas usam o dálmata sentado enquanto não houver arte dessas ações. Não existe uma animação canina de comemoração dedicada.
- A escala, a área clicável e a âncora do balão são escolhas desta integração; outro personagem exige revisão visual nos cenários. O seletor não é um importador de arquivos fornecidos pelo usuário.

Essas lacunas devem ser tratadas em uma futura entrega artística, sem modificar os PNGs aprovados para contorná-las.

## Cadastrar o próximo pet

1. Coloque PNGs, atlas, manifesto e documentação próprios em `public/assets/pets/<id>/`, conservando os arquivos aprovados. Confira dimensões, ordem, duração, transparência e pivô reais.
2. Adicione o identificador e os nomes a `PETS` em `shared/pets.js`. Atualize a lista equivalente de IDs aceitos pelo preload; preserve a rejeição de campos e caminhos arbitrários.
3. Importe o manifesto em `src/services/petAnimations.js` e crie a definição em `SPRITE_PETS` com `assetBase`, `scale` e `animations` indexadas por `stateId`. O adaptador atual espera os sete estados acima e folhas sem trim ou rotação. Estados diferentes exigem um mapeamento explícito e testes; não basta renomear uma folha incompatível.
4. Revise o retrato, os pés, o alvo de carinho, o balão e a passagem pelos objetos nos quatro ambientes. Preserve a identidade e a lógica dos pets existentes.
5. Acrescente testes de integridade e de transições para os novos assets, persistência/IPC do ID e seleção/renderização no navegador e Electron. Execute `npm test`, `npm run build`, `npm run test:e2e` e o smoke desktop pertinente.

Os resultados realmente executados nesta integração ficam em `VALIDATION.md`; este documento não substitui a validação visual de novas artes.
