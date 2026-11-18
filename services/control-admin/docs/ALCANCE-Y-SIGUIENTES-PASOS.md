# Alcance de la primera entrega

| Componente | Estado |
|---|---|
| Panel de accesos y auditoría | Implementado, probado con datos ficticios |
| Alta de sede/equipo/cámara | Borradores persistentes con validación de colisiones |
| Simulación por usuario/caballo/contenido | Implementada; no abre contenido real |
| Esquema PostgreSQL privado y RLS | Ejecutado y probado en PostgreSQL embebido aislado |
| Autenticación Supabase para staging | Código preparado; requiere prueba real en una base aislada |
| Compatibilidad off/shadow | Probada; sin conexión al flujo productivo |
| Cambiar IP física o configurar cámara | No implementado en este primer release; el borrador enumera verificaciones pendientes |
| Crear IAM de Wasabi automáticamente | No implementado ni ejecutado |
| Vincular una Raspberry mediante código y aplicar configuraciones | Siguiente entrega, no instalada |
| Sustituir HLS_RECEIVER_CONFIG por registro dinámico | Pendiente de integración de staging y revisión |
| Migrar cámaras/clientes actuales | No ejecutado, requiere aceptación posterior |

No confundir una preparación válida con una instalación física activa. La consulta a metadatos y las pruebas de fixtures no acreditan roles, políticas o sesiones reales de un despliegue Supabase.
