# Capa de RUTEO

> `src/app/` — App Router de Next. Adaptadores delgados, no lógica.

## Qué hace

Dos cosas, ninguna de negocio:

1. **Páginas** (`page.tsx`): resuelven los parámetros de la URL y montan la
   pantalla correspondiente de `views/screens/`. Suelen tener cinco líneas.
2. **Route handlers** (`api/*/route.ts`): parsean la petición, llaman a un
   controlador y serializan el resultado.

## Rutas de página

| Ruta | Pantalla |
|---|---|
| `/` | Inicio: entrar con código o crear actividad |
| `/admin/nueva` | Crear la sala |
| `/admin/[code]/configuracion` | Equipos y banco de preguntas |
| `/admin/[code]/consola` | Consola en vivo del docente |
| `/admin/[code]/podio` | Resultados y bitácora |
| `/pantalla/[code]` | Proyector del salón (solo lectura) |
| `/unirse/[code]` | Identificarse y elegir equipo |
| `/jugar/[code]` | Pulsador del participante |

## API

| Método y ruta | Para qué |
|---|---|
| `POST /api/activities` | Crear sala; devuelve código de sala y de administrador |
| `POST /api/admin/resolve` | Volver a una sala desde el inicio con el código de administrador (o el de sala) |
| `GET · PATCH · DELETE /api/activities/[code]` | Leer, editar o borrar la actividad |
| `POST /api/activities/[code]/questions` | Agregar pregunta |
| `PATCH · DELETE · POST /api/activities/[code]/questions/[id]` | Editar, borrar, reordenar |
| `PATCH /api/activities/[code]/teams/[id]` | Editar un equipo |
| `POST /api/activities/[code]/reset` | Poner puntajes a cero |
| `GET /api/lobby/[code]` | Datos públicos de ingreso (acepta código de sala o de equipo) |
| `POST /api/join` | Alta del participante |
| `GET /api/identity/[id]` | Revalidar la identidad guardada en el navegador |
| `GET /api/podium/[code]` | Podio y bitácora |
| `GET /api/health` | Diagnóstico de la conexión a Mongo |

## Autenticación

No hay cuentas. Las rutas de administración exigen la cabecera `x-admin-code`,
que se compara contra `activity.adminCode`. El navegador del docente guarda ese
código en `localStorage` y `views/components/AdminGate.tsx` lo pide la primera
vez en cada dispositivo.

`POST /api/admin/resolve` es el atajo desde la pantalla de inicio: acepta el
código de administrador o el de la sala. Es POST y no GET a propósito, para que
el código de administrador no acabe en la URL, el historial ni los logs. Solo
devuelve ese código cuando fue justamente el que se tecleó.

Las mutaciones en vivo (veredictos, cronómetro, puntajes) **no pasan por HTTP**:
viajan por WebSocket, donde el rol se validó una sola vez al entrar a la sala.

## Relación con las otras capas

```
app/page.tsx      ──monta──>   views/screens/
app/api/route.ts  ──llama──>   controllers/  ──>  models/
```

Después de cada mutación HTTP que afecte una sala abierta, el handler llama a
`notifyActivityChanged(code)` para que el motor relea y difunda: así, editar una
pregunta desde Configuración se ve al instante en el proyector.
