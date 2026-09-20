-- Os orçamentos são sempre editáveis. Editar um que já foi enviado, aceite, recusado ou
-- expirado não pode alterar o que o cliente recebeu: cria-se uma versão nova em rascunho,
-- com o mesmo número, e é essa que se edita. A versão antiga fica intacta como histórico.

/**
 * Cria uma nova versão de um orçamento a partir de uma que já não está em rascunho.
 * Copia linhas e medições. A versão nova nasce em rascunho, sem data de emissão nem PDF,
 * pronta a editar. Devolve o id da nova versão.
 */
create or replace function criar_nova_versao_orcamento(p_orcamento_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orcamento orcamentos%rowtype;
  v_nova_id uuid;
  r_medicao record;
  v_nova_medicao_id uuid;
begin
  if not tem_acesso_gestao() then
    raise exception 'Sem permissão.';
  end if;

  select * into v_orcamento from orcamentos where id = p_orcamento_id;
  if not found then
    raise exception 'Orçamento não encontrado.';
  end if;

  if v_orcamento.estado = 'rascunho' then
    raise exception 'Este orçamento já está em rascunho e edita-se diretamente.';
  end if;

  insert into orcamentos (
    obra_id, cliente_id, numero, versao, estado, data_emissao, validade_dias,
    subtotal_cents, desconto_cents, iva_taxa, iva_cents, total_cents,
    condicoes, notas, pdf_path, criado_por
  )
  values (
    v_orcamento.obra_id, v_orcamento.cliente_id, v_orcamento.numero, v_orcamento.versao + 1,
    'rascunho', null, v_orcamento.validade_dias,
    v_orcamento.subtotal_cents, v_orcamento.desconto_cents, v_orcamento.iva_taxa,
    v_orcamento.iva_cents, v_orcamento.total_cents, v_orcamento.condicoes, null, null,
    auth.uid()
  )
  returning id into v_nova_id;

  insert into orcamento_linhas (
    orcamento_id, capitulo, ordem, descricao, unidade, quantidade,
    preco_unitario_cents, total_linha_cents
  )
  select v_nova_id, capitulo, ordem, descricao, unidade, quantidade,
    preco_unitario_cents, total_linha_cents
  from orcamento_linhas
  where orcamento_id = p_orcamento_id;

  -- As medições ligam-se ao orçamento (podem não ter obra ainda), por isso vêm com ele.
  -- Copiadas uma a uma porque medicoes_vaos precisa do novo id de cada medição.
  for r_medicao in
    select * from medicoes where orcamento_id = p_orcamento_id order by ordem
  loop
    insert into medicoes (
      orcamento_id, obra_id, divisao, comprimento_cm, largura_cm, pe_direito_cm, ordem, notas
    )
    values (
      v_nova_id, r_medicao.obra_id, r_medicao.divisao, r_medicao.comprimento_cm,
      r_medicao.largura_cm, r_medicao.pe_direito_cm, r_medicao.ordem, r_medicao.notas
    )
    returning id into v_nova_medicao_id;

    insert into medicoes_vaos (medicao_id, tipo, largura_cm, altura_cm, quantidade)
    select v_nova_medicao_id, tipo, largura_cm, altura_cm, quantidade
    from medicoes_vaos
    where medicao_id = r_medicao.id;
  end loop;

  return v_nova_id;
end;
$$;
