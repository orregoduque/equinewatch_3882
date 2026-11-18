# Contrato de planificación y ensayo, versión 0.5

Las nuevas rutas de alta delegada de caballos se documentan en ALTAS-DELEGADAS-20261118.md; no cambian las rutas centrales de planificación.

Las rutas de organizaciones y sus responsabilidades limitadas se documentan en ORGANIZACIONES-Y-ESTABLOS-20261118.md. Estas rutas globales de planificación siguen reservadas al administrador central.

Este contrato es **de preparación**. Ninguna ruta aplica IAM, cambia la IP física, crea una cuenta Auth, publica Replit o inicia servicios de las Raspberry. No conectar estas rutas a una autoridad productiva.

## Seguridad

Todas las rutas exigen administración explícita y perfil activo. En demo se utiliza la sesión local ficticia y CSRF. Staging usa cookie opaca, verificación de Auth/sesión, MFA y policies privadas, probado en un contrato aislado. No existe `execute`, `activate` o modo productivo habilitable por variable.

Las escrituras de preparación y cancelación requieren `Idempotency-Key` (12–100 caracteres alfanuméricos, guion o guion bajo). Misma clave y cuerpo devuelve el resultado anterior; reutilizarla con otro contenido produce 409. Las reservas se insertan en la misma transacción del plan. Una colisión revierte el intento completo.

`advance` es una operación específica del ensayo: reclama y completa como máximo un paso. Dos solicitudes distintas pueden avanzar dos pasos secuenciales; la ruta no es un contrato de ejecución externa idempotente. Los pasos completados no se repiten y una lease antigua no puede confirmar. Un worker productivo necesitará además idempotencia y conciliación de efectos de cada proveedor.

## Inventario existente

`POST /api/installations/inventory`

```json
{
  "source": "Inventario ficticio revisado",
  "cameras": [{
    "site_id": "00000000-0000-4000-8000-000000000041",
    "horse_id": "00000000-0000-4000-8000-000000000021",
    "technical_id": "ejemplo-norte",
    "mac": "aa:bb:cc:dd:ee:01",
    "ip_address": "192.168.50.101",
    "node_id": 101
  }]
}
```

Los UUID son ejemplos ficticios. Para el formulario de archivo, guardar solamente el objeto `{"cameras":[...]}`; `source` se rellena en la pantalla. No subir el archivo privado del receptor ni configuraciones completas de una Raspberry. Las columnas permitidas se validan estrictamente. Hasta 100 cámaras por lote; HTTP JSON limitado a 64 KiB y archivo de formulario a 50 KB.

Se crean observaciones inmutables y reservas para impedir un plan contradictorio. El registro no consulta la red ni demuestra identidad/propiedad. Repetir el mismo conjunto normalizado devuelve la observación existente. Un lote parcialmente solapado requiere revisión; no sobrescribe el anterior. La consulta de inventario devuelve resumen sin todas las entradas.

## Planes

`POST /api/installations/plans`

```json
{
  "camera_id": "UUID_DE_CAMARA_EN_BORRADOR",
  "node_id": 101,
  "bucket": "bucket-de-ejemplo",
  "wasabi_region": "us-east-1",
  "receiver_origin": "https://receiver.example.invalid"
}
```

La asociación, equipo, sede, IP y MAC se leen del registro. Solo se permite un plan por borrador; correcciones/versiones y liberación segura de reservas quedan para una entrega posterior. Cancelar un ensayo no libera ni borra el plan.

`GET /api/installations/plans/:id` devuelve contenido, SHA-256 y artefactos: prefijo, políticas IAM escritor/lector, asociación y lista de pruebas pendientes. La huella acredita integridad local, no es una firma criptográfica de un dispositivo. `executable=false` está reforzado por CHECK de PostgreSQL.

La política se genera, no se aplica. No prueba que el bucket o la región existan, ni que la cuenta permita IAM. El origen HTTPS no se contacta en esta versión. Antes de añadir un adaptador de red deberán existir allowlists de destinos, controles SSRF/egress y prueba del endpoint regional; no reutilizar la validación sintáctica actual como permiso para hacer requests arbitrarios.

Los planes que ya no coinciden con el binding, cámara o caballo activo devuelven `PLAN_STALE`. La modificación del contenido sin su huella devuelve `PLAN_HASH_MISMATCH`.

## Ensayos persistentes

- `POST /api/installations/plans/:id/simulations`, cuerpo `{}`: encola diez pasos. Solo un ensayo no terminal por plan.
- `GET /api/installations/runs/:id`: estado y pasos, sin token de lease.
- `POST /api/installations/runs/:id/advance`, cuerpo `{}`: avanza como máximo un paso simulado; sin daemon.
- `POST /api/installations/runs/:id/cancel`, cuerpo `{}`: detiene un ensayo activo y rechaza resultados tardíos.

Estados: `queued`, `running`, `retry_wait`, `simulated`, `failed`, `cancelled`. El esquema solo permite `mode=simulation`; `simulated` no equivale a instalación activa. Cada evidencia contiene `external_action_performed=false` y `external_verification=required`.

El motor interno reclama mediante `FOR UPDATE SKIP LOCKED`, usa token y lease de 30 segundos y conserva pasos completados. Tres reclamaciones consecutivas sin completar el paso terminan el ensayo; completar uno reinicia ese contador. Un error transitorio tiene espera creciente; validación o rechazo de credenciales termina sin reintento. Solo se guardan categorías permitidas, nunca mensajes arbitrarios de un proveedor.

Los métodos internos de reclamación/fallo no se exponen como endpoints. Una lease del motor no es una credencial de dispositivo. PGlite serializa transacciones en el demo; la concurrencia real de conexiones/workers y renovación de leases siguen pendientes de PostgreSQL de staging.

## Paginación

`GET /api/installations/{plans,runs,inventory,sites,devices,cameras,horses,users}?limit=20&after=UUID`

Respuesta: `{items:[],next:null,limit:20}`. Máximo 100 filas, cursor por UUID y lookahead de una fila; sin OFFSET. Para `horses` y `users` se admite `q` con búsqueda literal de nombre/correo, hasta 120 caracteres. No es búsqueda de SQL ni patrón libre. También admiten búsqueda literal las sedes, equipos y cámaras; las restantes rechazan `q` no vacío.

Orden por UUID, no por fecha de inserción. Frente a altas concurrentes, una nueva fila con UUID anterior al cursor se verá al refrescar desde la primera página. Para exportaciones consistentes futuras usar snapshot/versionado, no encadenar páginas y asumir una fotografía inmutable del inventario.

`GET /api/bootstrap` devuelve hasta cien filas por colección, contadores y `bootstrap_limit`. Los selectores usan búsquedas acotadas y grants tienen paginación. Esto no acredita carga de fotos/vídeo.

## Migraciones

La apertura del demo aplica las ocho migraciones privadas versionadas con historial/checksum. Si ya existía el esquema inicial, conserva sus datos. Repetir la apertura no reinstala ni sobrescribe sus tablas.

El modo staging solo comprueba versiones/huellas y nunca migra al arrancar. El operador deberá instalar las migraciones revisadas en una base aislada mediante el mecanismo aprobado y registrar sus checksums normalizados. No ejecutar estos archivos automáticamente contra el proyecto vivo. Las funciones privadas de catálogo requieren revisión/advisors y pruebas con sesiones reales en staging.

## Pruebas

`npm test`: 105 pruebas. La verificación opcional de navegador usa `tools/verify-panel.mjs`, con Playwright 1.65.1 instalado aparte en `.qa`, y Chrome existente; no añade dependencia de runtime. Comprueba el demo local en loopback, un plan, avance, recarga/reanudación, descarga y ancho móvil. No navega a Supabase, Replit o Wasabi.
