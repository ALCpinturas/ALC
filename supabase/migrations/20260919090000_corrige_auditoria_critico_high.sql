-- Correções da auditoria de segurança (2026-09-19).
--
-- 1. CRÍTICO: escalada de privilégio em "perfis".
-- 2. HIGH: apagar uma obra destruía em cascata a prova de consentimento RGPD.

-- 1. Impede a auto-promoção a administrador -------------------------------------
--
-- A política "perfil proprio editavel" (20260915120100_perfis.sql) restringe a LINHA
-- que pode ser alterada (id = auth.uid()) mas nunca restringiu a COLUNA. Qualquer conta
-- autenticada, incluindo uma conta 'equipa', conseguia correr a partir do browser:
--
--   update perfis set papel = 'admin' where id = auth.uid()
--
-- e o RLS deixava passar, dando-lhe acesso total de administrador (apagar clientes e
-- obras, criar outras contas admin via a função "criar-utilizador"). Este gatilho fecha
-- essa via: só uma conta já admin pode alterar o papel de um perfil, incluindo o próprio.

create or replace function impedir_auto_promocao()
returns trigger
language plpgsql
as $$
begin
  if new.papel is distinct from old.papel and not e_admin() then
    raise exception 'Não tem permissão para alterar o papel.';
  end if;
  return new;
end;
$$;

create trigger perfis_impede_auto_promocao
  before update on perfis
  for each row execute function impedir_auto_promocao();

-- 2. Protege a autorização de publicação (RGPD) ao apagar uma obra ---------------
--
-- "autorizacoes_publicacao.obra_id" apagava em cascata: remover uma obra apagava
-- também a prova de consentimento para publicar as fotos do cliente, sem que isso
-- retirasse as fotos já publicadas em "obras_publicas_imagens" — ficavam publicadas
-- sem autorização registada. Passa a ser preciso remover primeiro, de forma explícita,
-- a autorização (e só um administrador o pode fazer) antes de a obra poder ser apagada.

alter table autorizacoes_publicacao
  drop constraint autorizacoes_publicacao_obra_id_fkey,
  add constraint autorizacoes_publicacao_obra_id_fkey
    foreign key (obra_id) references obras (id) on delete restrict;

create policy "autorizacoes remocao admin"
  on autorizacoes_publicacao for delete to authenticated using (e_admin());
