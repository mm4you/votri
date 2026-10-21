/**
 * @file config.js
 * @description Cấu hình cho Game #2: Chim Béo Tập Bay (Wobbly Wings Bird - 100m, Chỉ 2 Nút F & J).
 */

import { deepFreeze } from '../../shared/security/securityGuard.js';

export const BIRD_GAME_CONFIG = deepFreeze({
  TRACK_LENGTH: 100,     // Hành trình bay 100m từ tổ xuất phát tới tổ ấm đích
  TIME_LIMIT: 120,       // Giới hạn 120 giây
  RECOVER_DURATION: 0.36,// Thời gian rút mỏ khỏi đất khi bấm R
  FINISH_DELAY: 1.6,
  GHOST_SAMPLE_INTERVAL: 0.1,
});

export const BIRD_PHYSICS_CONFIG = deepFreeze({
  STEP: 1 / 240,         // Tần số vật lý 240Hz
  GROUND_Y: 0,           // Mặt cỏ (y = 0)
  START_Y: 0.95,         // Độ cao cành cây/bệ phóng ban đầu
  MAX_Y: 4.5,            // Trần bay tối đa

  // Biên độ góc vỗ cánh (rad)
  WING_UP: 0.90,         // Góc giơ cánh lên cao khi nhấn giữ nút
  WING_DOWN: -0.48,      // Góc đập cánh xuống khi nhả nút
  WING_GLIDE: 0.08,      // Góc dang ngang cánh khi giữ cả 2 nút (Chế độ Lướt Dù)

  UPSTROKE_SPEED: 7.8,   // Tốc độ giơ cánh lên
  FLAP_SPEED: 6.8,       // Tốc độ đập cánh xuống tạo lực nâng
  GLIDE_RATE: 9.0,

  // Trọng lực & Khí động lực học
  GRAVITY: 5.6,          // Trọng lực kéo chú chim béo
  GLIDE_GRAVITY_MULT: 0.25, // Khi giữ cả 2 nút căng cánh lướt dù -> rơi cực chậm và đằm
  FLAP_LIFT: 10.8,       // Lực nâng lên mỗi nhịp đập cánh
  FLAP_THRUST: 7.0,      // Lực đẩy bay tới mỗi nhịp đập cánh
  AIR_DRAG: 0.22,
  LINEAR_DRAG: 0.65,

  // Cân bằng & Lắc lư hài hước
  I_ROLL: 0.082,         // Quán tính ngang đằm hơn: đập lệch cánh nghiêng vui nhưng người chơi dễ sửa
  I_PITCH: 0.28,
  ROLL_TORQUE_PER_WING: 1.65, // Độ xoắn nghiêng vừa phải
  ROLL_STABILIZE_GLIDE: 42.0, // Giữ cả 2 cánh lướt dù -> tự cân bằng cực nhanh
  ROLL_STABILIZE_NORMAL: 14.5,
  ANG_DAMP: 2.8,

  // Ngưỡng Rối loạn tiền đình & Cắm mỏ
  FALL_ROLL: 1.45,       // Nghiêng quá ~83 độ mới lộn vòng tiền đình
  FALL_PITCH: 1.25,      // Chúi/ngửa quá ~71 độ mới thất tốc
  DIZZY_SPIN_RATE: 0.35, // Tích lũy độ choáng váng vừa phải

  // Gió tạt ngang ngẫu nhiên (Wind Gusts) xuất hiện sau mốc 25m
  GUST_INTERVAL_MIN: 6.0,
  GUST_INTERVAL_MAX: 10.5,
  GUST_DURATION: 2.5,
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
  { maxTime: 32, id: 'legend', vi: 'ĐẠI BÀNG TỐC HÀNH', en: 'SUPERSONIC EAGLE' },
  { maxTime: 48, id: 'race',   vi: 'BỒ CÂU ĐƯA THƯ',    en: 'EXPRESS PIGEON' },
  { maxTime: 75, id: 'pony',   vi: 'CHIM BÉO VẪY CÁNH',  en: 'CHUBBY SPARROW' },
  { maxTime: Infinity, id: 'foal', vi: 'GÀ CÔNG NGHIỆP', en: 'GROUNDED CHICKEN' },
]);

export const BIRD_SKINS = deepFreeze([
  {
    id: 'pigeon',
    nameVi: 'Bồ Câu Đưa Thư',
    nameEn: 'Chubby Pigeon',
    bodyColor: 0x64748b,
    bellyColor: 0xf1f5f9,
    wingTipColor: 0x334155,
    beakColor: 0xf59e0b,
    crestColor: 0x0284c7,
    collarColor: 0x10b981,
    eyeColor: 0xf59e0b,
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
    collarColor: 0xeab308,
    eyeColor: 0x0284c7,
  },
  {
    id: 'owl',
    nameVi: 'Cú Mèo Tròn Xoe',
    nameEn: 'Googly Owl',
    bodyColor: 0x854d0e,
    bellyColor: 0xfef3c7,
    wingTipColor: 0x451a03,
    beakColor: 0xfbbf24,
    crestColor: 0xb45309,
    collarColor: 0xd97706,
    eyeColor: 0xf59e0b,
  },
  {
    id: 'duck',
    nameVi: 'Vịt Vàng Bụng Bự',
    nameEn: 'Chubby Duck',
    bodyColor: 0xfacc15,
    bellyColor: 0xfef9c3,
    wingTipColor: 0xeab308,
    beakColor: 0xf97316,
    crestColor: 0xfb923c,
    collarColor: 0x38bdf8,
    eyeColor: 0x0284c7,
  },
]);
