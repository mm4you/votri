/**
 * @file gameRegistry.js
 * @description Danh mục các trò chơi trong cổng game Vô Tri Hub.
 */

export const GAMES = [
  {
    id: 'splash-swim',
    slug: 'splash-swim',
    path: '/games/splash-swim/index.html',
    hue: 205,
    badgeVi: '100m • 4 phím QWOP',
    badgeEn: '100m • 4 keys QWOP',
    titleVi: 'Kình Ngư Vô Tri',
    titleEn: 'Splash-Stroke Swimmer',
    descVi: 'Mỗi phím điều khiển một chi: Chân (Q, W) và Tay (O, P). Phối hợp nhịp chéo nhịp nhàng để xé nước tiến vọt về đích 100m!',
    descEn: 'One key per limb: Legs (Q, W) and Arms (O, P). Alternate diagonals smoothly to surge across the 100m lane!',
    controls: [
      { key: 'Q', labelVi: 'Chân trái', labelEn: 'L.Leg', color: '#ea580c' },
      { key: 'W', labelVi: 'Chân phải', labelEn: 'R.Leg', color: '#16a34a' },
      { key: 'O', labelVi: 'Tay trái', labelEn: 'L.Arm', color: '#db2777' },
      { key: 'P', labelVi: 'Tay phải', labelEn: 'R.Arm', color: '#0284c7' },
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
    badgeVi: '100m • 3 phím F, J, Space',
    badgeEn: '100m • 3 keys F, J, Space',
    titleVi: 'Chim Béo Tập Bay',
    titleEn: 'Wobbly Wings Bird',
    descVi: 'Đập Cánh Trái (F) và Cánh Phải (J) so le để giữ thăng bằng cho chú chim béo. Bấm SPACE bắn trứng phản lực cứu nguy khẩn cấp!',
    descEn: 'Alternate Left Wing (F) and Right Wing (J) to balance your chubby bird. Press SPACE to drop an emergency egg rocket!',
    controls: [
      { key: 'F', labelVi: 'Cánh trái', labelEn: 'L.Wing', color: '#ea580c' },
      { key: 'SPACE', labelVi: 'Trứng phản lực', labelEn: 'Egg Rocket', color: '#ca8a04' },
      { key: 'J', labelVi: 'Cánh phải', labelEn: 'R.Wing', color: '#9333ea' },
    ],
    unit: 's',
    lowerIsBetter: true,
    status: 'ready',
  },
  {
    id: 'soup-run',
    slug: 'soup-run',
    path: '/games/soup-run/index.html',
    hue: 24,
    badgeVi: '50m • 3 phím F, J, Space',
    badgeEn: '50m • 3 keys F, J, Space',
    titleVi: 'Bát Canh Bỏng Tay',
    titleEn: 'Hot Soup Run',
    descVi: 'Bưng bát phở sôi sục qua hành lang quán ăn! Dùng F & J để nghiêng giữ thăng bằng chống sánh đổ. Nhấn SPACE để rón rén và thổi nguội bát canh!',
    descEn: 'Carry a brimming hot bowl of soup! Tilt left/right with F & J to counter sloshes. Hold SPACE to tip-toe and blow steam to calm waves!',
    controls: [
      { key: 'F', labelVi: 'Nghiêng trái', labelEn: 'Tilt L', color: '#ea580c' },
      { key: 'SPACE', labelVi: 'Thổi & Rón rén', labelEn: 'Blow & Slow', color: '#f97316' },
      { key: 'J', labelVi: 'Nghiêng phải', labelEn: 'Tilt R', color: '#16a34a' },
    ],
    unit: 's',
    lowerIsBetter: true,
    status: 'ready',
  },
];

export function getGameById(id) {
  return GAMES.find((g) => g.id === id) || GAMES[0];
}
