# Golden Girl: preparación de Live video y coordinación

## Asociación de app principal

- Caballo `a264b293-2d23-497f-b47f-5f7e68a81ea9`.
- Cámara `bacata-golden-girl`.
- Receptor `https://hls-receiverzip.replit.app`.
- Fotos Wasabi node_110 independientes; conservar actualización cada 10 segundos.

Esta preparación permite resolver la quinta asociación **cuando el receptor la
devuelva autorizada**. No aumenta la capacidad del receptor, no crea una cámara
ni inicia su publicador. No se modifican sesiones, claves, ACL, fotos ni las
asociaciones de Lucero, Thunder, Tessa y Velvet.

Hasta entonces la app conserva mensajes de falta de cámara autorizada o de
publicador no disponible. Nunca muestra otro caballo ni una muestra de vídeo.

## Para el agente del receptor HLS

1. Verificar configuración privada y capacidad de la revisión realmente
   publicada. El código de referencia de esta app conserva el límite de cuatro;
   no permite certificar que el otro proyecto ya esté ampliado.
2. Preparar y probar ampliación para al menos cinco cámaras, con memoria,
   ingestas simultáneas, límites de solicitudes, CPU y espectadores previstos.
   No limitarse a cambiar el número ni eliminar una entrada para hacer espacio.
3. Conservar el objeto completo HLS_RECEIVER_CONFIG, Supabase, hashes,
   administradores y las cuatro entradas existentes.
4. Añadir exclusivamente bacata-golden-girl con el horse_id indicado. Obtener
   el hash del nuevo publicador mediante el canal privado del operador.
   No generar o rotar las claves de cámaras existentes ni HLS_PROXY_KEY.
5. Conservar los permisos legítimos existentes. Verificar el propietario real y
   sus UUID de Auth y los permisos aprobados para este directo; no inferirlos
   del rol del navegador ni copiar ACL de otro caballo. No abrir acceso público.
6. Comprobar aislamiento de playlists/segmentos, tickets temporales y denegación
   sin permiso. Documentar qué se ha preparado, aplicado y publicado.
7. Acordar reinicio con el operador: las ventanas volátiles se vacían y los
   otros directos pueden interrumpirse brevemente. El usuario publica el receptor.
8. Confirmar ampliación/configuración aplicada y recuperación de los cuatro
   directos previos antes de pedir el arranque del publicador nuevo.

## Para Codex en Bacatá

1. Esperar confirmación de capacidad y configuración aplicada en receptor.
2. Diagnosticar la cámara real de Golden Girl: H.264, resolución y bitrate
   medidos, sin B-frames, GOP/IDR cercano a 1 s y SPS/PPS independientes.
   Mantener el flujo principal y las fotos node_110 sin cambios.
3. Configuración/servicio/cola privados y separados para bacata-golden-girl.
   Reutilizar las credenciales preparadas de esa cámara; si no existen,
   coordinarlas con el receptor por canal seguro, no por chat.
4. Retransmitir sin recodificación, timeout RTSP compatible, reconexión y
   límites. No iniciar dos procesos competidores de la misma cámara.
5. Confirmar al menos dos minutos de subidas 204 y segmentos recientes.
   /health 200 no demuestra ingesta ni decodificación.
6. Informar de CPU, memoria, errores/reinicios, códec, GOP e ingesta sin
   exponer URL RTSP privada, claves, hashes o JWT.

## App principal: publicación y aceptación independientes

- Mantener HLS nativo para Safari/Apple y hls.js para Chrome compatible.
- Mantener pantalla completa/X, cancelación de respuestas tardías y destrucción
  al cerrar, cambiar caballo o desmontar.
- Ejecutar pruebas de mapping/proxy y reproducción; distinguir fixtures de
  cámara real. Las pruebas unitarias de HLS nativo no certifican Safari/iPhone.
- Compilar con build:publish y comprobar continuidad de pestañas antiguas
  contra el dominio de producción verificado.
- El usuario publica esta app por separado, sin republicar receptor desde aquí.
- Después de publicar y con ingesta confirmada, probar Chrome y Safari/iPhone
  reales con cuentas permitidas/no permitidas, cambio entre caballos y fotos.
- Medir clic → movimiento y latencia respecto a realidad por separado.

No marcar terminada la puesta en marcha real por pasar fixtures, compilar o
ver un /health 200. Confirmar la revisión publicada de cada proyecto.

## Evidencia de esta preparación

- 241 pruebas Node aprobadas, incluyendo resolución de Golden Girl y rechazo
  de asociaciones prestadas, duplicadas o ausentes.
- Chromium de escritorio/móvil con datos simulados: cinco asociaciones,
  Golden Girl pendiente sin sesión/media, reproducción posterior propia,
  cierre, cambio de caballo, aislamiento y consultas de fotos tras 10 segundos.
- Ruta HLS nativa probada con fixture unitario, incluida limpieza de Golden Girl.
  No hay WebKit/Safari ni iPhone disponible aquí: prueba real pendiente.
- build:publish y continuidad con la versión pública aprobados, 64 assets
  anteriores conservados. La versión frontend puede ser idéntica porque el
  cambio de asociación es del servidor; eso no prueba su publicación.
- Receptor responde /health 200; la playlist de Golden Girl sin credenciales
  devuelve 403. No confirma capacidad aplicada, ACL ni ingesta de Golden Girl.
- El agente de esta app no ha accedido a la configuración privada del receptor
  ni arrancado publicadores, y no ha publicado esta preparación.
