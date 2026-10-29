import { json } from "../../_lib/util.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT id, nombre, correo, activo FROM compradores ORDER BY activo DESC, nombre").all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  const nombre = String(b.nombre || "").trim().slice(0, 100);
  const correo = String(b.correo || "").trim().slice(0, 120);
  if (!nombre) return json({ error: "Nombre obligatorio" }, 400);
  try {
    await env.DB.prepare("INSERT INTO compradores (nombre, correo) VALUES (?,?)").bind(nombre, correo).run();
  } catch {
    return json({ error: "Ya existe un comprador con ese nombre" }, 409);
  }
  return json({ ok: true });
}

export async function onRequestPatch({ request, env }) {
  const b = await request.json().catch(() => ({}));
  await env.DB.prepare("UPDATE compradores SET activo=? WHERE id=?").bind(b.activo ? 1 : 0, Number(b.id)).run();
  return json({ ok: true });
}
