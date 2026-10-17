# Piloto privado HLS — una cámara, Pi 5 / 2 GB

**Preparación, no despliegue.** No se cambió la app publicada, la cámara, el router,
Supabase ni ningún plan contratado. El código arranca con el piloto desactivado.
Las plantillas no funcionan hasta rellenar los valores reales localmente.

Para publicar el receptor en un proyecto independiente, con terminación HTTPS
del proveedor y sin cambiar el Autoscale de la app, consultar
[RECEIVER-PUBLISH.md](RECEIVER-PUBLISH.md). Incluye el empaquetado del servicio,
la configuración mediante Secrets y la credencial exclusiva del proxy.

La ruta `/hls-pilot` también incluye una **demostración independiente de 5 segundos
en bucle**, visible sin configurar cámaras. Es un MP4 pequeño y sin audio creado
con paneo/zoom de una imagen de muestra, no un directo ni una medición HLS.
Se puede pausar o reanudar sin afectar a la conexión de cámaras. Se regenera con
`node scripts/generate-hls-mock-video.mjs`.

## 1. Diagnóstico desde la Raspberry: empezar aquí

No modificar el principal `rtsp://192.168.1.99:554/stream1`. Obtener del fabricante,
ONVIF o la interfaz local **la URL real del secundario**; no se adivina su ruta ni
se asume que soporte 720p. Si sigue ofreciendo 640 × 480, trabajar con esa
resolución. No necesitamos acceso entrante a la cámara ni abrir puertos del router.

En Raspberry Pi OS, instalar herramientas si faltan:

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg python3 ca-certificates
ffmpeg -version
ffprobe -version
timedatectl status
```

Desde la raíz de una copia de este proyecto en la Pi:

```bash
python3 pilot/pi/probe.py --seconds 60 --idr-seconds 10
```

Pide la URL RTSP en una entrada **oculta**; se puede pegar allí usuario/contraseña,
pero no en este chat, el historial del shell ni un ticket. No imprime la URL ni
los mensajes originales de FFmpeg. El diagnóstico abre conexiones de lectura,
analiza 60 s de paquetes y, si es candidato H.264, 10 s adicionales de cabeceras;
no graba vídeo ni modifica la configuración de la cámara. Puede repetirse con
el principal para compararlo: seguiría siendo solo lectura.

**Compartir únicamente el JSON saneado** para elegir el bitrate definitivo:

| Campo | Qué comprueba |
|---|---|
| `stream.codec_name`, `profile`, `level`, `pix_fmt` | Códec real; buscamos H.264 8 bits `yuv420p` compatible con los navegadores destino |
| `width`, `height`, `avg_frame_rate`, `r_frame_rate` | Resolución/FPS anunciados por ese flujo, sin asumir 720p |
| `has_b_frames` | Preferimos 0 para evitar reordenación |
| `video_bitrate_mbps`, `sample_seconds` | Bitrate elemental observado; no confundir con un `bit_rate` declarado o ausente |
| `keyframe_interval_seconds` | Intervalo real entre paquetes marcados como clave durante la muestra |
| `idr_verified`, `idr_frames_observed`, `idr_interval_seconds` | NAL H.264 tipo 5 reales; no equiparar automáticamente una marca K con IDR |
| `every_key_packet_contains_idr_sps_pps` | Si cada paquete clave observado trae IDR y SPS/PPS |
| `continuous_30_day_gib_*` | Estimación de subida continua a ese bitrate, no una factura |

Si H.264/IDR no está confirmado, **no activar el agente**. Cambiar únicamente
el secundario, si realmente admite estas opciones: H.264, resolución disponible,
sin B-frames, GOP cerrado, IDR cada **1 segundo** y SPS/PPS repetidos. Por ejemplo,
25 fotogramas a 25 fps o 15 a 15 fps; usar los FPS reales, no esos ejemplos
automáticamente. Volver a medir después. Si faltan SPS/PPS en el RTSP, hay que
comprobar que el remux produce segmentos independientes y decodificables antes
de confirmar la opción del agente. Una muestra no garantiza todos los GOP futuros.

No se transforma H.265 en H.264, no se escala ni se cambian FPS en la Pi.
Si no hay un secundario H.264 compatible, detener esta vía y revisar alternativas.

## 2. Qué está preparado

```text
IP camera secondary RTSP (LAN, H.264)
       → Pi: FFmpeg -c:v copy, sin audio
       → PUT HTTPS saliente, segmento completo ~1 s
       → receptor aislado: RAM circular, sin archivos de cámara
       → proxy restringido de la app → navegador autorizado
```

- `pilot/pi/agent.py`: FFmpeg y Python estándar; publica solo archivos finalizados
  de la lista HLS sustituida atómicamente. No envía `.tmp`.
- Cada reconexión obtiene una época nueva, descarta el spool y vuelve al directo.
  Reintentos 1–30 s, RTSP/TCP con timeout, HTTPS validado y timeout 4 s.
- Spool local temporal: lista de 6 segmentos, borrado automático, vigilancia cada
  200 ms, techo 16 MiB y 2 MiB por archivo. No hay cola creciente en RAM.
  El vigilante mata FFmpeg si se superan los límites; puede haber un pequeño
  exceso entre comprobaciones. El servicio limita además RAM a 256 MiB.
- Receptor `services/hls-pilot/receiver.mjs`: proceso separado; máximo 60 s,
  90 segmentos y 16 MiB **por cámara**, lo que se alcance antes. Hasta 4 cámaras
  de prueba por configuración; el objetivo de este piloto sigue siendo una.
  Máximo 2 subidas en curso, 2 MiB por segmento, 5 s para recibirlo,
  64 conexiones y control de solicitudes. Limpieza periódica incluso sin espectadores.
- Solo admite MPEG-TS completo y duraciones ≤2 s; rechaza secuencias con huecos,
  épocas retiradas y fechas alejadas >10 s. Ambos equipos necesitan reloj NTP.
  El receptor valida límites/transporte, **no ejecuta un analizador completo H.264**:
  la compatibilidad e independencia se verifican antes, y el dispositivo es de confianza.
- Una lista aparece solo cuando hay al menos 3 segmentos completos. Los reinicios
  llevan discontinuidad HLS y secuencias de reproducción monotónicas.
  Tras 8 s sin nuevos segmentos la cámara deja de estar lista; no se muestra un
  bucle de grabaciones antiguas como si fuera directo.
- Navegador: Safari HLS nativo si está disponible; resto Hls.js cargado únicamente
  al pulsar. Búfer acotado y detección de vídeo detenido. La ruta es `/hls-pilot`,
  sin reemplazar el vídeo de fotos existente ni añadir carga de Hls.js al inicio.
- Ningún servicio se inicia automáticamente, salvo el servidor existente sin piloto.

Los segmentos pueden permanecer en buffers transitorios del navegador o del
sistema operativo; “sin grabación” significa que el receptor no crea archivos ni
una biblioteca histórica. Desactivar core dumps/swap y comprobar logs del proxy
si se necesita una política estricta de no persistencia del host.

## 3. Permisos: no confiar en el rol del navegador

Sin migraciones ni cambios de acceso a los caballos existentes. Para el piloto:

1. Cada Pi tiene una clave aleatoria de ≥32 caracteres; en el receptor solo se
   conserva SHA-256, y solo puede publicar su cámara.
2. El navegador envía su sesión real. El receptor la comprueba en Supabase Auth
   `/auth/v1/user`, con timeout y sin aceptar datos locales como identidad.
3. La configuración **del servidor** vincula ID de cámara, caballo y UUID reales
   de Supabase Auth autorizados. `ownerUserIds` solo los dueños asignados;
   `stableOwnerUserIds` solo los encargados explícitamente autorizados.
   `adminUserIds` puede ver todas las cámaras configuradas.
4. No se confía en `user_metadata.role`, localStorage ni un JWT sin verificar.
   Las cuentas demo de la app no sirven para acceder a cámaras.
5. La sesión de reproducción usa una cookie HttpOnly/Secure/SameSite Strict,
   acotada a una cámara, firmada con una clave efímera del proceso y válida 90 s.
   Listas **y cada segmento** la verifican. La autorización se renueva cada 45 s
   usando de nuevo la sesión real. No hay credenciales RTSP en el navegador
   ni tokens de vídeo en URLs.
6. Cerrar/navegar/cambiar de cuenta corta el reproductor y las peticiones.
   Una cookie previamente emitida caduca en ≤90 s. Para revocar inmediatamente
   o cambiar asignaciones, editar el archivo privado y **reiniciar el receptor**:
   invalida todas las cookies y borra su ventana. No hay invalidación remota
   instantánea ante cierre de sesión en otro dispositivo.

La lista manual de UUID es deliberada y solo para el piloto: todavía no se ha
verificado una relación de permisos de cámaras en el modelo existente. No
inventar una relación por correo ni conceder privilegios por una etiqueta editable.

Las cookies necesitan un contexto first-party. Un navegador puede bloquearlas
si la app está dentro del iframe de previsualización de otro dominio: abrir la
URL de desarrollo en una pestaña propia para probar vídeo. No debilitar las
cookies para eludir esa protección. El acceso en Safari físico sigue pendiente.

## 4. Configuración posterior al diagnóstico (NO ejecutar todavía en producción)

Las plantillas están en `pilot/*.example.json`. Guardar las copias privadas fuera
del repositorio o en `.local/hls-pilot-private/`, ignorada por Git **y despliegues**,
con directorio 700 y archivos 600. No subir certificados, claves ni URLs privadas.
Generar la clave del dispositivo localmente y transferirla por un canal privado;
no pegarla en chat. Para cargar secretos reales en Replit, usar su gestor de Secrets,
no archivos versionados.

`receiver.example.json`:
- URL y clave **pública anon** del proyecto Supabase actual; nunca una service role.
- UUID reales de Auth para las concesiones anteriores y el ID del caballo existente.
- Hash SHA-256 de la clave exclusiva del dispositivo.
- Escucha HTTP solo en `127.0.0.1:8099` detrás de un terminador HTTPS, o añadir
  `"tls":{"certFile":"/ruta/cert.pem","keyFile":"/ruta/key.pem"}` para TLS propio.
  Sin TLS, el programa rechaza interfaces públicas.

Arranque manual del receptor aislado cuando se autorice la prueba de red:

```bash
node services/hls-pilot/receiver.mjs /ruta/privada/receiver.json
```

La Pi necesita una **URL HTTPS alcanzable, estable y con certificado válido**.
Usar un receptor de pruebas aislado y exponer solo `/ingest/` a la Pi;
restringir `/api/hls-pilot/` al proxy de la app en la red del receptor.
No exponer la IP local de la cámara ni RTSP, y no abrir puertos de la Pi.
No hay host público, certificado ni infraestructura contratados por esta preparación.
La app actual no se convierte automáticamente en un servidor continuo de vídeo.

Para probar la app de desarrollo con ese receptor:

```bash
node server.mjs --hls-pilot-config /ruta/privada/app.json
```

Usa el workflow existente en lugar de arrancar dos servidores en el puerto 5000.
**No se modificó su comando ni la configuración de publicación.** El proxy permite
solo rutas de reproducción/autorización; nunca reenvía ingesta, URLs arbitrarias
ni redirecciones. La ruta del piloto habilita `media-src 'self' blob:` en su HTML
para MSE; la política de las otras páginas permanece igual.

En `agent.example.json` poner la URL real del secundario, destino HTTPS, clave
del dispositivo y, **solo tras verificarlo**, `confirmedH264IndependentSegments: true`.
Para CA privada añadir `caFile`; nunca desactivar la validación TLS. En una prueba
manual usar un `spoolRoot` existente y privado, por ejemplo `/tmp` del usuario.

```bash
chmod 600 /ruta/privada/hls-agent.json
python3 pilot/pi/agent.py --config /ruta/privada/hls-agent.json
```

Para ejecución permanente posterior existe `pilot/pi/stableeye-hls.service`.
Crear antes el usuario del sistema `stableeye`, copiar código a `/opt/stableeye`,
y dar acceso de lectura al archivo 600 en `/etc/stableeye/hls-agent.json` a ese
usuario. El spool del servicio es `/run/stableeye-hls`, temporal y limitado por
la vigilancia. No habilitar systemd ni publicar nada hasta revisar diagnóstico
y autorizar la prueba. Al terminar: parar agente y receptor, quitar el argumento
de piloto de la app; reiniciar el receptor destruye segmentos y accesos temporales.

## 5. Qué medimos y cómo aceptar el piloto

**Primera fase continua/preparada:** Pi y receptor publicando antes del clic,
≥3 segmentos frescos. El usuario pulsa **Ver vídeo**. El reloj empieza en la primera
instrucción del manejador: incluye lectura/renovación de sesión, autorización,
carga opcional del reproductor, DNS/TLS/conexión, lista, segmentos y decodificación.
No se precarga ni se abre silenciosamente la cámara para mejorar artificialmente
esa cifra.

Se exige `requestVideoFrameCallback`: dos fotogramas presentados con `mediaTime`
**y contador** avanzando. `poster`, `loadeddata`, `canplay` o solo `currentTime`
no declaran éxito. Se registra cada intento, fallo, cancelación y excedencia de
3 s, no solo los éxitos o una media. A los 3 s se muestra aviso; a los 12 s sin
movimiento el intento falla. Navegadores sin esa API se declaran no medibles,
no se sustituyen por una medición menos fiable. Hay exportación JSON local de
los últimos 50 intentos de esa pestaña, sin tokens ni envío a analítica.

Campos de etapas son **hitos acumulados desde el clic**, no duraciones para sumar:
autorización, reproductor preparado, conexión/lista, primer frame y avance confirmado.

Pruebas funcionales iniciales:
- Escritorio Chrome/Edge/Firefox y móvil Safari iPhone/Chrome Android, empezando
  con un intento por estado: cámara lista, sin permiso, cámara parada,
  pérdida/retorno de red y cierre/cambio de cámara/cuenta.
- Ensayar primera apertura con caché fría y reapertura, sin arrancar procesos
  tras el clic. Registrar por separado si el servicio y la conexión estaban preparados.
- Comprobar físicamente vídeo móvil, autoplay silenciado, rotación y suspensión/
  vuelta a la pestaña. La emulación de viewport móvil no sustituye un móvil real.
- Medir **retraso respecto a la realidad** por separado: reloj sincronizado o una
  acción visible frente a la cámara y en el visor. `PROGRAM-DATE-TIME` por sí solo
  no mide captación/encoder/RTSP ni demuestra glass-to-glass.
- El piloto no contiene arranque bajo demanda: ese modo requeriría cronometrar
  además RTSP/GOP/segmentación/subida/arranque y no se presupone ≤3 s.
- HLS convencional con segmentos ~1 s suele arrastrar varios segundos de directo;
  abrir rápido no implica baja latencia. Si la apertura real no cumple o se pide
  menos retraso, comparar WebRTC sin prometer que cambia solo el reproductor.

**No se ha confirmado compatibilidad de la cámara, apertura ≤3 s real ni
latencia glass-to-glass sin diagnóstico y acceso al equipo.** Este código no
contrata ni provisiona HTTPS, Reserved VM, TURN, SFU, CDN o almacenamiento.

## 6. Tráfico continuo (30 días, 24/7, por cámara)

`GiB = bitrate_bits_s × 2 592 000 / 8 / 1 073 741 824`

| Bitrate elemental de ejemplo | Vídeo solo | Presupuesto +10–20% |
|---|---:|---:|
| 0,5 Mbps | 150,9 GiB/mes | 166–181 GiB/mes |
| 1 Mbps | 301,7 GiB/mes | 332–362 GiB/mes |
| 2 Mbps | 603,5 GiB/mes | 664–724 GiB/mes |

**No se eligió un bitrate real sin la muestra.** El margen es orientativo para
MPEG-TS/HTTPS/TLS y red, no una medición de este dispositivo. La Pi sube incluso
sin espectadores; cada espectador añade tráfico de salida similar mientras mira.
El proxy de esta app también transportaría esos bytes; no asumir que es gratis
ni extrapolar esta arquitectura a 30 cámaras sin un presupuesto/distribución
específicos. Reintentos, audio (aquí deshabilitado), VBR y uso real cambian las cifras.
El JSON de diagnóstico calcula automáticamente la estimación al bitrate observado.

## 7. Verificación local sin cámara y sin datos de clientes

```bash
npm run build
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_hls_pi.py' -v
node scripts/prepare-hls-fixture.mjs
```

Los tests de pipeline generan H.264 640×480/15fps, usan FFmpeg **copy**, HTTPS con
CA temporal validada, el receptor real y decodificación de los segmentos recibidos.
Otros comprueban permisos por cámara, cookies, caducidad, reinicios, límites,
orden, limpieza y medición. La identidad simulada se inyecta solo al importar
la fábrica del servidor en tests; no existe modo CLI que omita Supabase Auth.
El helper de navegador intercepta únicamente solicitudes de un contexto de prueba,
con vídeo sintético. No inicia sesión con clientes ni escribe en Supabase.
Los ficheros de prueba son temporales o están en `generated-artifacts/`, ignorados.

La comprobación funcional se puede repetir con Chromium instalado:

```bash
node scripts/test-hls-browser.mjs "https://$REPLIT_DEV_DOMAIN" /ruta/a/chromium
node scripts/test-hls-browser.mjs "https://$REPLIT_DEV_DOMAIN" /ruta/a/chromium --mse-only
```

Resultado de esta preparación: compilación correcta, 74 pruebas Node y 7 Python
aprobadas. En Chromium 152 pasó la reproducción sintética 640×480, cierre,
reapertura y exportación en escritorio y viewport móvil; también el camino
Hls.js/MSE, el rechazo sin descarga de vídeo y la advertencia por autorización
demorada 3,5 s. La cámara real, la identidad real en Supabase, Safari/iOS y
Android físicos no se comprobaron. Los tiempos sintéticos no representan la red
ni el encoder reales y no garantizan el objetivo de apertura.

El build corriente sirve para verificar compilación, **no para publicar**: la
publicación real debe seguir el procedimiento existente que conserva los assets
antiguos para las pestañas de clientes abiertas.
