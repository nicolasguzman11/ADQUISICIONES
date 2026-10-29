-- ADQUISICIONES — esquema de base de datos (Cloudflare D1)
CREATE TABLE IF NOT EXISTS solicitudes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folio TEXT UNIQUE,
  creado TEXT NOT NULL,
  actualizado TEXT,
  solicitante TEXT,
  correo TEXT,
  unidad TEXT,
  titulo TEXT,
  tipo TEXT,
  prioridad TEXT,
  fecha_requerida TEXT,
  monto REAL,
  datos TEXT NOT NULL,
  documentos TEXT,
  estado TEXT NOT NULL DEFAULT 'Pendiente de PDF',
  comprador TEXT,
  asignado TEXT,
  cerrado TEXT,
  pdf_key TEXT,
  pdf_bytes INTEGER,
  token TEXT
);
CREATE INDEX IF NOT EXISTS idx_sol_estado ON solicitudes(estado);
CREATE INDEX IF NOT EXISTS idx_sol_comprador ON solicitudes(comprador);

CREATE TABLE IF NOT EXISTS historial (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  solicitud_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  usuario TEXT,
  accion TEXT NOT NULL,
  detalle TEXT
);
CREATE INDEX IF NOT EXISTS idx_hist_sol ON historial(solicitud_id);

CREATE TABLE IF NOT EXISTS compradores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT UNIQUE NOT NULL,
  correo TEXT,
  activo INTEGER NOT NULL DEFAULT 1
);

-- Ejemplo: reemplace por los compradores reales (también se pueden agregar desde el panel)
-- INSERT INTO compradores (nombre, correo) VALUES ('Nombre Comprador', 'comprador@hospital.cl');
