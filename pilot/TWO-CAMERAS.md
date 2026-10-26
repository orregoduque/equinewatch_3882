# Lucero y Thunder: preparación, no despliegue automático

Lucero conserva `bacata-mock`, caballo
`a95f853c-e90b-4b6d-a4ea-f25cfa317119`, nodo 108.
Thunder usa `bacata-thunder`, caballo
`d826a274-58ea-4a55-8fd2-1d4c78222ab1`, nodo 109.
Las fotos de ambos ya llegan según el operador. **Thunder todavía no publica
streaming**. Ninguna prueba sintética acredita una transmisión física de Thunder.

## 1. Permisos Wasabi

Conservar la identidad de lectura del servidor, distinta de la Raspberry.
En Wasabi, ampliar únicamente su política GetObject a los dos recursos de
`services/wasabi-photos/iam-replit-two-horses-readonly.json`.
No necesita ListBucket, PutObject, DeleteObject ni cambiar el bucket.
La app no puede comprobar la política IAM a partir de una firma generada localmente.
Si la identidad sigue limitada al nodo 108, Thunder no descargará aunque la firma
se genere correctamente. No rotar las claves ni usar las de la Raspberry.
Si es imprescindible rotarlas, hacerlo solo mediante Replit Secrets.

El endpoint mantiene JWT real, permisos por caballo, filtro `horse_id` y validación
del prefijo propio: una fila de Thunder no puede firmar el prefijo de Lucero.
El polling y la renovación son independientes de HLS.

## 2. Receptor existente

Origen: `https://hls-receiverzip.replit.app`.
El receptor admite varias cámaras, ventanas y cookies separadas. La app resuelve
la sesión por `POST /api/hls-pilot/horses/{horse_id}/session`:
consulta al receptor con el JWT y la credencial del proxy y elige la asignación
verificada. Lucero y Thunder tienen expectativas de cameraId explícitas.
No acepta cameraId, URL o asociación del navegador como autoridad.
Las rutas antiguas se conservan para las pestañas de clientes ya abiertas.

No hay acceso desde este proyecto al Secret `HLS_RECEIVER_CONFIG` del otro
proyecto. Antes de cambiarlo, hacer una copia privada y verificar:
- `bacata-mock` está asociado a Lucero y conserva sus hashes y permisos.
- No existe ya `bacata-thunder`, ni otra asignación para Thunder.
- `appProxyKeySha256`, la clave de Lucero y sus usuarios no se cambian.

El preparador del paso siguiente rechaza colisiones contra la configuración
actual que se le proporcione. Esto **no** equivale a haber inspeccionado el
Secret del receptor publicado. No sustituirlo por una plantilla inventada.
El límite actual es cuatro cámaras; no se amplía.

## 3. Preparar Bacatá sin tocar Lucero

Copiar los archivos del paquete a una carpeta temporal de la Raspberry.
Conservar las versiones instaladas y no sobrescribir el agente operativo de
Lucero. Para Thunder se instalará una copia separada.

Diagnóstico local (no escribe en las cámaras):

```sh
python3 pilot/pi/probe.py --seconds 60 --idr-seconds 10
```

En el prompt oculto introducir la fuente real de Thunder:
`rtsp://192.168.1.109:554/avstream/channel=1/stream=1.sdp`.
Si requiere usuario/contraseña, introducirlos localmente, no en chats ni shell
history. Se espera H.264, 704×576 y 24 fps, no se fuerza 720p.
Medir bitrate e IDR/keyframes. Priorizar GOP de un segundo (24 fotogramas a
24 fps), o documentar el intervalo real. No cambiar el flujo principal de Lucero.
No marcar la confirmación hasta verificar H.264 y segmentos independientes.

Disponer de una copia **actual**, privada y fuera de Git de la configuración del
receptor. Si solo existe en Secrets, trasladarla mediante un canal privado al
archivo root-only `/root/stableeye-receiver-current.secret.json`, nunca al chat.
No exportar ni compartir el entorno completo.

```sh
sudo python3 pilot/pi/prepare_thunder.py \
  --receiver-config /root/stableeye-receiver-current.secret.json \
  --output /root/stableeye-thunder-new \
  --prepare-private-files --confirm-h264-keyframes
```

La carpeta debe ser nueva. Genera una credencial aleatoria **solo para Thunder**
y su SHA-256, sin imprimirlos. Salidas:
- `receiver-next.secret.json`: conserva toda la configuración y añade Thunder.
  Pasar su contenido exclusivamente al formulario seguro de `HLS_RECEIVER_CONFIG`
  **en el proyecto receptor**.
- `hls-thunder.secret.json`: fuente, nueva credencial y spool independiente.
  Instalar únicamente en la Raspberry.

Thunder comienza sin propietarios adicionales. Los administradores reales
existentes conservan acceso; el piloto sigue founder-only si esa era su lista.
No se conceden permisos automáticamente a otro usuario. Dos conexiones
autorizadas pueden funcionar a la vez; para incorporar nuevas personas hacen
falta UUID reales y autorización explícita, no roles de localStorage.

Aplicar el nuevo Secret requiere reiniciar/republicar el receptor según su
entorno. **Sus ventanas son en memoria y un reinicio corta temporalmente ambos
vídeos** hasta que los agentes rellenen los segmentos. Programar ese paso;
no prometer una actualización en caliente o cero interrupción.
No cambiar `HLS_PROXY_KEY` de la app ni el hash correspondiente.
Si se actualiza el código del receptor, el paquete existente puede regenerarse
con `node scripts/package-hls-receiver.mjs`; no es necesario cambiar el protocolo.

## 4. Instalar solo el publicador de Thunder

Con la cuenta `stableeye` ya existente, desde la carpeta del paquete:

```sh
sudo install -d -o root -g root -m 755 /opt/stableeye-thunder/pilot/pi
sudo install -m 644 pilot/pi/agent.py pilot/pi/media.py \
  /opt/stableeye-thunder/pilot/pi/
sudo install -o stableeye -g stableeye -m 600 \
  /root/stableeye-thunder-new/hls-thunder.secret.json /etc/stableeye/hls-thunder.json
sudo install -m 644 pilot/pi/stableeye-hls-thunder.service \
  /etc/systemd/system/stableeye-hls-thunder.service
sudo systemctl daemon-reload
sudo systemctl enable --now stableeye-hls-thunder.service
sudo systemctl show stableeye-hls-thunder.service \
  -p ActiveState -p SubState -p NRestarts --no-pager
```

Requisitos ya usados por el piloto: Python 3, FFmpeg/ffprobe con H.264/RTSP.
No crear ni reemplazar el usuario o los servicios actuales.
Solo se inicia `stableeye-hls-thunder`; no parar/reiniciar el publicador de Lucero
ni los servicios de fotos.

El agente conserva `-timeout 10000000`, RTSP/TCP, `-c:v copy`, reconexión,
un spool temporal acotado y subidas HTTPS salientes.
Cada publicador usa un epoch UUID y su secuencia independientes:

`PUT /ingest/bacata-thunder/{epoch-uuid}/{sequence}`

Cabeceras: `Authorization: Bearer <credencial local de Thunder>`,
`Content-Type: video/mp2t`, `X-Segment-Duration` (segundos),
`X-Segment-Start` (ISO UTC). Cuerpo: bytes MPEG-TS. Éxito: 204.
Nunca publicar RTSP directamente en Internet. La playlist se consulta por
`/api/hls-pilot/media/bacata-thunder/index.m3u8`, no por una URL RTSP.
Playlists y segmentos requieren su cookie HttpOnly propia.

## 5. Aceptación real, sin mezclarla con las pruebas locales

1. Verificar segmentos Thunder con 204 sostenidos y sin reinicios.
2. En la app, Thunder debe pasar de no disponible a vídeo de su cámara.
3. Mantener dos sesiones autorizadas simultáneas, una por caballo; comprobar
   objetos/cámaras distintos y que cambiar rápidamente no muestra el anterior.
4. Lucero debe conservar `bacata-mock`; no aceptar Thunder como fallback.
5. Comprobar fotos nuevas de ambos cada diez segundos mientras ambos vídeos
   están abiertos. Mantener una foto más de diez minutos y regresar de suspensión.
6. Sin sesión y sin permisos: rechazo de fotos, sesiones, playlists y segmentos.
7. Verificar los demás caballos, Registro y fichas.
8. Medir movimiento desde clic y estabilidad de reproducción por separado del
   retraso real. No atribuir tiempos de fixtures a las cámaras físicas.

Para detener **solo** el nuevo publicador, usar
`sudo systemctl stop stableeye-hls-thunder.service`. Mantener Lucero y fotos.
No borrar objetos, historiales, Secrets o configuraciones para revertir un ensayo.

## Estado de la preparación en este proyecto

Se implementó y probó el backend de fotos para los dos prefijos y la sesión HLS
resuelta por caballo. Pasaron 204 pruebas Node, 21 Python y pruebas de navegador
con dos usuarios sintéticos reproduciendo simultáneamente, cambio rápido de
caballo y polling de fotos durante ambos vídeos. También pasaron los escenarios
previos de HLS, fotos Supabase, miniaturas e historial; la compilación de
publicación conserva 64 archivos anteriores y pasó la continuidad de pestañas.

El receptor publicado respondió 200 a `/health` y 403 al listado sin
credenciales. No se inspeccionó ni modificó su Secret: la disponibilidad real de
`bacata-thunder` debe verificarse contra su configuración actual con el preparador.
No se cambió IAM en Wasabi, no se inició Thunder en Bacatá y no se publicaron
estos cambios de la app. La captura visual automática no tiene sesión; las
pantallas privadas se verificaron con fixtures, no con sesiones de clientes.
Las cámaras físicas, la subida simultánea real y la renovación real requieren
los pasos de aceptación anteriores.
