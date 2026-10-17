# Publicar el receptor aislado de Stable Eye

Este receptor pertenece a un **segundo proyecto**, no reemplaza la app en
stableeye.co. No ejecutar su comando de arranque ni copiar su `.replit` sobre
el proyecto principal. La preparación no crea infraestructura ni publica nada.

## 1. Crear el paquete, sin credenciales

Desde el proyecto principal:

```bash
node scripts/package-hls-receiver.mjs
(cd generated-artifacts/hls-receiver && \
  python3 -m zipfile -c ../hls-receiver.zip .replit .gitignore package.json README.md services)
```

Crear un proyecto nuevo desde **Import → ZIP** e importar ese paquete.
Incluye cuatro módulos Node, package.json y .replit; no requiere instalar paquetes.
No es necesario migrar ni reorganizar la app existente.

## 2. Configurar el segundo proyecto

Usar Node 20 o superior y publicar como **Reserved VM**, una instancia siempre
encendida, con `npm start`. No Autoscale: segmentos y sesiones viven en RAM
y deben ir al mismo proceso. No habilitar múltiples réplicas.
El proveedor publica HTTPS y reenvía HTTP al puerto 5000.
La instancia tiene coste independiente, además del tráfico de salida.
Confirmar el precio y la capacidad en Publishing antes de publicar.
La visibilidad de infraestructura debe permitir peticiones externas de la Pi;
el acceso a vídeo sigue protegido por las credenciales y permisos de esta app.

En **Secrets del receptor** guardar `HLS_RECEIVER_CONFIG`, un JSON con:

```json
{
  "supabaseUrl": "https://TU-PROYECTO.supabase.co",
  "supabaseAnonKey": "CLAVE-PUBLICA-ANON-DEL-PROYECTO-ACTUAL",
  "appProxyKeySha256": "HASH-SHA256-DE-LA-CREDENCIAL-EXCLUSIVA-DE-LA-APP",
  "adminUserIds": [],
  "cameras": [{
    "id": "box-one",
    "name": "Cámara de prueba",
    "horseId": "ID-REAL-DEL-CABALLO",
    "ownerUserIds": [],
    "stableOwnerUserIds": [],
    "publisherKeySha256": "HASH-SHA256-DE-LA-CREDENCIAL-DE-LA-RASPBERRY"
  }]
}
```

Los hashes deben tener 64 caracteres hexadecimales en minúsculas. Son dos
credenciales diferentes, aleatorias, de 32–256 caracteres URL-safe
(letras, números, guion y guion bajo). Crear y manejar sus valores por un canal
privado; no introducirlos en chat, commits o capturas.
La clave del dispositivo solo se guarda en la Pi; el receptor guarda su hash.
La credencial del proxy solo se guarda en Secrets de la app principal; el receptor
guarda su hash. No usar la service-role key de Supabase.

Los permisos contienen **UUID reales de Supabase Auth**, no nombres, correos,
identidades demo ni roles editables del navegador. Admin ve las cámaras configuradas;
los otros usuarios solo las cámaras concedidas explícitamente.
Sin concesiones ningún usuario verá la cámara. No modificar el login de clientes.

Configurar también la variable no secreta:

```text
HLS_TLS_TERMINATED_BY_PROXY=true
```

Esta opción autoriza explícitamente HTTP interno detrás del HTTPS de Replit.
No usar este arranque en una máquina expuesta directamente por HTTP.
`/` y `/health` devuelven únicamente estado del proceso, no estado privado de la cámara,
segmentos, IDs ni usuarios. No prueba por sí solo que la cámara esté conectada.

Publicar desde el segundo proyecto. Copiar su **URL de producción HTTPS**
desde Publishing; no utilizar una URL de preview `.replit.dev`.

## 3. Conectar Raspberry y app

En el archivo privado de la Pi, usar la URL del receptor como `receiverOrigin`,
el ID de cámara coincidente y la credencial del dispositivo en `publisherKey`.
Mantener el flujo principal sin cambios y verificar H.264/IDR antes de poner
`confirmedH264IndependentSegments: true`. Iniciar el agente antes de abrir vídeo.
Ver la guía completa HLS-PILOT.md del proyecto principal para el diagnóstico.

En el proyecto principal, configurar:

| Tipo | Nombre | Valor |
|---|---|---|
| Variable no secreta | HLS_RECEIVER_ORIGIN | Origen HTTPS del receptor, sin ruta ni credenciales |
| Secret | HLS_PROXY_KEY | Credencial del proxy cuyo hash guarda el receptor |

No cambiar el tipo de alojamiento, el comando de arranque ni `build:publish`
de la app principal. Si no se configuran estas variables, el piloto permanece
desactivado. Una configuración incompleta o inválida detiene el arranque, así que
validar primero en desarrollo y después cargar **ambas** para producción.
El proxy del servidor añade la credencial; nunca se entrega al navegador.
No acepta una cabecera equivalente suministrada por el visitante.

Primero verificar en `/hls-pilot` con una sesión real autorizada:
lista de cámaras, recepción continua, avance de fotogramas, denegación a otro
usuario y caída/reconexión de la Pi. La X y la pantalla completa de Timeline
pertenecen todavía a la demostración: este paquete no los conecta al directo.
Esa integración debe hacerse y comprobarse antes de anunciar vídeo real en Timeline.

Después preparar la app principal con su build de compatibilidad, y publicar
desde su Publishing. Solo la publicación de cada proyecto cambia producción.
Comprobar también en un móvil real; una prueba sintética no verifica la cámara
ni garantiza apertura ≤3 segundos.

## Límites y recuperación

- Ventana circular temporal, como máximo 16 MiB, 60 segundos y 90 segmentos por
  cámara (se aplica el primer límite alcanzado); no hay grabación permanente.
- Cada segmento como máximo 2 MiB y 2 segundos. Hora sincronizada en la Pi.
- Credencial del dispositivo: acceso de subida únicamente.
- Credencial de la app: no sustituye sesión de usuario ni autorización por cámara.
- Reiniciar el receptor borra vídeo y sesiones temporales; la Pi debe seguir
  publicando y el espectador reabrir vídeo. No prometer cero interrupciones.
- A 1 Mbps continuo: aproximadamente 332–362 GiB/mes de entrada con margen;
  cada espectador añade salida mientras mira, además del proxy de la app.
- Para desactivar: parar el agente y quitar las dos variables de la app antes
  de republicar; no quitar solo una. Revocar/rotar ambas credenciales si se filtran.
