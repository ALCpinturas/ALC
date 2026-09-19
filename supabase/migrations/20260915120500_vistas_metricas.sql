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
