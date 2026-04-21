import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query('SELECT NOW() as time, COUNT(*) as species_count FROM species');
    if (!result?.[0]) throw new Error('Empty query result');
    return NextResponse.json({
      connected: true,
      serverTime: result[0].time,
      speciesCount: result[0].species_count,
      database: process.env.DATABASE_HOST,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : String(error),
      database: process.env.DATABASE_HOST,
    }, { status: 500 });
  }
}
