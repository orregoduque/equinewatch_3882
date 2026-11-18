# Revisión complementaria: no publicar ni migrar

Implementación preparada en una rama independiente `codex/complementary-control-v1`.

Revisa el nuevo servicio de administración como una aplicación separada de prueba. No cambies el servidor existente, scripts de arranque, .replit, Secrets, HLS_RECEIVER_CONFIG, datos o policies de Supabase, IAM de Wasabi o servicios de las Raspberry. No publiques ni fusiones todavía.

El paquete contiene panel, API, esquema privado preparado, datos ficticios, pruebas y un adaptador off/shadow. Los permisos de este panel aún no autorizan contenido real. Mantén el bloqueo de autoridad productiva: no añadas un atajo que permita habilitarlo mediante una variable.

Ejecuta el paquete de forma aislada con Node 22.16+, `npm ci --ignore-scripts`, `npm test` y `npm start`. Escucha por defecto solo en loopback 8899; esa restricción protege el demo sin autenticación de clientes. No cambies el loopback ni lo publiques para poder verlo desde Internet. Un preview remoto necesita primero un despliegue autenticado de staging.

Verifica el catálogo y las rutas de fotos/live actuales contra el commit publicado antes de proponer una integración. Importa una copia de las asociaciones vigentes únicamente cuando el operador entregue esa copia por canal privado; no reconstruyas Secrets a partir de ejemplos. Las listas HLS solo acreditan LIVE: no deben crear permisos de fotos o administración implícitos.

Entrega hallazgos, pruebas y propuesta de integración en staging. No declares automatizado el cambio físico de IP ni el aprovisionamiento IAM: están fuera de esta primera entrega. La migración de cámaras existentes se realizará después de pruebas, comparación de permisos y aprobación explícita.
