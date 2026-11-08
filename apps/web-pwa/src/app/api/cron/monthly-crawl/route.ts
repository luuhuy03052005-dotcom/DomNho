import { NextRequest, NextResponse } from 'next/server';
import {
  loadCurrentFeedStore,
  persistFeedStoreSafely,
} from '@/lib/crawler-feed-store';
import {
  CRAWL4AI_PROVIDER,
  MAX_MONTHLY_CRAWL_SPOTS,
  MIN_MONTHLY_CRAWL_SPOTS,
  crawlRescuePostsWithCrawl4AI,
  createSavedGoogleMapsPlaces,
} from '@/lib/crawl4ai-crawler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  return Boolean(
    cronSecret && request.headers.get('authorization') === `Bearer ${cronSecret}`
  );
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    console.error('[monthly-crawl] CRON_SECRET is not configured.');
    return NextResponse.json(
      { ok: false, messageVi: 'Lịch crawl chưa được cấu hình bảo mật.' },
      { status: 503 }
    );
  }

  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, messageVi: 'Không có quyền chạy lịch crawl.' },
      { status: 401 }
    );
  }

  const startedAt = new Date().toISOString();
  console.info('[monthly-crawl] Started:', { startedAt });

  try {
    const current = await loadCurrentFeedStore();
    const spots = await crawlRescuePostsWithCrawl4AI({
      targetPlatform: 'ALL',
      perQueryLimit: 10,
      minimumSpots: MIN_MONTHLY_CRAWL_SPOTS,
      maxSpots: MAX_MONTHLY_CRAWL_SPOTS,
      concurrency: 8,
    });

    const retainedVetPlaces = (current.savedGoogleMapsPlaces || []).filter(
      (place) => place.sourcePlatform === 'GOOGLE_MAPS' && !place.spotId
    );
    const crawledAt = new Date().toISOString();
    const nextStore = {
      crawledAt,
      crawlProvider: CRAWL4AI_PROVIDER,
      crawlMode: 'MONTHLY' as const,
      minimumArticleTarget: MIN_MONTHLY_CRAWL_SPOTS,
      verifiedArticlesCount: spots.length,
      verifiedVetStationsCount: (current.vetStations || []).length,
      spots,
      vetStations: current.vetStations || [],
      savedGoogleMapsPlaces: [
        ...createSavedGoogleMapsPlaces(spots),
        ...retainedVetPlaces,
      ],
    };

    await persistFeedStoreSafely(nextStore, { requireDurable: true });
    console.info('[monthly-crawl] Completed:', {
      startedAt,
      crawledAt,
      articleCount: spots.length,
    });

    return NextResponse.json({
      ok: true,
      crawlProvider: CRAWL4AI_PROVIDER,
      crawledAt,
      articleCount: spots.length,
      minimumArticleTarget: MIN_MONTHLY_CRAWL_SPOTS,
      messageVi: `Đã cập nhật ${spots.length} bài viết Crawl4AI hợp lệ.`,
    });
  } catch (error) {
    console.error('[monthly-crawl] Failed; previous feed was preserved:', error);
    return NextResponse.json(
      {
        ok: false,
        messageVi:
          'Lần crawl tháng chưa đạt đủ dữ liệu hợp lệ. Danh sách cũ được giữ nguyên.',
      },
      { status: 500 }
    );
  }
}
