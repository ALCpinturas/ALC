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
