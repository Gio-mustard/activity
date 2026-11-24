# Capa COMPARTIDA

> `src/lib/` — lo que necesitan las tres capas y no pertenece a ninguna.

Nada de aquí importa mongoose, socket.io ni React: por eso puede viajar al
navegador y al servidor sin arrastrar dependencias.

| Archivo | Contenido |
|---|---|
| `types.ts` | El contrato de datos. `LiveStateView` es lo que viaja por el cable en cada difusión. |
| `icons.tsx` | Diccionario de **28 avatares** y 34 glifos de interfaz. En Mongo solo se guarda la clave (`"terminal"`), nunca el SVG. |
| `teams.ts` | Paleta de equipos con contraste AAA garantizado (cada color declara su color de texto), nombres e iconos sugeridos. |
| `codes.ts` | Generación y normalización de códigos. El alfabeto excluye `O/0` y `I/1/L`: estos códigos se dictan en voz alta y se leen desde el fondo del salón. |
| `client.ts` | Solo navegador: llamadas a la API, identidad en `localStorage` y copiado al portapapeles. |

## Agregar un avatar

En `icons.tsx`, una entrada más en `AVATAR_ICONS` con sus formas sobre un
`viewBox` de 24×24. Queda disponible de inmediato en el selector del lobby y en
el editor de equipos; no hay que tocar la base de datos ni los tipos.
