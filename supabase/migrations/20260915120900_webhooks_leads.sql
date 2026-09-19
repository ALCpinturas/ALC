-- Liga a criação de leads à Edge Function notificar-lead.
--
-- Equivale aos "Database Webhooks" do painel, mas fica versionado aqui em vez de viver
-- apenas em cliques. Os valores sensíveis não entram neste ficheiro: são lidos do Vault
-- por nome, e gravados fora do controlo de versões.
--
-- O pedido é assíncrono (pg_net enfileira), por isso uma falha de rede ou da função nunca
-- desfaz a inserção do pedido do cliente — que é o que interessa preservar.

create extension if not exists pg_net;

create or replace function notificar_lead_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  v_url text;
  v_segredo text;
  v_chave text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'webhook_url_notificar_lead';
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'webhook_secret';
  select decrypted_secret into v_chave from vault.decrypted_secrets where name = 'webhook_anon_key';

  if v_url is null or v_segredo is null then
    raise warning 'Webhook de leads por configurar: falta webhook_url_notificar_lead ou webhook_secret no Vault.';
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_chave, ''),
      'x-webhook-secret', v_segredo
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'record', to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

create trigger pedidos_contacto_notificar
  after insert on pedidos_contacto
  for each row execute function notificar_lead_webhook();

create trigger leads_calculadora_notificar
  after insert on leads_calculadora
  for each row execute function notificar_lead_webhook();
