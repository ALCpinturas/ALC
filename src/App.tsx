import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import RotaProtegida from '@/components/admin/RotaProtegida'
import Home from '@/pages/Home'
import PoliticaPrivacidade from '@/pages/PoliticaPrivacidade'
import TermosCondicoes from '@/pages/TermosCondicoes'
import { AuthProvider } from '@/lib/auth'

// Todo o backoffice em import dinâmico: quem visita o site público não o descarrega.
const Layout = lazy(() => import('@/components/admin/Layout'))
const Login = lazy(() => import('@/pages/admin/Login'))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const Leads = lazy(() => import('@/pages/admin/Leads'))
const Clientes = lazy(() => import('@/pages/admin/Clientes'))
const ClienteDetalhe = lazy(() => import('@/pages/admin/ClienteDetalhe'))
const Obras = lazy(() => import('@/pages/admin/Obras'))
const ObraDetalhe = lazy(() => import('@/pages/admin/ObraDetalhe'))
const Portefolio = lazy(() => import('@/pages/admin/Portefolio'))
const PortefolioObra = lazy(() => import('@/pages/admin/PortefolioObra'))
const Orcamentos = lazy(() => import('@/pages/admin/Orcamentos'))
const OrcamentoEditor = lazy(() => import('@/pages/admin/OrcamentoEditor'))
const Configuracoes = lazy(() => import('@/pages/admin/Configuracoes'))
const TiposTrabalho = lazy(() => import('@/pages/admin/TiposTrabalho'))
const ImagensSite = lazy(() => import('@/pages/admin/ImagensSite'))
const Conta = lazy(() => import('@/pages/admin/Conta'))

function AEspera() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-alc-grey">
      <p className="text-sm text-alc-ink">A carregar…</p>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<AEspera />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
            <Route path="/termos-e-condicoes" element={<TermosCondicoes />} />
            <Route path="/admin/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <RotaProtegida>
                  <Layout />
                </RotaProtegida>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="leads" element={<Leads />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="clientes/:id" element={<ClienteDetalhe />} />
              <Route path="obras" element={<Obras />} />
              <Route path="obras/:id" element={<ObraDetalhe />} />
              <Route path="portefolio" element={<Portefolio />} />
              <Route path="portefolio/:id" element={<PortefolioObra />} />
              <Route path="orcamentos" element={<Orcamentos />} />
              <Route path="orcamentos/:id" element={<OrcamentoEditor />} />
              <Route path="configuracoes" element={<Configuracoes />}>
                <Route index element={<Navigate to="tipos-trabalho" replace />} />
                <Route path="tipos-trabalho" element={<TiposTrabalho />} />
                <Route path="imagens-site" element={<ImagensSite />} />
                <Route path="conta" element={<Conta />} />
              </Route>
            </Route>
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#1A1A1A',
              border: '1px solid #DDD9D6',
              borderRadius: '2px',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  )
}
