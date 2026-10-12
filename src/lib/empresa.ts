/**
 * Identificação da ALC nos documentos e nas páginas legais.
 *
 * A ALC não é uma sociedade: é o nome com que trabalham três profissionais independentes,
 * cada um a passar recibos verdes. Isso tem duas consequências práticas:
 *
 * 1. O orçamento é emitido por uma pessoa singular, com o NIF dessa pessoa. `nif` abaixo é
 *    o NIF do sócio que emite, não de uma empresa, porque empresa não há.
 * 2. Nas páginas legais, o responsável pelo tratamento dos dados é essa mesma pessoa.
 *
 * Os marcadores POR PREENCHER aparecem tal e qual no PDF e nas páginas, de propósito:
 * é preferível um documento visivelmente incompleto a um documento com dados errados.
 */
export const EMPRESA = {
  nome: 'ALC',
  nomeCompleto: 'Alexandre Luís Carlitos',
  /** Sócio que emite os orçamentos e responde pelo tratamento dos dados. */
  responsavel: 'Nuno Alexandre Dias Padilha',
  /** NIF do sócio emitente, como pessoa singular. Guardado só com dígitos. */
  nif: '257877827',
  morada: 'Travessa Cruz das Almas, Ent. 4, 3.º',
  codigoPostal: '5000-507',
  localidade: 'Vila Real',
  telefone: '926 556 000',
  email: 'ALC.pinturas@proton.me',
  iban: 'PT50 0010 0000 5637 6720 0011 5',
  zonasServidas: 'Vila Real e arredores',
  facebook: 'https://www.facebook.com/share/14xQAdqD7kF/',
  instagram: 'https://www.instagram.com/lui.spadilha',
} as const

export const CONDICOES_ORCAMENTO_PADRAO = [
  'Os valores apresentados incluem mão de obra e materiais indicados em cada linha.',
  'Trabalhos não previstos neste orçamento serão objeto de proposta adicional.',
  'Pagamento: 50% na adjudicação, 50% na entrega da obra.',
  'O prazo de execução é confirmado na adjudicação e depende da disponibilidade de materiais.',
].join('\n')
