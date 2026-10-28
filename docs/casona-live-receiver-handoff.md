# Casona live video: receptor y app se publican por separado

## Estado de esta preparación

La app principal exige estas asociaciones en el descubrimiento autorizado:

| Caballo | horse_id | cameraId |
|---|---|---|
| Lucero | a95f853c-e90b-4b6d-a4ea-f25cfa317119 | bacata-mock |
| Thunder | d826a274-58ea-4a55-8fd2-1d4c78222ab1 | bacata-thunder |
| Tessa | e47d1da3-9b6b-4433-819c-423d7687b296 | casona-tessa |
| Velvet Vitalis | 61c46d85-34be-4fa8-a892-9e22211487df | casona-velvet |

El receptor verifica el JWT real y las ACL propias del servidor antes de emitir
la sesión temporal. El proxy no acepta una cámara elegida por el navegador para
reemplazar estas asociaciones. Playlists y segmentos conservan la autenticación
por cookie temporal individual de cámara. No se modifican ACL en este proyecto.

El código principal no habilita entradas en el receptor ni inicia publicadores.
No hay fallback a mocks u otros caballos. Conserva HLS nativo cuando está
disponible, hls.js, limpieza al cerrar/cambiar caballo, recuperación y medición
clic → primeros fotogramas. La latencia respecto a la realidad es otra medición.
Publicación continua no equivale a un servicio bajo demanda.

## Mensaje para el chat del proyecto hls-receiverzip

Preparar por separado las cámaras Casona en el receptor publicado en
https://hls-receiverzip.replit.app, sin sustituir las cámaras existentes.

1. Inspeccionar de forma privada el Secret **real** `HLS_RECEIVER_CONFIG`, su
   validación y la revisión publicada. No mostrar su contenido, claves ni hashes.
2. Comprobar cuántas cámaras distintas existen. El código de referencia permite
   cuatro. Si ya hay cuatro y faltan las de Casona, detenerse e informar del
   conflicto; no borrar entradas ni aumentar el límite automáticamente.
3. Pedir por el formulario seguro el JSON completo fusionado con las entradas
   de `/home/admin/Documents/Stable_eye_wasabi/changes/velvet-poe-20261028/private-live/add-casona-live-entries.json`.
   Ese archivo está en Casona, no en la app principal. El operador debe transferir
   los datos por el canal seguro; no pegarlos en el chat. No solicitar los
   archivos `.private/tessa-hls.json` ni `.private/velvet-hls.json`.
4. Preservar Supabase URL, clave pública, `appProxyKeySha256`, administradores,
   cámaras, asociaciones y hashes previos. Si ya existe un cameraId nuevo,
   comparar horseId y hash en privado: cualquier divergencia requiere confirmación,
   nunca reemplazo silencioso ni generación de credenciales.
5. Las nuevas entradas deben corresponder exactamente a la tabla anterior. El
   propietario confirmado para **las dos cámaras de Casona** es
   `0b66484c-08f3-49c3-bdb8-c0c3e2a37454`. Conservar administradores legítimos.
   No copiar propietarios/ACL de Bacatá, añadir otros usuarios o ampliar acceso
   por roles del navegador. Mantener `bacata-mock` como vídeo real de Lucero.
6. Validar configuración completa antes de guardarla. Aplicar el merge únicamente
   mediante Secrets en **el receptor**, no guardarlo en la app principal.
7. Informar antes de republicar: el reinicio pierde las ventanas circulares y
   puede interrumpir temporalmente Lucero y Thunder. Confirmar ventana operativa
   y publicar desde Publishing del receptor. No contratar recursos nuevos.
8. Confirmar que el Secret está aplicado y que la nueva revisión está sirviendo.
   Solo entonces pedir al operador que arranque los publicadores de Casona.
   `/health` 200 no prueba ingesta: se requieren subidas HTTP 204 y segmentos
   recientes de cada fuente, y recuperación de Lucero/Thunder tras el reinicio.

## Aceptación posterior

- Publicar la app principal de manera independiente y confirmar su revisión.
- Probar Tessa/Velvet con el dueño permitido y administrador existente; denegar
  una sesión no permitida, playlists y segmentos sin ticket, y ticket de otra cámara.
- Confirmar dos espectadores simultáneos y cambio rápido sin vídeo residual.
- Probar cámara desconectada, reconexión, cierre, y actualización de fotos a 10 s.
- Verificar H.264, GOP e independencia de segmentos con el operador de Casona.
- Probar Safari real en iPhone/Mac y Chrome; los fixtures Chromium y las pruebas
  unitarias de HLS nativo no demuestran funcionamiento en Safari real.
- Medir clic → movimiento y latencia de extremo a extremo por separado.
- No registrar JWT, claves ni URLs firmadas completas.

Este documento no confirma acceso al Secret remoto, capacidad desplegada,
publicación del receptor ni recepción real. Son verificaciones pendientes en
ese proyecto y con el operador. La preparación no modifica `photo_backend`,
Wasabi, historial, servicios de fotos o Raspberry.
