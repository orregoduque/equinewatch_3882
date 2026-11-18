# Versión 0.3: autenticación y altas en Supabase aislado

Fecha: 18 de noviembre de 2026.

## Resultado y alcance

El panel incorpora login de Supabase, segundo factor TOTP, altas de cuentas/perfiles y caballos, conciliación de fallos parciales y búsquedas paginadas. Se probaron contra Supabase real en una rama sin clientes. No se modificaron cámaras, Wasabi, Replit, Raspberry, monitoreo o permisos productivos.

- `http://127.0.0.1:8899/`: demo persistente local. Solo identidades ficticias y sin servicios externos.
- `http://127.0.0.1:8898/`: panel autenticado con Supabase de pruebas, limitado al loopback de este PC.

No es todavía un sitio público en DigitalOcean. No publicar el demo ni quitar su guarda de red para hacerlo visible desde Internet.

## Recursos y limitación de la rama

Se creó `codex-control-staging-20261118`, ref `xzfwcwfmnypgcunavmlc`, hija del proyecto `stable`, sin copiar clientes. El replay automático del historial legado falló al intentar quitar un trigger de `public.observations`, que no había sido recreada por ese historial. La rama conserva el estado histórico `MIGRATIONS_FAILED` aunque sus servicios API/DB están disponibles.

Allí se instaló un **contrato mínimo de integración**, no una réplica de toda la aplicación. Tiene Auth real y las columnas/restricciones necesarias de perfiles y caballos: FK, rol owner, perfil por trigger, box global único y RLS por propietario. No contiene el pipeline completo de fotos ni las otras tablas de negocio. No fusionar, resetear o rebasar esta rama contra producción para reparar ese estado. Antes del staging integral se necesita una línea base reproducible del esquema real y su historial.

Solo en esta rama se añadieron el esquema privado `se_control_v1`, login DB restringido, fixtures y función `control-fixture-accounts`. La rama usa recursos cloud independientes; revisar su consumo y necesidad durante el piloto. No se borró ningún recurso previo.

## Arranque y acceso

```powershell
& 'C:\Users\orreg\Documents\OTA\stable-eye-control\Start-Staging.ps1'
```

Los datos de la **cuenta ficticia de integración** están en `private/ACCESO-STAGING.private.txt`. No compartir ni pegar ese archivo en el chat. Su código temporal se calcula en la terminal del operador:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\orreg\Documents\OTA\stable-eye-control\tools\staging-code.mjs'
```

El helper no imprime la semilla. Este procedimiento automatizado de MFA es exclusivo del fixture; cada persona real debe registrar su propio autenticador. `Stop-Staging.ps1` comprueba PID, ruta y hora de inicio antes de detener solo este proceso. Reiniciarlo invalida las sesiones de navegador en memoria; las altas y caballos persisten en la rama.

## Seguridad de autenticación y conexión

El navegador envía credenciales al BFF local, que usa el SDK oficial con clave pública. Verifica Auth, `auth.sessions`, membresía explícita en `se_control_v1.admin_users` y perfil activo. Antes de entrar exige un TOTP verificado y AAL2; `user_metadata` no concede roles. El frontend recibe una cookie opaca HttpOnly/SameSite=Strict, Secure con HTTPS, y CSRF. Nunca recibe access/refresh tokens. Se verifican origen y sesión en cada operación.

Las sesiones viven solo en memoria por hasta una hora, con límites de intentos y capacidad. El password de login no se escribe en base, logs ni almacenamiento del navegador. El arranque normal no ofrece bypass de MFA. Una cuenta sin autenticador necesita preparación del operador; todavía no existe interfaz de enrollment/recuperación de administradores.

La configuración rechaza explícitamente el proyecto productivo y exige coincidencia entre proyecto esperado, URL de Auth, destino DB y marca de staging. Rechaza parámetros de conexión que puedan reemplazar TLS. El login DB no es superusuario, no evita RLS, no crea roles/bases ni pertenece a postgres. Verifica también las huellas de seis migraciones. No migra al arrancar.

La conexión mantiene `rejectUnauthorized=true` y verificación de hostname. Falló cerrada sin CA y conectó con la CA correcta. Los archivos privados de Windows se verificaron accesibles solo por el usuario local y SYSTEM. Fuentes:

- [URL de certificado publicada por Supabase Studio](https://github.com/supabase/supabase/blob/671c94e868381357f6fc9f66136d7600534161ff/apps/studio/hooks/custom-content/custom-content.json).
- [CA oficial](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt).
- [SSL de Supabase](https://supabase.com/docs/guides/platform/ssl-enforcement).

## Personas: flujo reanudable

`POST /api/people/users` admite solo correo y nombre, con clave idempotente. Normaliza el correo y guarda una solicitud durable. Rechaza contraseñas, claves, roles y otros campos del formulario. `POST /api/people/users/:id/process`, cuerpo `{}`, concilia:

1. Si no existe la cuenta, la crea por Auth Admin, nunca por SQL real. El marcador de solicitud se fija en `app_metadata` por el proveedor administrativo.
2. Acepta el perfil del trigger o repara uno faltante solo si la cuenta pertenece a esa solicitud.
3. Una cuenta anterior ajena queda `existing_review`, sin sobrescribir nombre, rol, estado o permisos.
4. Si se perdió la respuesta después de crear Auth, consulta correo/marcador y recupera la misma identidad.
5. Una lease impide confirmar desde un proceso viejo. Hay hasta tres intentos de conciliación; rechazos de credenciales se detienen y no rotan claves.

Crear una cuenta no concede acceso a caballos o administración. **No se envían invitaciones ni correos.** El proveedor general genera un password aleatorio que no devuelve y deja activación pendiente. Falta el flujo explícito de invitación/activación para cuentas reales.

### Proveedor del piloto

Para probar sin descargar service_role al PC se instaló un gateway en la rama: proyecto fijo, autenticación propia por bearer/hash, solo `control-*@example.invalid`, campos acotados y límite de cien identidades. No acepta SQL, no devuelve secretos y no envía mensajes. Confirma los correos ficticios para ensayar login; esa excepción no pertenece al flujo general de clientes.

El secreto administrativo permanece dentro de la función Supabase. El frontend no recibe ese secreto ni el bearer. Antes de incorporar personas reales, configurar el proveedor de servidor correspondiente y revisar alcance, invitación y recuperación. No ampliar el gateway de fixtures para convertirlo en administración pública.

## Caballos

`POST /api/people/horses` recibe nombre, box y UUID de propietario activo. La creación y auditoría son idempotentes, a través de una función privada. El login DB no tiene escritura libre sobre tablas públicas.

El UUID es la identidad permanente; el nombre no es único. Se conserva el box único global del contrato actual, por eso se sugiere `SEDE:BOX-01`. No se cambió esa restricción productiva. La respuesta incluye `installation_required=true`; se conserva `photo_backend=supabase` hasta coordinar la instalación. No activa Wasabi, cámaras o live.

## Paginación y RLS

El bootstrap tiene límite de cien filas por colección y contadores separados; el resumen muestra hasta veinte caballos. Los formularios buscan por nombre/correo/identificador en páginas acotadas. Se conserva la selección por UUID y backend vuelve a validarla aunque esté fuera de la primera página. Grants tienen páginas de veinte filas. La preparación de una cámara concreta no descarga todo el inventario.

Las policies privadas se optimizaron según el advisor: contexto calculado mediante InitPlan, SELECT de grants consolidado e índices de FK. También niegan acceso directo a operadores desactivados. Los cambios son del nuevo esquema en pruebas, sin tocar policies públicas de clientes.

## Evidencias

- 76 pruebas locales de SQL/RLS/HTTP/Auth y altas.
- Supabase real: AAL2, cuenta/perfil, caballo, reintentos, conflicto de box, usuario no administrador, RLS entre propietarios y logout.
- Navegador: login/MFA, altas reales en el contrato, búsqueda, escritorio y ancho móvil, sin errores JS.
- Registro de 3.602 caballos, 300 equipos y 3.600 cámaras; bootstrap limitado y alta de permiso fuera de la primera página. No es una prueba de ingestión/streaming a esa escala.
- Advisors ejecutados; resultado en `evidence/phase3-advisors.json`.

Los informes no incluyen cookies, JWT, passwords, semillas TOTP, claves Wasabi o RTSP.

## Pendiente antes de administrar clientes

Separación completa por organización/sede, delegación de administradores externos, invitación/activación y recuperación, MFA autoservicio, edición/historial de propietario y box, staging integral reproducible, backups/restauración, CI y despliegue HTTPS con dominio. La rama temporal no certifica esos puntos.

Después siguen enrollment de Raspberry, adaptadores cámara/IAM, fotos, receptores dinámicos y pruebas end-to-end. Las cámaras actuales conservan su autoridad histórica. No habilitar enforcement ni migrar clientes desde esta entrega.
