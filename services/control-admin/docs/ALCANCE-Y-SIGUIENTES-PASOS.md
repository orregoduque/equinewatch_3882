# Alcance de la versión 0.2

| Componente | Estado |
|---|---|
| Panel de accesos y auditoría | Implementado, probado con datos ficticios |
| Alta de sede/equipo/cámara | Borradores persistentes con validación de colisiones |
| Simulación por usuario/caballo/contenido | Implementada; no abre contenido real |
| Esquema PostgreSQL privado y RLS | Ejecutado y probado en PostgreSQL embebido aislado |
| Autenticación Supabase para staging | Código preparado; requiere prueba real en una base aislada |
| Compatibilidad off/shadow | Probada; sin conexión al flujo productivo |
| Planes, reservas e inventario existente | Implementados en entorno aislado, sin adopción ni descubrimiento automático |
| Documentos IAM por prefijo | Generados para revisión; no adjuntados a usuarios reales |
| Trabajos y recuperación | Ensayo de diez pasos, persistencia, leases, cancelación y reintentos limitados |
| Catálogo y registro paginados | Endpoints implementados; bootstrap/selectores históricos aún pendientes de migración |
| Alta real de usuarios y caballos | Pendiente de staging y adaptadores Auth/perfil/catálogo |
| Cambiar IP física o configurar cámara | No implementado en este primer release; el borrador enumera verificaciones pendientes |
| Crear IAM de Wasabi automáticamente | No implementado ni ejecutado |
| Vincular una Raspberry mediante código y aplicar configuraciones | Siguiente entrega, no instalada |
| Sustituir HLS_RECEIVER_CONFIG por registro dinámico | Pendiente de integración de staging y revisión |
| Migrar cámaras/clientes actuales | No ejecutado, requiere aceptación posterior |

No confundir una preparación válida con una instalación física activa. La consulta a metadatos y las pruebas de fixtures no acreditan roles, políticas o sesiones reales de un despliegue Supabase.

Hay 44 pruebas locales aprobadas y una comprobación del panel en Chrome de pruebas, escritorio y viewport móvil. El registro de ensayo de 300 equipos y 3.600 cámaras no certifica carga real de hardware, vídeo o metadatos. El plan maestro identifica las dependencias para esos objetivos.
