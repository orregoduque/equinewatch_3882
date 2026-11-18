# Stable Eye · Administración complementaria

Versión 0.4: altas/accesos, preparación de instalaciones y autenticación con Supabase aislado. **No migra cámaras existentes ni modifica permisos o servicios productivos.**

La separación administrativa por organización/establo se describe en [ORGANIZACIONES-Y-ESTABLOS-20261118.md](docs/ORGANIZACIONES-Y-ESTABLOS-20261118.md). No concede permisos de medios ni adopta instalaciones actuales.

Auth y altas se probaron contra una rama de integración con MFA y cuentas ficticias. Ver [AUTH-Y-ALTAS-20261118.md](docs/AUTH-Y-ALTAS-20261118.md) para acceso, evidencias y limitaciones.

El análisis y desarrollo por etapas están en [PLAN-MAESTRO-INSTALACIONES-20261118.md](docs/PLAN-MAESTRO-INSTALACIONES-20261118.md). Distingue el despliegue privado de pruebas de la automatización completa y de la escala de fotos/vídeo.

## Qué funciona

- Panel local: usuarios/caballos, permisos separados de fotos y vídeo, vencimiento, edición con revisión y retirada conservando historial.
- Simulación de autorizaciones, sin descargar fotografías ni abrir streams reales.
- Preparación de establos, Raspberry y cámaras con asociación por UUID. Reserva de IP por sede, MAC e identificador únicos; las altas quedan en borrador.
- PostgreSQL local mediante PGlite para demo y una rama Supabase separada para el contrato de integración.
- Auditoría y escrituras idempotentes. RLS, privilegios mínimos, verificación real de Supabase y MFA en staging y protección CSRF del entorno local.
- Adaptador de compatibilidad `off`/`shadow`. **No incorpora modo de aplicación real de permisos.**
- Planes de instalación con contenido inmutable y reservas de cámara, MAC, IP, caballo y nodo; documentos IAM limitados a un prefijo para revisión.
- Inventario observado sin credenciales: lo registrado mantiene administración histórica y bloquea planes con identidades ocupadas. No se descubren automáticamente equipos desconocidos.
- Ensayo persistente de diez pasos, concesiones temporales, recuperación tras fallo, cancelación y reintentos acotados. Cada resultado indica que la prueba externa sigue pendiente.
- API paginada, bootstrap acotado, búsquedas por formulario y páginas de grants.
- Login de staging con cookie opaca, CSRF, MFA y verificación de Auth/sesión/administración. Tokens del proveedor solo en backend.
- Altas idempotentes de caballos y solicitudes duraderas de cuentas/perfiles, con conciliación y revisión de cuentas ya existentes. Demo crea datos locales ficticios; staging permanece aislado de clientes.

## Probar en este PC

El panel se sirve en `http://127.0.0.1:8899/`. Solo contiene identidades ficticias `example.invalid` y dos caballos iniciales ampliables desde el panel. Está limitado al loopback del PC. El modo demo crea una sesión local ficticia; no es autenticación de un cliente real y no debe exponerse por un túnel público.

Con Node.js 22.16 o posterior:

```powershell
npm ci --ignore-scripts
npm test
npm start
```

Abrir la URL. Los cambios persisten en `data/demo`, excluido del repositorio. `Start-Demo.ps1` ofrece una ejecución local en segundo plano; no instala tareas de inicio ni servicios.

## Separación de producción

No se cambiaron el proyecto Supabase productivo, las Raspberry, Wasabi, el bot, el monitor, los Secrets ni los despliegues de Replit. Las consultas a producción fueron de metadatos, solo lectura. Se creó una rama sin clientes y un contrato mínimo de Auth/catálogo. El replay legado quedó `MIGRATIONS_FAILED`; estas pruebas no equivalen a una réplica completa lista para fusionar.

La ruta `/api/access/decision` siempre devuelve autoridad desactivada en esta entrega. Solo la simulación devuelve resultados de prueba; la API real no acepta esos resultados como autorizaciones. La tabla `release_guard` impide activar autoridad cambiando simplemente una casilla o variable. `createComplementaryAccess` rechaza el modo `enforce`.

No hay ejecución de comandos remotos, escritura de IAM, cambio ONVIF de IP, generación de credenciales HLS ni arranque de servicios de cámara. El asistente crea un plan **no ejecutable**. Estas son las siguientes entregas, después de validar el registro de accesos.

## Staging futuro

`CONTROL_MODE=staging` usa PostgreSQL con rol restringido, CA verificada, guarda del proyecto y login SDK/MFA. **No instala migraciones ni importa datos al iniciar.** Rechaza producción y requiere siete migraciones privadas y una responsabilidad explícita del panel. No entregar `service_role` al navegador. `Start-Staging.ps1` abre el entorno preparado en localhost 8898.

La migración inicial contiene tres funciones privadas de lectura limitada con `SECURITY DEFINER`: catálogo mínimo para administradores explícitos, estado activo del perfil actual y estado activo del caballo. Son necesarias para reutilizar el catálogo existente sin reescribir su RLS. Tienen `search_path=pg_catalog`, referencias calificadas, `EXECUTE` público revocado y no escriben tablas existentes. Revisar estos privilegios con los advisors antes de cualquier instalación en Supabase. La aplicación actúa con el rol restringido `se_control_runtime`; no se deben entregar sus credenciales al navegador o a las Raspberry.

Las integraciones actuales permanecen fuera de este servicio. Ver [INTEGRACION-SEGURA.md](docs/INTEGRACION-SEGURA.md), [ALCANCE-Y-SIGUIENTES-PASOS.md](docs/ALCANCE-Y-SIGUIENTES-PASOS.md) y [MENSAJE-PARA-REPLIT.md](docs/MENSAJE-PARA-REPLIT.md).

## Validación

`tests/control.test.mjs` comprueba aislamiento RLS, administración, permisos por caballo, vencimiento, revocación, revisiones, idempotencia concurrente, reservas de IP/MAC, rollback, persistencia y compatibilidad del adaptador apagado. El navegador comprobó alta de permiso, autorización simulada, retirada y denegación posterior; también preparación de sede, equipo y cámara ficticios.

El motor local sirve para desarrollo y pruebas, no para certificar carga, alta disponibilidad ni el funcionamiento bajo la infraestructura real de Supabase. La versión 0.3 pasó integración real de Auth/MFA, cuentas/perfiles, caballos, idempotencia, RLS y logout en una rama aislada. Hay 89 pruebas locales y verificación de navegador en escritorio/ancho móvil. No se probó carga de fotos/vídeo a escala.

Como antecedente, la versión 0.2 añadió 24 pruebas de instalación para un total de 44. Incluye actualización desde el esquema inicial conservando sus datos, cierre/reapertura con progreso, colisiones, bloqueo de recursos observados, leases vencidos/resultados tardíos, cancelación, límites de reintento y HTTP. Se consultaron 3.602 caballos y un registro de 300 equipos/3.600 cámaras en páginas de hasta 100 filas; no es una prueba de streaming o ingestión a esa escala. Ver [API-INSTALACIONES.md](docs/API-INSTALACIONES.md).

Validación de los repositorios actuales: HLS pasó 7 pruebas originales y 9 después de añadir el módulo no importado. En la webapp, la base original y la candidata tuvieron exactamente 251/253 pruebas aprobadas, con los mismos dos fallos locales (pipeline que necesita OpenSSL en PATH y prueba del presigner AWS que devuelve 503). No aparecieron regresiones nuevas. TypeScript y Vite compilaron mediante sus ejecutables directos; `npm ci` presentó un fallo de finalización de npm en Windows y no dejó enlaces `.bin` completos. No se modificaron dependencias ni scripts del proyecto existente para corregir ese entorno.
