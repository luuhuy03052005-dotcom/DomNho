import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';
import { INITIAL_DOM_SPOTS } from '@/lib/seed-data';
import { listDeletedSpotIdsFromServerStore } from '@/lib/server-community-store';
import { DomSpot, isSpotDeletedOrHidden } from '@/lib/types';
import {
  VisualAnalysisResult,
  rankSpotsByVisualSimilarity,
} from '@/lib/visual-matcher';

const GEMINI_KEY =
  process.env.GEMINI_API_KEY ||
  'AQ.Ab8RN6Ip0zG0UgwbGaZVQXA6LZ1MWT2It5NzlWHFmLDHFK904w';
const GEMINI_MODEL = 'gemini-2.5-flash';

function postJson(
  urlStr: string,
  bodyObj: any
): Promise<{ status: number; text: string }> {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageDataUrl, candidateSpots, userCoords } = body;

    const deletedSet = new Set(listDeletedSpotIdsFromServerStore());
    const rawPool: DomSpot[] =
      Array.isArray(candidateSpots) && candidateSpots.length > 0
        ? candidateSpots
        : INITIAL_DOM_SPOTS;

    const seenIds = new Set<string>();
    const pool: DomSpot[] = [];
    for (const s of rawPool) {
      if (!s || !s.id || seenIds.has(s.id)) continue;
      seenIds.add(s.id);
      if (isSpotDeletedOrHidden(s, deletedSet)) continue;
      if (s.status === 'RESOLVED' || s.entityCategory === 'RESCUE_CENTER') continue;
      pool.push(s);
    }

    const compactCandidates = pool.slice(0, 30).map((s) => ({
      id: s.id,
      species: s.species,
      title: s.title,
      breed: s.breed,
      coatColor: s.coatColor,
      traits: s.traits,
      area: s.areaLabel,
      storyExcerpt: (s.story || '').slice(0, 140),
    }));

    const promptText = `Bạn là hệ thống nhận diện hình ảnh thú cưng chính xác cao.
Hãy phân tích bức ảnh đính kèm và đối chiếu với danh sách các bài viết hiện có bên dưới.

Danh sách bài viết ứng viên (JSON):
${JSON.stringify(compactCandidates)}

Yêu cầu trả về đúng 1 đối tượng JSON theo cấu trúc:
{
  "isPet": true nếu ảnh có chó, mèo hoặc động vật/thú cưng thực tế; false nếu ảnh là đồ ăn (VD: pizza), đồ vật, văn bản hoặc không có động vật,
  "species": "cat" hoặc "dog" hoặc "other",
  "breed": "tên giống ngắn gọn bằng tiếng Việt (VD: Mèo mướp, Mèo cam, Mèo tam thể, Chó cỏ, Chó Poodle... Nếu isPet=false thì để chuỗi rỗng)",
  "coatColor": "màu lông chính bằng tiếng Việt (VD: Vàng cam, Vàng trắng, Đen, Trắng, Mướp xám, Tam thể... Nếu isPet=false thì để chuỗi rỗng)",
  "primaryColors": ["màu 1", "màu 2"],
  "coatPattern": "kiểu hoa văn lông (VD: mướp vằn, đơn sắc, nhị thể, tam thể, đốm...)",
  "traits": ["3 đến 4 đặc điểm nhận dạng ngoại hình thú cưng thực tế nhìn thấy trong ảnh; nếu isPet=false thì trả về mảng rỗng []"],
  "suggestedTitle": "tiêu đề ngắn mô tả đúng thú cưng trong ảnh; nếu isPet=false thì để chuỗi rỗng",
  "visualMatches": [
    {
      "spotId": "id của bài viết trong danh sách ứng viên có đặc điểm loài/màu lông/ngoại hình trùng khớp cao với ảnh",
      "confidence": số nguyên từ 60 đến 98 thể hiện độ tương đồng thực tế,
      "reason": "lý do ngắn gọn vì sao ảnh trùng khớp (VD: Cùng là mèo cam lông ngắn, Cùng là chó bị lạc...)"
    }
  ]
}
Lưu ý quan trọng: Nếu ảnh KHÔNG phải là động vật/thú cưng (isPet = false), bắt buộc trả về visualMatches: [], traits: [], breed: "", coatColor: "", suggestedTitle: "". Tuyệt đối KHÔNG ghép nhầm loài (ví dụ ảnh là mèo thì không chọn bài chỉ nói về chó hoặc chim). Chỉ đưa vào visualMatches những bài có độ tương đồng thực sự từ 60 trở lên.`;

    const parts: any[] = [{ text: promptText }];

    if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
      const match = imageDataUrl.match(
        /^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/
      );
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
      const analysis: VisualAnalysisResult = JSON.parse(
        outText.slice(firstBracket, lastBracket + 1)
      );

      const matchedItems =
        analysis.isPet === false
          ? []
          : rankSpotsByVisualSimilarity(
              analysis,
              pool,
              userCoords,
              undefined,
              deletedSet
            );

      return NextResponse.json({
        ok: true,
        model: GEMINI_MODEL,
        analysis,
        matches: matchedItems,
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
