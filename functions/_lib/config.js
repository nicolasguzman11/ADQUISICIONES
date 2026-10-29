// ============================================================
//  CONFIGURACIÓN DEL FORMULARIO — edite aquí campos y documentos
//  Todo campo listado es OBLIGATORIO (validado en navegador y servidor)
// ============================================================
export const CONFIG = {
  sistema: "ADQUISICIONES",
  institucion: "Hospital de Villarrica",
  unidad: "Sub Departamento de Abastecimiento",
  maxMBArchivo: 10,
  maxMBTotal: 30,
  tiposArchivo: ["application/pdf", "image/jpeg", "image/png"],

  secciones: [
    {
      id: "solicitante", titulo: "1. Identificación del requirente",
      campos: [
        { id: "nombre", label: "Nombre completo", tipo: "text", max: 120 },
        { id: "rut", label: "RUT", tipo: "rut", ayuda: "Ej: 12.345.678-9" },
        { id: "cargo", label: "Cargo / estamento", tipo: "text", max: 100 },
        { id: "unidad", label: "Servicio o unidad solicitante", tipo: "text", max: 120 },
        { id: "jefatura", label: "Jefatura que autoriza", tipo: "text", max: 120 },
        { id: "correo", label: "Correo institucional", tipo: "email", max: 120, ayuda: "Recibirá aquí el seguimiento de su solicitud" },
        { id: "telefono", label: "Teléfono o anexo", tipo: "tel", max: 30 },
      ],
    },
    {
      id: "requerimiento", titulo: "2. Descripción del requerimiento",
      campos: [
        { id: "titulo", label: "Nombre del requerimiento", tipo: "text", max: 150, ayuda: "Ej: Adquisición de monitores multiparámetro para UPC" },
        { id: "tipo", label: "Tipo de compra", tipo: "select", opciones: ["Insumo clínico", "Fármaco", "Equipamiento", "Bien general", "Servicio", "Mantención", "Obra / infraestructura"] },
        { id: "convenio_marco", label: "¿Existe en Convenio Marco?", tipo: "select", opciones: ["Sí", "No", "Desconozco"] },
        { id: "descripcion", label: "Descripción detallada", tipo: "textarea", min: 30, max: 3000 },
        { id: "justificacion", label: "Justificación de la necesidad", tipo: "textarea", min: 30, max: 3000 },
      ],
    },
    {
      id: "plazos", titulo: "3. Plazo, prioridad y presupuesto",
      campos: [
        { id: "prioridad", label: "Prioridad", tipo: "select", opciones: ["Normal", "Urgente", "Emergencia"] },
        { id: "fecha_requerida", label: "Fecha en que se necesita", tipo: "date" },
        { id: "justificacion_plazo", label: "Justificación del plazo y prioridad", tipo: "textarea", min: 15, max: 1500 },
        { id: "centro_costo", label: "Centro de costo", tipo: "text", max: 80 },
        { id: "item_presupuestario", label: "Ítem / subtítulo presupuestario", tipo: "text", max: 80 },
        { id: "lugar_entrega", label: "Lugar de entrega o ejecución", tipo: "text", max: 150 },
      ],
    },
  ],

  items: { min: 1, max: 100 },
  unidadesMedida: ["Unidad", "Caja", "Paquete", "Kit", "Frasco", "Litro", "Kilo", "Metro", "Servicio", "Hora", "Mes", "Global"],

  documentos: [
    { id: "eett", label: "Especificaciones técnicas / Términos de referencia", min: 1, max: 5 },
    { id: "cdp", label: "Certificado de disponibilidad presupuestaria", min: 1, max: 3 },
    { id: "cotizaciones", label: "Cotizaciones", min: 1, max: 10, ayuda: "Adjunte al menos una cotización vigente" },
    { id: "memo", label: "Memorándum de solicitud firmado por jefatura", min: 1, max: 3 },
  ],

  declaracion: "Declaro que la información entregada es fidedigna, que el requerimiento cuenta con la autorización de mi jefatura y que la documentación adjunta está completa y vigente.",

  estados: ["Ingresada", "Asignada", "En revisión", "Observada", "En proceso de compra", "OC emitida", "Cerrada", "Rechazada"],
  estadosCierre: ["OC emitida", "Cerrada", "Rechazada"],
  estadosConComentario: ["Observada", "Rechazada"],
  // Estados que exigen tener un comprador responsable asignado
  estadosConResponsable: ["Asignada", "En revisión", "Observada", "En proceso de compra", "OC emitida", "Cerrada"],
};
