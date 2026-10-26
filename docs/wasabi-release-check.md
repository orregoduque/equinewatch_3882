# Revisión de compatibilidad: Lucero / Wasabi

Fecha: 26 de octubre de 2026.

## Resultado

No se detectaron regresiones en las comprobaciones siguientes. Se preparó el
artefacto de publicación, pero esta revisión **no publicó la aplicación**.
Las pruebas no son una garantía de ausencia absoluta de incidencias.

## Separación de proveedores

- La UI utiliza Wasabi solamente cuando `horses.photo_backend` es `wasabi`.
  Para el resto conserva las consultas a `public.images`, su orden y las
  URLs/miniaturas de Supabase. No se migran ni reescriben registros.
- El endpoint privado admite únicamente Lucero y el prefijo aprobado. Verifica
  la sesión real y los permisos antes de firmar objetos obtenidos de la base.
  Un usuario demo o un rol enviado por el navegador no autorizan las fotos.
- Una configuración Wasabi ausente o inválida no impide arrancar el servidor,
  servir las rutas existentes ni responder a la configuración HLS. Dos pruebas
  adicionales arrancan el servidor de producción con esos escenarios.
- Las credenciales Wasabi solo se leen en el backend; no se incorporan al
  bundle. Los JPEG se solicitan directamente a Wasabi mediante URLs temporales.
- No se cambiaron claves Supabase, tablas, políticas, datos, el bucket, la
  Raspberry ni el receptor de vídeo durante esta revisión.

## Verificaciones

| Comprobación | Resultado |
| --- | --- |
| TypeScript y `npm run build:publish` | Correctos |
| `node --test tests/*.test.mjs` | 199 aprobadas; ninguna fallida u omitida |
| Wasabi en navegador, datos sintéticos | Captura nueva, firmas selectivas, renovación, histórico, cambio de caballo y logout correctos |
| Fotos Supabase, escritorio y móvil | Timeline, miniaturas diferidas y revisión por hora correctos |
| Fichas, retratos y navegación | 20 escenarios sintéticos correctos; sin escrituras |
| Registro | 11 escenarios sintéticos correctos, incluidas las 12 tareas y errores de guardado |
| Live video HLS | 21 escenarios sintéticos correctos, incluidos móvil, permisos, cierre y precarga |
| Continuidad respecto a `https://stableeye.co` | Pestaña antigua y nueva correctas; 64 archivos anteriores conservados |

Se corrigió exclusivamente una carrera en la prueba de Registro: el observador
de la petición inicial ahora se registra antes de navegar. No se cambió la UI,
el guardado ni las consultas del módulo Registro.

La comprobación de continuidad usa el frontend publicado y sesiones sintéticas;
no se utilizaron sesiones de clientes ni se hizo una prueba de carga.
La captura visual sin sesión muestra el listado vacío, no las fichas privadas.
La persona usuaria confirmó que ve la foto real de Lucero en el preview.

## Pendiente con sesiones reales

Antes de dar por concluida la validación funcional real, comprobar:

1. Otra cuenta real sin permiso recibe 403 y ninguna URL firmada.
2. Conservar una foto más de diez minutos y suspender/reabrir la pestaña:
   renovar el acceso sin perder la selección.
3. Después de publicar, verificar Lucero y un caballo que siga usando Supabase,
   además de la ficha, Registro y Live video con sus permisos habituales.

Las comprobaciones simuladas de permisos y renovación sí pasaron. No se
presentan como prueba de RLS/IAM con todas las cuentas reales ni de capacidad
de producción. No modificar políticas o credenciales para facilitar las pruebas.

## Reproducción

Preparar primero `npm run build:publish` y ejecutar las pruebas unitarias.
Para navegador:
`test-wasabi-photos.mjs`, `test-hourly-timeline.mjs`,
`test-timeline-thumbnails.mjs`, `test-horse-details.mjs`,
`test-registro.mjs` y `test-timeline-live-video.mjs`, bajo `scripts/`,
reciben la URL de preview como primer argumento.
`test-release-continuity.mjs` recibe la URL de producción obtenida de Publishing.
No ejecutar luego una compilación limpia que elimine los archivos conservados.
