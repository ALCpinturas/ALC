-- Imagens fixas do site público (hero, sobre, serviços). O portefólio continua
-- em obras_publicas: ali as fotografias são de obras concretas, aqui são peças
-- de comunicação que a equipa troca quando quiser, sem mexer no código.

create table imagens_site (
  chave text primary key
    check (chave in (
      'hero',
      'sobre',
      'servico_pintura',
      'servico_pladur',
      'servico_pavimentos',
      'servico_acabamentos'
    )),
  url text not null,
  texto_alternativo text not null,
  storage_path text,
  atualizado_em timestamptz not null default now()
);

insert into imagens_site (chave, url, texto_alternativo) values
  (
    'hero',
    '/site/hero.jpg',
    'Sala renovada com paredes recém-pintadas, tecto em pladur e pavimento em madeira clara.'
  ),
  (
    'sobre',
    '/site/sobre.jpg',
    'Dois profissionais da ALC a trabalhar no acabamento de uma parede.'
  ),
  (
    'servico_pintura',
    '/site/servico-pintura.jpg',
    'Pintura interior: parede recém-pintada, rolo e tabuleiro de tinta.'
  ),
  (
    'servico_pladur',
    '/site/servico-pladur.jpg',
    'Montagem de tecto falso e divisória em pladur.'
  ),
  (
    'servico_pavimentos',
    '/site/servico-pavimentos.jpg',
    'Pavimento flutuante em madeira clara recém-aplicado.'
  ),
  (
    'servico_acabamentos',
    '/site/servico-acabamentos.jpg',
    'Pormenor de acabamento: rodapé e aros de porta alinhados com a parede.'
  );

alter table imagens_site enable row level security;

create policy "imagens do site leitura publica"
  on imagens_site for select to anon, authenticated
  using (true);

create policy "imagens do site escrita autenticada"
  on imagens_site for update to authenticated
  using (tem_acesso_gestao()) with check (tem_acesso_gestao());

insert into storage.buckets (id, name, public)
values ('site-imagens', 'site-imagens', true)
on conflict (id) do nothing;

create policy "site imagens leitura publica"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-imagens');

create policy "site imagens escrita autenticada"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-imagens' and tem_acesso_gestao());

create policy "site imagens remocao autenticada"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-imagens' and tem_acesso_gestao());
