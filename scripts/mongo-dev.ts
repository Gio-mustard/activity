/**
 * MongoDB local efimera para desarrollo y demos sin Atlas.
 *
 * Levanta un mongod en memoria en el puerto 27777 y lo deja corriendo.
 * Util para probar la app sin internet; los datos se pierden al cerrarlo.
 *
 *   npm run mongo:dev      (en una terminal)
 *   npm run dev            (en otra, con MONGODB_URI="mongodb://127.0.0.1:27777/")
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const PORT = 27777;

async function main() {
  const server = await MongoMemoryServer.create({ instance: { port: PORT, dbName: 'amai_activity' } });

  console.log('\n  MongoDB efimera lista');
  console.log(`  MONGODB_URI="${server.getUri()}"`);
  console.log('  Los datos se borran al cerrar este proceso (Ctrl+C).\n');

  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((error) => {
  console.error('[mongo-dev] no se pudo arrancar', error);
  process.exit(1);
});
