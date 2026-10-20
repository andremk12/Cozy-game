# AGENTS.md — Little Haven

## Objetivo do projeto

**Little Haven: A Cozy Place to Breathe** é um aplicativo desktop para Windows, feito para oferecer uma experiência acolhedora e contemplativa em pixel art. O usuário pode explorar ambientes tranquilos sem pontuações, metas, punições, notificações insistentes ou obrigações.

**Princípio de produto:** um lugar para descansar, não outra tarefa a cumprir. Preserve a sensação de conforto, liberdade, privacidade e leveza em cada mudança.

## Fontes de contexto

Antes de alterar código, leia os arquivos relacionados à tarefa e, quando necessário:

- `README.md`: visão geral, arquitetura, comandos e comportamento existente.
- `ROADMAP.md`: fases e limites do escopo planejado.
- `VALIDATION.md`: verificações anteriores e limitações conhecidas; não trate resultados antigos como prova de testes atuais.
- `package.json`: scripts e dependências reais.

O código atual é a fonte da verdade quando houver diferenças entre documentação e implementação. Não invente funcionalidades já concluídas.

## Situação e escopo atual

- **Fase 1 implementada:** `The Room` (luminária e chuva) e `Let It Float` (escrita privada e barquinho), preferências locais, áudio ambiente e navegação.
- **Fases planejadas:** `The Garden` (jardim sem punições), `The Journey` (trem contemplativo), personalização e polimento.
- Desenvolva a funcionalidade solicitada, não todo o roadmap. Não transforme telas planejadas em experiências supostamente prontas sem implementá-las.

## Stack e arquitetura existente

- JavaScript com ES Modules, React, Vite, Electron e CSS.
- Node.js mínimo: **22.12.0** (conforme `package.json`).
- O processo principal do Electron fica em `electron/main/`, a ponte isolada em `electron/preload/` e serviços do desktop em `electron/services/`.
- A interface fica em `src/app/`, `src/components/`, `src/hooks/`, `src/scenes/`, `src/services/` e `src/styles/`.
- Arte e ícones locais ficam em `public/assets/`; os testes em `tests/`.
- O quarto atual é desenhado em **SVG original**, numa grade lógica de **480 × 270**. **Não introduza Phaser, PixiJS ou outra engine apenas por preferência**; justifique uma mudança de tecnologia pelo benefício concreto.
- Preserve a separação entre interface React, experiências interativas, serviços, preferências e processos do Electron.

## Regras de desenvolvimento

1. Faça mudanças pequenas, coesas e fáceis de revisar. Prefira reutilizar componentes e padrões existentes.
2. Não reescreva cenas, estilos ou fluxos funcionais sem necessidade demonstrável. Não altere módulos fora do escopo da tarefa.
3. Use nomes claros, componentes acessíveis e lógica organizada. Evite duplicação, arquivos excessivamente grandes, dependências extras e abstrações prematuras.
4. Respeite as configurações existentes de Vite, Electron, empacotamento, lint/formatação e testes; atualize o lockfile por meio do gerenciador de pacotes quando mudar dependências.
5. Nunca introduza backend remoto, login, telemetria, APIs de terceiros ou conexão obrigatória com a internet sem solicitação explícita.
6. Não use assets copiados de jogos ou recursos com licença desconhecida. Preserve avisos de licença e atribuições aplicáveis.
7. Mantenha funcionamento offline e compatibilidade com o Windows desktop.

## Identidade visual e experiência cozy

- Priorize **pixel art 2D**, leitura visual clara, iluminação quente, clima acolhedor e animações discretas.
- Preserve a identidade estabelecida, as proporções e a nitidez dos pixels. Evite borrões, distorções, efeitos exagerados e interfaces de dashboard corporativo.
- Prefira objetos interativos integrados ao cenário a painéis e modais desnecessários.
- Não substitua elementos gráficos do cenário por emojis ou placeholders genéricos apresentados como arte final.
- Interações devem ter resposta perceptível e delicada, com estados coerentes e possibilidade de voltar.
- Não crie streaks, cobranças diárias, morte de plantas por inatividade, cronômetros obrigatórios ou sistemas competitivos.
- Garanta navegação por teclado, foco visível, nomes acessíveis, responsividade e respeito a `prefers-reduced-motion`.
- Áudio deve iniciar apenas após ação do usuário, em volume confortável, com opção clara de desligar.

## Privacidade: invariante crítica do Let It Float

O conteúdo escrito pelo usuário é **estritamente privado e efêmero**:

- Mantenha rascunhos somente no estado da sessão necessário à interação. **Nunca** grave o texto em `localStorage`, `sessionStorage`, IndexedDB, banco de dados, arquivo, logs, analytics, histórico, clipboard automático ou preferências.
- Não envie pensamentos para o processo principal via IPC, para rede, ferramentas externas ou serviços de IA.
- Ao liberar o barquinho, remova o texto do estado da aplicação **antes** de iniciar a animação, preservando a experiência atual de descarte.
- Mantenha a confirmação ao sair da escrita com rascunho, evitando perda acidental.
- Não exiba o texto liberado dentro do rio/barquinho nem implemente análise emocional ou aconselhamento psicológico.
- Em testes, utilize somente textos sintéticos. Não afirme eliminação forense da memória do sistema operacional.
- Mudanças nessa experiência exigem testes de regressão específicos de privacidade.

## Segurança do Electron: não enfraquecer

- Preserve `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` e a política de recursos/CSP.
- Mantenha o `preload` isolado (`electron/preload/index.cjs`) e exponha pelo `contextBridge` apenas as funções mínimas necessárias.
- Valide os dados e a origem das solicitações IPC; não exponha `ipcRenderer`, Node.js ou sistema de arquivos diretamente ao renderer.
- Não habilite carregamento remoto, permissões arbitrárias, downloads, novas janelas ou navegação externa sem justificativa explícita e revisão de segurança.
- Preferências persistentes devem continuar limitadas a dados não sensíveis e validados.

## Fluxo de trabalho esperado do Codex

1. Verifique o estado da árvore de trabalho (`git status`) e preserve mudanças preexistentes do usuário.
2. Inspecione os arquivos relevantes e compreenda o comportamento atual antes de editar.
3. Para mudanças amplas, apresente um plano curto com arquivos afetados, riscos e critérios de aceitação; para tarefas pequenas, implemente diretamente.
4. Modifique apenas o necessário. Não execute operações destrutivas, `git reset --hard`, exclusões amplas ou alterações de histórico sem autorização explícita.
5. Atualize ou crie testes proporcionais à alteração. Execute os testes pertinentes e corrija regressões identificadas.
6. Se a mudança alterar funcionalidade, comandos ou estágio do projeto, atualize `README.md` e/ou `ROADMAP.md` de forma pontual.
7. **Não crie commits, não faça push, merge nem publique releases automaticamente**; deixe a revisão e as ações de Git sob controle do usuário, salvo pedido explícito.
8. Finalize em português do Brasil, informando alterações realizadas, arquivos relevantes, testes realmente executados, resultados, limitações e forma de testar manualmente.

## Comandos de referência

```powershell
npm ci                 # Instalar dependências de forma reproduzível
npm run dev            # Vite + Electron (desenvolvimento)
npm test               # Testes unitários
npm run build          # Build de produção da interface
npm run test:e2e       # Build + testes Playwright de interface
npm run test:desktop   # Smoke test Electron; requer build anterior
npm run package:win    # Executável portátil Windows; usar quando relevante
```

**Critério mínimo de validação:** rode `npm test` e `npm run build` após alterações de código, quando o ambiente permitir; para mudanças visuais/fluxos use também `npm run test:e2e`; para mudanças de Electron, valide o desktop após o build. Não execute empacotamento sem necessidade. Caso algum comando não possa ser executado, descreva o motivo e não marque o teste como aprovado.

## Definição de concluído

Uma tarefa só deve ser considerada concluída quando o comportamento solicitado foi implementado (sem simular recursos ausentes), as interações anteriores continuam funcionando, privacidade e segurança foram preservadas, e os resultados de validação estão documentados com honestidade.
