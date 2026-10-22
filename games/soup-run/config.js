/**
 * @file config.js
 * @description Bảng thông số cấu hình và cân bằng vật lý cho Game #3: Bát Canh Bỏng Tay (Hot Soup Run).
 */

export const SOUP_GAME_CONFIG = {
  courseLength: 50.0,      // Chiều dài hành lang đến bàn khách (50 mét)
  maxTime: 65.0,           // Thời gian tối đa (giây) trước khi khách bỏ về
  initialSoup: 100.0,      // Lượng nước dùng ban đầu (100%)
  minWinSoup: 20.0,        // Lượng nước dùng tối thiểu để khách chịu nhận bát (20%)

  // Tốc độ di chuyển
  walkSpeed: 1.85,         // Tốc độ bước chân bình thường (m/s)
  tiptoeSpeed: 0.95,       // Tốc độ rón rén khi giữ Space (m/s)
  strideFreq: 2.5,         // Tần số nhịp bước chân (bước/giây)
  gaitSwayAmp: 0.045,      // Biên độ lắc lư tự nhiên theo nhịp chân bước (rad)

  // Vật lý chất lỏng sóng sánh (Coupled Sloshing Fluid Dynamics)
  sloshFreq: 6.8,          // Tần số cộng hưởng dao động sóng nước trong bát (rad/s)
  sloshDampingNormal: 1.5, // Hệ số cản sóng tự nhiên của nước dùng béo
  sloshDampingBlown: 8.5,  // Hệ số cản sóng khi thổi phù phù (giữ Space)
  rimOverflowAngle: 0.165, // Góc nghiêng cộng hưởng tối đa (rad) trước khi tràn miệng bát
  spillRateBase: 26.0,     // Tốc độ hao hụt nước dùng (%/giây) khi tràn mép
  scaldThreshold: 0.22,    // Ngưỡng sóng tràn trúng ngón tay gây bỏng "Ái da!"

  // Lực bẻ lái giữ thăng bằng của cổ tay (F & J)
  tiltTorque: 4.8,         // Lực xoay cổ tay nâng mép bát khi bấm F / J (rad/s^2)
  tiltSpring: 4.2,         // Lực đàn hồi kéo cổ tay về vị trí cân bằng
  tiltDamping: 3.6,        // Giảm xóc chuyển động nghiêng cổ tay

  // Phục hồi sau vấp ngã
  stumbleRecoveryTime: 1.4, // Thời gian choáng sau khi vấp phải chướng ngại vật (giây)
};

export const OBSTACLES = [
  {
    id: 'cat',
    dist: 10.0,
    span: 2.2,
    nameVi: 'Mèo Mập Đang Ngủ',
    nameEn: 'Chubby Sleeping Cat',
    descVi: 'Mèo nằm chắn đường! Hãy nhấn giữ SPACE để rón rén bước qua, nếu không sẽ vấp ngã toang bát canh!',
    descEn: 'Cat on the floor! Hold SPACE to tip-toe over quietly, or you will stumble!',
    requiresTiptoe: true,
  },
  {
    id: 'puddle',
    dist: 21.0,
    span: 3.5,
    nameVi: 'Vệt Sàn Ướt Trơn Trượt',
    nameEn: 'Slippery Wet Floor',
    descVi: 'Sàn vừa lau trơn như băng! Hãy bấm nhịp nhàng F và J để giữ thăng bằng tuyệt đối!',
    descEn: 'Freshly mopped floor! Rapidly counter-balance with F and J to stay upright!',
    requiresTiptoe: false,
    wobbleImpulse: 0.28,
  },
  {
    id: 'fan',
    dist: 32.0,
    span: 4.2,
    nameVi: 'Quạt Cây Gió Thổi Bạt Mạng',
    nameEn: 'Oscillating Floor Fan',
    descVi: 'Gió quạt tạt mạnh sang phải! Nhấn giữ mép trái F để ghìm bát canh!',
    descEn: 'Strong gust blowing right! Hold Left Tilt (F) to resist the wind!',
    windForce: -0.24,
  },
  {
    id: 'lego',
    dist: 42.0,
    span: 1.2,
    nameVi: 'Cục Gạch Đồ Chơi Nhọn Hoắt',
    nameEn: 'Sharp Toy Brick',
    descVi: 'Ai làm rơi cục đồ chơi! Giữ SPACE rón rén tránh né, giẫm phải sẽ nhói buốt nảy tung bát!',
    descEn: 'Toy brick on the floor! Hold SPACE to carefully step around it!',
    requiresTiptoe: true,
  },
  {
    id: 'table',
    dist: 50.0,
    span: 1.5,
    nameVi: 'Bàn Khách VIP Số 9',
    nameEn: 'VIP Table #9',
    descVi: 'Khách đang cầm sẵn đũa chờ thưởng thức!',
    descEn: 'Diner waiting with chopsticks ready!',
  },
];

export const SOUP_SKINS = [
  {
    id: 'blue-pattern',
    nameVi: 'Gốm Hoa Lam Cổ Truyền',
    nameEn: 'Cobalt Blue Porcelain',
    bowlColor: 0xfaf8f2,
    rimColor: 0x1e3a8a,
    soupColor: 0xc25e03,
    roughness: 0.26,
    metalness: 0.04,
    badgeColor: '#1e3a8a',
  },
  {
    id: 'celadon',
    nameVi: 'Men Ngọc Thảo Mộc',
    nameEn: 'Celadon Jade Glaze',
    bowlColor: 0xdcfce7,
    rimColor: 0x15803d,
    soupColor: 0xb45309,
    roughness: 0.22,
    metalness: 0.06,
    badgeColor: '#15803d',
  },
  {
    id: 'terracotta',
    nameVi: 'Tô Đất Nung Mộc Mạc',
    nameEn: 'Rustic Terracotta Clay',
    bowlColor: 0x9a3412,
    rimColor: 0x7c2d12,
    soupColor: 0xd97706,
    roughness: 0.65,
    metalness: 0.02,
    badgeColor: '#9a3412',
  },
];

export const SOUP_RANKS = {
  legend: {
    minSoup: 85.0,
    nameVi: 'BẬC THẦY BƯNG PHỞ',
    nameEn: 'SOUP MASTER',
    subVi: 'Nước dùng sóng sánh đầy ắp, khói tỏa nghi ngút, thực khách trầm trồ khen ngợi!',
    subEn: 'Brimming hot broth, delicate aroma, customer is thrilled!',
  },
  pro: {
    minSoup: 60.0,
    nameVi: 'PHỤC VỤ CHĂM CHỈ',
    nameEn: 'DILIGENT WAITER',
    subVi: 'Chỉ rớt một vài giọt thơm lừng, bát phở vẫn thơm ngon đậm đà!',
    subEn: 'A few drops spilled, but the soup is still rich and hearty!',
  },
  clumsy: {
    minSoup: 20.0,
    nameVi: 'HẾT NƯỚC CÒN CÁI',
    nameEn: 'LEFTOVER NOODLES',
    subVi: 'Khách nhìn đáy bát thở dài: Nước dùng trôi đi đâu hết rồi em ơi?',
    subEn: 'Customer sighs: Where did all the tasty broth go?',
  },
  failed: {
    minSoup: 0.0,
    nameVi: 'TOANG BÁT CANH',
    nameEn: 'BOWL DESTROYED',
    subVi: 'Nước canh đổ lênh láng khắp sàn nhà, chủ quán trừ lương một ngày công!',
    subEn: 'Broth spilled completely on the floor! Better luck next shift!',
  },
};
