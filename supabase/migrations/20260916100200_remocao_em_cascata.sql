-- Corrige o bloqueio de linhas a impedir remoções legítimas.
--
-- O trigger existe para garantir que uma proposta enviada não muda: cria-se uma versão nova.
-- Mas ele também dispara quando as linhas são removidas em cascata, ao apagar o orçamento.
-- Nessa altura o orçamento já não existe, o select não encontra nada, e a comparação com
-- null dava sempre "diferente de rascunho" — a remoção rebentava.
--
-- Na prática, um orçamento emitido nunca podia ser apagado, e por arrasto também não a obra
-- nem o cliente a que estivesse ligado, nem sequer por um administrador.

create or replace function bloquear_linhas_fora_de_rascunho()
returns trigger
language plpgsql
as $$
declare
  v_estado text;
  v_orcamento uuid := coalesce(new.orcamento_id, old.orcamento_id);
begin
  select estado into v_estado from orcamentos where id = v_orcamento;

  -- O orçamento já não existe: isto é uma remoção em cascata, deixa passar.
  if not found then
    return coalesce(new, old);
  end if;

  if v_estado <> 'rascunho' then
    raise exception 'As linhas só podem ser alteradas enquanto o orçamento está em rascunho.';
  end if;

  return coalesce(new, old);
end;
$$;
