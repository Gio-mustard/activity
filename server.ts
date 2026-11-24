/**
 * SERVIDOR HTTP + WebSocket.
 *
 * Next por si solo no puede sostener conexiones WebSocket (sus route handlers
 * son peticiones efimeras), asi que montamos Next dentro de un servidor http
 * de Node y colgamos socket.io del mismo puerto. Esto es tambien lo que hace
 * que la app funcione tal cual en Render.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'node:url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const dir = process.cwd();

/**
 * Carga .env.local / .env en este proceso.
 *
 * Se parsea a mano a proposito, en vez de usar `loadEnvConfig` de @next/env:
 * esa funcion deja su propia cache, y cuando Next la vuelve a llamar desde
 * dentro detecta el entorno como "recargado" y reinicia el servidor por un
 * camino que un custom server no implementa (ENOENT de required-server-files).
 *
 * Hace falta aqui porque el servidor de sockets vive en ESTE proceso, fuera
 * del runtime de Next, y necesita MONGODB_URI para conectarse a Mongo.
 */
function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    let contents: string;
    try {
      contents = readFileSync(join(dir, file), 'utf8');
    } catch {
      continue; // el archivo es opcional
    }
    for (const line of contents.split('\n')) {
      const match = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/.exec(line);
      if (!match) continue;
      const [, key, rawValue = ''] = match;
      if (process.env[key] !== undefined) continue; // gana lo que ya venga del sistema
      process.env[key] = rawValue.trim().replace(/^(['"`])([\s\S]*)\1$/, '$2');
    }
  }
}

loadLocalEnv();

const port = Number(process.env.PORT ?? 3000);

/*
 * Se escucha en 0.0.0.0 (todas las interfaces), nunca en `process.env.HOSTNAME`.
 *
 * En Docker y en Render, HOSTNAME es el NOMBRE DEL CONTENEDOR, no la interfaz
 * donde atar el socket. Atarse a el deja el servidor escuchando en una sola
 * direccion y el router de la plataforma nunca lo alcanza: la app arranca sin
 * errores, la plataforma la da por viva y aun asi no responde nada.
 *
 * Para atar a una interfaz concreta a proposito, usa HOST.
 */
const hostname = process.env.HOST ?? '0.0.0.0';

async function main() {
  const app = next({ dev, dir, hostname, port });
  await app.prepare();
  const handle = app.getRequestHandler();

  const server = createServer((req, res) => {
    try {
      handle(req, res, parse(req.url ?? '', true));
    } catch (error) {
      console.error('[http] fallo al atender la peticion', error);
      res.statusCode = 500;
      res.end('Error interno');
    }
  });

  // Importacion diferida: el modulo toca Mongo, y el entorno ya esta cargado.
  const { attachRealtime } = await import('./src/realtime/socketServer');
  attachRealtime(server);

  // Sin esto, un puerto ocupado sale como uncaughtException con stack trace.
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n  El puerto ${port} ya esta ocupado.`);
      console.error(`  Cierra el otro servidor, o arranca este en otro puerto:  PORT=3001 npm run dev\n`);
      process.exit(1);
    }
    throw error;
  });

  server.listen(port, hostname, () => {
    // Se imprime la direccion REAL del socket, no la que pedimos: si alguna vez
    // vuelve a atarse donde no debe, se ve aqui en la primera linea del log.
    const bound = server.address();
    const real = typeof bound === 'object' && bound ? `${bound.address}:${bound.port}` : `${hostname}:${port}`;
    const shown = hostname === '0.0.0.0' ? `localhost:${port}` : `${hostname}:${port}`;
    console.log(`\n  Amai Activity escuchando en ${real}`);
    console.log(`  Abrela en http://${shown}`);
    console.log(`  WebSocket en /api/realtime  ·  modo ${dev ? 'desarrollo' : 'produccion'}`);
    if (!process.env.MONGODB_URI) {
      console.warn('\n  ⚠  Falta MONGODB_URI: copia .env.example a .env.local y pega tu cadena de Atlas.\n');
    }
  });

  const shutdown = () => {
    console.log('\n  Cerrando servidor...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[server] no se pudo arrancar', error);
  process.exit(1);
});
