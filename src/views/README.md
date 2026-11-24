# Capa VIEW

> `src/views/` — todo lo que se pinta en pantalla.

## Qué hace

Muestra el estado y manda intenciones. No calcula puntajes, no decide turnos, no
habla con Mongo. Cuando el usuario pulsa un botón, la vista emite un evento y
espera a que el servidor le devuelva el estado nuevo.

## Estructura

| Carpeta | Contenido |
|---|---|
| `components/` | Kit reutilizable: `ui.tsx` (botones, tarjetas, pills, campos), `Countdown`, `Scoreboard`, `TeamCard`, `QuestionForm`, `IconPicker`, `QrPoster`, `AdminGate`, `brand`, `adminNav`. |
| `screens/` | Una composición por pantalla, enlazada desde `app/`. |

## Las cinco pantallas

| Pantalla | Ruta | Quién la ve |
|---|---|---|
| `HomeScreen` | `/` | Cualquiera: entrar con código o crear actividad. |
| `NewActivityScreen` | `/admin/nueva` | Docente, una sola vez. |
| `ConfigScreen` | `/admin/[code]/configuracion` | Docente, antes de clase. |
| `ConsoleScreen` | `/admin/[code]/consola` | Docente, durante la dinámica. **La única con poder de decisión.** |
| `PodiumScreen` | `/admin/[code]/podio` | Docente, al cerrar. |
| `ScreenView` | `/pantalla/[code]` | El proyector del salón. Solo lectura. |
| `LobbyScreen` | `/unirse/[code]` | Alumno, al entrar. |
| `BuzzerScreen` | `/jugar/[code]` | Alumno, durante la dinámica. |

## Reglas de diseño

Los tokens salen del front-matter de `DESIGN.md` y viven en `app/globals.css`
dentro de `@theme`. El estilo es **flat de verdad**: bordes sólidos de 1.5–2 px,
sombras duras sin desenfoque, cero gradientes, pills a radio completo.

**Mobile first.** Cada pantalla se diseña primero para el teléfono del alumno y
después se ensancha. El pulsador ocupa la pantalla completa en móvil; en
escritorio el mismo botón responde a `Enter` y `Espacio`, y la interfaz lo dice,
porque con el mouse se pierden décimas contra un pulgar.

**Cada audiencia recibe su propio estado.** La respuesta correcta solo cruza
hacia la vista cuando quien pregunta es el administrador o cuando la pregunta ya
se reveló. El proyector nunca la recibe antes de tiempo.

## Relación con las otras capas

```
views/ ──useLiveRoom()──> realtime/ ──WebSocket──> servidor
views/ ──fetch()───────> app/api/  ──> controllers/ ──> models/
```

Las vistas importan **tipos** de `lib/types.ts` y funciones de formato de
`controllers/rules.ts` (`formatClock`, `placeLabel`, `rankTeams`), para que el
marcador del proyector y el del docente ordenen idéntico. Nunca importan
`models/`.
