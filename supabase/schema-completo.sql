-- ALC — esquema completo.
-- Concatenação das migrations por ordem, para colar no SQL Editor do Supabase.
-- A fonte de verdade continua a ser supabase/migrations/. Não editar este ficheiro à mão.


-- ============================================================
-- 20260915120000_site_publico.sql
-- ============================================================

-- Camada de dados do site público: portefólio, pedidos de contacto, tabelas de preços
-- e leads da calculadora. Inclui já as colunas de consentimento do RGPD, porque a
-- inserção anónima nunca deve ser possível sem consentimento registado.

create extension if not exists pgcrypto;

-- Portefólio -----------------------------------------------------------------

create table obras_publicas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  localidade text,
  tipo_intervencao text not null
    check (tipo_intervencao in ('pintura', 'pladur', 'pavimentos', 'acabamentos', 'remodelacao')),
  descricao text,
  imagem_capa text,
  ordem integer not null default 0,
  visivel boolean not null default true,
  criado_em timestamptz not null default now()
);

create table obras_publicas_imagens (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras_publicas (id) on delete cascade,
  url text not null,
  categoria text check (categoria in ('antes', 'durante', 'depois')),
  legenda text,
  ordem integer not null default 0
);

create index obras_publicas_visivel_idx on obras_publicas (visivel, ordem);
create index obras_publicas_tipo_idx on obras_publicas (tipo_intervencao);
create index obras_publicas_imagens_obra_idx on obras_publicas_imagens (obra_id, ordem);

-- Pedidos vindos do formulário ------------------------------------------------

create table pedidos_contacto (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text not null,
  localidade text not null,
  tipo_intervencao text not null
    check (tipo_intervencao in ('pintura', 'pladur', 'pavimentos', 'acabamentos', 'remodelacao')),
  area_m2 numeric(10, 2),
  mensagem text not null,
  fotografias text[] not null default '{}',
  estado text not null default 'novo'
    check (estado in ('novo', 'contactado', 'orcamentado', 'fechado')),
  notas_internas text,
  consentimento boolean not null default false,
  consentimento_texto text,
  consentimento_em timestamptz default now(),
  primeiro_contacto_em timestamptz,
  criado_em timestamptz not null default now()
);

create index pedidos_contacto_criado_idx on pedidos_contacto (criado_em desc);
create index pedidos_contacto_estado_idx on pedidos_contacto (estado);
create index pedidos_contacto_tipo_idx on pedidos_contacto (tipo_intervencao);

-- Tabelas de preço da calculadora ---------------------------------------------

create table precos_unitarios (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  descricao text not null,
  unidade text not null check (unidade in ('m2', 'ml', 'un', 'vg')),
  preco_min_cents integer not null default 0 check (preco_min_cents >= 0),
  preco_max_cents integer not null default 0 check (preco_max_cents >= 0),
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);

create table coeficientes_estado (
  chave text primary key,
  descricao text not null,
  multiplicador numeric(4, 2) not null default 1.0 check (multiplicador > 0)
);

-- Valores a zero de propósito: preencher no painel do Supabase com preços reais.
-- Com preços a zero a calculadora devolve zero, que é melhor do que inventar um número.
insert into precos_unitarios (chave, descricao, unidade) values
  ('pintura', 'Pintura', 'm2'),
  ('tetos_falsos', 'Tetos falsos', 'm2'),
  ('divisorias', 'Divisórias', 'm2'),
  ('pavimento', 'Pavimento', 'm2'),
  ('acabamentos', 'Acabamentos', 'm2'),
  ('remodelacao_geral', 'Remodelação geral', 'm2'),
  ('rodape', 'Rodapé', 'ml'),
  ('estuque', 'Estuque', 'm2'),
  ('preparacao_superficie', 'Preparação de superfície', 'm2');

insert into coeficientes_estado (chave, descricao, multiplicador) values
  ('bom', 'Bom', 1.0),
  ('algumas_reparacoes', 'Necessita de algumas reparações', 1.0),
  ('intervencao_significativa', 'Necessita de intervenção significativa', 1.0);

-- Leads da calculadora ---------------------------------------------------------

create table leads_calculadora (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text not null,
  localidade text not null,
  tipo_espaco text not null check (tipo_espaco in ('apartamento', 'moradia', 'comercial', 'outro')),
  area_m2 numeric(10, 2) not null,
  trabalhos text[] not null default '{}',
  estado_espaco text not null,
  valor_min_cents integer not null default 0,
  valor_max_cents integer not null default 0,
  estado text not null default 'novo'
    check (estado in ('novo', 'contactado', 'orcamentado', 'fechado')),
  notas_internas text,
  consentimento boolean not null default false,
  consentimento_texto text,
  consentimento_em timestamptz default now(),
  primeiro_contacto_em timestamptz,
  criado_em timestamptz not null default now()
);

create index leads_calculadora_criado_idx on leads_calculadora (criado_em desc);
create index leads_calculadora_estado_idx on leads_calculadora (estado);

-- Marca o instante em que a lead deixou de estar em "novo". Sem isto não há forma
-- honesta de medir o tempo até ao primeiro contacto.
create or replace function marcar_primeiro_contacto()
returns trigger
language plpgsql
as $$
begin
  if old.estado = 'novo' and new.estado <> 'novo' and new.primeiro_contacto_em is null then
    new.primeiro_contacto_em := now();
  end if;
  return new;
end;
$$;

create trigger pedidos_primeiro_contacto
  before update on pedidos_contacto
  for each row execute function marcar_primeiro_contacto();

create trigger leads_primeiro_contacto
  before update on leads_calculadora
  for each row execute function marcar_primeiro_contacto();

-- Row Level Security -----------------------------------------------------------

alter table obras_publicas enable row level security;
alter table obras_publicas_imagens enable row level security;
alter table pedidos_contacto enable row level security;
alter table precos_unitarios enable row level security;
alter table coeficientes_estado enable row level security;
alter table leads_calculadora enable row level security;

create policy "portefolio visivel para todos"
  on obras_publicas for select to anon, authenticated
  using (visivel = true or auth.role() = 'authenticated');

create policy "portefolio escrita autenticada"
  on obras_publicas for all to authenticated
  using (true) with check (true);

create policy "imagens de obras visiveis"
  on obras_publicas_imagens for select to anon, authenticated
  using (
    exists (
      select 1 from obras_publicas o
      where o.id = obra_id and (o.visivel = true or auth.role() = 'authenticated')
    )
  );

create policy "imagens escrita autenticada"
  on obras_publicas_imagens for all to authenticated
  using (true) with check (true);

create policy "precos leitura publica"
  on precos_unitarios for select to anon, authenticated using (ativo = true);

create policy "precos escrita autenticada"
  on precos_unitarios for all to authenticated using (true) with check (true);

create policy "coeficientes leitura publica"
  on coeficientes_estado for select to anon, authenticated using (true);

create policy "coeficientes escrita autenticada"
  on coeficientes_estado for all to authenticated using (true) with check (true);

-- Pedidos: inserção anónima com consentimento obrigatório, leitura só autenticada.
create policy "pedidos insercao anonima com consentimento"
  on pedidos_contacto for insert to anon
  with check (consentimento = true and consentimento_texto is not null);

create policy "pedidos leitura autenticada"
  on pedidos_contacto for select to authenticated using (true);

create policy "pedidos atualizacao autenticada"
  on pedidos_contacto for update to authenticated using (true) with check (true);

create policy "leads insercao anonima com consentimento"
  on leads_calculadora for insert to anon
  with check (consentimento = true and consentimento_texto is not null);

-- A calculadora atualiza a própria linha quando a pessoa recalcula. Janela curta,
-- para que uma linha antiga não possa ser alterada de fora.
create policy "leads atualizacao anonima recente"
  on leads_calculadora for update to anon
  using (criado_em > now() - interval '2 hours')
  with check (consentimento = true);

create policy "leads leitura autenticada"
  on leads_calculadora for select to authenticated using (true);

create policy "leads atualizacao autenticada"
  on leads_calculadora for update to authenticated using (true) with check (true);

-- Privilégios ao nível da coluna: o anónimo não escolhe estado nem notas internas.
revoke all on pedidos_contacto from anon;
grant insert (
  nome, telefone, email, localidade, tipo_intervencao,
  area_m2, mensagem, fotografias, consentimento, consentimento_texto
) on pedidos_contacto to anon;

revoke all on leads_calculadora from anon;
grant insert (
  nome, telefone, email, localidade, tipo_espaco, area_m2, trabalhos,
  estado_espaco, valor_min_cents, valor_max_cents, consentimento, consentimento_texto
) on leads_calculadora to anon;
grant update (
  nome, telefone, email, localidade, tipo_espaco, area_m2, trabalhos,
  estado_espaco, valor_min_cents, valor_max_cents
) on leads_calculadora to anon;
grant select (id) on leads_calculadora to anon;

-- Buckets de storage ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('obras-publicas', 'obras-publicas', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('pedidos-fotografias', 'pedidos-fotografias', false)
on conflict (id) do nothing;

create policy "obras publicas leitura publica"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'obras-publicas');

create policy "obras publicas escrita autenticada"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'obras-publicas');

create policy "pedidos fotografias upload anonimo"
  on storage.objects for insert to anon
  with check (bucket_id = 'pedidos-fotografias');

create policy "pedidos fotografias leitura autenticada"
  on storage.objects for select to authenticated
  using (bucket_id = 'pedidos-fotografias');


-- ============================================================
-- 20260915120100_perfis.sql
-- ============================================================

-- Perfis de utilizador do backoffice. Não há registo público: as contas são criadas
-- no painel do Supabase e o trigger cria o perfil correspondente.

create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default 'Sem nome',
  papel text not null default 'equipa' check (papel in ('admin', 'equipa')),
  criado_em timestamptz not null default now()
);

alter table perfis enable row level security;

create policy "perfil proprio legivel"
  on perfis for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from perfis p where p.id = auth.uid() and p.papel = 'admin'
  ));

create policy "perfil proprio editavel"
  on perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function criar_perfil_para_utilizador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_utilizador
  after insert on auth.users
  for each row execute function criar_perfil_para_utilizador();

-- Função auxiliar usada pelas políticas das tabelas de gestão.
create or replace function tem_acesso_gestao()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfis
    where id = auth.uid() and papel in ('admin', 'equipa')
  );
$$;

create or replace function e_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from perfis where id = auth.uid() and papel = 'admin');
$$;


-- ============================================================
-- 20260915120200_emails.sql
-- ============================================================

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


-- ============================================================
-- 20260915120300_gestao.sql
-- ============================================================

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


-- ============================================================
-- 20260915120400_orcamentos.sql
-- ============================================================

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


-- ============================================================
-- 20260915120500_vistas_metricas.sql
-- ============================================================

-- Vista unificada de leads e função de métricas. As duas correm com security_invoker,
-- ou com verificação explícita de permissão, para que o RLS das tabelas de base continue
-- a valer: uma vista não pode ser uma porta das traseiras.

create view leads_unificadas
with (security_invoker = on) as
  select
    p.id,
    'pedidos_contacto'::text as tabela,
    'formulario'::text as origem,
    p.nome,
    p.telefone,
    p.email,
    p.localidade,
    p.tipo_intervencao,
    null::text[] as trabalhos,
    p.area_m2,
    p.mensagem,
    null::integer as valor_min_cents,
    null::integer as valor_max_cents,
    p.estado,
    p.notas_internas,
    p.fotografias,
    p.primeiro_contacto_em,
    p.criado_em,
    c.id as cliente_id
  from pedidos_contacto p
  left join clientes c on c.lead_id = p.id and c.lead_tabela = 'pedidos_contacto'

  union all

  select
    l.id,
    'leads_calculadora'::text as tabela,
    'calculadora'::text as origem,
    l.nome,
    l.telefone,
    l.email,
    l.localidade,
    null::text as tipo_intervencao,
    l.trabalhos,
    l.area_m2,
    null::text as mensagem,
    l.valor_min_cents,
    l.valor_max_cents,
    l.estado,
    l.notas_internas,
    null::text[] as fotografias,
    l.primeiro_contacto_em,
    l.criado_em,
    c.id as cliente_id
  from leads_calculadora l
  left join clientes c on c.lead_id = l.id and c.lead_tabela = 'leads_calculadora';

revoke all on leads_unificadas from anon;
grant select on leads_unificadas to authenticated;

-- Métricas do período. Os limites chegam já em UTC, calculados no cliente a partir
-- da hora de parede em Europe/Lisbon, incluindo nos dias de mudança de hora.
create or replace function metricas_periodo(p_inicio timestamptz, p_fim timestamptz)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resultado json;
begin
  if not tem_acesso_gestao() then
    raise exception 'Sem permissão.';
  end if;

  select json_build_object(
    'leads_total', (
      select count(*) from leads_unificadas where criado_em between p_inicio and p_fim
    ),
    'leads_por_origem', coalesce((
      select json_agg(t) from (
        select origem, count(*)::integer as total
        from leads_unificadas
        where criado_em between p_inicio and p_fim
        group by origem
      ) t
    ), '[]'::json),
    'leads_por_estado', coalesce((
      select json_agg(t) from (
        select estado, count(*)::integer as total
        from leads_unificadas
        where criado_em between p_inicio and p_fim
        group by estado
      ) t
    ), '[]'::json),
    'leads_por_mes', coalesce((
      select json_agg(t order by t.mes) from (
        select
          to_char(criado_em at time zone 'Europe/Lisbon', 'MM/YYYY') as mes,
          count(*)::integer as total
        from leads_unificadas
        where criado_em between p_inicio and p_fim
        group by 1
      ) t
    ), '[]'::json),
    'obras_por_estado', coalesce((
      select json_agg(t) from (
        select estado, count(*)::integer as total from obras group by estado
      ) t
    ), '[]'::json),
    'valor_adjudicado_cents', coalesce((
      select sum(valor_adjudicado_cents)::integer from obras
      where estado in ('adjudicada', 'em_curso', 'concluida')
        and criado_em between p_inicio and p_fim
    ), 0),
    'valor_por_aceitar_cents', coalesce((
      select sum(total_cents)::integer from orcamentos where estado = 'enviado'
    ), 0),
    'orcamentos_emitidos', (
      select count(*) from orcamentos
      where data_emissao is not null
        and data_emissao between (p_inicio at time zone 'Europe/Lisbon')::date
                             and (p_fim at time zone 'Europe/Lisbon')::date
    ),
    'orcamentos_aceites', (
      select count(*) from orcamentos
      where estado = 'aceite' and atualizado_em between p_inicio and p_fim
    ),
    'mediana_horas_primeiro_contacto', (
      select percentile_cont(0.5) within group (
        order by extract(epoch from (primeiro_contacto_em - criado_em)) / 3600
      )
      from leads_unificadas
      where primeiro_contacto_em is not null and criado_em between p_inicio and p_fim
    )
  ) into v_resultado;

  return v_resultado;
end;
$$;


-- ============================================================
-- 20260915120600_calculadora_id_no_cliente.sql
-- ============================================================

-- A calculadora precisa de guardar a lead no passo 5 e de a atualizar se a pessoa
-- voltar atrás e recalcular. A forma óbvia, inserir e reler o id devolvido, obrigaria
-- a dar SELECT a anónimos nesta tabela — e com o id em mão qualquer pessoa poderia
-- alterar a lead de outra durante a janela de duas horas.
--
-- Em vez disso, o id passa a ser gerado no cliente e a linha nunca é relida.

grant insert (id) on leads_calculadora to anon;
revoke select (id) on leads_calculadora from anon;


-- ============================================================
-- 20260915120700_gravar_lead_por_funcao.sql
-- ============================================================

-- O visitante anónimo deixa de tocar diretamente em leads_calculadora.
--
-- Porquê: gravar a lead e depois atualizá-la quando a pessoa recalcula obrigava a dar
-- SELECT ao anónimo, porque o PostgREST precisa de ler a coluna para avaliar o filtro do
-- UPDATE. Com SELECT, qualquer pessoa poderia listar os ids das leads e sobrescrever as
-- dos outros dentro da janela de duas horas.
--
-- A função corre como dona da tabela, controla exatamente que colunas são escritas, e
-- impõe o consentimento e a janela de atualização no servidor, não no cliente.

revoke insert, update on leads_calculadora from anon;

drop policy if exists "leads insercao anonima com consentimento" on leads_calculadora;
drop policy if exists "leads atualizacao anonima recente" on leads_calculadora;

create or replace function gravar_lead_calculadora(
  p_id uuid,
  p_nome text,
  p_telefone text,
  p_email text,
  p_localidade text,
  p_tipo_espaco text,
  p_area_m2 numeric,
  p_trabalhos text[],
  p_estado_espaco text,
  p_valor_min_cents integer,
  p_valor_max_cents integer,
  p_consentimento_texto text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_consentimento_texto is null or length(btrim(p_consentimento_texto)) = 0 then
    raise exception 'É necessário aceitar a Política de Privacidade.';
  end if;

  if p_nome is null or length(btrim(p_nome)) < 2 then
    raise exception 'Nome inválido.';
  end if;

  insert into leads_calculadora (
    id, nome, telefone, email, localidade, tipo_espaco, area_m2, trabalhos,
    estado_espaco, valor_min_cents, valor_max_cents, consentimento, consentimento_texto
  )
  values (
    p_id, btrim(p_nome), btrim(p_telefone), btrim(p_email), btrim(p_localidade),
    p_tipo_espaco, p_area_m2, coalesce(p_trabalhos, '{}'), p_estado_espaco,
    greatest(0, coalesce(p_valor_min_cents, 0)), greatest(0, coalesce(p_valor_max_cents, 0)),
    true, p_consentimento_texto
  )
  on conflict (id) do update set
    nome = excluded.nome,
    telefone = excluded.telefone,
    email = excluded.email,
    localidade = excluded.localidade,
    tipo_espaco = excluded.tipo_espaco,
    area_m2 = excluded.area_m2,
    trabalhos = excluded.trabalhos,
    estado_espaco = excluded.estado_espaco,
    valor_min_cents = excluded.valor_min_cents,
    valor_max_cents = excluded.valor_max_cents
  -- Só a própria sessão, e só enquanto a ALC ainda não lhe pegou.
  where leads_calculadora.criado_em > now() - interval '2 hours'
    and leads_calculadora.estado = 'novo';
end;
$$;

revoke all on function gravar_lead_calculadora(
  uuid, text, text, text, text, text, numeric, text[], text, integer, integer, text
) from public;

grant execute on function gravar_lead_calculadora(
  uuid, text, text, text, text, text, numeric, text[], text, integer, integer, text
) to anon, authenticated;


-- ============================================================
-- 20260915120800_perfis_sem_recursao.sql
-- ============================================================

-- Corrige recursão infinita (42P17) na leitura de perfis.
--
-- A política anterior perguntava "este utilizador é admin?" com um subselect sobre a própria
-- tabela perfis. Esse subselect volta a passar pela política, que volta a fazer o subselect,
-- e o Postgres aborta. Na prática o backoffice nunca conseguia carregar o perfil de quem entra.
--
-- e_admin() é SECURITY DEFINER, corre como dona da tabela e não passa pelo RLS, por isso
-- responde à mesma pergunta sem reentrar na política.

drop policy if exists "perfil proprio legivel" on perfis;

create policy "perfil proprio legivel"
  on perfis for select to authenticated
  using (id = auth.uid() or e_admin());


-- ============================================================
-- 20260915120900_webhooks_leads.sql
-- ============================================================

-- Liga a criação de leads à Edge Function notificar-lead.
--
-- Equivale aos "Database Webhooks" do painel, mas fica versionado aqui em vez de viver
-- apenas em cliques. Os valores sensíveis não entram neste ficheiro: são lidos do Vault
-- por nome, e gravados fora do controlo de versões.
--
-- O pedido é assíncrono (pg_net enfileira), por isso uma falha de rede ou da função nunca
-- desfaz a inserção do pedido do cliente — que é o que interessa preservar.

create extension if not exists pg_net;

create or replace function notificar_lead_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  v_url text;
  v_segredo text;
  v_chave text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'webhook_url_notificar_lead';
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'webhook_secret';
  select decrypted_secret into v_chave from vault.decrypted_secrets where name = 'webhook_anon_key';

  if v_url is null or v_segredo is null then
    raise warning 'Webhook de leads por configurar: falta webhook_url_notificar_lead ou webhook_secret no Vault.';
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_chave, ''),
      'x-webhook-secret', v_segredo
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'record', to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

create trigger pedidos_contacto_notificar
  after insert on pedidos_contacto
  for each row execute function notificar_lead_webhook();

create trigger leads_calculadora_notificar
  after insert on leads_calculadora
  for each row execute function notificar_lead_webhook();

