import { NextResponse } from 'next/server';
import { connectDB, dbState, hasDatabaseConfig } from '@/models/db';

export const dynamic = 'force-dynamic';

/** Diagnostico rapido: ¿esta configurada y viva la base de datos? */
export async function GET() {
  if (!hasDatabaseConfig()) {
    return NextResponse.json(
      { ok: false, database: 'sin configurar', hint: 'Copia .env.example a .env.local y pega tu MONGODB_URI.' },
      { status: 503 },
    );
  }
  try {
    await connectDB();
    return NextResponse.json({ ok: true, database: dbState() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, database: 'error', detail: error instanceof Error ? error.message : 'desconocido' },
      { status: 503 },
    );
  }
}
