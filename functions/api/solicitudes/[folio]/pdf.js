import { CONFIG } from "../../../_lib/config.js";
import { json, ahora, registrar } from "../../../_lib/util.js";

// Paso 2: el navegador del requirente sube el PDF consolidado (formulario + todos los anexos).
export async function onRequestPut({ request, env, params }) {
  const folio = String(params.folio || "");
  const tk = request.headers.get("x-token") || "";
  const row = await env.DB.prepare("SELECT id, token, estado, solicitante FROM solicitudes WHERE folio=?").bind(folio).first();
  if (!row || !row.token || row.token !== tk || row.estado !== "Pendiente de PDF")
    return json({ error: "No autorizado o la solicitud ya fue enviada" }, 403);

  const buf = await request.arrayBuffer();
  if (buf.byteLength < 500 || buf.byteLength > (CONFIG.maxMBTotal + 10) * 1048576)
    return json({ error: "Tamaño de PDF inválido" }, 413);
  if (new TextDecoder().decode(new Uint8Array(buf, 0, 5)) !== "%PDF-")
    return json({ error: "El archivo recibido no es un PDF" }, 415);

  const key = `solicitudes/${folio.slice(3, 7)}/${folio}.pdf`;
  await env.ARCHIVOS.put(key, buf, { httpMetadata: { contentType: "application/pdf" }, customMetadata: { folio } });
  await env.DB.prepare("UPDATE solicitudes SET estado='Ingresada', token=NULL, pdf_key=?, pdf_bytes=?, actualizado=? WHERE id=?")
    .bind(key, buf.byteLength, ahora(), row.id).run();
  await registrar(env, row.id, row.solicitante, "Ingresada", `PDF consolidado recibido (${(buf.byteLength / 1048576).toFixed(1)} MB)`);
  return json({ ok: true, folio });
}
