import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FULL_THRESHOLD = 150000;

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

    const countResult = await query<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM lepidoptera_occurrences WHERE species_id = $1`,
      [speciesId]
    );
    const total = Number(countResult[0].cnt);

    const rows = await query<PointRow>(
      total <= FULL_THRESHOLD
        ? `SELECT
             ST_X(geom) AS lng,
             ST_Y(geom) AS lat,
             observed_date,
             source,
             data_tier
           FROM lepidoptera_occurrences
           WHERE species_id = $1
             AND observed_date IS NOT NULL
             AND geom IS NOT NULL`
        : `SELECT
             ST_X(geom) AS lng,
             ST_Y(geom) AS lat,
             observed_date,
             source,
             data_tier
           FROM lepidoptera_occurrences
           WHERE species_id = $1
             AND observed_date IS NOT NULL
             AND geom IS NOT NULL
           ORDER BY RANDOM()
           LIMIT $2`,
      total <= FULL_THRESHOLD ? [speciesId] : [speciesId, FULL_THRESHOLD]
    );

    const geojson = {
      type: 'FeatureCollection',
      sampled: total > FULL_THRESHOLD,
      total,
      returned: rows.length,
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
    };

    return NextResponse.json(geojson);

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch occurrence data' },
      { status: 500 }
    );
  }
}


