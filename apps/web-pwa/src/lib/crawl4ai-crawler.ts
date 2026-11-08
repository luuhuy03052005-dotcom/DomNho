import path from 'node:path';
import { spawn } from 'node:child_process';
import { DomSpot, PlatformFilter, CrawlPlatform } from '@/lib/types';
import { filterTrustedSpots, isValidHttpUrl } from '@/lib/spot-validation';

export const CRAWL4AI_PROVIDER = 'crawl4ai-v0.9.5';
export const MIN_MONTHLY_CRAWL_SPOTS = 50;
export const MAX_MONTHLY_CRAWL_SPOTS = 100;

const RESULT_PREFIX = '__CRAWL4AI_RESULT__';

interface WorkerCrawlResponse {
  ok: boolean;
  provider?: string;
  spots?: DomSpot[];
  spot?: DomSpot | null;
  diagnostics?: Record<string, unknown>;
  error?: string;
  detail?: string;
}

export interface Crawl4AIParams {
  targetPlatform?: PlatformFilter;
  customUrls?: string[];
  excludeUrls?: Iterable<string>;
  perQueryLimit?: number;
  minimumSpots?: number;
  maxSpots?: number;
  concurrency?: number;
  timeoutMs?: number;
}

function getWorkerScriptPath(): string {
  if (process.env.CRAWL4AI_WORKER_SCRIPT?.trim()) {
    return path.resolve(process.env.CRAWL4AI_WORKER_SCRIPT.trim());
  }
  return path.resolve(
    process.cwd(),
    '..',
    '..',
    'services',
    'crawl4ai-worker',
    'main.py'
  );
}

async function invokeRemoteWorker(
  mode: 'crawl' | 'scrape',
  payload: Record<string, unknown>,
  timeoutMs: number
): Promise<WorkerCrawlResponse> {
  const workerUrl = process.env.CRAWL4AI_WORKER_URL?.trim().replace(/\/$/, '');
  const workerToken = process.env.CRAWL4AI_WORKER_TOKEN?.trim();
  if (!workerUrl || !workerToken) {
    throw new Error(
      'CRAWL4AI_WORKER_URL và CRAWL4AI_WORKER_TOKEN chưa được cấu hình.'
    );
  }

  const response = await fetch(`${workerUrl}/${mode}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${workerToken}`,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const result = (await response.json().catch(() => ({}))) as WorkerCrawlResponse;
  if (!response.ok || !result.ok) {
    throw new Error(
      result.error || result.detail || `Crawl4AI worker trả về HTTP ${response.status}.`
    );
  }
  return result;
}

async function invokeLocalWorker(
  mode: 'crawl' | 'scrape',
  payload: Record<string, unknown>,
  timeoutMs: number
): Promise<WorkerCrawlResponse> {
  if (process.env.VERCEL) {
    throw new Error(
      'Cần cấu hình CRAWL4AI_WORKER_URL khi chạy trên Vercel; trình duyệt Crawl4AI không chạy trong route Node.'
    );
  }

  const python = process.env.CRAWL4AI_PYTHON_PATH?.trim() || 'python';
  const scriptPath = getWorkerScriptPath();

  return new Promise((resolve, reject) => {
    const child = spawn(
      python,
      [scriptPath, '--mode', mode, '--stdin-json'],
      {
        cwd: path.dirname(scriptPath),
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONUTF8: '1',
          PYTHONIOENCODING: 'utf-8',
          CRAWL4AI_NO_CLOUD_NOTICE: '1',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Crawl4AI worker quá thời gian ${Math.ceil(timeoutMs / 1000)} giây.`));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout = `${stdout}${chunk}`.slice(-6_000_000);
    });
    child.stderr.on('data', (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-200_000);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      const resultLine = stdout
        .split(/\r?\n/)
        .reverse()
        .find((line) => line.startsWith(RESULT_PREFIX));
      if (!resultLine) {
        reject(
          new Error(
            `Crawl4AI worker không trả dữ liệu JSON.${stderr ? ` ${stderr.trim().slice(-600)}` : ''}`
          )
        );
        return;
      }
      try {
        const result = JSON.parse(
          resultLine.slice(RESULT_PREFIX.length)
        ) as WorkerCrawlResponse;
        if (code !== 0 || !result.ok) {
          reject(new Error(result.error || stderr.trim() || 'Crawl4AI worker thất bại.'));
          return;
        }
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

async function invokeWorker(
  mode: 'crawl' | 'scrape',
  payload: Record<string, unknown>,
  timeoutMs: number
): Promise<WorkerCrawlResponse> {
  return process.env.CRAWL4AI_WORKER_URL?.trim()
    ? invokeRemoteWorker(mode, payload, timeoutMs)
    : invokeLocalWorker(mode, payload, timeoutMs);
}

export async function crawlRescuePostsWithCrawl4AI(
  params: Crawl4AIParams = {}
): Promise<DomSpot[]> {
  const minimumSpots = Math.max(0, params.minimumSpots || 0);
  const maxSpots = Math.max(
    minimumSpots,
    params.maxSpots || MAX_MONTHLY_CRAWL_SPOTS
  );
  const result = await invokeWorker(
    'crawl',
    {
      targetPlatform: params.targetPlatform || 'ALL',
      customUrls: params.customUrls || [],
      excludeUrls: [...(params.excludeUrls || [])],
      perQueryLimit: params.perQueryLimit || 10,
      minimumSpots,
      maxSpots,
      concurrency: params.concurrency || 4,
    },
    params.timeoutMs || 290_000
  );
  const spots = filterTrustedSpots(Array.isArray(result.spots) ? result.spots : []);
  console.info('[crawl4ai] Crawl summary:', result.diagnostics || {
    acceptedSpotCount: spots.length,
  });
  if (spots.length < minimumSpots) {
    throw new Error(
      `Crawl4AI chỉ thu được ${spots.length}/${minimumSpots} bài hợp lệ; dữ liệu cũ được giữ nguyên.`
    );
  }
  return spots.slice(0, maxSpots);
}

export async function scrapeRescueUrlWithCrawl4AI(
  url: string,
  note = ''
): Promise<DomSpot | null> {
  if (!isValidHttpUrl(url)) return null;
  const result = await invokeWorker(
    'scrape',
    { url, note },
    90_000
  );
  const trusted = result.spot ? filterTrustedSpots([result.spot]) : [];
  return trusted[0] || null;
}

export function createSavedGoogleMapsPlaces(spots: DomSpot[]) {
  return spots
    .filter(
      (spot) =>
        spot.hasExactLocation === true &&
        Number.isFinite(spot.publicLat) &&
        Number.isFinite(spot.publicLng) &&
        Boolean(spot.googleMapsUrl)
    )
    .map((spot) => ({
      id: `gmap-place-${spot.id}`,
      spotId: spot.id,
      title: spot.title,
      address: spot.formattedAddress || spot.areaLabel,
      lat: spot.publicLat,
      lng: spot.publicLng,
      googleMapsUrl: spot.googleMapsUrl!,
      sourcePlatform: spot.sourcePlatform || ('SOCIAL_MEDIA' as CrawlPlatform),
      sourceUrl: spot.sourceUrl,
      savedAt: spot.createdAt,
      notes: spot.story,
      imageUrl: spot.images[0],
      isVerified: true,
      sourceDomain: spot.verificationInfo?.sourceDomain,
    }));
}
