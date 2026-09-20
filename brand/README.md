# Guía de marca · ¿Qué suena?

Identidad «C · Colores». Una marca que suena a juego: redondeada, de colores y sin solemnidad.

> Los logotipos del pie de la web (Desarrollo Creativo y ccordoba) son de otras marcas y no forman parte de la identidad de ¿Qué suena?.

## Nombre

- En texto: **¿Qué suena?** (con los dos signos, `quesuena.es` como dirección).
- En el logotipo: **¿qué suena?** en minúsculas.

## Símbolo

Cinco arcos, uno por categoría, alrededor de un punto: un círculo que se abre en colores, como el anillo que dibuja la app cuando algo suena. El punto central es siempre tinta (o blanco sobre fondo oscuro).

## Colores

| Nombre | Hex | Uso |
| --- | --- | --- |
| Tinta | `#131A2B` | Texto, punto central, fondo oscuro |
| Papel | `#F7F8FB` | Fondo claro |
| Granja (ámbar) | `#F2A93B` | Arco / categoría |
| Salvajes (bermellón) | `#E8553D` | Arco / categoría |
| Aves (índigo) | `#5A5BD9` | Arco / categoría |
| Mar (cian) | `#1FA6D6` | Arco / categoría |
| Insectos (verde) | `#45B36B` | Arco / categoría |

Los cinco colores son de gráfico, no de texto: no los uses para escribir sobre Papel (contraste insuficiente). Cada colección nueva puede sumar sus propios tonos en `src/content/collections.json`, pero el símbolo mantiene estos cinco.

## Tipografía

- **DynaPuff 600**: logotipo, títulos y el nombre del animal.
- **Figtree 400/600**: todo el texto.

Ambas son SIL Open Font License, están instaladas con Fontsource (`@fontsource-variable/…`) y se sirven desde el propio sitio.

## Archivos

| Fichero | Para qué |
| --- | --- |
| `logo-color.svg` | Logotipo horizontal sobre fondo claro |
| `logo-dark.svg` | Logotipo sobre fondo oscuro (texto y punto blancos) |
| `logo-mono.svg` | Una sola tinta (arcos y texto en tinta): sellos, impresión en blanco y negro |
| `symbol.svg` · `symbol-dark.svg` | Solo el símbolo |
| `icon.svg` | Icono de aplicación / favicon (cuadrado redondeado, fondo tinta) |
| `icon-maskable.svg` | Icono a sangre para Android y iOS (zona segura incluida) |
| `og.svg` | Imagen para compartir en redes |
| `png/` | Exportaciones: logotipos a 2400 px, símbolo a 1024 px, iconos 16-1024 px y `og-1200x630.png` |

El texto de todos los SVG está **convertido a curvas**: se ven igual en cualquier programa (Canva, Figma, Illustrator) sin instalar fuentes. Los ficheros de `public/` (favicon, iconos, `og.png`) son copias de estos.

## Uso

- **Espacio libre**: deja alrededor del logotipo, como mínimo, la altura del punto central.
- **Tamaño mínimo**: logotipo 120 px de ancho; símbolo 24 px.
- Sobre fondos de color, usa `logo-dark.svg` o `logo-mono.svg` según el contraste.
- No cambies los colores de los arcos, no los reordenes, no estires el logotipo y no sustituyas la tipografía.

## Voz

Cercana, breve y en «tú». Frases cortas, sentence case, sin exclamaciones. Ejemplos ya en la app: «Toca el círculo para oír algo al azar», «Toca Revelar cuando lo sepas», «¡Los has oído todos!». Una acción se llama igual en todo el flujo (siempre «Revelar», nunca «Mostrar» o «Ver»).

Frase de marca: **Un sonido al azar. ¿Sabes qué es?**
