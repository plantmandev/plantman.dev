import { getPool } from '@/lib/db';

export const dynamic    = 'force-dynamic';
export const maxDuration = 15;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ species: string }> }
) {
  const { species } = await params;
  const name = decodeURIComponent(species);

  const pool = getPool();
  const { rows } = await pool.query<{ range_data: Buffer }>(
    `SELECT so.range_data
     FROM   sdm_outputs so
     JOIN   species s ON s.id = so.species_id
     WHERE  LOWER(s.scientific_name) = LOWER($1)
       AND  so.status = 'completed'
       AND  so.range_data IS NOT NULL`,
    [name]
  );

  if (!rows.length) {
    return new Response('Not found', { status: 404 });
  }

  const buf = rows[0].range_data;
  return new Response(buf, {
    headers: {
      'Content-Type':   'application/geo+json',
      'Content-Length': String(buf.length),
      'Cache-Control':  'public, max-age=604800, immutable',
    },
  });
}
