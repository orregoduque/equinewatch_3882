# Alcance de la versión 0.5

| Componente | Estado |
|---|---|
| Panel de accesos y auditoría | Implementado, probado con datos ficticios |
| Alta de sede/equipo/cámara | Borradores persistentes con validación de colisiones |
| Simulación por usuario/caballo/contenido | Implementada; no abre contenido real |
| Esquema PostgreSQL privado y RLS | Ejecutado y probado en PostgreSQL embebido aislado |
| Autenticación Supabase para staging | Probada en contrato aislado: cookie opaca, CSRF, sesión Auth y MFA |
| Compatibilidad off/shadow | Probada; sin conexión al flujo productivo |
| Planes, reservas e inventario existente | Implementados en entorno aislado, sin adopción ni descubrimiento automático |
| Documentos IAM por prefijo | Generados para revisión; no adjuntados a usuarios reales |
| Trabajos y recuperación | Ensayo de diez pasos, persistencia, leases, cancelación y reintentos limitados |
| Catálogo y registro paginados | Bootstrap acotado, buscadores, contadores y páginas de grants |
| Alta real de usuarios y caballos | Probada en contrato Supabase con fixtures, conciliación e idempotencia |
| Organización y establo | Roles y ámbitos complementarios implementados en el entorno aislado; ver ORGANIZACIONES-Y-ESTABLOS-20261118.md |
| Altas delegadas de caballos | Responsable de organización, propietario aprobado, límite operativo e idempotencia; probado en staging |
| Cambiar IP física o configurar cámara | No implementado en este primer release; el borrador enumera verificaciones pendientes |
| Crear IAM de Wasabi automáticamente | No implementado ni ejecutado |
| Vincular una Raspberry mediante código y aplicar configuraciones | Siguiente entrega, no instalada |
| Sustituir HLS_RECEIVER_CONFIG por registro dinámico | Pendiente de integración de staging y revisión |
| Migrar cámaras/clientes actuales | No ejecutado, requiere aceptación posterior |

No confundir una preparación válida con una instalación física activa. Se verificaron roles, políticas y sesiones reales en un contrato Supabase aislado; esto no certifica la configuración productiva ni una réplica completa del legado.

Hay 105 pruebas locales aprobadas y una comprobación del panel en Chrome de pruebas, escritorio y viewport móvil. El registro de ensayo de 300 equipos y 3.600 cámaras no certifica carga real de hardware, vídeo o metadatos. El plan maestro identifica las dependencias para esos objetivos.

Pendientes antes de clientes: altas delegadas de personas y auditoría organizativa ampliada, invitación/activación, recuperación, MFA autoservicio, staging integral del legado, backups/CI y despliegue HTTPS. Ver AUTH-Y-ALTAS-20261118.md.
