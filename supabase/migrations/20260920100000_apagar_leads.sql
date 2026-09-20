-- A página de leads passa a ter apagar. Nenhuma das duas tabelas tinha política de
-- delete: sem esta migration, um "apagar" a partir do backoffice era recusado pelo RLS
-- em silêncio. Restrito a admin, como em clientes e obras: remover uma lead é
-- irreversível e a equipa não tem hoje outro sinal de que perdeu um pedido de contacto.

create policy "pedidos remocao admin"
  on pedidos_contacto for delete to authenticated using (e_admin());

create policy "leads remocao admin"
  on leads_calculadora for delete to authenticated using (e_admin());
