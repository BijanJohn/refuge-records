import 'dotenv/config';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import Stripe from 'stripe';

// Configuration
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;
const DISCOGS_USERNAME = 'jeremyslindsey';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const USER_AGENT = 'RecordRefugeWebsite/1.0 +https://recordrefuge.com';

// Rate limiting
const RATE_LIMIT_DELAY = 1100; // ms between requests (~54 req/min, under 60 limit)

interface DiscogsListing {
  id: number;
  status: string;
  price: {
    value: number;
    currency: string;
  };
  condition: string;
  sleeve_condition: string;
  comments: string;
  uri: string;
  posted: string;
  release: {
    id: number;
    description: string;
    title: string;
    artist: string;
    format: string;
    catalog_number: string;
    year: number;
    thumbnail: string;
  };
}

interface DiscogsRelease {
  id: number;
  title: string;
  artists: Array<{ name: string }>;
  labels: Array<{ name: string; catno: string }>;
  year: number;
  formats: Array<{ name: string; descriptions?: string[] }>;
  images?: Array<{ uri: string; type: string }>;
}

interface InventoryItem {
  discogs_listing_id: number;
  discogs_release_id: number;
  stripe_product_id?: string;
  stripe_price_id?: string;
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
  listed_at: string;
}

interface Inventory {
  lastSync: string;
  seller: string;
  items: InventoryItem[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        // Rate limited, wait and retry
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.log(`Rate limited. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Request failed, retrying... (${i + 1}/${retries})`);
      await sleep(2000);
    }
  }
  throw new Error('Max retries exceeded');
}

async function fetchDiscogsInventory(): Promise<DiscogsListing[]> {
  if (!DISCOGS_TOKEN) {
    throw new Error('DISCOGS_TOKEN environment variable is required');
  }

  const items: DiscogsListing[] = [];
  let page = 1;
  let hasMore = true;

  console.log(`Fetching inventory for user: ${DISCOGS_USERNAME}`);

  while (hasMore) {
    const url = `https://api.discogs.com/users/${DISCOGS_USERNAME}/inventory?status=For+Sale&per_page=100&page=${page}`;

    console.log(`Fetching page ${page}...`);

    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Discogs token=${DISCOGS_TOKEN}`,
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    items.push(...data.listings);

    console.log(
      `  Found ${data.listings.length} listings (total: ${items.length})`
    );

    hasMore = data.pagination.page < data.pagination.pages;
    page++;

    if (hasMore) {
      await sleep(RATE_LIMIT_DELAY);
    }
  }

  return items;
}

async function fetchReleaseDetails(releaseId: number): Promise<DiscogsRelease | null> {
  if (!DISCOGS_TOKEN) return null;

  const url = `https://api.discogs.com/releases/${releaseId}`;

  try {
    const response = await fetchWithRetry(url, {
      headers: {
        Authorization: `Discogs token=${DISCOGS_TOKEN}`,
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      console.warn(`Could not fetch release ${releaseId}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`Error fetching release ${releaseId}:`, error);
    return null;
  }
}

async function syncToStripe(
  items: InventoryItem[],
  stripe: Stripe
): Promise<void> {
  console.log('\nSyncing products to Stripe...');

  for (const item of items) {
    try {
      // Search for existing product by metadata
      const existingProducts = await stripe.products.search({
        query: `metadata['discogs_listing_id']:'${item.discogs_listing_id}'`,
      });

      if (existingProducts.data.length > 0) {
        // Product exists, get its price
        const product = existingProducts.data[0];
        item.stripe_product_id = product.id;

        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 1,
        });

        if (prices.data.length > 0) {
          const existingPrice = prices.data[0];
          const newPriceInCents = Math.round(item.price * 100);

          // Check if price changed
          if (existingPrice.unit_amount !== newPriceInCents) {
            console.log(`  Updating price for ${item.artist} - ${item.title}`);

            // Deactivate old price
            await stripe.prices.update(existingPrice.id, { active: false });

            // Create new price
            const newPrice = await stripe.prices.create({
              product: product.id,
              unit_amount: newPriceInCents,
              currency: item.currency.toLowerCase(),
            });
            item.stripe_price_id = newPrice.id;
          } else {
            item.stripe_price_id = existingPrice.id;
          }
        }

        console.log(`  Synced: ${item.artist} - ${item.title} (existing)`);
      } else {
        // Create new product and price
        console.log(`  Creating: ${item.artist} - ${item.title}`);

        const productData: Stripe.ProductCreateParams = {
          name: `${item.artist} - ${item.title}`,
          description: item.comments || `${item.condition} / ${item.sleeve_condition}`,
          metadata: {
            discogs_listing_id: item.discogs_listing_id.toString(),
            discogs_release_id: item.discogs_release_id.toString(),
            condition: item.condition,
            sleeve_condition: item.sleeve_condition,
          },
        };

        // Add image if available
        if (item.images.length > 0) {
          productData.images = [item.images[0]];
        }

        const product = await stripe.products.create(productData);

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(item.price * 100),
          currency: item.currency.toLowerCase(),
        });

        item.stripe_product_id = product.id;
        item.stripe_price_id = price.id;
      }

      // Small delay to avoid rate limits
      await sleep(100);
    } catch (error) {
      console.error(`  Error syncing ${item.artist} - ${item.title}:`, error);
    }
  }
}

async function main(): Promise<void> {
  console.log('=== Discogs Inventory Sync ===\n');
  console.log(`Time: ${new Date().toISOString()}`);

  // Fetch listings from Discogs
  const listings = await fetchDiscogsInventory();
  console.log(`\nTotal listings: ${listings.length}`);

  if (listings.length === 0) {
    console.log('No listings found. Exiting.');
    return;
  }

  // Transform listings to our format
  const items: InventoryItem[] = [];

  console.log('\nFetching release details for images...');

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`  [${i + 1}/${listings.length}] ${listing.release.artist} - ${listing.release.title}`);

    // Fetch release details for images
    const release = await fetchReleaseDetails(listing.release.id);
    await sleep(RATE_LIMIT_DELAY);

    const images: string[] = [];
    if (release?.images) {
      // Get primary image first, then secondary images
      const primaryImage = release.images.find((img) => img.type === 'primary');
      if (primaryImage) {
        images.push(primaryImage.uri);
      }
      release.images
        .filter((img) => img.type === 'secondary')
        .slice(0, 3)
        .forEach((img) => images.push(img.uri));
    }

    // Fallback to thumbnail if no images found
    if (images.length === 0 && listing.release.thumbnail) {
      images.push(listing.release.thumbnail);
    }

    const item: InventoryItem = {
      discogs_listing_id: listing.id,
      discogs_release_id: listing.release.id,
      title: listing.release.title,
      artist: listing.release.artist,
      label: release?.labels?.[0]?.name,
      catalog_number: release?.labels?.[0]?.catno || listing.release.catalog_number,
      year: release?.year || listing.release.year,
      format: release?.formats?.[0]?.name,
      price: listing.price.value,
      currency: listing.price.currency,
      condition: listing.condition,
      sleeve_condition: listing.sleeve_condition,
      comments: listing.comments,
      discogs_url: `https://www.discogs.com${listing.uri}`,
      images,
      status: 'available',
      listed_at: listing.posted,
    };

    items.push(item);
  }

  // Sync to Stripe if key is provided
  if (STRIPE_SECRET_KEY) {
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    await syncToStripe(items, stripe);
  } else {
    console.log('\nSkipping Stripe sync (STRIPE_SECRET_KEY not set)');
  }

  // Load existing inventory to preserve any manual overrides
  let existingInventory: Inventory | null = null;
  const inventoryPath = 'data/inventory.json';

  if (existsSync(inventoryPath)) {
    try {
      existingInventory = JSON.parse(readFileSync(inventoryPath, 'utf-8'));
    } catch (e) {
      console.warn('Could not read existing inventory:', e);
    }
  }

  // Merge with existing data (preserve Stripe IDs if already set)
  if (existingInventory) {
    for (const item of items) {
      const existing = existingInventory.items.find(
        (e) => e.discogs_listing_id === item.discogs_listing_id
      );
      if (existing) {
        if (!item.stripe_product_id && existing.stripe_product_id) {
          item.stripe_product_id = existing.stripe_product_id;
        }
        if (!item.stripe_price_id && existing.stripe_price_id) {
          item.stripe_price_id = existing.stripe_price_id;
        }
      }
    }
  }

  // Save inventory
  const inventory: Inventory = {
    lastSync: new Date().toISOString(),
    seller: DISCOGS_USERNAME,
    items,
  };

  writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
  console.log(`\nInventory saved to ${inventoryPath}`);
  console.log(`Total items: ${items.length}`);
  console.log('\n=== Sync Complete ===');
}

main().catch((error) => {
  console.error('Sync failed:', error);
  process.exit(1);
});
