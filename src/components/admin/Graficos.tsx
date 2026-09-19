import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EstadoVazio } from '@/components/ui/Estados'
import { corDaSerie, COR_EIXO, COR_GRELHA, ESTILO_TOOLTIP, TAMANHO_EIXO } from '@/lib/chart-theme'
import { ROTULO_ESTADO_OBRA } from '@/lib/schemas/comum'
import type { EstadoObra, MetricasPeriodo } from '@/types/database'

const EIXO = { fontSize: TAMANHO_EIXO, fill: COR_EIXO }

export default function Graficos({ metricas }: { metricas: MetricasPeriodo }) {
  const porMes = metricas.leads_por_mes ?? []
  const porOrigem = metricas.leads_por_origem ?? []
  const porEstadoObra = (metricas.obras_por_estado ?? []).map((item) => ({
    ...item,
    rotulo: ROTULO_ESTADO_OBRA[item.estado as EstadoObra] ?? item.estado,
  }))

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="border border-alc-line bg-white p-4 lg:col-span-2">
        <h2 className="mb-4 font-display text-lg text-alc-black">Leads por mês</h2>
        {porMes.length === 0 ? (
          <EstadoVazio titulo="Sem leads neste período." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porMes}>
              <CartesianGrid stroke={COR_GRELHA} vertical={false} />
              <XAxis dataKey="mes" tick={EIXO} axisLine={{ stroke: COR_GRELHA }} tickLine={false} />
              <YAxis tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={ESTILO_TOOLTIP} cursor={{ fill: COR_GRELHA }} />
              <Bar dataKey="total" name="Leads" fill={corDaSerie(3)} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="border border-alc-line bg-white p-4">
        <h2 className="mb-4 font-display text-lg text-alc-black">Origem</h2>
        {porOrigem.length === 0 ? (
          <EstadoVazio titulo="Sem leads neste período." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={porOrigem} dataKey="total" nameKey="origem" innerRadius={45} outerRadius={80}>
                {porOrigem.map((item, indice) => (
                  <Cell key={item.origem} fill={corDaSerie(indice)} />
                ))}
              </Pie>
              <Tooltip contentStyle={ESTILO_TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="border border-alc-line bg-white p-4 lg:col-span-3">
        <h2 className="mb-4 font-display text-lg text-alc-black">Obras por estado</h2>
        {porEstadoObra.length === 0 ? (
          <EstadoVazio titulo="Ainda não há obras registadas." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porEstadoObra} layout="vertical">
              <CartesianGrid stroke={COR_GRELHA} horizontal={false} />
              <XAxis type="number" tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="rotulo"
                width={110}
                tick={EIXO}
                axisLine={{ stroke: COR_GRELHA }}
                tickLine={false}
              />
              <Tooltip contentStyle={ESTILO_TOOLTIP} cursor={{ fill: COR_GRELHA }} />
              <Bar dataKey="total" name="Obras" fill={corDaSerie(4)} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  )
}
