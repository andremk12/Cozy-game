# Áudio do Little Haven

A primeira versão usa chuva **original e sintetizada no próprio aplicativo**, em
`src/services/ambientAudio.js`. Não há gravações de terceiros, dependências de rede,
captura de microfone ou arquivos de origem desconhecida.

`AmbientAudio` é criado sem ativar áudio. `start()` deve ser chamado exclusivamente
pelo botão de som, durante um gesto explícito do usuário. A preferência salva de
áudio não elimina essa confirmação a cada abertura. `start()` retorna `true` quando
o contexto está ativo e `false` quando indisponível; a interface pode explicar a
indisponibilidade sem registrar conteúdo privado.

API atual:

- `await start()`: inicia ou retoma suavemente o ambiente.
- `setVolume(number)`: recebe de `0` a `1`; a saída recebe ganho máximo adicional de `0.25`.
- `setRain(boolean)`: desvanece a chuva ao ativá-la ou desativá-la.
- `stop()`: reduz o ganho e suspende o processamento de áudio.
- `await dispose()`: encerra as fontes, desconecta o grafo e fecha o contexto.

A chuva combina ruído suavizado e filtrado com pequenas gotas discretas. O buffer
é estéreo, gerado localmente, e não exige timers para produzir os sons. Ao desmontar
o componente que possui o serviço, chame `dispose()` para liberar seus recursos.

## Expansão com gravações

Adicione aqui apenas gravações próprias, em domínio público ou com licença que
permita redistribuição no aplicativo. Registre junto de cada arquivo o autor, a
URL original, a licença e a atribuição exigida. Use nomes como `garden-breeze.ogg`
ou `train-interior.ogg`; depois implemente uma faixa específica no serviço, passando
sempre pelo mesmo ganho mestre e pelas transições suaves. Empacote os arquivos com
o aplicativo e use URLs relativas do diretório público. Nenhum download é necessário
durante o uso. Não introduza reprodução automática na restauração de preferências.
