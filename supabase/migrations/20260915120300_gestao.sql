-- Clientes, obras, diário e fotografias de obra. Nada aqui é acessível sem sessão.

create table contadores (
  tipo text not null,
  ano integer not null,
  valor integer not null default 0,
  primary key (tipo, ano)
);

create or replace function proximo_numero(p_tipo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ano integer := extract(year from (now() at time zone 'Europe/Lisbon'))::integer;
  v_valor integer;
begin
  insert into contadores (tipo, ano, valor)
  values (p_tipo, v_ano, 1)
  on conflict (tipo, ano) do update set valor = contadores.valor + 1
  returning valor into v_valor;

  return v_ano || '-' || lpad(v_valor::text, 3, '0');
end;
$$;

-- Clientes ---------------------------------------------------------------------

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  nif text check (nif is null or nif ~ '^[0-9]{9}$'),
  morada text,
  codigo_postal text check (codigo_postal is null or codigo_postal ~ '^[0-9]{4}-[0-9]{3}$'),
  localidade text,
  notas text,
  origem text not null default 'outro'
    check (origem in ('formulario', 'calculadora', 'telefone', 'recomendacao', 'outro')),
  lead_id uuid,
  lead_tabela text check (lead_tabela in ('pedidos_contacto', 'leads_calculadora')),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);

create unique index clientes_lead_idx on clientes (lead_tabela, lead_id)
  where lead_id is not null;
create index clientes_nome_idx on clientes (nome);
create index clientes_criado_idx on clientes (criado_em desc);

-- Obras ------------------------------------------------------------------------

create table obras (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes (id) on delete restrict,
  numero text not null unique default proximo_numero('obra'),
  titulo text not null,
  morada text,
  localidade text,
  tipos_intervencao text[] not null default '{}',
  estado text not null default 'proposta'
    check (estado in ('proposta', 'adjudicada', 'em_curso', 'concluida', 'cancelada')),
  data_inicio date,
  data_fim_prevista date,
  data_fim_real date,
  valor_adjudicado_cents integer check (valor_adjudicado_cents is null or valor_adjudicado_cents >= 0),
  notas text,
  obra_publica_id uuid references obras_publicas (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index obras_cliente_idx on obras (cliente_id);
create index obras_estado_idx on obras (estado);
create index obras_criado_idx on obras (criado_em desc);
create index obras_fim_previsto_idx on obras (data_fim_prevista);

create or replace function marcar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger obras_atualizado_em
  before update on obras
  for each row execute function marcar_atualizado_em();

-- Diário -----------------------------------------------------------------------

create table obras_diario (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras (id) on delete cascade,
  autor_id uuid references auth.users (id) on delete set null,
  autor_nome text not null default 'ALC',
  texto text not null,
  criado_em timestamptz not null default now()
);

create index obras_diario_obra_idx on obras_diario (obra_id, criado_em desc);

-- Fotografias ------------------------------------------------------------------

create table obras_fotografias (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras (id) on delete cascade,
  storage_path text not null,
  categoria text check (categoria in ('antes', 'durante', 'depois')),
  legenda text,
  ordem integer not null default 0,
  largura integer,
  altura integer,
  carregado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);

create index obras_fotografias_obra_idx on obras_fotografias (obra_id, ordem);

-- Autorizações de publicação (RGPD) ---------------------------------------------

create table autorizacoes_publicacao (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras (id) on delete cascade,
  cliente_id uuid references clientes (id) on delete set null,
  autorizado_por text not null,
  meio text not null check (meio in ('escrito', 'verbal', 'email')),
  observacoes text,
  registado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);

-- Row Level Security -------------------------------------------------------------

alter table clientes enable row level security;
alter table obras enable row level security;
alter table obras_diario enable row level security;
alter table obras_fotografias enable row level security;
alter table autorizacoes_publicacao enable row level security;
alter table contadores enable row level security;

revoke all on clientes, obras, obras_diario, obras_fotografias, autorizacoes_publicacao, contadores from anon;

create policy "clientes gestao" on clientes for select to authenticated using (tem_acesso_gestao());
create policy "clientes escrita" on clientes for insert to authenticated with check (tem_acesso_gestao());
create policy "clientes atualizacao" on clientes for update to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());
create policy "clientes remocao admin" on clientes for delete to authenticated using (e_admin());

create policy "obras gestao" on obras for select to authenticated using (tem_acesso_gestao());
create policy "obras escrita" on obras for insert to authenticated with check (tem_acesso_gestao());
create policy "obras atualizacao" on obras for update to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());
create policy "obras remocao admin" on obras for delete to authenticated using (e_admin());

-- O diário é acumulado: há leitura e inserção, e não existem políticas de update
-- nem de delete, portanto a base de dados recusa as duas operações.
create policy "diario leitura" on obras_diario for select to authenticated using (tem_acesso_gestao());
create policy "diario insercao" on obras_diario for insert to authenticated with check (tem_acesso_gestao());

create policy "fotografias leitura" on obras_fotografias for select to authenticated using (tem_acesso_gestao());
create policy "fotografias insercao" on obras_fotografias for insert to authenticated with check (tem_acesso_gestao());
create policy "fotografias atualizacao" on obras_fotografias for update to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());
create policy "fotografias remocao" on obras_fotografias for delete to authenticated using (tem_acesso_gestao());

create policy "autorizacoes leitura" on autorizacoes_publicacao for select to authenticated using (tem_acesso_gestao());
create policy "autorizacoes insercao" on autorizacoes_publicacao for insert to authenticated with check (tem_acesso_gestao());

-- Bucket privado das fotografias de obra -------------------------------------------

insert into storage.buckets (id, name, public)
values ('obras-fotografias', 'obras-fotografias', false)
on conflict (id) do nothing;

create policy "obras fotografias leitura autenticada"
  on storage.objects for select to authenticated
  using (bucket_id = 'obras-fotografias' and tem_acesso_gestao());

create policy "obras fotografias escrita autenticada"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'obras-fotografias' and tem_acesso_gestao());

create policy "obras fotografias remocao autenticada"
  on storage.objects for delete to authenticated
  using (bucket_id = 'obras-fotografias' and tem_acesso_gestao());

-- Conversão de lead em cliente -------------------------------------------------------

create or replace function converter_lead_em_cliente(p_lead_id uuid, p_lead_tabela text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existente uuid;
  v_id uuid;
  v_nome text;
  v_telefone text;
  v_email text;
  v_localidade text;
  v_origem text;
begin
  if not tem_acesso_gestao() then
    raise exception 'Sem permissão.';
  end if;

  if p_lead_tabela not in ('pedidos_contacto', 'leads_calculadora') then
    raise exception 'Origem de lead desconhecida.';
  end if;

  -- Idempotente: se já foi convertida, devolve o cliente existente.
  select id into v_existente from clientes
  where lead_id = p_lead_id and lead_tabela = p_lead_tabela;
  if v_existente is not null then
    return v_existente;
  end if;

  if p_lead_tabela = 'pedidos_contacto' then
    select nome, telefone, email, localidade, 'formulario'
      into v_nome, v_telefone, v_email, v_localidade, v_origem
    from pedidos_contacto where id = p_lead_id;
  else
    select nome, telefone, email, localidade, 'calculadora'
      into v_nome, v_telefone, v_email, v_localidade, v_origem
    from leads_calculadora where id = p_lead_id;
  end if;

  if v_nome is null then
    raise exception 'Lead não encontrada.';
  end if;

  insert into clientes (nome, telefone, email, localidade, origem, lead_id, lead_tabela, criado_por)
  values (v_nome, v_telefone, v_email, v_localidade, v_origem, p_lead_id, p_lead_tabela, auth.uid())
  returning id into v_id;

  if p_lead_tabela = 'pedidos_contacto' then
    update pedidos_contacto set estado = 'contactado' where id = p_lead_id and estado = 'novo';
  else
    update leads_calculadora set estado = 'contactado' where id = p_lead_id and estado = 'novo';
  end if;

  return v_id;
end;
$$;
