import { json } from "../_lib/util.js";

// Seguimiento público: el requirente consulta con su folio + correo quién es el responsable y en qué estado va.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const folio = (url.searchParams.get("folio") || "").trim().toUpperCase();
  const correo = (url.searchParams.get("correo") || "").trim().toLowerCase();
  if (!folio || !correo) return json({ error: "Ingrese folio y correo" }, 400);

  const row = await env.DB.prepare(
    `SELECT s.id, s.folio, s.creado, s.titulo, s.unidad, s.estado, s.comprador, s.asignado, s.cerrado,
            s.fecha_requerida, s.prioridad, c.correo AS comprador_correo
       FROM solicitudes s LEFT JOIN compradores c ON c.nombre = s.comprador
      WHERE s.folio = ? AND s.correo = ?`
  ).bind(folio, correo).first();
  if (!row) return json({ error: "No encontramos una solicitud con ese folio y correo" }, 404);

  const { results } = await env.DB.prepare(
    "SELECT fecha, accion, detalle FROM historial WHERE solicitud_id=? AND accion NOT IN ('Descarga PDF') ORDER BY id"
  ).bind(row.id).all();
  delete row.id;
  return json({ ...row, historial: results });
}
