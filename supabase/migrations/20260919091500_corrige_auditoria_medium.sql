-- Correções MEDIUM da auditoria de 2026-09-19: índices em falta, consistência dos
-- totais de orçamento, e políticas de escrita alinhadas com tem_acesso_gestao().

-- 1. Índices em falta em chaves estrangeiras --------------------------------------

create index if not exists obras_obra_publica_idx on obras (obra_publica_id);
create index if not exists autorizacoes_obra_idx on autorizacoes_publicacao (obra_id);
create index if not exists autorizacoes_cliente_idx on autorizacoes_publicacao (cliente_id);

-- 2. Consistência dos totais do orçamento -------------------------------------------
--
-- src/lib/calculo/orcamento.ts é a única fonte de verdade destes valores, mas
-- "orcamentos"/"orcamento_linhas" são graváveis diretamente por qualquer sessão com
-- acesso de gestão (não só através dessa função). Sem estas constraints, um bug no
-- cliente podia gravar um orçamento com totais internamente inconsistentes, que
-- depois seguia para um PDF entregue ao cliente.

alter table orcamentos
  add constraint orcamentos_subtotal_positivo check (subtotal_cents >= 0),
  add constraint orcamentos_iva_positivo check (iva_cents >= 0),
  add constraint orcamentos_total_positivo check (total_cents >= 0),
  add constraint orcamentos_desconto_no_subtotal check (desconto_cents <= subtotal_cents);

-- "not valid": aplica-se de imediato a qualquer escrita nova, mas não obriga a validar
-- já as linhas existentes. Evita que esta migration falhe por causa de um orçamento
-- antigo que não bata certo ao cêntimo (ex. anterior a um ajuste de arredondamento).
-- Para validar os dados já existentes mais tarde, correr à parte:
--   alter table orcamentos validate constraint orcamentos_total_consistente;
alter table orcamentos
  add constraint orcamentos_total_consistente
    check (total_cents = subtotal_cents - desconto_cents + iva_cents) not valid;

alter table orcamento_linhas
  add constraint orcamento_linhas_total_positivo check (total_linha_cents >= 0);

-- 3. Políticas de escrita alinhadas com tem_acesso_gestao() -------------------------
--
-- Estas tabelas ficaram com "using (true) with check (true)" em vez do padrão usado
-- em todo o resto do esquema. Inofensivo enquanto toda a conta autenticada for staff
-- (a criação de conta está fechada, só passa por "criar-utilizador"), mas frágil: se
-- alguma vez existir um tipo de conta autenticada não-staff (ex. portal de cliente),
-- isto passaria a ser uma fronteira de autorização em falta.

drop policy "portefolio escrita autenticada" on obras_publicas;
create policy "portefolio escrita autenticada"
  on obras_publicas for all to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());

drop policy "imagens escrita autenticada" on obras_publicas_imagens;
create policy "imagens escrita autenticada"
  on obras_publicas_imagens for all to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());

drop policy "precos escrita autenticada" on precos_unitarios;
create policy "precos escrita autenticada"
  on precos_unitarios for all to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());

drop policy "coeficientes escrita autenticada" on coeficientes_estado;
create policy "coeficientes escrita autenticada"
  on coeficientes_estado for all to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());

drop policy "leads atualizacao autenticada" on leads_calculadora;
create policy "leads atualizacao autenticada"
  on leads_calculadora for update to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());

drop policy "obras publicas escrita autenticada" on storage.objects;
create policy "obras publicas escrita autenticada"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'obras-publicas' and tem_acesso_gestao());

drop policy "obras publicas remocao autenticada" on storage.objects;
create policy "obras publicas remocao autenticada"
  on storage.objects for delete to authenticated
  using (bucket_id = 'obras-publicas' and tem_acesso_gestao());
