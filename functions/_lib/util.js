import { CONFIG } from "./config.js";

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export const ahora = () => new Date().toISOString();
export const hoyChile = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
export const token = () => crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

export function rutValido(rut) {
  const s = String(rut || "").replace(/[.\s-]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(s)) return false;
  const cuerpo = s.slice(0, -1), dv = s.slice(-1);
  let suma = 0, m = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) { suma += Number(cuerpo[i]) * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (suma % 11);
  return (r === 11 ? "0" : r === 10 ? "K" : String(r)) === dv;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarSolicitud(body) {
  const errores = [];
  const datos = {};
  const entrada = (body && body.datos) || {};

  for (const sec of CONFIG.secciones) {
    for (const c of sec.campos) {
      const v = String(entrada[c.id] ?? "").trim();
      datos[c.id] = v;
      if (!v) { errores.push(`${c.label}: es obligatorio`); continue; }
      if (c.max && v.length > c.max) errores.push(`${c.label}: máximo ${c.max} caracteres`);
      if (c.min && v.length < c.min) errores.push(`${c.label}: mínimo ${c.min} caracteres`);
      if (c.tipo === "email" && !EMAIL.test(v)) errores.push(`${c.label}: correo inválido`);
      if (c.tipo === "rut" && !rutValido(v)) errores.push(`${c.label}: RUT inválido`);
      if (c.tipo === "select" && !c.opciones.includes(v)) errores.push(`${c.label}: opción no válida`);
      if (c.tipo === "date") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) errores.push(`${c.label}: fecha inválida`);
        else if (v < hoyChile()) errores.push(`${c.label}: no puede ser una fecha pasada`);
      }
    }
  }

  const items = [];
  const lista = Array.isArray(body?.items) ? body.items : [];
  if (lista.length < CONFIG.items.min) errores.push("Detalle de ítems: agregue al menos un ítem");
  if (lista.length > CONFIG.items.max) errores.push(`Detalle de ítems: máximo ${CONFIG.items.max}`);
  lista.slice(0, CONFIG.items.max).forEach((it, i) => {
    const d = String(it?.descripcion ?? "").trim();
    const u = String(it?.unidad ?? "").trim();
    const q = Number(it?.cantidad), p = Number(it?.precio);
    if (!d || d.length > 300) errores.push(`Ítem ${i + 1}: descripción obligatoria (máx. 300)`);
    if (!CONFIG.unidadesMedida.includes(u)) errores.push(`Ítem ${i + 1}: unidad de medida obligatoria`);
    if (!(q > 0)) errores.push(`Ítem ${i + 1}: cantidad debe ser mayor a 0`);
    if (!(p > 0)) errores.push(`Ítem ${i + 1}: precio unitario estimado debe ser mayor a 0`);
    items.push({ descripcion: d, unidad: u, cantidad: q, precio: p });
  });
  const monto = Math.round(items.reduce((s, it) => s + (it.cantidad || 0) * (it.precio || 0), 0));

  const documentos = {};
  let total = 0;
  const docs = body?.documentos || {};
  for (const def of CONFIG.documentos) {
    const arr = Array.isArray(docs[def.id]) ? docs[def.id] : [];
    if (arr.length < def.min) errores.push(`Documento obligatorio faltante: ${def.label}`);
    if (arr.length > def.max) errores.push(`${def.label}: máximo ${def.max} archivos`);
    documentos[def.id] = arr.slice(0, def.max).map((f) => {
      const nombre = String(f?.nombre ?? "").slice(0, 200);
      const tipo = String(f?.tipo ?? "");
      const bytes = Number(f?.bytes) || 0;
      const paginas = Number(f?.paginas) || 0;
      if (!nombre || !CONFIG.tiposArchivo.includes(tipo)) errores.push(`${def.label}: archivo no permitido (${nombre || "sin nombre"})`);
      if (bytes <= 0 || bytes > CONFIG.maxMBArchivo * 1048576) errores.push(`${def.label}: ${nombre} supera ${CONFIG.maxMBArchivo} MB`);
      total += bytes;
      return { nombre, tipo, bytes, paginas };
    });
  }
  if (total > CONFIG.maxMBTotal * 1048576) errores.push(`Los adjuntos superan ${CONFIG.maxMBTotal} MB en total`);
  if (body?.declaracion !== true) errores.push("Debe aceptar la declaración de veracidad");

  return { errores, datos, items, monto, documentos };
}

export async function registrar(env, solicitudId, usuario, accion, detalle = "") {
  await env.DB.prepare("INSERT INTO historial (solicitud_id, fecha, usuario, accion, detalle) VALUES (?,?,?,?,?)")
    .bind(solicitudId, ahora(), usuario || "", accion, detalle || "").run();
}
