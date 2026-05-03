import { NextResponse } from 'next/server';
import { query, querySingle } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const mine = await querySingle(
      `SELECT id, slug, mine_name, county, state, lat, lon,
              bounds_west, bounds_south, bounds_east, bounds_north,
              img_west, img_south, img_east, img_north,
              operational_start, operational_end, status
       FROM mines WHERE slug = $1`,
      [slug]
    );

    if (!mine) {
      return NextResponse.json({ error: 'Mine not found' }, { status: 404 });
    }

    const [imageRows, statsRows] = await Promise.all([
      query(
        `SELECT DISTINCT year, width_px, height_px
         FROM mine_images WHERE mine_id = $1 ORDER BY year`,
        [mine.id]
      ),
      query(
        `SELECT year, mean_ndvi, std_ndvi, pct_valid, mean_nbr
         FROM mine_stats WHERE mine_id = $1 ORDER BY year`,
        [mine.id]
      ),
    ]);

    const years: number[] = imageRows.map((r: any) => r.year);
    const width: number = imageRows[0]?.width_px ?? 1024;
    const height: number = imageRows[0]?.height_px ?? 1024;

    const stats: Record<string, any> = {};
    for (const row of statsRows as any[]) {
      stats[String(row.year)] = {
        mean_ndvi: row.mean_ndvi,
        std_ndvi:  row.std_ndvi,
        pct_valid: row.pct_valid,
        mean_nbr:  row.mean_nbr,
      };
    }

    return NextResponse.json({
      mine,
      years,
      stats,
      frameMeta: {
        // img_* is the actual raster extent; fall back to the area bounds if not yet set
        bounds: [
          mine.img_west  ?? mine.bounds_west,
          mine.img_south ?? mine.bounds_south,
          mine.img_east  ?? mine.bounds_east,
          mine.img_north ?? mine.bounds_north,
        ],
        width,
        height,
      },
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Failed to fetch mine data' }, { status: 500 });
  }
}
