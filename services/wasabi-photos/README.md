# Fotos privadas de Lucero y Thunder

La Raspberry, sus servicios de fotos y vídeo, el bucket privado, Versioning y
Object Lock no se cambian. No se implementan escrituras, borrados, lifecycle ni
migración de fotografías. Los demás caballos conservan `images` y Supabase Storage.

## Antes de conectar

1. En Wasabi, crear una identidad IAM **nueva y distinta de la Raspberry**.
   Adjuntar únicamente `iam-replit-two-horses-readonly.json` de este directorio.
   No adjuntar otras políticas que amplíen sus permisos. El JSON concede solo
   `s3:GetObject` para los dos prefijos; no concede listado, subida ni borrado.
   La app no puede crear esta identidad sin acceso administrativo a Wasabi.
2. Guardar por el formulario seguro de Replit Secrets:
   `WASABI_ACCESS_KEY_ID`, `WASABI_SECRET_ACCESS_KEY`.
   No pegarlas en el chat ni en archivos. Nunca usar nombres `VITE_*` para ellas.
3. Configuración no secreta del servidor:
   `WASABI_REGION=us-east-1`,
   `WASABI_ENDPOINT=https://s3.us-east-1.wasabisys.com`,
   `WASABI_BUCKET=equinewatch-photos`.
   Estos son los únicos valores aceptados y los predeterminados si se omiten.
   Se usan la URL y clave pública Supabase **ya existentes** en `VITE_SUPABASE_*`;
   no hay service_role. Los secretos solo son leídos por el backend.
4. Iniciar sesión en la app con una cuenta **real de Supabase Auth**.
   Una cuenta demo / `stableEyeUser` por sí sola no basta. No se cambian
   contraseñas, login, políticas ni asignaciones de clientes.

La política mencionada en el brief no venía como archivo separado: el JSON
incluido se ha preparado a partir del recurso/prefijo y los permisos indicados.

## Autorización y contrato

`GET /api/horses/:horseId/photos` requiere `Authorization: Bearer <sesión real>`.
El backend valida con `auth.getUser(token)` y hace lecturas con ese JWT y RLS.
Además exige que `horses.owner_id` sea el UID verificado, o que el propio perfil
de ese UID sea un `admin` / `caretaker` activo en `user_profiles`.
No utiliza roles del navegador ni `user_metadata`. Una fila visible de
`images_wasabi` no basta para autorizar, aunque exista SELECT anon.

La credencial queda restringida a los prefijos de Lucero (108) y Thunder (109).
El backend vincula cada caballo exclusivamente con su propio prefijo.
Para ampliar la política original de Lucero, seguir `pilot/TWO-CAMERAS.md`:
no rotar claves ni cambiar la credencial de la Raspberry para añadir Thunder.
El servidor obtiene cada key de la base, valida **todas** las filas y firma
localmente GET por diez minutos. No descarga JPEGs ni hace HEAD a Wasabi.
Respuestas: `Cache-Control: private, no-store`, `Vary: Authorization`.
401/403 nunca incluyen fotografías o firmas. Un fallo de configuración afecta
solo a esta API y no al arranque, las demás fotos ni el proxy HLS.

Opciones:
- `limit=1..240`: últimas capturas; orden `captured_at DESC, id DESC`.
- `cursor`: paginación keyset, ligada al caballo y al intervalo.
- `since=<ISO UTC>`: incremental por captura, no por subida.
- `from=<ISO UTC>&to=<ISO UTC>&limit=400`: hora local convertida a UTC;
  orden ascendente, intervalo semiabierto. Máximo tres horas transcurridas
  para permitir transiciones de horario; no permite descargar un día completo.
- `metadata=1`: consulta acotada sin firmar de nuevo URLs conocidas.
- `ids=...`: hasta cien IDs de metadatos para firmar o renovar; el servidor
  vuelve a comprobar acceso y obtiene sus keys de la base. No acepta rutas,
  bucket, endpoint ni roles enviados por el cliente.

La UI consulta metadatos y firma solo fotos nuevas o próximas a caducar.
Guarda temporalmente hasta mil URLs en memoria, nunca en columnas/localStorage.
Se descartan al cambiar la sesión; las consultas se cancelan al cambiar de
caballo. La revisión por hora y las fotos fijadas renuevan acceso sin cambiar
la selección. La pestaña oculta pausa las actualizaciones; al regresar se
renueva si hace falta. No se renuevan las 240 firmas en cada polling.

Wasabi usa inicialmente el JPEG original también como miniatura, diferida;
no se llama al transformador de Supabase ni se añade resize/cache-busting.
Las imágenes se descargan por GET directamente desde Wasabi. La CSP existente
permite `img-src https:`; no se modifica. No hay canvas/fetch de píxeles ni
necesidad de habilitar CORS para este `<img>`.

Las firmas son capacidades temporales: una URL copiada puede utilizarse durante
su vigencia, incluso tras cerrar sesión. No es posible revocarla desde el
navegador antes de los diez minutos. No compartir ni registrar estas URLs.

## Verificación pendiente con el entorno real

Las pruebas sintéticas no sustituyen estas comprobaciones:
1. Con un propietario real autorizado, confirmar un **GET de JPEG con HTTP 200**
   desde el navegador y la captura siguiente sin recargar (cada diez segundos).
2. Sin sesión y con otro usuario real sin permiso, 401/403 sin firmas.
3. Esperar más de diez minutos / suspender y reabrir: renovar y mantener la foto.
4. Cambiar de caballo y cerrar sesión: no quedan fotos del usuario anterior.
5. Otros caballos mantienen Supabase; el Live video de Lucero sigue funcionando
   con sus permisos HLS existentes (no se amplían en esta integración).
6. Comprobar que las credenciales **no** están en el bundle o respuestas.
   Las URLs firmadas sí contienen el identificador de acceso en
   `X-Amz-Credential`, como requiere SigV4; nunca la clave secreta.
7. Preparar `npm run build:publish` y probar continuidad antes de publicar.
   Publicar solo con autorización; repetir estas comprobaciones tras publicar.

Pruebas locales:
`node --test tests/*.test.mjs`
`node scripts/test-wasabi-photos.mjs https://DOMINIO-DE-PREVIEW`
`node scripts/test-hourly-timeline.mjs https://DOMINIO-DE-PREVIEW`

`test-wasabi-photos` usa cuentas, URLs y respuestas sintéticas. No demuestra una
descarga del bucket real ni acceso real de un cliente.
