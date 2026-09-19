import { mensagemErro } from '@/lib/supabase'

export type EstadoItemFila = 'pendente' | 'a_enviar' | 'concluido' | 'falhado'

export interface ItemFilaBase {
  id: string
  obraId: string
  nome: string
  estado: EstadoItemFila
  progresso: number
  tentativas: number
  erro: string | null
  ficheiro: File
}

type Ouvinte<T> = (itens: T[]) => void

const CONCORRENCIA = 2
const TENTATIVAS_MAXIMAS = 3
const ESPERA_BASE_MS = 1500

/**
 * Fila de upload genérica, em módulo e não em componente: sobrevive à navegação dentro
 * da aplicação. Nada é descartado em silêncio — um ficheiro que falha três vezes fica
 * visível em falha, com repetição manual. `enviarUm` faz o trabalho específico de cada
 * fila (comprimir, subir ao balde certo, inserir na tabela certa).
 */
export class FilaUploadBase<T extends ItemFilaBase> {
  private itens: T[] = []
  private ouvintes = new Set<Ouvinte<T>>()
  private aCorrer = 0

  constructor(
    private readonly criarItem: (obraId: string, ficheiro: File) => T,
    private readonly enviarUm: (item: T, atualizarProgresso: (progresso: number) => void) => Promise<void>,
  ) {}

  subscrever(ouvinte: Ouvinte<T>): () => void {
    this.ouvintes.add(ouvinte)
    ouvinte(this.itens)
    return () => this.ouvintes.delete(ouvinte)
  }

  private notificar() {
    const copia = [...this.itens]
    for (const ouvinte of this.ouvintes) ouvinte(copia)
  }

  private atualizar(id: string, mudancas: Partial<T>) {
    this.itens = this.itens.map((item) => (item.id === id ? { ...item, ...mudancas } : item))
    this.notificar()
  }

  adicionar(obraId: string, ficheiros: File[]): void {
    const novos = ficheiros.map((ficheiro) => this.criarItem(obraId, ficheiro))
    this.itens = [...this.itens, ...novos]
    this.notificar()
    void this.processar()
  }

  repetir(id: string): void {
    this.atualizar(id, { estado: 'pendente', erro: null, tentativas: 0 } as Partial<T>)
    void this.processar()
  }

  limparConcluidos(): void {
    this.itens = this.itens.filter((item) => item.estado !== 'concluido')
    this.notificar()
  }

  private async processar(): Promise<void> {
    while (this.aCorrer < CONCORRENCIA) {
      const seguinte = this.itens.find((item) => item.estado === 'pendente')
      if (!seguinte) return
      this.aCorrer += 1
      this.atualizar(seguinte.id, { estado: 'a_enviar', progresso: 5 } as Partial<T>)
      void this.enviar(seguinte).finally(() => {
        this.aCorrer -= 1
        void this.processar()
      })
    }
  }

  private async enviar(item: T): Promise<void> {
    for (let tentativa = 1; tentativa <= TENTATIVAS_MAXIMAS; tentativa += 1) {
      try {
        this.atualizar(item.id, { tentativas: tentativa, progresso: 15 } as Partial<T>)
        await this.enviarUm(item, (progresso) =>
          this.atualizar(item.id, { progresso } as Partial<T>),
        )
        this.atualizar(item.id, { estado: 'concluido', progresso: 100, erro: null } as Partial<T>)
        return
      } catch (erro) {
        if (tentativa === TENTATIVAS_MAXIMAS) {
          this.atualizar(item.id, { estado: 'falhado', erro: mensagemErro(erro) } as Partial<T>)
          return
        }
        await new Promise((resolver) => setTimeout(resolver, ESPERA_BASE_MS * tentativa))
      }
    }
  }
}
