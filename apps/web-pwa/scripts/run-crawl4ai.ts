import fs from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateKml(spots: any[], vetStations: any[]): string {
  const spotMarks = spots
    .filter(
      (spot) =>
        spot.hasExactLocation &&
        Number.isFinite(spot.publicLat) &&
        Number.isFinite(spot.publicLng) &&
        Math.abs(spot.publicLat) > 0.1 &&
        Math.abs(spot.publicLng) > 0.1
    )
    .map(
      (spot) => `
    <Placemark>
      <name>${escapeXml(spot.title)}</name>
      <description>${escapeXml(`${spot.story}\nNguồn: ${spot.sourceUrl || ''}`)}</description>
      <Point><coordinates>${spot.publicLng},${spot.publicLat},0</coordinates></Point>
    </Placemark>`
    )
    .join('');
  const vetMarks = vetStations
    .filter((vet) => Number.isFinite(vet.lat) && Number.isFinite(vet.lng))
    .map(
      (vet) => `
    <Placemark>
      <name>${escapeXml(vet.name)}</name>
      <description>${escapeXml(`${vet.address || ''}\n${vet.hotline || ''}`)}</description>
      <Point><coordinates>${vet.lng},${vet.lat},0</coordinates></Point>
    </Placemark>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Đốm Nhỏ — Dữ liệu Crawl4AI</name>${spotMarks}${vetMarks}
  </Document>
</kml>`;
}

async function main() {
  const {
    CRAWL4AI_PROVIDER,
    MAX_MONTHLY_CRAWL_SPOTS,
    MIN_MONTHLY_CRAWL_SPOTS,
    crawlRescuePostsWithCrawl4AI,
    createSavedGoogleMapsPlaces,
  } = await import('../src/lib/crawl4ai-crawler');
  const publicFeedPath = path.join(process.cwd(), 'public', 'crawled-feed.json');
  const bundledFeedPath = path.join(process.cwd(), 'src', 'lib', 'crawled-data.json');
  const kmlPath = path.join(process.cwd(), 'public', 'dom-nho-google-maps.kml');
  const current = JSON.parse(await fs.readFile(publicFeedPath, 'utf8'));

  console.log('Đang thu thập dữ liệu cứu hộ qua Crawl4AI...');
  const spots = await crawlRescuePostsWithCrawl4AI({
    targetPlatform: 'ALL',
    perQueryLimit: 10,
    minimumSpots: MIN_MONTHLY_CRAWL_SPOTS,
    maxSpots: MAX_MONTHLY_CRAWL_SPOTS,
    concurrency: 8,
    timeoutMs: 15 * 60_000,
  });

  const vetStations = Array.isArray(current.vetStations) ? current.vetStations : [];
  const retainedVetPlaces = Array.isArray(current.savedGoogleMapsPlaces)
    ? current.savedGoogleMapsPlaces.filter(
        (place: any) => place.sourcePlatform === 'GOOGLE_MAPS' && !place.spotId
      )
    : [];
  const payload = {
    crawledAt: new Date().toISOString(),
    crawlProvider: CRAWL4AI_PROVIDER,
    crawlMode: 'MONTHLY',
    minimumArticleTarget: MIN_MONTHLY_CRAWL_SPOTS,
    verifiedArticlesCount: spots.length,
    verifiedVetStationsCount: vetStations.length,
    spots,
    vetStations,
    savedGoogleMapsPlaces: [
      ...createSavedGoogleMapsPlaces(spots),
      ...retainedVetPlaces,
    ],
  };
  const serialized = JSON.stringify(payload, null, 2);

  await Promise.all([
    fs.writeFile(publicFeedPath, serialized, 'utf8'),
    fs.writeFile(bundledFeedPath, serialized, 'utf8'),
    fs.writeFile(kmlPath, generateKml(spots, vetStations), 'utf8'),
  ]);
  console.log(
    `Hoàn tất: ${spots.length} bài Crawl4AI và ${vetStations.length} cơ sở thú y.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
