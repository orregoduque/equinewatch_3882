# Mejora conservadora de fotos nocturnas

Función Python/OpenCV reutilizable, independiente de la interfaz de la app.
No llama a servicios externos ni utiliza IA generativa.

## Uso

```python
import cv2
from image_processing.night_photo import enhance_night_photo

original = cv2.imread("foto_nocturna.jpg")
mejorada = enhance_night_photo(original, gamma=1.8, scale=2)
cv2.imwrite("foto_nocturna_mejorada.png", mejorada)
```

Desde la raíz del proyecto:

```sh
python3 -m image_processing.night_photo foto.jpg salida.png --gamma 1.8 --scale 2
python3 -m unittest discover -s tests -v
```

La herramienta exige una salida PNG nueva y no sobrescribe el original.
Las dependencias están declaradas en `pyproject.toml` y fijadas en `uv.lock`.

## Pipeline

1. Conversión BGR → escala de grises (o copia de una entrada ya gris).
2. `fastNlMeansDenoising`: h=5, ventana de plantilla 7, búsqueda 21.
3. CLAHE: clipLimit=2.0, tileGridSize=(8, 8).
4. Gamma por tabla LUT: `salida = 255 × (entrada / 255)^(1/gamma)`.
   Valor predeterminado 1.8; rango permitido 1.6–2.0. El exponente inverso
   aclara las sombras en vez de oscurecerlas.
5. Unsharp mask suave: Gaussian sigma=1.0 y cantidad 0.25.
6. Ampliación uniforme con `INTER_LANCZOS4`: 2× por defecto, 4× opcional.
   El «4» de INTER_LANCZOS4 describe el kernel, no el factor de ampliación.

La entrada debe ser uint8, gris o BGR de tres canales. La salida es uint8
gris y tiene exactamente ancho×escala y alto×escala.

## Conservación y límites

No se recorta, gira, deforma, rellena ni sintetiza la imagen. La ampliación
mantiene las proporciones y el encuadre. La función no modifica el array
original.

No obstante, los filtros cambian los píxeles: el denoise puede suavizar
detalles muy débiles, el enfoque y Lanczos pueden producir halos, y la
ampliación no recupera información perdida. No se puede garantizar una
conservación pixel a pixel ni afirmar que aparezcan detalles reales nuevos.
Para revisión de postura, comparar siempre con el original.

Esta función todavía no se ejecuta al mostrar fotos en Timeline. Una futura
integración debería procesar cada archivo una sola vez, conservar el original
y reutilizar la versión procesada; no repetir el cálculo en cada reproducción.
No debe apilarse con el filtro CSS de brillo que tiene actualmente la app.