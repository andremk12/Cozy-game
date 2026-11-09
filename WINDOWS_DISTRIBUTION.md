# Distribuição Windows da Beta — diagnóstico e estratégia

Auditoria de **30 de outubro de 2026**. O projeto chamado Cozy Chilling nesta solicitação está identificado no código e no executável como **Little Haven**. A identidade existente foi preservada.

| Verificação | Diagnóstico |
| --- | --- |
| Ferramentas | **electron-builder 26.15.3**, Electron **44.10.0**, Vite **8.3.4**; versões conferidas no lockfile e nas dependências instaladas. Não usa Electron Forge. |
| Distribuição atual | `portable`, Windows **x64**, lançador autoextraível NSIS; não é um instalador convencional. `asar: true` e lista explícita de arquivos. Saída em `outputs/desktop/`. |
| Assinatura atual | Lançador e `win-unpacked/Little Haven.exe`: **NotSigned**. Sem certificado, serviço de assinatura ou publicador de assinatura configurado; nenhuma variável de credenciais presente nesta sessão. Isso não verifica certificados existentes fora do projeto. |
| Nome/identidade | `name: little-haven`, `productName: Little Haven`, `appId: studio.littlehaven.desktop`, igual ao AppUserModelID do Electron. Renomear exige decisão de produto e análise dos dados locais. |
| Versão | `0.2.0-beta.1`. Lançador: ProductVersion/FileVersion com rótulo Beta; executável interno: ProductVersion `0.2.0.0`, FileVersion `0.2.0-beta.1`, conforme comportamento do builder. |
| Ícone/publicador | `public/assets/icons/haven.ico`: 16–256 px, 32 bits; PNG 256 px para a janela. Autor e CompanyName **André** são metadados, não identidade validada. `publisherName` e identidade Store ainda não definidos. |

O aviso observado é compatível com um download sem assinatura e sem reputação. SmartScreen considera certificado e reputação do arquivo; **assinatura válida, inclusive EV, não garante ausência de aviso**. Alterar nome, ícone ou configuração do Electron não cria reputação. Não foi reproduzido o download em máquina limpa. [Microsoft — reputação do SmartScreen](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).

## Preparado automaticamente

- `package:win` preserva formato/caminho e **continua podendo gerar sem assinatura** quando não há credenciais; não desativa a tentativa de assinar. Agora usa `--publish never`.
- `package:win:signed` exige `forceCodeSigning: true`, publica nada e usa **`outputs/desktop-signed/`**, sem substituir o portátil atual. Ao concluir, exige assinatura válida e timestamp nos dois executáveis. [Opções do builder v26](https://www.electron.build/v26/docs/win/).
- Assinatura SHA-256 preparada; execução como usuário explicitada no PE e no lançador. Sem remover edição de ícone/metadados ou mudar proteções do Electron.
- `verify:win` inspeciona metadados, Authenticode, timestamp e SHA-256, sem executar o aplicativo. `-RequireSignature` rejeita unsigned; `-ExpectedPublisher` confere o Subject exato informado. `.gitignore` protege arquivos comuns de credenciais.

```powershell
npm run verify:win
npm run package:win:signed  # somente depois de configurar assinatura real
npm run verify:win -- -OutputDirectory outputs/desktop-signed -RequireSignature -ExpectedPublisher 'SUBJECT EXATO DO CERTIFICADO VALIDADO'
```

O verificador cobre o lançador e o PE principal, não todas as DLLs nem o conteúdo extraído do lançador. `Valid` depende da confiança desta máquina; conferir cadeia pública, publicador esperado e timestamp com SignTool faz parte da revisão externa. Ele não certifica segurança, reputação ou aprovação Store.

## MSIX como segundo canal

**Viável sem substituir o portátil.** A versão instalada oferece `appx`, sem target nativo `msix`; a documentação atual de MSIX não se aplica automaticamente a ela. Pode-se avaliar AppX para Store ou criar pipeline separado com `win-unpacked`, manifesto/assets próprios e **MakeAppx do Windows SDK**, produzindo `.msix` real. Outra opção é atualizar o builder após análise e testes. Não basta renomear a extensão. SDK 10.0.22621.0 detectado, sem execução validada. [AppX v26](https://www.electron.build/v26/docs/appx/), [MakeAppx](https://learn.microsoft.com/en-us/windows/msix/package/create-app-package-with-makeappx-tool).

O perfil futuro depende de conta de desenvolvedor, nome reservado e valores exatos `Identity.Name`, `Publisher` e `PublisherDisplayName` do Partner Center. Requer versão numérica crescente de quatro componentes, tiles próprios e manifesto desktop com `runFullTrust`, sujeito à revisão. O fallback atual descarta `-beta.1`, usa Application.Id `little-haven` incompatível com o target AppX e pode inserir logos genéricos: não ativamos um perfil com identidade fictícia. [Identidade](https://learn.microsoft.com/en-us/windows/apps/publish/view-app-identity-details), [requisitos dos pacotes](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements).

Na Store, MSIX/AppX é assinado pela Microsoft após certificação, sem exigir compra de certificado público para submissão; isso não se aplica ao EXE/MSI. MSIX público fora da Store exige assinatura confiável própria. [Opções de assinatura Microsoft](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/code-signing-options).

## Recomendação para a Beta

Manter o portátil atual para testes limitados e priorizar **assinatura de código reconhecida publicamente** antes de ampliar a distribuição direta. Certificado/serviço, validação da identidade, acesso à chave/token e credenciais dependem do publicador; não foram adquiridos ou configurados. Usar variáveis protegidas/armazenamento seguro, nunca senhas no repositório. Avaliar elegibilidade regional antes de escolher Artifact Signing; disponibilidade de região Azure não garante elegibilidade de identidade no Brasil. [Requisitos do serviço](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart).

Depois de assinar, conferir ambos os executáveis e calcular o hash final; compartilhar por origem controlada com notas da Beta. Validar download e execução em Windows limpo com proteções ativas. Para Store, testar instalação, atualização, desinstalação, convivência de canais e dados `userData`/backup `.haven-memory`, com conteúdo sintético, além do Windows App Certification Kit e certificação. Não há migração automática validada. [Dados em aplicativos empacotados](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-behind-the-scenes).

Resultados executados nesta auditoria estão em [VALIDATION.md](VALIDATION.md). Nenhum certificado autoassinado foi criado, proteção desativada ou pacote publicado.
