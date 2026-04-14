import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function tileToBBox(z: number, x: number, y: number): [number, number, number, number] {
  const n = Math.pow(2, z);
  const lngMin = (x / n) * 360 - 180;
  const lngMax = ((x + 1) / n) * 360 - 180;
  const latMax = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * (180 / Math.PI);
  const latMin = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * (180 / Math.PI);
  return [lngMin, latMin, lngMax, latMax];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ species: string; z: string; x: string; y: string }> }
) {
  try {
    const { species, z, x, y } = await params;
    const speciesName = decodeURIComponent(species);
    const zoom = parseInt(z, 10);
    const tileX = parseInt(x, 10);
    const tileY = parseInt(y, 10);

    if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
      return NextResponse.json({ error: 'Invalid tile coordinates' }, { status: 400 });
    }

    const [lngMin, latMin, lngMax, latMax] = tileToBBox(zoom, tileX, tileY);

    const speciesResult = await query<{ id: number }>(
      `SELECT id FROM species WHERE scientific_name = $1`,
      [speciesName]
    );

    if (speciesResult.length === 0) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }

    const speciesId = speciesResult[0].id;

    const rows = await query<{ lng: number; lat: number; observed_date: string | null }>(
      `SELECT ST_X(geom) AS lng, ST_Y(geom) AS lat, observed_date
       FROM lepidoptera_occurrences
       WHERE species_id = $1
         AND geom IS NOT NULL
         AND geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)`,
      [speciesId, lngMin, latMin, lngMax, latMax]
    );

    const geojson = {
      type: 'FeatureCollection',
      features: rows.map(row => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [row.lng, row.lat] },
        properties: { eventDate: row.observed_date },
      })),
    };

    return NextResponse.json(geojson);
  } catch (error) {
    console.error('Tile error:', error);
    return NextResponse.json({ error: 'Failed to fetch tile data' }, { status: 500 });
  }
}
