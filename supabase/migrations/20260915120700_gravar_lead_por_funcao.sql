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
