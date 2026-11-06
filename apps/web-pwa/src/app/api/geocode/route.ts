import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';
import zlib from 'node:zlib';

function httpsGetJson(urlStr: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'application/json',
          'Accept-Language': 'vi-VN,vi;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
        },
      },
      (res) => {
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
            resolve(JSON.parse(text));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('Geocode timeout')));
    req.end();
  });
}

/**
 * GET /api/geocode
 * 1. Reverse Geocoding: ?lat=10.7885&lng=106.7025 -> Trả về địa chỉ đường phố, phường, quận thực tế của người dùng
 * 2. Forward Geocoding: ?q=Thảo Điền, TP.HCM -> Trả về danh sách tọa độ thực tế trên bản đồ để tìm kiếm gần bạn
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  try {
    // 1. Tìm kiếm địa điểm theo từ khóa (Forward Geocoding)
    if (q) {
      const arcgisUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&SingleLine=${encodeURIComponent(
        q.includes('Việt Nam') ? q : `${q}, Việt Nam`
      )}&countryCode=VNM&maxLocations=6&outFields=Match_addr,Addr_type,City,Subregion,Region`;

      const data = await httpsGetJson(arcgisUrl);
      const candidates = (data?.candidates || []).map((c: any, idx: number) => ({
        id: `geo-cand-${idx}`,
        address: c.address || c.attributes?.Match_addr || q,
        lat: Number(Number(c.location?.y || 10.7885).toFixed(6)),
        lng: Number(Number(c.location?.x || 106.7025).toFixed(6)),
        score: c.score || 100,
      }));

      return NextResponse.json({
        ok: true,
        query: q,
        results: candidates,
        candidates,
      });
    }

    // 2. Xác định địa chỉ thực tế từ tọa độ GPS của người dùng (Reverse Geocoding)
    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return NextResponse.json(
          { ok: false, error: 'Tọa độ không hợp lệ' },
          { status: 400 }
        );
      }

      try {
        const revUrl = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?f=json&location=${lng},${lat}&langCode=vi`;
        const revData = await httpsGetJson(revUrl);
        const addr = revData?.address;
        if (addr) {
          const fullAddress =
            addr.LongLabel?.replace(/,\s*VNM$/i, '') ||
            addr.Match_addr ||
            `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          const shortAddress =
            [addr.Address, addr.Neighborhood, addr.District || addr.City]
              .filter(Boolean)
              .join(', ') || fullAddress;

          return NextResponse.json({
            ok: true,
            lat,
            lng,
            address: shortAddress,
            fullAddress,
            city: addr.City || addr.Region || 'Việt Nam',
          });
        }
      } catch {
        // Fallback sang BigDataCloud Reverse Geocode
      }

      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=vi`;
      const bdcData = await httpsGetJson(bdcUrl);
      const address = [
        bdcData?.locality,
        bdcData?.city,
        bdcData?.principalSubdivision,
      ]
        .filter(Boolean)
        .join(', ');

      return NextResponse.json({
        ok: true,
        lat,
        lng,
        address: address || `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        fullAddress: address || `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      });
    }

    return NextResponse.json(
      { ok: false, error: 'Thiếu tham số q hoặc lat,lng' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Geocode error' },
      { status: 500 }
    );
  }
}
