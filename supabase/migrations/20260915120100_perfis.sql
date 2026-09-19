-- Perfis de utilizador do backoffice. Não há registo público: as contas são criadas
-- no painel do Supabase e o trigger cria o perfil correspondente.

create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default 'Sem nome',
  papel text not null default 'equipa' check (papel in ('admin', 'equipa')),
  criado_em timestamptz not null default now()
);

alter table perfis enable row level security;

create policy "perfil proprio legivel"
  on perfis for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from perfis p where p.id = auth.uid() and p.papel = 'admin'
  ));

create policy "perfil proprio editavel"
  on perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function criar_perfil_para_utilizador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_utilizador
  after insert on auth.users
  for each row execute function criar_perfil_para_utilizador();

-- Função auxiliar usada pelas políticas das tabelas de gestão.
create or replace function tem_acesso_gestao()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from perfis
    where id = auth.uid() and papel in ('admin', 'equipa')
  );
$$;

create or replace function e_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from perfis where id = auth.uid() and papel = 'admin');
$$;
