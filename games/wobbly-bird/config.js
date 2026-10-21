/**
 * @file config.js
 * @description Cấu hình cho Game #2: Chim Béo Tập Bay (Wobbly Wings Bird - Chỉ 2 Nút F & J).
 */

import { deepFreeze } from '../../shared/security/securityGuard.js';

export const BIRD_GAME_CONFIG = deepFreeze({
  TRACK_LENGTH: 50,      // Quãng đường bay 50m từ tổ xuất phát tới tổ đích
  TIME_LIMIT: 90,        // Giới hạn 90 giây
  RECOVER_DURATION: 0.36,// Thời gian rút mỏ khỏi đất khi bấm R
  FINISH_DELAY: 1.6,
  GHOST_SAMPLE_INTERVAL: 0.1,
});

export const BIRD_PHYSICS_CONFIG = deepFreeze({
  STEP: 1 / 240,         // Tần số vật lý 240Hz
  GROUND_Y: 0,           // Mặt cỏ (y = 0)
  START_Y: 0.95,         // Độ cao cành cây/bệ phóng ban đầu
  MAX_Y: 4.2,            // Trần bay tối đa

  // Biên độ góc vỗ cánh (rad)
  WING_UP: 0.92,         // Góc giơ cánh lên cao khi nhấn giữ nút
  WING_DOWN: -0.52,      // Góc đập cánh xuống khi nhả nút
  WING_GLIDE: 0.12,      // Góc dang ngang cánh khi giữ cả 2 nút (Chế độ Lướt Dù)

  UPSTROKE_SPEED: 7.2,   // Tốc độ giơ cánh lên
  FLAP_SPEED: 6.4,       // Tốc độ đập cánh xuống tạo lực nâng
  GLIDE_RATE: 8.5,

  // Trọng lực & Khí động lực học
  GRAVITY: 6.2,          // Trọng lực kéo chú chim béo xuống
  GLIDE_GRAVITY_MULT: 0.32, // Khi giữ cả 2 nút căng cánh lướt dù -> rơi cực chậm!
  FLAP_LIFT: 11.8,       // Lực nâng lên mỗi nhịp đập cánh
  FLAP_THRUST: 7.4,      // Lực đẩy bay tới mỗi nhịp đập cánh
  AIR_DRAG: 0.28,
  LINEAR_DRAG: 0.72,

  // Cân bằng & Hiệu ứng hài hước (Xoắn ốc, Tiền đình, Gió tạt)
  I_ROLL: 0.055,         // Quán tính nghiêng trái/phải (đập lệch 1 cánh là nghiêng ngay)
  I_PITCH: 0.24,
  ROLL_TORQUE_PER_WING: 2.35, // Độ xoắn nghiêng khi đập lẻ 1 bên cánh
  ROLL_STABILIZE_GLIDE: 38.0, // Khi giữ cả 2 cánh lướt dù -> tự cân bằng góc nghiêng cực tốt
  ROLL_STABILIZE_NORMAL: 9.5,
  ANG_DAMP: 2.4,

  // Ngưỡng Rối loạn tiền đình & Cắm mỏ
  FALL_ROLL: 1.38,       // Nghiêng quá ~79 độ -> Lộn vòng tiền đình rơi tự do!
  FALL_PITCH: 1.15,      // Chúi/ngửa quá ~66 độ -> Thất tốc cắm mỏ!
  DIZZY_SPIN_RATE: 0.42, // Tốc độ tích lũy độ choáng váng khi quay vòng hoặc đập loạn

  // Gió tạt ngang ngẫu nhiên (Headwind / Crosswind Gusts)
  GUST_INTERVAL_MIN: 5.5,
  GUST_INTERVAL_MAX: 9.5,
  GUST_DURATION: 2.4,
});

export const WINGS = deepFreeze([
  {
    index: 0,
    id: 'LW',
    nameVi: 'Cánh Trái',
    nameEn: 'Left Wing',
    roleVi: 'Vỗ / Lướt',
    roleEn: 'flap / glide',
    key: 'KeyF',
    keyLabel: 'F',
    color: '#ff7b00',
    side: -1,
  },
  {
    index: 1,
    id: 'RW',
    nameVi: 'Cánh Phải',
    nameEn: 'Right Wing',
    roleVi: 'Vỗ / Lướt',
    roleEn: 'flap / glide',
    key: 'KeyJ',
    keyLabel: 'J',
    color: '#8b5cf6',
    side: 1,
  },
]);

export const BIRD_RANKS = deepFreeze([
  { maxTime: 22, id: 'legend', vi: 'ĐẠI BÀNG TỐC HÀNH', en: 'SUPERSONIC EAGLE' },
  { maxTime: 35, id: 'race',   vi: 'BỒ CÂU ĐƯA THƯ',    en: 'EXPRESS PIGEON' },
  { maxTime: 55, id: 'pony',   vi: 'CHIM BÉO VẪY CÁNH',  en: 'CHUBBY SPARROW' },
  { maxTime: Infinity, id: 'foal', vi: 'GÀ CÔNG NGHIỆP', en: 'GROUNDED CHICKEN' },
]);

export const BIRD_SKINS = deepFreeze([
  {
    id: 'pigeon',
    nameVi: 'Bồ Câu Đưa Thư',
    nameEn: 'Chubby Pigeon',
    bodyColor: 0x64748b,
    bellyColor: 0xf8fafc,
    wingTipColor: 0x334155,
    beakColor: 0xff9f1c,
    crestColor: 0x38bdf8,
  },
  {
    id: 'parrot',
    nameVi: 'Vẹt Nhiệt Đới',
    nameEn: 'Tropical Macaw',
    bodyColor: 0xef4444,
    bellyColor: 0xfef08a,
    wingTipColor: 0x2563eb,
    beakColor: 0xf59e0b,
    crestColor: 0x22c55e,
  },
  {
    id: 'owl',
    nameVi: 'Cú Mèo Mắt Lồi',
    nameEn: 'Googly Owl',
    bodyColor: 0x92400e,
    bellyColor: 0xfde68a,
    wingTipColor: 0x451a03,
    beakColor: 0xfbbf24,
    crestColor: 0xd97706,
  },
  {
    id: 'duck',
    nameVi: 'Vịt Vàng Bụng Phệ',
    nameEn: 'Rubber Ducky',
    bodyColor: 0xfacc15,
    bellyColor: 0xfef9c3,
    wingTipColor: 0xeab308,
    beakColor: 0xf97316,
    crestColor: 0xfacc15,
  },
]);
