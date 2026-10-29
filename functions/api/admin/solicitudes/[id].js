import { CONFIG } from "../../../_lib/config.js";
import { json, ahora, registrar } from "../../../_lib/util.js";

async function cargar(env, id) {
  return env.DB.prepare("SELECT * FROM solicitudes WHERE id=?").bind(Number(id)).first();
}

export async function onRequestGet({ env, params }) {
  const row = await cargar(env, params.id);
  if (!row) return json({ error: "No encontrada" }, 404);
  delete row.token;
  row.datos = JSON.parse(row.datos || "{}");
  row.documentos = JSON.parse(row.documentos || "{}");
  const { results } = await env.DB.prepare("SELECT fecha, usuario, accion, detalle FROM historial WHERE solicitud_id=? ORDER BY id").bind(row.id).all();
  row.historial = results;
  return json(row);
}

// Asignar responsable, cambiar estado y/o comentar. Todo queda en el historial con el usuario.
export async function onRequestPatch({ request, env, params, data }) {
  const row = await cargar(env, params.id);
  if (!row || row.estado === "Pendiente de PDF") return json({ error: "No encontrada" }, 404);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Formato inválido" }, 400); }

  const user = data.user;
  const t = ahora();
  const sets = [], binds = [], acciones = [];
  const comentario = String(body.comentario || "").trim().slice(0, 1000);
  let comprador = row.comprador;

  if (body.comprador !== undefined && (body.comprador || null) !== (row.comprador || null)) {
    const nuevo = String(body.comprador || "").trim() || null;
    if (nuevo) {
      const c = await env.DB.prepare("SELECT nombre FROM compradores WHERE nombre=? AND activo=1").bind(nuevo).first();
      if (!c) return json({ error: "Comprador no válido o inactivo" }, 400);
    }
    comprador = nuevo;
    sets.push("comprador=?", "asignado=?");
    binds.push(nuevo, nuevo ? t : null);
    acciones.push([
      nuevo ? (row.comprador ? "Reasignada" : "Asignada") : "Responsable removido",
      nuevo ? `Responsable: ${nuevo}${row.comprador ? ` (antes: ${row.comprador})` : ""}` : `Antes: ${row.comprador}`,
    ]);
  }

  let estado = body.estado ? String(body.estado) : null;
  if (!estado && comprador && !row.comprador && row.estado === "Ingresada") estado = "Asignada";
  if (estado && estado !== row.estado) {
    if (!CONFIG.estados.includes(estado)) return json({ error: "Estado no válido" }, 400);
    if (CONFIG.estadosConResponsable.includes(estado) && !comprador)
      return json({ error: "Primero asigne un comprador responsable" }, 400);
    if (CONFIG.estadosConComentario.includes(estado) && !comentario)
      return json({ error: `El estado "${estado}" requiere un comentario` }, 400);
    sets.push("estado=?", "cerrado=?");
    binds.push(estado, CONFIG.estadosCierre.includes(estado) ? t : null);
    acciones.push(["Cambio de estado", `${row.estado} → ${estado}${comentario ? ` · ${comentario}` : ""}`]);
  } else if (comentario) {
    acciones.push(["Comentario", comentario]);
  }

  if (!acciones.length) return json({ error: "Sin cambios" }, 400);
  if (sets.length) {
    sets.push("actualizado=?");
    binds.push(t, row.id);
    await env.DB.prepare(`UPDATE solicitudes SET ${sets.join(", ")} WHERE id=?`).bind(...binds).run();
  }
  for (const [a, d] of acciones) await registrar(env, row.id, user, a, d);
  return json({ ok: true });
}
