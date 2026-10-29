# ADQUISICIONES

Plataforma de **solicitudes de compra** del Sub Departamento de Abastecimiento — Hospital de Villarrica.

Resuelve el problema de que las solicitudes llegan a Abastecimiento sin documentación completa y sin un responsable claro:

- **Requirente** (`/`): formulario donde **todo es obligatorio** (datos, ítems, documentos y declaración). El botón *Enviar* solo se habilita al 100 %. Se validan RUT, correo, fechas, montos, formato y tamaño de archivos, y se rechazan PDF con contraseña o dañados.
- **PDF consolidado automático**: al enviar se genera **un solo PDF** con folio (`SC-AAAA-00001`), portada con todos los datos, tabla de ítems, índice de anexos con número de página y todos los documentos adjuntos incrustados. El comprador solo lo descarga.
- **Bandeja de compradores** (`/comprador`, con usuario y clave): KPIs (solicitudes, **sin responsable**, abiertas, vencidas, días promedio a asignación y a cierre), carga por responsable, filtros, exportación CSV, detalle, **asignación de comprador**, cambio de estado y comentarios. Cada acción y cada descarga del PDF queda en el **historial con el usuario y la hora**.
- **Seguimiento** (`/seguimiento`): el requirente, con folio + correo, ve **quién es el comprador responsable**, su correo, el estado y las observaciones.

Reglas de negocio incluidas: no se puede pasar una solicitud a estados de gestión (Asignada, En revisión, En proceso de compra, OC emitida, Cerrada…) sin un comprador responsable; *Observada* y *Rechazada* exigen comentario.

## Arquitectura (todo en el plan gratuito de Cloudflare)

| Pieza | Servicio |
|---|---|
| Código | GitHub (este repositorio) |
| Sitio y API | Cloudflare Pages + Pages Functions (`/functions`) |
| Base de datos | Cloudflare D1 (`schema.sql`) |
| PDFs | Cloudflare R2 |

El PDF se arma en el navegador del requirente (librería pdf-lib incluida en `public/vendor`, sin depender de CDNs externos que el firewall del hospital pueda bloquear), por lo que no consume CPU del servidor.

## Despliegue paso a paso (desde el panel de Cloudflare, sin programar)

1. **Base de datos D1** — Cloudflare → *Storage & Databases* → *D1* → **Create database** → nombre `adquisiciones`. Abra la base → pestaña **Console** → pegue todo el contenido de `schema.sql` → *Execute*.
2. **Almacenamiento R2** — *R2 Object Storage* → **Create bucket** → nombre `adquisiciones`. (La primera vez R2 pide activar el servicio; los primeros 10 GB son gratis.)
3. **Pages** — *Workers & Pages* → **Create** → pestaña *Pages* → **Connect to Git** → elija el repositorio `nicolasguzman11/ADQUISICIONES`.
   - Framework preset: **None**
   - Build command: *(vacío)*
   - Build output directory: **`public`**
   - **Save and Deploy**.
4. **Enlaces (bindings)** — en el proyecto de Pages → *Settings* → *Bindings* → **Add**:
   - *D1 database*: Variable name **`DB`** → base `adquisiciones`
   - *R2 bucket*: Variable name **`ARCHIVOS`** → bucket `adquisiciones`
5. **Usuarios del panel** — *Settings* → *Variables and Secrets* → **Add** → tipo *Secret*:
   - Nombre: **`PANEL_USERS`**
   - Valor: `usuario1:clave1;usuario2:clave2` (un par por persona, separados por `;`; el nombre de usuario es el que queda en el historial)
6. *Deployments* → **Retry deployment** (para que tome los enlaces y la variable).
7. Abra `https://<su-proyecto>.pages.dev/comprador`, ingrese con su usuario y agregue los compradores en el botón **Compradores**.

Comparta con los servicios clínicos solo el enlace principal `https://<su-proyecto>.pages.dev/`.

> Si la red del hospital bloquea `pages.dev` (como pasó con `github.io`), pida a Informática habilitar ese dominio, o asigne un dominio propio en *Custom domains*.

### Opcional: acceso con correo institucional (Cloudflare Access)
En vez de usuario/clave puede proteger `/comprador*` y `/api/admin/*` con *Zero Trust → Access* (gratis hasta 50 usuarios) y agregar la variable `USE_ACCESS` = `1`. El historial registrará el correo de cada persona.

## Personalización
- **Campos, documentos obligatorios, estados y límites de tamaño**: `functions/_lib/config.js`. El formulario, la validación del servidor, el panel y el PDF se adaptan solos.
- **Colores**: `public/css/estilo.css` (misma paleta que los dashboards de Abastecimiento).

## Estructura
```
public/            sitio estático (formulario, panel, seguimiento, estilos, pdf-lib)
functions/         API (Cloudflare Pages Functions)
  _middleware.js   protección del panel
  _lib/config.js   configuración del formulario
  api/...          endpoints
schema.sql         tablas D1
```
