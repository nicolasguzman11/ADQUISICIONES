(async function () {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clp = (n) => "$ " + Math.round(Number(n) || 0).toLocaleString("es-CL");
  const mb = (b) => (b / 1048576).toFixed(1) + " MB";

  const cfg = await fetch("/api/config").then((r) => r.json());
  $("#eyebrow").textContent = cfg.unidad + " · " + cfg.institucion;
  $("#inst").textContent = cfg.institucion;
  $("#declTxt").textContent = cfg.declaracion;
  $("#docHelp").textContent = `Formatos permitidos: PDF, JPG o PNG · máximo ${cfg.maxMBArchivo} MB por archivo y ${cfg.maxMBTotal} MB en total. Los PDF no deben tener contraseña.`;

  // ---------- Validación de campos ----------
  function rutValido(rut) {
    const s = String(rut || "").replace(/[.\s-]/g, "").toUpperCase();
    if (!/^\d{7,8}[\dK]$/.test(s)) return false;
    const cuerpo = s.slice(0, -1), dv = s.slice(-1);
    let suma = 0, m = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) { suma += Number(cuerpo[i]) * m; m = m === 7 ? 2 : m + 1; }
    const r = 11 - (suma % 11);
    return (r === 11 ? "0" : r === 10 ? "K" : String(r)) === dv;
  }
  function formatearRut(v) {
    const s = v.replace(/[^\dkK]/g, "").toUpperCase();
    if (s.length < 2) return s;
    const cuerpo = s.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return cuerpo + "-" + s.slice(-1);
  }
  function errorCampo(c, v) {
    v = String(v || "").trim();
    if (!v) return "Obligatorio";
    if (c.min && v.length < c.min) return `Mínimo ${c.min} caracteres (lleva ${v.length})`;
    if (c.max && v.length > c.max) return `Máximo ${c.max} caracteres`;
    if (c.tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Correo inválido";
    if (c.tipo === "rut" && !rutValido(v)) return "RUT inválido";
    if (c.tipo === "select" && !c.opciones.includes(v)) return "Seleccione una opción";
    if (c.tipo === "date" && v < cfg.hoy) return "No puede ser una fecha pasada";
    return "";
  }

  // ---------- Render de secciones ----------
  const campos = [];
  const cont = $("#secciones");
  cfg.secciones.forEach((sec) => {
    const card = document.createElement("section");
    card.className = "card";
    const [num, ...resto] = sec.titulo.split(" ");
    card.innerHTML = `<h2><span class="num">${esc(num)}</span> ${esc(resto.join(" "))}</h2><div class="fields"></div>`;
    const grid = $(".fields", card);
    sec.campos.forEach((c) => {
      const f = document.createElement("div");
      f.className = "field" + (c.tipo === "textarea" ? " full" : "");
      const id = "f_" + c.id;
      let input;
      if (c.tipo === "select") input = `<select id="${id}" name="${c.id}"><option value="">Seleccione…</option>${c.opciones.map((o) => `<option>${esc(o)}</option>`).join("")}</select>`;
      else if (c.tipo === "textarea") input = `<textarea id="${id}" name="${c.id}" maxlength="${c.max || 3000}"></textarea><div class="count"></div>`;
      else {
        const t = { email: "email", tel: "tel", date: "date" }[c.tipo] || "text";
        const extra = c.tipo === "date" ? ` min="${cfg.hoy}"` : c.max ? ` maxlength="${c.max}"` : "";
        const ac = { nombre: "name", correo: "email", telefono: "tel" }[c.id];
        input = `<input type="${t}" id="${id}" name="${c.id}"${extra}${ac ? ` autocomplete="${ac}"` : ""}>`;
      }
      f.innerHTML = `<label for="${id}">${esc(c.label)}<span class="req">*</span></label>${input}${c.ayuda ? `<div class="help">${esc(c.ayuda)}</div>` : ""}<div class="err"></div>`;
      grid.appendChild(f);
      const el = $("#" + id, f);
      const cnt = $(".count", f);
      const check = (mostrar) => {
        const e = errorCampo(c, el.value);
        if (mostrar || f.dataset.tocado) {
          f.classList.toggle("invalid", !!e);
          f.classList.toggle("ok", !e);
          $(".err", f).textContent = e;
        }
        if (cnt) cnt.textContent = `${el.value.trim().length}${c.min ? ` / mín. ${c.min}` : ""}`;
        return e;
      };
      el.addEventListener("input", () => { if (c.tipo === "rut") el.value = formatearRut(el.value); check(false); actualizar(); });
      el.addEventListener("blur", () => { f.dataset.tocado = 1; check(true); });
      el.addEventListener("change", () => { f.dataset.tocado = 1; check(true); actualizar(); });
      campos.push({ c, el, f, check });
    });
    cont.appendChild(card);
  });

  // ---------- Ítems ----------
  const tbody = $("#items");
  function filaItem() {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="n"></td>
      <td><input class="i-d" maxlength="300" placeholder="Descripción del bien o servicio"></td>
      <td><select class="i-u"><option value="">—</option>${cfg.unidadesMedida.map((u) => `<option>${esc(u)}</option>`).join("")}</select></td>
      <td><input class="i-q" type="number" min="0" step="any" inputmode="decimal" style="text-align:right"></td>
      <td><input class="i-p" type="number" min="0" step="1" inputmode="numeric" style="text-align:right"></td>
      <td class="num i-s">$ 0</td>
      <td><button type="button" class="btn sm danger" title="Quitar ítem" aria-label="Quitar ítem">✕</button></td>`;
    tr.querySelector("button").onclick = () => { if (tbody.children.length > 1) { tr.remove(); actualizar(); } };
    tr.addEventListener("input", actualizar);
    tr.addEventListener("change", actualizar);
    tbody.appendChild(tr);
    actualizar();
  }
  $("#addItem").onclick = filaItem;
  function leerItems() {
    return [...tbody.children].map((tr) => ({
      descripcion: tr.querySelector(".i-d").value.trim(),
      unidad: tr.querySelector(".i-u").value,
      cantidad: Number(tr.querySelector(".i-q").value),
      precio: Number(tr.querySelector(".i-p").value),
    }));
  }
  const itemOk = (it) => it.descripcion && it.unidad && it.cantidad > 0 && it.precio > 0;

  // ---------- Documentos ----------
  const archivos = {}; // docId -> [File]
  const paginas = new WeakMap();
  const docsEl = $("#docs");
  const totalBytes = () => Object.values(archivos).flat().reduce((s, f) => s + f.size, 0);

  cfg.documentos.forEach((d) => {
    archivos[d.id] = [];
    const box = document.createElement("div");
    box.className = "doc";
    box.innerHTML = `<div class="doc-t"><span>${esc(d.label)}<span class="req">*</span></span><span class="st">Pendiente</span></div>
      ${d.ayuda ? `<div class="help">${esc(d.ayuda)}</div>` : ""}
      <ul class="files"></ul>
      <div class="drop" tabindex="0" role="button">Arrastre aquí o <u>seleccione archivo${d.max > 1 ? "s" : ""}</u><br><small>mín. ${d.min} · máx. ${d.max}</small></div>
      <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" ${d.max > 1 ? "multiple" : ""}>
      <div class="err"></div>`;
    const input = $("input", box), drop = $(".drop", box), lista = $(".files", box), err = $(".err", box);
    const pintar = () => {
      lista.innerHTML = "";
      archivos[d.id].forEach((file, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<span title="${esc(file.name)}">${esc(file.name)}</span><small>${paginas.get(file) || 1} pág · ${mb(file.size)}</small><button type="button" aria-label="Quitar">×</button>`;
        li.querySelector("button").onclick = () => { archivos[d.id].splice(i, 1); pintar(); actualizar(); };
        lista.appendChild(li);
      });
      const ok = archivos[d.id].length >= d.min;
      box.classList.toggle("ok", ok);
      $(".st", box).textContent = ok ? "Completo" : "Pendiente";
      drop.hidden = archivos[d.id].length >= d.max;
    };
    async function agregar(files) {
      err.textContent = "";
      for (const file of files) {
        if (archivos[d.id].length >= d.max) { err.textContent = `Máximo ${d.max} archivo(s).`; break; }
        if (!cfg.tiposArchivo.includes(file.type)) { err.textContent = `«${file.name}»: solo PDF, JPG o PNG.`; continue; }
        if (file.size > cfg.maxMBArchivo * 1048576) { err.textContent = `«${file.name}» supera ${cfg.maxMBArchivo} MB.`; continue; }
        if (totalBytes() + file.size > cfg.maxMBTotal * 1048576) { err.textContent = `Se superaría el máximo total de ${cfg.maxMBTotal} MB.`; continue; }
        if (file.type === "application/pdf") {
          try { paginas.set(file, await window.contarPaginasPDF(file)); }
          catch { err.textContent = `«${file.name}» está protegido con contraseña o dañado. Adjunte una versión sin clave.`; continue; }
        }
        archivos[d.id].push(file);
      }
      pintar(); actualizar();
    }
    drop.onclick = () => input.click();
    drop.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } };
    input.onchange = () => { agregar([...input.files]); input.value = ""; };
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
    drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); agregar([...e.dataTransfer.files]); };
    docsEl.appendChild(box);
    pintar();
  });

  // ---------- Progreso / requisitos ----------
  const decl = $("#declaracion");
  decl.addEventListener("change", actualizar);

  function pendientes() {
    const p = [];
    campos.forEach(({ c, el }) => { if (errorCampo(c, el.value)) p.push(c.label); });
    const its = leerItems();
    if (!its.length || !its.every(itemOk)) p.push("Detalle de ítems completo");
    cfg.documentos.forEach((d) => { if (archivos[d.id].length < d.min) p.push(d.label); });
    if (!decl.checked) p.push("Declaración");
    return p;
  }
  function actualizar() {
    let total = 0;
    [...tbody.children].forEach((tr, i) => {
      tr.querySelector(".n").textContent = i + 1;
      const q = Number(tr.querySelector(".i-q").value) || 0, pr = Number(tr.querySelector(".i-p").value) || 0;
      tr.querySelector(".i-s").textContent = clp(q * pr);
      total += q * pr;
    });
    $("#total").textContent = clp(total);
    if (!campos.length) return;
    const p = pendientes();
    const n = campos.length + 1 + cfg.documentos.length + 1;
    const pct = Math.round(((n - p.length) / n) * 100);
    $("#prog i").style.width = pct + "%";
    $("#prog").classList.toggle("full", !p.length);
    $("#progTxt").textContent = pct + "%";
    $("#enviar").disabled = p.length > 0;
    $("#pend").innerHTML = p.length
      ? `<b>Faltan ${p.length} requisito(s):</b> ${p.slice(0, 6).map(esc).join(" · ")}${p.length > 6 ? ` y ${p.length - 6} más` : ""}`
      : "Solicitud completa. Ya puede enviarla.";
  }
  filaItem();

  // ---------- Envío ----------
  const ov = $("#overlay");
  const estado = (t) => { $("#ovTxt").textContent = t; };
  let pendienteSubida = null;

  async function subirPDF() {
    const { folio, token, pdf } = pendienteSubida;
    estado("Subiendo PDF consolidado…");
    const r = await fetch(`/api/solicitudes/${encodeURIComponent(folio)}/pdf`, { method: "PUT", headers: { "content-type": "application/pdf", "x-token": token }, body: pdf });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "No se pudo subir el PDF");
    ov.hidden = true;
    $("#form").hidden = true;
    $("#exito").hidden = false;
    $("#exFolio").textContent = folio;
    const correo = $("#f_correo").value.trim();
    $("#exSeg").href = `/seguimiento?folio=${encodeURIComponent(folio)}&correo=${encodeURIComponent(correo)}`;
    const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    $("#exPdf").href = url;
    $("#exPdf").download = folio + ".pdf";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $("#btnRetry").onclick = async () => {
    $("#ovRetry").hidden = true;
    try { await subirPDF(); } catch (e) { estado("Error: " + e.message); $("#ovRetry").hidden = false; }
  };

  $("#form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    campos.forEach((x) => { x.f.dataset.tocado = 1; x.check(true); });
    const p = pendientes();
    if (p.length) { actualizar(); return; }
    $("#errores").innerHTML = "";
    const datos = {};
    campos.forEach(({ c, el }) => (datos[c.id] = el.value.trim()));
    const items = leerItems();
    const documentos = {};
    cfg.documentos.forEach((d) => {
      documentos[d.id] = archivos[d.id].map((f) => ({ nombre: f.name, tipo: f.type, bytes: f.size, paginas: paginas.get(f) || 1 }));
    });

    ov.hidden = false;
    $("#ovRetry").hidden = true;
    try {
      estado("Validando y registrando solicitud…");
      const r = await fetch("/api/solicitudes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ datos, items, documentos, declaracion: true }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        ov.hidden = true;
        $("#errores").innerHTML = `<div class="alert-box crit"><b>No se pudo enviar. Revise:</b><ul>${(j.errores || [j.error || "Error del servidor"]).map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>`;
        return;
      }
      estado(`Folio ${j.folio} · generando PDF consolidado…`);
      const pdf = await window.construirPDF({ cfg, folio: j.folio, creado: j.creado, datos, items, monto: j.monto, archivos });
      pendienteSubida = { folio: j.folio, token: j.token, pdf };
      await subirPDF();
    } catch (e) {
      estado("Error: " + e.message);
      if (pendienteSubida) $("#ovRetry").hidden = false;
      else setTimeout(() => (ov.hidden = true), 2500);
    }
  });
})();
