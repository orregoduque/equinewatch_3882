# Hospital: preparación de lectura privada Wasabi

## Alcance y corte

Solo fotos. No registrar `hospital-cam-01` en HLS ni cambiar los parámetros de
vídeo de ningún caballo. No cambiar propietarios, claves, tablas, políticas
de Supabase, historiales ni el valor real de `photo_backend`.

| Dato | Valor |
| --- | --- |
| horse_id | `bb195109-4409-498f-917c-a55e42649d27` |
| Nombre | Hospital |
| Referencia de cámara de fotos | `hospital-cam-01` |
| Sitio | `3e392214-0e8f-4472-99ce-0d87561deeeb` |
| Nodo | 1 |
| Bucket | `equinewatch-photos` |
| Región | `us-east-1` |
| Endpoint | `https://s3.us-east-1.wasabisys.com` |
| Prefijo exclusivo | `stable-eye/3e392214-0e8f-4472-99ce-0d87561deeeb/node_1/` |
| Política lectora esperada | `stable-eye-replit-hospital-readonly` |

El propietario observado por el operador es un perfil founder. No asumir que
un ID de perfil demuestra una sesión Auth válida o permisos efectivos de RLS.
Verificarlo mediante la cuenta real, sin publicar información personal.

La preparación añade únicamente Hospital al catálogo autorizado del firmante.
El servidor conserva verificación `getUser`, permiso de propietario o staff
activo, backend Wasabi, horse_id de la metadata y prefijo exclusivo. Usa las
mismas credenciales lectoras de Replit y GET temporales de 600 segundos.
La tabla `images_wasabi` se consulta por horse_id y se ordena por
`captured_at`, después `id`. El resto de caballos conserva sus asociaciones.

Mientras el backend continúe en Supabase, la UI debe continuar usando
`images` y Storage. El catálogo preparado NO activa el backend.
Tras el corte autorizado: últimas 20, refresco de fotos cada 10 segundos,
búsqueda por hora independiente y timelapse de hora solo bajo botón
(máximo 360, orden ascendente, una imagen, sin descarga masiva al abrir).

## Estado real observado y límites

Durante esta preparación:

- La consulta pública acotada de `horses` respondió correctamente pero no
  devolvió Hospital. La de `images_wasabi`, limitada a la última captura de
  Hospital, tampoco devolvió filas. No permite distinguir ausencia de datos
  de visibilidad restringida por RLS.
- No se pudo confirmar el backend actual, el propietario efectivo ni
  autorización de un usuario real. El último backend comunicado por el
  operador era Supabase; no se escribió ningún valor.
- `GetUser` contra IAM de Wasabi, firmado con el mismo par de credenciales
  que utiliza el firmante, devolvió HTTP 403. No quedó confirmada su identidad
  IAM ni la asociación de la política. Eso no demuestra denegación S3.
- No había una captura visible para ejecutar un GET real. No se declaró
  visualización lista.
- El dominio publicado se consultó con la información de despliegue:
  `https://stableeye.co`. No confundirlo con el preview ni con la publicación
  de esta preparación.

Validación de la preparación:

- 250 pruebas automatizadas aprobadas; compilación `build:publish` correcta.
- Regresión de navegador móvil con fixtures: Hospital permanece en Supabase
  antes del corte simulado; después funciona con 20 fotos, refresco,
  renovación, búsqueda de hora y timelapse bajo botón. Otros caballos
  incluidos en la regresión conservaron su comportamiento.
- Continuidad contra el dominio publicado: 64 recursos anteriores preservados,
  navegación diferida de una pestaña antigua y nueva pestaña aprobadas con
  sesión sintética. No se usaron sesiones de clientes.
- Preview y producción devolvieron HTTP 401 sin sesión en la ruta privada de
  Hospital, sin fotos. La captura sin login solo mostró el estado sin caballos.
  No se verificó la UI autenticada de Hospital con fotos reales.
- No se publicó esta preparación desde el agente. La coincidencia de los
  recursos frontend no demuestra publicación del nuevo catálogo del servidor.

## Comprobación de Supabase con acceso autorizado

En Cursor/MCP o una sesión autorizada, ejecutar solo lectura:

```sql
select id, name, owner_id, photo_backend, is_active
from public.horses
where id = 'bb195109-4409-498f-917c-a55e42649d27';

select id, horse_id, captured_at, storage_path_enhanced
from public.images_wasabi
where horse_id = 'bb195109-4409-498f-917c-a55e42649d27'
order by captured_at desc, id desc
limit 1;
```

No ejecutar UPDATE para adelantar el backend ni usar service_role en el
frontend. Una consulta administrativa de metadata no sustituye la prueba
con un usuario autorizado y otro sin permiso.

## Comprobación privada de IAM

Con una identidad administrativa del operador en Wasabi:

1. Identificar de forma privada el usuario IAM propietario del Access Key ID
   que usa el firmante efectivo de Replit. No asumir que es el usuario de la Pi.
2. Verificar que tiene adjunta `stable-eye-replit-hospital-readonly`, y que su
   contenido concede únicamente `s3:GetObject` al recurso:
   `arn:aws:s3:::equinewatch-photos/stable-eye/3e392214-0e8f-4472-99ce-0d87561deeeb/node_1/*`.
3. Preservar todas sus políticas y alcances anteriores. La referencia
   `services/wasabi-photos/stable-eye-replit-hospital-readonly.json` es aditiva;
   no se aplicó automáticamente ni sustituye otras políticas.
4. No cambiar las claves de Replit por las del publicador
   `stable-eye-hospital-pi`. No ampliar IAM al lector solo para poder
   inspeccionarse a sí mismo.
5. Informar únicamente identidad confirmada sí/no, política adjunta sí/no y
   resultado GET. No copiar credenciales, archivos privados ni URLs firmadas.

## GET real y publicación: verificaciones distintas

Cuando la metadata permita obtener una captura reciente, ejecutar:

```sh
node scripts/check-tessa-wasabi-read.mjs --hospital
```

El comprobador no cambia backend ni datos. Filtra el caballo, ordena por
captured_at/id, usa límite 1, comprueba el prefijo, firma GET y solicita un
rango limitado. Publica solo estado HTTP, cabecera JPEG y fecha de captura.
Un resultado vacío anónimo no demuestra que el bucket esté vacío.
Este script comprueba almacenamiento, no los permisos del usuario final.
No registrar URL completa ni excepciones SDK sin sanear.

Secuencia de aceptación:

1. Publicar primero la compatibilidad, manteniendo Supabase activo. La
   publicación la confirma el usuario desde Publishing.
2. Verificar por separado preview y `https://stableeye.co`: arranque, rechazo
   sin sesión, continuidad de recursos anteriores y caballos existentes.
   Un 401 por sí solo NO identifica qué versión de catálogo está publicada.
3. Confirmar subida reciente desde la Pi, metadata correspondiente y GET real.
4. Verificar identidad IAM y política con el operador. Si faltan pruebas,
   detener el corte y conservar Supabase.
5. Solo con autorización separada, coordinar activación de Wasabi con la Pi
   y Supabase. No detener otros servicios ni borrar fotos antiguas.
6. Con una sesión real permitida, verificar la API de Hospital, imagen JPEG
   decodificada, 20 fotos, nueva captura, hora y timelapse. Con una sesión
   ajena, verificar rechazo sin firmas. Repetir en el dominio final.
7. Verificar los otros caballos y HLS sin modificaciones. Una prueba con
   fixtures no sustituye esta aceptación.

Si el corte falla, coordinar cualquier cambio de backend con el operador;
no ejecutar una reversión o borrar historial de forma automática.
