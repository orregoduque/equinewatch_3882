# Live video de Encantador — Rancho

## Asociación preparada en la app principal

- Caballo: `0c8856e1-87eb-4abb-b145-28b070d34cf9`.
- Cámara esperada: `rancho-encantador`.
- Receptor existente: `https://hls-receiverzip.replit.app`.
- No cambiar el identificador `bacata-mock` de Lucero/Destiny.

La asociación reside en el servidor. El botón y el reproductor HLS existentes
la utilizan sin crear un reproductor ni credenciales nuevos.

## Autorización

La app envía la sesión real al receptor y exige que su descubrimiento autorizado
devuelva exactamente este caballo y esta cámara antes de solicitar la sesión de
vídeo. Una asociación local no concede permisos: el receptor debe validar el
usuario real y sus permisos para Encantador, igual que para los otros caballos.
Un `cameraId` proporcionado por el navegador no sustituye esta comprobación.
Sin autorización no debe devolverse URL reproducible ni cookie de vídeo.

No se modifican usuarios, propietarios, claves ni políticas desde esta app.
No copiar permisos de otras cámaras. En el receptor, conservar todas las
cámaras, hashes y autorizaciones anteriores al agregar la asociación.

## Orden de puesta en marcha

1. Preparar y comprobar esta asociación en la app principal.
2. El usuario publica la app principal; registrar esa publicación por separado.
3. El operador confirma que el receptor publicó el registro y los permisos
   correctos de Encantador, conservando los anteriores.
4. Arrancar el publicador de Rancho únicamente tras esa confirmación.
5. Abrir Live video con la sesión real del propietario y verificar movimiento,
   no solo un HTTP 200. Comprobar también una sesión sin permiso.
6. Medir clic hasta fotogramas avanzando y retraso respecto a la realidad por
   separado; verificar Chrome y Safari/iPhone con dispositivos reales.
7. Cerrar o cambiar de caballo y comprobar que el reproductor anterior se
   destruye. Verificar que Lucero continúa usando `bacata-mock`.

Mientras el receptor no autorice/publique el flujo o el publicador no esté
activo, mostrar el estado pendiente/error existente, nunca otro caballo ni un
mockup.

## Fotos independientes

Conservar sin cambios la lectura de `images_wasabi`, historial, galería de
20 fotos, búsqueda por hora, timelapse por hora y captura cada 10 segundos.
La asociación de vídeo no cambia el backend, prefijo ni catálogo de fotos.

## Límite de las pruebas

Las pruebas automatizadas verifican la asociación exacta y el rechazo sin
sesión, sin permiso o con cámara incorrecta. No demuestran que el registro esté
publicado en el receptor, que Rancho esté transmitiendo ni que el propietario
real ya pueda reproducir. Eso requiere los pasos operativos anteriores.
