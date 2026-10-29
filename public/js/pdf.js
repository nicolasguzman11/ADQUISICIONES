// Generador del PDF consolidado: formulario + índice + todos los anexos en un solo archivo.
(function () {
  const A4 = [595.28, 841.89];
  const M = 50; // margen
  const W = A4[0] - M * 2;

  function limpio(s) {
    return String(s ?? "")
      .normalize("NFC")
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      .replace(/[ -​   ]/g, " ")
      .replace(/[‘’‚]/g, "'")
      .replace(/[“”„]/g, '"')
      .replace(/[–—−]/g, "-")
      .replace(/•/g, "-")
      .replace(/…/g, "...")
      .replace(/→/g, "->")
      .replace(/[^\n\x20-\x7E\xA1-\xFF]/g, "?");
  }

  function partir(texto, font, size, ancho) {
    const out = [];
    for (const par of limpio(texto).split("\n")) {
      const palabras = par.split(" ");
      let linea = "";
      for (let w of palabras) {
        while (font.widthOfTextAtSize(w, size) > ancho) {
          let k = w.length;
          while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > ancho) k--;
          if (linea) { out.push(linea); linea = ""; }
          out.push(w.slice(0, k));
          w = w.slice(k);
        }
        const prueba = linea ? linea + " " + w : w;
        if (font.widthOfTextAtSize(prueba, size) > ancho) { out.push(linea); linea = w; }
        else linea = prueba;
      }
      out.push(linea);
    }
    return out;
  }

  const clp = (n) => "$ " + Math.round(Number(n) || 0).toLocaleString("es-CL");
  const fechaCL = (iso) => new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fechaCorta = (ymd) => { const [y, m, d] = String(ymd).split("-"); return d ? `${d}-${m}-${y}` : ymd; };

  class Escritor {
    constructor(doc, f, C) { this.doc = doc; this.f = f; this.C = C; this.nueva(); }
    nueva() { this.page = this.doc.addPage(A4); this.y = A4[1] - M; }
    asegurar(h) { if (this.y - h < M + 20) this.nueva(); }
    linea(txt, { x = M, size = 10, bold = false, color = this.C.ink } = {}) {
      this.page.drawText(limpio(txt), { x, y: this.y - size, size, font: bold ? this.f.b : this.f.r, color });
    }
    parrafo(txt, { x = M, ancho = W, size = 10, bold = false, color = this.C.ink, lh = 1.4 } = {}) {
      const font = bold ? this.f.b : this.f.r;
      for (const l of partir(txt, font, size, ancho)) {
        this.asegurar(size * lh);
        this.page.drawText(l, { x, y: this.y - size, size, font, color });
        this.y -= size * lh;
      }
    }
    seccion(t) {
      this.asegurar(90);
      this.y -= 8;
      this.page.drawRectangle({ x: M, y: this.y - 20, width: W, height: 20, color: this.C.soft });
      this.page.drawRectangle({ x: M, y: this.y - 20, width: 3, height: 20, color: this.C.accent });
      this.page.drawText(limpio(t), { x: M + 10, y: this.y - 14, size: 11, font: this.f.b, color: this.C.accent });
      this.y -= 28;
    }
    kv(label, valor) {
      const size = 9.5, lh = 1.38, lw = 160;
      const ll = partir(label, this.f.b, 8.5, lw - 10);
      const vl = partir(valor, this.f.r, size, W - lw);
      this.asegurar(Math.min(vl.length, 3) * size * lh + 4);
      const y0 = this.y;
      ll.forEach((l, i) => this.page.drawText(l, { x: M, y: y0 - size - i * 11, size: 8.5, font: this.f.b, color: this.C.muted }));
      const ini = this.page;
      vl.forEach((l) => {
        this.asegurar(size * lh);
        this.page.drawText(l, { x: M + lw, y: this.y - size, size, font: this.f.r, color: this.C.ink });
        this.y -= size * lh;
      });
      if (this.page === ini) this.y = Math.min(this.y, y0 - ll.length * 11 - 2);
      this.y -= 4;
      this.page.drawLine({ start: { x: M, y: this.y + 2 }, end: { x: M + W, y: this.y + 2 }, thickness: 0.4, color: this.C.line });
      this.y -= 3;
    }
  }

  async function portada(doc, ctx, anexos, nPortada) {
    const { PDFLib, cfg, folio, creado, datos, items, monto } = ctx;
    const { rgb, StandardFonts } = PDFLib;
    const f = { r: await doc.embedFont(StandardFonts.Helvetica), b: await doc.embedFont(StandardFonts.HelveticaBold) };
    const C = {
      ink: rgb(0.09, 0.13, 0.19), muted: rgb(0.42, 0.47, 0.55), accent: rgb(0.12, 0.31, 0.55),
      soft: rgb(0.89, 0.93, 0.97), line: rgb(0.86, 0.89, 0.92), white: rgb(1, 1, 1),
    };
    const e = new Escritor(doc, f, C);

    // Encabezado
    const p = e.page;
    p.drawRectangle({ x: 0, y: A4[1] - 92, width: A4[0], height: 92, color: C.accent });
    p.drawText(limpio(cfg.institucion.toUpperCase()), { x: M, y: A4[1] - 34, size: 9, font: f.b, color: C.white });
    p.drawText(limpio(cfg.unidad), { x: M, y: A4[1] - 48, size: 9, font: f.r, color: C.white });
    p.drawText("SOLICITUD DE COMPRA", { x: M, y: A4[1] - 76, size: 20, font: f.b, color: C.white });
    const fw = f.b.widthOfTextAtSize(folio, 18);
    p.drawText("FOLIO", { x: A4[0] - M - f.b.widthOfTextAtSize("FOLIO", 8), y: A4[1] - 40, size: 8, font: f.b, color: C.white });
    p.drawText(folio, { x: A4[0] - M - fw, y: A4[1] - 60, size: 18, font: f.b, color: C.white });
    const fc = "Ingreso: " + fechaCL(creado);
    p.drawText(limpio(fc), { x: A4[0] - M - f.r.widthOfTextAtSize(limpio(fc), 8.5), y: A4[1] - 76, size: 8.5, font: f.r, color: C.white });
    e.y = A4[1] - 112;

    // Resumen
    e.page.drawRectangle({ x: M, y: e.y - 52, width: W, height: 52, borderColor: C.line, borderWidth: 0.8, color: rgb(0.98, 0.985, 0.99) });
    const col = W / 4;
    [["Prioridad", datos.prioridad], ["Fecha requerida", fechaCorta(datos.fecha_requerida)], ["Monto estimado", clp(monto)], ["Documentos", String(anexos.length) + " archivo(s)"]].forEach(([k, v], i) => {
      e.page.drawText(limpio(k.toUpperCase()), { x: M + 12 + i * col, y: e.y - 18, size: 7.5, font: f.b, color: C.muted });
      e.page.drawText(limpio(v), { x: M + 12 + i * col, y: e.y - 38, size: 12, font: f.b, color: datos.prioridad !== "Normal" && i === 0 ? rgb(0.7, 0.15, 0.12) : C.ink });
    });
    e.y -= 62;
    e.parrafo(datos.titulo, { size: 13, bold: true });
    e.y -= 2;

    for (const sec of cfg.secciones) {
      e.seccion(sec.titulo);
      for (const c of sec.campos) e.kv(c.label, c.tipo === "date" ? fechaCorta(datos[c.id]) : datos[c.id]);
    }

    // Ítems
    e.seccion("4. Detalle de bienes o servicios");
    const cols = [{ t: "N°", w: 24 }, { t: "Descripción", w: 221 }, { t: "Unidad", w: 58 }, { t: "Cantidad", w: 52, r: 1 }, { t: "P. unit. est.", w: 70, r: 1 }, { t: "Subtotal", w: 70, r: 1 }];
    const cabecera = () => {
      e.asegurar(40);
      e.page.drawRectangle({ x: M, y: e.y - 16, width: W, height: 16, color: C.soft });
      let x = M;
      cols.forEach((c) => {
        const tw = f.b.widthOfTextAtSize(c.t, 8);
        e.page.drawText(c.t, { x: c.r ? x + c.w - 5 - tw : x + 5, y: e.y - 11, size: 8, font: f.b, color: C.accent });
        x += c.w;
      });
      e.y -= 18;
    };
    cabecera();
    items.forEach((it, i) => {
      const dl = partir(it.descripcion, f.r, 8.5, cols[1].w - 10);
      const h = dl.length * 11 + 6;
      if (e.y - h < M + 20) { e.nueva(); cabecera(); }
      const vals = [String(i + 1), null, it.unidad, String(it.cantidad).replace(".", ","), clp(it.precio), clp(it.cantidad * it.precio)];
      let x = M;
      cols.forEach((c, k) => {
        if (k === 1) dl.forEach((l, j) => e.page.drawText(l, { x: x + 5, y: e.y - 10 - j * 11, size: 8.5, font: f.r, color: C.ink }));
        else {
          const v = limpio(vals[k]);
          const tw = f.r.widthOfTextAtSize(v, 8.5);
          e.page.drawText(v, { x: c.r ? x + c.w - 5 - tw : x + 5, y: e.y - 10, size: 8.5, font: f.r, color: C.ink });
        }
        x += c.w;
      });
      e.y -= h;
      e.page.drawLine({ start: { x: M, y: e.y + 2 }, end: { x: M + W, y: e.y + 2 }, thickness: 0.4, color: C.line });
    });
    e.asegurar(22);
    const tot = "TOTAL ESTIMADO  " + limpio(clp(monto));
    e.page.drawText(tot, { x: M + W - 5 - f.b.widthOfTextAtSize(tot, 10), y: e.y - 14, size: 10, font: f.b, color: C.ink });
    e.y -= 24;

    // Índice de anexos
    e.seccion("5. Documentación adjunta (índice)");
    let pag = nPortada + 1;
    anexos.forEach((a, i) => {
      e.asegurar(26);
      const izq = `Anexo ${i + 1}. ${a.doc}`;
      const der = `pág. ${pag}`;
      e.page.drawText(limpio(izq), { x: M, y: e.y - 9.5, size: 9.5, font: f.b, color: C.ink });
      e.page.drawText(der, { x: M + W - f.r.widthOfTextAtSize(der, 9.5), y: e.y - 9.5, size: 9.5, font: f.r, color: C.ink });
      e.y -= 13;
      e.parrafo(`${a.nombre}  ·  ${a.paginas} pág.`, { x: M + 12, ancho: W - 12, size: 8.5, color: C.muted, lh: 1.3 });
      e.y -= 3;
      pag += 1 + a.paginas;
    });

    // Declaración
    e.seccion("6. Declaración del requirente");
    e.parrafo("[X] " + cfg.declaracion, { size: 9.5 });
    e.y -= 6;
    e.parrafo(`Aceptada electrónicamente por ${datos.nombre} (RUT ${datos.rut}) el ${fechaCL(creado)}.`, { size: 8.5, color: C.muted });
    return { count: doc.getPageCount(), f, C };
  }

  async function separador(doc, ctx, f, C, n, a) {
    const p = doc.addPage(A4);
    p.drawRectangle({ x: 0, y: A4[1] / 2 - 70, width: A4[0], height: 140, color: C.soft });
    p.drawRectangle({ x: 0, y: A4[1] / 2 - 70, width: 6, height: 140, color: C.accent });
    p.drawText(`ANEXO ${n}`, { x: M, y: A4[1] / 2 + 30, size: 12, font: f.b, color: C.accent });
    let y = A4[1] / 2 + 6;
    for (const l of partir(a.doc, f.b, 20, W)) { p.drawText(l, { x: M, y, size: 20, font: f.b, color: C.ink }); y -= 24; }
    for (const l of partir(`${a.nombre} · ${a.paginas} página(s)`, f.r, 10, W)) { p.drawText(l, { x: M, y: y - 4, size: 10, font: f.r, color: C.muted }); y -= 13; }
    p.drawText(limpio(`Solicitud ${ctx.folio} · ${ctx.datos.titulo}`).slice(0, 110), { x: M, y: A4[1] / 2 - 56, size: 8.5, font: f.r, color: C.muted });
  }

  async function imagen(doc, a) {
    const img = a.tipo === "image/png" ? await doc.embedPng(a.buf) : await doc.embedJpg(a.buf);
    const horizontal = img.width > img.height;
    const size = horizontal ? [A4[1], A4[0]] : A4;
    const p = doc.addPage(size);
    const s = Math.min((size[0] - 60) / img.width, (size[1] - 60) / img.height, 1);
    const w = img.width * s, h = img.height * s;
    p.drawImage(img, { x: (size[0] - w) / 2, y: (size[1] - h) / 2, width: w, height: h });
  }

  // archivos: { docId: [File] }
  window.construirPDF = async function ({ cfg, folio, creado, datos, items, monto, archivos }) {
    const PDFLib = window.PDFLib;
    const { PDFDocument, rgb } = PDFLib;
    const anexos = [];
    for (const d of cfg.documentos) {
      for (const file of archivos[d.id] || []) {
        const buf = await file.arrayBuffer();
        const a = { doc: d.label, nombre: file.name, tipo: file.type, buf, paginas: 1 };
        if (file.type === "application/pdf") { a.src = await PDFDocument.load(buf); a.paginas = a.src.getPageCount(); }
        anexos.push(a);
      }
    }
    const ctx = { PDFLib, cfg, folio, creado, datos, items, monto };

    const tmp = await PDFDocument.create();
    const n = (await portada(tmp, ctx, anexos, 0)).count;

    const out = await PDFDocument.create();
    out.setTitle(`${folio} - ${datos.titulo}`);
    out.setAuthor(datos.nombre);
    out.setSubject(`Solicitud de compra · ${cfg.unidad} · ${cfg.institucion}`);
    out.setCreator(cfg.sistema);
    const { f, C } = await portada(out, ctx, anexos, n);

    for (let i = 0; i < anexos.length; i++) {
      const a = anexos[i];
      await separador(out, ctx, f, C, i + 1, a);
      if (a.src) {
        const pages = await out.copyPages(a.src, a.src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } else {
        await imagen(out, a);
      }
    }

    const total = out.getPageCount();
    out.getPages().forEach((p, i) => {
      const t = `${folio}  ·  pág. ${i + 1} de ${total}`;
      const { width } = p.getSize();
      p.drawText(t, { x: width - 30 - f.r.widthOfTextAtSize(t, 7), y: 14, size: 7, font: f.r, color: rgb(0.45, 0.5, 0.58) });
    });
    return await out.save();
  };

  window.contarPaginasPDF = async function (file) {
    const doc = await window.PDFLib.PDFDocument.load(await file.arrayBuffer());
    return doc.getPageCount();
  };
})();
