/**
 * @file config.js
 * @description Tập trung toàn bộ hằng số cấu hình Game, Vật lý 240Hz, 5 Kiểu Bơi (Sải, Bướm, Ếch, Chó, Ngửa),
 * 4 Chi, Bảng Xếp Hạng và Skins Vận Động Viên Nam Mặc Quần Bơi (Đường bơi Olympic 100m).
 */

import { deepFreeze } from '../../shared/security/securityGuard.js?v=7';

export const GAME_CONFIG = deepFreeze({
  POOL_LENGTH: 100,      // Đường bơi tiêu chuẩn Olympic 100m
  TIME_LIMIT: 150,       // Thời gian giới hạn (150 giây)
  RECOVER_DURATION: 0.38,// Thời gian nội suy khi nhấn nút "Ngoi lên" (R)
  FINISH_DELAY: 1.6,     // Độ trễ ăn mừng sau khi chạm đích (giây)
  GHOST_SAMPLE_INTERVAL: 0.1, // Chu kỳ lưu mẫu vị trí Ghost Replay vào Cache (10Hz)
});

/**
 * 5 Kiểu Bơi với cơ chế vật lý, hoạt họa khớp xương 3D và cách bấm phím đặc trưng
 */
export const SWIM_STYLES = deepFreeze([
  {
    id: 'freestyle',
    nameVi: 'Bơi Sải',
    nameEn: 'Freestyle',
    tagVi: 'TỐC ĐỘ • LUÂN PHIÊN CHÉO',
    tagEn: 'FAST • DIAGONAL RHYTHM',
    tipVi: 'Mẹo Bơi Sải: Luân phiên chéo cặp (Tay Trái O + Chân Phải W) và (Tay Phải P + Chân Trái Q) thật nhanh. Nhấc trống 1 bên sẽ lật ngửa ngay!',
    tipEn: 'Freestyle Tip: Alternate diagonal pairs (Left Arm O + Right Leg W) and (Right Arm P + Left Leg Q). Leaving one side unsupported flips you over!',
    armThrustMult: 1.05,
    legThrustMult: 1.0,
    buoyancyOffset: -0.05,
    rollStabilityMult: 1.0,
    pitchStabilityMult: 1.0,
    breathDrainMult: 1.0,
    syncBonusType: 'diagonal',
  },
  {
    id: 'butterfly',
    nameVi: 'Bơi Bướm',
    nameEn: 'Butterfly',
    tagVi: 'BÙNG NỔ • ĐỒNG BỘ 2 TAY / 2 CHÂN',
    tagEn: 'EXPLOSIVE • SYNC ARMS THEN LEGS',
    tipVi: 'Mẹo Bơi Bướm: Nhấn giữ rồi nhả CẢ 2 TAY (O + P) cùng lúc để vọt ngực lên thở, sau đó đập CẢ 2 CHÂN (Q + W) kiểu đuôi cá heo!',
    tipEn: 'Butterfly Tip: Hold & release BOTH ARMS (O + P) together to surge up and breathe, then whip BOTH LEGS (Q + W) like a dolphin!',
    armThrustMult: 1.38,
    legThrustMult: 1.35,
    buoyancyOffset: -0.07,
    rollStabilityMult: 1.35,
    pitchStabilityMult: 0.85,
    breathDrainMult: 1.15,
    syncBonusType: 'paired',
  },
  {
    id: 'breaststroke',
    nameVi: 'Bơi Ếch',
    nameEn: 'Breaststroke',
    tagVi: 'QUẠT NGANG & ĐẠP CHÂN ẾCH',
    tagEn: 'WIDE SWEEP & FROG KICK',
    tipVi: 'Mẹo Bơi Ếch: Quạt 2 tay (O + P) rẽ nước sang ngang để nhô đầu lấy hơi, rồi co gối đạp 2 chân ếch (Q + W) để lướt đi.',
    tipEn: 'Breaststroke Tip: Sweep both arms (O + P) wide to lift your chin and breathe, then snap both frog legs (Q + W) to glide.',
    armThrustMult: 0.95,
    legThrustMult: 1.42,
    buoyancyOffset: -0.04,
    rollStabilityMult: 1.35,
    pitchStabilityMult: 1.15,
    breathDrainMult: 0.9,
    syncBonusType: 'paired',
  },
  {
    id: 'doggy',
    nameVi: 'Bơi Chó',
    nameEn: 'Doggy Paddle',
    tagVi: 'ĐẦU NGẨNG CAO • CÀO NƯỚC LIÊN HOÀN',
    tagEn: 'HEAD UP • RAPID PADDLING',
    tipVi: 'Mẹo Bơi Chó: Đầu ngẩng cao trên mặt nước! Cào 4 chân tay (Q, W, O, P) liên hoàn dưới ngực nhưng phải đổi bên liên tục kẻo lật nghiêng!',
    tipEn: 'Doggy Paddle Tip: Head stays high! Rapidly alternate all 4 limbs (Q, W, O, P) under your chest without leaving one side empty!',
    armThrustMult: 0.88,
    legThrustMult: 0.92,
    buoyancyOffset: 0.015,
    rollStabilityMult: 1.05,
    pitchStabilityMult: 1.05,
    breathDrainMult: 0.72,
    syncBonusType: 'rapid',
  },
  {
    id: 'backstroke',
    nameVi: 'Bơi Ngửa',
    nameEn: 'Backstroke',
    tagVi: 'NẰM NGỬA • DỄ THỞ NHƯNG DỄ LẬT',
    tagEn: 'ON YOUR BACK • EASY AIR, EASY FLIP',
    tipVi: 'Mẹo Bơi Ngửa: Bạn nằm ngửa mặt lên trời nên dễ hít thở, nhưng quạt lệch 1 bên sẽ bị lật úp sặc nước ngay lập tức!',
    tipEn: 'Backstroke Tip: Swimming on your back keeps your nose above water, but pulling unevenly on one side flips you face-down fast!',
    armThrustMult: 1.04,
    legThrustMult: 1.08,
    buoyancyOffset: -0.02,
    rollStabilityMult: 0.88,
    pitchStabilityMult: 1.0,
    breathDrainMult: 0.75,
    syncBonusType: 'diagonal',
  },
]);

export const PHYSICS_CONFIG = deepFreeze({
  STEP: 1 / 240,
  WATER_Y: 0,
});

/**
 * Thứ tự 4 chi tương ứng với chỉ số [0, 1, 2, 3]
 * 0: Tay Trái (O) | 1: Tay Phải (P) | 2: Chân Trái (Q) | 3: Chân Phải (W)
 */
export const LIMBS = deepFreeze([
  {
    index: 0,
    id: 'LA',
    nameVi: 'Tay Trái',
    nameEn: 'Left Arm',
    roleVi: 'Quạt trước',
    roleEn: 'front pull',
    key: 'KeyO',
    keyLabel: 'O',
    color: '#e356a2',
    x: 0.44,
    y: 0.04,
    z: -0.22,
    len: 0.78,
    front: true,
  },
  {
    index: 1,
    id: 'RA',
    nameVi: 'Tay Phải',
    nameEn: 'Right Arm',
    roleVi: 'Quạt trước',
    roleEn: 'front pull',
    key: 'KeyP',
    keyLabel: 'P',
    color: '#2e91ff',
    x: 0.44,
    y: 0.04,
    z: 0.22,
    len: 0.78,
    front: true,
  },
  {
    index: 2,
    id: 'LL',
    nameVi: 'Chân Trái',
    nameEn: 'Left Leg',
    roleVi: 'Đạp sau',
    roleEn: 'hind kick',
    key: 'KeyQ',
    keyLabel: 'Q',
    color: '#e66900',
    x: -0.42,
    y: -0.03,
    z: -0.14,
    len: 0.86,
    front: false,
  },
  {
    index: 3,
    id: 'RL',
    nameVi: 'Chân Phải',
    nameEn: 'Right Leg',
    roleVi: 'Đạp sau',
    roleEn: 'hind kick',
    key: 'KeyW',
    keyLabel: 'W',
    color: '#00b04d',
    x: -0.42,
    y: -0.03,
    z: 0.14,
    len: 0.86,
    front: false,
  },
]);

export const RANKS = deepFreeze([
  { maxTime: 46, id: 'legend', vi: 'KÌNH NGƯ HUYỀN THOẠI', en: 'AQUA LEGEND' },
  { maxTime: 68, id: 'race',   vi: 'VĐV OLYMPIC',          en: 'OLYMPIC SWIMMER' },
  { maxTime: 98, id: 'pony',   vi: 'RÁI CÁ VUI NHỘN',      en: 'HAPPY OTTER' },
  { maxTime: Infinity, id: 'foal', vi: 'PHAO TẬP BƠI',     en: 'POOL NOODLE' },
]);

export const SKINS = deepFreeze([
  {
    id: 'male',
    gender: 'male',
    nameVi: 'Kình Ngư Nam (Quần Bơi)',
    nameEn: 'Male Swimmer (Trunks)',
    skinColor: 0xf0b492,
    capColor: 0x00b4d8,
    suitColor: 0x0f172a,
    stripeColor: 0x00f5d4,
    goggleLens: 0x00e5ff,
  },
  {
    id: 'female',
    gender: 'female',
    nameVi: 'Kình Ngư Nữ (Đồ Bơi)',
    nameEn: 'Female Swimmer (Swimsuit)',
    skinColor: 0xf7c6aa,
    capColor: 0xf43f5e,
    suitColor: 0xbe123c,
    stripeColor: 0x72efdd,
    goggleLens: 0x38bdf8,
  },
]);
