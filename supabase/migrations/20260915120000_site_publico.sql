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
