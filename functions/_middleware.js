// Protege el panel de compradores y la API de administración.
// Usuarios: variable de entorno PANEL_USERS con formato "usuario:clave;usuario2:clave2"
// Opcional: USE_ACCESS="1" si el sitio está detrás de Cloudflare Access (Zero Trust).
const PROTEGIDO = [/^\/comprador(\.html)?\/?$/, /^\/api\/admin\//];

function usuarioBasic(request, lista) {
  const h = request.headers.get("Authorization") || "";
  if (!h.startsWith("Basic ") || !lista) return null;
  let dec;
  try { dec = atob(h.slice(6)); } catch { return null; }
  const i = dec.indexOf(":");
  if (i < 1) return null;
  const u = dec.slice(0, i), p = dec.slice(i + 1);
  for (const par of String(lista).split(";")) {
    const j = par.indexOf(":");
    if (j > 0 && par.slice(0, j).trim() === u && par.slice(j + 1).trim() === p) return u;
  }
  return null;
}

export async function onRequest(ctx) {
  const { pathname } = new URL(ctx.request.url);
  if (!PROTEGIDO.some((r) => r.test(pathname))) return ctx.next();

  let user = null;
  if (ctx.env.USE_ACCESS === "1") user = ctx.request.headers.get("Cf-Access-Authenticated-User-Email");
  if (!user) user = usuarioBasic(ctx.request, ctx.env.PANEL_USERS);
  if (!user) {
    return new Response("Acceso restringido al equipo de Abastecimiento", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="ADQUISICIONES", charset="UTF-8"', "content-type": "text/plain; charset=utf-8" },
    });
  }
  ctx.data.user = user;
  const res = await ctx.next();
  const r = new Response(res.body, res);
  r.headers.set("cache-control", "no-store");
  return r;
}
