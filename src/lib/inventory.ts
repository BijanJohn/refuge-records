import type { Record, Inventory } from '../types';
import { generateSlug } from './utils';
import inventoryData from '../../data/inventory.json';

const inventory = inventoryData as Inventory;

export function getAvailableRecords(): Record[] {
  return inventory.items
    .filter((item) => item.status === 'available')
    .map((item) => ({
      ...item,
      slug: generateSlug(item.artist, item.title, item.discogs_listing_id),
    }));
}

export function getRecordBySlug(slug: string): Record | undefined {
  return getAvailableRecords().find((r) => r.slug === slug);
}

export function getRecordById(id: number): Record | undefined {
  return getAvailableRecords().find((r) => r.discogs_listing_id === id);
}

export function getFeaturedRecords(count: number = 4): Record[] {
  return getAvailableRecords().slice(0, count);
}

export function getLastSyncTime(): string {
  return inventory.lastSync;
}
