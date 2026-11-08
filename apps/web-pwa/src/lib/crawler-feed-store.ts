import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import bundledCrawledData from '@/lib/crawled-data.json';
import { CRAWL4AI_PROVIDER } from '@/lib/crawl4ai-crawler';
import { getMongoDb, isMongoEnabled } from '@/lib/mongodb';
import { filterTrustedSpots } from '@/lib/spot-validation';
import { DomSpot, SavedGoogleMapPlace, VetStation } from '@/lib/types';

export interface CrawledFeedStore {
  crawledAt?: string;
  crawlProvider?: string;
  verifiedArticlesCount?: number;
  verifiedVetStationsCount?: number;
  minimumArticleTarget?: number;
  crawlMode?: 'MANUAL' | 'MONTHLY';
  spots: DomSpot[];
  vetStations?: VetStation[];
  savedGoogleMapsPlaces?: SavedGoogleMapPlace[];
}

interface MongoCrawledFeedDocument extends CrawledFeedStore {
  key: 'active';
  updatedAt: string;
}

const globalForFeed = globalThis as unknown as {
  __domNhoFeedCache?: CrawledFeedStore;
};

const TMP_FEED_PATH = path.join(os.tmpdir(), 'dom-nho-crawled-feed.json');

function isMongoCooldownError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message === 'MongoDB connection cooldown active'
  );
}

function mongoErrorLabel(error: unknown): string {
  const value = error as { name?: string; code?: string | number } | null;
  const name = value?.name || 'MongoError';
  const code = value?.code ? ` ${value.code}` : '';
  return `${name}${code}`;
}

function normalizeStore(store: CrawledFeedStore): CrawledFeedStore {
  return {
    crawledAt: store.crawledAt,
    crawlProvider: CRAWL4AI_PROVIDER,
    verifiedArticlesCount: store.verifiedArticlesCount,
    verifiedVetStationsCount: store.verifiedVetStationsCount,
    minimumArticleTarget: store.minimumArticleTarget,
    crawlMode: store.crawlMode,
    spots: filterTrustedSpots(store.spots || []),
    vetStations: Array.isArray(store.vetStations) ? store.vetStations : [],
    savedGoogleMapsPlaces: Array.isArray(store.savedGoogleMapsPlaces)
      ? store.savedGoogleMapsPlaces
      : [],
  };
}

function isCrawl4AIStore(value: unknown): value is CrawledFeedStore {
  if (!value || typeof value !== 'object') return false;
  const store = value as CrawledFeedStore;
  return (
    store.crawlProvider === CRAWL4AI_PROVIDER &&
    Array.isArray(store.spots) &&
    store.spots.length > 0
  );
}

async function loadMongoFeed(): Promise<CrawledFeedStore | null> {
  if (!isMongoEnabled()) return null;
  const db = await getMongoDb();
  const document = await db
    .collection<MongoCrawledFeedDocument>('crawler_feeds')
    .findOne({ key: 'active' });
  return isCrawl4AIStore(document) ? normalizeStore(document) : null;
}

export async function loadCurrentFeedStore(): Promise<CrawledFeedStore> {
  try {
    const mongoStore = await loadMongoFeed();
    if (mongoStore) {
      globalForFeed.__domNhoFeedCache = mongoStore;
      return mongoStore;
    }
  } catch (error) {
    if (!isMongoCooldownError(error)) {
      console.warn(
        `[crawler-feed-store] MongoDB unavailable (${mongoErrorLabel(error)}); using local Crawl4AI feed.`
      );
    }
  }

  if (isCrawl4AIStore(globalForFeed.__domNhoFeedCache)) {
    return normalizeStore(globalForFeed.__domNhoFeedCache);
  }

  try {
    const parsedTmp = JSON.parse(
      await fs.readFile(TMP_FEED_PATH, 'utf-8')
    ) as CrawledFeedStore;
    if (isCrawl4AIStore(parsedTmp)) {
      const normalized = normalizeStore(parsedTmp);
      globalForFeed.__domNhoFeedCache = normalized;
      return normalized;
    }
  } catch {
    // Cache file is optional.
  }

  try {
    const publicFeedPath = path.join(process.cwd(), 'public', 'crawled-feed.json');
    const parsedPublic = JSON.parse(
      await fs.readFile(publicFeedPath, 'utf-8')
    ) as CrawledFeedStore;
    if (isCrawl4AIStore(parsedPublic)) {
      const normalized = normalizeStore(parsedPublic);
      globalForFeed.__domNhoFeedCache = normalized;
      return normalized;
    }
  } catch {
    // The bundled JSON below is the final read-only fallback.
  }

  const fallbackStore = normalizeStore({
    crawledAt:
      (bundledCrawledData as CrawledFeedStore)?.crawledAt ||
      new Date().toISOString(),
    spots: ((bundledCrawledData as CrawledFeedStore)?.spots || []) as DomSpot[],
    vetStations:
      (bundledCrawledData as CrawledFeedStore)?.vetStations || [],
    savedGoogleMapsPlaces:
      (bundledCrawledData as CrawledFeedStore)?.savedGoogleMapsPlaces || [],
    crawlProvider: CRAWL4AI_PROVIDER,
  });
  globalForFeed.__domNhoFeedCache = fallbackStore;
  return fallbackStore;
}

export async function persistFeedStoreSafely(
  value: CrawledFeedStore,
  options: { requireDurable?: boolean } = {}
): Promise<{ mongoPersisted: boolean }> {
  const store = normalizeStore(value);
  let mongoPersisted = false;
  let mongoError: unknown;

  if (isMongoEnabled()) {
    try {
      const db = await getMongoDb();
      await db.collection<MongoCrawledFeedDocument>('crawler_feeds').updateOne(
        { key: 'active' },
        {
          $set: {
            ...store,
            key: 'active',
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );
      mongoPersisted = true;
    } catch (error) {
      mongoError = error;
      if (!isMongoCooldownError(error)) {
        console.error(
          `[crawler-feed-store] MongoDB write failed (${mongoErrorLabel(error)}).`
        );
      }
    }
  } else {
    mongoError = new Error(
      'MongoDB đang tắt hoặc MONGODB_URI chưa được cấu hình.'
    );
  }

  if (options.requireDurable && !mongoPersisted) {
    throw mongoError instanceof Error
      ? mongoError
      : new Error('Không thể lưu feed crawl vào kho dữ liệu bền vững.');
  }

  globalForFeed.__domNhoFeedCache = store;
  const serialized = JSON.stringify(store, null, 2);

  try {
    await fs.writeFile(TMP_FEED_PATH, serialized, 'utf-8');
  } catch (error) {
    console.warn('[crawler-feed-store] Could not write tmp cache:', error);
  }

  if (!process.env.VERCEL && process.env.NODE_ENV === 'development') {
    try {
      const publicFeedPath = path.join(
        process.cwd(),
        'public',
        'crawled-feed.json'
      );
      await fs.writeFile(publicFeedPath, serialized, 'utf-8');
    } catch (error) {
      console.warn('[crawler-feed-store] Could not write local feed:', error);
    }
  }

  return { mongoPersisted };
}
