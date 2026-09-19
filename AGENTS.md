# Projeto ALC

Plataforma para a ALC, empresa portuguesa de remodelação de edifícios.
Frentes de serviço: pintura, tetos falsos e divisórias em pladur, pavimentos, acabamentos.

## Idioma e formatação, não negociável

Todo o texto visível ao utilizador, mensagens de erro, emails e PDFs em português de Portugal.
Nunca português do Brasil. Erros típicos a evitar: usuário, tela, arquivo, salvar, deletar,
celular, time, mouse, banheiro. Usa: utilizador, ecrã, ficheiro, guardar, apagar, telemóvel,
equipa, rato, casa de banho.

Datas dd/mm/aaaa. Horas em formato 24H, nunca AM ou PM.
Moeda em euros com `Intl.NumberFormat('pt-PT', ...)`, sempre através de `src/lib/format.ts`.
Fuso horário Europe/Lisbon na apresentação. Guardar em UTC, converter na apresentação.

Nomes de variáveis, funções e tabelas em inglês para o domínio técnico; o domínio de negócio
está em português (obras, orcamentos, medicoes) porque é assim que o cliente fala. Só o texto
visível é obrigatoriamente em português.

## Stack

Vite 6, React 18, TypeScript strict. react-router 7. Tailwind CSS 4 via `@tailwindcss/vite`.
Radix UI primitives com componentes próprios por cima, em `src/components/ui`.
recharts para gráficos, sonner para toasts, zod para validação, jspdf com import dinâmico.
Supabase para base de dados, autenticação e storage. Edge Functions em Deno para o server-side.
Resend para email transacional, sempre através de Edge Function.

Proibido: Next.js, Prisma, servidor Node próprio, qualquer ORM, bibliotecas de componentes
completas que não sejam Radix. `lucide-react` é usado apenas como conjunto de ícones.

## Paleta, valores medidos no logótipo

```
--color-alc-black:      #1A1A1A  texto principal, títulos, monograma A e L
--color-alc-ink:        #4A4441  texto secundário
--color-alc-rose-light: #F4DCCF  fundos suaves, realces
--color-alc-rose:       #D8B9AE  o rosa do C, superfícies e preenchimentos
--color-alc-rose-dark:  #936D62  texto em rosa, ícones, bordas, foco, botão primário
--color-alc-rose-deep:  #7A4F42  hover e pressed, títulos de capítulo
--color-alc-grey:       #ECEBE9  fundo neutro de secção
--color-alc-line:       #DDD9D6  linhas e contornos
```

Regras de contraste, não negociáveis:

- `#D8B9AE` tem 1,9:1 sobre branco. É superfície, nunca texto nem borda fina.
  Texto por cima dele é sempre `#1A1A1A`, que dá 9,5:1.
- `#936D62` tem 4,56:1 sobre branco. Mínimo para texto corrido em rosa, ícones e bordas.
  O botão primário é fundo `#936D62` com texto branco.
- `#7A4F42` tem 6,94:1. Hover do botão primário e títulos.
- Nunca texto de tamanho normal em `#D8B9AE` nem em `#F4DCCF` sobre fundo claro.

O rosa é acento e superfície, não fundo dominante. Nunca pintar secções inteiras de rosa.
A pincelada iridescente do logótipo contém rosa, azul, verde e lilás: esses tons existem só
dentro do ficheiro de imagem e não são fonte de cor para nada na interface. Proibido azul,
verde, roxo e gradientes saturados em todo o resto, incluindo foco, links, séries de gráficos
e toasts.

## Tipografia

Títulos em Bodoni Moda Variable (`font-display`), para ecoar o C serifado do logótipo.
Corpo, navegação e interface em Jost Variable (`font-body`).
O wordmark ALC e a assinatura são sempre em maiúsculas, em `font-body` light, letter-spacing
0.2em — é a classe `.wordmark`.
Nunca escrever ALC como texto onde o ficheiro do logótipo estiver disponível: usar `Logo.tsx`.

## Dinheiro

Todos os valores monetários são guardados na base de dados em cêntimos, como inteiros.
Nunca float nem double para dinheiro.
A conversão para euros acontece só na apresentação, através de `src/lib/format.ts`.
Os cálculos de orçamento vivem em `src/lib/calculo/`, são funções puras e têm testes.
Arredondamentos explícitos e testados, nunca implícitos.

## Dados pessoais

Nomes, telefones, emails, moradas e fotografias de interiores são dados pessoais.
Nenhum dado pessoal é legível sem sessão autenticada.
Nenhum dado pessoal aparece em logs, em mensagens de erro devolvidas ao cliente, nem em URLs.
Os buckets com fotografias de cliente são privados e acedidos por signed URL de validade curta.

## Telemóvel primeiro no backoffice

O backoffice é usado no estaleiro, de pé, com uma mão, com rede fraca. Por isso:

- Navegação inferior em telemóvel, barra lateral em ecrã largo.
- Alvos de toque de 48 pixels (`.toque`).
- Listas em cartões empilhados, nunca scroll horizontal.
- Diálogos sobem de baixo e ocupam quase todo o ecrã.
- Orçamentos editam-se no telemóvel: linhas em cartões, edição em folha, teclado numérico,
  totais sempre visíveis. Não se espreme uma folha de cálculo em 375 pixels.
- Uploads em fila que sobrevive à navegação, com repetição e falha visível. Nada desaparece
  em silêncio.

## Regras de código

TypeScript strict, sem `any`, sem `ts-ignore`.
Os tipos da base de dados vivem em `src/types/database.ts` e devem ser regenerados com
`npm run db:types` assim que o projeto Supabase estiver ligado.
Validação de formulário com zod, esquema partilhado entre passos e servidor.
Nenhuma chave de serviço do Supabase no código do cliente. Só a chave anon.
Row Level Security ativo em todas as tabelas, sem exceção.
Um componente exportado por defeito por ficheiro.
Comentários só onde a razão não é evidente pelo código.

## Estrutura

```
src/components/ui       primitivas próprias sobre Radix
src/components/site     secções do site público
src/components/admin    componentes do backoffice
src/pages               páginas ligadas ao router
src/lib                 cliente Supabase, formatação, esquemas zod, hooks
src/lib/calculo         funções puras de medição e orçamento, sempre com testes
src/lib/pdf             geração de PDF
src/types               tipos da base de dados
supabase/migrations     SQL versionado
supabase/functions      Edge Functions em Deno
```

## Como trabalhar

Tudo passa pelo lançador em `scripts/arrancar.mjs`: `npm run dev`, `npm run build`,
`npm run verificar`. Ele deteta sozinho se a pasta executa binários nativos e, se não
executar, prepara e mantém uma cópia local de trabalho. Não chamar o `vite` diretamente a
partir de uma partilha de rede, porque não arranca lá.

Typecheck, lint, testes e build **não executam a aplicação**. Depois de mexer em componentes,
abrir no browser antes de dar o trabalho por feito: um `Slot` do Radix com dois filhos já
deixou o site inteiro em branco sem nenhuma dessas verificações se queixar.

Antes de criar um componente, procurar se já existe equivalente em `src/components/ui`.
Antes de criar uma tabela, ler os ficheiros em `supabase/migrations`.
Criar sempre migration nova, nunca editar uma migration já aplicada.
Não instalar dependências sem dizer porquê.
