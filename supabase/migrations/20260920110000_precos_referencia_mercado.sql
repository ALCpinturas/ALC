-- Preços de referência por m² (ou por ml no rodapé), com base em preços médios praticados
-- em Portugal em 2026 para mão de obra + material ("tudo incluído"), já que é o valor que
-- a calculadora do site soma diretamente para mostrar uma gama ao cliente, e o mesmo valor
-- que pré-preenche uma linha de orçamento em src/components/admin/GerarLinhas.tsx.
--
-- Fontes de mercado consultadas (pesquisa de preços praticados em Portugal): Habitissimo,
-- Zaask, Fixando, CYPE geradordeprecos.info, FixHome e Casas LSF, cruzadas por categoria.
-- Nenhum valor é uma cotação de fornecedor: são médias de mercado a rever com a experiência
-- real da ALC em obra assim que houver dados próprios.
--
-- "remodelacao_geral" é o valor mais incerto: as fontes de mercado para "remodelação" falam
-- de obra completa (cozinha, casa de banho, eletricidade, canalização), fora do âmbito da
-- ALC (pintura, tetos falsos, divisórias, pavimentos, acabamentos). Em vez disso, o intervalo
-- aqui aproxima a soma das frentes de serviço da ALC aplicadas à mesma área, para não inflar
-- a estimativa com trabalhos que a empresa não faz.

update precos_unitarios set preco_min_cents = dados.min_cents, preco_max_cents = dados.max_cents
from (values
  ('pintura', 600, 1200),
  ('preparacao_superficie', 800, 1500),
  ('estuque', 1000, 1600),
  ('tetos_falsos', 2000, 3500),
  ('divisorias', 1800, 3200),
  ('pavimento', 2000, 4000),
  ('rodape', 600, 1200),
  ('acabamentos', 1500, 3000),
  ('remodelacao_geral', 8000, 16000)
) as dados(chave, min_cents, max_cents)
where precos_unitarios.chave = dados.chave
  and precos_unitarios.preco_min_cents = 0
  and precos_unitarios.preco_max_cents = 0;
