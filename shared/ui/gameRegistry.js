/**
 * @file gameRegistry.js
 * @description Danh mục các trò chơi trong cổng game Vô Tri.
 */

export const GAMES = [
  {
    id: 'splash-swim',
    slug: 'splash-swim',
    path: '/games/splash-swim/index.html',
    hue: 205,
    badgeVi: '100m • 4 phím',
    badgeEn: '100m • 4 keys',
    titleVi: 'Kình Ngư Vô Tri',
    titleEn: 'Splash-Stroke',
    descVi: 'Mỗi phím điều khiển một tay (O, P) hoặc một chân (Q, W). Có đủ 5 kiểu bơi từ Bơi Sải, Bơi Ếch tới Bơi Chó — quạt lệch nhịp là lật ngửa uống nước hồ ngay!',
    descEn: 'One key per arm (O, P) and leg (Q, W) across 5 swimming styles. Lose your rhythm for a second and you will flip over and swallow pool water.',
    controls: [
      { key: 'Q', labelVi: 'Chân trái', labelEn: 'L.Leg', color: '#e66900' },
      { key: 'W', labelVi: 'Chân phải', labelEn: 'R.Leg', color: '#00b04d' },
      { key: 'O', labelVi: 'Tay trái', labelEn: 'L.Arm', color: '#e356a2' },
      { key: 'P', labelVi: 'Tay phải', labelEn: 'R.Arm', color: '#2e91ff' },
    ],
    unit: 's',
    lowerIsBetter: true,
    status: 'ready',
  },
  {
    id: 'wobbly-bird',
    slug: 'wobbly-bird',
    path: '/games/wobbly-bird/index.html',
    hue: 38,
    badgeVi: '100m • 2 phím',
    badgeEn: '100m • 2 keys',
    titleVi: 'Chim Béo Tập Bay',
    titleEn: 'Wobbly Wings',
    descVi: 'Chỉ dùng 2 phím F (cánh trái) và J (cánh phải) để vỗ cánh bay 100m về tổ. Đập so le giữ nhịp tiến nhanh, giữ cả 2 phím để căng cánh Lướt Dù xẻ gió ổn định.',
    descEn: 'Flap your left wing (F) and right wing (J) across 100m. Alternate wings to surge forward, and hold both keys together to glide through wind gusts.',
    controls: [
      { key: 'F', labelVi: 'Cánh trái', labelEn: 'L.Wing', color: '#ff7b00' },
      { key: 'J', labelVi: 'Cánh phải', labelEn: 'R.Wing', color: '#8b5cf6' },
    ],
    unit: 's',
    lowerIsBetter: true,
    status: 'ready',
  },
];

export function getGameById(id) {
  return GAMES.find((g) => g.id === id) || GAMES[0];
}
