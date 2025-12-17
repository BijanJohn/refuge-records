export interface Record {
  discogs_listing_id: number;
  discogs_release_id: number;
  stripe_product_id?: string;
  stripe_price_id?: string;
  slug: string;
  title: string;
  artist: string;
  label?: string;
  catalog_number?: string;
  year?: number;
  format?: string;
  price: number;
  currency: string;
  condition: string;
  sleeve_condition: string;
  comments?: string;
  discogs_url: string;
  images: string[];
  status: 'available' | 'sold' | 'reserved';
  listed_at?: string;
  sold_at?: string;
}

export interface Inventory {
  lastSync: string;
  seller: string;
  items: Record[];
}
