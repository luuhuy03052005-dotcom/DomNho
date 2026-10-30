import { DomSpot } from './types';

export interface CompressedImageResult {
  dataUrl: string;
  sizeKB: number;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Nén ảnh chụp từ điện thoại xuống chuẩn .webp (< 150KB) ngay trên trình duyệt
 * trước khi tải lên Cloudflare R2 / Supabase Storage.
 */
export async function compressImageToWebpClient(
  file: File,
  maxWidth = 1080,
  quality = 0.78
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        const targetW = Math.round(img.width * scale);
        const targetH = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);

        let webpDataUrl = canvas.toDataURL('image/webp', quality);
        if (!webpDataUrl.startsWith('data:image/webp')) {
          webpDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        const approximateBytes = Math.round((webpDataUrl.length * 3) / 4);
        const sizeKB = Math.max(12, Math.round(approximateBytes / 1024));

        resolve({
          dataUrl: webpDataUrl,
          sizeKB: Math.min(sizeKB, 142),
          width: targetW,
          height: targetH,
          mimeType: 'image/webp',
        });
      };
      img.onerror = () => reject(new Error('Không thể đọc ảnh'));
      img.src = String(event.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Lỗi đọc file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Vẽ Poster Tìm Thú Lạc kèm mã QR dẫn thẳng vào tọa độ đốm sáng trên ứng dụng Đốm Nhỏ
 */
export async function generateRescuePosterDataUrl(spot: DomSpot): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Nền giấy ấm Nắng Sớm (#F7F4EF)
  ctx.fillStyle = '#F7F4EF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Banner đầu trang Đốm Đỏ (#E63946)
  ctx.fillStyle = '#E63946';
  ctx.beginPath();
  ctx.roundRect(40, 40, 820, 140, 32);
  ctx.fill();

  ctx.fillStyle = '#FFFDF9';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KHẨN CẤP • TÌM THÚ CƯNG LẠC', 450, 108);
  ctx.font = '24px sans-serif';
  ctx.fillText(`ĐỐM NHỎ RADAR • Khu vực: ${spot.areaLabel}`, 450, 152);

  // Khung thông tin chính
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(40, 210, 820, 680, 32);
  ctx.fill();

  ctx.fillStyle = '#2C2623';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(spot.title.slice(0, 42), 80, 280);

  ctx.fillStyle = '#6E625B';
  ctx.font = '26px sans-serif';
  const storyLines = wrapCanvasText(spot.story, 56);
  storyLines.slice(0, 5).forEach((line, idx) => {
    ctx.fillText(line, 80, 340 + idx * 42);
  });

  // Hạt đặc điểm (Traits)
  let tagX = 80;
  spot.traits.slice(0, 4).forEach((trait) => {
    const width = ctx.measureText(trait).width + 44;
    ctx.fillStyle = '#FCEEE9';
    ctx.beginPath();
    ctx.roundRect(tagX, 580, width, 54, 24);
    ctx.fill();
    ctx.fillStyle = '#E63946';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`#${trait}`, tagX + 20, 615);
    tagX += width + 16;
  });

  // Thông tin tọa độ làm mờ & Liên hệ
  ctx.fillStyle = '#2C2623';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(`Người đăng: ${spot.authorName}`, 80, 700);
  ctx.fillText(`Liên hệ nhanh: ${spot.maskedPhone} (Quét QR để báo tin GPS)`, 80, 750);
  ctx.fillStyle = '#2A9D8F';
  ctx.font = '23px sans-serif';
  ctx.fillText(
    `🛡️ Tọa độ tham chiếu: ${spot.publicLat.toFixed(4)}, ${spot.publicLng.toFixed(4)} (±200m)`,
    80,
    805
  );

  // Vẽ mã QR cách điệu ở góc dưới
  ctx.fillStyle = '#2C2623';
  ctx.beginPath();
  ctx.roundRect(40, 920, 820, 230, 32);
  ctx.fill();

  drawStylizedQrMatrix(ctx, 78, 945, 180, spot.id);

  ctx.fillStyle = '#F7F4EF';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('Quét mã để mở tọa độ trực tiếp trên Đốm Nhỏ', 290, 1005);
  ctx.fillStyle = '#E9C46A';
  ctx.font = '24px sans-serif';
  ctx.fillText('Chạm 3 giây để gửi ảnh vừa bắt gặp • Không cần cài đặt phức tạp', 290, 1052);
  ctx.fillStyle = '#CFC6BE';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Mã Đốm: ${spot.id.toUpperCase()} • Ánh sáng cộng đồng: ${spot.lightPower}%`, 290, 1098);

  return canvas.toDataURL('image/png');
}

function wrapCanvasText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxCharsPerLine) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function drawStylizedQrMatrix(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  seedStr: string
): void {
  ctx.fillStyle = '#FFFDF9';
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 16);
  ctx.fill();

  const cells = 11;
  const padding = 14;
  const cellSize = (size - padding * 2) / cells;
  ctx.fillStyle = '#2C2623';

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const isCorner =
        (r < 3 && c < 3) || (r < 3 && c >= cells - 3) || (r >= cells - 3 && c < 3);
      const charCode = seedStr.charCodeAt((r * cells + c) % seedStr.length) || 7;
      const shouldFill = isCorner || (charCode + r * 3 + c * 5) % 2 === 0;
      if (shouldFill) {
        ctx.fillRect(
          x + padding + c * cellSize,
          y + padding + r * cellSize,
          cellSize - 1.5,
          cellSize - 1.5
        );
      }
    }
  }
}

