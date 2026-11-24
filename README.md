# Amai Activity

Dinámica gamificada por equipos **en tiempo real** para la materia de
Fundamentos de Ingeniería de Software.

N equipos de N integrantes compiten respondiendo preguntas. El docente conduce
desde su consola, el salón ve la pregunta en el proyector y cada alumno tiene en
su teléfono un único botón enorme para pedir la palabra. Gana el equipo con más
puntos.

---

## Puesta en marcha

```bash
npm install
```

Copia las variables de entorno y pega tu cadena de conexión de MongoDB Atlas:

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

La app queda en <http://localhost:3000>. Para comprobar que Atlas responde:

```bash
curl -s http://localhost:3000/api/health
```

### Sin Atlas a la mano

Hay una MongoDB efímera para desarrollo. En una terminal:

```bash
npm run mongo:dev
```

Pon `MONGODB_URI="mongodb://127.0.0.1:27777/"` en tu `.env.local` y arranca la
app en otra terminal. Los datos se pierden al cerrar el proceso.

---

## Cómo se usa en clase

1. **Crear.** El docente entra a `/admin/nueva`, pone título y cuántos equipos.
   La app devuelve dos códigos: el de la **sala** (se proyecta) y el de
   **administrador** (no se enseña a nadie).
2. **Configurar.** En *Configuración de Actividad* edita equipos (nombre,
   color, icono, cupo) y arma el banco de preguntas.
3. **Compartir.** Enlace general, código de sala o QR gigante. Cada equipo tiene
   además su propio código de acceso directo: quien entra con él cae en ese
   equipo sin elegir.
4. **Identificarse.** El alumno pone nombre, etiqueta opcional y avatar.
5. **Proyectar.** El docente abre `/pantalla/<código>` en la salida HDMI.
6. **Conducir.** Desde *Consola en Vivo*: iniciar, arrancar el cronómetro, dar
   veredictos, sumar tiempo de rebote, avanzar.
7. **Cerrar.** *Podio y Resultados* muestra el ranking, el desglose por equipo y
   la bitácora de cada punto otorgado.

### Reglas de la ronda

- Cualquier integrante pulsa y **toma el turno para todo su equipo**.
- Mientras un equipo responde, los demás pueden pulsar para **formarse en la
  cola de rebote**.
- Si falla: pierde los puntos de penalización, queda **bloqueado** para esa
  pregunta y la palabra pasa al siguiente de la cola. Ese bloqueo es
  configurable pregunta por pregunta.
- *Ceder turno* pasa la palabra sin penalización.
- El cronómetro principal **se pausa** mientras un equipo tiene la palabra.
- Si nadie pulsa y se acaba el tiempo, se revela la respuesta. El docente puede
  sumar segundos antes de que eso pase.
- Las preguntas de **opción múltiple** y **verdadero/falso** no usan pulsador:
  cada equipo responde desde su teléfono y se califican solas.

---

## Arquitectura

MVC sobre Next.js. Cada capa tiene su propio README con el detalle:

| Capa | Carpeta | Responsabilidad | Doc |
|---|---|---|---|
| **Model** | `src/models/` | Esquemas de mongoose y conexión a Atlas | [README](src/models/README.md) |
| **Controller** | `src/controllers/` | Toda la lógica de negocio | [README](src/controllers/README.md) |
| **View** | `src/views/` | Componentes y pantallas de React | [README](src/views/README.md) |
| *Adaptadores* | `src/app/` | Rutas y API de Next | [README](src/app/README.md) |
| *Adaptadores* | `src/realtime/` | WebSockets | [README](src/realtime/README.md) |
| *Compartido* | `src/lib/` | Tipos, iconos, paleta y códigos | [README](src/lib/README.md) |

La idea que sostiene todo: **el mismo controlador atiende a HTTP y a WebSocket**.
`app/api/*` y `realtime/socketServer.ts` son dos puertas distintas al mismo
`controllers/`, y ninguna de las dos decide nada por su cuenta.

```
  Navegador
     │
     ├── fetch ──────────> app/api/*.ts ──┐
     │                                    ├──> controllers/ ──> models/ ──> Atlas
     └── WebSocket ──> realtime/socket ───┘           │
                            ▲                         │
                            └──── hooks onState ──────┘
```

### Por qué un servidor propio

Next no sostiene conexiones WebSocket: sus route handlers son peticiones
efímeras. `server.ts` monta Next dentro de un servidor `http` de Node y cuelga
socket.io del mismo puerto. El mismo archivo arranca en local y en Render.

---

## Pruebas

```bash
npm test
```

- `test/rules.test.ts` — 25 pruebas de las reglas puras: puntajes, bloqueos,
  orden de la cola, desempates del podio, validación de preguntas.
- `test/live.test.ts` — 15 pruebas de integración del motor contra una MongoDB
  real en memoria: ronda completa de iniciar, pulsar, encolar rebote, fallar,
  ceder, acertar y calificar una pregunta cerrada.

Otros comandos:

```bash
npm run typecheck
```

```bash
npm run build
```

---

## Despliegue en Render

La app vive en la subcarpeta `appExposicion/` del repositorio, así que en
Render se crea el servicio **a mano** (`New > Web Service`) con estos valores:

| Campo | Valor |
|---|---|
| Root Directory | `appExposicion` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

Variables de entorno, **antes del primer deploy**:

| Variable | Valor |
|---|---|
| `MONGODB_URI` | tu cadena de Atlas |
| `MONGODB_DB` | `amai_activity` |
| `MONGOMS_DISABLE_POSTINSTALL` | `1` |

`NODE_ENV` y `PORT` los pone Render solo. **No definas `PORT` a mano**: si la
pisas, el router de Render busca la app en un puerto donde no está escuchando.

El health check pega a `/api/health`, que responde 503 si falta `MONGODB_URI`.
Es a propósito: si te falta la variable, el deploy falla de inmediato en vez de
quedar arriba con la base caída.

En MongoDB Atlas, en *Network Access*, permite `0.0.0.0/0`: Render no da IP fija
en el plan gratuito.

> **El plan gratuito duerme el servicio tras ~15 minutos sin tráfico.** Al
> despertar tarda cerca de un minuto y tira los WebSockets abiertos. Antes de
> la clase, abre la app unos minutos antes para que esté despierta, o usa un
> plan de pago ese día.

`render.yaml` queda como documentación: Render solo lo lee como Blueprint si
está en la raíz del repositorio, no en una subcarpeta.

---

## Variables de entorno

| Variable | Para qué |
|---|---|
| `MONGODB_URI` | Cadena de conexión de Atlas. **Obligatoria.** |
| `MONGODB_DB` | Nombre de la base dentro del clúster. Por defecto `amai_activity`. |
| `PORT` | Puerto del servidor. Render lo inyecta solo. |
| `MONGOMS_DISABLE_POSTINSTALL` | Ponla en `1` para que la dependencia de pruebas no descargue 141 MB de binarios al instalar. |

`.env.local` está en `.gitignore`: tus credenciales no se suben al repositorio.

---

## Stack

Next.js 16 · React 19 · TypeScript · MongoDB Atlas con Mongoose 9 ·
Socket.IO 4 · Tailwind CSS 4

El sistema de diseño sale de [`DESIGN.md`](DESIGN.md) y vive como tokens de
Tailwind en `src/app/globals.css`.
