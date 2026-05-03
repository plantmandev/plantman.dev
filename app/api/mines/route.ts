import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mines = await query(`
      SELECT id, slug, mine_name, county, state, lat, lon,
             bounds_west, bounds_south, bounds_east, bounds_north,
             img_west, img_south, img_east, img_north,
             operational_start, operational_end, status
      FROM mines
      ORDER BY id
    `);
    return NextResponse.json(mines);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch mines' }, { status: 500 });
  }
}
