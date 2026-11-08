import { NextRequest, NextResponse } from 'next/server';
import {
  loadCurrentFeedStore,
  persistFeedStoreSafely,
} from '@/lib/crawler-feed-store';
import { filterTrustedSpots } from '@/lib/spot-validation';
import { PlatformFilter, detectPlatformFromUrl } from '@/lib/types';
import {
  CRAWL4AI_PROVIDER,
  crawlRescuePostsWithCrawl4AI,
  createSavedGoogleMapsPlaces,
} from '@/lib/crawl4ai-crawler';

export const runtime = 'nodejs';
export const maxDuration = 300;

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

    const newSpots = await crawlRescuePostsWithCrawl4AI({
      targetPlatform,
      customUrls,
      excludeUrls: existingUrlSet,
      // Nút cập nhật thủ công dùng lượt tìm nhỏ hơn; job tháng mới chạy bộ 50+ đầy đủ.
      perQueryLimit: targetPlatform === 'ALL' ? 4 : 8,
      concurrency: 4,
    });

    let newlyAddedCount = 0;
    if (newSpots.length > 0) {
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
      const newPlaces = createSavedGoogleMapsPlaces(newSpots);
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
    existingData.crawlProvider = CRAWL4AI_PROVIDER;
    existingData.verifiedArticlesCount = existingData.spots.length;
    existingData.crawlMode = 'MANUAL';

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
