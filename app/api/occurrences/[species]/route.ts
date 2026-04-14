import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CHUNK_SIZE = 150000;

type PointRow = {
  lng: number;
  lat: number;
  observed_date: string | null;
  source: string;
  data_tier: number;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ species: string }> }
) {
  try {
    const { species } = await params;
    const speciesName = decodeURIComponent(species);

    const speciesResult = await query<{ id: number }>(
      `SELECT id FROM species WHERE scientific_name = $1`,
      [speciesName]
    );

    if (speciesResult.length === 0) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    const speciesId = speciesResult[0].id;

    const url = new URL(request.url);

    // Lightweight metadata fetch (date range only)
    if (url.searchParams.get('meta') === 'true') {
      const metaResult = await query<{ min_date: string | null; max_date: string | null }>(
        `SELECT MIN(observed_date)::text AS min_date, MAX(observed_date)::text AS max_date
         FROM lepidoptera_occurrences
         WHERE species_id = $1 AND observed_date IS NOT NULL`,
        [speciesId]
      );
      return NextResponse.json({
        minDate: metaResult[0]?.min_date ?? null,
        maxDate: metaResult[0]?.max_date ?? null,
      });
    }

    const offsetParam = url.searchParams.get('offset');
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;

    const rows = await query<PointRow>(
      `SELECT
         ST_X(geom) AS lng,
         ST_Y(geom) AS lat,
         observed_date,
         source,
         data_tier
       FROM lepidoptera_occurrences
       WHERE species_id = $1
         AND observed_date IS NOT NULL
         AND geom IS NOT NULL
       ORDER BY observed_date ASC
       LIMIT $2 OFFSET $3`,
      [speciesId, CHUNK_SIZE, offset]
    );

    return NextResponse.json({
      type: 'FeatureCollection',
      offset,
      returned: rows.length,
      hasMore: rows.length === CHUNK_SIZE,
      features: rows.map(row => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [row.lng, row.lat],
        },
        properties: {
          eventDate: row.observed_date,
          source: row.source,
          dataTier: row.data_tier,
        },
      })),
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch occurrence data' },
      { status: 500 }
    );
  }
}
