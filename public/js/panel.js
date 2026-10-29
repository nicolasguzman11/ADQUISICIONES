(async function () {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clp = (n) => "$ " + Math.round(Number(n) || 0).toLocaleString("es-CL");
  const fdt = (iso) => iso ? new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  const fd = (ymd) => { const [y, m, d] = String(ymd || "").split("-"); return d ? `${d}-${m}-${y}` : "—"; };
  const ymdCL = (iso) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const toast = (t) => { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), 2800); };
  const api = async (url, opt = {}) => {
    const r = await fetch(url, { ...opt, headers: { "content-type": "application/json", ...(opt.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
    return j;
  };

  // Tema
  try { const t = localStorage.getItem("adq-tema"); if (t) document.documentElement.dataset.theme = t; } catch {}
  $("#btnTheme").onclick = () => {
    const actual = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const n = actual === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = n;
    try { localStorage.setItem("adq-tema", n); } catch {}
  };

  const cfg = await fetch("/api/config").then((r) => r.json());
  const ABIERTA = (s) => !cfg.estadosCierre.includes(s.estado);
  const hoy = cfg.hoy;
  let filas = [], compradores = [];
  const chipEstado = (e) => `<span class="chip ${["OC emitida", "Cerrada"].includes(e) ? "good" : e === "Rechazada" ? "crit" : e === "Observada" || e === "Ingresada" ? "warn" : "info"}">${esc(e)}</span>`;
  const chipPri = (p) => `<span class="chip ${p === "Emergencia" ? "crit" : p === "Urgente" ? "warn" : ""}">${esc(p)}</span>`;
  const dias = (s) => Math.max(0, Math.round(((s.cerrado ? new Date(s.cerrado) : new Date()) - new Date(s.creado)) / 864e5));
  const vencida = (s) => ABIERTA(s) && s.fecha_requerida < hoy;

  cfg.estados.forEach((e) => $("#fEst").insertAdjacentHTML("beforeend", `<option>${esc(e)}</option>`));

  async function cargar() {
    [filas, compradores] = await Promise.all([api("/api/admin/solicitudes"), api("/api/admin/compradores")]);
    const sel = $("#fComp"), v = sel.value;
    sel.innerHTML = `<option value="">Todos</option><option value="__sin">Sin asignar</option>` +
      [...new Set([...compradores.map((c) => c.nombre), ...filas.map((f) => f.comprador).filter(Boolean)])].sort().map((n) => `<option>${esc(n)}</option>`).join("");
    sel.value = v;
    $("#upd").textContent = fdt(new Date().toISOString());
    render();
  }

  function filtradas() {
    const q = $("#q").value.trim().toLowerCase();
    const est = $("#fEst").value, comp = $("#fComp").value, pri = $("#fPri").value, d1 = $("#fDesde").value, d2 = $("#fHasta").value;
    return filas.filter((s) => {
      if (q && ![s.folio, s.titulo, s.unidad, s.solicitante, s.comprador, s.tipo].join(" ").toLowerCase().includes(q)) return false;
      if (est === "__abiertas" ? !ABIERTA(s) : est && s.estado !== est) return false;
      if (comp === "__sin" ? !!s.comprador : comp && s.comprador !== comp) return false;
      if (pri && s.prioridad !== pri) return false;
      const d = ymdCL(s.creado);
      if (d1 && d < d1) return false;
      if (d2 && d > d2) return false;
      return true;
    });
  }

  function render() {
    const L = filtradas();
    const ab = L.filter(ABIERTA);
    const sin = ab.filter((s) => !s.comprador);
    const asig = L.filter((s) => s.asignado);
    const promAsig = asig.length ? asig.reduce((t, s) => t + (new Date(s.asignado) - new Date(s.creado)) / 864e5, 0) / asig.length : 0;
    const cer = L.filter((s) => s.cerrado);
    const promCierre = cer.length ? cer.reduce((t, s) => t + dias(s), 0) / cer.length : 0;
    const venc = L.filter(vencida);
    const kpis = [
      { n: "Solicitudes", v: L.length, f: clp(L.reduce((t, s) => t + (s.monto || 0), 0)), act: () => setF({}) },
      { n: "Sin responsable", v: sin.length, f: "abiertas sin comprador", alert: sin.length > 0, act: () => setF({ fComp: "__sin", fEst: "__abiertas" }) },
      { n: "Abiertas", v: ab.length, f: "en curso", act: () => setF({ fEst: "__abiertas" }) },
      { n: "Vencidas", v: venc.length, f: "fecha requerida superada", alert: venc.length > 0, act: () => setF({ fEst: "__abiertas" }) },
      { n: "Días a asignación", v: promAsig.toFixed(1), u: "d", f: `promedio (${asig.length})` },
      { n: "Días a cierre", v: promCierre.toFixed(1), u: "d", f: `promedio (${cer.length})` },
    ];
    $("#kpis").innerHTML = kpis.map((k, i) => `<div class="kpi${k.alert ? " alert" : ""}" data-k="${i}" tabindex="0"><div class="k-name">${k.n}</div><div class="k-val">${k.v}${k.u ? `<small>${k.u}</small>` : ""}</div><div class="k-foot">${esc(k.f)}</div></div>`).join("");
    $("#kpis").querySelectorAll(".kpi").forEach((el) => { const k = kpis[el.dataset.k]; if (k.act) el.onclick = k.act; });

    // Carga por responsable
    const grupos = {};
    ab.forEach((s) => { const k = s.comprador || "Sin asignar"; (grupos[k] ||= { n: 0, u: 0, v: 0 }); grupos[k].n++; if (s.prioridad !== "Normal") grupos[k].u++; if (vencida(s)) grupos[k].v++; });
    const gl = Object.entries(grupos).sort((a, b) => (a[0] === "Sin asignar" ? -1 : b[0] === "Sin asignar" ? 1 : b[1].n - a[1].n));
    const max = Math.max(1, ...gl.map(([, g]) => g.n));
    $("#chComp").innerHTML = gl.length ? gl.map(([k, g]) => {
      const normal = g.n - g.u;
      return `<div class="bar" data-c="${esc(k)}"><span class="lbl" title="${esc(k)}">${k === "Sin asignar" ? `<b style="color:var(--crit)">${esc(k)}</b>` : esc(k)}</span><span class="trk"><i style="width:${(normal / max) * 100}%;background:var(--s1)"></i><i style="width:${(g.u / max) * 100}%;background:var(--s2)"></i></span><span class="v">${g.n}</span></div>`;
    }).join("") : '<span class="muted">Sin solicitudes abiertas.</span>';
    $("#lgComp").innerHTML = `<span><i style="background:var(--s1)"></i>Normal</span><span><i style="background:var(--s2)"></i>Urgente / Emergencia</span>`;
    $("#chComp").querySelectorAll(".bar").forEach((b) => (b.onclick = () => setF({ fComp: b.dataset.c === "Sin asignar" ? "__sin" : b.dataset.c, fEst: "__abiertas" })));

    // Por estado
    const pe = cfg.estados.map((e) => [e, L.filter((s) => s.estado === e).length]);
    const m2 = Math.max(1, ...pe.map((x) => x[1]));
    const col = (e) => ["OC emitida", "Cerrada"].includes(e) ? "var(--good)" : e === "Rechazada" ? "var(--crit)" : e === "Ingresada" || e === "Observada" ? "var(--warn)" : "var(--s1)";
    $("#chEst").innerHTML = pe.map(([e, n]) => `<div class="bar" data-e="${esc(e)}"><span class="lbl">${esc(e)}</span><span class="trk"><i style="width:${(n / m2) * 100}%;background:${col(e)}"></i></span><span class="v">${n}</span></div>`).join("");
    $("#chEst").querySelectorAll(".bar").forEach((b) => (b.onclick = () => setF({ fEst: b.dataset.e })));

    // Tabla
    $("#cnt").textContent = `${L.length} de ${filas.length}`;
    $("#tb").innerHTML = L.map((s) => `<tr data-id="${s.id}" style="cursor:pointer">
      <td style="white-space:nowrap"><b>${esc(s.folio)}</b></td>
      <td style="white-space:nowrap">${fdt(s.creado)}</td>
      <td class="num">${dias(s)}</td>
      <td style="min-width:220px"><b>${esc(s.titulo)}</b><br><small class="muted">${esc(s.unidad)} · ${esc(s.tipo)}</small></td>
      <td>${esc(s.solicitante)}</td>
      <td>${chipPri(s.prioridad)}</td>
      <td class="num">${clp(s.monto)}</td>
      <td>${vencida(s) ? `<span class="chip crit">${fd(s.fecha_requerida)}</span>` : fd(s.fecha_requerida)}</td>
      <td>${chipEstado(s.estado)}</td>
      <td>${s.comprador ? esc(s.comprador) : '<span class="chip crit">Sin asignar</span>'}</td>
      <td><a class="btn sm" href="/api/admin/solicitudes/${s.id}/pdf" onclick="event.stopPropagation()" title="Descargar PDF consolidado">PDF</a></td>
    </tr>`).join("") || `<tr><td colspan="11" class="muted" style="text-align:center;padding:24px">No hay solicitudes con estos filtros.</td></tr>`;
    $("#tb").querySelectorAll("tr[data-id]").forEach((tr) => (tr.onclick = () => abrir(Number(tr.dataset.id))));
  }

  function setF(o) {
    ["fEst", "fComp", "fPri", "fDesde", "fHasta"].forEach((k) => ($("#" + k).value = o[k] || ""));
    $("#q").value = "";
    render();
    $("#tb").closest(".card").scrollIntoView({ behavior: "smooth" });
  }
  ["q", "fEst", "fComp", "fPri", "fDesde", "fHasta"].forEach((id) => $("#" + id).addEventListener("input", render));
  $("#btnLimpiar").onclick = () => setF({});
  $("#btnRefresh").onclick = () => cargar().then(() => toast("Datos actualizados"));

  // Detalle
  async function abrir(id) {
    const d = await api(`/api/admin/solicitudes/${id}`);
    const datos = d.datos.datos || {}, items = d.datos.items || [];
    const activos = compradores.filter((c) => c.activo);
    const box = $("#dBox");
    box.innerHTML = `
      <div class="drawer-head">
        <h2>${esc(d.folio)}</h2>${chipEstado(d.estado)}${chipPri(d.prioridad)}
        <span class="spacer"></span>
        <a class="btn sm" href="/api/admin/solicitudes/${d.id}/pdf?ver=1" target="_blank" rel="noopener">Ver PDF</a>
        <a class="btn sm primary" href="/api/admin/solicitudes/${d.id}/pdf">Descargar PDF</a>
        <button class="btn sm" id="dClose">Cerrar</button>
      </div>
      <div class="drawer-body">
        <section class="card">
          <h2>${esc(d.titulo)}</h2>
          <dl class="kv">
            <dt>Responsable</dt><dd>${d.comprador ? `<b>${esc(d.comprador)}</b> · desde ${fdt(d.asignado)}` : '<span class="chip crit">Sin asignar</span>'}</dd>
            <dt>Ingreso</dt><dd>${fdt(d.creado)} · ${dias(d)} día(s)</dd>
            <dt>Monto estimado</dt><dd>${clp(d.monto)}</dd>
            <dt>Fecha requerida</dt><dd>${vencida(d) ? `<span class="chip crit">${fd(d.fecha_requerida)} · vencida</span>` : fd(d.fecha_requerida)}</dd>
          </dl>
        </section>

        <section class="card">
          <h2>Gestión</h2>
          <div class="fields">
            <div class="field"><label for="aComp">Comprador responsable</label>
              <select id="aComp"><option value="">— Sin asignar —</option>${activos.map((c) => `<option ${c.nombre === d.comprador ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}${d.comprador && !activos.some((c) => c.nombre === d.comprador) ? `<option selected>${esc(d.comprador)}</option>` : ""}</select></div>
            <div class="field"><label for="aEst">Estado</label>
              <select id="aEst">${cfg.estados.map((e) => `<option ${e === d.estado ? "selected" : ""}>${esc(e)}</option>`).join("")}</select></div>
            <div class="field full"><label for="aCom">Comentario <span class="help">(obligatorio para Observada / Rechazada; visible para el requirente)</span></label><textarea id="aCom" style="min-height:64px" maxlength="1000"></textarea></div>
          </div>
          <div class="row" style="margin-top:10px"><button class="btn primary" id="aGuardar">Guardar cambios</button><span class="err" id="aErr"></span></div>
          ${activos.length ? "" : '<p class="help">No hay compradores activos. Agréguelos en «Compradores».</p>'}
        </section>

        ${cfg.secciones.map((sec) => `<section class="card"><h2>${esc(sec.titulo)}</h2><dl class="kv">${sec.campos.map((c) => `<dt>${esc(c.label)}</dt><dd>${esc(c.tipo === "date" ? fd(datos[c.id]) : datos[c.id])}</dd>`).join("")}</dl></section>`).join("")}

        <section class="card"><h2>4. Detalle de ítems</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>N°</th><th>Descripción</th><th>Unidad</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Subtotal</th></tr></thead><tbody>
          ${items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.descripcion)}</td><td>${esc(it.unidad)}</td><td class="num">${it.cantidad}</td><td class="num">${clp(it.precio)}</td><td class="num">${clp(it.cantidad * it.precio)}</td></tr>`).join("")}
          <tr><td colspan="5" class="num"><b>Total</b></td><td class="num"><b>${clp(d.monto)}</b></td></tr></tbody></table></div></section>

        <section class="card"><h2>5. Documentos (incluidos en el PDF)</h2><dl class="kv">
          ${cfg.documentos.map((doc) => `<dt>${esc(doc.label)}</dt><dd>${(d.documentos[doc.id] || []).map((f) => `${esc(f.nombre)} <small class="muted">(${f.paginas} pág.)</small>`).join("<br>") || "—"}</dd>`).join("")}
        </dl></section>

        <section class="card"><h2>Historial</h2><ul class="timeline">${d.historial.map((h) => `<li><b>${esc(h.accion)}</b>${h.detalle ? ` — ${esc(h.detalle)}` : ""}<br><small>${fdt(h.fecha)} · ${esc(h.usuario)}</small></li>`).join("")}</ul></section>
      </div>`;
    $("#drawer").hidden = false;
    $("#dClose").onclick = cerrar;
    $("#aGuardar").onclick = async () => {
      const body = {};
      const comp = $("#aComp").value, est = $("#aEst").value, com = $("#aCom").value.trim();
      if ((comp || null) !== (d.comprador || null)) body.comprador = comp;
      if (est !== d.estado) body.estado = est;
      if (com) body.comentario = com;
      if (!Object.keys(body).length) { $("#aErr").textContent = "No hay cambios"; return; }
      try {
        await api(`/api/admin/solicitudes/${d.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast("Cambios guardados");
        await cargar();
        abrir(d.id);
      } catch (e) { $("#aErr").textContent = e.message; }
    };
  }
  const cerrar = () => ($("#drawer").hidden = true);
  $("#drawer").addEventListener("click", (e) => { if (e.target.id === "drawer") cerrar(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { cerrar(); $("#mComp").hidden = true; } });

  // Compradores
  function pintarComp() {
    $("#tbComp").innerHTML = compradores.map((c) => `<tr><td>${esc(c.nombre)}</td><td>${esc(c.correo)}</td><td><input type="checkbox" data-id="${c.id}" ${c.activo ? "checked" : ""} style="width:auto"></td></tr>`).join("") || '<tr><td colspan="3" class="muted">Aún no hay compradores.</td></tr>';
    $("#tbComp").querySelectorAll("input").forEach((i) => (i.onchange = async () => {
      await api("/api/admin/compradores", { method: "PATCH", body: JSON.stringify({ id: Number(i.dataset.id), activo: i.checked }) });
      compradores = await api("/api/admin/compradores");
      toast("Comprador actualizado");
    }));
  }
  $("#btnComp").onclick = () => { pintarComp(); $("#mComp").hidden = false; };
  $("#mComp").addEventListener("click", (e) => { if (e.target.id === "mComp" || e.target.dataset.close !== undefined) $("#mComp").hidden = true; });
  $("#fComp2").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await api("/api/admin/compradores", { method: "POST", body: JSON.stringify({ nombre: $("#cNom").value, correo: $("#cMail").value }) });
      $("#cNom").value = ""; $("#cMail").value = "";
      await cargar(); pintarComp(); toast("Comprador agregado");
    } catch (er) { toast(er.message); }
  });

  // CSV
  $("#btnCsv").onclick = () => {
    const cols = ["folio", "creado", "dias", "titulo", "tipo", "unidad", "solicitante", "correo", "prioridad", "monto", "fecha_requerida", "estado", "comprador", "asignado", "cerrado"];
    const rows = filtradas().map((s) => cols.map((c) => (c === "dias" ? dias(s) : ["creado", "asignado", "cerrado"].includes(c) ? (s[c] ? fdt(s[c]) : "") : s[c] ?? "")));
    const csv = "﻿" + [cols, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `solicitudes_compra_${hoy}.csv`;
    a.click();
  };

  api("/api/admin/yo").then((j) => ($("#yo").textContent = j.usuario)).catch(() => {});
  await cargar();
  setInterval(() => { if ($("#drawer").hidden) cargar().catch(() => {}); }, 120000);
})();
