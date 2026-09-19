-- A calculadora precisa de guardar a lead no passo 5 e de a atualizar se a pessoa
-- voltar atrás e recalcular. A forma óbvia, inserir e reler o id devolvido, obrigaria
-- a dar SELECT a anónimos nesta tabela — e com o id em mão qualquer pessoa poderia
-- alterar a lead de outra durante a janela de duas horas.
--
-- Em vez disso, o id passa a ser gerado no cliente e a linha nunca é relida.

grant insert (id) on leads_calculadora to anon;
revoke select (id) on leads_calculadora from anon;
