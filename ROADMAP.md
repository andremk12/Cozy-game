# Roadmap — Little Haven

O desenvolvimento avança por pequenas experiências completas, preservando o funcionamento local, a privacidade, a estética cozy e a ausência de cobranças. A Fase 1, The Garden, a expansão interativa de The Journey e The Memory Corner estão implementadas. A numeração registra a organização original do roadmap, sem exigir uma ordem de entrega.

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
- Ampliar as gravações de trem; a revisão atual combina a gravação licenciada com articulação original das juntas e perfis complementares em ciclos de 48 segundos. Avaliação auditiva humana pendente.
- Revisar a experiência em diferentes resoluções, escalas e computadores, preservando teclado e movimento reduzido.
- Manter o ritmo livre, sem obrigações ou punições pela ausência.

## Fase 4 — Personalização, ambientação expandida e melhorias visuais — parcial

- Decoração, vasos e iluminação entregues no jardim; ampliar escolhas para outros ambientes.
- **Cozy Sound Mixer:** 13 fontes contínuas locais/procedurais, controle separado dos efeitos contextuais da cozinha, volumes independentes, master, mute, cinco presets e Custom persistente; navegação com fades e controle por M na imersão.
- Revisão sonora: folhas com montagem granular irregular de foley CC0; trem com articulação própria, texturas e grave complementares; presets Garden/Journey reequilibrados. Inventário e medições em `AUDIO_AUDIT.md`; escuta em dispositivos reais ainda necessária.
- Motor Web Audio único, gravações licenciadas carregadas sob demanda e preferências validadas sem ampliar permissões do Electron. Áudio sempre depende de gesto a cada abertura.
- **Little Companion implementado:** gatinho SVG original em Room/Garden/Journey, oito poses/comportamentos, carinho sem contadores, nome Unicode escolhido pelo usuário, renomeação, visibilidade e três pelagens locais. My Companion acessível por C na imersão; o ritual permanece sem o personagem.
- Companheiro sem fome, tarefas, recompensas ou penalidades. Percursos limitados às áreas seguras dos cenários; próxima evolução: mais trajetos/interações e sons opcionais licenciados pelo motor existente.
- Evolução: escuta em equipamentos reais, normalização perceptiva e mais gravações independentes, mantendo as atribuições e o funcionamento offline.
- Refinar arte, transições e pequenos sinais de vida.
- Evoluir as preferências sem introduzir armazenamento de pensamentos.

## Fase 5 — Polimento, otimização, acessibilidade e distribuição desktop — evolução contínua

- Primeira Beta experimental `0.2.0-beta.1`: carta do desenvolvedor acessível, contatos externos restritos, proteção contra instâncias concorrentes, dependências de segurança atualizadas e guia voluntário de testes. Resultados atuais e integridade do portátil em `VALIDATION.md`; recursos e limites em `BETA_NOTES.md`.

- Revisar teclado, leitores de tela, contraste, foco e movimento reduzido.
- Medir desempenho e consumo de memória em diferentes computadores.
- Ampliar testes de regressão e validar resolução e escala do Windows.
- Consolidar empacotamento, integridade, assinatura e distribuição desktop.
- Manter todos os ambientes utilizáveis sem conexão com a internet.

## The Cozy Kitchen — A Recipe for Focus — implementado

- Cozinha original SVG de 480 × 270 com fogão/forno, geladeira, bancada, livro, chaleira, relógio, plantas, iluminação e janela interativos.
- Sete receitas em português, de Chá Quentinho (5 minutos) a Bolo de Cenoura com Chocolate (60 minutos), e duração personalizada de 5 a 60 minutos. Os tempos representam foco, não instruções culinárias.
- Uma sessão por vez, pausa, retomada, encerramento antecipado e reinício explícito. Motor por tempo decorrido no processo principal, independente da cena, com reconciliação de suspensão e recuperação ao reabrir.
- Pratos e mensagens próprios para cada conclusão, apresentação única por sessão e resultado pendente quando a cozinha não está visível. Sem notificações, sequência automática, pontuação ou penalidades.
- Mesmo Little Companion com identidade/visibilidade preservadas, roupa de chef e ações culinárias. Bolo com seis etapas proporcionais ao progresso.
- Som de conclusão e efeitos procedurais originais opcionais pelo motor compartilhado, desligados inicialmente, respeitando gesto, master e mute, com controle de volume independente no mixer.
- **Café na Cozinha:** composição instrumental original estéreo de 3min12s/80 BPM em Ogg Opus local, teclado/cordas/baixo/percussão sintetizados, sem samples de terceiros. Camada própria e preset Cozy Kitchen sem chuva; mesma autorização de áudio, continuidade durante a receita/minimização e fade ao sair. Custom preservada; avaliação auditiva humana pendente.
- Documento local versionado separado, comandos IPC limitados, modo imersivo, teclado e movimento reduzido; texto de Let It Float continua privado e efêmero.
- Refinamento integrado: deslocamento por trajetos de piso com preparação/chegada antes das ações, falas e conclusão ancoradas à cabeça com escala de texto independente, livro fechado apoiado fora da pia e cardápio com fechamento sempre visível durante rolagem.

Limites e próximos refinamentos: escuta em diferentes dispositivos, revisão com leitores de tela e ensaios prolongados em GPUs/DPI distintos. Alterações do relógio enquanto o aplicativo está fechado e falhas abruptas de disco/sistema têm limites de recuperação documentados no README. Resultados realmente executados em `VALIDATION.md`.

## Little Bouquets — Flores para Você — implementado

- Expansão do catálogo do jardim com nove opções florais, mantendo plantas, quatro estágios e rega existentes. Disponibilidade vinculada às flores adultas, sem consumir recursos ou plantas.
- Ateliê acessível pela mesa do jardim, composição visual de até 12 hastes, remoção/reorganização por controles, cinco papéis, cinco laços e detalhes opcionais.
- Carta Unicode de até 1.000 caracteres, sugestões editáveis, papel próprio e assunto personalizável de até 120 caracteres com proteção contra injeção de cabeçalhos.
- Revisão antes de compartilhar, exportação PNG/HTML local, rascunho salvo somente por escolha explícita e destinatário nunca persistido. `mailto:` abre o cliente pessoal; o usuário anexa o arquivo e confirma o envio nele.
- SVG/CSS modulares, sem Aseprite nesta versão, aproveitando jardim, companheiro, áudio e imersão existentes. Sem integração automática com o mural ou com Let It Float.
- Próximos refinamentos: arte original mais elaborada, avaliação em diferentes DPI/leitores de tela e integração opcional ao mural. Envio intermediado depende de autorização e infraestrutura real conforme [BOUQUETS_DELIVERY_PLAN.md](BOUQUETS_DELIVERY_PLAN.md); permanece indisponível.

## The Memory Corner — A Place for What Matters — implementado

- Ambiente próprio com mural original em pixel art, três temas e decorações opcionais; fotografias e textos em DOM nativo nítido.
- Importação múltipla JPG/PNG/WebP por diálogo nativo, validação dos bytes/dimensões, cópias originais intactas, miniaturas orientadas e viewer com zoom/deslocamento.
- Cinco molduras, legendas opcionais, bilhetes Unicode/multilinha com cinco cores e três papéis, oito lembretes escolhidos explicitamente.
- Posicionamento relativo por arrasto ou teclado/botões, inclinação e ordem visual; remoção confirmada e desfazer durante a visita.
- Persistência local própria com gravação atômica e tratamento de erros; versões futuras ou dados inválidos não são sobrescritos automaticamente.
- Backup binário completo `.haven-memory`, restaurável por importação explícita e validada antes de substituir o mural. Originais não são comprimidos nem embutidos em JSON.
- Áudio compartilhado sem autoplay/troca ao entrar, modo imersivo reutilizado e atalhos M/C/Esc. Sem texto do ritual no mural, upload, telemetria ou análise.
- Limites iniciais: 60 itens, 20 MiB por imagem, 40 MP/16.000 pixels por lado e pacote de até 512 MiB. Desenvolvimento web usa IndexedDB Blob separado; backup completo é desktop.

Próximos refinamentos: medição de heap com muitos originais grandes, ensaios de monitores/GPU/DPI e Narrador, evolução versionada do formato de backup e presença opcional do companheiro fora da área das lembranças. Não há metas, recompensas, cobranças de retorno ou funcionalidades sociais.
