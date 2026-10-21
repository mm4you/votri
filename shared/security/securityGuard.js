/**
 * @file securityGuard.js
 * @description Hệ thống Bảo mật Client-side, Chống mở DevTools (F12 / Inspect),
 * Ký số kiểm tra toàn vẹn dữ liệu Cache (Anti-Tamper Checksum) và Chống Flood/Spam thao tác.
 */

const SECRET_SALT = 'VtG_2026_#9xQ!mK7_AntiTamper_Salt';

/**
 * Hàm băm FNV-1a kết hợp Salt tạo chữ ký chống sửa đổi dữ liệu trong localStorage
 */
export function computeSignature(payloadObj) {
  const str = JSON.stringify(payloadObj) + '|' + SECRET_SALT;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return ((h1 >>> 0).toString(36) + '-' + (h2 >>> 0).toString(36));
}

/**
 * Đóng gói dữ liệu kèm chữ ký toàn vẹn trước khi lưu vào Browser Cache
 */
export function signData(data) {
  if (data === null || data === undefined) return null;
  return {
    d: data,
    s: computeSignature(data),
  };
}

/**
 * Xác thực chữ ký khi đọc từ Browser Cache; trả về fallback nếu phát hiện chỉnh sửa trái phép
 */
export function verifyData(envelope, fallback = null) {
  if (!envelope || typeof envelope !== 'object' || !('d' in envelope) || !('s' in envelope)) {
    return fallback;
  }
  const expected = computeSignature(envelope.d);
  if (envelope.s !== expected) {
    console.warn('[SecurityGuard] Phát hiện dữ liệu Cache bị can thiệp trái phép. Đã từ chối nạp.');
    return fallback;
  }
  return envelope.d;
}

/**
 * Kiểm tra tính hợp lệ vật lý của kết quả lượt chơi (Chống hack tốc độ / sửa thời gian)
 */
export function validateRunPlausibility(runResult) {
  if (!runResult || typeof runResult !== 'object') return false;
  // Không thể bơi 50m dưới 6.5 giây với giới hạn vật lý thực
  if (runResult.finished && (runResult.time < 6.5 || runResult.time > 90.5)) {
    return false;
  }
  // Tốc độ đỉnh không thể vượt quá 28 km/h trong hồ
  if (runResult.topSpeedKmh < 0 || runResult.topSpeedKmh > 28) {
    return false;
  }
  // Hoàn thành 50m bắt buộc phải có ít nhất 10 nhịp quạt/đạp
  if (runResult.finished && runResult.strokes < 10) {
    return false;
  }
  return true;
}

/**
 * Bộ giới hạn tần suất (Rate Limiter / Flood Guard) chống bot/macro spam sự kiện
 */
export function createRateLimiter(maxCalls = 15, windowMs = 1000) {
  const timestamps = [];
  return function allowAction() {
    const now = performance.now();
    while (timestamps.length > 0 && now - timestamps[0] > windowMs) {
      timestamps.shift();
    }
    if (timestamps.length >= maxCalls) {
      return false;
    }
    timestamps.push(now);
    return true;
  };
}

/**
 * Kích hoạt lớp bảo vệ chống DevTools (F12, Ctrl+Shift+I/J/C, Ctrl+U, Chuột phải)
 * và phát hiện cửa sổ DevTools mở để tự động tạm dừng game.
 */
export function initSecurityGuard({ onDevToolsChange } = {}) {
  // 1. Chặn phím tắt mở DevTools & View Source
  window.addEventListener(
    'keydown',
    (e) => {
      const key = e.key?.toUpperCase();
      const code = e.code;

      const isF12 = code === 'F12' || key === 'F12';
      const isInspect = (e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C', 'K'].includes(key);
      const isViewSource = (e.ctrlKey || e.metaKey) && ['U', 'S'].includes(key);

      if (isF12 || isInspect || isViewSource) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    },
    { capture: true }
  );

  // 2. Chặn chuột phải (Context Menu), Kéo thả & Copy mã nguồn giao diện
  window.addEventListener('contextmenu', (e) => e.preventDefault(), { capture: true });
  window.addEventListener('dragstart', (e) => e.preventDefault(), { capture: true });
  window.addEventListener('selectstart', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) {
      e.preventDefault();
    }
  });

  // 3. Phát hiện DevTools mở qua chênh lệch kích thước khung hình (Docked DevTools)
  let isDevToolsOpen = false;
  const checkDevTools = () => {
    const widthGap = window.outerWidth - window.innerWidth > 165;
    const heightGap = window.outerHeight - window.innerHeight > 165;
    // Bỏ qua nếu đang ở chế độ phóng to bất thường trên mobile
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const detected = !isMobile && (widthGap || heightGap);

    if (detected !== isDevToolsOpen) {
      isDevToolsOpen = detected;
      onDevToolsChange?.(isDevToolsOpen);
    }
  };

  window.addEventListener('resize', checkDevTools);
  setInterval(checkDevTools, 1200);

  return {
    get isTampered() {
      return isDevToolsOpen;
    },
  };
}

/**
 * Đóng băng sâu (Deep Freeze) các object cấu hình để ngăn chỉnh sửa hằng số vật lý lúc chạy
 */
export function deepFreeze(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}
