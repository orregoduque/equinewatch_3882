# Alta delegada de caballos · v0.5

El responsable de una organización ya puede registrar caballos dentro de sus propios establos. El propietario debe estar aprobado expresamente por el administrador central, y la operación respeta un límite operativo por organización. Este bloque funciona en el panel aislado: no cambia las cámaras, permisos o destinos de fotos actuales.

## Responsabilidades distintas

- **Miembro del panel:** permite consultar o preparar recursos según el rol y ámbito de la organización. Solo `org_admin` y el administrador central pueden dar de alta caballos. Los instaladores y lectores conservan sus permisos anteriores.
- **Propietario aprobado:** perfil activo al que se permite asociar nuevos caballos en una organización o en un establo concreto. Esta aprobación no concede acceso al panel, a fotografías ni a live.
- **Propietario del caballo:** `horses.owner_id`, UUID persistente del perfil. La aprobación anterior permite seleccionarlo, pero no sustituye el registro de propietario del caballo.
- **Permiso de medios:** sigue bajo la autoridad histórica de la app y del receptor HLS. La creación de caballo no genera grants, Secrets, URLs de fotos ni claves de publicación.

No deducir aprobaciones por nombres, correos, rol comercial, metadata editable, pertenencia al establo o posesión de otro caballo. Los usuarios de pruebas se seleccionan por UUID; el correo no se usa como clave de asociación.

## Preparación central

1. Abre el panel de pruebas y selecciona una organización activa en **Organizaciones y establos**.
2. Prepara sus establos. La pertenencia al ámbito queda registrada expresamente; no se importa inventario histórico.
3. Asigna una persona activa como **Responsable de organización**, si corresponde. Esto conserva el mecanismo de membresías v0.4.
4. En **Aprobar un propietario existente**, selecciona el perfil activo. Puedes buscarlo en el directorio central paginado.
5. Escoge toda la organización o un establo concreto y pulsa **Aprobar propietario**. El registro conserva creador, revisión y vigencia. Una aprobación por usuario/organización; para cambiar su ámbito o reactivarla usa su registro existente, no otra fila.
6. Ajusta el **límite operativo de caballos** si hace falta. Es una salvaguarda de altas, no un plan de facturación ni una estimación de capacidad de vídeo.

El administrador central puede retirar/reactivar aprobaciones desde la lista, que tiene páginas de veinte filas. El cambio de ámbito con revisión está disponible por API; no hay traslado automático de caballos existentes. Retirar una aprobación impide **nuevas** altas, sin reasignar ni borrar los caballos previos.

La asociación central de un caballo ya existente conserva su flujo v0.4 y requiere revisión explícita de cámaras/establo; ahora consume también el límite de la organización. No incorpora automáticamente al propietario al nuevo directorio de aprobaciones.

## Alta por el responsable

1. Inicia sesión en staging con contraseña y MFA de una cuenta autorizada. Las credenciales de fixtures continúan en los archivos privados anteriores; no se incluyen en esta guía ni en el paquete.
2. Selecciona una organización de tu ámbito. La sección **Registrar un caballo** solo aparece para responsabilidades autorizadas.
3. Indica nombre y un identificador de box único. El contrato actual conserva la unicidad global de `stall_number`; usar un prefijo estable, por ejemplo `NORTE:BOX-01`, evita colisiones. El nombre no necesita ser único.
4. Selecciona un establo de esa organización. El formulario usa los establos de la página visible del inventario; los controles de paginación permiten encontrar otros.
5. Busca y selecciona un propietario aprobado para ese establo. El directorio devuelve solo UUID y nombre, nunca correos, datos de otras organizaciones ni credenciales. Si no hay opciones, solicita al administrador central que revise las aprobaciones.
6. Pulsa **Registrar caballo en este establo**. El servidor vuelve a comprobar rol, perfil, organización, establo, propietario, habilitación del entorno y cupo, aunque el navegador tenga una selección antigua.
7. Comprueba el caballo en el listado de la organización y la nueva capacidad disponible.

El resultado conserva `owner_id`, crea un UUID nuevo y devuelve `installation_required=true`. `photo_backend` sigue siendo `supabase` como valor inicial del contrato; **no significa que ya existan fotos o un publicador**. La instalación de cámara, Wasabi y live es una fase posterior. No editar a mano ese campo para simular una instalación completada.

## Límites y concurrencia

Cada organización nueva recibe un límite operativo de **100**, configurable de **0 a 100.000** por el administrador central. En organizaciones de pruebas ya registradas, la migración conserva como mínimo su uso anterior. No modifica ningún límite de producción.

Se cuentan todas las asociaciones de caballos de la organización, incluidos los inactivos; no se puede liberar cupo cambiando un booleano. No se permite reducir el límite por debajo del uso actual. Límite cero bloquea las altas de una organización vacía.

Un trigger privado protege **todos** los INSERT de asociaciones, incluyendo la ruta central para caballos existentes. El bloqueo de la organización serializa las altas y los cambios del límite. Si queda un cupo y llegan dos solicitudes diferentes, solo una puede confirmarse. Las altas de organizaciones diferentes no comparten ese bloqueo.

La creación pública del caballo, asociación privada y ambas auditorías se confirman en una transacción. Si falla el propietario, el box, una relación o el cupo, también se revierte cualquier caballo insertado en esa operación.

Las escrituras requieren idempotencia. Repetir la misma solicitud con la misma clave recupera el mismo UUID, incluso si la primera alta completó el último cupo. Cambiar el contenido con esa clave produce 409. El navegador conserva la clave del intento mientras esa página siga abierta; tras recargar, comprobar primero el listado si se perdió la respuesta. La unicidad del box evita duplicar ese alta con otro UUID inadvertidamente.

La autorización se comprueba antes de devolver un replay. Un responsable degradado a instalador o lector no puede usar una respuesta idempotente anterior para conservar facultades de alta.

## API adicional

Mismos controles de cookie opaca, MFA, CSRF, Host/Origin y rol restringido. `Idempotency-Key` es obligatorio para todas las escrituras.

| Ruta | Operación |
|---|---|
| `GET /api/organizations/:org/horse-capacity` | Responsable/central: límite, uso, restantes, revisión y habilitación |
| `PUT /api/organizations/:org/horse-capacity` | Central: `{horse_limit,revision}` |
| `POST /api/organizations/:org/owners` | Central: `{user_id,site_id:null\|uuid}` |
| `PUT /api/organizations/:org/owners/:id` | Central: `{site_id,active,revision}`; identidad inmutable |
| `GET /api/organizations/:org/owner-records` | Central: registro de aprobaciones, incluidas retiradas, paginado |
| `GET /api/organizations/:org/owners?site_id=UUID&limit=20&q=` | Responsable/central: propietarios activos aprobados para ese establo |
| `POST /api/organizations/:org/horse-registrations` | Responsable/central: `{name,stall_number,site_id,owner_id}` |

Las dos colecciones admiten `after`, límite 1–100 y `q` máximo 120 caracteres. `q` filtra el directorio de selección; el registro central de aprobaciones conserva paginación sin búsqueda textual. Los comodines se tratan literalmente en la selección. El `site_id` de la selección es obligatorio y debe pertenecer a la organización.

Errores saneados: 400 `OWNER_NOT_AUTHORIZED`, 403 `ORG_MANAGER_REQUIRED`/`FORBIDDEN`, 404 `ORGANIZATION_NOT_FOUND`, 409 `HORSE_QUOTA_REACHED`, `HORSE_QUOTA_BELOW_USAGE`, `STALE_REVISION` o `RESOURCE_CONFLICT`, y 503 `PEOPLE_NOT_ENABLED`. Una denegación no devuelve datos del propietario rechazado, secretos ni SQL.

No cambiar el significado de `POST /api/organizations/:org/horses`: esa ruta anterior sigue asociando un caballo **existente**, exclusivamente para el administrador central.

## Base de datos y seguridad

`db/008_delegated_horses.sql` añade `organization_owners` y `organization_horse_limits` al esquema privado, ambas con RLS habilitado/forzado y privilegios mínimos. No se modifica ninguna migración 1–7. El arranque requiere ocho checksums y no instala DDL en Supabase por su cuenta.

Las funciones privadas acotan proyecciones y escrituras sobre el catálogo existente; tienen `search_path=pg_catalog`, referencias calificadas y EXECUTE público revocado. El login restringido no recibe escritura general en `public.horses`, `user_profiles` o Auth. El contexto de actor lo establece exclusivamente el BFF tras verificar sesión y segundo factor.

Las aprobaciones de propietario no forman parte de `panel_member_active()`. Instalar este bloque no habilita a los clientes a entrar en el panel. La creación exige rol de organización y aprobación del propietario vigentes bajo bloqueo; los UUID ajenos no amplían el ámbito. Ningún token editable decide permisos.

Cada alta genera un evento limitado de organización y una auditoría central. El evento delegado no expone el UUID del propietario; la auditoría central sí conserva la asociación para revisión. Las aprobaciones y cambios de límite se auditan mediante el flujo central existente. Los logs y paquetes omiten credenciales.

## Verificación y límites de la entrega

`tests/delegated-horses.test.mjs` añade pruebas de propietarios, ámbitos, roles, RLS, concurrencia, último cupo, idempotencia, rollback, revocación, unicidad del box, apagado de altas, paginación y HTTP saneado. `npm test` incluye también las pruebas anteriores.

`tools/verify-delegated-horses-staging.mjs` usa únicamente la rama fija y fixtures propios: MFA real, alta desde el navegador, dos solicitudes simultáneas para el último cupo, replay sin duplicar, rechazo de autoaprobación, retirada de propietario y degradación del responsable. Retira las membresías temporales al terminar; revisar `cleanup_pending` si una verificación falla. Sus capturas e informe están en `evidence/phase5-*` y `panel-alta-delegada*.jpg`.

El harness visual necesita Playwright 1.65.1 en `.qa/node_modules` y el Chrome existente, excluidos del paquete de ejecución. Las pruebas locales de Node no requieren navegador. Staging sigue siendo el contrato mínimo v0.3, con replay legado incompleto: **no fusionar la rama Supabase con producción**. No certifica carga de fotos o streaming a escala.

Resultado de esta entrega: **105 pruebas locales aprobadas**. La integración real verificó MFA, formulario delegado, propietario aprobado, último cupo concurrente, replay al completar el límite, auditoría única, propietario retirado y rol degradado. El harness de demo comprobó los formularios centrales y simuló perder la respuesta **después del commit**: el mismo formulario reintentó con la misma clave y conservó un único caballo/evento. También pasó ancho móvil. Advisors: sin alertas de seguridad ni WARN de rendimiento; solo INFO previos/de índices. Los accesos temporales del ensayo se retiraron al terminar.

Continúan pendientes invitaciones/activación, recuperación y MFA autoservicio para clientes; edición/traslados revisados; staging integral reproducible, CI/backups y despliegue HTTPS; enrollment de Raspberry y adaptadores de cámara, Wasabi y HLS. La migración de instalaciones actuales permanece como fase posterior.

Referencias: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [funciones privadas y privilegios](https://supabase.com/docs/guides/database/functions), [bloqueos por fila de PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-ROWS).
