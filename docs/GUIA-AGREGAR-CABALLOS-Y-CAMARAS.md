# Stable Eye: guía para incorporar caballos, fotos y cámaras en directo

Guía operativa para un agente en la app principal, otro en el receptor HLS y
Codex en la Raspberry. No contiene secretos y no autoriza cambios de producción
por sí sola.

## 1. Cómo usar esta guía

1. Leerla completa antes de preparar una incorporación.
2. Confirmar el estado actual del código, despliegues, equipos y permisos.
3. Completar la ficha de incorporación de la sección 4.
4. Repartir el trabajo entre los tres entornos sin asumir acceso compartido.
5. Preparar, probar y publicar por etapas con autorización del operador.
6. Entregar evidencias por cámara, diferenciando pruebas simuladas y reales.

**Fuente de verdad:** la instrucción actual del operador, la configuración real
del servidor y el código vigente prevalecen sobre ejemplos históricos. Una ruta,
límite o comportamiento descrito aquí debe verificarse antes de reutilizarse.

Los documentos `pilot/HLS-PILOT.md`, `pilot/TWO-CAMERAS.md` y
`pilot/RECEIVER-PUBLISH.md` conservan instrucciones del piloto inicial. No ejecutar
sus generadores ni copiar sus ejemplos como si fueran una instalación nueva:
ya hay clientes, claves válidas y cámaras funcionando. En particular, el proxy
opcional actual falla de forma aislada; no debe impedir el arranque de la app
por un problema exclusivo del vídeo.

## 2. Arquitectura y responsabilidades

### 2.1 Vídeo

```text
Cámara IP PoE, red privada
    │ RTSP local: preferentemente secundario H.264
    ▼
Raspberry: FFmpeg sin recodificar + publicador por cámara
    │ conexión saliente HTTPS, segmentos MPEG-TS
    ▼
Proyecto receptor HLS independiente, proceso siempre activo
    │ ventana circular en RAM, sin grabación permanente
    ▼
Proxy de la app principal, mismo origen que el navegador
    │ sesión real + asociación caballo/cámara + cookie temporal
    ▼
Safari/HLS nativo o hls.js según el navegador
```

El navegador no recibe la URL RTSP, ni la clave del publicador, ni la clave del
proxy. La cámara no se expone a Internet: no abrir RTSP en el router ni crear
port-forwarding. El publicador funciona continuamente; pulsar Live video abre
un flujo ya preparado, no arranca la cámara.

### 2.2 Fotos: circuito independiente

```text
Captura periódica → objeto en Storage/Wasabi + metadatos en Supabase
                  → lector autorizado → timeline / búsqueda / timelapse
```

El vídeo no sustituye las fotos ni condiciona su captura. Dar de alta vídeo no
autoriza una migración de fotos, y migrar fotos no demuestra que exista RTSP.
Un ESP32 que sube JPEG no implica que proporcione vídeo RTSP.

### 2.3 Qué corresponde a cada agente

| Entorno | Puede preparar/verificar | No debe asumir |
|---|---|---|
| App principal | Asociación caballo/cámara, lector de fotos, UI, proxy, pruebas y compatibilidad de publicación | Acceso al Secret del receptor o a la Raspberry |
| Receptor HLS | Configuración privada, ACL, hashes, capacidad, ingesta, publicación propia | Permiso para cambiar usuarios, claves o despliegue de la app principal |
| Codex/Raspberry | Diagnóstico RTSP, archivos privados locales, servicios, subidas y recursos del equipo | Que `/health` 200 significa que su cámara está registrada o enviando vídeo |
| Operador | UUID y permisos autorizados, datos del caballo, credenciales por canal seguro, ventanas de reinicio y publicaciones | Que publicar uno de los proyectos publica el otro |

El receptor actual está en `https://hls-receiverzip.replit.app`. Antes de utilizar
otra dirección, confirmar el dominio publicado en el proyecto correspondiente.
En la app principal, consultar la información real de despliegue para obtener
el dominio de producción; no deducirlo del dominio del preview.

## 3. Inventario de referencia y límites

### 3.1 Asociaciones que deben conservarse

| Caballo | horse_id | cameraId HLS | Fotos conocidas |
|---|---|---|---|
| Lucero | a95f853c-e90b-4b6d-a4ea-f25cfa317119 | bacata-mock | Bacatá, node_108 |
| Thunder | d826a274-58ea-4a55-8fd2-1d4c78222ab1 | bacata-thunder | Bacatá, node_109 |
| Tessa | e47d1da3-9b6b-4433-819c-423d7687b296 | casona-tessa | Casona, node_3 |
| Velvet Vitalis | 61c46d85-34be-4fa8-a892-9e22211487df | casona-velvet | Casona, node_1 |
| Golden Girl (preparada; disponibilidad por confirmar) | a264b293-2d23-497f-b47f-5f7e68a81ea9 | bacata-golden-girl | Bacatá, node_110 |

La quinta asociación está preparada en la app, no certificada como activa en
el receptor ni en la Raspberry. Consultar `docs/golden-girl-live-handoff.md`.

**`bacata-mock` es el identificador del vídeo real de Lucero. No renombrarlo.**
El nombre histórico no implica que deba sustituirse por una demostración.

Encantador, `0c8856e1-87eb-4abb-b145-28b070d34cf9`, tiene fotos Wasabi en
Rancho/node_1. No asignarle `bacata-mock` por asociación con pruebas antiguas.
No aparece en este inventario de cuatro directos.

El operador ha confirmado reproducción en preview de la integración reciente.
Eso no certifica todas las combinaciones de usuario, cámara y navegador, ni los
tiempos de apertura, ni la revisión publicada de la app principal.

### 3.2 Bloqueo antes de añadir una quinta cámara

El código de referencia del receptor valida **entre una y cuatro cámaras**.
Los cuatro directos anteriores ocupan la capacidad de referencia; una quinta
asociación preparada en la app no la amplía. Antes de añadir otra al receptor:

1. El agente del receptor debe verificar el número y límite realmente publicados.
2. Si está completo, detener el alta y presentar una decisión de capacidad.
3. No borrar una cámara existente ni cambiar `4` por un número mayor sin análisis.
4. Evaluar CPU, RAM, conexiones, tráfico, límite de ingestas y solicitudes.
5. Elegir con el operador entre una ampliación probada o una distribución entre
   receptores. La app actual usa un solo `HLS_RECEIVER_ORIGIN`: varios receptores
   requieren diseñar también el enrutamiento y autorización en la app.
6. Obtener aprobación antes de contratar recursos o modificar arquitectura.

Otros límites del código de referencia, a revisar en la versión real:

| Componente | Límite/comportamiento |
|---|---|
| Ingestas simultáneas del receptor | 2 subidas en curso en total |
| Control de solicitudes | 1.200 solicitudes/minuto por IP observada; verificar efecto del proxy |
| Segmento de subida | Hasta 2 MiB; duración entre 0,04 y 2 segundos |
| Ventana por cámara | Hasta 60 s, 16 MiB o 90 segmentos; se descarta lo que exceda primero |
| Estado listo | Al menos 3 segmentos y recepción reciente, dentro de 8 s |
| Fecha del segmento | Receptor rechaza un desfase mayor de 10 s |
| Cookie de reproducción | Temporal, 90 s, con renovación en el reproductor |
| Cola local del agente | Limitada y descartada al reconectar; no grabación histórica |

Cuatro cámaras configurables no significan capacidad demostrada para cualquier
bitrate o número de espectadores. Los proxies, límites de IP y copias de vídeo
pueden dominar el coste antes que la RAM de la ventana.

## 4. Ficha obligatoria de incorporación

Completar antes de editar o activar:

```text
Nombre del caballo:
horse_id real de public.horses:
Sitio / site_id / nodo de fotos:
Alta nueva o caballo existente:
Alcance autorizado: ficha / fotos / vídeo / migración de fotos:
photo_backend actual y deseado:
profile_photo_url actual:
Tabla y columna temporal de fotos:
Bucket / región / endpoint / prefijo autorizado:
cameraId propuesto, único y estable:
Raspberry / modelo / RAM / SO / versiones de FFmpeg y Python:
Fuente RTSP secundaria: guardada localmente, NO pegar credenciales:
Resultado H.264 / resolución / fps / bitrate / GOP / IDR:
UUID reales de Auth autorizados y función de cada uno:
Receptor destino y capacidad disponible:
Secret/hashes nuevos preparados mediante canal seguro:
Servicios existentes que no se pueden interrumpir:
Ventana de reinicio aprobada:
Dominio y revisión actual de cada proyecto:
Plan de reversión y responsable de cada entorno:
```

Si faltan `horse_id`, UUID de Auth, fuente compatible o capacidad, no inventar.
Un nombre de caballo, correo, rol local o nombre de perfil no sustituye al UUID.

## 5. Reglas que no se deben romper

- No cambiar esquemas, políticas RLS, datos, claves o asociaciones sin permiso
  específico. Un alta de cámara no autoriza estas operaciones.
- Si el caballo es nuevo, coordinar su creación y asignación con el responsable
  de Supabase por separado. No insertar desde esta guía ni usar `service_role`.
- No migrar el login de clientes ni tomar identidades demo como autorización real.
- No ampliar permisos copiando el propietario de otro caballo.
- No tocar servicios de captura de fotos al instalar un publicador de vídeo.
- No modificar el flujo principal de la cámara para mejorar el secundario.
- No mostrar vídeo de otro caballo ni una muestra de cinco segundos como fallback.
- No poner credenciales, JSON privados o URLs firmadas completas en chat, Git,
  capturas, comandos compartidos o informes.
- No almacenar secretos en documentación, memoria de agentes o frontend.
- No ejecutar generadores de instalación inicial para actualizar una instalación
  existente: podrían crear claves diferentes y romper servicios activos.
- No publicar, contratar ni hacer push sin la autorización correspondiente.

## 6. Fase A — inspección sin cambios

### App principal

1. Leer las instrucciones del proyecto y los recuerdos sobre cámaras,
   autorización, fotos privadas y compatibilidad.
2. Revisar el estado de Git y los archivos relevantes, no toda la configuración
   de entorno: puede contener secretos.
3. Confirmar despliegue, dominio y comando de compilación actuales.
4. Localizar:
   - `services/hls-pilot/horse-cameras.mjs`: asociaciones esperadas.
   - `services/hls-pilot/app-proxy.mjs`: proxy y resolución autorizada.
   - `src/pages/horse-timeline/components/TimelineLiveVideo.tsx`: entrada de vídeo.
   - `src/features/hls-pilot/playback.ts`: reproducción y limpieza.
   - `src/utils/supabase.ts`, `src/utils/liveHorseImages.ts` y
     `src/utils/wasabiPhotos.ts`: datos y actualización de fotos.
   - `services/wasabi-photos/handler.mjs`: autorización y firma de fotos privadas.
5. Anotar el comportamiento existente que debe mantenerse.

### Receptor

1. Verificar configuración real y revisión publicada de forma privada.
2. Inventariar cámaras, asociaciones y ACL sin exponer claves o hashes.
3. Identificar límites y capacidad; resolver el bloqueo de la sección 3.
4. Preparar una copia segura de la configuración válida, fuera de Git.

### Raspberry / Codex

1. Inventariar servicios de fotos y vídeo, rutas y propietarios de los archivos.
2. Comprobar CPU, memoria, disco temporal, hora/NTP y subida de Internet.
3. Confirmar acceso local a la cámara, sin abrirla a Internet.
4. No listar procesos o logs de FFmpeg en un informe sin sanitizar: su línea
   de argumentos puede incluir la URL RTSP con contraseña.

## 7. Fase B — comprobar la fuente real en la Raspberry

Herramientas de referencia: Python 3, FFmpeg, ffprobe y certificados CA.
Instalar únicamente si faltan, mediante el gestor del equipo y con autorización.
No es necesario recodificar, instalar Docker o cambiar de sistema operativo.

Desde la raíz del código del piloto:

```bash
ffmpeg -version
ffprobe -version
python3 pilot/pi/probe.py --seconds 60 --idr-seconds 10
```

El diagnóstico pide la URL RTSP de forma oculta. Hacerlo para cada fuente
secundaria real. No pasar una contraseña literal en una instrucción pegada al chat.
La herramienta lee el flujo y no cambia la configuración ni graba vídeo.

Revisar el JSON sanitizado:

| Campo | Qué significa / condición |
|---|---|
| `stream.codec_name` | Debe ser H.264 para el publicador actual |
| `stream.pix_fmt` | `yuv420p` |
| `stream.has_b_frames` | 0 para este piloto |
| `stream.width`, `height`, fps | Medidas reales, no resolución supuesta |
| `video_bitrate_mbps` | Medido durante la muestra, no solo valor anunciado |
| `keyframe_interval_seconds` | Espaciado real de paquetes clave |
| `idr_verified` | Verificación de IDR, no solo marca genérica de keyframe |
| `idr_interval_seconds` | Intervalo real de IDR |
| `every_key_packet_contains_idr_sps_pps` | Independencia de los puntos de arranque |

Configurar únicamente el secundario, si el equipo lo permite y el operador
autoriza: H.264, GOP cerrado, sin B-frames, IDR aproximadamente cada 1 s y
SPS/PPS repetidos. Ejemplo: 25 fotogramas de GOP a 25 fps; 24 a 24 fps.
El secundario ha anunciado 640×480 en equipos anteriores: **no asumir 720p**.
Thunder fue medido en H.264, 704×576, 24 fps; no extrapolarlo a otra cámara.

Si la cámara solo ofrece H.265, no marcar falsamente la fuente como compatible.
Detenerse y evaluar alternativas con el operador. Recodificar cambia CPU,
calidad y latencia, y necesita otra decisión.

**Problema ya resuelto:** la Raspberry verificada con FFmpeg 7.1.5 utiliza
`-timeout 10000000` para RTSP. No reintroducir `-stimeout` ni sustituirlo a ciegas
por `-rw_timeout`. Comprobar las opciones de la versión instalada si difiere.

La Raspberry del piloto inicialmente propuesta y la realmente diagnosticada
no siempre coincidieron. Confirmar modelo/RAM; no dimensionar por recuerdos
de un Pi 5 si el equipo real resulta ser Pi 4/2 GB.

## 8. Fase C — credenciales y configuración privada del receptor

### 8.1 Tres credenciales distintas

1. **Publicador por cámara:** valor secreto únicamente en su Raspberry;
   `publisherKeySha256` correspondiente en el receptor.
2. **Proxy de la app:** `HLS_PROXY_KEY` en la app principal;
   `appProxyKeySha256` en el receptor. Compartido con la instalación existente:
   no rotarlo por dar de alta otra cámara.
3. **Usuario:** JWT real de Supabase Auth para obtener acceso temporal;
   no se entrega al publicador.

Para una cámara existente, reutilizar la credencial válida. Para una nueva,
generarla de forma segura en el entorno autorizado, con archivo privado y
permisos restrictivos. Nunca comunicarla por chat. El operador transfiere los
datos necesarios mediante Secrets/formulario seguro, no mediante el repositorio.

### 8.2 Fusionar, no sustituir

El Secret `HLS_RECEIVER_CONFIG` es un **objeto raíz completo** con un arreglo
`cameras`. Un archivo que contiene solo el array de dos cámaras nuevas no es
una configuración válida del receptor.

Procedimiento del agente del receptor:

1. Cargar privadamente la última configuración válida y su copia segura.
2. Si solo queda un Secret inválido y no existe copia válida, detenerse.
   No reconstruir hashes, administradores o permisos a partir de suposiciones.
3. Conservar URL y clave pública de Supabase, `appProxyKeySha256`,
   `adminUserIds` y todas las cámaras con sus asociaciones y hashes.
4. Añadir exclusivamente las entradas aprobadas, dentro de capacidad.
5. Si ya existe `cameraId`, comparar privadamente caballo y hash. Una diferencia
   es un conflicto, no permiso para sobrescribir o regenerar.
6. Validar IDs únicos, un caballo por asignación y credenciales independientes.
7. Completar solo los `ownerUserIds` / `stableOwnerUserIds` expresamente
   autorizados; conservar los administradores legítimos.
8. Validar el objeto completo con el validador de esa revisión antes de guardarlo.
9. Guardar en Secrets del receptor, no en esta app.
10. Informar del resultado con nombres/IDs operativos, cantidades y
    validaciones booleanas; no imprimir el JSON ni hashes.

No se reproduce aquí un JSON listo para pegar porque sería incompleto sin la
configuración privada actual. Los ejemplos del repositorio son plantillas,
no reemplazos de producción.

### 8.3 Publicación del receptor

- Proyecto separado y proceso siempre activo. Conservar su configuración
  operativa; no mover la app principal de Autoscale solo para alojar vídeo.
- Verificar terminación HTTPS del proxy y `HLS_TLS_TERMINATED_BY_PROXY=true`
  cuando esa sea la configuración real.
- El dominio debe ser accesible externamente sin una pantalla de login de
  Replit interpuesta; la autenticación propia protege las rutas HLS.
- Consultar las capacidades/costes actuales de Replit con documentación oficial
  y Publishing, no con cifras antiguas de esta guía.
- Acordar el reinicio: las ventanas en RAM se pierden y los directos anteriores
  pueden interrumpirse temporalmente.
- El usuario publica el receptor. Confirmar que la nueva revisión está sirviendo
  y que el Secret quedó aplicado antes de pedir el arranque de nuevos publicadores.

`GET /health` 200 prueba disponibilidad básica, **no** número de cámaras,
aplicación de ACL, compatibilidad del vídeo ni recepción de segmentos.

## 9. Fase D — publicador por cámara en la Raspberry

Referencia: `pilot/pi/agent.py`, `pilot/pi/media.py`, `pilot/agent.example.json`
y unidades `pilot/pi/stableeye-hls*.service`.

Preparar por cámara:

- Configuración privada propia: `rtspUrl`, `receiverOrigin`, `cameraId`,
  `publisherKey`, `confirmedH264IndependentSegments` y `spoolRoot`.
- `confirmedH264IndependentSegments=true` solo después del diagnóstico real.
- Directorio privado, archivo con modo 600 y usuario de servicio correcto.
- Unidad systemd y directorio temporal propios; no reutilizar los de otra cámara.
- Mismos binarios probados de FFmpeg/Python y sin detener servicios de fotos.
- HTTPS con validación de certificados, sin opciones que ignoren TLS.

El agente referencia hace remux con `-c:v copy`, RTSP/TCP, segmentos HLS locales
y envío HTTPS. Descarta colas antiguas al reconectar, usa épocas distintas y
reintentos con espera de 1 a 30 s. Conserva watchdog y límites; no convertirlo
en una grabadora ni en una cola ilimitada.

Comandos **orientativos** tras verificar rutas y nombre real de la nueva unidad:

```bash
# Primero prueba local en primer plano con archivo privado, sin mostrarlo:
python3 pilot/pi/agent.py --config /RUTA/PRIVADA/NUEVA-CAMARA.json

# Tras instalar/revisar la unidad nueva, no una existente:
sudo systemctl daemon-reload
sudo systemctl enable --now NOMBRE-NUEVO.service
sudo systemctl show NOMBRE-NUEVO.service \
  --property=ActiveState,SubState,NRestarts
```

No ejecutar literalmente los marcadores. No activar dos instancias para la
misma cámara/clave: sus épocas pueden interferir. No copiar sin revisar el
preparador `prepare_thunder.py`: está especializado en Thunder, no es un
generador universal.

Contrato de ingesta actual:

```text
PUT /ingest/<cameraId>/<epoch-UUID>/<secuencia>
Authorization: Bearer <credencial privada de esa cámara>
Content-Type: video/mp2t
X-Segment-Duration: duración real
X-Segment-Start: fecha ISO UTC
Cuerpo: segmento MPEG-TS
Éxito: HTTP 204
```

Mantener hora del equipo sincronizada: colas viejas y reloj desviado provocan
rechazos aunque la clave sea correcta.

El agente base no imprime el código HTTP de cada subida: da un mensaje genérico
de interrupción ante rechazo. Para certificar 204 sostenidos, usar observación
sanitizada del receptor o instrumentación controlada que solo registre cámara,
estado, contador y hora. No afirmar “70 segmentos 204” si solo se vio un proceso
activo. Ante 401/403 persistentes, detener únicamente el publicador nuevo y
comparar configuración en privado, en vez de rotar claves al azar.

Medir durante al menos dos minutos por cámara: segmentos aceptados, frescura,
errores, reinicios, CPU/RAM y continuidad de fotos. Comprobar también recepción
de las cámaras anteriores después del reinicio del receptor.

## 10. Fase E — app principal y autorización

### 10.1 Asociación y credenciales

1. Confirmar `horse_id` real y `cameraId` únicos.
2. Actualizar las asociaciones esperadas de
   `services/hls-pilot/horse-cameras.mjs`, manteniendo las anteriores.
3. Actualizar pruebas de la asociación nueva, duplicados e intercambio de IDs.
4. Conservar `HLS_RECEIVER_ORIGIN` y `HLS_PROXY_KEY` existentes si no cambia el
   receptor. No necesita una nueva clave proxy por cada cámara.
5. No poner asignaciones privadas/credenciales en el frontend.

Flujo que debe conservarse:

1. Navegador con sesión real solicita descubrimiento o sesión.
2. El proxy transmite la identidad al receptor con su credencial propia.
3. Receptor valida el JWT con Supabase y filtra cámaras según ACL del servidor.
4. Proxy resuelve exactamente una asociación autorizada para el caballo.
5. Se emite sesión temporal para esa cámara y se comprueba el playback esperado.
6. Playlists **y todos los segmentos** exigen acceso válido.

Ruta de sesión por caballo:
`POST /api/hls-pilot/horses/<horse_id>/session`.
No aceptar una URL o `cameraId` arbitrario del navegador para saltarse la
asociación. No usar metadata editable ni el rol almacenado en localStorage
como autoridad. Las ACL de fotos y de vídeo no son intercambiables.

Un clic no autorizado muestra **“no access for now”** y X para cerrar.
No habilitar todos los caballos a un usuario porque tenga acceso a uno.

### 10.2 Reproductor

- Reutilizar el reproductor actual: HLS nativo cuando corresponda, hls.js en
  los demás casos. No añadir un segundo reproductor independiente.
- Mantener apertura en pantalla completa y X de regreso al timeline.
- Preparación anticipada solo para cámaras autorizadas y con recursos acotados.
- Estados explícitos: conectando, reproducción, reconexión y error/desconexión.
- Al cerrar, cambiar caballo o desmontar: destruir HLS, detener vídeo,
  cancelar solicitudes/temporizadores y descartar respuestas tardías.
- Mantener renovación de sesión y recuperación limitada, sin bucles infinitos.
- No cambiar el flujo de fotos ni el buscador para instalar una nueva cámara.

Medir desde el clic, incluyendo autorización, sesión, conexión y primeros
fotogramas **avanzando**. `loadeddata`, una imagen estática o un segmento subido
no demuestran movimiento. Objetivo de apertura ≤3 s; no prometerlo sin medición.
La latencia respecto al mundo real se mide aparte.

## 11. Fase F — fotos y caballo, cuando formen parte del alcance

### 11.1 Perfil y navegación

- Leer `horses.profile_photo_url` para retrato en tarjeta y cabecera de ficha.
- No sustituirlo por una cámara, Unsplash o una URL histórica hardcodeada.
- Clic en el retrato → timeline del caballo; “Ver ficha” → ficha de datos.
- Ficha solo lectura salvo encargo explícito distinto; nulos se muestran “—”.
- `date_of_birth` se muestra dd/mm/yyyy sin desplazamiento de zona horaria;
  `age` de Supabase sigue siendo la edad autoritativa.
- El listado conserva `is_active` y los filtros/permisos vigentes.

### 11.2 Elegir backend sin mezclar históricos

El caballo debe cargarse incluyendo `photo_backend`:

```text
photo_backend === 'wasabi':
  public.images_wasabi, filtro horse_id, photo_url del lector autorizado
en otro caso:
  public.images, filtro horse_id, URL de Storage como en el flujo existente
```

No hardcodear “si es Lucero”. Si un caballo Wasabi falla, no mostrar
silenciosamente fotos antiguas de `public.images`. Nunca concatenar la URL
de Storage de Supabase a una ruta Wasabi. Mantener el contrato de compatibilidad
del lector (`photo_url` y su alias legado `imageUrl` donde siga siendo necesario).

### 11.3 Acceso privado Wasabi

Entorno de referencia:

- Bucket `equinewatch-photos`.
- Región `us-east-1`.
- Endpoint `https://s3.us-east-1.wasabisys.com`.
- Claves lectoras existentes en Secrets de la app, distintas de publicadores.

Antes de incorporar otro caballo:

1. Confirmar bucket/región/prefijo exacto con el operador.
2. Ampliar la lista de ámbitos permitidos de `handler.mjs` solo para ese
   `horse_id` y prefijo, con pruebas de rechazo de otros prefijos.
3. Preparar, si hace falta, permiso IAM **GetObject** mínimo sobre el prefijo.
   Aplicarlo únicamente con autorización; no conceder bucket completo,
   ListBucket, escritura o borrado por comodidad.
4. Mantener permisos previos y claves de lectura. No sustituirlos por las claves
   con las que la Raspberry escribe objetos.
5. Validar sesión real, acceso al caballo y que el backend sea Wasabi.
6. Firmar objetos obtenidos de metadatos autorizados, no claves arbitrarias del
   cliente. La firma es temporal y no debe guardarse en localStorage.
7. Verificar un **GET real y acotado** al objeto firmado; una fila visible o una
   firma generada no prueban permiso de lectura de S3.
8. Si falla, distinguir 403 de IAM/prefijo, 404 de objeto y expiración; no hacer
   público el bucket, cambiar RLS ni rotar claves como primera respuesta.

El script `scripts/check-tessa-wasabi-read.mjs` está especializado en Tessa y
Velvet: revisar antes de adaptarlo. Cero filas visibles con anon no demuestra
que no existan objetos. Usar la sesión permitida y no debilitar permisos.

### 11.4 Rendimiento de fotos que se debe conservar

- Entrada al timeline: últimas **20** fotos de ese `horse_id`, más recientes
  primero, sin segunda descarga masiva para rellenar la galería.
- Actualización periódica a 10 s con selección histórica deliberada estable.
- Búsqueda por hora conserva su rango temporal y comportamiento existente.
- “Generar timelapse”: consulta solo tras clic, ese caballo y esa hora,
  límite **360**, orden cronológico ascendente.
- Timelapse a 15 fps, una sola imagen visible, sin FFmpeg/MP4 ni 360 imágenes
  ocultas. El búfer actual está acotado a **8** frames incluyendo el actual.
- El opt-in actual `timelapse=1` permite firmar inicialmente los primeros 8 y
  el último; no cambiar las consultas normales ni anticipar todo el día.
- Mantener limpieza al cerrar y renovación selectiva de firmas.
- La optimización existente no autoriza añadir una caché global de Auth ni
  modificar Cache-Control de objetos: esas decisiones requieren revisión aparte.

No activar o cambiar `photo_backend` dentro de un alta de vídeo.

## 12. Verificación de seguridad, regresión y publicación

### 12.1 Pruebas automatizadas en la app principal

Desde la raíz, tras revisar que las rutas siguen vigentes:

```bash
node --test tests/*.test.mjs
npm run build:publish
node scripts/test-two-horse-video.mjs "https://DOMINIO-PREVIEW-VERIFICADO"
node scripts/test-wasabi-photos.mjs "https://DOMINIO-PREVIEW-VERIFICADO"
node scripts/test-release-continuity.mjs "https://DOMINIO-PRODUCCION-VERIFICADO"
```

`test-two-horse-video.mjs` conserva su nombre histórico, aunque cubre cuatro
asociaciones. Ampliar sus fixtures al añadir otra; no asumir cobertura automática.
Las pruebas de navegador usan cuentas/datos sintéticos: no certifican fotogramas
de la cámara real, IAM real, sesión de cliente real o Safari real.

Para Python, localizar y ejecutar las pruebas existentes del agente cuando se
modifique ese código. No dar por válido un FFmpeg distinto sin diagnóstico.

No es necesario reiniciar por editar documentación. Si cambia código o
configuración de ejecución, reiniciar el workflow afectado una vez después del
lote, revisar logs y comprobar la app antes de entregar.

### 12.2 Compatibilidad con clientes ya conectados

La publicación utiliza `npm run build:publish`, no solo una compilación limpia.
Conserva archivos frontend de versiones anteriores: una pestaña antigua puede
necesitar descargar un módulo al navegar después del republish.

- Verificar el dominio real y los archivos de la versión pública.
- Conservar el artefacto preparado; no reemplazarlo después con `npm run build`.
- Si falla la conservación de archivos, detener la publicación; no ignorar errores.
- Probar navegación de una pestaña antigua y nueva sin usar cuentas de clientes.
- Conservar rutas antiguas necesarias y contratos de respuesta durante la transición.
- No concluir “sin impacto” únicamente porque TypeScript o Vite compilaron.
- Confirmar existencia de Secrets necesarios en el entorno de publicación sin
  exponer valores. Que funcionen en preview no prueba presencia en producción.

### 12.3 Matriz de aceptación real

Registrar por cámara nueva y repetir una comprobación de las anteriores:

| Prueba | Evidencia mínima |
|---|---|
| Receptor vivo | `/health` 200 |
| Configuración aplicada | Agente del receptor confirma revisión/asociaciones/ACL privadamente |
| Ingesta | HTTP 204 sostenido, timestamps recientes, errores y reinicios |
| Fuente correcta | Fotogramas reales del caballo/cámara esperados; no mock |
| Usuario permitido | Reproducción con sesión real de propietario aprobado y admin legítimo |
| Usuario no permitido | No obtiene sesión ni puede descargar vídeo |
| Medios privados | Playlist y segmento sin ticket rechazados |
| Aislamiento | Ticket de una cámara no abre otra |
| Concurrencia | Dos espectadores y, cuando corresponda, dos cámaras distintas |
| Cambio rápido | No aparece el vídeo anterior ni ganan respuestas tardías |
| Cierre | Se detienen conexiones/temporizadores y vuelve al timeline |
| Caída de cámara | Mensaje claro y recuperación tras restaurar fuente |
| Fotos | Siguen entrando; galería de 20 y búsqueda por hora intactas |
| Timelapse | Consulta solo tras clic, máximo 360, limpieza al cerrar |
| Móvil real | Safari/iPhone además de Chrome/escritorio, cuando estén disponibles |
| Apertura | Segundos clic → fotogramas avanzando, varias repeticiones |
| Latencia real | Comparación visual con un evento/reloj en la cámara |

No pedir tokens al usuario para realizar estas pruebas. Usar su sesión normal o
herramientas autorizadas del entorno. Si una captura automática no tiene sesión,
declarar ese límite; no añadir un bypass para poder sacar la captura.

### 12.4 Orden de entrega

1. Preparación y aprobación de capacidad, datos y credenciales.
2. Merge privado validado en receptor.
3. Publicación del receptor en ventana acordada.
4. Recuperación de cámaras anteriores.
5. Arranque de los publicadores nuevos y evidencia de ingesta.
6. Prueba en preview de app principal con usuarios permitidos.
7. Compilación de publicación y regresión de clientes existentes.
8. Publicación independiente de app principal por el operador.
9. Comprobación real en el dominio publicado y vigilancia inicial.
10. Commit/push solo cuando se solicite, con verificación de rama/remoto.

Si publicar es una acción manual del usuario, no afirmar que el agente lo hizo.
Un cambio guardado en Secrets tampoco significa que esté aplicado al proceso
publicado. GitHub actualizado, preview funcionando y producción actualizada son
tres estados distintos.

## 13. Diagnóstico: problemas ya encontrados y orden de investigación

| Síntoma | Revisar primero | No hacer |
|---|---|---|
| “Published app not found” | Estado de publicación y URL de producción, no URL del editor | Suponer que un workflow de desarrollo equivale a publicación |
| Secret inválido: falta `cameras` | Objeto raíz completo frente a array de entradas | Reemplazar configuración vieja por las dos nuevas cámaras |
| 401/403 al subir | cameraId, hash/clave correspondiente, revisión aplicada | Regenerar todas las claves |
| 204 pero no vídeo | Cámara/fuente correcta, IDR, SPS/PPS, frescura, sesión y playlist | Afirmar que 204 prueba decodificación |
| “Conectando” y no avanza | Red, autorización, fuente H.264 real, segmentos independientes y timeout | Culpar al PC/celular sin evidencia |
| Se ve la muestra de 5 s | Qué fuente está publicando la Raspberry y qué cámara resolvió la app | Mantener un mock ocultando que la cámara falla |
| PC funciona y móvil no | Safari nativo vs hls.js, codec/perfil, sesión/cookies, red, autoplay y logs sanitizados | Concluir que todo es el teléfono o que Chromium móvil prueba Safari |
| Solo falla un caballo | Su mapping, ACL, publicador y prefijo; comparar sin copiar permisos | Cambiar el sistema de todos los caballos |
| Fotos visibles como metadatos pero imagen falla | GET real de Wasabi, IAM, región, clave exacta y expiración | Hacer bucket público o usar imágenes antiguas de Supabase |
| Retrato parece cámara | `horses.profile_photo_url` real, caché y selección de campo | Sobrescribir rutas de captura o hardcodear una URL vieja |
| “Invalid API key” en Supabase | Probar una tabla con `limit=0`, misma clave pública y entorno efectivo | Diagnosticar usando únicamente la raíz `/rest/v1/` |
| Vídeo se retrasa cada vez más | Cola vieja, reloj, bitrate, subida, GOP y reinicios | Aumentar indefinidamente el búfer |
| Otras cámaras fallan tras alta | Configuración preservada, reinicio, límites globales y concurrencia | Borrar las antiguas para hacer espacio |
| App deja de iniciar por vídeo | Aislamiento del proxy opcional y configuración validada | Acoplar el arranque completo a un piloto opcional |

El diagnóstico de Supabase de referencia
`GET /rest/v1/horses?select=id&limit=0` no descarga filas de clientes.
La raíz REST ha devuelto “Invalid API key” incluso con una clave pública válida.
Un resultado anon limitado por RLS no sustituye una prueba autenticada.

## 14. Coste y capacidad antes de escalar

Para bitrate de vídeo `b` en Mbps y 30 días de publicación continua:

```text
GB decimales de vídeo ≈ b × 324
GiB de vídeo ≈ b × 301,75
```

Ejemplo: 1 Mbps ≈324 GB/mes o ≈302 GiB/mes, antes de sobrecarga.
Presupuestar adicionalmente transporte MPEG-TS/HTTPS, reconexiones y variación
del bitrate; 10–20 % puede usarse como margen inicial, no como medición final.

Separar:

- Subida continua desde cada sitio al receptor.
- Salida del receptor por cada espectador simultáneo.
- Tránsito del vídeo por el proxy de la app principal.
- Fotos y sus propias lecturas/subidas, que siguen existiendo.
- CPU, RAM, conexiones, límites de solicitudes y disponibilidad del equipo.

No sumar dos veces el mismo tráfico como coste facturado sin comprobar el
modelo real del proveedor, pero tampoco asumir que el proxy distribuye gratis.
Para decenas de cámaras se necesita un diseño de capacidad/streaming específico;
no se escala este piloto cambiando solo el límite de cámaras.

## 15. Reversión segura

Antes de activar, tener copia privada válida de configuración y revisión
anterior de los componentes que se modificarán.

- Fallo en publicador nuevo: detener solo su unidad; no servicios de fotos ni
  otras cámaras. Conservar archivos privados para diagnóstico.
- Conflicto de configuración: no aplicar merge parcial ni eliminar entradas.
- Fallo del receptor tras publicar: coordinar recuperación de revisión/config
  conocida; cualquier reinicio vacía ventanas y necesita comunicación.
- Fallo de app: utilizar el mecanismo de restauración aprobado. No revertir
  automáticamente bases de datos, Secret compartido o trabajo ajeno.
- No borrar objetos de Wasabi, historial de Supabase, perfiles ni secretos
  para “deshacer” un ensayo.
- Informar qué sigue disponible y qué falta, sin prometer cero interrupciones.

## 16. Mensajes de traspaso entre agentes

Completar marcadores solo con datos confirmados; nunca pegar credenciales.

### A. Para el agente del receptor HLS

> Prepara la incorporación de [caballo/horse_id] como [cameraId]. Antes de
> modificar, verifica capacidad y revisión publicada: el código de referencia
> admite cuatro cámaras y ya hay cuatro asociaciones conocidas. Si no hay
> capacidad, detente y propón opciones sin borrar entradas ni aumentar límites.
> Con capacidad aprobada, fusiona por canal seguro las entradas nuevas dentro
> del objeto completo HLS_RECEIVER_CONFIG. Conserva Supabase, hashes, clave
> compartida del proxy, administradores y cámaras existentes. Autoriza únicamente
> UUID reales expresamente aprobados. Valida antes de guardar y no imprimas el
> JSON ni secretos. Coordina la interrupción antes de publicar; confirma revisión
> aplicada y recuperación de cámaras previas. No afirmes ingesta solo por /health.

### B. Para Codex en la Raspberry

> Incorpora únicamente el publicador de [cameraId] para [caballo]. Inventaría
> primero servicios y recursos sin cambiar fotos ni otros directos. Diagnostica
> el secundario RTSP real con probe.py: H.264, resolución/fps reales, bitrate,
> GOP/IDR y SPS/PPS; conserva el principal. Usa remux sin recodificación,
> configuración y clave privadas por cámara, timeout RTSP compatible, reloj
> sincronizado, reconexión y cola acotada. No reutilices rutas/unidades de otra
> cámara ni generes claves para una cámara ya configurada. Arranca solo tras
> confirmación de configuración aplicada en el receptor. Informa de al menos
> dos minutos de ingesta observada, errores/reinicios y continuidad de fotos,
> sin mostrar credenciales, URLs RTSP privadas ni archivos .private.

### C. Para el agente de la app principal

> Incorpora la asociación [horse_id] → [cameraId] conservando todas las previas
> y el proxy existente. Reutiliza el reproductor y autorización real del receptor;
> no roles locales, IDs arbitrarios ni mocks. Conserva fotos, búsqueda por hora,
> galería de 20 y timelapse solo por clic. Si el alcance incluye fotos Wasabi,
> utiliza photo_backend y acceso privado de mínimo privilegio, sin mezclar
> históricos. Añade pruebas de mapping/ACL/cambio/cierre y regresión. Prepara
> build:publish con assets antiguos, verifica continuidad frente al dominio
> publicado y distingue fixtures de cámara real. No publiques ni hagas push
> hasta la autorización correspondiente.

## 17. Informe final que debe entregar el agente

```text
Caballo / horse_id / cameraId:
Entornos modificados y responsable de cada uno:
Revisión y dominio de app principal:
Revisión y dominio del receptor:
Configuración validada / aplicada / publicada: distinguir estados
Publicador activo y período observado:
204 observados / errores / reinicios:
H.264 / resolución / fps / bitrate / GOP medidos:
Pruebas automatizadas: qué cubren y qué simulan:
Pruebas reales: usuario autorizado, navegador, cámara y resultado:
Denegación sin permiso y aislamiento entre cámaras:
Tiempo clic → movimiento: repeticiones y rango:
Latencia respecto a realidad:
Regresión de fotos y cámaras anteriores:
Datos, claves, políticas y servicios que NO se modificaron:
Pendientes o comprobaciones no realizadas:
Publicación / commit / push: hecho o pendiente, sin confundirlos:
Reversión preparada:
```

No incluir claves, hashes, tokens, cookies ni URLs firmadas completas.
La incorporación se da por terminada con evidencia del circuito completo y de
la conservación del servicio existente, no solo con “el servidor arrancó”.
