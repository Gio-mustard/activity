# Capa MODEL

> `src/models/` — estructura de los datos y acceso a MongoDB Atlas.

## Qué hace

Define **qué es** cada cosa en el dominio y cómo se guarda. Es la única capa que
conoce mongoose. Nadie más en la aplicación importa `mongoose` directamente.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `db.ts` | Conexión única a Atlas, cacheada en `globalThis` para sobrevivir a la recarga en caliente de Next. Lee `MONGODB_URI` de forma perezosa. |
| `Activity.ts` | La **sala**: metadatos, códigos de acceso, banco de preguntas (subdocumentos) y el estado en vivo persistido. |
| `Team.ts` | Equipo: identidad visual, cupo, código de acceso directo y marcador. |
| `Participant.ts` | Persona dentro de un equipo: nombre, etiqueta, avatar y presencia. |
| `ScoreEvent.ts` | Bitácora inmutable de cada movimiento de puntaje. |
| `index.ts` | Punto único de entrada: el resto de la app importa desde `@/models`. |

## Decisiones de diseño

**Los tipos se declaran a mano, no se infieren del esquema.** Cada modelo expone
una interfaz (`ActivityAttrs`, `TeamAttrs`, ...) y su documento hidratado
(`ActivityDoc = HydratedDocument<ActivityAttrs>`). Así el contrato se lee de un
vistazo y los controladores no dependen de los genéricos internos de mongoose.

**Las preguntas son subdocumentos de `Activity`, los equipos no.** Una pregunta
nunca se edita en paralelo; un marcador sí. Tener `Team` en su propia colección
permite `$inc` atómicos mientras varios equipos puntúan al mismo tiempo.

**Solo se guardan claves de iconos y colores**, nunca SVG ni hex. `iconKey:
"terminal"` y `colorKey: "indigo"` se resuelven en `lib/icons.tsx` y
`lib/teams.ts`, de modo que rediseñar la app no obliga a migrar la base.

**El cronómetro no se persiste.** Guardar el tiempo restante cuatro veces por
segundo sería escribir sin ganancia. En Mongo solo queda la transición: qué
pregunta está activa y en qué fase. El conteo fino vive en memoria del servidor.

## Relación con las otras capas

```
controllers/  ──importa──>  models/  ──mongoose──>  MongoDB Atlas
views/        ──NUNCA──>    models/
```

Las vistas jamás reciben un documento de mongoose: los controladores lo traducen
antes con `controllers/presenters.ts`. Si un componente de React necesitara
importar algo de aquí, eso sería la señal de que la lógica está en el lugar
equivocado.
