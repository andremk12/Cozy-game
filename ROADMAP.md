# Roadmap — Little Haven

O desenvolvimento avança por pequenas experiências completas, preservando o funcionamento local, a privacidade, a estética cozy e a ausência de cobranças. A Fase 1, The Garden e a expansão interativa de The Journey estão implementadas. A numeração registra a organização original do roadmap, sem exigir uma ordem de entrega.

## Fase 1 — Fundação, quarto interativo e ritual dos pensamentos — implementada

- Base React, Vite e Electron com comunicação isolada e validada.
- Quarto original em pixel art, luminária e chuva interativas.
- Caderno, proteção do rascunho e ritual do papel que vira barquinho.
- Preferências locais, áudio procedural suave e alternativa com movimento reduzido.
- Testes, documentação e configuração inicial de distribuição Windows.

## Fase 2 — Jardim interativo e cuidados com plantas — implementada

- Jardim SVG original de 480 × 270 com quatro canteiros, quatro vasos e lago.
- Margarida, lavanda, hibisco rosa, samambaia e suculenta com quatro estágios e crescimento aos 2/8/20 minutos, incluindo tempo fechado.
- Regador animado, bônus de cuidado limitado por estágio, troca de vasos e estilos de terracota/madeira.
- Banco, lanternas, pedras e cogumelos em pontos compatíveis, sem economia ou bloqueios.
- Borboletas, vagalumes, peixes e gato laranja que espia entre arbustos e reage ao toque/teclado.
- Dia, pôr do sol, noite e chuva opcional; integração com os perfis Morning Garden/Quiet Night do mixer local, com áudio explícito.
- Salvamento local versionado separado de preferências e pensamentos; modo imersivo reutilizado, teclado e movimento reduzido.
- Plantas nunca morrem ou regridem por ausência; sem prazos, contadores ou necessidade de visitas diárias.

Evoluções futuras: posicionamento livre, arrastar e soltar, transplante entre canteiros e vasos, pequeno terrário, mais espécies/decorações e deslocamentos do gato entre esconderijos. A primeira versão mantém os quatro canteiros fixos e move vasos por seleção e destino.

## Fase 3 — Viagem de trem e cenários contemplativos — expansão interativa implementada

Entregue nesta versão:

- Vagão acolhedor em SVG original de 480 × 270 e paisagens com parallax horizontal em loop.
- Seleção entre noite chuvosa, floresta, pôr do sol, Snowy Mountains e Morning Lake; chuva opcional na paisagem noturna.
- Montanhas nevadas com pinheiros e neve lenta; lago ao amanhecer com reflexos, névoa e pássaros, usando arte SVG original e parallax.
- Luminária, cortinas e chá interativos; livro com quatro páginas e bilhete poético da paisagem, com teclado, foco e movimento reduzido.
- Modo imersivo mantém a mesma arte e objetos funcionais, com saída acessível; Esc fecha primeiro livro ou bilhete quando aberto.
- Pausa e retomada das animações, retorno ao quarto e cena estática com movimento reduzido.
- Paisagem, pausa e chuva mantidas apenas durante a sessão, inclusive ao trocar de ambiente; sem novas preferências persistentes.
- Peaceful Journey com camadas locais de trilhos/rodas e vento; chuva na janela acompanha a noite chuvosa fora de Custom.
- Viagem sem destino obrigatório, progressão, missões ou contagem de tempo.

Limites e evoluções planejadas:

- As cinco paisagens se repetem em loop; refinar transições e detalhes da ambientação.
- Ampliar as gravações de trem; as três camadas atuais são tratamentos da mesma gravação licenciada.
- Revisar a experiência em diferentes resoluções, escalas e computadores, preservando teclado e movimento reduzido.
- Manter o ritmo livre, sem obrigações ou punições pela ausência.

## Fase 4 — Personalização, ambientação expandida e melhorias visuais — parcial

- Decoração, vasos e iluminação entregues no jardim; ampliar escolhas para outros ambientes.
- **Áudio 2.0 e Cozy Sound Mixer implementados:** 12 camadas locais/procedurais, volumes independentes, master, mute, quatro presets completos e Custom persistente; navegação com fades e controle por M na imersão.
- Motor Web Audio único, gravações licenciadas carregadas sob demanda e preferências validadas sem ampliar permissões do Electron. Áudio sempre depende de gesto a cada abertura.
- **Little Companion implementado:** gatinho SVG original em Room/Garden/Journey, oito poses/comportamentos, carinho sem contadores, nome Unicode escolhido pelo usuário, renomeação, visibilidade e três pelagens locais. My Companion acessível por C na imersão; o ritual permanece sem o personagem.
- Companheiro sem fome, tarefas, recompensas ou penalidades. Percursos limitados às áreas seguras dos cenários; próxima evolução: mais trajetos/interações e sons opcionais licenciados pelo motor existente.
- Evolução: escuta em equipamentos reais, normalização perceptiva e mais gravações independentes, mantendo as atribuições e o funcionamento offline.
- Refinar arte, transições e pequenos sinais de vida.
- Evoluir as preferências sem introduzir armazenamento de pensamentos.

## Fase 5 — Polimento, otimização, acessibilidade e distribuição desktop — evolução contínua

- Revisar teclado, leitores de tela, contraste, foco e movimento reduzido.
- Medir desempenho e consumo de memória em diferentes computadores.
- Ampliar testes de regressão e validar resolução e escala do Windows.
- Consolidar empacotamento, integridade, assinatura e distribuição desktop.
- Manter todos os ambientes utilizáveis sem conexão com a internet.
