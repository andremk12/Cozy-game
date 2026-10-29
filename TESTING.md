# Little Haven — guia para os primeiros visitantes

**Beta 0.2.0 — versão 0.2.0-beta.1 para Windows x64**

O Little Haven é um pequeno refúgio em pixel art para ouvir a chuva, explorar ambientes tranquilos e descansar. Não há pontos, metas, cobranças diárias ou punições por ficar longe. Explore no seu ritmo.

Esta é uma **Beta experimental** compartilhada com amigos. Ela ainda pode apresentar erros e receber mudanças. Fotografias e dados importantes devem continuar com cópias de segurança fora do aplicativo.

## Como abrir

1. Receba de André o arquivo **`Little-Haven-0.2.0-beta.1-x64.exe`**, este guia e o hash SHA-256 informado na entrega.
2. Guarde o executável em uma pasta sua e confira se ele veio da origem esperada. Se estiver dentro de um ZIP, extraia antes de abrir.
3. Dê dois cliques no executável. Não é necessário instalar Node.js, VS Code ou outro programa de desenvolvimento. O aplicativo funciona sem servidor Vite e pode ser usado offline.

O executável é portátil, mas suas preferências e lembranças ficam no perfil do Windows, não ao lado do `.exe`. Mover apenas o executável para outro computador não leva esses dados junto.

Esta Beta **não tem assinatura digital**. O Windows pode exibir um aviso do SmartScreen ou identificar o fornecedor como desconhecido. Confira a origem e a integridade do arquivo antes de decidir abri-lo. Não desative antivírus nem outras proteções; se houver dúvida ou bloqueio, fale com André.

Para conferir o hash, uma opção é abrir o PowerShell na pasta do arquivo e executar:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath '.\Little-Haven-0.2.0-beta.1-x64.exe'
```

Compare o resultado com o SHA-256 enviado por André. Eles precisam ser iguais. O hash confirma a integridade em relação ao valor recebido; confirme também quem enviou o arquivo.

## Um passeio pelo refúgio

Use os nomes dos ambientes na navegação para trocar de lugar. Você também pode percorrer os controles com **Tab** e ativá-los com **Enter** ou **Espaço**. Os controles de volume e seletores aceitam as setas do teclado.

- **The Room:** toque na luminária para mudar a luz e na janela para ligar ou desligar a chuva. O caderno leva ao Let It Float.
- **The Garden:** escolha um canteiro ou vaso para plantar. As plantas crescem com o tempo, inclusive com o aplicativo fechado, e nunca morrem por falta de visitas. Experimente regar, mover vasos, decorar e mudar a luz ou o clima. Há pequenos animais para descobrir.
- **The Journey:** escolha uma das cinco paisagens pela janela do trem. Explore a luminária, as cortinas, o chá, o livro e o bilhete. Você pode pausar as animações e retomar quando quiser. A viagem não tem destino ou prazo.
- **Let It Float:** escreva algo e escolha **Let it float** para liberar o barquinho. O texto é descartado antes da animação e não fica guardado no aplicativo. Ao sair com um rascunho, você pode continuar escrevendo ou confirmar o descarte. Use textos de teste se estiver apenas verificando o funcionamento.
- **The Memory Corner:** um mural para fotografias e bilhetes que você escolheu guardar. Ele começa vazio.

Há também uma pequena surpresa pessoal para quem explorar com curiosidade.

## Sons e momentos de silêncio

O aplicativo começa em silêncio. Clique em **Ativar áudio** ou **Retomar som** para ouvir. Cada nova abertura exige esse gesto, mesmo que o som estivesse ligado antes.

Abra **Mixer** para escolher uma atmosfera pronta ou combinar chuva, vento, pássaros, riacho, lareira e sons de trem. Ajuste o volume geral e os volumes individuais. **Silenciar tudo** permite uma pausa sem perder a combinação.

Ao ajustar uma camada, a combinação vira **Custom** e acompanha você entre os ambientes. Os perfis prontos podem se adaptar ao ambiente e ao clima. Fechar o mixer não desliga o som. Para parar, use **Silenciar tudo** ou **Desativar áudio**.

## Modo Imersivo

No jardim, no trem e no mural, o botão **Modo Imersivo** amplia o cenário e recolhe a interface. **Esc** fecha primeiro uma janela ou ferramenta aberta; pressione novamente para sair da imersão quando necessário.

Durante a imersão, **M** abre o mixer e **C** abre **My Companion**. No trem, a saída também pode ser encontrada com Tab ou movendo o cursor para o canto superior direito. O aplicativo respeita a opção de reduzir animações do Windows.

## Seu pequeno companheiro

O gatinho acompanha você no quarto, no jardim e no trem. Clique nele ou use Tab e Enter/Espaço para fazer carinho. Você pode escolher um nome agora ou deixar para depois.

Abra **Companion → My Companion** para renomear, mudar a pelagem ou mostrar/ocultar o personagem. Nome e escolhas ficam salvos neste computador. Ele não exige comida, atenção diária ou tarefas. O gato laranja escondido no jardim é outro personagem. O companheiro não aparece no ritual nem sobre o mural.

## Fotografias e bilhetes no Memory Corner

- **Add a Memory:** escolha uma ou mais fotos JPG, PNG ou WebP. O aplicativo copia os arquivos originais; não move nem apaga as fotos da sua pasta. Depois de importar, confirme que consegue ampliá-las. Preserve suas próprias cópias de segurança.
- **Write a Note:** escreva um bilhete, escolha o papel e confirme para fixá-lo. **A Little Reminder** oferece frases opcionais que só entram no mural quando você escolhe.
- Selecione um cartão para editar a moldura, legenda ou bilhete. Arraste para organizar; pelo teclado, selecione e use as setas. Shift com uma seta move um pouco mais.
- Dois cliques, Enter ou **Ampliar** abrem a lembrança. Nas fotos, use o zoom, arraste ou role para explorar e escolha **Ajustar à janela** para voltar.
- **Remover** pede confirmação. Você pode desfazer a última remoção durante a visita ao mural. A foto da pasta de origem continua intacta.
- **Seu cantinho** permite mudar o tema e detalhes de decoração.

O mural aceita até **60 itens**, fotos de até **20 MiB**, **40 megapixels** e **16.000 pixels por lado**. Há uma cota total de originais próxima de 512 MiB. GIF, SVG e imagens animadas não são aceitos. Formatos ou arquivos inválidos recebem uma mensagem de erro.

### Guardar uma cópia do mural

Em **Seu cantinho → Exportar backup**, escolha onde salvar o arquivo **`.haven-memory`**. Ele inclui fotografias originais, bilhetes, legendas e organização do mural. Guarde uma cópia em outro local de sua confiança. Uma captura de tela não substitui esse backup.

**Restaurar backup** substitui o mural atual pelo conteúdo escolhido e pede confirmação. Exporte primeiro uma cópia do mural atual se quiser conservar os dois. O arquivo é validado antes da troca; se a validação falhar, o mural atual permanece.

Espere a indicação de salvamento terminar antes de fechar. Se aparecer erro, mantenha o aplicativo aberto e use **Tentar novamente**. Não há garantia de recuperar alterações ainda não salvas após encerramento forçado, falha do computador ou problema no disco.

## Onde ficam os dados

No Windows, os dados normalmente ficam em **`%APPDATA%\Little Haven`**. Você pode colar esse caminho na barra de endereço do Explorador de Arquivos para localizar a pasta:

- `preferences.json`: luz, chuva, áudio e escolhas do companheiro.
- `garden.json`: plantas e organização do jardim.
- `memory-corner`: mural, cópias originais e miniaturas das fotografias.

Não edite, mova ou apague esses arquivos durante o uso. O backup do mural exportado pelo aplicativo é a forma indicada de transportar suas lembranças. Nesta Beta, ele não inclui as preferências ou o jardim.

Não há conta, upload, sincronização, telemetria ou envio automático de feedback. Fotografias e bilhetes permanecem neste computador. O aplicativo não criptografa esses arquivos ou backups; proteja-os como outros arquivos pessoais. O texto do **Let It Float não é salvo** e não entra no mural automaticamente.

## Como encerrar

Feche a janela pelo **X**, depois de verificar que o mural terminou de salvar. Se houver um rascunho do Let It Float, escolha se deseja continuar escrevendo ou descartá-lo. Não é preciso fechar programas de desenvolvimento. Ao abrir o executável outra vez, confira suas preferências, o jardim e o mural.

## Como contar o que aconteceu

Envie seu relato voluntariamente para André pelo canal em que recebeu a Beta ou por [e-mail](mailto:andre.michalsky12@gmail.com). Se possível, inclua:

- A versão **0.2.0-beta.1**, sua versão do Windows e o ambiente em que o problema apareceu.
- O que você fez, o que esperava e o que aconteceu. Diga se conseguiu repetir.
- Uma captura de tela, somente se desejar. Antes de enviar, esconda fotografias, nomes, bilhetes ou outras informações pessoais que não queira compartilhar.

Não é necessário enviar a pasta de dados, suas fotos ou pensamentos. Não há coleta automática dessas informações.

### Perguntas opcionais

1. O Little Haven abriu normalmente?
2. Alguma tela apresentou erros?
3. Os sons funcionaram corretamente?
4. A experiência pareceu relaxante?
5. A interface foi fácil de entender?
6. O aplicativo apresentou lentidão?
7. Qual foi sua parte favorita?
8. O que você gostaria de melhorar?
9. Encontrou algum bug?
10. Gostaria de utilizar o Little Haven novamente?

Você pode responder apenas ao que tiver vontade. Obrigado por visitar este cantinho.
