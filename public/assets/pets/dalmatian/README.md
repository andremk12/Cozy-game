# Dálmata — assets preparados para integração

Personagem: **Dálmata**. Projeto de arte: **Cozy Chilling**. Origem: **PixelArtStudio**. Entrega inicial: **06/11/2026**; atualização com stand-up: **07/11/2026**, America/Sao_Paulo. Status: **assets preparados para integração futura**. O personagem ainda não está conectado ao jogo.

## Localização e escopo

Esta pasta fica em `joguinho/Cozy-game/public/assets/pets/dalmatian/`, seguindo a convenção existente de arquivos estáticos em `public/assets/`. O caminho informado `joguinho` é o diretório pai; o repositório Git é `Cozy-game`. Seu README/package.json usam atualmente o nome Little Haven, e os sistemas de companheiro/cozinha correspondem às referências de Cozy Chilling.

Foram preparados sete PNGs e sete atlas JSON, preservando os nomes e bytes das exportações. [animation-manifest.json](animation-manifest.json) consolida tempos, sequência, loops, transições, âncoras, proveniência e SHA-256. É documentação: nenhum import, componente, controlador ou configuração foi conectado a ele.

## Inventário

Todos os frames têm **64×64 px**, pixels quadrados, escala de arte 1:1, fundo transparente e seis cores. Cada folha tem **uma linha**, tantas colunas quanto frames e ordem temporal **da esquerda para a direita**. Índices do manifesto começam em zero. Sem margem, espaçamento, trim ou rotação.

| Animação / estado | Arquivos em animations/ | Frames | Folha (px) | Durações individuais (ms) | Total (ms) | Reprodução |
|---|---|---:|---|---|---:|---|
| Sentado / Idle (seated_idle) | [dalmatian_idle_sheet.png](animations/dalmatian_idle_sheet.png) / [JSON](animations/dalmatian_idle_sheet.json) | 4 | 256×64 | 1800 / 900 / 1800 / 900 | 5400 | Loop |
| Levantando (stand_up) | [dalmatian_stand_up_sheet.png](animations/dalmatian_stand_up_sheet.png) / [JSON](animations/dalmatian_stand_up_sheet.json) | 7 | 448×64 | 300 / 160 / 160 / 180 / 180 / 180 / 260 | 1420 | Única |
| Andando (walk) | [dalmatian_walk_sheet.png](animations/dalmatian_walk_sheet.png) / [JSON](animations/dalmatian_walk_sheet.json) | 4 | 256×64 | 220 / 180 / 220 / 180 | 800 | Loop |
| Deitando (lie_down) | [dalmatian_lie_down_sheet.png](animations/dalmatian_lie_down_sheet.png) / [JSON](animations/dalmatian_lie_down_sheet.json) | 6 | 384×64 | 240 / 180 / 190 / 210 / 240 / 540 | 1600 | Única |
| Dormindo (sleep) | [dalmatian_sleep_sheet.png](animations/dalmatian_sleep_sheet.png) / [JSON](animations/dalmatian_sleep_sheet.json) | 4 | 256×64 | 2200 / 1050 / 2200 / 1050 | 6500 | Loop |
| Acordando (wake_up) | [dalmatian_wake_up_sheet.png](animations/dalmatian_wake_up_sheet.png) / [JSON](animations/dalmatian_wake_up_sheet.json) | 7 | 448×64 | 420 / 320 / 280 / 260 / 260 / 300 / 520 | 2360 | Única |
| Cozinhando (cook) | [dalmatian_cook_sheet.png](animations/dalmatian_cook_sheet.png) / [JSON](animations/dalmatian_cook_sheet.json) | 8 | 512×64 | 400 / 300 / 400 / 300 / 400 / 300 / 400 / 300 | 2800 | Loop |

A ligação `idle frame 0 → stand_up frame 0` e a ligação `stand_up frame 6 → walk frame 0` foram conferidas pixel a pixel: zero diferenças. Ao encadear clipes completos, os holds das poses coincidentes se somam; considerar essa pausa no futuro controlador. A cauda fica oculta durante o giro e reaparece gradualmente.

O fonte da caminhada tem 16 frames, mas são quatro voltas das mesmas quatro poses: a folha tem somente **4 células** e o ciclo dura **800 ms**. Usar a tag `walk`; `walk_extended` no atlas também foi limitado aos índices 0–3. No idle e sono, a pose intermediária se repete intencionalmente (A-B-C-B).

## Comportamentos previstos e pendências

- **Idle / seated_idle:** sentado em descanso, com respiração discreta. O `idle` atual do gato é em pé; o equivalente conceitual deste asset é `sitting`.
- **Stand-up / stand_up:** **finalizada e transferida em 07/11/2026**. Sete frames, 1.420 ms, execução única. Começa no frame 0 de `seated_idle` e termina em uma pose idêntica ao frame 0 de `walk`. Executar 0→6, sem ping-pong. O novo fonte é `projects/cozy-chilling/source/dalmatian_stand_up.aseprite`; o piloto original foi preservado como histórico.
- **Walk:** caminhada no lugar voltada para a direita; o deslocamento no cenário pertence ao jogo.
- **Lie-down:** executar uma vez após o frame 3 de `seated_idle`, terminando em `sleep` frame 0.
- **Sleep:** descanso com respiração e balão “zzz” já desenhado na folha. Repete; o efeito aparece e desaparece junto da troca de estado.
- **Wake-up:** executar uma vez após `sleep` frame 3, terminando em `seated_idle` frame 0. Acordar termina sentado; para sair andando, encadear `seated_idle → stand_up → walk`.
- **Cook:** mexer massa, com chapéu, avental, tigela e colher incorporados. O loop dura 2.800 ms; a referência de três voltas soma 8.400 ms, mas a repetição futura depende da interação. Não cobre todas as ações culinárias do jogo.

As referências de correspondência entre sleep e suas transições são válidas para **o personagem**. A revisão atual acrescentou `FX_Sono_ZZZ`, ausente em deitando/acordando. A ficha antiga de wake-up afirmava igualdade da imagem completa antes desse efeito; o manifesto desta entrega registra a diferença. Não interromper o sono em qualquer fase supondo uma ligação idêntica: os pontos acima são os documentados.

Permanecem pendentes a revisão da escala e oclusão no cenário, a definição de outras direções sem espelhamento indevido, as transições de cozinha e a cobertura das poses atuais sem arte canina (por exemplo, carinho/alongamento). Nada disso foi implementado ou criado nesta etapa.

## Seleção e rastreabilidade

As fichas atuais identificam os sete assets como prontos para importação. Stand-up foi finalizada nesta atualização com inspeção visual e comparação técnica das poses de ligação. A seleção acompanha essas entregas e suas revisões documentadas; esta transferência não equivale a uma nova aprovação artística nem a um teste no cenário. A revisão de caminhada com orelhas é a atual; v02 é anterior. Sono usa a versão com zzz e cozinha usa a versão com figurino.

Os fontes oficiais ficam em `PixelArtStudio/projects/cozy-chilling/source/dalmatian_<acao>.aseprite`; as exportações originais ficam em `PixelArtStudio/projects/cozy-chilling/exports/`. No manifesto, os caminhos de proveniência são relativos à raiz do PixelArtStudio e os caminhos das animações são relativos a esta pasta.

Não foram incluídos GIFs, referências, pilotos, backups, drafts ou editáveis. A cópia `dalmatian_walk_ears_review_v03.aseprite` é idêntica por SHA-256 ao fonte oficial da caminhada. Os PNGs estáticos `dalmata_base_sentado_v01.png` e `dalmata_animacao_preparo_v01.png` também são idênticos entre si, mas não representam animações adicionais. Backups `before_zzz` e `before_costume` foram excluídos.

Os seis manifestos originais `.animation.json` permanecem na origem: suas políticas foram consolidadas neste manifesto, evitando trazer caminhos antigos para GIFs/fontes que não integram o pacote. Os sete atlas JSON foram copiados integralmente e continuam referenciando o PNG vizinho pelo mesmo nome. Campos `frames[].filename` do Aseprite são rótulos de frame, não dependências de arquivos locais.

## Pontos de integração futura — somente identificação

Os caminhos abaixo são relativos à raiz de `Cozy-game`. Foram consultados e não alterados nesta entrega.

| Arquivo/sistema | Responsabilidade e cuidado futuro |
|---|---|
| `src/components/companion/CompanionSprite.jsx` | Desenho atual do gato em SVG e ChefAccessories; futuro ponto de seleção do desenho do pet. |
| `src/components/companion/Companion.jsx` | Posição, deslocamento, espelhamento, interação, área clicável e âncora de conteúdo; espelhamento automático exige revisão para o dálmata. |
| `src/hooks/useCompanion.js` | Temporizadores, estados, pausas por visibilidade, movimento reduzido e contexto da cozinha. |
| `src/services/companionBehaviors.js` | Poses, rotas, mudanças de estado, carinho e escolha das ações culinárias; o tempo de permanência em estado é separado do tempo dos frames. |
| `src/services/kitchenCompanionMotion.js` | Percursos e fases de movimento na cozinha, posição dos pés e âncora da cabeça. |
| `src/components/companion/Companion.css` | Ciclos CSS atuais de respiração, patas e cauda; evitar sobrepor ao movimento já desenhado nas folhas. |
| `src/scenes/Kitchen/KitchenScene.jsx` | Composição SVG da cozinha 480×270, posição/oclusão do companheiro e objetos. |
| `src/scenes/Kitchen/Kitchen.jsx` | Contexto da receita, sessão, apresentação e conteúdo ancorado ao personagem. |
| `src/hooks/useKitchen.js` | Estado e comandos da sessão culinária; fornece contexto, não a cadência dos frames. |
| `src/components/ImmersiveViewport/fitPixelArt.js` | Ajuste da grade lógica à tela considerando pixels físicos. |
| `src/components/companion/CompanionPanel.jsx` | Painel existente de nome, visibilidade e aparência do gato; ainda não é um seletor de espécies. |
| `src/services/preferences.js` | Persistência e validação das preferências locais existentes. |

O gatinho de `src/scenes/Garden/GardenCat.jsx` é outro elemento da cena, separado do companheiro compartilhado; não deve ser substituído por consequência desta preparação. Os estados de arte deste pacote ainda não são um sistema novo de personagens nem uma configuração de seleção de pets.

## Cuidados técnicos

- Respeitar cada duração individual em milissegundos. Não impor FPS uniforme nem ping-pong. Loops: idle, walk, sleep, cook. Transições: stand-up, lie-down e wake-up, uma execução e troca de estado ao concluir; manter o último frame até a troca se necessário.
- O pivô **(32,55)** é fixo, medido desde o canto superior esquerdo de cada célula. Em escala `s`, posicionar a imagem em `posiçãoDosPés - (32,55) × s`. Não centralizar a caixa opaca de cada pose. A caminhada tem apoio visível em y=54 e mantém o mesmo pivô documentado.
- Os cenários usam grade lógica 480×270; o dálmata é maior que o gato atual. A escala de renderização no jogo está **pendente**. Manter os arquivos 1:1 e avaliar cama, assento, bancada, área clicável e balões durante a integração.
- Renderizar com vizinho mais próximo e `image-rendering: pixelated` quando aplicável; sem filtros, blur ou suavização. Preferir alinhamento em pixels físicos e escala inteira compatível com o viewport. Não redimensionar os arquivos.
- Manter a paleta aprovada de seis cores e a transparência binária (alpha 0/255). Não recolorir automaticamente para a paleta-base mais recente do BRIEF.
- Orelhas e manchas são assimétricas: não usar automaticamente o `scale(-1 1)` atual para gerar a direção oposta.
- Não duplicar respiração/patas via CSS nem zzz, roupas ou utensílios via SVG. A tigela ocupa x=38–58 e y=44–54 dentro do frame; conferir oclusão sem recortar o canvas.
- Preservar pausa, movimento reduzido, teclado, interação e separação entre deslocamento e ciclo corporal ao implementar futuramente.

Para outros pets, reutilizar a organização `public/assets/pets/<pet-id>/animations/` com README e manifesto próprios. Copiar os metadados reais de cada personagem; não presumir a mesma resolução, âncora ou quantidade de frames.

## Verificação da entrega

Os PNGs foram decodificados com verificação de CRC, dimensões, transparência, paleta e comparação pixel a pixel com os fontes. Os tempos do atlas foram comparados à timeline Aseprite, incluindo as quatro repetições da caminhada. As sete folhas foram inspecionadas visualmente. Os checksums dos originais constam no manifesto.

As evidências de inventário, duplicatas, hashes anteriores, plano de cópia e validação após transferência ficam em `PixelArtStudio/projects/cozy-chilling/deliveries/dalmatian-2026-11-06/`. A verificação de Git distingue as adições desta entrega das alterações que já existiam no repositório. Não foram solicitados builds, instalações, testes do jogo ou commits.

A atualização de stand-up possui evidências adicionais em `PixelArtStudio/projects/cozy-chilling/source/dalmatian_stand_up_work/` e a ficha `source/dalmatian_stand_up.md`. A auditoria da entrega inicial continua como registro histórico de seis animações; a atualização acrescenta a sétima. Foram adicionados somente o PNG e o atlas de stand-up e atualizados este README e o manifesto; os outros assets e o código permanecem preservados. O fonte e a prévia GIF de stand-up ficaram no PixelArtStudio.
