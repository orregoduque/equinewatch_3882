# Integración sin migrar instalaciones existentes

## Fuentes revisadas

- Webapp `orregoduque/equinewatch_3882`, commit base `c4ba52b`, obtenido del push informado por el operador el 18/11/2026.
- HLS `orregoduque/hls-receiverzip`, commit base `65223ce`.
- Esquema del Supabase actual: `public.horses.id/name/is_active` y `public.user_profiles.id/email/full_name/is_active`. Solo inspección de metadatos.

No asumir que una copia anterior de octubre es la versión publicada. Si cambia el commit base, repetir la comparación antes de integrar. Las ramas de esta entrega se llaman `codex/complementary-control-v1` y no deben fusionarse o publicarse automáticamente.

## Contrato de compatibilidad

1. Mantener los manejadores actuales de fotos y HLS como autoridad de las cámaras existentes.
2. El módulo `integrations/complementary-access.mjs` no hace nada al importarse. En modo `off` devuelve exactamente el resultado anterior y no consulta el registro central.
3. `shadow` puede comparar una propuesta sin aplicarla. Si el servicio complementario falla, el resultado anterior se conserva. No usar el panel de prueba como una fuente de permisos reales.
4. La migración futura requiere otra entrega revisada con asignación explícita de autoridad por recurso. Para recursos migrados, una caída del registro no debe conceder acceso ni volver a una lista antigua que reintroduzca permisos retirados.
5. No cambiar límites, publicadores, codecs, resolución, intervalos, colas, cookies, proxy ni buffers de HLS. El receptor revisado conserva su límite de siete cámaras; un alta en el registro no incrementa su capacidad.
6. El nuevo módulo no se importa en el arranque, las rutas ni el build de la webapp o el receptor en esta entrega. Se distribuye separado para revisar y probar. Tampoco se cambian scripts, lockfiles o `.replit` existentes.

## Importación futura

`tools/legacy-plan.mjs` prepara un inventario de accesos LIVE a partir de un JSON privado proporcionado por el operador. No se ejecutó contra el Secret actual y no escribe el receptor. No cambia claves ni hashes. Su salida no contiene credenciales.

Los usuarios de `ownerUserIds`, `stableOwnerUserIds` y administradores HLS se traducen únicamente a una propuesta de permiso LIVE por caballo. **No se infiere permiso de fotos ni permiso para administrar este panel.** Estos deben verificarse con sus fuentes existentes, sus roles y las políticas de Supabase. No completar huecos usando nombres ni `user_metadata`.

El historial debe mantener la asociación vigente al capturar cada fotografía. Un cambio de box exige cerrar la asociación anterior, conservar pendientes con su horse_id original y verificar la nueva; esta entrega no ofrece activación de ese cambio.

## Secuencia siguiente

1. Revisar esta entrega local.
2. Preparar una base aislada de staging y su autenticación, sin abrir accesos de producción. Una branch/proyecto nuevo puede tener coste y debe aprobarse antes de crearlo.
3. Instalar el esquema privado allí, ejecutar advisors y probar usuarios reales de prueba con y sin permiso.
4. Probar un nuevo caballo/cámara de ensayo en receptores y agentes de staging, conservando las instalaciones actuales.
5. Implementar administración de credenciales de dispositivo y aprovisionamiento de Wasabi con una identidad separada; ninguna clave IAM administrativa debe llegar a una Raspberry.
6. Después de aceptación, planificar migración por cámara, comparación exacta de accesos, ventana operativa y reversión. No ejecutar en esta entrega.

## Reversión de esta entrega

El panel local se detiene con `Stop-Demo.ps1`; conserva su base ficticia. Las ramas se descartan o se cierran los PR sin tocar `main`. No existe una migración SQL aplicada en producción que revertir, ni credenciales emitidas/revocadas, ni servicios de cámaras instalados.
