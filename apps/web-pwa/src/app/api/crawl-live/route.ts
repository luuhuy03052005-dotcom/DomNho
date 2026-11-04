import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import bundledCrawledData from '@/lib/crawled-data.json';
import { filterTrustedSpots } from '@/lib/spot-validation';
import { PlatformFilter, detectPlatformFromUrl } from '@/lib/types';
import {
  VerifiedScrapedPost,
  discoverMultiPlatformCandidateUrls,
  extractVerifiedPostFromUrl,
  filterAndStructurePostsWithGemini,
  isRelevantVietnamPetText,
} from '@/lib/multi-source-crawler';

interface CrawledFeedStore {
  crawledAt?: string;
  spots: any[];
  vetStations?: any[];
  savedGoogleMapsPlaces?: any[];
}

const globalForFeed = globalThis as unknown as {
  __domNhoFeedCache?: CrawledFeedStore;
};

const TMP_FEED_PATH = path.join(os.tmpdir(), 'dom-nho-crawled-feed.json');

async function loadCurrentFeedStore(): Promise<CrawledFeedStore> {
  if (globalForFeed.__domNhoFeedCache) {
    return {
      ...globalForFeed.__domNhoFeedCache,
      spots: filterTrustedSpots(globalForFeed.__domNhoFeedCache.spots || []),
    };
  }

  try {
    const tmpRaw = await fs.readFile(TMP_FEED_PATH, 'utf-8');
    const parsedTmp = JSON.parse(tmpRaw) as CrawledFeedStore;
    if (Array.isArray(parsedTmp?.spots) && parsedTmp.spots.length > 0) {
      parsedTmp.spots = filterTrustedSpots(parsedTmp.spots);
      globalForFeed.__domNhoFeedCache = parsedTmp;
      return parsedTmp;
    }
  } catch {
    // Ignore when tmp cache does not exist yet
  }

  try {
    const publicFeedPath = path.join(
      process.cwd(),
      'public',
      'crawled-feed.json'
    );
    const publicRaw = await fs.readFile(publicFeedPath, 'utf-8');
    const parsedPublic = JSON.parse(publicRaw) as CrawledFeedStore;
    parsedPublic.spots = filterTrustedSpots(parsedPublic.spots || []);
    globalForFeed.__domNhoFeedCache = parsedPublic;
    return parsedPublic;
  } catch {
    const fallbackStore: CrawledFeedStore = {
      crawledAt:
        (bundledCrawledData as any)?.crawledAt || new Date().toISOString(),
      spots: filterTrustedSpots(((bundledCrawledData as any)?.spots || []) as any[]),
      vetStations: (bundledCrawledData as any)?.vetStations || [],
      savedGoogleMapsPlaces:
        (bundledCrawledData as any)?.savedGoogleMapsPlaces || [],
    };
    globalForFeed.__domNhoFeedCache = fallbackStore;
    return fallbackStore;
  }
}

async function persistFeedStoreSafely(store: CrawledFeedStore): Promise<void> {
  globalForFeed.__domNhoFeedCache = store;
  const serialized = JSON.stringify(store, null, 2);

  try {
    await fs.writeFile(TMP_FEED_PATH, serialized, 'utf-8');
  } catch (tmpErr) {
    console.warn('[crawl-live] Could not write tmp feed cache:', tmpErr);
  }

  if (!process.env.VERCEL && process.env.NODE_ENV === 'development') {
    try {
      const publicFeedPath = path.join(
        process.cwd(),
        'public',
        'crawled-feed.json'
      );
      await fs.writeFile(publicFeedPath, serialized, 'utf-8');
    } catch {
      // Read-only deployment directories are expected in serverless environments
    }
  }
}

export async function GET() {
  try {
    const store = await loadCurrentFeedStore();
    return NextResponse.json({
      ok: true,
      ...store,
    });
  } catch (err) {
    console.error('[crawl-live][GET] Internal error:', err);
    return NextResponse.json(
      {
        ok: false,
        messageVi:
          'Không thể đọc dữ liệu đồng bộ lúc này. Vui lòng thử lại sau.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let targetPlatform: PlatformFilter = 'ALL';
    let customUrls: string[] = [];
    let simulateMode: 'NONE' | 'FAILURE' | 'NO_NEW' = 'NONE';

    try {
      const body = await request.json();
      if (body?.targetPlatform) {
        targetPlatform = body.targetPlatform as PlatformFilter;
      }
      if (Array.isArray(body?.customUrls)) {
        customUrls = body.customUrls
          .map((u: unknown) => String(u || '').trim())
          .filter((u: string) => u.startsWith('http'));
      }
      if (body?.simulateMode === 'FAILURE' || body?.simulateMode === 'NO_NEW') {
        simulateMode = body.simulateMode;
      }
    } catch {
      // Optional JSON body
    }

    if (simulateMode === 'FAILURE') {
      throw new Error('Simulated crawl failure for verification');
    }

    const existingData = await loadCurrentFeedStore();

    if (simulateMode === 'NO_NEW') {
      return NextResponse.json({
        ok: true,
        newlyAddedCount: 0,
        messageVi: 'Danh sách hiện tại đã có đầy đủ các bài viết mới nhất.',
        ...existingData,
      });
    }

    const existingUrlSet = new Set<string>(
      (existingData.spots || []).map((s: any) => String(s.sourceUrl || ''))
    );

    const discoveredUrls = await discoverMultiPlatformCandidateUrls(
      targetPlatform
    );
    const candidateUrls = [
      ...new Set([...customUrls, ...discoveredUrls]),
    ].filter((u) => !existingUrlSet.has(u));

    const verifiedPosts: VerifiedScrapedPost[] = [];
    const socialFollowUpUrls = new Set<string>();

    const firstBatch = candidateUrls.slice(0, 8);
    const firstResults = await Promise.allSettled(
      firstBatch.map((url) => extractVerifiedPostFromUrl(url))
    );

    for (const res of firstResults) {
      if (res.status !== 'fulfilled' || !res.value) continue;
      const post = res.value;
      if (existingUrlSet.has(post.canonicalUrl)) continue;
      if (isRelevantVietnamPetText(`${post.title} ${post.description}`)) {
        verifiedPosts.push(post);
        for (const sLink of post.discoveredSocialLinks) {
          if (!existingUrlSet.has(sLink)) {
            socialFollowUpUrls.add(sLink);
          }
        }
      }
    }

    if (socialFollowUpUrls.size > 0 && verifiedPosts.length < 8) {
      const socialBatch = [...socialFollowUpUrls].slice(0, 4);
      const socialResults = await Promise.allSettled(
        socialBatch.map((url) => extractVerifiedPostFromUrl(url))
      );
      for (const res of socialResults) {
        if (res.status !== 'fulfilled' || !res.value) continue;
        const post = res.value;
        if (
          !existingUrlSet.has(post.canonicalUrl) &&
          isRelevantVietnamPetText(`${post.title} ${post.description}`)
        ) {
          verifiedPosts.push(post);
        }
      }
    }

    let newlyAddedCount = 0;
    if (verifiedPosts.length > 0) {
      const { spots: newSpots, savedPlaces: newPlaces } =
        await filterAndStructurePostsWithGemini(verifiedPosts);

      for (const sp of newSpots) {
        const exists = (existingData.spots || []).some(
          (s: any) => s.sourceUrl === sp.sourceUrl
        );
        if (!exists) {
          existingData.spots.unshift(sp);
          newlyAddedCount++;
        }
      }

      if (!Array.isArray(existingData.savedGoogleMapsPlaces)) {
        existingData.savedGoogleMapsPlaces = [];
      }
      for (const pl of newPlaces) {
        const exists = existingData.savedGoogleMapsPlaces.some(
          (p: any) => p.id === pl.id || p.sourceUrl === pl.sourceUrl
        );
        if (!exists) {
          existingData.savedGoogleMapsPlaces.unshift(pl);
        }
      }
    }

    existingData.spots = filterTrustedSpots(existingData.spots || []);
    existingData.crawledAt = new Date().toISOString();

    const platformBreakdown: Record<string, number> = {
      FACEBOOK: 0,
      INSTAGRAM: 0,
      THREADS: 0,
      TIKTOK: 0,
      YOUTUBE: 0,
      RESCUE_PORTAL: 0,
      SOCIAL_MEDIA: 0,
    };
    for (const s of existingData.spots) {
      const p = detectPlatformFromUrl(s.sourceUrl, s.sourcePlatform);
      platformBreakdown[p] = (platformBreakdown[p] || 0) + 1;
    }

    await persistFeedStoreSafely(existingData);

    return NextResponse.json({
      ok: true,
      newlyAddedCount,
      platformBreakdown,
      messageVi:
        newlyAddedCount > 0
          ? `Đã bổ sung ${newlyAddedCount} bài viết mới vào danh sách.`
          : 'Danh sách hiện tại đã có đầy đủ các bài viết mới nhất.',
      ...existingData,
    });
  } catch (err) {
    console.error('[crawl-live][POST] Internal error:', err);
    return NextResponse.json(
      {
        ok: false,
        messageVi:
          'Không thể cập nhật tin mới lúc này. Đang giữ nguyên danh sách hiện có.',
      },
      { status: 500 }
    );
  }
}
