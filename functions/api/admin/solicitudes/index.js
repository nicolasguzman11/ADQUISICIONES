import { json } from "../../../_lib/util.js";

export async function onRequestGet({ request, env }) {
  const incompletas = new URL(request.url).searchParams.get("incompletas") === "1";
  const { results } = await env.DB.prepare(
    `SELECT id, folio, creado, actualizado, solicitante, correo, unidad, titulo, tipo, prioridad,
            fecha_requerida, monto, estado, comprador, asignado, cerrado, pdf_bytes
       FROM solicitudes ${incompletas ? "" : "WHERE estado != 'Pendiente de PDF'"}
      ORDER BY id DESC LIMIT 5000`
  ).all();
  return json(results);
}
