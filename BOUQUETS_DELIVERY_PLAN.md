# Little Bouquets — proposta de envio intermediado

Status: **planejamento; nenhum serviço remoto implementado ou autorizado nesta etapa**. A versão local prepara um `mailto:` no cliente pessoal. O usuário revisa e envia no próprio cliente, que pode revelar seu endereço. O cartão exportado precisa ser anexado manualmente.

## Experiência proposta

Uma futura opção “Enviar pelo Little Haven” só poderá ficar disponível após implantação, configuração e revisão do serviço. Antes de cada envio, mostrar destinatário único, assunto escolhido, carta e cartão, além de uma confirmação explícita. Permitir voltar e editar. Explicar que o destinatário verá um endereço do projeto; o provedor e os operadores ainda poderão processar dados técnicos. Não prometer anonimato absoluto nem ocultar essa distinção.

Não incluir nome, e-mail pessoal, identificador de instalação ou outros identificadores do remetente em cabeçalhos, corpo, imagem ou metadados. Qualquer assinatura pessoal será opcional e visível na revisão. Não preencher `Reply-To` com dados pessoais. O assunto personalizado deverá usar a mesma validação local e uma segunda validação no servidor: Unicode, até 120 caracteres, sem controles ou quebras de linha, com padrão quando vazio.

## Infraestrutura proposta, sujeita a aprovação

- Avaliar um provedor transacional como Amazon SES, mediante aprovação de custos, região, contrato e políticas de privacidade. Usar domínio e caixa de remetente pertencentes ao projeto, com SPF, DKIM e alinhamento DMARC. A documentação oficial descreve os requisitos de [autenticação DMARC no SES](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html).
- API HTTPS de escopo restrito, com autenticação de curta duração e proteção contra repetição. Uma chave fixa embutida no Electron não autentica usuários e não deve ser usada como proteção. Definir e revisar o mecanismo de acesso antes de disponibilizar a API; não criar um endpoint aberto de envio.
- Credenciais somente no servidor, em armazenamento de segredos, com permissões mínimas e rotação. Nenhuma credencial SMTP/API distribuída ao desktop.
- Aceitar apenas um destinatário, assunto limitado, carta limitada e composição validada. Gerar HTML estático com escape e imagem segura no servidor; recusar cabeçalhos, `From`, CC/BCC, URLs de assets, listas, templates arbitrários e caminhos fornecidos pelo cliente.
- Fila limitada com chave de idempotência de uso único por confirmação. Repetir uma requisição não pode duplicar a mensagem. Reenvio após falha definitiva requer nova revisão e confirmação; nunca criar envio periódico ou em massa.

## Prevenção de abuso e falhas

Aplicar limites conservadores por autorização, origem e destinatário, limites globais e interrupção operacional imediata. Desafio contra automação pode ser solicitado quando necessário, respeitando acessibilidade. Essas proteções precisam de validação contra abuso real antes da abertura pública; o limite na interface isoladamente não protege a API.

Validar sintaxe e domínio do endereço, sem afirmar que isso comprova a existência da caixa ou o consentimento do destinatário. Incluir no presente recebido uma forma discreta de denunciar ou bloquear novos envios, usando token opaco que não revele o remetente. Manter lista de supressão de destinatários que bloquearam, reclamaram ou geraram falhas permanentes. Remover um bloqueio exige fluxo verificado do próprio destinatário, não uma ação de quem envia.

Receber eventos autenticados de entrega, rejeição e reclamação. Tratar falhas temporárias com tentativas limitadas e prazo de expiração; falhas permanentes não voltam à fila. A interface deve distinguir “aceito para processamento”, “não foi possível enviar” e eventual confirmação de entrega técnica. Nenhum desses estados comprova leitura.

Não usar pixels de abertura, reescrita rastreável de links, analytics de cartas ou análise emocional. As configurações do provedor devem ser auditadas para garantir que recursos de rastreamento estejam desligados.

## Retenção e privacidade

Publicar política compreensível antes da primeira transmissão, informando responsável, provedor, finalidades, dados processados, localização e prazos. Criação, edição e exportação continuam disponíveis offline, sem aderir ao serviço.

Proposta inicial para revisão: apagar conteúdo da fila após entrega/falha definitiva, com expiração máxima de 24 horas; manter apenas estado técnico mínimo por até sete dias para suporte. Não registrar assunto, carta, imagem ou endereço em logs de aplicação, traces e relatórios de erro. Restringir e auditar acesso operacional. Considerar também prazos e backups do provedor; não prometer exclusão imediata fora do controle do projeto.

Bloqueios exigem retenção separada e transparente de identificadores de supressão. HMAC com chave de servidor pode reduzir exposição de endereços em consultas próprias, mas não torna esses dados anônimos e não elimina dados necessários ao provedor. Documentar acesso, remoção, rotação e recuperação, evitando desbloquear inadvertidamente destinatários ao apagar logs.

## Critérios antes da ativação

Testar cabeçalhos reais e ausência de identificadores pessoais, assunto Unicode, escape de HTML, MIME/anexos, idempotência, isolamento entre solicitações, limites e automação abusiva, bloqueio/denúncia, eventos falsificados, falhas e expiração. Revisar segurança, operação e política de privacidade com o responsável. Ativar somente após autorização explícita e configuração real; até lá a opção permanece informativa e indisponível.
