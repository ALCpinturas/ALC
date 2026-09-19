-- O catálogo de tipos de trabalho passa a ser gerível pela aplicação.
--
-- É a mesma tabela que a calculadora do site já usa para os preços de referência. Ao dar-lhe
-- ordem e capítulo, serve também de origem para o menu de escolha ao criar linhas de
-- orçamento: escolhe-se o trabalho e a descrição, a unidade e o preço vêm preenchidos.

alter table precos_unitarios add column ordem integer not null default 0;
alter table precos_unitarios add column capitulo text not null default 'Trabalhos';

update precos_unitarios set ordem = dados.ordem, capitulo = dados.capitulo
from (values
  ('pintura', 10, 'Pintura'),
  ('preparacao_superficie', 20, 'Pintura'),
  ('estuque', 30, 'Pintura'),
  ('tetos_falsos', 40, 'Tetos falsos e divisórias'),
  ('divisorias', 50, 'Tetos falsos e divisórias'),
  ('pavimento', 60, 'Pavimentos'),
  ('rodape', 70, 'Pavimentos'),
  ('acabamentos', 80, 'Acabamentos'),
  ('remodelacao_geral', 90, 'Remodelação geral')
) as dados(chave, ordem, capitulo)
where precos_unitarios.chave = dados.chave;

create index precos_unitarios_ordem_idx on precos_unitarios (ativo, ordem);

-- A calculadora do site só precisa de ler os que estão ativos; a política de leitura
-- anónima já existe e continua a valer. A escrita continua a exigir sessão.
