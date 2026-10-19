# Little Haven 0.1.0 — validação da Fase 1

Data da entrega: 19 de outubro de 2026. Ambiente: Windows x64, Node.js 22.18.0, npm 10.9.3. React 19.3.1, Vite 8.3.4 e Electron 44.9.0, com versões fixadas no lockfile.

## Resultados

| Verificação executada | Resultado |
| --- | --- |
| Instalação real de dependências (`npm install`) | Concluída |
| Build de produção (`npm run build`) | Concluído |
| Testes unitários (`npm test`) | 22 passaram; nenhum falhou |
| Interface de produção no Edge (`npm run test:e2e`) | 6 passaram; nenhum falhou |
| Electron de produção (`npm run test:desktop`) | Passou |
| Inicialização real `npm run dev` + encerramento de Vite (`node scripts/development-smoke.mjs`) | Passou |
| Distribuição Windows (`npm run package:win`) | Executável portátil x64 gerado |
| Aplicativo empacotado (`node scripts/package-smoke.mjs`) | Passou |
| Lançador portátil `.exe` (`node scripts/portable-smoke.mjs`) | Abriu o quarto e encerrou normalmente |

O teste de teclado encontrou inicialmente uma disputa de foco entre o título e o campo de escrita. A correção foi aplicada e a suíte de interface foi executada novamente com sucesso. A versão final também mantém o controle de volume visível em janelas pequenas.

## O que foi observado

- **Quarto:** clique na luminária altera a luz; clique na janela altera a chuva. Preferências de luz, chuva e volume sobrevivem ao recarregamento.
- **Ritual:** o caderno abre o papel, o rascunho exige confirmação antes de sair e o cancelamento preserva o texto. A sequência completa de dobra, travessia e conclusão foi acompanhada por aproximadamente 17 segundos.
- **Privacidade:** um texto sintético de teste não apareceu no DOM após envio, em localStorage, sessionStorage, no JSON de preferências ou nas requisições observadas. Campos extras, incluindo texto, foram rejeitados pela ponte. O descarte do estado React é testado separadamente. Não foram usados pensamentos reais.
- **Acessibilidade:** entrada por teclado, foco no campo, diálogo com foco protegido, Escape para continuar e conclusão imediata com movimento reduzido. Layout verificado em 1440 × 960, 800 × 650 e 390 × 844; sem transbordamento horizontal.
- **Áudio:** ausência de autoplay, ativação por clique, retomada exigindo novo gesto, ganho limitado, fades, chuva desligada e liberação de recursos. O som é sintetizado no dispositivo.
- **Desktop:** React, arte e ícone carregaram de `app.asar`; sandbox e isolamento ativos; Node ausente no renderer; somente duas funções na ponte. As preferências sobreviveram ao fechamento e à reabertura do aplicativo empacotado. A confirmação nativa de descarte bloqueou e permitiu o recarregamento conforme a escolha de teste.
- **Desenvolvimento:** o comando documentado abriu Vite e Electron, carregou o quarto sem violações de CSP e encerrou Vite ao fechar sua própria janela.
- **Console:** nenhum erro de renderer nas verificações nativas e nas verificações de interface que monitoram o console. Avisos de ferramentas sobre cores de terminal não são erros da aplicação.
- **Inspeção visual:** capturas do quarto e da escrita foram abertas e revisadas; cenário proporcional, pixels nítidos, controles legíveis e navegação visível na janela desktop de referência.

Os testes nativos usam perfis dentro de `work/`, sem modificar preferências pessoais. Alguns testes usam renderização por software para funcionar nesta sessão; a abertura normal mantém aceleração gráfica disponível.

## Limites da validação

Não foram avaliados manualmente leitores de tela, diferentes equipamentos de áudio, conforto sonoro subjetivo, outras versões do Windows, múltiplos monitores ou todas as escalas de DPI. Não houve distribuição em loja nem assinatura digital. O executável está identificado como `NotSigned` pelo Windows.

A auditoria `npm audit --omit=dev` encontrou **zero vulnerabilidades nas dependências de produção**. A árvore das ferramentas de empacotamento apresenta **8 avisos moderados**, todos decorrentes da mesma dependência transitiva `sprintf-js`; não há correção publicada para esse pacote na versão consultada. Não foi forçado um downgrade amplo nem uma substituição de versão principal. [Aviso oficial GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). Revisar essa cadeia ao atualizar o empacotador.

## Arquivos principais

| Arquivo | Responsabilidade |
| --- | --- |
| `package.json`, `package-lock.json`, `vite.config.js` | Dependências fixadas, scripts e build |
| `electron/main/index.js` | Janela, carregamento, políticas e confirmação nativa |
| `electron/preload/index.cjs` | Ponte isolada e limitada |
| `electron/services/preferences.js`, `security.js` | Persistência validada e controle de recursos |
| `src/app/App.jsx`, `App.css` | Navegação, coordenação e apresentação |
| `src/scenes/Room/Room.jsx`, `Room.css` | Arte original, chuva e objetos |
| `src/scenes/LetItFloat/` | Papel, rio, barco e estados do ritual |
| `src/scenes/Planned/` | Apresentação honesta de Garden e Journey |
| `src/services/`, `src/hooks/` | Áudio, preferências e movimento reduzido |
| `tests/`, `scripts/*smoke*.mjs` | Testes unitários, interface e integração desktop |
| `public/assets/`, `public/licenses/` | Ícones originais, orientação de áudio e licenças |
| `README.md`, `ROADMAP.md` | Execução, arquitetura e continuidade |

O código editável fica na raiz do projeto. O ZIP de código-fonte contém esses arquivos e não inclui dependências instaladas, builds, perfis de teste nem pensamentos.
