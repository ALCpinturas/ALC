# ALC

Site público e plataforma de gestão da ALC, Alexandre Luís Carlitos — remodelação de edifícios.

O site apresenta serviços, portefólio e um funil de pedido de orçamento em cinco passos, e recolhe
orçamento. O backoffice em `/admin` gere leads, clientes, obras, fotografias de obra e
orçamentos, e foi desenhado para ser usado no telemóvel, no estaleiro.

## Arranque rápido

```bash
cp .env.example .env.local     # preencher com os valores do painel do Supabase
npm run dev
```

Não é preciso `npm install` à mão: o lançador em `scripts/arrancar.mjs` instala as
dependências no sítio certo da primeira vez que corre.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em <http://127.0.0.1:5173> |
| `npm run build` | Typecheck, lint, testes e build de produção para `dist/` |
| `npm run verificar` | Typecheck, lint e testes, sem build |
| `npm run previsualizar` | Serve o `dist/` já construído |
| `npm run db:push` | Aplica as migrations ao projeto Supabase ligado |
| `npm run db:types` | Regenera `src/types/database.ts` (precisa de Docker ou projeto ligado) |

O `build` corre a verificação toda antes de construir e pára ao primeiro erro: não se
produz um `dist` a partir de código que não passa nos testes.

Se precisar de correr uma etapa isolada, existem `npm run typecheck`, `npm run lint` e
`npm test`, mas esses assumem que está num disco local (ver a nota no fim).

Variáveis opcionais: `ALC_PORTA` muda a porta, `ALC_PASTA_LOCAL` muda onde fica a cópia de
trabalho quando ela é necessária.

## Variáveis de ambiente

No `.env.local` (cliente, público por natureza — nunca pôr aqui chaves de serviço):

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_SITE_URL=https://www.alc.pt
```

Secrets do lado do servidor, definidos com `supabase secrets set`:

| Secret | Para quê |
|---|---|
| `RESEND_API_KEY` | Envio de email pelo Resend |
| `ALC_EMAIL_REMETENTE` | Remetente verificado no Resend, ex. `ALC <geral@alc.pt>` |
| `ALC_EMAIL_DESTINO` | Caixa interna que recebe as notificações de leads e a cópia (BCC) de cada orçamento enviado a um cliente. Opcional: sem ele, ambas as funções usam `ALC.pinturas@proton.me`, que está no código para nunca depender de um secret esquecido |
| `ALC_CONFIRMACAO_CLIENTE` | `true` liga o email de confirmação ao cliente. Por omissão está desligado: sem domínio verificado no Resend só é possível enviar para a caixa da ALC |
| `WEBHOOK_SECRET` | Segredo partilhado do Database Webhook |
| `SITE_URL` | Base das ligações nos emails e origem permitida no CORS. Sem barra final, ex. `https://alc-six.vercel.app` |
| `ORIGENS_PERMITIDAS` | Opcional. Outras origens onde o backoffice corre, separadas por vírgula, ex. `https://alc.pages.dev`. Sem a origem certa aqui ou em `SITE_URL`, o browser bloqueia a chamada e aparece "Failed to send a request to the Edge Function" |

## Base de dados

```bash
supabase link --project-ref <ref-do-projeto>
npm run db:push
npm run db:types
```

As migrations estão em `supabase/migrations`, por ordem:

1. `site_publico` — portefólio, pedidos de contacto, tabelas de preço, leads da calculadora,
   RLS, buckets `obras-publicas` e `pedidos-fotografias`.
2. `perfis` — perfis de utilizador, trigger de criação e funções `tem_acesso_gestao` / `e_admin`.
3. `emails` — registo de emails enviados, com índice único que impede envios repetidos.
4. `gestao` — clientes, obras, diário, fotografias, autorizações de publicação,
   numeração anual e `converter_lead_em_cliente`.
5. `orcamentos` — medições, vãos, orçamentos, linhas, bucket `orcamentos` e `aceitar_orcamento`.
6. `vistas_metricas` — vista `leads_unificadas` e RPC `metricas_periodo`.
7. `calculadora_id_no_cliente` — o id da lead passa a ser gerado no cliente.
8. `gravar_lead_por_funcao` — a calculadora grava por RPC; o anónimo deixa de tocar na tabela.
9. `perfis_sem_recursao` — corrige recursão infinita na política de leitura de perfis.
10. `webhooks_leads` — pg_net e triggers que chamam a Edge Function ao criar uma lead.
11. `orcamento_sem_obra` — o orçamento passa a viver do cliente; a obra liga-se depois.
12. `tipos_trabalho` — o catálogo ganha capítulo e ordem, para ser gerido na aplicação.
13. `remocao_em_cascata` — o bloqueio de linhas deixa de impedir apagar o que lhes está acima.
14. `imagens_site` — fotografias da página inicial (abertura, sobre, serviços), editáveis no
    backoffice. Bucket público `site-imagens`.

> `src/types/database.ts` é um espelho escrito à mão das migrations, já verificado contra a
> base de dados real coluna a coluna. `npm run db:types` regenera-o automaticamente, mas exige
> Docker instalado ou o projeto ligado por personal access token.

## Edge Functions

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...     # supabase.com/dashboard/account/tokens
npx supabase functions deploy notificar-lead --project-ref <ref>
npx supabase functions deploy enviar-orcamento --project-ref <ref>
npx supabase functions deploy criar-utilizador --project-ref <ref>
```

Os secrets definem-se com `npx supabase secrets set --project-ref <ref> NOME=valor`.
`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas pelo runtime
e nunca devem ser definidas à mão.

### Notificação de cada pedido

Todo o pedido, venha da calculadora ou do formulário de contactos, tem de gerar email para a
caixa da ALC. Três coisas têm de estar de pé, e falha qualquer uma e não sai email nenhum:

1. `RESEND_API_KEY` e `ALC_EMAIL_REMETENTE` definidos, com o domínio do remetente verificado
   no Resend.
2. Os três segredos do Vault da secção seguinte, que são o que faz o trigger chamar a função.
3. A função `notificar-lead` publicada.

O destinatário não está nesta lista de propósito: `ALC.pinturas@proton.me` é o valor por
omissão no código da função. `ALC_EMAIL_DESTINO` sobrepõe-se, para mudar de caixa sem publicar.
A mesma omissão e o mesmo secret controlam o BCC de `enviar-orcamento` para cada orçamento
enviado a um cliente.

Para confirmar que está a funcionar, a tabela `emails_enviados` regista cada tentativa com
`estado` `enviado` ou `falhado` e o erro devolvido pelo Resend:

```sql
select tipo, destinatario, estado, erro, criado_em
from emails_enviados order by criado_em desc limit 20;
```

### Webhooks das leads

Não se criam no painel: vivem na migration `webhooks_leads`, que instala o `pg_net` e cria um
trigger `after insert` em `pedidos_contacto` e em `leads_calculadora`. O pedido HTTP é
assíncrono, por isso uma falha da função nunca desfaz o pedido do cliente.

Os valores sensíveis ficam no Vault, não no repositório. Depois de aplicar a migration,
gravam-se uma vez, por SQL e com acesso de administrador:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1/notificar-lead',
                           'webhook_url_notificar_lead', 'URL da Edge Function');
select vault.create_secret('<o mesmo valor de WEBHOOK_SECRET>',
                           'webhook_secret', 'Segredo partilhado com a função');
select vault.create_secret('<chave anon>',
                           'webhook_anon_key', 'Satisfaz o verify_jwt da função');
```

Sem estes segredos o trigger não rebenta nada: regista um `warning` e deixa a inserção passar.

`enviar-orcamento` é chamada pelo backoffice com o JWT do utilizador; não precisa de webhook.

### Criar contas do backoffice

`criar-utilizador` é a única forma de criar uma conta pela aplicação: recebe nome, email,
palavra-passe e papel, confirma que quem chama é administrador e usa a chave de serviço para
criar a conta já confirmada, sem passar pelo fluxo de convite por email. Chamada pelo
backoffice com o JWT do utilizador, tal como `enviar-orcamento`; não precisa de webhook nem de
segredo próprio. Continua possível criar contas à mão em Authentication → Users, como descrito
nos passos manuais abaixo.

## Passos manuais antes de ir para o ar

1. Criar o projeto Supabase na região Europa e ligar o repositório.
2. Aplicar migrations e regenerar tipos.
3. Criar a primeira conta em Authentication → Users. Não há registo público. O trigger cria o
   perfil; passar essa pessoa a `admin` em `perfis`, à mão, só desta primeira vez — é preciso
   um administrador para as contas seguintes poderem ser criadas em Configurações → Conta,
   já com o papel certo.
4. Preencher `precos_unitarios` e `coeficientes_estado` com valores reais. **Enquanto
   estiverem a zero a calculadora devolve zero**, que é melhor do que inventar um número.
5. Dados do emitente já preenchidos em `src/lib/empresa.ts`: Nuno Alexandre Dias Padilha,
   NIF 257 877 827, email e zonas servidas. A ALC não é sociedade, são três profissionais a
   recibos verdes, por isso o orçamento é emitido por uma pessoa singular e é o NIF dessa
   pessoa que entra no PDF e nas páginas legais.
6. Verificar o domínio no Resend e definir os secrets.
7. Confirmar com o contabilista o enquadramento do IVA (6% ou 23%) antes de emitir o primeiro
   orçamento real. A aplicação não decide a taxa: apresenta as duas e avisa.
8. Configurar o alojamento estático: reescrita de todas as rotas para `index.html`,
   cabeçalhos de segurança, cache longa para ficheiros com hash e nenhuma cache para o
   `index.html`.

## Fonte do PDF

`src/lib/pdf/orcamento.ts` usa as fontes base do jsPDF (Helvetica, codificação WinAnsi), que
cobrem os acentos do português e o símbolo do euro. Para controlo tipográfico completo, registe
uma TrueType em base64 com `doc.addFileToVFS` e `doc.addFont`, e troque as chamadas `setFont`
na função `texto`.

## Logótipos

Os ficheiros em `public/` foram recortados a partir de mockups fotográficos. As variantes
`-claro`, para fundos escuros, têm artefactos visíveis em ampliação: servem de marcador e devem
ser substituídas pelo vetorial do designer antes de qualquer impressão. Existe uma versão
vetorial aproximada em `IMAGES/export/vector/`, incluindo `favicon.svg`.

Nenhum ficheiro do projeto referencia caminhos de logótipo diretamente: tudo passa por
`src/components/site/Logo.tsx`.

## Quando o projeto está numa partilha de rede

`Z:\ALC` é uma partilha SMB. O Windows não executa binários nativos a partir dela, por isso
o `vite`, o `vitest`, o `esbuild` e o binário nativo do `rollup` falham lá com *Permission
denied* ou *Access is denied*, mesmo depois de `npm install --ignore-scripts`.

O lançador resolve isto sozinho. Ao arrancar, tenta executar o esbuild na pasta do projeto:

- **Consegue** — está num disco local, corre tudo no sítio e não copia nada.
- **Não consegue** — prepara uma cópia de trabalho em `~/alc-dev`, instala lá as dependências
  uma vez, e mantém a cópia sincronizada enquanto o servidor corre.

A sincronização é por sondagem a cada 400 ms, porque as notificações de alteração do Windows
não são de confiança sobre SMB. Cada ficheiro copiado ou removido aparece na consola.

**O espelho é unidirecional.** Edite sempre na pasta original. Uma alteração feita
diretamente na cópia local sobrevive até o ficheiro correspondente mudar no original, e nessa
altura é sobrescrita sem aviso. A cópia local é descartável: pode apagá-la a qualquer momento.

O `git` também recusa operar na partilha, por *dubious ownership*. Para o usar lá:

```bash
git config --global --add safe.directory '%(prefix)///192.168.1.252/workspace/'
```
