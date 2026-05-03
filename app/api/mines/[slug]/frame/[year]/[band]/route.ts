export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; year: string; band: string }> }
) {
  const { slug, year, band } = await params;

  if (band !== 'ndvi' && band !== 'nbr') {
    return new Response('Invalid band', { status: 400 });
  }

  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum)) {
    return new Response('Invalid year', { status: 400 });
  }

  try {
    // Import here to keep the module lazy and avoid db init at build time
    const { querySingle } = await import('@/lib/db');

    const row = await querySingle<{ image_data: Buffer }>(
      `SELECT mi.image_data
       FROM mine_images mi
       JOIN mines m ON m.id = mi.mine_id
       WHERE m.slug = $1 AND mi.year = $2 AND mi.index_type = $3`,
      [slug, yearNum, band]
    );

    if (!row) {
      return new Response('Image not found', { status: 404 });
    }

    return new Response(row.image_data, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image fetch error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
