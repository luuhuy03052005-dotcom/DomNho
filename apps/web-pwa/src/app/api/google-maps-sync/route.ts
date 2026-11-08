import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  CRAWL4AI_PROVIDER,
  scrapeRescueUrlWithCrawl4AI,
} from '@/lib/crawl4ai-crawler';
import { buildGoogleMapsLinks } from '@/lib/location-services';

export const runtime = 'nodejs';
export const maxDuration = 60;

function extractCoordsFromGoogleMapsUrl(url: string): {
  lat: number;
  lng: number;
  placeName?: string;
} | null {
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const qMatch = url.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  const placeMatch = url.match(/\/maps\/place\/([^/@?]+)/);
  const placeName = placeMatch
    ? decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
    : undefined;

  if (atMatch) {
    return {
      lat: parseFloat(atMatch[1]),
      lng: parseFloat(atMatch[2]),
      placeName,
    };
  }
  if (qMatch) {
    return {
      lat: parseFloat(qMatch[1]),
      lng: parseFloat(qMatch[2]),
      placeName,
    };
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  try {
    if (format === 'kml') {
      const kmlPath = path.join(
        process.cwd(),
        'public',
        'dom-nho-google-maps.kml'
      );
      const kmlContent = await fs.readFile(kmlPath, 'utf-8');
      return new NextResponse(kmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.google-earth.kml+xml; charset=utf-8',
          'Content-Disposition':
            'attachment; filename="dom-nho-google-maps.kml"',
        },
      });
    }

    const feedPath = path.join(process.cwd(), 'public', 'crawled-feed.json');
    const content = await fs.readFile(feedPath, 'utf-8');
    const parsed = JSON.parse(content);
    return NextResponse.json({
      ok: true,
      savedGoogleMapsPlaces: parsed.savedGoogleMapsPlaces || [],
      spots: parsed.spots || [],
      vetStations: parsed.vetStations || [],
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Error reading Google Maps places';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputUrl = String(body.url || '').trim();
    const rawNote = String(body.note || '').trim();

    if (!inputUrl.startsWith('http')) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Vui lòng dán đường dẫn (URL) hợp lệ từ Facebook, Instagram, Threads, TikTok, YouTube, Báo chí hoặc Google Maps.',
        },
        { status: 400 }
      );
    }

    const scrapedSpot = await scrapeRescueUrlWithCrawl4AI(inputUrl, rawNote);
    if (!scrapedSpot) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Crawl4AI không tìm thấy bài cứu hộ công khai hợp lệ hoặc ảnh thực tế trong đường dẫn này.',
        },
        { status: 400 }
      );
    }

    const detectedCoords = extractCoordsFromGoogleMapsUrl(inputUrl);
    const id = `crawl4ai-sync-${crypto.randomBytes(4).toString('hex')}`;
    const nowIso = new Date().toISOString();
    let spot = {
      ...scrapedSpot,
      id,
      authorId: 'usr_gmap_sync',
      hoursAgo: 0,
      verificationInfo: {
        ...scrapedSpot.verificationInfo!,
        provider: CRAWL4AI_PROVIDER,
        verifiedAt: nowIso,
      },
    };

    if (detectedCoords) {
      const formattedAddress =
        scrapedSpot.formattedAddress ||
        detectedCoords.placeName ||
        scrapedSpot.areaLabel ||
        'Địa điểm Google Maps';
      const mapLinks = buildGoogleMapsLinks(
        detectedCoords.lat,
        detectedCoords.lng,
        scrapedSpot.authorName || scrapedSpot.title,
        formattedAddress
      );
      spot = {
        ...spot,
        publicLat: detectedCoords.lat,
        publicLng: detectedCoords.lng,
        fuzzRadiusMeters: 150,
        areaLabel: formattedAddress,
        formattedAddress,
        hasExactLocation: true,
        isSavedToGoogleMaps: true,
        ...mapLinks,
      };
    }

    const savedPlace =
      spot.hasExactLocation && spot.googleMapsUrl
        ? {
            id: `gmap-place-${spot.id}`,
            spotId: spot.id,
            title: spot.title,
            address: spot.formattedAddress || spot.areaLabel,
            lat: spot.publicLat,
            lng: spot.publicLng,
            googleMapsUrl: spot.googleMapsUrl,
            sourcePlatform: spot.sourcePlatform,
            sourceUrl: spot.sourceUrl,
            savedAt: spot.createdAt,
            notes: spot.story,
            imageUrl: spot.images[0],
            isVerified: true,
            sourceDomain: spot.verificationInfo?.sourceDomain,
          }
        : null;

    return NextResponse.json({
      ok: true,
      modelUsed: CRAWL4AI_PROVIDER,
      spot,
      savedPlace,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Đồng bộ bài viết thất bại';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
