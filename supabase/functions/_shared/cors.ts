// A autorização real destas funções é sempre feita a seguir, por JWT e papel do
// utilizador: o CORS aqui é só conveniência do browser, não fronteira de segurança.
// Por isso pode incluir o localhost de desenvolvimento sem abrir nada a mais.
const ORIGENS_DESENVOLVIMENTO = ['http://localhost:5173', 'http://127.0.0.1:5173']

export function cabecalhosCors(pedido: Request): HeadersInit {
  const origemSite = Deno.env.get('SITE_URL') ?? ''
  const origemPedido = pedido.headers.get('origin') ?? ''
  const origemPermitida = [origemSite, ...ORIGENS_DESENVOLVIMENTO].includes(origemPedido)
    ? origemPedido
    : origemSite || '*'

  return {
    'Access-Control-Allow-Origin': origemPermitida,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}
