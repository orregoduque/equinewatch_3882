# Organizaciones y establos · v0.4

Actualización v0.5: el alta de nuevos caballos por responsables, con propietarios aprobados y límites, se detalla en ALTAS-DELEGADAS-20261118.md. Este documento conserva el contrato inicial v0.4 de asignaciones y ámbitos.

Este incremento añade separación administrativa por organización y por establo al panel complementario. Se instala solamente en el entorno aislado. No cambia permisos de fotos/vídeo, propietarios de caballos, buckets, Secrets HLS, cámaras o Raspberry actuales.

## Modelo y responsabilidades

Una organización agrupa establos. Cada establo tiene un UUID, y sus Raspberry y cámaras conservan sus UUID/identificadores técnicos. El caballo se asocia por UUID a una organización y a un establo, conservando su propietario y su destino de fotos. El nombre sigue siendo una etiqueta editable, nunca una clave de autorización.

| Responsabilidad | Consultar | Preparar nuevos establos | Asignar personas/caballos | Administración global |
|---|---|---|---|---|
| Administrador central explícito | Todas las organizaciones | Sí | Sí | Sí |
| Responsable de organización (`org_admin`) | Su organización completa | Sí | Pendiente de delegación; central en esta versión | No |
| Instalador, ámbito de organización | Su organización | Sí | No | No |
| Instalador limitado a un establo | Solo ese establo | No, porque ampliaría su propio ámbito | No | No |
| Consulta (`viewer`) | Organización o establo asignado | No | No | No |

Estos son roles del panel, separados de los roles comerciales de `user_profiles`. Tener `owner`, `caretaker` o incluso un valor en metadata no concede administración. Las responsabilidades proceden de tablas privadas y se comprueban en cada petición. Se admite una membresía por usuario/organización, con ámbito de organización o de un establo. El mismo usuario puede tener membresías expresas en varias organizaciones. Varios establos concretos dentro de una organización, sin acceso al resto, requerirán ampliar este modelo; no se simulan concediendo acceso a toda la organización.

Crear una responsabilidad aquí **no autoriza a ver fotos o live**. La autoridad complementaria continúa desactivada. Los permisos existentes de la app y del receptor HLS permanecen vigentes.

## Uso del panel

1. Abre el demo local en `http://127.0.0.1:8899/` o el staging en `http://127.0.0.1:8898/`. Staging exige contraseña y MFA de una cuenta de pruebas autorizada. Las instrucciones privadas anteriores conservan su ubicación, no se incluyen en el paquete.
2. En **Organizaciones y establos**, crea una organización de prueba. Sus registros anteriores no se incorporan automáticamente.
3. Selecciona esa organización y prepara uno o varios **nuevos** establos. Esta operación no adopta un establo histórico, no cambia IP ni instala servicios.
4. Como administrador central, selecciona una persona activa ya creada y asigna una responsabilidad. El ámbito vacío abarca la organización; el ámbito de un establo limita instaladores/lectores. `org_admin` requiere ámbito de organización.
5. Para asociar un caballo existente, selecciona su UUID y un establo de esa organización. Su propietario y `photo_backend` se conservan. Una asociación con una cámara activa en otro establo se rechaza y exige un flujo posterior de traslado revisado.
6. Una sesión delegada muestra únicamente la sección de organizaciones. No descarga el catálogo global ni llama a sus rutas. El servidor y PostgreSQL vuelven a comprobar los límites aunque se envíe una URL manualmente.
7. Usa **Retirar responsabilidad** para revocar una membresía, conservando su fila e historial. La revisión impide sobrescribir una edición concurrente. La API permite cambiar rol/ámbito y reactivar una membresía existente; no crear otra fila para el mismo usuario/organización.
8. **Suspender organización** retira el acceso delegado a todos sus ámbitos sin borrar historial. El administrador central puede reactivarla desde la misma sección. No detiene procesos físicos ni revoca permisos históricos de medios.

Los listados tienen páginas de 20 registros y la API acepta hasta 100. La búsqueda de organizaciones trata `%` y `_` como texto literal. Las selecciones de establo de los formularios se limitan a la página visible de establos: usa sus controles de paginación para seleccionar otro. No se carga todo el inventario en un desplegable.

## Diseño y migración

Se añade `db/007_organizations.sql`. Las migraciones 1–6 conservan sus bytes lógicos y sus checksums. La migración 7 está registrada con checksum en la rama de pruebas y el arranque real exige las siete migraciones. El inicio no ejecuta DDL ni copia datos de producción.

Nuevas tablas privadas en `se_control_v1`:

- `organizations`: organización, estado, revisión y creador.
- `organization_sites`: pertenencia inmutable y única de un nuevo establo.
- `organization_memberships`: usuario, rol, ámbito, vigencia y revisión.
- `organization_horses`: caballo único con FK compuesta organización/establo.
- `organization_events`: cambios de preparación visibles dentro del ámbito.
- `organization_idempotency`: respuestas por organización, actor y clave.

Todas tienen RLS habilitado/forzado y carecen de acceso público. Las referencias tienen índices. No se concede escritura general sobre `public.horses`, `public.user_profiles` ni `auth.users`.

En el inventario privado existente, únicamente se amplía la lectura para recursos expresamente asociados. Una sola policy combina lectura central y lectura delegada; las inserciones ordinarias siguen reservadas al administrador central. No hay lectura delegada de bindings, grants, planes globales, solicitudes de cuentas o auditoría global.

Las funciones privadas con `SECURITY DEFINER` resuelven membresías sin recursión de RLS, proyectan solo el catálogo de caballos asociado y permiten crear atómicamente un **nuevo** establo. Tienen `search_path=pg_catalog`, referencias calificadas y `EXECUTE` revocado a `PUBLIC`. Su contexto de actor lo establece el servidor después de verificar Auth/MFA; no se acepta un actor enviado por el cliente ni se comparte el login de base de datos.

La creación delegada bloquea organización/membresía mientras comprueba su vigencia y ámbito. Una membresía retirada, degradada o limitada no permite reutilizar una respuesta idempotente para saltarse los permisos. Los cambios centrales se registran en la auditoría global; las preparaciones de establos se registran en el ámbito correspondiente. La auditoría organizativa completa de cambios de rol/asociaciones para delegados queda pendiente.

## API

Mismo origen, sesión opaca HttpOnly, MFA en staging y CSRF para escrituras. Cada escritura requiere `Idempotency-Key`. No hay API de activación de medios.

| Ruta | Operación |
|---|---|
| `GET /api/organizations?after=&limit=20&q=` | Organizaciones visibles; central incluye suspendidas |
| `POST /api/organizations` | Central: `{name}` |
| `GET /api/organizations/:id` | Organización, rol efectivo y capacidades |
| `PUT /api/organizations/:id` | Central: `{revision,state: "active"\|"suspended"}` |
| `GET /api/organizations/:id/sites` | Establos del ámbito, paginados |
| `POST /api/organizations/:id/sites` | Central/responsable/instalador de organización: `{name}` |
| `GET /api/organizations/:id/members` | Central ve miembros; delegado ve solo su propia membresía |
| `POST /api/organizations/:id/members` | Central: `{user_id,role,site_id:null\|uuid}` |
| `PUT /api/organizations/:id/members/:membershipId` | Central: `{revision,role,site_id,active}` |
| `GET /api/organizations/:id/horses` | Solo UUID/nombre/activo/establo; no propietario ni URLs |
| `POST /api/organizations/:id/horses` | Central: `{horse_id,site_id}`; no traslados implícitos |
| `GET /api/organizations/:id/devices` | Borradores de Raspberry del ámbito |
| `GET /api/organizations/:id/cameras` | Borradores de cámaras del ámbito |
| `GET /api/organizations/:id/events` | Eventos visibles dentro del ámbito |

Las colecciones admiten `after` UUID, `limit` 1–100 y `q` máximo 120 caracteres. `q` filtra organizaciones, sitios, caballos, dispositivos y cámaras; miembros/eventos conservan su paginación sin búsqueda textual. Una organización desconocida y una ajena producen el mismo 404. Los responsables delegados no pueden consultar rutas globales aunque conozcan un UUID válido. No se realizan cambios de asociación de recursos existentes desde estas rutas.

## Verificación y reproducción

- `npm test`: incluye las pruebas previas y `tests/organizations.test.mjs` con SQL/RLS/API, escalada de rol, UUID ajeno, ámbito de establo, revocación/suspensión, perfiles inactivos, idempotencia, paginación y rollback.
- `tools/verify-organizations-staging.mjs`: usa exclusivamente las cuentas ficticias de la rama fija. Crea dos organizaciones, ensaya ambos ámbitos con sesiones reales/MFA, acceso de consulta, un alta delegada, caballo por UUID y navegador. Después retira las membresías temporales. Si una prueba falla, revisar `cleanup_pending` antes de repetir; no deja accesos abiertos intencionalmente.
- La preparación MFA de esos fixtures acepta `tools/prepare-staging-mfa.mjs owner` y `outside`, además del administrador por defecto. No es enrollment de clientes ni imprime semillas/códigos.
- Los informes saneados y capturas se guardan en `evidence/phase4-*` y `panel-organizacion*.jpg`. Los secretos, contraseñas y semillas quedan en `private/`, excluidos del repositorio y paquetes.
- Las herramientas de navegador requieren Playwright 1.65.1 instalado en `.qa/node_modules` y Chrome en la ruta indicada por el script. Son dependencias de QA, excluidas del paquete de ejecución; `npm test` no las necesita. `verify-organizations-demo-browser.mjs` comprueba los formularios centrales con datos locales ficticios.
- Se ejecutan advisors de seguridad/rendimiento sobre la rama. Los índices nuevos sin uso previo pueden generar INFO; no se eliminan índices necesarios para FK o futuras consultas por esa única razón.

Las pruebas locales y de contrato no certifican carga de ingestión o streaming de 3.600 caballos. Se mantienen las limitaciones del staging v0.3: historial legado no reproducible y contrato mínimo de Auth/catálogo. No fusionar esta rama Supabase con producción.

Resultado de esta entrega: **89 pruebas locales aprobadas**, integración real con dos organizaciones, MFA, creación delegada/idempotencia, proyección de caballos, navegador de escritorio y ancho móvil, revocación sobre sesión abierta y suspensión verificadas. Advisors: sin alertas de seguridad ni WARN de rendimiento; únicamente INFO de índices nuevos sin uso y configuración previa de conexiones Auth. Producción conserva ausente el esquema complementario.

## Qué sigue

Faltan invitación/activación y recuperación, MFA autoservicio, alta delegada de usuarios/caballos con sus cuotas y auditoría completa, múltiples ámbitos concretos por persona, staging integral reproducible, CI/backups/restauración y despliegue HTTPS. Después: enrollment seguro de Raspberry y adaptadores reales de cámara, Wasabi y HLS con verificaciones antes de activar. La migración de las instalaciones actuales continúa siendo una fase posterior independiente.

Referencias: [RLS y comprobaciones de pertenencia](https://supabase.com/docs/guides/database/postgres/row-level-security), [protección de funciones](https://supabase.com/docs/guides/database/functions), [seguridad de conexiones](https://supabase.com/docs/guides/database/secure-data).
