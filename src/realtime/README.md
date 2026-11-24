# Capa REALTIME

> `src/realtime/` — el transporte en vivo. Un adaptador, no una capa de negocio.

## Qué hace

Traduce eventos de socket.io a llamadas del controlador y difunde el estado que
resulta. Nada más. Si aquí apareciera una decisión de puntaje, estaría en el
lugar equivocado.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `events.ts` | **El contrato.** Único archivo que conocen a la vez el servidor y el navegador. Si un evento no está aquí, TypeScript lo rechaza en ambos lados. |
| `socketServer.ts` | Servidor: valida quién eres, ejecuta el comando y difunde. |
| `useLiveRoom.ts` | Cliente React: conecta, guarda el último estado e interpola el cronómetro. |

## Por qué hay un servidor propio

Next por sí solo no sostiene conexiones WebSocket: sus route handlers son
peticiones efímeras. Por eso `server.ts` (en la raíz) monta Next dentro de un
servidor `http` de Node y cuelga socket.io del mismo puerto, en `/api/realtime`.
Es también lo que hace que la app funcione tal cual en Render.

## Salas y audiencias

Cada participante entra a dos o tres salas internas de socket.io:

```
room:<code>            todos          -> reciben el tick del cronómetro
admin:<code>           docente        -> estado con respuesta correcta y códigos
screen:<code>          proyector      -> estado público
team:<code>:<teamId>   un equipo      -> estado público + lo que respondió SU equipo
```

En cada transición se emite un estado por audiencia. Con ocho equipos son nueve
emisiones: barato, y evita filtrar la respuesta correcta.

## El cronómetro

El servidor manda un `tick` cinco veces por segundo. El navegador **interpola**
entre ticks con un intervalo local de 100 ms, así el conteo se ve fluido sin
inundar la red. La verdad siempre es la del servidor: cada `tick` corrige la
estimación local.

## Relación con las otras capas

```
views/ ──useLiveRoom──> events.ts <──socketServer── controllers/liveController
                                          │
                                          └── setLiveHooks({ onState, onTick })
```

`liveController` no conoce socket.io: registra hooks y esta capa los implementa.
La dependencia va en un solo sentido, y por eso el motor se puede probar sin red.
