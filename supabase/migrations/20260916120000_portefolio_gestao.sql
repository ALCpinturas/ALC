-- Gestão direta do portefólio: cada fotografia pode ficar oculta sem esconder a obra
-- toda, e passa a guardar o caminho no balde para poder ser apagada de vez.

alter table obras_publicas_imagens add column storage_path text;
alter table obras_publicas_imagens add column visivel boolean not null default true;

create index obras_publicas_imagens_visivel_idx on obras_publicas_imagens (obra_id, visivel, ordem);

drop policy "imagens de obras visiveis" on obras_publicas_imagens;

create policy "imagens de obras visiveis"
  on obras_publicas_imagens for select to anon, authenticated
  using (
    auth.role() = 'authenticated'
    or (
      visivel = true
      and exists (select 1 from obras_publicas o where o.id = obra_id and o.visivel = true)
    )
  );

-- Faltava a remoção: sem esta política uma fotografia apagada na aplicação ficava
-- órfã no balde, porque a política de storage só cobria leitura e escrita.
create policy "obras publicas remocao autenticada"
  on storage.objects for delete to authenticated
  using (bucket_id = 'obras-publicas');
