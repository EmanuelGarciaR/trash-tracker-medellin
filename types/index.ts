export interface Container {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'empty' | 'full' | 'collecting';
  fill_level: number;
  last_updated: string;
  created_at: string;
}

export interface Route {
  id: string;
  container_ids: string[];
  total_distance: number | null;
  created_at: string;
  completed_at: string | null;
}
