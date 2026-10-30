import https from 'node:https';
import http from 'node:http';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {
  CrawlPlatform,
  DomSpot,
  EntityCategory,
  PlatformFilter,
  SavedGoogleMapPlace,
  detectPlatformFromUrl,
  getFriendlySourceName,
} from './types';
import {
  filterTrustedSpots,
  hasSpecificAddress,
  isForbiddenImageUrl,
} from './spot-validation';

export const GEMINI_API_KEY =
  'AQ.Ab8RN6Ip0zG0UgwbGaZVQXA6LZ1MWT2It5NzlWHFmLDHFK904w';
export const GEMINI_MODEL = 'gemini-2.5-flash';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SOCIAL_BOT_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
const TELEGRAM_BOT_UA = 'TelegramBot (like TwitterBot)';

export interface VerifiedScrapedPost {
  url: string;
  canonicalUrl: string;
  domain: string;
  platform: CrawlPlatform;
  title: string;
  description: string;
  bodyText: string;
  authorHandleOrName?: string;
  authorUrl?: string;
  images: string[];
  publishedDate: string | null;
  discoveredSocialLinks: string[];
}

export function httpFetchRaw(
  urlStr: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
  } = {},
  bodyStr: string | null = null,
  redirectCount = 0
): Promise<{
  status: number;
  text: string;
  finalUrl: string;
  headers: http.IncomingHttpHeaders;
}> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 6) {
      reject(new Error('Too many redirects'));
      return;
    }
    let urlObj: URL;
    try {
      urlObj = new URL(urlStr);
    } catch (e) {
      reject(e);
      return;
    }
    const lib = urlObj.protocol === 'https:' ? https : http;
    const isPost = (options.method || 'GET') === 'POST';
    const headers: Record<string, string> = {
      'User-Agent': BROWSER_UA,
      Accept:
        'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      ...(isPost ? {} : { 'Accept-Encoding': 'gzip, deflate' }),
      ...(options.headers || {}),
    };
    if (bodyStr) {
      headers['Content-Length'] = String(Buffer.byteLength(bodyStr, 'utf-8'));
    }

    const req = lib.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const nextUrl = new URL(res.headers.location, urlStr).toString();
          resolve(httpFetchRaw(nextUrl, options, bodyStr, redirectCount + 1));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          const enc = res.headers['content-encoding'];
          let text = '';
          try {
            if (enc === 'gzip') text = zlib.gunzipSync(raw).toString('utf-8');
            else if (enc === 'deflate')
              text = zlib.inflateSync(raw).toString('utf-8');
            else text = raw.toString('utf-8');
          } catch {
            text = raw.toString('utf-8');
          }
          resolve({
            status: res.statusCode || 0,
            text,
            finalUrl: urlStr,
            headers: res.headers,
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(options.timeout || 15000, () => {
      req.destroy(new Error('Request timeout'));
    });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

export function decodeHtmlEntities(str = ''): string {
  return str
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\s+/g, ' ')
    .trim();
}

export function verifyImageHttp200(
  imgUrl: string,
  redirectCount = 0
): Promise<boolean> {
  return new Promise((resolve) => {
    if (
      !imgUrl ||
      !imgUrl.startsWith('http') ||
      isForbiddenImageUrl(imgUrl) ||
      redirectCount > 4
    ) {
      resolve(false);
      return;
    }
    try {
      const u = new URL(imgUrl);
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          method: 'GET',
          headers: {
            'User-Agent': BROWSER_UA,
            Range: 'bytes=0-1024',
          },
        },
        (res) => {
          req.destroy();
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            const next = new URL(res.headers.location, imgUrl).toString();
            resolve(verifyImageHttp200(next, redirectCount + 1));
            return;
          }
          const ct = String(res.headers['content-type'] || '').toLowerCase();
          const ok =
            (res.statusCode === 200 || res.statusCode === 206) &&
            (ct.includes('image') ||
              /\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(imgUrl));
          resolve(Boolean(ok));
        }
      );
      req.on('error', () => resolve(false));
      req.setTimeout(7000, () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function extractMetaContent(html: string, keys: string[]): string {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const r1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      'i'
    );
    const m1 = html.match(r1)?.[1];
    if (m1) return decodeHtmlEntities(m1);

    const r2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
      'i'
    );
    const m2 = html.match(r2)?.[1];
    if (m2) return decodeHtmlEntities(m2);
  }
  return '';
}

export function extractPublishedDateFromHtml(
  html: string,
  url: string,
  imgUrl: string
): string | null {
  const metaMatch =
    extractMetaContent(html, [
      'article:published_time',
      'og:updated_time',
      'pubdate',
      'publishdate',
      'datePublished',
      'uploadDate',
    ]) ||
    html.match(/"(?:datePublished|uploadDate|createDate)"\s*:\s*"([^"]+)"/i)?.[1];

  if (metaMatch && !Number.isNaN(Date.parse(metaMatch))) {
    return new Date(metaMatch).toISOString();
  }

  const unixCreateMatch =
    html.match(/"(?:createTime|publish_time|creation_time|taken_at_timestamp)"\s*:\s*"?(\d{10})"?/)?.[1];
  if (unixCreateMatch) {
    const ms = Number(unixCreateMatch) * 1000;
    if (ms > 1577836800000 && ms <= Date.now() + 86400000) {
      return new Date(ms).toISOString();
    }
  }

  const pathDateMatch = `${url} ${imgUrl}`.match(
    /\/(202\d)\/(\d{1,2})\/(\d{1,2})\//
  );
  if (pathDateMatch) {
    const [, y, m, d] = pathDateMatch;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T09:00:00+07:00`;
    if (!Number.isNaN(Date.parse(iso))) return new Date(iso).toISOString();
  }

  const vnNewsIdMatch = url.match(/-(?:185|215|202)(\d{2})(\d{2})(\d{2})\d+\.(?:htm|chn|html)/i);
  if (vnNewsIdMatch) {
    const [, yy, mm, dd] = vnNewsIdMatch;
    const iso = `20${yy}-${mm}-${dd}T09:00:00+07:00`;
    if (!Number.isNaN(Date.parse(iso))) return new Date(iso).toISOString();
  }

  return null;
}

function extractSocialLinksFromHtml(html: string): string[] {
  const found = new Set<string>();
  const regex =
    /https?:\/\/(?:www\.|m\.)?(?:facebook\.com|instagram\.com|threads\.net|threads\.com|tiktok\.com)\/[^\s"'<>\\)]+/gi;
  for (const m of html.matchAll(regex)) {
    const link = decodeHtmlEntities(m[0]).replace(/[.,;]+$/, '');
    const lower = link.toLowerCase();
    if (
      lower.includes('sharer.php') ||
      lower.includes('share.php') ||
      lower.includes('/plugins/') ||
      lower.includes('/tr?') ||
      lower.includes('facebook.com/dialog')
    ) {
      continue;
    }
    found.add(link);
  }
  return [...found].slice(0, 6);
}

async function extractTikTokPost(url: string): Promise<VerifiedScrapedPost | null> {
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const oRes = await httpFetchRaw(oembedUrl, { timeout: 10000 });
    let title = '';
    let authorName = '';
    let authorUrl = '';
    const images: string[] = [];

    if (oRes.status === 200) {
      const data = JSON.parse(oRes.text);
      title = decodeHtmlEntities(data.title || '');
      authorName = decodeHtmlEntities(data.author_name || '');
      authorUrl = data.author_url || '';
      if (data.thumbnail_url && (await verifyImageHttp200(data.thumbnail_url))) {
        images.push(data.thumbnail_url);
      }
    }

    let publishedDate: string | null = null;
    let finalUrl = url;
    try {
      const pageRes = await httpFetchRaw(url, {
        timeout: 10000,
        headers: { 'User-Agent': TELEGRAM_BOT_UA },
      });
      if (pageRes.status === 200) {
        finalUrl = pageRes.finalUrl || url;
        if (!title) {
          title = extractMetaContent(pageRes.text, ['og:title', 'twitter:title']);
        }
        const desc = extractMetaContent(pageRes.text, [
          'og:description',
          'description',
        ]);
        if (desc && desc.length > title.length) {
          title = desc;
        }
        if (images.length === 0) {
          const ogImg = extractMetaContent(pageRes.text, [
            'og:image',
            'twitter:image',
          ]);
          if (ogImg && (await verifyImageHttp200(ogImg))) {
            images.push(ogImg);
          }
        }
        publishedDate = extractPublishedDateFromHtml(
          pageRes.text,
          finalUrl,
          images[0] || ''
        );
      }
    } catch {
      // ignore html fallback error if oEmbed succeeded
    }

    if (!title || images.length === 0) return null;

    return {
      url,
      canonicalUrl: finalUrl,
      domain: 'tiktok.com',
      platform: 'TIKTOK',
      title,
      description: title,
      bodyText: `${title} (Kênh TikTok: ${authorName || 'TikTok'} ${authorUrl})`,
      authorHandleOrName: authorName ? `TikTok @${authorName}` : 'TikTok',
      authorUrl: authorUrl || finalUrl,
      images,
      publishedDate: publishedDate || new Date().toISOString(),
      discoveredSocialLinks: [],
    };
  } catch {
    return null;
  }
}

async function extractYouTubePost(url: string): Promise<VerifiedScrapedPost | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      url
    )}&format=json`;
    const oRes = await httpFetchRaw(oembedUrl, { timeout: 10000 });
    if (oRes.status !== 200) return null;
    const data = JSON.parse(oRes.text);
    const title = decodeHtmlEntities(data.title || '');
    const authorName = decodeHtmlEntities(data.author_name || '');
    const authorUrl = data.author_url || '';
    const thumb = data.thumbnail_url || '';
    if (!title || !thumb || !(await verifyImageHttp200(thumb))) return null;

    let desc = title;
    let publishedDate: string | null = null;
    try {
      const pageRes = await httpFetchRaw(url, { timeout: 10000 });
      if (pageRes.status === 200) {
        desc =
          extractMetaContent(pageRes.text, ['og:description', 'description']) ||
          title;
        publishedDate = extractPublishedDateFromHtml(pageRes.text, url, thumb);
      }
    } catch {
      // ignore
    }

    return {
      url,
      canonicalUrl: url,
      domain: 'youtube.com',
      platform: 'YOUTUBE',
      title,
      description: desc,
      bodyText: `${title}. ${desc}`,
      authorHandleOrName: authorName || 'YouTube',
      authorUrl: authorUrl || url,
      images: [thumb],
      publishedDate: publishedDate || new Date().toISOString(),
      discoveredSocialLinks: [],
    };
  } catch {
    return null;
  }
}

async function extractSocialMetaPost(
  url: string,
  platform: 'FACEBOOK' | 'INSTAGRAM' | 'THREADS'
): Promise<VerifiedScrapedPost | null> {
  const userAgentsToTry = [SOCIAL_BOT_UA, TELEGRAM_BOT_UA, BROWSER_UA];

  for (const ua of userAgentsToTry) {
    try {
      const page = await httpFetchRaw(url, {
        timeout: 12000,
        headers: { 'User-Agent': ua },
      });
      if (page.status < 200 || page.status >= 400) continue;

      const canonicalUrl =
        decodeHtmlEntities(
          page.text.match(
            /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
          )?.[1] || extractMetaContent(page.text, ['og:url'])
        ) || page.finalUrl;

      const ogTitle =
        extractMetaContent(page.text, ['og:title', 'twitter:title']) ||
        decodeHtmlEntities(
          page.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''
        );

      const ogDesc = extractMetaContent(page.text, [
        'og:description',
        'twitter:description',
        'description',
      ]);

      const ogImage = extractMetaContent(page.text, [
        'og:image',
        'twitter:image',
        'og:image:secure_url',
      ]);

      if (!ogImage || isForbiddenImageUrl(ogImage)) continue;
      const imgOk = await verifyImageHttp200(ogImage);
      if (!imgOk) continue;

      const combinedText = `${ogTitle} ${ogDesc}`.trim();
      if (
        !combinedText ||
        combinedText.toLowerCase() === 'instagram' ||
        combinedText.toLowerCase() === 'facebook' ||
        combinedText.toLowerCase() === 'threads' ||
        combinedText.toLowerCase().includes('log in or sign up')
      ) {
        continue;
      }

      const handleMatch =
        canonicalUrl.match(/threads\.(?:net|com)\/@([^/?#]+)/i)?.[1] ||
        canonicalUrl.match(/instagram\.com\/(?!p\/|reel\/|explore\/)([^/?#]+)/i)?.[1] ||
        canonicalUrl.match(/facebook\.com\/(?!share\/|permalink\.php|story\.php|groups\/)([^/?#]+)/i)?.[1];

      const publishedDate =
        extractPublishedDateFromHtml(page.text, canonicalUrl, ogImage) ||
        new Date().toISOString();

      const domain = new URL(canonicalUrl).hostname.replace(/^www\./, '');
      const platformLabel =
        platform === 'FACEBOOK'
          ? 'Facebook'
          : platform === 'INSTAGRAM'
          ? 'Instagram'
          : 'Threads';

      return {
        url,
        canonicalUrl,
        domain,
        platform,
        title: ogTitle.length > 12 ? ogTitle : ogDesc.slice(0, 110),
        description: ogDesc || ogTitle,
        bodyText: `${ogTitle}. ${ogDesc}`,
        authorHandleOrName: handleMatch
          ? `${platformLabel} @${handleMatch}`
          : ogTitle.split(/[-|•:]/)[0]?.trim() || platformLabel,
        authorUrl: canonicalUrl,
        images: [ogImage],
        publishedDate,
        discoveredSocialLinks: [],
      };
    } catch {
      // try next UA
    }
  }
  return null;
}

export async function extractVerifiedPostFromUrl(
  url: string
): Promise<VerifiedScrapedPost | null> {
  const platform = detectPlatformFromUrl(url, 'SOCIAL_MEDIA');

  if (platform === 'TIKTOK') {
    return extractTikTokPost(url);
  }
  if (platform === 'YOUTUBE') {
    return extractYouTubePost(url);
  }
  if (
    platform === 'FACEBOOK' ||
    platform === 'INSTAGRAM' ||
    platform === 'THREADS'
  ) {
    return extractSocialMetaPost(url, platform);
  }

  try {
    const page = await httpFetchRaw(url, { timeout: 12000 });
    if (page.status !== 200) return null;

    const canonicalUrl =
      decodeHtmlEntities(
        page.text.match(
          /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
        )?.[1] || extractMetaContent(page.text, ['og:url'])
      ) || page.finalUrl;

    const ogTitle =
      extractMetaContent(page.text, ['og:title', 'twitter:title']) ||
      decodeHtmlEntities(
        page.text
          .match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
          ?.replace(/<[^>]+>/g, '') ||
          page.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
          ''
      );

    const ogDesc = extractMetaContent(page.text, [
      'og:description',
      'twitter:description',
      'description',
    ]);

    const ogImage = extractMetaContent(page.text, [
      'og:image',
      'twitter:image',
    ]);

    if (!ogTitle || !ogImage || isForbiddenImageUrl(ogImage)) return null;
    if (!(await verifyImageHttp200(ogImage))) return null;

    const rawBodyImgs = [
      ...page.text.matchAll(
        /<img[^>]+(?:src|data-src)=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi
      ),
    ]
      .map((m) => decodeHtmlEntities(m[1]))
      .filter(
        (img) =>
          img !== ogImage &&
          !isForbiddenImageUrl(img) &&
          !img.toLowerCase().includes('logo') &&
          !img.toLowerCase().includes('icon') &&
          !img.toLowerCase().includes('avatar') &&
          !img.toLowerCase().includes('banner') &&
          !img.toLowerCase().includes('zoom/220') &&
          !img.toLowerCase().includes('zoom/36') &&
          !img.toLowerCase().includes('width=260')
      );

    const verifiedImages = [ogImage];
    for (const extraImg of [...new Set(rawBodyImgs)].slice(0, 2)) {
      if (await verifyImageHttp200(extraImg)) {
        verifiedImages.push(extraImg);
      }
      if (verifiedImages.length >= 3) break;
    }

    const paragraphs = [...page.text.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ' ')))
      .filter(
        (p) =>
          p.length > 45 &&
          !p.includes('Bản quyền') &&
          !p.includes('Giấy phép')
      )
      .slice(0, 8)
      .join(' ')
      .slice(0, 750);

    const domain = new URL(canonicalUrl).hostname.replace(/^www\./, '');
    const publishedDate = extractPublishedDateFromHtml(
      page.text,
      canonicalUrl,
      ogImage
    );
    const discoveredSocialLinks = extractSocialLinksFromHtml(page.text);

    return {
      url,
      canonicalUrl,
      domain,
      platform: detectPlatformFromUrl(canonicalUrl, 'SOCIAL_MEDIA'),
      title: ogTitle,
      description: ogDesc,
      bodyText: paragraphs || ogDesc,
      images: verifiedImages,
      publishedDate,
      discoveredSocialLinks,
    };
  } catch {
    return null;
  }
}

export function isRelevantVietnamPetText(text: string): boolean {
  const lower = text.toLowerCase();
  const hasPetKeyword =
    lower.includes('chó') ||
    lower.includes('mèo') ||
    lower.includes('thú cưng') ||
    lower.includes('cứu hộ') ||
    lower.includes('nhận nuôi') ||
    lower.includes('mái ấm') ||
    lower.includes('thất lạc');
  if (!hasPetKeyword) return false;

  const forbiddenTopics = [
    'giết thịt',
    'lò mổ',
    'thịt chó',
    'thịt mèo',
    'dubai',
    'trung quốc',
    'venezuela',
    '32 tỷ',
    'cá cược',
  ];
  if (forbiddenTopics.some((kw) => lower.includes(kw))) return false;
  return true;
}

export async function discoverMultiPlatformCandidateUrls(
  targetPlatforms: PlatformFilter = 'ALL'
): Promise<string[]> {
  const queriesByPlatform: Record<string, string[]> = {
    FACEBOOK: [
      'site:facebook.com "cứu hộ chó mèo" TPHCM OR Hà Nội OR Đà Nẵng',
      'site:facebook.com "tìm chó lạc" OR "tìm mèo lạc" liên hệ',
      'site:facebook.com "nhận nuôi chó mèo" trạm cứu hộ',
    ],
    INSTAGRAM: [
      'site:instagram.com "cứu hộ chó mèo" OR "nhận nuôi mèo" Sài Gòn OR Hà Nội',
      'site:instagram.com "trạm cứu hộ chó mèo" OR "tìm chó lạc"',
    ],
    THREADS: [
      'site:threads.net "cứu hộ chó mèo" OR "tìm mèo lạc" OR "tìm chó lạc"',
      'site:threads.net "nhận nuôi mèo" OR "nhận nuôi chó" Sài Gòn OR Hà Nội',
    ],
    TIKTOK: [
      'site:tiktok.com "cứu hộ chó mèo" TPHCM OR Hà Nội OR Đà Nẵng',
      'site:tiktok.com "trạm cứu hộ chó mèo" OR "nhận nuôi chó mèo"',
      'site:tiktok.com "tìm chó lạc" OR "tìm mèo lạc"',
    ],
    YOUTUBE: [
      'site:youtube.com "trạm cứu hộ chó mèo" Việt Nam',
      'site:youtube.com "cứu hộ chó mèo" Sài Gòn OR Hà Nội',
    ],
    SOCIAL_MEDIA: [
      'cứu hộ chó mèo TPHCM',
      'trạm cứu hộ chó mèo nhận nuôi Hà Nội Đà Nẵng',
      'tìm chủ nhân chó lạc mèo lạc TPHCM',
      'mái ấm cưu mang chó mèo bị bỏ rơi',
      'sinh viên cứu hộ chó mèo bị bỏ rơi',
    ],
  };

  let activeQueries: string[] = [];
  if (targetPlatforms === 'ALL' || targetPlatforms === 'RESCUE_PORTAL') {
    activeQueries = [
      ...queriesByPlatform.FACEBOOK,
      ...queriesByPlatform.INSTAGRAM,
      ...queriesByPlatform.THREADS,
      ...queriesByPlatform.TIKTOK,
      ...queriesByPlatform.YOUTUBE,
      ...queriesByPlatform.SOCIAL_MEDIA,
    ];
  } else if (queriesByPlatform[targetPlatforms]) {
    activeQueries = queriesByPlatform[targetPlatforms];
  } else {
    activeQueries = queriesByPlatform.SOCIAL_MEDIA;
  }

  const rssUrls = activeQueries.map(
    (q) =>
      `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss`
  );
  const webRssUrls = activeQueries.map(
    (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&format=rss`
  );

  const allFeedUrls = [...rssUrls, ...webRssUrls];
  const responses = await Promise.allSettled(
    allFeedUrls.map((u) => httpFetchRaw(u, { timeout: 9000 }))
  );

  const discovered = new Set<string>();
  for (const r of responses) {
    if (r.status !== 'fulfilled' || r.value.status !== 200) continue;
    const items = [...r.value.text.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    for (const it of items.slice(0, 5)) {
      const linkXml = it[1].match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
      const urlMatch = linkXml.match(/(?:[?&]|&amp;)url=([^&]+)/);
      const rawCandidate = urlMatch
        ? decodeURIComponent(urlMatch[1])
        : decodeHtmlEntities(linkXml);

      if (
        rawCandidate &&
        rawCandidate.startsWith('http') &&
        !rawCandidate.includes('bing.com') &&
        !rawCandidate.includes('msn.com') &&
        !rawCandidate.includes('microsoft.com')
      ) {
        discovered.add(rawCandidate);
      }
    }
  }

  return [...discovered];
}

export async function geocodeAddressVietnamStrict(
  queryText: string
): Promise<{ lat: number; lng: number; matchedAddress: string } | null> {
  if (!queryText || !hasSpecificAddress(queryText)) return null;
  try {
    const arcUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=${encodeURIComponent(
      `${queryText}, Việt Nam`
    )}&countryCode=VNM&maxLocations=1`;
    const res = await httpFetchRaw(arcUrl, { timeout: 9000 });
    if (res.status === 200) {
      const parsed = JSON.parse(res.text);
      const cand = parsed?.candidates?.[0];
      if (cand?.location && (cand.score ?? 0) >= 75) {
        return {
          lat: Number(Number(cand.location.y).toFixed(6)),
          lng: Number(Number(cand.location.x).toFixed(6)),
          matchedAddress: cand.address || queryText,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function buildGoogleMapsLinks(
  lat: number,
  lng: number,
  placeTitle: string,
  address: string
) {
  const query = encodeURIComponent(
    `${placeTitle || ''} ${address || ''}`.trim()
  );
  return {
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${query}`,
    googleMapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=two-wheeler`,
    googleMapsEmbedUrl: `https://maps.google.com/maps?q=${lat},${lng}&hl=vi&z=16&output=embed`,
  };
}

export async function filterAndStructurePostsWithGemini(
  verifiedPosts: VerifiedScrapedPost[]
): Promise<{ spots: DomSpot[]; savedPlaces: SavedGoogleMapPlace[] }> {
  if (verifiedPosts.length === 0) {
    return { spots: [], savedPlaces: [] };
  }

  const prompt = `Bạn là Hệ thống Kiểm Duyệt & Phân Loại Đa Nguồn (Facebook, Instagram, Threads, TikTok, YouTube, Báo chí, Cổng Cứu Hộ) của dự án "Đốm Nhỏ".
Dưới đây là các bài đăng thực tế đã thu thập:
${verifiedPosts
  .map(
    (p, idx) =>
      `[${idx}] Nền tảng: ${p.platform} (${p.domain}) | Tác giả: ${
        p.authorHandleOrName || p.domain
      } | Ngày đăng: ${p.publishedDate || 'Không rõ'} | Tiêu đề: ${
        p.title
      } | Mô tả: ${p.description} | Nội dung: ${p.bodyText}`
  )
  .join('\n\n')}

QUY TẮC BẮT BUỘC ("Thà ít mà chắc"):
1. Chỉ trích xuất thông tin DỰA TRÊN ĐÚNG NỘI DUNG BÀI ĐĂNG GỐC ở trên, tuyệt đối không bịa đặt thông tin ảo.
2. Phân loại chính xác "entityCategory":
   - "RESCUE_CENTER": Trung tâm cứu trợ, trạm cứu hộ, mái ấm nhận nuôi chó mèo, fanpage/kênh chính thức của trạm cứu hộ tại Việt Nam.
   - "INDIVIDUAL_PET": Bài đăng tìm kiếm thú lạc, cứu hộ khẩn cấp, hoặc tìm người nhận nuôi cho cá thể thú cưng cụ thể tại Việt Nam.
   - "REJECT": Bài tổng hợp chung chung, quảng cáo bán thú cưng thương mại, tin nước ngoài, hoặc không liên quan cứu hộ/tìm kiếm/nhận nuôi chó mèo tại Việt Nam.
3. Kiểm tra địa chỉ cụ thể ("hasExactAddress"):
   - Đặt "hasExactAddress": true CHỈ KHI bài đăng nêu rõ số nhà, tên đường/phố/hẻm, tên phường/xã/thị trấn hoặc địa danh/trường học/cơ quan cụ thể.
   - Nếu bài đăng chỉ nêu tên Tỉnh/Thành phố hoặc Quận/Huyện chung chung mà không có địa chỉ cụ thể -> BẮT BUỘC đặt "hasExactAddress": false và "specificAddress": "". Tuyệt đối không tự gán địa chỉ bừa bãi.
4. Trích xuất thông tin nơi liên hệ trong bài viết vào "contactInfo" (tên Fanpage Facebook, tài khoản Instagram/Threads/TikTok, SĐT hoặc địa chỉ liên hệ trực tiếp).

Trả về JSON:
{
  "items": [
    {
      "articleIndex": 0,
      "entityCategory": "RESCUE_CENTER | INDIVIDUAL_PET | REJECT",
      "hasExactAddress": true,
      "specificAddress": "Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành (hoặc chuỗi rỗng nếu không rõ)",
      "generalArea": "Tỉnh/Thành phố hoặc khu vực chung nêu trong bài",
      "contactInfo": "Hướng dẫn nơi liên hệ thực tế của trạm hoặc người đăng trong bài",
      "spotType": "RED_SOS | ORANGE_SIGHT | YELLOW_ADOPT | GREEN_PEACE",
      "authorName": "Tên trạm cứu hộ / Fanpage / Kênh thực tế trong bài",
      "species": "cat | dog",
      "breed": "string",
      "coatColor": "string",
      "traits": ["string"],
      "story": "Tóm tắt chuẩn xác 2 câu đúng nội dung bài gốc"
    }
  ]
}`;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    GEMINI_API_KEY
  )}`;
  const gRes = await httpFetchRaw(
    geminiUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    },
    JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.05,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    })
  );

  if (gRes.status < 200 || gRes.status >= 300) {
    return { spots: [], savedPlaces: [] };
  }

  const parsedG = JSON.parse(gRes.text);
  const outText =
    parsedG?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p.text || '')
      .join('\n') || '{}';
  const firstB = outText.indexOf('{');
  const lastB = outText.lastIndexOf('}');
  if (firstB === -1 || lastB === -1) {
    return { spots: [], savedPlaces: [] };
  }
  const extracted = JSON.parse(outText.slice(firstB, lastB + 1));

  const newSpots: DomSpot[] = [];
  const newSavedPlaces: SavedGoogleMapPlace[] = [];

  for (const it of extracted.items || []) {
    const post = verifiedPosts[it.articleIndex];
    if (!post) continue;
    if (
      it.entityCategory !== 'RESCUE_CENTER' &&
      it.entityCategory !== 'INDIVIDUAL_PET'
    ) {
      continue;
    }

    const specificAddr = String(it.specificAddress || '').trim();
    const canGeocode =
      Boolean(it.hasExactAddress) && hasSpecificAddress(specificAddr);
    const geo = canGeocode
      ? await geocodeAddressVietnamStrict(specificAddr)
      : null;
    const hasExactLocation = Boolean(geo);

    const hash = crypto
      .createHash('sha1')
      .update(post.canonicalUrl)
      .digest('hex')
      .slice(0, 8);
    const category = it.entityCategory as EntityCategory;
    const sourceFriendly = getFriendlySourceName(
      post.domain,
      post.authorHandleOrName || post.domain,
      post.canonicalUrl
    );
    const detectedPlatform = detectPlatformFromUrl(
      post.canonicalUrl,
      category === 'RESCUE_CENTER' ? 'RESCUE_PORTAL' : post.platform
    );
    const finalPlatform: CrawlPlatform =
      detectedPlatform !== 'SOCIAL_MEDIA'
        ? detectedPlatform
        : category === 'RESCUE_CENTER'
        ? 'RESCUE_PORTAL'
        : 'SOCIAL_MEDIA';

    const gmapLinks = geo
      ? buildGoogleMapsLinks(
          geo.lat,
          geo.lng,
          it.authorName || post.title,
          specificAddr
        )
      : {
          googleMapsUrl: undefined,
          googleMapsDirectionsUrl: undefined,
          googleMapsEmbedUrl: undefined,
        };

    const candidateSpot: DomSpot = {
      id: `verified-${hash}-live`,
      authorId: `verified_${hash}`,
      authorName:
        it.authorName || post.authorHandleOrName || sourceFriendly,
      entityCategory: category,
      publishedDate: post.publishedDate || undefined,
      spotType: it.spotType || 'ORANGE_SIGHT',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
      title: post.title,
      story: it.story || post.description,
      species: it.species === 'cat' ? 'cat' : 'dog',
      breed:
        it.breed ||
        (category === 'RESCUE_CENTER'
          ? 'Trung tâm cứu trợ & nhận nuôi'
          : 'Thú cưng cần hỗ trợ'),
      coatColor: it.coatColor || 'Xem ảnh thực tế trong bài',
      traits: Array.isArray(it.traits) ? it.traits.slice(0, 3) : [],
      images: post.images,
      publicLat: geo ? geo.lat : 0,
      publicLng: geo ? geo.lng : 0,
      fuzzRadiusMeters: geo ? 150 : 0,
      areaLabel:
        (hasExactLocation
          ? specificAddr
          : String(it.generalArea || '').trim()) || 'Việt Nam',
      formattedAddress: hasExactLocation ? specificAddr : '',
      hasExactLocation,
      ...gmapLinks,
      isSavedToGoogleMaps: hasExactLocation,
      lightPower: 165,
      boostCount: 12,
      allowFoster: category === 'RESCUE_CENTER',
      maskedPhone: `Liên hệ tại ${sourceFriendly}`,
      rawPhoneSecret:
        String(it.contactInfo || '').trim() ||
        `Liên hệ trực tiếp tại bài gốc trên ${sourceFriendly}`,
      sourceType: 'FB_CRAWLER',
      sourcePlatform: finalPlatform,
      sourceUrl: post.canonicalUrl,
      isVerified: true,
      verificationInfo: {
        httpStatus: 200,
        imageHttpStatus: 200,
        verifiedAt: new Date().toISOString(),
        geminiModel: GEMINI_MODEL,
        sourceDomain: post.domain,
        canonicalUrl: post.canonicalUrl,
        imageCount: post.images.length,
      },
      hoursAgo: 1,
      createdAt: post.publishedDate || new Date().toISOString(),
      sightings: [],
    };

    const validated = filterTrustedSpots([candidateSpot]);
    if (validated.length > 0) {
      const validSpot = validated[0];
      newSpots.push(validSpot);
      if (hasExactLocation && geo) {
        newSavedPlaces.push({
          id: `gmap-place-${validSpot.id}`,
          spotId: validSpot.id,
          title: validSpot.title,
          address: specificAddr,
          lat: geo.lat,
          lng: geo.lng,
          googleMapsUrl:
            gmapLinks.googleMapsUrl ||
            `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`,
          sourcePlatform: finalPlatform,
          sourceUrl: validSpot.sourceUrl,
          savedAt: validSpot.createdAt,
          notes: validSpot.story,
          imageUrl: validSpot.images[0],
          isVerified: true,
          sourceDomain: post.domain,
        });
      }
    }
  }

  return { spots: newSpots, savedPlaces: newSavedPlaces };
}

