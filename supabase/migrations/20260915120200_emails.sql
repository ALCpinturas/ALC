-- Registo de emails transacionais. O índice único sobre tipo e referência garante
-- que a mesma notificação não sai duas vezes, mesmo que o webhook seja repetido.

create table emails_enviados (
  id uuid primary key default gen_random_uuid(),
  tipo text not null
    check (tipo in ('notificacao_interna', 'confirmacao_cliente', 'orcamento')),
  destinatario text not null,
  referencia_id uuid not null,
  referencia_tabela text not null,
  estado text not null check (estado in ('enviado', 'falhado')),
  resend_id text,
  erro text,
  criado_em timestamptz not null default now()
);

create unique index emails_enviados_unico_idx on emails_enviados (tipo, referencia_id);
create index emails_enviados_criado_idx on emails_enviados (criado_em desc);

alter table emails_enviados enable row level security;

create policy "emails leitura autenticada"
  on emails_enviados for select to authenticated using (tem_acesso_gestao());

revoke all on emails_enviados from anon;
