-- O orçamento passa a viver do cliente. A obra é opcional e liga-se depois.
--
-- Antes: para orçamentar era preciso criar primeiro uma obra, mesmo sem saber se o trabalho
-- ia acontecer. Isso enchia a lista de obras de propostas que nunca existiram e obrigava a
-- dois passos onde basta um. Agora orçamenta-se ao cliente e, se for aceite, cria-se a obra
-- a partir do orçamento, já com o valor adjudicado preenchido.

alter table orcamentos alter column obra_id drop not null;

-- As medições são tiradas para orçamentar, muitas vezes antes de existir obra.
alter table medicoes add column orcamento_id uuid references orcamentos (id) on delete cascade;
alter table medicoes alter column obra_id drop not null;
alter table medicoes
  add constraint medicoes_tem_dono check (orcamento_id is not null or obra_id is not null);

create index medicoes_orcamento_idx on medicoes (orcamento_id, ordem);
create index orcamentos_cliente_idx on orcamentos (cliente_id, criado_em desc);

-- Aceitar um orçamento sem obra deixa de ser um erro: adjudica o que houver para adjudicar.
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

  if not found then
    raise exception 'Orçamento não encontrado.';
  end if;

  update orcamentos set estado = 'aceite' where id = p_orcamento_id;

  if p_adjudicar and v_obra is not null then
    update obras
    set estado = 'adjudicada', valor_adjudicado_cents = v_total
    where id = v_obra;
  end if;

  return true;
end;
$$;

/**
 * Cria a obra a partir de um orçamento aceite, numa só transação.
 * Devolve o id da obra criada, ou da que já estava associada.
 */
create or replace function criar_obra_de_orcamento(
  p_orcamento_id uuid,
  p_titulo text,
  p_tipos_intervencao text[],
  p_morada text default null,
  p_localidade text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente uuid;
  v_obra uuid;
  v_total integer;
begin
  if not tem_acesso_gestao() then
    raise exception 'Sem permissão.';
  end if;

  select cliente_id, obra_id, total_cents into v_cliente, v_obra, v_total
  from orcamentos where id = p_orcamento_id;

  if v_cliente is null then
    raise exception 'Orçamento não encontrado.';
  end if;

  -- Idempotente: se já tem obra, devolve-a em vez de criar uma segunda.
  if v_obra is not null then
    return v_obra;
  end if;

  insert into obras (
    cliente_id, titulo, morada, localidade, tipos_intervencao,
    estado, valor_adjudicado_cents
  )
  values (
    v_cliente,
    coalesce(nullif(btrim(p_titulo), ''), 'Obra sem título'),
    p_morada,
    p_localidade,
    coalesce(p_tipos_intervencao, '{}'),
    'adjudicada',
    v_total
  )
  returning id into v_obra;

  update orcamentos set obra_id = v_obra where id = p_orcamento_id;

  return v_obra;
end;
$$;

/** Liga um orçamento a uma obra já existente, desde que sejam do mesmo cliente. */
create or replace function associar_orcamento_a_obra(p_orcamento_id uuid, p_obra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_orcamento uuid;
  v_cliente_obra uuid;
begin
  if not tem_acesso_gestao() then
    raise exception 'Sem permissão.';
  end if;

  select cliente_id into v_cliente_orcamento from orcamentos where id = p_orcamento_id;
  select cliente_id into v_cliente_obra from obras where id = p_obra_id;

  if v_cliente_orcamento is null then
    raise exception 'Orçamento não encontrado.';
  end if;
  if v_cliente_obra is null then
    raise exception 'Obra não encontrada.';
  end if;
  if v_cliente_orcamento <> v_cliente_obra then
    raise exception 'A obra é de outro cliente.';
  end if;

  update orcamentos set obra_id = p_obra_id where id = p_orcamento_id;
end;
$$;
