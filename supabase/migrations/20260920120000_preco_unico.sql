-- A calculadora do site nunca mostrou preços ao visitante: é um funil de angariação,
-- só recolhe dados para a ALC contactar depois. Ter um mínimo e um máximo sugeria uma
-- gama de venda que nunca existiu para o cliente, e complicava sem necessidade o
-- catálogo interno. Fica um preço de referência único por trabalho.

-- 1. A vista depende das colunas a mudar em ambas as tabelas: sai primeiro -------

drop view leads_unificadas;

-- 2. Catálogo de tipos de trabalho ---------------------------------------------

alter table precos_unitarios drop column preco_max_cents;
alter table precos_unitarios rename column preco_min_cents to preco_cents;

-- 3. Estimativa interna gravada na lead (nunca mostrada ao cliente) --------------

alter table leads_calculadora drop column valor_max_cents;
alter table leads_calculadora rename column valor_min_cents to valor_estimado_cents;

-- 4. Vista unificada: o conjunto de colunas mudou, recriar -----------------------

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
    null::integer as valor_estimado_cents,
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
    l.valor_estimado_cents,
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

-- 5. Função que grava a lead da calculadora: a assinatura muda, recriar ----------

drop function if exists gravar_lead_calculadora(
  uuid, text, text, text, text, text, numeric, text[], text, integer, integer, text
);

create function gravar_lead_calculadora(
  p_id uuid,
  p_nome text,
  p_telefone text,
  p_email text,
  p_localidade text,
  p_tipo_espaco text,
  p_area_m2 numeric,
  p_trabalhos text[],
  p_estado_espaco text,
  p_valor_cents integer,
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
    estado_espaco, valor_estimado_cents, consentimento, consentimento_texto
  )
  values (
    p_id, btrim(p_nome), btrim(p_telefone), btrim(p_email), btrim(p_localidade),
    p_tipo_espaco, p_area_m2, coalesce(p_trabalhos, '{}'), p_estado_espaco,
    greatest(0, coalesce(p_valor_cents, 0)),
    true, p_consentimento_texto
  )
  -- Só a própria sessão, e só enquanto a ALC ainda não lhe pegou.
  on conflict (id) do update set
    nome = excluded.nome,
    telefone = excluded.telefone,
    email = excluded.email,
    localidade = excluded.localidade,
    tipo_espaco = excluded.tipo_espaco,
    area_m2 = excluded.area_m2,
    trabalhos = excluded.trabalhos,
    estado_espaco = excluded.estado_espaco,
    valor_estimado_cents = excluded.valor_estimado_cents
  where leads_calculadora.criado_em > now() - interval '2 hours'
    and leads_calculadora.estado = 'novo';
end;
$$;

revoke all on function gravar_lead_calculadora(
  uuid, text, text, text, text, text, numeric, text[], text, integer, text
) from public;

grant execute on function gravar_lead_calculadora(
  uuid, text, text, text, text, text, numeric, text[], text, integer, text
) to anon, authenticated;
