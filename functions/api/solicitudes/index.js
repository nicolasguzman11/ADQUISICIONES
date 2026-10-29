import { json, ahora, hoyChile, token, validarSolicitud, registrar } from "../../_lib/util.js";

// Paso 1: el requirente envía el formulario (datos + manifiesto de documentos).
// Si TODO está completo, se crea el folio y se entrega un token para subir el PDF consolidado.
export async function onRequestPost({ request, env }) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > 400000) return json({ errores: ["Solicitud demasiado grande"] }, 413);

  let body;
  try { body = await request.json(); } catch { return json({ errores: ["Formato inválido"] }, 400); }

  const v = validarSolicitud(body);
  if (v.errores.length) return json({ errores: v.errores }, 422);

  const d = v.datos;
  const creado = ahora();
  const tk = token();
  const r = await env.DB.prepare(
    `INSERT INTO solicitudes (creado, actualizado, solicitante, correo, unidad, titulo, tipo, prioridad,
      fecha_requerida, monto, datos, documentos, estado, token) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    creado, creado, d.nombre, d.correo.toLowerCase(), d.unidad, d.titulo, d.tipo, d.prioridad,
    d.fecha_requerida, v.monto, JSON.stringify({ datos: d, items: v.items }), JSON.stringify(v.documentos),
    "Pendiente de PDF", tk
  ).run();

  const id = r.meta.last_row_id;
  const folio = `SC-${hoyChile().slice(0, 4)}-${String(id).padStart(5, "0")}`;
  await env.DB.prepare("UPDATE solicitudes SET folio=? WHERE id=?").bind(folio, id).run();
  await registrar(env, id, d.nombre, "Formulario recibido", "Esperando PDF consolidado");

  return json({ id, folio, creado, token: tk, monto: v.monto });
}
