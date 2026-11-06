# Hospital — Live video: app principal y coordinación

## Asociación preparada en esta app

- Caballo: Hospital.
- `horse_id`: `bb195109-4409-498f-917c-a55e42649d27`.
- `camera_id`: `hospital-cam-01`.
- Receptor: `https://hls-receiverzip.replit.app`.
- Las fotos Wasabi, su sitio/nodo y su refresco de 10 segundos son independientes.

La app usa `EXPECTED_CAMERAS` para exigir la asociación exacta obtenida del
receptor con sesión real. No acepta como autoridad una cámara o URL enviada
por el navegador. Exige un único resultado por caballo y conserva sesiones,
cookies y rutas restringidas existentes. No se cambiaron Secrets ni ACL.

El reproductor existente utiliza HLS nativo en Safari y hls.js donde corresponde,
cancela solicitudes y destruye la instancia al cerrar o cambiar de caballo.
Sin autorización conserva `no access for now`; sin asociación disponible muestra
el estado de asignación; con cámara autorizada pero sin segmentos muestra que
la cámara todavía no publica. No hay fallback a otro caballo ni a un mockup.

## Receptor: confirmar en su propio proyecto

Esta app no puede inspeccionar su Secret ni demostrar el registro efectivo sin
una sesión real permitida. Un `/health` HTTP 200 no confirma cámara, permisos,
ingesta, versión publicada ni vídeo.

La referencia local de `services/hls-pilot/auth.mjs` conserva el antiguo máximo
de cuatro cámaras. No es prueba de la capacidad de la instancia desplegada.
Las cinco asociaciones previas de la app tampoco demuestran capacidad para
una sexta en el receptor real.

En el proyecto receptor:

1. Confirmar el alta única de `hospital-cam-01` con el horse_id exacto, capacidad
   para conservar todas las cámaras previas y autorización del Auth UID que el
   operador verificó en el mensaje de alta. No copiar permisos de otro caballo.
2. Conservar el JSON completo actual, administradores, permisos existentes,
   hashes y clave compartida del proxy. La clave del publicador pertenece
   exclusivamente a Pi/receptor; nunca a esta app ni al navegador.
3. No reconstruir `HLS_RECEIVER_CONFIG` desde una plantilla antigua ni cambiarlo
   desde el proyecto principal.
4. Acordar el reinicio/publicación con el operador: las ventanas son volátiles
   y los directos pueden interrumpirse brevemente.
5. Confirmar que la versión con Hospital fue publicada, validar la asignación
   con sesión real permitida y comprobar rechazo de sesión ajena/sin sesión.
6. Informar la evidencia saneada, sin hashes, claves, tokens o cookies.

## Codex/Pi: después de confirmar el receptor

El operador informa H.264 Baseline, 704×576, sin B-frames, IDR/SPS/PPS cada
segundo y cinco segmentos independientes verificados. Son mediciones aportadas,
no mediciones nuevas realizadas desde la app.

- No arrancar antes de confirmar el receptor.
- Arrancar únicamente el publicador preparado de Hospital en modo continuo.
  No introducir control bajo demanda desde el visor.
- Conservar retransmisión sin recodificar, límites de búfer, reconexión,
  aislamiento de procesos y servicios de fotos cada 10 segundos.
- Verificar subidas aceptadas de segmentos durante al menos dos minutos,
  reconexión y ausencia de reinicios inesperados. Proceso activo no basta.
- No detener ni reemplazar los publicadores existentes.

## Publicación y aceptación de la app principal

Publicar el receptor no publica `https://stableeye.co`. El usuario confirma
la publicación de esta app por separado, después de las verificaciones de
compatibilidad. No cambiar tablas, propietario o photo_backend por este vídeo.

Con publicador activo, probar por separado:

| Prueba | Preview | Dominio final |
| --- | --- | --- |
| Sesión permitida ve Hospital en descubrimiento | Pendiente | Pendiente |
| Fotogramas avanzan en Hospital | Confirmado por el usuario | Pendiente |
| Chrome escritorio/móvil | Pendiente real | Pendiente real |
| Safari/iPhone físico | Pendiente real | Pendiente real |
| Clic a movimiento y retraso real medidos por separado | Pendiente | Pendiente |
| Cerrar/cambiar caballo cancela instancia y fotogramas | Fixture; falta real | Pendiente |
| Fotos Wasabi actualizan mientras se ve vídeo | Fixture; falta real | Pendiente |
| Sesión ajena/sin sesión no obtiene vídeo | Falta sesión ajena real | Falta sesión ajena real |
| Otras cámaras continúan | Fixture; falta real | Pendiente real |

No declarar directo operativo por metadata, prueba unitaria nativa simulada,
fixtures Chromium, credencial con forma JWT o un healthcheck.

## Evidencia de esta preparación

- El usuario informa que el proyecto HLS ya activó Hospital. Es una confirmación
  del operador; desde aquí no se inspeccionó su configuración privada.
- El receptor responde `/health` HTTP 200. Descubrimiento y playlist de Hospital
  sin sesión de usuario, con la clave existente del proxy, responden HTTP 401.
  Eso confirma rechazo sin sesión, no la disponibilidad de segmentos de Hospital.
- Pruebas de mapping/proxy aprobadas: asociación exacta, cookie por cámara,
  rechazo sin sesión, cámara duplicada/incorrecta y ausencia sin sustitución.
- Prueba nativa unitaria aprobada para Hospital: playlist propia y limpieza.
  No equivale a una prueba en Safari real.
- Fixture Chromium de seis cámaras aprobado en escritorio y tamaño móvil:
  Hospital pendiente no solicita medios; cuando está disponible reproduce su
  ruta propia, cierra y cancela instancia, cambia sin mostrar otro caballo y
  conserva polling de fotos Wasabi mientras se reproduce vídeo.
- Compilación de publicación aprobada. Prueba de continuidad contra
  `https://stableeye.co` aprobada: 64 recursos anteriores conservados,
  navegación diferida desde pestaña antigua y pestaña nueva con sesión sintética.
- El usuario confirmó vídeo en movimiento de Hospital en el preview con su
  sesión el 2026-11-06. Es aceptación observada por el usuario, distinta de las
  pruebas con fixtures.
- No se publicó esta preparación desde el agente. Siguen pendientes
  Safari/iPhone real, tiempo de apertura y aceptación del dominio final.
