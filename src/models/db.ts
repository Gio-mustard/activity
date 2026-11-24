/**
 * Conexion unica a MongoDB Atlas.
 *
 * Next recarga modulos en caliente durante el desarrollo, asi que la conexion
 * se cachea en `globalThis` para no abrir un pool nuevo en cada recarga.
 */
import mongoose from 'mongoose';

/**
 * Se lee en cada llamada, no al importar el modulo: Next carga .env.local
 * durante `app.prepare()`, despues de que este archivo pudo ser importado.
 */
const mongoUri = () => process.env.MONGODB_URI;
const mongoDb = () => process.env.MONGODB_DB || 'amai_activity';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as unknown as { __amaiMongoose?: MongooseCache };
const cache: MongooseCache = globalForMongoose.__amaiMongoose ?? { conn: null, promise: null };
globalForMongoose.__amaiMongoose = cache;

export class MissingDatabaseConfig extends Error {
  constructor() {
    super(
      'Falta MONGODB_URI. Copia .env.example a .env.local y pega tu cadena de conexion de MongoDB Atlas.',
    );
    this.name = 'MissingDatabaseConfig';
  }
}

/** Devuelve la conexion viva, abriendola la primera vez. */
export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  const uri = mongoUri();
  if (!uri) throw new MissingDatabaseConfig();

  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = mongoose.connect(uri, {
      dbName: mongoDb(),
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}

/** true si la app tiene configuracion de base de datos (para la pantalla de diagnostico). */
export function hasDatabaseConfig(): boolean {
  return Boolean(mongoUri());
}

export function dbState(): string {
  const states = ['desconectado', 'conectado', 'conectando', 'desconectando'];
  return states[mongoose.connection.readyState] ?? 'desconocido';
}
