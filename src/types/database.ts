/**
 * Espelho tipado do esquema em supabase/migrations.
 *
 * Verificado contra a base de dados real: as tabelas e vistas conferem, coluna a coluna
 * e incluindo nullability. Ao alterar uma migration, alterar também aqui e voltar a comparar.
 *
 * A geração automática (`npm run db:types`) precisa de Docker ou de um projeto ligado por
 * personal access token; nenhum dos dois estava disponível quando este ficheiro foi escrito.
 */

/** Colunas que aceitam null podem ser omitidas na inserção, tal como no Postgres. */
type ChavesNulaveis<Row> = {
  [K in keyof Row]-?: null extends Row[K] ? K : never
}[keyof Row]

type Opcionais<Row, Auto extends keyof Row> = Auto | ChavesNulaveis<Row>

type Tabela<Row, Auto extends keyof Row> = {
  Row: Row
  Insert: Omit<Row, Opcionais<Row, Auto>> & Partial<Pick<Row, Opcionais<Row, Auto>>>
  Update: Partial<Row>
  Relationships: []
}

export type TipoIntervencao = 'pintura' | 'pladur' | 'pavimentos' | 'acabamentos' | 'remodelacao'
export type EstadoLead = 'novo' | 'contactado' | 'orcamentado' | 'fechado'
export type TipoEspaco = 'apartamento' | 'moradia' | 'comercial' | 'outro'
export type CategoriaFoto = 'antes' | 'durante' | 'depois'
export type EstadoObra = 'proposta' | 'adjudicada' | 'em_curso' | 'concluida' | 'cancelada'
export type EstadoOrcamento = 'rascunho' | 'enviado' | 'aceite' | 'recusado' | 'expirado'
export type UnidadeLinha = 'm2' | 'ml' | 'un' | 'vg'
export type TipoVao = 'porta' | 'janela' | 'abertura'
export type PapelPerfil = 'admin' | 'equipa'
export type OrigemCliente = 'formulario' | 'calculadora' | 'telefone' | 'recomendacao' | 'outro'
export type TipoEmail = 'notificacao_interna' | 'confirmacao_cliente' | 'orcamento'
export type ChaveImagemSite =
  | 'hero'
  | 'sobre'
  | 'servico_pintura'
  | 'servico_pladur'
  | 'servico_pavimentos'
  | 'servico_acabamentos'

export type ObraPublicaRow = {
  id: string
  titulo: string
  localidade: string | null
  tipo_intervencao: TipoIntervencao
  descricao: string | null
  imagem_capa: string | null
  ordem: number
  visivel: boolean
  criado_em: string
}

export type ObraPublicaImagemRow = {
  id: string
  obra_id: string
  url: string
  storage_path: string | null
  categoria: CategoriaFoto | null
  legenda: string | null
  ordem: number
  visivel: boolean
}

export type PedidoContactoRow = {
  id: string
  nome: string
  telefone: string
  email: string
  localidade: string
  tipo_intervencao: TipoIntervencao
  area_m2: number | null
  mensagem: string
  fotografias: string[]
  estado: EstadoLead
  notas_internas: string | null
  consentimento: boolean
  consentimento_texto: string | null
  consentimento_em: string | null
  primeiro_contacto_em: string | null
  criado_em: string
}

export type PrecoUnitarioRow = {
  id: string
  chave: string
  descricao: string
  capitulo: string
  unidade: UnidadeLinha
  preco_min_cents: number
  preco_max_cents: number
  ativo: boolean
  ordem: number
  atualizado_em: string
}

export type CoeficienteEstadoRow = {
  chave: string
  descricao: string
  multiplicador: number
}

export type LeadCalculadoraRow = {
  id: string
  nome: string
  telefone: string
  email: string
  localidade: string
  tipo_espaco: TipoEspaco
  area_m2: number
  trabalhos: string[]
  estado_espaco: string
  valor_min_cents: number
  valor_max_cents: number
  estado: EstadoLead
  notas_internas: string | null
  consentimento: boolean
  consentimento_texto: string | null
  consentimento_em: string | null
  primeiro_contacto_em: string | null
  criado_em: string
}

export type PerfilRow = {
  id: string
  nome: string
  papel: PapelPerfil
  criado_em: string
}

export type EmailEnviadoRow = {
  id: string
  tipo: TipoEmail
  destinatario: string
  referencia_id: string
  referencia_tabela: string
  estado: 'enviado' | 'falhado'
  resend_id: string | null
  erro: string | null
  criado_em: string
}

export type ClienteRow = {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  nif: string | null
  morada: string | null
  codigo_postal: string | null
  localidade: string | null
  notas: string | null
  origem: OrigemCliente
  lead_id: string | null
  lead_tabela: string | null
  criado_por: string | null
  criado_em: string
}

export type ObraRow = {
  id: string
  cliente_id: string
  numero: string
  titulo: string
  morada: string | null
  localidade: string | null
  tipos_intervencao: TipoIntervencao[]
  estado: EstadoObra
  data_inicio: string | null
  data_fim_prevista: string | null
  data_fim_real: string | null
  valor_adjudicado_cents: number | null
  notas: string | null
  obra_publica_id: string | null
  criado_em: string
  atualizado_em: string
}

export type ObraDiarioRow = {
  id: string
  obra_id: string
  autor_id: string | null
  autor_nome: string
  texto: string
  criado_em: string
}

export type ObraFotografiaRow = {
  id: string
  obra_id: string
  storage_path: string
  categoria: CategoriaFoto | null
  legenda: string | null
  ordem: number
  largura: number | null
  altura: number | null
  carregado_por: string | null
  criado_em: string
}

export type MedicaoRow = {
  id: string
  obra_id: string | null
  orcamento_id: string | null
  divisao: string
  comprimento_cm: number
  largura_cm: number
  pe_direito_cm: number
  ordem: number
  notas: string | null
  criado_em: string
}

export type MedicaoVaoRow = {
  id: string
  medicao_id: string
  tipo: TipoVao
  largura_cm: number
  altura_cm: number
  quantidade: number
}

export type OrcamentoRow = {
  id: string
  obra_id: string | null
  cliente_id: string
  numero: string
  versao: number
  estado: EstadoOrcamento
  data_emissao: string | null
  validade_dias: number
  subtotal_cents: number
  desconto_cents: number
  iva_taxa: number
  iva_cents: number
  total_cents: number
  condicoes: string | null
  notas: string | null
  pdf_path: string | null
  criado_por: string | null
  criado_em: string
  atualizado_em: string
}

export type OrcamentoLinhaRow = {
  id: string
  orcamento_id: string
  capitulo: string
  ordem: number
  descricao: string
  unidade: UnidadeLinha
  quantidade: number
  preco_unitario_cents: number
  total_linha_cents: number
}

export type ImagemSiteRow = {
  chave: ChaveImagemSite
  url: string
  texto_alternativo: string
  storage_path: string | null
  atualizado_em: string
}

export type AutorizacaoPublicacaoRow = {
  id: string
  obra_id: string
  cliente_id: string | null
  autorizado_por: string
  meio: 'escrito' | 'verbal' | 'email'
  observacoes: string | null
  registado_por: string | null
  criado_em: string
}

/** Vista que junta pedidos_contacto e leads_calculadora, para paginação e filtros no servidor. */
export type LeadUnificada = {
  id: string
  tabela: 'pedidos_contacto' | 'leads_calculadora'
  origem: 'formulario' | 'calculadora'
  nome: string
  telefone: string
  email: string
  localidade: string
  tipo_intervencao: TipoIntervencao | null
  trabalhos: string[] | null
  area_m2: number | null
  mensagem: string | null
  valor_min_cents: number | null
  valor_max_cents: number | null
  estado: EstadoLead
  notas_internas: string | null
  fotografias: string[] | null
  primeiro_contacto_em: string | null
  criado_em: string
  cliente_id: string | null
}

export type MetricasPeriodo = {
  leads_total: number
  leads_por_origem: { origem: string; total: number }[]
  leads_por_estado: { estado: string; total: number }[]
  leads_por_mes: { mes: string; total: number }[]
  obras_por_estado: { estado: string; total: number }[]
  valor_adjudicado_cents: number
  valor_por_aceitar_cents: number
  orcamentos_emitidos: number
  orcamentos_aceites: number
  mediana_horas_primeiro_contacto: number | null
}

export type Database = {
  public: {
    Tables: {
      obras_publicas: Tabela<ObraPublicaRow, 'id' | 'criado_em' | 'ordem' | 'visivel'>
      obras_publicas_imagens: Tabela<ObraPublicaImagemRow, 'id' | 'ordem' | 'visivel'>
      pedidos_contacto: Tabela<
        PedidoContactoRow,
        'id' | 'criado_em' | 'estado' | 'notas_internas' | 'fotografias' | 'consentimento_em'
      >
      precos_unitarios: Tabela<PrecoUnitarioRow, 'id' | 'atualizado_em' | 'ativo' | 'ordem' | 'capitulo'>
      coeficientes_estado: Tabela<CoeficienteEstadoRow, never>
      leads_calculadora: Tabela<
        LeadCalculadoraRow,
        'id' | 'criado_em' | 'estado' | 'notas_internas' | 'consentimento_em'
      >
      perfis: Tabela<PerfilRow, 'criado_em'>
      emails_enviados: Tabela<EmailEnviadoRow, 'id' | 'criado_em'>
      clientes: Tabela<ClienteRow, 'id' | 'criado_em' | 'criado_por'>
      obras: Tabela<ObraRow, 'id' | 'numero' | 'criado_em' | 'atualizado_em' | 'estado'>
      obras_diario: Tabela<ObraDiarioRow, 'id' | 'criado_em'>
      obras_fotografias: Tabela<ObraFotografiaRow, 'id' | 'criado_em' | 'ordem'>
      medicoes: Tabela<MedicaoRow, 'id' | 'criado_em' | 'ordem'>
      medicoes_vaos: Tabela<MedicaoVaoRow, 'id'>
      orcamentos: Tabela<
        OrcamentoRow,
        'id' | 'numero' | 'versao' | 'estado' | 'criado_em' | 'atualizado_em'
      >
      orcamento_linhas: Tabela<OrcamentoLinhaRow, 'id' | 'ordem'>
      autorizacoes_publicacao: Tabela<AutorizacaoPublicacaoRow, 'id' | 'criado_em'>
      imagens_site: Tabela<ImagemSiteRow, 'atualizado_em' | 'storage_path'>
    }
    Views: {
      leads_unificadas: { Row: LeadUnificada; Relationships: [] }
    }
    Functions: {
      converter_lead_em_cliente: {
        Args: { p_lead_id: string; p_lead_tabela: string }
        Returns: string
      }
      metricas_periodo: {
        Args: { p_inicio: string; p_fim: string }
        Returns: MetricasPeriodo
      }
      aceitar_orcamento: {
        Args: { p_orcamento_id: string; p_adjudicar: boolean }
        Returns: boolean
      }
      criar_obra_de_orcamento: {
        Args: {
          p_orcamento_id: string
          p_titulo: string
          p_tipos_intervencao: TipoIntervencao[]
          p_morada?: string | null
          p_localidade?: string | null
        }
        Returns: string
      }
      associar_orcamento_a_obra: {
        Args: { p_orcamento_id: string; p_obra_id: string }
        Returns: undefined
      }
      gravar_lead_calculadora: {
        Args: {
          p_id: string
          p_nome: string
          p_telefone: string
          p_email: string
          p_localidade: string
          p_tipo_espaco: TipoEspaco
          p_area_m2: number
          p_trabalhos: string[]
          p_estado_espaco: string
          p_valor_min_cents: number
          p_valor_max_cents: number
          p_consentimento_texto: string
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
