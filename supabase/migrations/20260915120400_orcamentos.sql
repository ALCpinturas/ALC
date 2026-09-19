-- Medições e orçamentos. Todo o dinheiro em cêntimos inteiros, sem exceção.

create table medicoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras (id) on delete cascade,
  divisao text not null,
  comprimento_cm integer not null check (comprimento_cm > 0),
  largura_cm integer not null check (largura_cm > 0),
  pe_direito_cm integer not null check (pe_direito_cm > 0),
  ordem integer not null default 0,
  notas text,
  criado_em timestamptz not null default now()
);

create table medicoes_vaos (
  id uuid primary key default gen_random_uuid(),
  medicao_id uuid not null references medicoes (id) on delete cascade,
  tipo text not null check (tipo in ('porta', 'janela', 'abertura')),
  largura_cm integer not null check (largura_cm > 0),
  altura_cm integer not null check (altura_cm > 0),
  quantidade integer not null default 1 check (quantidade > 0)
);

create index medicoes_obra_idx on medicoes (obra_id, ordem);
create index medicoes_vaos_medicao_idx on medicoes_vaos (medicao_id);

create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete restrict,
  numero text not null default proximo_numero('orcamento'),
  versao integer not null default 1,
  estado text not null default 'rascunho'
    check (estado in ('rascunho', 'enviado', 'aceite', 'recusado', 'expirado')),
  data_emissao date,
  validade_dias integer not null default 30 check (validade_dias > 0),
  subtotal_cents integer not null default 0,
  desconto_cents integer not null default 0 check (desconto_cents >= 0),
  iva_taxa numeric(4, 1) not null default 23 check (iva_taxa >= 0),
  iva_cents integer not null default 0,
  total_cents integer not null default 0,
  condicoes text,
  notas text,
  pdf_path text,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (numero, versao)
);

create index orcamentos_obra_idx on orcamentos (obra_id, criado_em desc);
create index orcamentos_estado_idx on orcamentos (estado);

create trigger orcamentos_atualizado_em
  before update on orcamentos
  for each row execute function marcar_atualizado_em();

create table orcamento_linhas (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos (id) on delete cascade,
  capitulo text not null default 'Trabalhos',
  ordem integer not null default 0,
  descricao text not null,
  unidade text not null check (unidade in ('m2', 'ml', 'un', 'vg')),
  quantidade numeric(12, 3) not null check (quantidade >= 0),
  preco_unitario_cents integer not null check (preco_unitario_cents >= 0),
  total_linha_cents integer not null
);

create index orcamento_linhas_orcamento_idx on orcamento_linhas (orcamento_id, ordem);

-- Uma proposta enviada não muda. Cria-se uma versão nova.
create or replace function bloquear_linhas_fora_de_rascunho()
returns trigger
language plpgsql
as $$
declare
  v_estado text;
  v_orcamento uuid := coalesce(new.orcamento_id, old.orcamento_id);
begin
  select estado into v_estado from orcamentos where id = v_orcamento;
  if v_estado is distinct from 'rascunho' then
    raise exception 'As linhas só podem ser alteradas enquanto o orçamento está em rascunho.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger orcamento_linhas_so_rascunho
  before insert or update or delete on orcamento_linhas
  for each row execute function bloquear_linhas_fora_de_rascunho();

-- Row Level Security ---------------------------------------------------------------

alter table medicoes enable row level security;
alter table medicoes_vaos enable row level security;
alter table orcamentos enable row level security;
alter table orcamento_linhas enable row level security;

revoke all on medicoes, medicoes_vaos, orcamentos, orcamento_linhas from anon;

create policy "medicoes gestao" on medicoes for all to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());
create policy "vaos gestao" on medicoes_vaos for all to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());
create policy "orcamentos gestao" on orcamentos for all to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());
create policy "linhas gestao" on orcamento_linhas for all to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());

-- Bucket privado dos PDF ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('orcamentos', 'orcamentos', false)
on conflict (id) do nothing;

create policy "orcamentos leitura autenticada"
  on storage.objects for select to authenticated
  using (bucket_id = 'orcamentos' and tem_acesso_gestao());

create policy "orcamentos escrita autenticada"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'orcamentos' and tem_acesso_gestao());

create policy "orcamentos substituicao autenticada"
  on storage.objects for update to authenticated
  using (bucket_id = 'orcamentos' and tem_acesso_gestao())
  with check (bucket_id = 'orcamentos' and tem_acesso_gestao());

-- Aceitar orçamento e adjudicar a obra numa só transação -------------------------------

create or replace function aceitar_orcamento(p_orcamento_id uuid, p_adjudicar boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obra uuid;
  v_total integer;
begin
  if not tem_acesso_gestao() then
    raise exception 'Sem permissão.';
  end if;

  select obra_id, total_cents into v_obra, v_total
  from orcamentos where id = p_orcamento_id;

  if v_obra is null then
    raise exception 'Orçamento não encontrado.';
  end if;

  update orcamentos set estado = 'aceite' where id = p_orcamento_id;

  if p_adjudicar then
    update obras
    set estado = 'adjudicada', valor_adjudicado_cents = v_total
    where id = v_obra;
  end if;

  return true;
end;
$$;
