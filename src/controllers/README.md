# Capa CONTROLLER

> `src/controllers/` — toda la lógica de negocio de la dinámica.

## Qué hace

Decide. Cuántos puntos vale una respuesta, quién pulsó primero, si un equipo
queda bloqueado, cuándo se revela la pregunta. Si en algún otro lugar del
proyecto aparece un `if` sobre puntajes o turnos, está mal ubicado.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `rules.ts` | **Reglas puras.** Sin mongoose, sin sockets, sin React: entradas y salidas. Es lo que cubre `npm test`. |
| `presenters.ts` | Aduana Model → View. Traduce documentos a los tipos de `lib/types.ts` y decide qué ve cada audiencia. |
| `activityController.ts` | Caso de uso del docente antes de clase: crear la sala, equipos y banco de preguntas. |
| `participantController.ts` | Caso de uso del alumno: entrar por código general o de equipo, reconectar, ser movido o expulsado. |
| `scoreController.ts` | Todo movimiento de puntaje y su bitácora. Construye el podio. |
| `liveController.ts` | **El motor.** Estado en memoria de cada sala activa: cronómetro, cola de pulsaciones, bloqueos y fases. |
| `http.ts` | Utilidades para los route handlers: respuestas uniformes y validación del código de administrador. |

## El motor en vivo

`liveController.ts` guarda en un `Map` el estado de cada sala abierta. Cada sala
tiene un `setInterval` de 200 ms que descuenta el cronómetro activo y avisa a
quien esté escuchando.

Las fases de una pregunta:

```
idle ──(arrancar)──> running ──(alguien pulsa)──> floor
                        │                           │
                        │                    veredicto correcto
                        │                           ▼
                        └──(se acaba el tiempo)──> revealed ──(siguiente)──> idle
```

Desde `floor`, un veredicto **incorrecto** o **ceder turno** devuelve la palabra
al siguiente de la cola; si la cola quedó vacía, vuelve a `running` con el tiempo
que sobraba.

### Dos reglas que conviene tener presentes

**El orden lo marca el reloj del servidor, nunca el del teléfono.** Los relojes
de los dispositivos no están sincronizados y no sirven para desempatar
milisegundos.

**Se puede pulsar mientras otro equipo responde.** Esa pulsación no roba la
palabra: forma la cola de rebote, que es justo lo que hace útil el botón
"Incorrecto" del docente.

## Relación con las otras capas

```
app/api/*  ──llama──>  controllers/  ──llama──>  models/
realtime/  ──llama──>  controllers/
                            │
                            └──avisa por hooks──>  realtime/  ──emite──>  views/
```

`liveController` **no importa socket.io**. Expone `setLiveHooks({ onState, onTick })`
y la capa realtime se registra ahí. Gracias a eso el motor completo se puede
probar sin levantar un solo WebSocket, que es exactamente lo que hace
`test/live.test.ts`.
