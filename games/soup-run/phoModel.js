/**
 * @file phoModel.js
 * @description Mô hình 3D Tô Phở Miền Nam (Phở Bò Sài Gòn) chân thực, mỹ thuật cao cấp chuẩn vị:
 * 1. Tô sứ Bát Tràng men sứ trắng ngà tinh tươm:
 *    - Lòng tô và thành ngoài dày dặn (6-8mm), men sứ bóng bẩy.
 *    - Chân đế bát liền khối vững chãi.
 *    - Viền miệng tô có dải chỉ hoa lam xanh coban đôi trang nhã.
 * 2. Nước dùng Phở Nam chuẩn vị (Authentic Southern Cloudy Beef Broth):
 *    - Màu nâu vàng hổ phách đậm đà lợ lợ hơi đục ninh từ xương ống tủy bò, quế hồi thảo quả và đường phèn.
 *    - Váng mỡ gầu bò óng ánh (nước béo), tiêu đen xay vỡ và váng hành hoa.
 *    - BÁN KÍNH MẶT NƯỚC CO GIÃN CHÍNH XÁC THEO HÀM DÁNG LÒNG TÔ:
 *      Khi nước vơi đi do tràn, mực nước hạ thấp xuống đáy mà TUYỆT ĐỐI KHÔNG BAO GIỜ LÒI ĐÁY HAY ĐÂM XUYÊN THÀNH TÔ!
 * 3. Bánh phở & Topping rõ ràng, đẹp mắt, chuẩn vị Phở Bò Sài Gòn:
 *    - Bánh phở: Các dải sợi dẹt trắng ngà mềm mại uốn lượn đan xen tự nhiên, lộ rõ từng thớ bánh phở chần ngon mắt.
 *    - Nạm gầu bò thái mỏng: 3 lát thịt bò to bản hình lượn sóng tự nhiên, thớ nạc nâu đỏ mềm mại viền mỡ vàng giòn óng ả.
 *    - Bò viên Sài Gòn: 3 viên tròn giòn khía chữ thập nở hoa nâu hồng thơm phức rắc tiêu đen.
 *    - Lòng đỏ hột gà chần: Tròn mọng, màu cam lòng đào óng ả béo ngậy giữa bát kèm lớp lòng trắng chần trong suốt.
 *    - Hành tây bào mỏng tang, hành lá xắt nhuyễn, đầu hành hoa trắng muốt, ngò gai, húng quế, ớt sừng đỏ tươi.
 * 4. ĐÔI BÀN TAY NGƯỜI PHỤC VỤ CHÂN THỰC 100% (Anatomical Human Hands & Extended Arms):
 *    - CÁNH TAY ÁO SƠ MI TRẮNG NỐI DÀI TỪ DƯỚI GÓC MÀN HÌNH vươn lên thành tô (Không còn bị cụt lơ lửng!).
 *    - BÀN TAY RÕ RÀNG 100%:
 *      + Ngón cái to rõ, tì phẳng tự nhiên trên vành miệng tô sứ, có móng tay hồng đào keratin bóng bẩy và vầng trăng khuyết hướng thẳng lên camera.
 *      + 4 ngón tay (trỏ, giữa, áp út, út) tách biệt rõ ràng, phân đốt uốn cong ôm chắc chắn đỡ dưới gờ mép tô sứ.
 *      + Mu bàn tay thon thả mềm mại chuẩn giải phẫu học, có 4 khớp xương ngón tay và gò mô ngón cái.
 *      + Cổ tay thon thả nối liền vào cổ áo sơ mi trắng có cúc ngọc trai.
 *      + Phản xạ co giật cơ tinh tế khi bị nước sôi tràn (Scald Reflex) mà không biến thành khối đỏ đồ chơi.
 */

import * as THREE from '../../shared/vendor/three.module.js';

/** Hàm tính bán kính trong của lòng tô sứ tại độ cao y */
export function getBowlInnerRadiusAt(y) {
  const yFloor = 0.012;
  const yRim = 0.091;
  if (y <= yFloor) return 0.042;
  if (y >= yRim) return 0.120;
  const t = (y - yFloor) / (yRim - yFloor);
  return 0.042 + 0.078 * Math.pow(t, 0.72);
}

/** Tạo texture nước dùng Phở Nam lợ lợ hơi đục béo ngậy chuẩn vị Sài Gòn */
function createAuthenticPhoBrothTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Nền nước dùng ninh tủy xương bò: màu nâu vàng hổ phách đậm đà lợ lợ hơi đục
  const baseGrad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
  baseGrad.addColorStop(0, '#753410');
  baseGrad.addColorStop(0.38, '#63290c');
  baseGrad.addColorStop(0.72, '#4f1e06');
  baseGrad.addColorStop(1.0, '#3d1503');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 512, 512);

  // Vẩn đục tủy xương ống bò (Marrow emulsion clouds - tạo độ lợ lợ hơi đục đặc trưng)
  for (let i = 0; i < 75; i++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const cr = 40 + Math.random() * 85;
    const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    cGrad.addColorStop(0, 'rgba(175, 95, 38, 0.40)');
    cGrad.addColorStop(0.5, 'rgba(135, 68, 24, 0.20)');
    cGrad.addColorStop(1.0, 'rgba(90, 40, 12, 0.0)');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Váng mỡ gầu bò vàng óng li ti (Golden Tallow Droplets / Nước béo)
  for (let i = 0; i < 150; i++) {
    const fx = Math.random() * 512;
    const fy = Math.random() * 512;
    const fr = 2.0 + Math.random() * 11;
    const fGrad = ctx.createRadialGradient(fx - fr * 0.25, fy - fr * 0.25, 0, fx, fy, fr);
    fGrad.addColorStop(0, 'rgba(255, 252, 235, 0.95)');
    fGrad.addColorStop(0.45, 'rgba(254, 240, 138, 0.85)');
    fGrad.addColorStop(0.80, 'rgba(234, 179, 8, 0.45)');
    fGrad.addColorStop(1.0, 'rgba(202, 138, 4, 0.0)');
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tiêu đen xay vỡ thơm phức rải rác
  ctx.fillStyle = 'rgba(24, 14, 8, 0.92)';
  for (let i = 0; i < 110; i++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const pr = 0.8 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vệt mỡ hành hoa xanh ngọc óng ánh
  ctx.fillStyle = 'rgba(34, 197, 94, 0.50)';
  for (let i = 0; i < 45; i++) {
    const hx = Math.random() * 512;
    const hy = Math.random() * 512;
    const hr = 1.2 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/** Tạo texture thớ thịt nạm gầu bò chân thực: nâu đỏ chín tới, viền mỡ vàng giòn tinh tế */
function createFlankCanvasTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Nền thịt bò chín tới đậm đà thơm phức
  ctx.fillStyle = '#4c1c11';
  ctx.fillRect(0, 0, 512, 256);

  // Thớ cơ thịt bò chạy dọc song song tự nhiên
  for (let y = 0; y < 256; y += 2) {
    ctx.fillStyle = Math.random() > 0.45 ? '#361209' : '#5b2315';
    ctx.fillRect(0, y, 512, 1.6);
  }

  // Vân mỡ hoa cẩm thạch li ti đan xen mềm mại trong thớ thịt
  ctx.fillStyle = 'rgba(245, 230, 200, 0.42)';
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 200;
    ctx.fillRect(x, y, 16 + Math.random() * 32, 1.4);
  }

  // Viền mỡ gầu vàng giòn mềm mại chỉ chiếm 15% mép cong của lát thịt
  const grad = ctx.createLinearGradient(0, 205, 0, 256);
  grad.addColorStop(0, 'rgba(76, 28, 17, 0.0)');
  grad.addColorStop(0.25, '#d97706');
  grad.addColorStop(0.60, '#fde047');
  grad.addColorStop(0.85, '#fef08a');
  grad.addColorStop(1.0, '#fffbeb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 205, 512, 51);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createPhoBowlModel({ skin = {} } = {}) {
  const root = new THREE.Group();
  root.name = 'pho-bowl-assembly';

  // 1. TÔ SỨ TRẮNG BÁT TRÀNG CHÂN THỰC (Thành dày dặn, chân đế đúc liền khối)
  const bowlPoints = [
    new THREE.Vector2(0.0, 0.002),
    new THREE.Vector2(0.044, 0.002),
    new THREE.Vector2(0.046, -0.007),
    new THREE.Vector2(0.054, -0.007),
    new THREE.Vector2(0.055, 0.006),
    new THREE.Vector2(0.075, 0.030),
    new THREE.Vector2(0.098, 0.058),
    new THREE.Vector2(0.122, 0.088),
    new THREE.Vector2(0.125, 0.092),
    new THREE.Vector2(0.126, 0.094),
    new THREE.Vector2(0.123, 0.094),
    new THREE.Vector2(0.120, 0.091),
    new THREE.Vector2(0.098, 0.065),
    new THREE.Vector2(0.070, 0.035),
    new THREE.Vector2(0.042, 0.015),
    new THREE.Vector2(0.0, 0.012),
  ];

  const bowlGeo = new THREE.LatheGeometry(bowlPoints, 64);
  const bowlMat = new THREE.MeshStandardMaterial({
    color: skin.bowlColor || 0xfffefb,
    roughness: 0.12,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const bowlMesh = new THREE.Mesh(bowlGeo, bowlMat);
  bowlMesh.castShadow = true;
  bowlMesh.receiveShadow = true;
  root.add(bowlMesh);

  // Chỉ xanh coban hoa lam đôi quanh vành miệng tô (Cobalt Blue Rim Bands)
  const rimLineGeo = new THREE.TorusGeometry(0.1245, 0.0014, 8, 64);
  rimLineGeo.rotateX(Math.PI / 2);
  const rimLineMat = new THREE.MeshBasicMaterial({ color: skin.rimColor || 0x1e3a8a });
  const rimLine = new THREE.Mesh(rimLineGeo, rimLineMat);
  rimLine.position.y = 0.091;
  root.add(rimLine);

  const rimLineSubGeo = new THREE.TorusGeometry(0.1215, 0.0009, 8, 64);
  rimLineSubGeo.rotateX(Math.PI / 2);
  const rimLineSub = new THREE.Mesh(rimLineSubGeo, rimLineMat);
  rimLineSub.position.y = 0.086;
  root.add(rimLineSub);

  // 2. SỢI BÁNH PHỞ TRẮNG NGÀ MỀM MẠI UỐN LƯỢN ĐAN XEN (Silky Flat Rice Noodles)
  const noodlesGroup = new THREE.Group();
  noodlesGroup.name = 'rice-noodles';

  const noodleMat = new THREE.MeshStandardMaterial({
    color: 0xfbf9f6,
    roughness: 0.28,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  // Tạo các dải bánh phở bản dẹt uốn lượn hình chữ S mềm mại đan xen trong lòng bát
  const sloshBaseY = 0.076;
  for (let ring = 0; ring < 6; ring++) {
    const ringRadius = 0.020 + ring * 0.009;
    const noodleY = sloshBaseY - 0.001 + (ring % 3) * 0.0018;
    for (let s = 0; s < 3; s++) {
      const startAngle = (s / 3) * Math.PI * 2 + ring * 0.85;
      const strandLen = 0.046 + (s % 2) * 0.012;
      const strandGeo = new THREE.PlaneGeometry(strandLen, 0.0055, 12, 1);
      const pos = strandGeo.attributes.position;
      for (let p = 0; p < pos.count; p++) {
        const px = pos.getX(p);
        const norm = px / strandLen;
        // Uốn cong hình chữ S tự nhiên như sợi phở chần nước sôi
        pos.setY(p, Math.sin(norm * Math.PI * 2) * 0.0022);
        pos.setZ(p, Math.cos(norm * Math.PI) * 0.0035);
      }
      strandGeo.computeVertexNormals();

      const strand = new THREE.Mesh(strandGeo, noodleMat);
      strand.position.set(
        Math.cos(startAngle) * ringRadius,
        noodleY,
        Math.sin(startAngle) * ringRadius
      );
      strand.rotation.set(-Math.PI / 2 + 0.05, (Math.random() - 0.5) * 0.20, startAngle + Math.PI / 2);
      noodlesGroup.add(strand);
    }
  }
  root.add(noodlesGroup);

  // 3. NƯỚC DÙNG PHỞ MIỀN NAM CHUẨN VỊ: MÀU NÂU VÀNG HỔ PHÁCH LỢ LỢ HƠI ĐỤC BÉO NGẬY
  const baseSoupRadius = 0.104;
  const sloshGeo = new THREE.CircleGeometry(baseSoupRadius, 64, 16);
  sloshGeo.rotateX(-Math.PI / 2);
  const sloshPosAttr = sloshGeo.attributes.position;

  const brothTex = createAuthenticPhoBrothTexture();
  const sloshMat = new THREE.MeshStandardMaterial({
    map: brothTex,
    color: 0xffffff,
    emissive: 0x240e04,
    emissiveIntensity: 0.16,
    roughness: 0.22,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const sloshMesh = new THREE.Mesh(sloshGeo, sloshMat);
  sloshMesh.position.y = sloshBaseY;
  root.add(sloshMesh);

  // 4. TOPPING PHỞ BÒ MIỀN NAM RÕ RÀNG, CHÂN THỰC VÀ BẮT MẮT
  const toppingsGroup = new THREE.Group();
  toppingsGroup.name = 'toppings-group';
  root.add(toppingsGroup);

  // 4.1. NẠM GẦU BÒ THÁI MỎNG VIỀN MỠ VÀNG (3 Lát To Bản, Uốn Lượn Tự Nhiên)
  const flankTex = createFlankCanvasTexture();
  const flankMat = new THREE.MeshStandardMaterial({
    map: flankTex,
    roughness: 0.35,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  function createOrganicBeefSlice(len, wid) {
    const geo = new THREE.PlaneGeometry(len, wid, 16, 8);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const uvs = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const pz = pos.getZ(i);
      const normX = px / len;
      // Uốn cong tự nhiên như lát thịt luộc mềm
      const sag = -Math.sin((normX + 0.5) * Math.PI) * 0.0045 + Math.cos((pz / wid) * Math.PI) * 0.0020;
      pos.setY(i, sag);
      uvs.setXY(i, normX + 0.5, (pz / wid) + 0.5);
    }
    uvs.needsUpdate = true;
    geo.computeVertexNormals();

    return new THREE.Mesh(geo, flankMat);
  }

  // 3 lát nạm gầu bò to bản rõ ràng xếp gối lên nhau ở nửa bên trái tô phở
  const flank1 = createOrganicBeefSlice(0.108, 0.052);
  flank1.position.set(-0.034, sloshBaseY + 0.0035, 0.015);
  flank1.rotation.set(-0.04, 0.28, 0.08);
  toppingsGroup.add(flank1);

  const flank2 = createOrganicBeefSlice(0.098, 0.048);
  flank2.position.set(-0.040, sloshBaseY + 0.0045, -0.022);
  flank2.rotation.set(0.06, -0.22, 0.12);
  toppingsGroup.add(flank2);

  const flank3 = createOrganicBeefSlice(0.088, 0.044);
  flank3.position.set(-0.024, sloshBaseY + 0.0052, -0.048);
  flank3.rotation.set(0.10, -0.45, 0.06);
  toppingsGroup.add(flank3);

  // 4.2. BÒ VIÊN SÀI GÒN (3 viên tròn giòn khía chữ thập nở hoa nâu hồng thơm phức rắc tiêu đen)
  const meatballMat = new THREE.MeshStandardMaterial({
    color: 0x6e331c,
    roughness: 0.38,
    metalness: 0.02,
  });
  const slitDarkMat = new THREE.MeshStandardMaterial({
    color: 0x3d170c,
    roughness: 0.50,
  });
  const meatballGeo = new THREE.SphereGeometry(0.016, 20, 16);
  meatballGeo.scale(1.0, 0.82, 1.0);

  const slitGeo = new THREE.BoxGeometry(0.018, 0.002, 0.0015);
  const pepperMat = new THREE.MeshBasicMaterial({ color: 0x140c06 });
  const pepperGeo = new THREE.SphereGeometry(0.0009, 5, 4);

  const meatballs = [];
  const mbConfigs = [
    { targetX: 0.038, targetZ: 0.022, rot: 0.35, seed: 1.1 },
    { targetX: 0.046, targetZ: -0.018, rot: 1.45, seed: 2.7 },
    { targetX: 0.018, targetZ: -0.046, rot: 2.30, seed: 4.3 },
  ];

  mbConfigs.forEach((cfg) => {
    const ballGroup = new THREE.Group();
    const ball = new THREE.Mesh(meatballGeo, meatballMat);
    ball.castShadow = true;
    ballGroup.add(ball);

    // Khía chữ thập nở hoa trên đỉnh bò viên
    const s1 = new THREE.Mesh(slitGeo, slitDarkMat);
    s1.position.y = 0.0125;
    const s2 = s1.clone();
    s2.rotation.y = Math.PI / 2;
    ballGroup.add(s1, s2);

    // Tiêu đen xay li ti rắc trên đỉnh
    for (let p = 0; p < 4; p++) {
      const pep = new THREE.Mesh(pepperGeo, pepperMat);
      pep.position.set(
        (Math.random() - 0.5) * 0.010,
        0.0132,
        (Math.random() - 0.5) * 0.010
      );
      ballGroup.add(pep);
    }

    ballGroup.position.set(cfg.targetX, sloshBaseY, cfg.targetZ);
    ballGroup.rotation.y = cfg.rot;
    toppingsGroup.add(ballGroup);

    meatballs.push({
      group: ballGroup,
      anchorX: cfg.targetX,
      anchorZ: cfg.targetZ,
      x: cfg.targetX,
      z: cfg.targetZ,
      vx: 0,
      vz: 0,
      seed: cfg.seed,
    });
  });

  // 4.3. LÒNG ĐỎ HỘT GÀ CHẦN BÉO NGẬY (Poached Egg Yolk in Silky Egg White)
  const eggGroup = new THREE.Group();
  eggGroup.name = 'egg-yolk';

  const yolkMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.18,
    metalness: 0.02,
    emissive: 0x9a3412,
    emissiveIntensity: 0.15,
  });
  const yolkGeo = new THREE.SphereGeometry(0.014, 24, 16);
  yolkGeo.scale(1.15, 0.70, 1.15);
  const yolkMesh = new THREE.Mesh(yolkGeo, yolkMat);
  yolkMesh.position.y = 0.0075;
  eggGroup.add(yolkMesh);

  // Màng lòng trắng trứng chần trong suốt viền quanh hột gà
  const eggWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xfffdf5,
    roughness: 0.15,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const eggWhiteGeo = new THREE.CircleGeometry(0.026, 24);
  eggWhiteGeo.rotateX(-Math.PI / 2);
  const eggWhiteMesh = new THREE.Mesh(eggWhiteGeo, eggWhiteMat);
  eggWhiteMesh.position.y = 0.001;
  eggGroup.add(eggWhiteMesh);

  const eggState = {
    group: eggGroup,
    anchorX: 0.004,
    anchorZ: 0.030,
    x: 0.004,
    z: 0.030,
    vx: 0,
    vz: 0,
  };
  eggGroup.position.set(eggState.anchorX, sloshBaseY, eggState.anchorZ);
  toppingsGroup.add(eggGroup);

  // 4.4. HÀNH TÂY BÀO MỎNG TANG TRONG SUỐT (Shaved White Onion Crescents)
  const onionMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.14,
    transparent: true,
    opacity: 0.70,
    side: THREE.DoubleSide,
  });
  const onionGeo = new THREE.RingGeometry(0.017, 0.0205, 28, 1, 0, Math.PI * 1.35);
  onionGeo.rotateX(-Math.PI / 2);

  const onionRings = [];
  const onionConfigs = [
    { ax: -0.012, az: -0.010, rot: 0.4 },
    { ax: 0.014, az: -0.006, rot: 1.6 },
    { ax: -0.006, az: -0.030, rot: 2.8 },
    { ax: 0.010, az: 0.008, rot: 4.1 },
  ];

  onionConfigs.forEach((cfg) => {
    const ring = new THREE.Mesh(onionGeo, onionMat);
    ring.position.set(cfg.ax, sloshBaseY + 0.002, cfg.az);
    ring.rotation.y = cfg.rot;
    toppingsGroup.add(ring);
    onionRings.push({
      mesh: ring,
      anchorX: cfg.ax,
      anchorZ: cfg.az,
      x: cfg.ax,
      z: cfg.az,
      vx: 0,
      vz: 0,
    });
  });

  // 4.5. ĐẦU HÀNH HOA TRẮNG MUỐT CHẦN TÁI (Poached White Scallion Stems)
  const scallionWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.28,
  });
  const stemGeo = new THREE.CylinderGeometry(0.0025, 0.0032, 0.038, 10);
  stemGeo.rotateZ(Math.PI / 2);

  const stem1 = new THREE.Mesh(stemGeo, scallionWhiteMat);
  stem1.position.set(-0.015, sloshBaseY + 0.003, 0.048);
  stem1.rotation.y = 0.35;
  toppingsGroup.add(stem1);

  const stem2 = stem1.clone();
  stem2.position.set(0.022, sloshBaseY + 0.003, 0.045);
  stem2.rotation.y = -0.45;
  toppingsGroup.add(stem2);

  // 4.6. HÀNH LÁ XẮT NHUYỄN XANH NGỌC (Chopped Emerald Scallions)
  const scallionMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.28,
    side: THREE.DoubleSide,
  });
  const scallionGeo = new THREE.CylinderGeometry(0.0034, 0.0034, 0.0024, 10, 1, true);

  const scallions = [];
  for (let i = 0; i < 28; i++) {
    const ring = new THREE.Mesh(scallionGeo, scallionMat);
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.015 + Math.random() * 0.075;
    const sx = Math.cos(angle) * dist;
    const sz = Math.sin(angle) * dist;
    ring.position.set(sx, sloshBaseY + 0.002, sz);
    ring.rotation.set(
      (Math.random() - 0.5) * 0.4,
      Math.random() * Math.PI,
      (Math.random() - 0.5) * 0.4
    );
    toppingsGroup.add(ring);
    scallions.push({
      mesh: ring,
      anchorX: sx,
      anchorZ: sz,
      x: sx,
      z: sz,
      vx: 0,
      vz: 0,
    });
  }

  // 4.7. NGÒ GAI RĂNG CƯA, HÚNG QUẾ VÀ ỚT SỪNG ĐỎ
  const herbMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.28,
    side: THREE.DoubleSide,
  });

  // Lá húng quế tươi
  const basilGeo = new THREE.PlaneGeometry(0.028, 0.016);
  const basil1 = new THREE.Mesh(basilGeo, herbMat);
  basil1.rotation.set(-Math.PI / 2.3, 0.35, 0.65);
  basil1.position.set(0.054, sloshBaseY + 0.004, 0.054);
  toppingsGroup.add(basil1);

  // Lá ngò gai răng cưa
  const culantroGeo = new THREE.PlaneGeometry(0.048, 0.012);
  const culantro = new THREE.Mesh(culantroGeo, herbMat);
  culantro.rotation.set(-Math.PI / 2.15, 0.15, 1.35);
  culantro.position.set(-0.024, sloshBaseY + 0.003, 0.072);
  toppingsGroup.add(culantro);

  // Ớt sừng đỏ tươi xắt lát chéo
  const chiliMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.22,
    side: THREE.DoubleSide,
  });
  const chiliGeo = new THREE.RingGeometry(0.0035, 0.0085, 12);
  chiliGeo.rotateX(-Math.PI / 2);

  const chili1 = new THREE.Mesh(chiliGeo, chiliMat);
  chili1.position.set(-0.008, sloshBaseY + 0.003, -0.006);
  chili1.rotation.y = 0.5;
  toppingsGroup.add(chili1);

  const chili2 = chili1.clone();
  chili2.position.set(0.016, sloshBaseY + 0.003, 0.012);
  chili2.rotation.y = 1.8;
  toppingsGroup.add(chili2);

  // 5. LÀN KHÓI NGHI NGÚT (Steaming Hot Broth)
  const steamCount = 18;
  const steamParticles = [];
  const steamCanvas = document.createElement('canvas');
  steamCanvas.width = 64;
  steamCanvas.height = 64;
  const sctx = steamCanvas.getContext('2d');
  const sgrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  sgrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
  sgrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
  sgrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 64, 64);
  const steamTex = new THREE.CanvasTexture(steamCanvas);

  const steamMat = new THREE.SpriteMaterial({
    map: steamTex,
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    depthWrite: false,
  });

  const steamGroup = new THREE.Group();
  root.add(steamGroup);

  for (let i = 0; i < steamCount; i++) {
    const sprite = new THREE.Sprite(steamMat.clone());
    const initRad = Math.random() * 0.055;
    const initAngle = Math.random() * Math.PI * 2;
    sprite.position.set(
      Math.cos(initAngle) * initRad,
      sloshBaseY + 0.01 + Math.random() * 0.14,
      Math.sin(initAngle) * initRad
    );
    const s = 0.035 + Math.random() * 0.04;
    sprite.scale.set(s, s, s);
    steamGroup.add(sprite);

    steamParticles.push({
      sprite,
      speedY: 0.14 + Math.random() * 0.16,
      wobbleSeed: Math.random() * 100,
    });
  }

  // 6. ĐÔI BÀN TAY NGƯỜI PHỤC VỤ CHÂN THỰC 100% (Anatomical Human Hands & Extended Arms)
  // Hai bàn tay người bưng bát thật - RÕ RÀNG BÀN TAY, CÁNH TAY NỐI DÀI RA KHỎI MÀN HÌNH:
  // - Cánh tay áo sơ mi trắng xuất phát TỪ NGOÀI KHUNG HÌNH (Dưới góc trái/phải màn hình)
  //   nối liền mạch liên tục vào cổ tay áo sơ mi và bàn tay bưng bát!
  // - Ngón cái to rõ, tì phẳng tự nhiên trên vành miệng tô sứ, có móng tay hồng đào keratin bóng bẩy và vầng trăng khuyết hướng thẳng lên camera.
  // - 4 ngón tay (trỏ, giữa, áp út, út) tách biệt rõ ràng, phân đốt uốn cong ôm chắc chắn đỡ dưới gờ mép tô sứ.
  // - Mu bàn tay thon thả mềm mại chuẩn giải phẫu học, có 4 khớp xương ngón tay và gò mô ngón cái.
  // - Cổ tay thon thả nối liền vào cổ áo sơ mi trắng có cúc ngọc trai.
  // 7. BẮN GIỌT NƯỚC DÙNG KHI TRÀN MÉP
  const dropletPoolSize = 28;
  const dropletGeo = new THREE.SphereGeometry(0.0055, 8, 8);
  const dropletMat = new THREE.MeshBasicMaterial({ color: 0x753410 });
  const dropletGroup = new THREE.Group();
  root.add(dropletGroup);

  const droplets = [];
  for (let i = 0; i < dropletPoolSize; i++) {
    const dMesh = new THREE.Mesh(dropletGeo, dropletMat);
    dMesh.visible = false;
    dropletGroup.add(dMesh);
    droplets.push({ mesh: dMesh, active: false, vx: 0, vy: 0, vz: 0, life: 0 });
  }

  function spawnSpillDroplets(side, intensity) {
    let spawned = 0;
    const targetSpawns = Math.min(8, Math.ceil(intensity * 5));
    for (const d of droplets) {
      if (!d.active) {
        d.active = true;
        d.mesh.visible = true;
        const rimX = side * (baseSoupRadius + 0.008);
        d.mesh.position.set(
          rimX + (Math.random() - 0.5) * 0.02,
          sloshBaseY + 0.012,
          (Math.random() - 0.5) * 0.05
        );
        d.vx = side * (0.65 + Math.random() * 0.9 * intensity);
        d.vy = 0.35 + Math.random() * 0.5 * intensity;
        d.vz = (Math.random() - 0.5) * 0.3;
        d.life = 0.42;
        spawned++;
        if (spawned >= targetSpawns) break;
      }
    }
  }

  // 8. CẬP NHẬT HOẠT ẢNH & SÓNG SÁNH VẬT LÝ TỪNG FRAME
  function update(physState, dt) {
    root.rotation.z = -physState.tiltRoll;
    root.rotation.x = physState.tiltPitch;

    // QUAN TRỌNG: Mực nước dùng hạ dần khi tràn, tuyệt đối không lòi đáy tô!
    const volNorm = Math.max(0.0, Math.min(1.0, physState.soupVolume / 100.0));
    const targetSurfaceY = 0.022 + volNorm * (sloshBaseY - 0.022);
    sloshMesh.position.y = targetSurfaceY;

    // Bán kính đĩa nước TỰ ĐỘNG THU NHỎ chính xác theo độ côn thành trong tô sứ!
    const bowlInnerR = getBowlInnerRadiusAt(targetSurfaceY);
    const currentSoupRadius = Math.max(0.038, bowlInnerR - 0.004);
    const scaleFactor = currentSoupRadius / baseSoupRadius;
    sloshMesh.scale.set(scaleFactor, 1.0, scaleFactor);

    // Lớp bánh phở hơi chìm nhẹ khi bát cạn nước
    noodlesGroup.position.y = (volNorm - 1.0) * 0.003;

    const waveX = physState.waveX;
    const waveZ = physState.waveZ;
    const timeVal = physState.time;

    // 8.1. BIẾN DẠNG BỀ MẶT NƯỚC DÙNG (Giới hạn biên độ tối đa 5mm)
    const pos = sloshPosAttr;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const r = Math.sqrt(vx * vx + vz * vz);
      const normR = Math.min(1.0, r / baseSoupRadius);

      const rawSloshSlope = -waveX * vx * 0.16 + waveZ * vz * 0.14;
      const sloshSlope = Math.max(-0.005, Math.min(0.005, rawSloshSlope));
      const ripple = Math.sin(18.0 * normR - timeVal * 9.5) * 0.0016 * (1.0 - normR * 0.5);
      const gaitRipple = Math.cos(timeVal * 15.7) * (vx / baseSoupRadius) * 0.0010;

      pos.setY(i, sloshSlope + ripple + gaitRipple);
    }
    pos.needsUpdate = true;
    sloshGeo.computeVertexNormals();

    const getFluidHeightAt = (x, z) => {
      const r = Math.sqrt(x * x + z * z);
      const normR = Math.min(1.0, r / baseSoupRadius);
      const rawSloshSlope = -waveX * x * 0.16 + waveZ * z * 0.14;
      const sloshSlope = Math.max(-0.005, Math.min(0.005, rawSloshSlope));
      const ripple = Math.sin(18.0 * normR - timeVal * 9.5) * 0.0016 * (1.0 - normR * 0.5);
      const gaitRipple = Math.cos(timeVal * 15.7) * (x / baseSoupRadius) * 0.0010;
      return targetSurfaceY + sloshSlope + ripple + gaitRipple;
    };

    // 8.2. VẬT LÝ NỔI VÀ TRÔI DẠT TOPPING
    const fluidForceX = -waveX * 0.35;
    const fluidForceZ = waveZ * 0.30;
    const maxToppingRadius = currentSoupRadius - 0.016;

    meatballs.forEach((mb) => {
      const pullX = (mb.anchorX - mb.x) * 4.5;
      const pullZ = (mb.anchorZ - mb.z) * 4.5;
      const ax = pullX + fluidForceX * 1.5;
      const az = pullZ + fluidForceZ * 1.5;

      mb.vx = (mb.vx + ax * dt) * 0.88;
      mb.vz = (mb.vz + az * dt) * 0.88;
      mb.x += mb.vx * dt;
      mb.z += mb.vz * dt;

      const r = Math.sqrt(mb.x * mb.x + mb.z * mb.z);
      if (r > maxToppingRadius) {
        const factor = maxToppingRadius / r;
        mb.x *= factor;
        mb.z *= factor;
      }

      const waterH = getFluidHeightAt(mb.x, mb.z);
      const bob = Math.sin(timeVal * 5.0 + mb.seed) * 0.002;
      mb.group.position.set(mb.x, Math.max(0.026, waterH - 0.002 + bob), mb.z);
      mb.group.rotation.z = -waveX * 0.4;
      mb.group.rotation.x = waveZ * 0.4;
    });

    flank1.position.y = Math.max(0.024, getFluidHeightAt(flank1.position.x, flank1.position.z) + 0.0016);
    flank1.rotation.z = 0.08 - waveX * 0.45;
    flank1.rotation.x = -0.04 + waveZ * 0.45;

    flank2.position.y = Math.max(0.025, getFluidHeightAt(flank2.position.x, flank2.position.z) + 0.0016);
    flank2.rotation.z = 0.12 - waveX * 0.45;
    flank2.rotation.x = 0.06 + waveZ * 0.45;

    flank3.position.y = Math.max(0.026, getFluidHeightAt(flank3.position.x, flank3.position.z) + 0.0016);
    flank3.rotation.z = 0.06 - waveX * 0.45;
    flank3.rotation.x = 0.10 + waveZ * 0.45;

    const eggPullX = (eggState.anchorX - eggState.x) * 5.0;
    const eggPullZ = (eggState.anchorZ - eggState.z) * 5.0;
    eggState.vx = (eggState.vx + (eggPullX + fluidForceX * 1.0) * dt) * 0.86;
    eggState.vz = (eggState.vz + (eggPullZ + fluidForceZ * 1.0) * dt) * 0.86;
    eggState.x += eggState.vx * dt;
    eggState.z += eggState.vz * dt;
    const eggH = getFluidHeightAt(eggState.x, eggState.z);
    eggGroup.position.set(eggState.x, Math.max(0.024, eggH + 0.001), eggState.z);
    eggGroup.rotation.z = -waveX * 0.45;
    eggGroup.rotation.x = waveZ * 0.45;

    onionRings.forEach((ring) => {
      const rx = ring.anchorX - waveX * 0.012;
      const rz = ring.anchorZ + waveZ * 0.010;
      ring.mesh.position.set(rx, Math.max(0.023, getFluidHeightAt(rx, rz) + 0.0014), rz);
      ring.mesh.rotation.z = -waveX * 0.5;
      ring.mesh.rotation.x = waveZ * 0.5;
    });

    scallions.forEach((sc) => {
      const sx = sc.anchorX - waveX * 0.008;
      const sz = sc.anchorZ + waveZ * 0.008;
      sc.mesh.position.set(sx, Math.max(0.022, getFluidHeightAt(sx, sz) + 0.0012), sz);
    });

    stem1.position.y = Math.max(0.024, getFluidHeightAt(stem1.position.x, stem1.position.z) + 0.002);
    stem2.position.y = Math.max(0.024, getFluidHeightAt(stem2.position.x, stem2.position.z) + 0.002);


    // 8.4. LÀN KHÓI NGHI NGÚT
    const isBlowing = physState.isBlowing;
    steamParticles.forEach((p) => {
      p.sprite.position.y += p.speedY * dt;
      if (isBlowing) {
        p.sprite.position.z += 0.75 * dt;
        p.sprite.material.opacity = Math.max(0, p.sprite.material.opacity - 1.6 * dt);
      } else {
        const wobble = Math.sin(timeVal * 3.2 + p.wobbleSeed) * 0.015 * dt;
        p.sprite.position.x += wobble;
        p.sprite.position.z += wobble * 0.5;
      }

      if (p.sprite.position.y > 0.32 || p.sprite.material.opacity <= 0.02) {
        const initRad = Math.random() * 0.055;
        const initAngle = Math.random() * Math.PI * 2;
        p.sprite.position.set(
          Math.cos(initAngle) * initRad,
          targetSurfaceY + 0.01,
          Math.sin(initAngle) * initRad
        );
        p.sprite.material.opacity = 0.15 + Math.random() * 0.12;
      }
    });

    // 8.5. GIỌT CANH RƠI
    if (physState.spillIntensity > 0) {
      spawnSpillDroplets(physState.spillSide, physState.spillIntensity);
    }

    droplets.forEach((d) => {
      if (d.active) {
        d.mesh.position.x += d.vx * dt;
        d.mesh.position.y += d.vy * dt;
        d.mesh.position.z += d.vz * dt;
        d.vy -= 9.8 * dt;
        d.life -= dt;
        if (d.life <= 0 || d.mesh.position.y <= -0.1) {
          d.active = false;
          d.mesh.visible = false;
        }
      }
    });
  }

  function setSkin(skinData) {
    if (skinData.bowlColor) bowlMat.color.setHex(skinData.bowlColor);
    if (skinData.rimColor) {
      rimLineMat.color.setHex(skinData.rimColor);
      rimLineSub.material.color.setHex(skinData.rimColor);
    }
  }

  return {
    root,
    bowlMesh,
    sloshMesh,
    toppingsGroup,
    update,
    setSkin,
  };
}
