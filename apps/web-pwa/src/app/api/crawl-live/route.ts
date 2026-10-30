import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { filterTrustedSpots } from '@/lib/spot-validation';
import { PlatformFilter, detectPlatformFromUrl } from '@/lib/types';
import {
  VerifiedScrapedPost,
  discoverMultiPlatformCandidateUrls,
  extractVerifiedPostFromUrl,
  filterAndStructurePostsWithGemini,
  isRelevantVietnamPetText,
} from '@/lib/multi-source-crawler';

export async function GET() {
  try {
    const feedPath = path.join(process.cwd(), 'public', 'crawled-feed.json');
    const content = await fs.readFile(feedPath, 'utf-8');
    const parsed = JSON.parse(content);
    parsed.spots = filterTrustedSpots(parsed.spots || []);
    return NextResponse.json({
      ok: true,
      ...parsed,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Cannot read feed' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let targetPlatform: PlatformFilter = 'ALL';
    let customUrls: string[] = [];
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
    } catch {
      // Optional JSON body
    }

    const feedPath = path.join(process.cwd(), 'public', 'crawled-feed.json');
    const existingRaw = await fs.readFile(feedPath, 'utf-8');
    const existingData = JSON.parse(existingRaw);
    existingData.spots = filterTrustedSpots(existingData.spots || []);

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

    await fs.writeFile(
      feedPath,
      JSON.stringify(existingData, null, 2),
      'utf-8'
    );

    return NextResponse.json({
      ok: true,
      newlyAddedCount,
      platformBreakdown,
      ...existingData,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Không thể cập nhật dữ liệu lúc này',
      },
      { status: 500 }
    );
  }
}
