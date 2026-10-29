# Golden Girl: integración de fotos privadas

## Alcance aprobado

- `horse_id`: `a264b293-2d23-497f-b47f-5f7e68a81ea9`.
- Backend ya configurado por el operador: `wasabi`.
- Metadatos: `public.images_wasabi`, filtro por caballo y orden `captured_at, id`.
- Bucket privado `equinewatch-photos`, región `us-east-1`.
- Endpoint `https://s3.us-east-1.wasabisys.com`.
- Prefijo exclusivo `stable-eye/97e3674b-31ab-5373-8a21-aa8187e6a17f/node_110/`.
- Reutilizar la autorización existente basada en sesión real, propietario actual
  de `horses.owner_id` y staff activo permitido. No añadir grants por UUID
  hardcodeado ni alterar el propietario.

El operador informa capturas cada 10 s y 18 entregas comprobadas sin errores.
Esa evidencia de subida no prueba acceso con las claves lectoras de Replit.

## Cambios preparados

El catálogo `services/wasabi-photos/handler.mjs` incorpora únicamente la nueva
asociación de fotos; los prefijos anteriores permanecen sin cambios. Se reutiliza
el mismo lector para galería de 20, refresco, selección histórica, búsqueda por
hora, timelapse y renovación de firmas al expirar o recuperar foco.

La incorporación inicial fue solo de fotos. Una solicitud posterior autoriza
preparar su directo separado `bacata-golden-girl`; consultar
`docs/golden-girl-live-handoff.md` para capacidad y coordinación.
La integración de fotos por sí sola no requiere modificar receptor, Raspberry,
Secret compartido HLS, tablas, RLS ni datos.

## Permiso mínimo si el lector actual no tiene acceso

Plantilla **aditiva**, no aplicada automáticamente:
`services/wasabi-photos/stable-eye-replit-golden-girl-readonly.json`.

Solo concede `s3:GetObject` sobre el prefijo node_110. No reemplaza las políticas
previas ni requiere cambiar claves o hacer público el bucket.

La política que el operador adjuntó a `stable-eye-bacata-lucero-pi` solo basta
si las claves lectoras de Replit corresponden a esa identidad. No se puede
deducir del nombre del Secret. Una consulta IAM GetUser firmada puede identificar
la identidad si tiene autorización; si se deniega, el operador debe comprobar
la asociación en la consola privada. No solicitar ni mostrar las access keys.

## Comprobaciones

```bash
node --test tests/wasabi-photos-server.test.mjs
node scripts/check-tessa-wasabi-read.mjs --golden
node scripts/test-wasabi-photos.mjs "https://DOMINIO-PREVIEW-VERIFICADO"
```

El comprobador de lectura realiza una consulta de metadatos anon limitada a una
fila y un GET real acotado del JPEG con el firmador de producción. No cambia
datos ni imprime la clave del objeto, Secret o URL firmada.

Una consulta anon sin filas no demuestra ausencia de fotos: puede ser RLS.
El GET acotado verifica acceso y cabecera JPEG, no demuestra por sí solo que
el navegador decodifique la foto completa ni que el usuario final esté autorizado.
Completar la comprobación con la sesión normal autorizada en preview.

Verificar:

- Última foto real de Golden Girl y llegada de nuevas capturas.
- Galería con hasta 20 fotos, sin fallback al buffer de Supabase.
- Renovación de URLs tras expiración o retorno de suspensión.
- Cambio rápido y respuestas tardías sin mostrar imágenes de otro caballo.
- Otro propietario y sesiones ausentes/inválidas no obtienen firmas.
- Fotos Supabase/Wasabi de los caballos anteriores y cuatro directos intactos.

Antes de publicar, ejecutar `npm run build:publish` y la prueba de continuidad
contra el dominio de producción verificado. Tras publicar la app principal,
repetir la comprobación con usuario real en ese dominio. Publicar la app es
independiente de preparar estos archivos; no republicar el receptor HLS.

## Resultado de la verificación de esta preparación

- Lectura real con las claves actuales: GET parcial 206, cabecera JPEG válida.
- JPEG completo cargado mediante una imagen nativa de Chromium móvil:
  decodificado correctamente, 704×576. No se guardó ni publicó la URL firmada.
- IAM GetUser devolvió 403: no fue posible confirmar el nombre del usuario
  lector. El acceso real a node_110 sí quedó probado; no se modificó IAM.
- Pasaron las pruebas de servidor, fixtures de actualización/renovación/cambio
  de Golden Girl, regresión de otros backends y cuatro cámaras HLS.
- Compilación de publicación y continuidad con los assets de producción correctas.
- Pendiente: pantalla autenticada del propietario real en preview y, después
  de publicar la app principal, comprobación autenticada en producción.
- Esta preparación no publicó, cambió datos ni hizo commit/push.
