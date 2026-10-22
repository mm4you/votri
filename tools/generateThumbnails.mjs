/**
 * @file tools/generateThumbnails.mjs
 * @description Bộ tạo ảnh thumbnail chất lượng cao 800x550 cho 3 game trên cổng Vô Tri Hub:
 * 1. splash-swim.png: Kình Ngư Vô Tri 100m (Đường đua bơi Olympic, bọt nước tung tóe, VĐV bơi sải)
 * 2. wobbly-bird.png: Chim Béo Tập Bay 100m (Chim béo mắt lồi, tên lửa trứng phản lực, bầu trời mây)
 * 3. soup-run.png: Bát Canh Bỏng Tay 50m (Góc nhìn bưng bát phở bò Sài Gòn nghi ngút khói qua hành lang đèn lồng)
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const WIDTH = 800;
const HEIGHT = 550;

function createBuffer() {
  return new Float32Array(WIDTH * HEIGHT * 4);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function blendPixel(buf, x, y, r, g, b, a) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT || a <= 0) return;
  const idx = (y * WIDTH + x) * 4;
  const invA = 1 - a;
  buf[idx] = buf[idx] * invA + r * a;
  buf[idx + 1] = buf[idx + 1] * invA + g * a;
  buf[idx + 2] = buf[idx + 2] * invA + b * a;
  buf[idx + 3] = Math.min(1.0, buf[idx + 3] + a);
}

function fillRadialGrad(buf, cx, cy, r0, r1, color0, color1) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const t = clamp((dist - r0) / (r1 - r0), 0, 1);
      const r = color0[0] * (1 - t) + color1[0] * t;
      const g = color0[1] * (1 - t) + color1[1] * t;
      const b = color0[2] * (1 - t) + color1[2] * t;
      const a = color0[3] * (1 - t) + color1[3] * t;
      blendPixel(buf, x, y, r, g, b, a);
    }
  }
}

function fillCircle(buf, cx, cy, rad, color) {
  const minX = Math.max(0, Math.floor(cx - rad - 2));
  const maxX = Math.min(WIDTH - 1, Math.ceil(cx + rad + 2));
  const minY = Math.max(0, Math.floor(cy - rad - 2));
  const maxY = Math.min(HEIGHT - 1, Math.ceil(cy + rad + 2));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const alpha = clamp(rad - dist + 0.5, 0, 1) * color[3];
      if (alpha > 0) blendPixel(buf, x, y, color[0], color[1], color[2], alpha);
    }
  }
}

function fillEllipse(buf, cx, cy, rx, ry, color) {
  const minX = Math.max(0, Math.floor(cx - rx - 2));
  const maxX = Math.min(WIDTH - 1, Math.ceil(cx + rx + 2));
  const minY = Math.max(0, Math.floor(cy - ry - 2));
  const maxY = Math.min(HEIGHT - 1, Math.ceil(cy + ry + 2));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      const alpha = clamp((1 - d) * Math.min(rx, ry), 0, 1) * color[3];
      if (alpha > 0) blendPixel(buf, x, y, color[0], color[1], color[2], alpha);
    }
  }
}

function fillRoundedRect(buf, rx0, ry0, w, h, radius, color) {
  const minX = Math.max(0, Math.floor(rx0));
  const maxX = Math.min(WIDTH - 1, Math.ceil(rx0 + w));
  const minY = Math.max(0, Math.floor(ry0));
  const maxY = Math.min(HEIGHT - 1, Math.ceil(ry0 + h));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = Math.max(0, Math.abs(x - (rx0 + w / 2)) - (w / 2 - radius));
      const dy = Math.max(0, Math.abs(y - (ry0 + h / 2)) - (h / 2 - radius));
      const dist = Math.hypot(dx, dy);
      const alpha = clamp(radius - dist + 0.5, 0, 1) * color[3];
      if (alpha > 0) blendPixel(buf, x, y, color[0], color[1], color[2], alpha);
    }
  }
}

function bufferToPNG(buf) {
  const rowSize = WIDTH * 4 + 1;
  const raw = Buffer.alloc(rowSize * HEIGHT);

  for (let y = 0; y < HEIGHT; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter 0
    for (let x = 0; x < WIDTH; x++) {
      const srcIdx = (y * WIDTH + x) * 4;
      const dstIdx = rowOffset + 1 + x * 4;
      raw[dstIdx] = Math.round(clamp(buf[srcIdx] * 255, 0, 255));
      raw[dstIdx + 1] = Math.round(clamp(buf[srcIdx + 1] * 255, 0, 255));
      raw[dstIdx + 2] = Math.round(clamp(buf[srcIdx + 2] * 255, 0, 255));
      raw[dstIdx + 3] = Math.round(clamp(buf[srcIdx + 3] * 255, 0, 255));
    }
  }

  const deflated = zlib.deflateSync(raw, { level: 9 });

  function crc32(b) {
    let crc = 0xffffffff;
    for (let i = 0; i < b.length; i++) {
      let byte = b[i];
      for (let j = 0; j < 8; j++) {
        if ((crc ^ byte) & 1) crc = (crc >>> 1) ^ 0xedb88320;
        else crc = crc >>> 1;
        byte >>>= 1;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    header,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// -------------------------------------------------------------
// 1. GAME 1: KÌNH NGƯ VÔ TRI (SPLASH-SWIM.PNG)
// -------------------------------------------------------------
function renderSwimGame() {
  const buf = createBuffer();

  // Nền hồ bơi: gradient xanh thẳm đến ngọc bích rực rỡ
  for (let y = 0; y < HEIGHT; y++) {
    const t = y / HEIGHT;
    for (let x = 0; x < WIDTH; x++) {
      const rx = (x - WIDTH / 2) / (WIDTH / 2);
      const r = 0.04 + 0.05 * (1 - t) + 0.02 * rx * rx;
      const g = 0.40 + 0.35 * (1 - t);
      const b = 0.72 + 0.22 * (1 - t);
      blendPixel(buf, x, y, r, g, b, 1.0);
    }
  }

  // Lưới gạch đáy hồ bơi Olympic
  for (let y = 140; y < HEIGHT; y += 45) {
    const perspectiveScale = 1.0 + (y - 140) * 0.003;
    for (let x = 0; x < WIDTH; x++) {
      const distFromCenter = Math.abs(x - 400);
      if (distFromCenter < 240 * perspectiveScale && distFromCenter > 230 * perspectiveScale) {
        blendPixel(buf, x, y, 0.05, 0.25, 0.50, 0.35);
      }
      blendPixel(buf, x, y, 0.15, 0.55, 0.75, 0.25);
    }
  }

  // Dây phao phân làn bơi (Đỏ & Trắng xen kẽ)
  const laneLines = [120, 680];
  laneLines.forEach(lx => {
    for (let y = 80; y < HEIGHT; y += 18) {
      const isRed = (Math.floor(y / 18) % 2 === 0);
      const col = isRed ? [0.92, 0.22, 0.18, 0.95] : [0.98, 0.98, 0.98, 0.95];
      fillCircle(buf, lx + (lx > 400 ? 1 : -1) * (y - 80) * 0.25, y, 9, col);
    }
  });

  // Vệt nước rẽ sóng và bọt nước tung tóe quanh VĐV
  for (let i = 0; i < 400; i++) {
    const angle = Math.random() * Math.PI * 2;
    const rad = 25 + Math.random() * 190;
    const px = Math.round(400 + Math.cos(angle) * rad * 1.5);
    const py = Math.round(310 + Math.sin(angle) * rad * 0.8);
    const sz = 1.5 + Math.random() * 7.5;
    fillCircle(buf, px, py, sz, [0.95, 0.99, 1.0, 0.45 + Math.random() * 0.45]);
  }

  // Thân hình VĐV bơi lội (Góc nhìn từ trên chéo xuống)
  // Lưng và vai cơ bắp da rám nắng khỏe khoắn
  fillEllipse(buf, 400, 310, 55, 110, [0.86, 0.58, 0.42, 1.0]);
  fillEllipse(buf, 400, 275, 75, 50, [0.88, 0.60, 0.44, 1.0]);

  // Cánh tay trái vung sải xé nước vọt tới trước
  fillEllipse(buf, 340, 210, 24, 75, [0.85, 0.57, 0.40, 1.0]);
  fillCircle(buf, 330, 150, 18, [0.82, 0.54, 0.38, 1.0]); // Bàn tay mở rẽ nước

  // Cánh tay phải đẩy nước phía sau
  fillEllipse(buf, 465, 360, 22, 65, [0.80, 0.52, 0.36, 1.0]);

  // Mũ bơi đen chuyên nghiệp & Kính bơi phản quang neon
  fillCircle(buf, 400, 225, 34, [0.12, 0.14, 0.18, 1.0]);
  fillEllipse(buf, 388, 218, 11, 7, [0.15, 0.95, 0.85, 0.95]);
  fillEllipse(buf, 412, 218, 11, 7, [0.15, 0.95, 0.85, 0.95]);

  // Quần bơi thi đấu
  fillEllipse(buf, 400, 385, 48, 42, [0.08, 0.10, 0.15, 1.0]);

  // Bọt sóng sủi bọt trắng xóa bọc quanh người
  for (let i = 0; i < 180; i++) {
    const bx = 330 + Math.random() * 140;
    const by = 180 + Math.random() * 240;
    fillCircle(buf, bx, by, 2 + Math.random() * 6, [1.0, 1.0, 1.0, 0.70]);
  }

  // Khung nhãn thông tin mỹ thuật (Title Badges & Key Pills)
  fillRoundedRect(buf, 40, 35, 230, 36, 18, [0.05, 0.15, 0.25, 0.88]);
  fillRoundedRect(buf, 40, 85, 360, 56, 16, [0.02, 0.08, 0.16, 0.92]);

  // Nút điều khiển 4 phím QWOP
  const keys = [
    { k: 'Q', x: 40, c: [0.92, 0.35, 0.05] },
    { k: 'W', x: 125, c: [0.09, 0.64, 0.29] },
    { k: 'O', x: 210, c: [0.86, 0.15, 0.47] },
    { k: 'P', x: 295, c: [0.01, 0.52, 0.78] }
  ];
  keys.forEach(key => {
    fillRoundedRect(buf, key.x, 470, 75, 42, 10, [...key.c, 0.95]);
  });

  return bufferToPNG(buf);
}

// -------------------------------------------------------------
// 2. GAME 2: CHIM BÉO TẬP BAY (WOBBLY-BIRD.PNG)
// -------------------------------------------------------------
function renderBirdGame() {
  const buf = createBuffer();

  // Bầu trời: Gradient thiên thanh ấm áp từ xanh cyan đến vàng nắng rực rỡ
  for (let y = 0; y < HEIGHT; y++) {
    const t = y / HEIGHT;
    for (let x = 0; x < WIDTH; x++) {
      const r = 0.35 * (1 - t) + 0.98 * t * 0.9;
      const g = 0.75 * (1 - t) + 0.85 * t * 0.9;
      const b = 0.98 * (1 - t) + 0.65 * t * 0.7;
      blendPixel(buf, x, y, r, g, b, 1.0);
    }
  }

  // Mặt trời vàng rực tỏa nắng ấm
  fillRadialGrad(buf, 680, 120, 30, 220, [1.0, 0.95, 0.70, 0.85], [1.0, 0.85, 0.40, 0.0]);

  // Những đám mây trắng xốp trôi bồng bềnh
  const drawCloud = (cx, cy, s) => {
    fillCircle(buf, cx, cy, 45 * s, [1.0, 1.0, 1.0, 0.92]);
    fillCircle(buf, cx - 35 * s, cy + 12 * s, 32 * s, [1.0, 1.0, 1.0, 0.90]);
    fillCircle(buf, cx + 40 * s, cy + 10 * s, 34 * s, [1.0, 1.0, 1.0, 0.90]);
    fillCircle(buf, cx - 65 * s, cy + 22 * s, 24 * s, [1.0, 1.0, 1.0, 0.85]);
    fillCircle(buf, cx + 70 * s, cy + 22 * s, 26 * s, [1.0, 1.0, 1.0, 0.85]);
  };
  drawCloud(140, 160, 1.1);
  drawCloud(540, 220, 0.85);
  drawCloud(320, 110, 0.65);

  // Cột mốc cờ đích và bục bay gỗ phía xa
  fillRoundedRect(buf, 280, 430, 240, 24, 8, [0.55, 0.35, 0.20, 0.95]);
  fillRoundedRect(buf, 370, 454, 60, 80, 4, [0.42, 0.26, 0.15, 0.95]);

  // Luồng lửa và khói phụt ra từ quả trứng phản lực (Egg Rocket Booster)
  for (let i = 0; i < 350; i++) {
    const dist = Math.random() * 160;
    const spread = (dist / 160) * 45;
    const px = Math.round(300 - dist + (Math.random() - 0.5) * spread);
    const py = Math.round(320 + (Math.random() - 0.5) * spread);
    const t = dist / 160;
    const col = t < 0.3 ? [1.0, 0.95, 0.2, 0.9] : (t < 0.7 ? [0.98, 0.45, 0.05, 0.85] : [0.85, 0.85, 0.90, 0.55]);
    fillCircle(buf, px, py, 4 + t * 14, col);
  }

  // Tên lửa quả trứng vàng gắn sau lưng chú chim
  fillEllipse(buf, 325, 315, 26, 38, [0.92, 0.72, 0.12, 1.0]);
  fillEllipse(buf, 323, 313, 20, 30, [0.99, 0.85, 0.25, 1.0]); // Vàng kim loại óng ánh
  fillRoundedRect(buf, 305, 308, 12, 15, 3, [0.25, 0.28, 0.32, 1.0]); // Đai buộc kim loại

  // Chú chim béo tròn mũm mĩm màu vàng cam siêu ngộ nghĩnh
  fillCircle(buf, 430, 295, 82, [0.98, 0.76, 0.14, 1.0]);
  fillCircle(buf, 425, 285, 75, [1.0, 0.84, 0.22, 1.0]); // Bụng chim căng tròn

  // Đôi cánh chim vỗ cánh so le thăng bằng
  fillEllipse(buf, 480, 260, 45, 22, [0.92, 0.65, 0.10, 1.0]); // Cánh phải giương cao
  fillEllipse(buf, 375, 325, 42, 20, [0.92, 0.65, 0.10, 1.0]); // Cánh trái quạt thấp

  // Hai mắt lồi to tròn vô tri hài hước
  fillCircle(buf, 475, 265, 24, [1.0, 1.0, 1.0, 1.0]);
  fillCircle(buf, 482, 265, 9, [0.12, 0.12, 0.14, 1.0]); // Tròng mắt đen ngơ ngác
  fillCircle(buf, 480, 262, 3, [1.0, 1.0, 1.0, 1.0]); // Ánh sáng lấp lánh

  fillCircle(buf, 442, 265, 22, [1.0, 1.0, 1.0, 1.0]);
  fillCircle(buf, 448, 265, 9, [0.12, 0.12, 0.14, 1.0]);
  fillCircle(buf, 446, 262, 3, [1.0, 1.0, 1.0, 1.0]);

  // Chiếc mỏ cam tròn chúm chím
  fillEllipse(buf, 505, 288, 20, 13, [0.96, 0.42, 0.08, 1.0]);

  // Má hồng đào ngại ngùng
  fillCircle(buf, 450, 310, 14, [0.98, 0.45, 0.35, 0.45]);

  // Hai chiếc chân chim bé xíu lắc lư
  fillRoundedRect(buf, 405, 372, 8, 22, 3, [0.92, 0.40, 0.06, 1.0]);
  fillRoundedRect(buf, 435, 372, 8, 22, 3, [0.92, 0.40, 0.06, 1.0]);

  // Khung nhãn thông tin mỹ thuật (Title Badges & Key Pills)
  fillRoundedRect(buf, 40, 35, 245, 36, 18, [0.25, 0.15, 0.05, 0.88]);
  fillRoundedRect(buf, 40, 85, 360, 56, 16, [0.18, 0.10, 0.02, 0.92]);

  // Nút điều khiển 3 phím: F, SPACE (Vàng rực), J
  fillRoundedRect(buf, 40, 470, 85, 42, 10, [0.92, 0.35, 0.05, 0.95]);
  fillRoundedRect(buf, 140, 470, 180, 42, 10, [0.85, 0.60, 0.05, 0.98]);
  fillRoundedRect(buf, 335, 470, 85, 42, 10, [0.58, 0.20, 0.92, 0.95]);

  return bufferToPNG(buf);
}

// -------------------------------------------------------------
// 3. GAME 3: BÁT CANH BỎNG TAY (SOUP-RUN.PNG)
// -------------------------------------------------------------
function renderSoupGame() {
  const buf = createBuffer();

  // Không gian hành lang quán phở: Tông màu gỗ trầm ấm cúng & sàn gỗ bóng láng
  for (let y = 0; y < HEIGHT; y++) {
    const t = y / HEIGHT;
    for (let x = 0; x < WIDTH; x++) {
      let r, g, b;
      if (y < 220) {
        // Tường gỗ và phông nền chiều sâu
        const depth = Math.abs(x - 400) / 400;
        r = 0.15 + 0.08 * depth;
        g = 0.08 + 0.04 * depth;
        b = 0.04 + 0.02 * depth;
      } else {
        // Sàn gỗ phản chiếu ánh sáng ấm
        const floorT = (y - 220) / (HEIGHT - 220);
        r = 0.28 * (1 - floorT) + 0.14 * floorT;
        g = 0.16 * (1 - floorT) + 0.08 * floorT;
        b = 0.08 * (1 - floorT) + 0.04 * floorT;
      }
      blendPixel(buf, x, y, r, g, b, 1.0);
    }
  }

  // Đèn lồng đỏ treo cao tỏa ánh sáng hổ phách ấm áp
  fillRadialGrad(buf, 200, 100, 10, 180, [1.0, 0.45, 0.15, 0.65], [0.8, 0.2, 0.05, 0.0]);
  fillEllipse(buf, 200, 100, 24, 32, [0.85, 0.15, 0.08, 0.95]);
  fillRadialGrad(buf, 600, 100, 10, 180, [1.0, 0.45, 0.15, 0.65], [0.8, 0.2, 0.05, 0.0]);
  fillEllipse(buf, 600, 100, 24, 32, [0.85, 0.15, 0.08, 0.95]);

  // Tô phở Bát Tràng sứ trắng men bóng bẩy (Góc nhìn thứ nhất từ trên xuống)
  const cx = 400, cy = 340;
  // Đổ bóng đậm dưới đáy tô sứ
  fillEllipse(buf, cx, cy + 50, 240, 110, [0.04, 0.02, 0.01, 0.70]);

  // Vành ngoài bát sứ Bát Tràng men trắng ngà
  fillEllipse(buf, cx, cy, 235, 155, [0.94, 0.94, 0.92, 1.0]);
  // Viền chỉ xanh lam hoa lam đôi trang nhã
  fillEllipse(buf, cx, cy, 222, 144, [0.12, 0.35, 0.65, 1.0]);
  fillEllipse(buf, cx, cy, 216, 139, [0.96, 0.96, 0.95, 1.0]);

  // Mặt nước dùng Phở Bò Nam Bộ đậm đà lợ đục ninh tủy xương
  fillEllipse(buf, cx, cy + 2, 205, 130, [0.44, 0.18, 0.05, 1.0]);
  fillRadialGrad(buf, cx, cy - 10, 20, 170, [0.55, 0.25, 0.08, 0.95], [0.35, 0.12, 0.03, 1.0]);

  // Váng mỡ gầu bò vàng óng ánh (Nước béo)
  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 150;
    const px = Math.round(cx + Math.cos(angle) * dist * 1.0);
    const py = Math.round(cy + Math.sin(angle) * dist * 0.62);
    const r = 2 + Math.random() * 9;
    fillCircle(buf, px, py, r, [0.99, 0.90, 0.40, 0.55 + Math.random() * 0.35]);
  }

  // Topping: Bánh phở chần mềm mại trắng ngà lộ từng dải thớ
  for (let i = 0; i < 28; i++) {
    const sx = cx - 110 + i * 8 + (Math.random() - 0.5) * 15;
    const sy = cy + 10 + (Math.random() - 0.5) * 45;
    fillEllipse(buf, sx, sy, 32, 9, [0.95, 0.94, 0.90, 0.88]);
  }

  // 3 Lát Nạm Gầu Bò hình lượn sóng tự nhiên viền mỡ vàng
  fillEllipse(buf, cx - 60, cy - 20, 52, 28, [0.52, 0.20, 0.12, 0.98]);
  fillEllipse(buf, cx - 62, cy - 30, 48, 8, [0.92, 0.78, 0.42, 0.90]); // Viền mỡ gầu

  fillEllipse(buf, cx + 55, cy - 15, 50, 26, [0.50, 0.19, 0.11, 0.98]);
  fillEllipse(buf, cx + 53, cy - 25, 46, 8, [0.92, 0.78, 0.42, 0.90]);

  fillEllipse(buf, cx - 5, cy + 30, 56, 28, [0.48, 0.18, 0.10, 0.98]);

  // 3 Viên Bò Viên Sài Gòn khía chữ thập nâu hồng rắc tiêu đen
  const balls = [
    { x: cx - 95, y: cy + 15 },
    { x: cx + 90, y: cy + 20 },
    { x: cx, y: cy - 45 }
  ];
  balls.forEach(b => {
    fillCircle(buf, b.x, b.y, 24, [0.45, 0.25, 0.18, 1.0]);
    fillCircle(buf, b.x - 4, b.y - 4, 18, [0.55, 0.32, 0.22, 1.0]); // Khối tròn bóng
    fillRoundedRect(buf, b.x - 14, b.y - 2, 28, 4, 2, [0.28, 0.14, 0.08, 0.95]); // Khía hoa chữ thập
    fillRoundedRect(buf, b.x - 2, b.y - 14, 4, 28, 2, [0.28, 0.14, 0.08, 0.95]);
  });

  // Lòng đỏ Hột Gà Chần lòng đào cam óng ả béo ngậy giữa bát
  fillCircle(buf, cx + 5, cy - 5, 26, [0.98, 0.52, 0.05, 1.0]);
  fillCircle(buf, cx + 2, cy - 8, 20, [1.0, 0.65, 0.12, 1.0]); // Lòng đỏ căng mọng
  fillCircle(buf, cx - 3, cy - 12, 6, [1.0, 0.95, 0.80, 0.85]); // Vệt bóng sáng

  // Hành lá xắt nhuyễn, hành tây bào mỏng, ớt sừng đỏ tươi
  for (let i = 0; i < 70; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 140;
    const hx = Math.round(cx + Math.cos(angle) * dist);
    const hy = Math.round(cy + Math.sin(angle) * dist * 0.6);
    fillCircle(buf, hx, hy, 3.5, [0.15, 0.75, 0.25, 0.90]); // Hành hoa
  }
  for (let i = 0; i < 12; i++) {
    const ox = cx + (Math.random() - 0.5) * 160;
    const oy = cy + (Math.random() - 0.5) * 70;
    fillEllipse(buf, ox, oy, 16, 4, [0.92, 0.15, 0.10, 0.95]); // Ớt sừng đỏ
  }

  // Làn khói phở nóng bốc lên ngun ngút
  for (let i = 0; i < 150; i++) {
    const sx = cx + (Math.random() - 0.5) * 180;
    const sy = cy - 20 - Math.random() * 160;
    const sRad = 15 + Math.random() * 40;
    fillCircle(buf, sx, sy, sRad, [1.0, 0.98, 0.94, 0.08]);
  }

  // Đôi cánh tay áo sơ mi trắng & bàn tay người phục vụ ôm bám 2 bên vành tô
  // Tay trái (bên trái bát): Ống tay áo sơ mi trắng nối dài từ góc dưới màn hình
  fillEllipse(buf, 110, 480, 75, 130, [0.98, 0.98, 0.98, 1.0]);
  fillEllipse(buf, 140, 410, 50, 70, [0.95, 0.95, 0.95, 1.0]);
  // Cổ tay áo sơ mi có cúc
  fillRoundedRect(buf, 145, 360, 45, 20, 8, [0.92, 0.92, 0.92, 1.0]);
  // Bàn tay bám vành tô: ngón cái tì phẳng vành miệng tô
  fillEllipse(buf, 185, 345, 28, 20, [0.86, 0.58, 0.42, 1.0]); // Mu bàn tay
  fillEllipse(buf, 205, 335, 20, 12, [0.88, 0.60, 0.44, 1.0]); // Ngón cái tì vành tô

  // Tay phải (bên phải bát): Ống tay áo sơ mi trắng nối dài từ góc dưới phải
  fillEllipse(buf, 690, 480, 75, 130, [0.98, 0.98, 0.98, 1.0]);
  fillEllipse(buf, 660, 410, 50, 70, [0.95, 0.95, 0.95, 1.0]);
  fillRoundedRect(buf, 610, 360, 45, 20, 8, [0.92, 0.92, 0.92, 1.0]);
  fillEllipse(buf, 615, 345, 28, 20, [0.86, 0.58, 0.42, 1.0]);
  fillEllipse(buf, 595, 335, 20, 12, [0.88, 0.60, 0.44, 1.0]); // Ngón cái tì vành tô

  // Khung nhãn thông tin mỹ thuật (Title Badges & Key Pills)
  fillRoundedRect(buf, 40, 35, 255, 36, 18, [0.28, 0.12, 0.05, 0.88]);
  fillRoundedRect(buf, 40, 85, 360, 56, 16, [0.18, 0.08, 0.02, 0.92]);

  // Nút điều khiển 3 phím: F (Nghiêng T), SPACE (Thổi & Rón Rén), J (Nghiêng P)
  fillRoundedRect(buf, 40, 470, 95, 42, 10, [0.92, 0.35, 0.05, 0.95]);
  fillRoundedRect(buf, 150, 470, 180, 42, 10, [0.98, 0.45, 0.08, 0.98]);
  fillRoundedRect(buf, 345, 470, 95, 42, 10, [0.09, 0.64, 0.29, 0.95]);

  return bufferToPNG(buf);
}

// -------------------------------------------------------------
// CHẠY VÀ GHI FILE ẢNH VÀO SHARED/IMG
// -------------------------------------------------------------
const outDir = path.resolve('shared/img');
console.log('Đang tạo 3 ảnh thumbnail chất lượng cao...');

const swimPng = renderSwimGame();
fs.writeFileSync(path.join(outDir, 'splash-swim.png'), swimPng);
console.log('-> Tạo thành công shared/img/splash-swim.png (' + swimPng.length + ' bytes)');

const birdPng = renderBirdGame();
fs.writeFileSync(path.join(outDir, 'wobbly-bird.png'), birdPng);
console.log('-> Tạo thành công shared/img/wobbly-bird.png (' + birdPng.length + ' bytes)');

const soupPng = renderSoupGame();
fs.writeFileSync(path.join(outDir, 'soup-run.png'), soupPng);
console.log('-> Tạo thành công shared/img/soup-run.png (' + soupPng.length + ' bytes)');

console.log('Hoàn thành toàn bộ 3 ảnh mô tả game!');
