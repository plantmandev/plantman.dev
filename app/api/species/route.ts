import { NextResponse } from 'next/server';
import { querysdm as query } from '@/lib/db';

export const dynamic = 'force-dynamic';

type SpeciesRow = {
  scientific_name: string;
  common_name: string | null;
  family: string | null;
  gbif_taxon_key: number | null;
  occurrence_count: number;
  category: string;
};

export async function GET() {
  try {
    const species = await query<SpeciesRow>(`
      SELECT
        s.scientific_name,
        s.common_name,
        s.family,
        s.gbif_taxon_key,
        COUNT(o.id) AS occurrence_count,
        'lepidoptera' AS category
      FROM species s
      LEFT JOIN lepidoptera_occurrences o ON o.species_id = s.id
      GROUP BY s.id, s.scientific_name, s.common_name, s.family, s.gbif_taxon_key
      ORDER BY occurrence_count DESC, s.scientific_name ASC
    `);

    const transformed = species.map((sp) => ({
      species_name:        sp.scientific_name,
      common_name:         sp.common_name || '',
      status:              sp.occurrence_count > 0 ? 'ingested' : 'pending',
      extent:              '',
      temporal_range:      '',
      expected_obs:        0,
      actual_obs:          sp.occurrence_count,
      last_updated:        new Date().toISOString().split('T')[0],
      taxonomic_rank:      'SPECIES',
      gbif_key:            sp.gbif_taxon_key?.toString() || '',
      data_quality:        100.0,
      countries_observed:  '',
      subregion:           '',
      color:               '',
      notes:               '',
      host_plants:         '',
      host_plant_families: '',
      host_plant_status:   '',
      category:            sp.category,
      disabled:            false,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species list' },
      { status: 500 }
    );
  }
}


