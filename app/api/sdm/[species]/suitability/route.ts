import { getSdmPool as getPool } from '@/lib/db';

export const dynamic    = 'force-dynamic';
export const maxDuration = 30;

function tiffBoundsHeader(buf: Buffer): string | null {
  try {
    if (buf.length < 8) return null;
    const le  = buf[0] === 0x49;
    const r16 = (o: number) => le ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
    const r32 = (o: number) => le ? buf.readUInt32LE(o) : buf.readUInt32BE(o);
    const r64 = (o: number) => le ? buf.readDoubleLE(o) : buf.readDoubleBE(o);

    const ifdOff     = r32(4);
    const numEntries = r16(ifdOff);

    let tiepoint: number[] | null   = null;
    let pixelScale: number[] | null = null;
    let imgW = 0, imgH = 0;

    for (let i = 0; i < numEntries; i++) {
      const e   = ifdOff + 2 + i * 12;
      if (e + 12 > buf.length) break;
      const tag    = r16(e);
      const type   = r16(e + 2);
      const valOff = r32(e + 8);

      if (tag === 256) imgW = type === 3 ? r16(e + 8) : r32(e + 8);
      if (tag === 257) imgH = type === 3 ? r16(e + 8) : r32(e + 8);
      if (tag === 33550 && valOff + 24 <= buf.length)
        pixelScale = [r64(valOff), r64(valOff + 8), r64(valOff + 16)];
      if (tag === 33922 && valOff + 48 <= buf.length)
        tiepoint = Array.from({ length: 6 }, (_, j) => r64(valOff + j * 8));
    }

    if (!tiepoint || !pixelScale || !imgW || !imgH) return null;

    const west  = tiepoint[3] - tiepoint[0] * pixelScale[0];
    const north = tiepoint[4] + tiepoint[1] * pixelScale[1];
    const east  = west  + imgW * pixelScale[0];
    const south = north - imgH * pixelScale[1];

    return `${west},${south},${east},${north}`;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ species: string }> }
) {
  const { species } = await params;
  const name = decodeURIComponent(species);

  const pool = getPool();
  const { rows } = await pool.query<{ suitability_data: Buffer }>(
    `SELECT so.suitability_data
     FROM   sdm_outputs so
     JOIN   species s ON s.id = so.species_id
     WHERE  LOWER(s.scientific_name) = LOWER($1)
       AND  so.status = 'completed'
       AND  so.suitability_data IS NOT NULL`,
    [name]
  );

  if (!rows.length) {
    return new Response('Not found', { status: 404 });
  }

  const buf    = rows[0].suitability_data;
  const bounds = tiffBoundsHeader(buf);

  return new Response(buf, {
    headers: {
      'Content-Type':   'image/tiff',
      'Content-Length': String(buf.length),
      'Cache-Control':  'public, max-age=604800, immutable',
      ...(bounds ? { 'X-SDM-Bounds': bounds } : {}),
    },
  });
}
