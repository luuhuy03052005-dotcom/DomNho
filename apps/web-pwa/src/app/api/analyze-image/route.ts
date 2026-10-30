import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';

const GEMINI_KEY = 'AQ.Ab8RN6Ip0zG0UgwbGaZVQXA6LZ1MWT2It5NzlWHFmLDHFK904w';
const GEMINI_MODEL = 'gemini-2.5-flash';

function postJson(urlStr: string, bodyObj: any): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
    const bodyStr = JSON.stringify(bodyObj);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(bodyStr, 'utf-8')),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            text: Buffer.concat(chunks).toString('utf-8'),
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(35000, () => req.destroy(new Error('Gemini vision timeout')));
    req.write(bodyStr);
    req.end();
  });
}

/**
 * API Endpoint: /api/analyze-image
 * Phân tích ảnh thú cưng thật do người dùng tải lên bằng Gemini 2.5 Flash Multimodal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageDataUrl } = body;

    const parts: any[] = [
      {
        text: 'Hãy phân tích bức ảnh thú cưng này và trả về đúng JSON: {"species": "cat" hoặc "dog", "breed": "tên giống tiếng Việt", "coatColor": "màu lông tiếng Việt", "traits": ["3 đặc điểm nhận dạng thực tế từ ảnh"], "suggestedTitle": "tiêu đề ngắn mô tả bé trong ảnh"}',
      },
    ];

    if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
      const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
      GEMINI_KEY
    )}`;

    const res = await postJson(endpoint, {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    if (res.status >= 200 && res.status < 300) {
      const parsed = JSON.parse(res.text);
      const outText =
        parsed?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text || '')
          .join('\n') || '{}';
      const firstBracket = outText.indexOf('{');
      const lastBracket = outText.lastIndexOf('}');
      const data = JSON.parse(outText.slice(firstBracket, lastBracket + 1));
      return NextResponse.json({
        ok: true,
        model: GEMINI_MODEL,
        analysis: data,
      });
    }

    return NextResponse.json(
      { ok: false, error: `HTTP ${res.status}` },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Analyze error' },
      { status: 500 }
    );
  }
}
