import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { hasSpecificAddress } from '@/lib/spot-validation';
import {
  CrawlPlatform,
  detectPlatformFromUrl,
  getFriendlySourceName,
} from '@/lib/types';
import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  buildGoogleMapsLinks,
  extractVerifiedPostFromUrl,
  geocodeAddressVietnamStrict,
  httpFetchRaw,
} from '@/lib/multi-source-crawler';

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
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Error reading Google Maps places' },
      { status: 500 }
    );
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

    const detectedCoords = extractCoordsFromGoogleMapsUrl(inputUrl);
    const scrapedPost = await extractVerifiedPostFromUrl(inputUrl);

    if (!scrapedPost || scrapedPost.images.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Không thể truy cập hoặc không tìm thấy hình ảnh thực tế trong đường dẫn này. Vui lòng kiểm tra bài viết ở chế độ công khai (Public).',
        },
        { status: 400 }
      );
    }

    const resolvedUrl = scrapedPost.canonicalUrl || inputUrl;
    const platform: CrawlPlatform = detectPlatformFromUrl(
      resolvedUrl,
      scrapedPost.platform
    );
    const sourceFriendly = getFriendlySourceName(
      scrapedPost.domain,
      scrapedPost.authorHandleOrName || scrapedPost.domain,
      resolvedUrl
    );

    const prompt = `Bạn là Hệ thống Kiểm Duyệt & Phân Loại Đa Nguồn (Facebook, Instagram, Threads, TikTok, YouTube, Báo chí, Google Maps) của dự án "Đốm Nhỏ".
Dưới đây là nội dung bài đăng / địa điểm từ ${sourceFriendly} (${platform}):
- URL gốc: ${resolvedUrl}
- Tác giả / Kênh: ${scrapedPost.authorHandleOrName || sourceFriendly}
- Tiêu đề gốc: ${scrapedPost.title}
- Mô tả gốc: ${scrapedPost.description}
- Nội dung chi tiết: ${scrapedPost.bodyText}
- Ghi chú bổ sung: ${rawNote}

QUY TẮC BẮT BUỘC:
1. Chỉ trích xuất thông tin DỰA TRÊN ĐÚNG NỘI DUNG GỐC ở trên, tuyệt đối không bịa đặt thông tin ảo.
2. Phân loại chính xác "entityCategory":
   - "RESCUE_CENTER": Trung tâm cứu trợ, trạm cứu hộ, mái ấm nhận nuôi chó mèo, điểm tiếp nhận cố định.
   - "INDIVIDUAL_PET": Bài viết tìm kiếm / cứu hộ / nhận nuôi cho cá thể thú cưng cụ thể.
3. Kiểm tra địa chỉ cụ thể ("hasExactAddress"):
   - Đặt "hasExactAddress": true CHỈ KHI bài viết có số nhà, tên đường/hẻm, phường/xã hoặc địa danh cụ thể.
   - Nếu không có địa chỉ cụ thể, đặt "hasExactAddress": false và "formattedAddress": "". Tuyệt đối không đoán mò địa chỉ.
Trả về JSON:
{
  "entityCategory": "RESCUE_CENTER | INDIVIDUAL_PET",
  "hasExactAddress": true,
  "spotType": "RED_SOS | ORANGE_SIGHT | YELLOW_ADOPT | GREEN_PEACE",
  "authorName": "Tên trạm cứu hộ / Fanpage / Kênh thực tế",
  "story": "Tóm tắt chuẩn xác 2 câu đúng nội dung bài viết gốc",
  "species": "cat | dog",
  "breed": "Giống loài hoặc loại hình trạm thực tế trong bài viết",
  "coatColor": "Màu lông hoặc đặc điểm thực tế trong bài viết",
  "traits": ["3 đặc điểm thực tế rút từ bài viết"],
  "areaLabel": "Khu vực Tỉnh/Thành phố hoặc Quận/Huyện thực tế",
  "formattedAddress": "Địa chỉ cụ thể thực tế trong bài viết (rỗng nếu không có)",
  "contactInfo": "Hướng dẫn nơi liên hệ thực tế trong bài viết"
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
      GEMINI_API_KEY
    )}`;

    const geminiRes = await httpFetchRaw(
      endpoint,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.05,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      })
    );

    const parsedApi = JSON.parse(geminiRes.text);
    const outText =
      parsedApi?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || '')
        .join('\n') || '{}';
    const firstBracket = outText.indexOf('{');
    const lastBracket = outText.lastIndexOf('}');
    const extracted = JSON.parse(outText.slice(firstBracket, lastBracket + 1));

    const candidateAddress = String(extracted.formattedAddress || '').trim();
    let hasExactLocation = false;
    let lat = 0;
    let lng = 0;
    let formattedAddress = '';

    if (detectedCoords) {
      hasExactLocation = true;
      lat = detectedCoords.lat;
      lng = detectedCoords.lng;
      formattedAddress =
        candidateAddress ||
        detectedCoords.placeName ||
        extracted.areaLabel ||
        'Địa điểm Google Maps';
    } else if (extracted.hasExactAddress && hasSpecificAddress(candidateAddress)) {
      const geo = await geocodeAddressVietnamStrict(candidateAddress);
      if (geo) {
        hasExactLocation = true;
        lat = geo.lat;
        lng = geo.lng;
        formattedAddress = candidateAddress;
      }
    }

    const gmapLinks = hasExactLocation
      ? buildGoogleMapsLinks(
          lat,
          lng,
          extracted.authorName || scrapedPost.title || rawNote,
          formattedAddress
        )
      : {
          googleMapsUrl: undefined,
          googleMapsDirectionsUrl: undefined,
          googleMapsEmbedUrl: undefined,
        };

    const isCat =
      extracted.species === 'cat' ||
      String(scrapedPost.title || rawNote)
        .toLowerCase()
        .includes('mèo');

    const entityCategory =
      extracted.entityCategory === 'RESCUE_CENTER'
        ? 'RESCUE_CENTER'
        : 'INDIVIDUAL_PET';
    const nowIso = new Date().toISOString();

    const finalPlatform: CrawlPlatform =
      platform !== 'SOCIAL_MEDIA'
        ? platform
        : entityCategory === 'RESCUE_CENTER'
        ? 'RESCUE_PORTAL'
        : 'SOCIAL_MEDIA';

    const newSpot = {
      id: `verified-sync-${crypto.randomBytes(3).toString('hex')}`,
      authorId: 'usr_gmap_sync',
      authorName:
        extracted.authorName ||
        scrapedPost.authorHandleOrName ||
        sourceFriendly,
      entityCategory,
      publishedDate: scrapedPost.publishedDate || nowIso,
      spotType: extracted.spotType || 'ORANGE_SIGHT',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      title: scrapedPost.title || rawNote || 'Bài viết thực tế',
      story: extracted.story || scrapedPost.description || rawNote,
      species: isCat ? 'cat' : 'dog',
      breed:
        extracted.breed ||
        (entityCategory === 'RESCUE_CENTER'
          ? 'Trung tâm cứu trợ & nhận nuôi'
          : isCat
          ? 'Mèo'
          : 'Chó'),
      coatColor: extracted.coatColor || 'Xem ảnh thực tế trong bài',
      traits: Array.isArray(extracted.traits) ? extracted.traits : [],
      images: scrapedPost.images,
      publicLat: lat,
      publicLng: lng,
      fuzzRadiusMeters: hasExactLocation ? 150 : 0,
      areaLabel:
        (hasExactLocation
          ? formattedAddress
          : String(extracted.areaLabel || '').trim()) ||
        'Chưa rõ địa chỉ cụ thể',
      formattedAddress,
      hasExactLocation,
      ...gmapLinks,
      isSavedToGoogleMaps: hasExactLocation,
      lightPower: 155,
      boostCount: 10,
      allowFoster: entityCategory === 'RESCUE_CENTER',
      maskedPhone: `Liên hệ tại ${sourceFriendly}`,
      rawPhoneSecret:
        String(extracted.contactInfo || '').trim() ||
        `Liên hệ trực tiếp tại bài gốc trên ${sourceFriendly}`,
      sourceType: 'FB_CRAWLER',
      sourcePlatform: finalPlatform,
      sourceUrl: resolvedUrl,
      isVerified: true,
      verificationInfo: {
        httpStatus: 200,
        imageHttpStatus: 200,
        verifiedAt: nowIso,
        geminiModel: GEMINI_MODEL,
        sourceDomain: scrapedPost.domain,
        canonicalUrl: resolvedUrl,
        imageCount: scrapedPost.images.length,
      },
      hoursAgo: 0,
      createdAt: scrapedPost.publishedDate || nowIso,
      sightings: [],
    };

    const newSavedPlace = hasExactLocation
      ? {
          id: `gmap-place-${newSpot.id}`,
          spotId: newSpot.id,
          title: newSpot.title,
          address: formattedAddress,
          lat,
          lng,
          googleMapsUrl: gmapLinks.googleMapsUrl || resolvedUrl,
          sourcePlatform: finalPlatform,
          sourceUrl: newSpot.sourceUrl,
          savedAt: newSpot.createdAt,
          notes: newSpot.story,
          imageUrl: scrapedPost.images[0],
          isVerified: true,
          sourceDomain: scrapedPost.domain,
        }
      : null;

    return NextResponse.json({
      ok: true,
      modelUsed: GEMINI_MODEL,
      spot: newSpot,
      savedPlace: newSavedPlace,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Đồng bộ bài viết thất bại' },
      { status: 500 }
    );
  }
}
