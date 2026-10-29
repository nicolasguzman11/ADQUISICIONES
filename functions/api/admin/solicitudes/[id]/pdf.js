import { json, registrar } from "../../../../_lib/util.js";

export async function onRequestGet({ request, env, params, data }) {
  const row = await env.DB.prepare("SELECT id, folio, pdf_key FROM solicitudes WHERE id=?").bind(Number(params.id)).first();
  if (!row || !row.pdf_key) return json({ error: "PDF no disponible" }, 404);
  const obj = await env.ARCHIVOS.get(row.pdf_key);
  if (!obj) return json({ error: "PDF no encontrado en almacenamiento" }, 404);
  const ver = new URL(request.url).searchParams.get("ver") === "1";
  await registrar(env, row.id, data.user, "Descarga PDF", ver ? "Visualización" : "Descarga");
  return new Response(obj.body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${ver ? "inline" : "attachment"}; filename="${row.folio}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
