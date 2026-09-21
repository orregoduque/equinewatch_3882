# Encuesta Stable Eye

La encuesta pública está implementada en `src/pages/survey/index.tsx` y se publica en `/encuesta`.

Las respuestas se validan en `server.mjs` y se envían mediante la conexión segura de Resend a `founder@stable-eye.co`. Ninguna credencial ni respuesta se guarda en este directorio.

Para usar un remitente del dominio propio después de verificarlo en Resend, configura:

```text
MAIL_FROM=Stable Eye <encuestas@stableeye.co>
```

Si `MAIL_FROM` no está configurado, el servidor utiliza el remitente de pruebas de Resend.