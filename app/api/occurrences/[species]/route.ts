import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type OccurrenceRow = {
  geojson: any;
};

export async function GET(
  request: Request,
  { params }: { params: { species: string } }
) {
  try {
    const speciesName = decodeURIComponent(params.species);
    
    const speciesResult = await query<{ id: number }>(`
      SELECT id FROM species WHERE scientific_name = $1
    `, [speciesName]);

    if (speciesResult.length === 0) {
      return NextResponse.json(
        { error: 'Species not found' },
        { status: 404 }
      );
    }

    const speciesId = speciesResult[0].id;

    const result = await query<OccurrenceRow>(`
      SELECT jsonb_build_object(
        'type', 'FeatureCollection',
        'features', jsonb_agg(
          jsonb_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::jsonb,
            'properties', jsonb_build_object(
              'eventDate', observed_date,
              'source', source,
              'dataTier', data_tier
            )
          )
        )
      ) AS geojson
      FROM lepidoptera_occurrences
      WHERE species_id = $1
        AND observed_date IS NOT NULL
        AND data_tier = 1
    `, [speciesId]);

    if (!result[0]?.geojson) {
      return NextResponse.json({
        type: 'FeatureCollection',
        features: []
      });
    }

    return NextResponse.json(result[0].geojson);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch occurrence data' },
      { status: 500 }
    );
  }
}