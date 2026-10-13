-- Contas ocultas: um perfil com oculto = true continua a funcionar (papel, permissões,
-- sessão), mas não aparece na lista de contas aos outros administradores.
--
-- A política de leitura passa a mostrar a cada utilizador o próprio perfil e, a um admin,
-- os perfis que não estão ocultos. Como a regra vive no RLS, vale também para qualquer
-- consulta ou junção à tabela perfis, não só para a página de contas.

alter table perfis add column oculto boolean not null default false;

drop policy if exists "perfil proprio legivel" on perfis;

create policy "perfil proprio legivel"
  on perfis for select to authenticated
  using (id = auth.uid() or (e_admin() and not oculto));

-- Ninguém muda a própria marca de oculto pela API: só por SQL, com acesso ao projeto.
create or replace function impedir_alterar_oculto()
returns trigger
language plpgsql
as $$
begin
  if new.oculto is distinct from old.oculto and auth.uid() is not null then
    raise exception 'O campo oculto só pode ser alterado diretamente na base de dados.';
  end if;
  return new;
end;
$$;

create trigger perfis_oculto_protegido
  before update on perfis
  for each row execute function impedir_alterar_oculto();
