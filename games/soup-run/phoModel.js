/**
 * @file phoModel.js
 * @description Mô hình 3D Tô Phở Miền Nam (Phở Bò Sài Gòn) thủ công tinh xảo, chân thực và thẩm mỹ cao:
 * - Tô sứ Bát Tràng / Lái Thiêu men lam cao cấp: thành dày, men ngà bóng bẩy, viền hoa văn xanh coban.
 * - Nước dùng hổ phách trong veo nằm gọn hoàn toàn bên trong lòng tô (không bao giờ lồi ra ngoài).
 * - Đầy đủ topping chuẩn vị Nam Bộ bắt mắt:
 *   + Bò viên khía chữ thập lộ thớ thịt nâu rắc tiêu
 *   + Nạm gầu bò thái lát mỏng viền mỡ vàng giòn
 *   + Trứng chần lòng đỏ cam óng ả
 *   + Vòng hành tây mỏng tanh trong suốt
 *   + Hành lá xắt nhuyễn, ngò gai viền răng cưa, húng quế tươi, ớt sừng đỏ
 * - Đôi tay bưng phở tự nhiên: tay áo sơ mi trắng có nếp gấp xắn gấu, ngón tay cái tì vành sứ, các ngón tay đỡ đáy tô.
 */

import * as THREE from '../../shared/vendor/three.module.js';

/** Tạo texture gốm hoa lam Lái Thiêu tinh tế */
function createPorcelainTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Nền men sứ trắng ngà cao cấp
  ctx.fillStyle = '#faf7ee';
  ctx.fillRect(0, 0, 1024, 512);

  // Viền chỉ xanh coban đôi ở miệng tô
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 20, 1024, 20);
  ctx.fillRect(0, 56, 1024, 6);

  // Hoa văn sóng nước & búp sen men lam Lái Thiêu
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 4.5;
  for (let x = 0; x < 1024; x += 64) {
    ctx.beginPath();
    ctx.arc(x + 32, 98, 24, 0, Math.PI, false);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + 32, 96, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#1e3a8a';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + 20, 104, 4.5, 0, Math.PI * 2);
    ctx.arc(x + 44, 104, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillRect(0, 138, 1024, 6);
  ctx.fillRect(0, 150, 1024, 3);

  // Chân đế bát men mộc mạc
  ctx.fillStyle = '#dfd6c6';
  ctx.fillRect(0, 480, 1024, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(2, 1);
  return texture;
}

/** Texture bò viên tiêu đen */
function createMeatballTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#542d17';
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    ctx.fillStyle = Math.random() > 0.4 ? '#331a0e' : '#734024';
    ctx.beginPath();
    ctx.arc(x, y, 1.0 + Math.random() * 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    ctx.fillStyle = '#100a06';
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + Math.random() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

/** Texture nạm gầu bò */
function createFlankTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#6b2d10';
  ctx.fillRect(0, 0, 256, 128);

  for (let y = 0; y < 128; y += 6) {
    ctx.fillStyle = y % 12 === 0 ? '#853816' : '#54220b';
    ctx.fillRect(0, y, 256, 4);
  }

  ctx.fillStyle = '#fef08a';
  ctx.fillRect(0, 0, 256, 24);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(0, 20, 256, 5);

  return new THREE.CanvasTexture(canvas);
}

/** Texture hạt khói mềm */
function createSteamParticleTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.20)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

export function createPhoBowlModel({ skin = {} } = {}) {
  const root = new THREE.Group();
  root.name = 'pho-bowl-assembly';

  // 1. TÔ SỨ CAO CẤP (Thành dày, lòng sâu, miệng loe bán kính R = 0.24m)
  const points = [];
  points.push(new THREE.Vector2(0.0, -0.05));
  points.push(new THREE.Vector2(0.10, -0.05));
  points.push(new THREE.Vector2(0.115, -0.045));
  points.push(new THREE.Vector2(0.11, -0.005));
  points.push(new THREE.Vector2(0.14, 0.04));
  points.push(new THREE.Vector2(0.19, 0.09));
  points.push(new THREE.Vector2(0.24, 0.14)); // Vành ngoài miệng loe
  points.push(new THREE.Vector2(0.245, 0.146));
  points.push(new THREE.Vector2(0.24, 0.15));
  points.push(new THREE.Vector2(0.23, 0.142)); // Mép trong
  points.push(new THREE.Vector2(0.18, 0.088));
  points.push(new THREE.Vector2(0.13, 0.038));
  points.push(new THREE.Vector2(0.085, 0.01));
  points.push(new THREE.Vector2(0.0, 0.005));

  const latheGeo = new THREE.LatheGeometry(points, 64);
  const porcelainTex = createPorcelainTexture();

  const bowlMat = new THREE.MeshStandardMaterial({
    color: skin.bowlColor || 0xfaf7ee,
    map: porcelainTex,
    roughness: skin.roughness ?? 0.16,
    metalness: skin.metalness ?? 0.02,
    side: THREE.DoubleSide,
  });

  const bowlMesh = new THREE.Mesh(latheGeo, bowlMat);
  bowlMesh.castShadow = true;
  bowlMesh.receiveShadow = true;
  root.add(bowlMesh);

  // 2. BÁNH PHỞ TRẮNG MỀM DƯỚI ĐÁY BÁT (Rice Noodles)
  const noodlesGroup = new THREE.Group();
  noodlesGroup.name = 'rice-noodles';
  const noodleMat = new THREE.MeshStandardMaterial({
    color: 0xfcfbfa,
    roughness: 0.45,
    metalness: 0.02,
  });
  const noodleGeo = new THREE.TorusGeometry(0.08, 0.007, 8, 24, Math.PI * 1.6);
  for (let i = 0; i < 8; i++) {
    const strand = new THREE.Mesh(noodleGeo, noodleMat);
    strand.position.set(
      (Math.random() - 0.5) * 0.06,
      0.035 + i * 0.009,
      (Math.random() - 0.5) * 0.06
    );
    strand.rotation.set(
      Math.PI / 2 + (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.4,
      Math.random() * Math.PI * 2
    );
    strand.scale.set(0.85 + Math.random() * 0.35, 0.85 + Math.random() * 0.35, 1.0);
    noodlesGroup.add(strand);
  }
  root.add(noodlesGroup);

  // 3. NƯỚC DÙNG PHỞ HỔ PHÁCH (Nằm hoàn toàn bên trong lòng tô, không lồi ra ngoài)
  // Bán kính R = 0.222m (vừa khít bên trong mép bát 0.23m)
  const soupRadius = 0.222;
  const sloshGeo = new THREE.CircleGeometry(soupRadius, 48, 8);
  sloshGeo.rotateX(-Math.PI / 2);
  const sloshPosAttr = sloshGeo.attributes.position;

  const sloshMat = new THREE.MeshStandardMaterial({
    color: skin.soupColor || 0xb44c05, // Màu hổ phách óng ánh
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });

  const sloshMesh = new THREE.Mesh(sloshGeo, sloshMat);
  sloshMesh.position.y = 0.128; // Cách miệng bát 0.015m, đầy ắp nước dùng
  root.add(sloshMesh);

  // Váng mỡ gầu bò óng ánh (Golden Fat Beads)
  const fatGroup = new THREE.Group();
  const fatGeo = new THREE.CircleGeometry(0.014, 14);
  fatGeo.rotateX(-Math.PI / 2);
  const fatMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const fatDrops = [];
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.3;
    const r = 0.04 + Math.random() * 0.155;
    const m = new THREE.Mesh(fatGeo, fatMat);
    const fx = Math.cos(angle) * r;
    const fz = Math.sin(angle) * r;
    m.position.set(fx, 0.129, fz);
    const s = 0.5 + Math.random() * 0.9;
    m.scale.set(s, s, s);
    fatGroup.add(m);
    fatDrops.push({ mesh: m, initX: fx, initZ: fz });
  }
  root.add(fatGroup);

  // 4. TOPPINGS PHỞ MIỀN NAM CHUẨN VỊ
  const toppingsGroup = new THREE.Group();
  toppingsGroup.name = 'toppings-group';
  root.add(toppingsGroup);

  // 4.1. BÒ VIÊN (3 viên khía chữ thập)
  const meatballTex = createMeatballTexture();
  const meatballMat = new THREE.MeshStandardMaterial({
    color: 0x5c331a,
    map: meatballTex,
    roughness: 0.5,
    metalness: 0.05,
  });
  const meatballGeo = new THREE.SphereGeometry(0.034, 20, 16);
  meatballGeo.scale(1, 0.88, 1);

  const meatballs = [];
  const mbPositions = [
    { x: -0.085, z: 0.045, rot: 0.3 },
    { x: -0.105, z: -0.05, rot: 1.2 },
    { x: -0.03, z: 0.09, rot: 2.1 },
  ];

  mbPositions.forEach((pos) => {
    const ball = new THREE.Mesh(meatballGeo, meatballMat);
    ball.position.set(pos.x, 0.125, pos.z);
    ball.rotation.y = pos.rot;
    ball.castShadow = true;

    // Vết khía chữ thập
    const slitMat = new THREE.MeshBasicMaterial({ color: 0x2e1509 });
    const slit1 = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.007, 0.003), slitMat);
    slit1.position.y = 0.028;
    const slit2 = slit1.clone();
    slit2.rotation.y = Math.PI / 2;
    ball.add(slit1, slit2);

    toppingsGroup.add(ball);
    meatballs.push({ mesh: ball, initX: pos.x, initZ: pos.z, seed: Math.random() * 10 });
  });

  // 4.2. NẠM GẦU BÒ THÁI LÁT
  const flankTex = createFlankTexture();
  const flankMat = new THREE.MeshStandardMaterial({
    map: flankTex,
    roughness: 0.42,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });
  const flankGeo = new THREE.BoxGeometry(0.095, 0.007, 0.052);
  flankGeo.rotateY(0.2);

  const flank1 = new THREE.Mesh(flankGeo, flankMat);
  flank1.position.set(0.07, 0.13, 0.04);
  flank1.rotation.set(-0.08, 0.3, 0.12);
  flank1.castShadow = true;
  toppingsGroup.add(flank1);

  const flank2 = flank1.clone();
  flank2.position.set(0.09, 0.131, -0.025);
  flank2.rotation.set(0.05, -0.4, 0.15);
  toppingsGroup.add(flank2);

  // 4.3. TRỨNG CHẦN LÒNG ĐÀO BÉO NGẬY
  const eggGroup = new THREE.Group();
  const eggWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.3,
    transparent: true,
    opacity: 0.95,
  });
  const eggWhiteGeo = new THREE.CylinderGeometry(0.036, 0.04, 0.014, 20);
  const eggWhite = new THREE.Mesh(eggWhiteGeo, eggWhiteMat);
  eggGroup.add(eggWhite);

  const eggYolkMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.15,
    metalness: 0.08,
  });
  const eggYolkGeo = new THREE.SphereGeometry(0.02, 18, 14);
  eggYolkGeo.scale(1, 0.65, 1);
  const eggYolk = new THREE.Mesh(eggYolkGeo, eggYolkMat);
  eggYolk.position.y = 0.009;
  eggGroup.add(eggYolk);

  eggGroup.position.set(-0.02, 0.128, -0.055);
  toppingsGroup.add(eggGroup);

  // 4.4. VÒNG HÀNH TÂY THÁI LÁT
  const onionMat = new THREE.MeshStandardMaterial({
    color: 0xfefce8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  });
  const onionGeo = new THREE.RingGeometry(0.034, 0.042, 28);
  onionGeo.rotateX(-Math.PI / 2);

  const onionRings = [];
  const onionPositions = [
    { x: 0.01, z: -0.085, r: 0.3 },
    { x: 0.05, z: -0.09, r: 1.4 },
    { x: -0.04, z: -0.105, r: 2.5 },
  ];
  onionPositions.forEach((op) => {
    const ring = new THREE.Mesh(onionGeo, onionMat);
    ring.position.set(op.x, 0.131, op.z);
    ring.rotation.y = op.r;
    toppingsGroup.add(ring);
    onionRings.push({ mesh: ring, initX: op.x, initZ: op.z });
  });

  // 4.5. HÀNH LÁ XẮT NHUYỄN
  const scallionMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.3, side: THREE.DoubleSide });
  const scallionGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.006, 12, 1, true);
  const scallions = [];
  for (let i = 0; i < 20; i++) {
    const ring = new THREE.Mesh(scallionGeo, scallionMat);
    const angle = Math.random() * Math.PI * 2;
    const dist = 0.035 + Math.random() * 0.16;
    const sx = Math.cos(angle) * dist;
    const sz = Math.sin(angle) * dist;
    ring.position.set(sx, 0.13, sz);
    ring.rotation.set(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3);
    toppingsGroup.add(ring);
    scallions.push({ mesh: ring, initX: sx, initZ: sz });
  }

  // 4.6. HÚNG QUẾ & NGÒ GAI
  const herbMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.25, side: THREE.DoubleSide });
  const basilGeo = new THREE.PlaneGeometry(0.045, 0.026);
  const basil1 = new THREE.Mesh(basilGeo, herbMat);
  basil1.rotation.set(-Math.PI / 2.3, 0.4, 0.6);
  basil1.position.set(0.135, 0.138, 0.09);
  toppingsGroup.add(basil1);

  const culantroGeo = new THREE.PlaneGeometry(0.075, 0.018);
  const culantro = new THREE.Mesh(culantroGeo, herbMat);
  culantro.rotation.set(-Math.PI / 2.1, 0.2, 1.25);
  culantro.position.set(-0.02, 0.132, 0.15);
  toppingsGroup.add(culantro);

  // Ớt sừng đỏ
  const chiliMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2, side: THREE.DoubleSide });
  const chiliGeo = new THREE.RingGeometry(0.007, 0.016, 14);
  chiliGeo.rotateX(-Math.PI / 2);
  const chili1 = new THREE.Mesh(chiliGeo, chiliMat);
  chili1.position.set(-0.015, 0.132, -0.015);
  toppingsGroup.add(chili1);

  // 5. LÀN KHÓI MỎNG MANH THOANG THOẢNG
  const steamTex = createSteamParticleTexture();
  const steamCount = 18;
  const steamParticles = [];
  const steamMat = new THREE.SpriteMaterial({
    map: steamTex,
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });

  const steamGroup = new THREE.Group();
  root.add(steamGroup);

  for (let i = 0; i < steamCount; i++) {
    const sprite = new THREE.Sprite(steamMat.clone());
    const initRad = Math.random() * 0.10;
    const initAngle = Math.random() * Math.PI * 2;
    sprite.position.set(
      Math.cos(initAngle) * initRad,
      0.14 + Math.random() * 0.20,
      Math.sin(initAngle) * initRad
    );
    const s = 0.05 + Math.random() * 0.05;
    sprite.scale.set(s, s, s);
    steamGroup.add(sprite);

    steamParticles.push({
      sprite,
      speedY: 0.18 + Math.random() * 0.2,
      wobbleSeed: Math.random() * 100,
    });
  }

  // 6. ĐÔI BÀN TAY BƯNG TÔ PHỞ TỰ NHIÊN (Không còn là hình hộp "lỏ")
  // Tay áo sơ mi trắng có viền gấu bo tròn, cổ tay da vàng tự nhiên và các ngón tay ôm trọn vành tô sứ
  const handsGroup = new THREE.Group();
  handsGroup.name = 'waiter-hands-natural';
  root.add(handsGroup);

  const handSkinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.5, metalness: 0.02 });
  const sleeveWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 });

  function createArm(isLeft) {
    const armGroup = new THREE.Group();
    const sideSign = isLeft ? -1 : 1;
    armGroup.position.set(sideSign * 0.235, 0.132, 0.0);

    // Cẳng tay áo sơ mi trắng thuôn nhẹ
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.052, 0.24, 16),
      sleeveWhiteMat
    );
    sleeve.position.set(sideSign * 0.11, -0.07, -0.04);
    sleeve.rotation.set(0.3, 0, -sideSign * 0.65);
    armGroup.add(sleeve);

    // Cổ tay da
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.08, 14), handSkinMat);
    wrist.position.set(sideSign * 0.035, -0.02, -0.01);
    wrist.rotation.set(0.2, 0, -sideSign * 0.4);
    armGroup.add(wrist);

    // Bàn tay bo tròn mềm mại
    const palmGeo = new THREE.SphereGeometry(0.034, 14, 12);
    palmGeo.scale(1.1, 0.65, 1.2);
    const palm = new THREE.Mesh(palmGeo, handSkinMat);
    palm.position.set(0, -0.01, 0);
    armGroup.add(palm);

    // Ngón tay cái (Thumb tì lên vành mép bát)
    const thumbGeo = new THREE.CylinderGeometry(0.008, 0.009, 0.042, 10);
    const thumb = new THREE.Mesh(thumbGeo, handSkinMat);
    thumb.position.set(-sideSign * 0.012, 0.015, 0.01);
    thumb.rotation.set(-0.2, 0, sideSign * 0.75);
    armGroup.add(thumb);

    // 4 ngón tay cong đỡ dưới đáy mép bát
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.007, 0.045, 8),
        handSkinMat
      );
      finger.position.set(
        sideSign * (0.008 + f * 0.006),
        -0.025,
        -0.018 + f * 0.012
      );
      finger.rotation.set(0.4, 0, -sideSign * 0.3);
      armGroup.add(finger);
    }

    return { armGroup, thumb };
  }

  const leftArm = createArm(true);
  const rightArm = createArm(false);
  handsGroup.add(leftArm.armGroup, rightArm.armGroup);

  // 7. BẮN GIỌT CANH TRÀN
  const dropletPoolSize = 24;
  const dropletGeo = new THREE.SphereGeometry(0.011, 8, 8);
  const dropletMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });
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
    const targetSpawns = Math.ceil(intensity * 4);
    for (const d of droplets) {
      if (!d.active) {
        d.active = true;
        d.mesh.visible = true;
        const rimX = side * 0.23;
        d.mesh.position.set(rimX + (Math.random() - 0.5) * 0.04, 0.14, (Math.random() - 0.5) * 0.08);
        d.vx = side * (0.8 + Math.random() * 1.3 * intensity);
        d.vy = 0.5 + Math.random() * 0.7 * intensity;
        d.vz = (Math.random() - 0.5) * 0.4;
        d.life = 0.5;
        spawned++;
        if (spawned >= targetSpawns) break;
      }
    }
  }

  // 8. CẬP NHẬT HOẠT ẢNH & SÓNG SÁNH VẬT LÝ TỪNG FRAME
  function update(physState, dt) {
    root.rotation.z = -physState.tiltRoll;
    root.rotation.x = physState.tiltPitch;

    const volNorm = Math.max(0.1, physState.soupVolume / 100.0);
    const targetSurfaceY = 0.035 + volNorm * 0.095;
    sloshMesh.position.y = targetSurfaceY;
    noodlesGroup.position.y = (volNorm - 1.0) * 0.02;

    const pos = sloshPosAttr;
    const waveX = physState.waveX;
    const waveZ = physState.waveZ;
    const timeVal = physState.time;

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const r = Math.sqrt(vx * vx + vz * vz);
      const sloshTilt = -waveX * vx + waveZ * vz;
      const ripple = Math.sin(16.0 * r - timeVal * 8.0) * 0.0035 * (1.0 - r / soupRadius);
      pos.setY(i, sloshTilt + ripple);
    }
    pos.needsUpdate = true;
    sloshGeo.computeVertexNormals();

    const getFluidHeightAt = (x, z) => {
      const r = Math.sqrt(x * x + z * z);
      const tiltH = -waveX * x + waveZ * z;
      const rippleH = Math.sin(16.0 * r - timeVal * 8.0) * 0.0035;
      return targetSurfaceY + tiltH + rippleH;
    };

    meatballs.forEach((mb) => {
      const driftX = mb.initX - waveX * 0.04;
      const driftZ = mb.initZ + waveZ * 0.03;
      mb.mesh.position.x = driftX;
      mb.mesh.position.z = driftZ;
      const waterH = getFluidHeightAt(driftX, driftZ);
      const bob = Math.sin(timeVal * 4.5 + mb.seed) * 0.003;
      mb.mesh.position.y = waterH - 0.005 + bob;
    });

    flank1.position.y = getFluidHeightAt(flank1.position.x, flank1.position.z) + 0.002;
    flank2.position.y = getFluidHeightAt(flank2.position.x, flank2.position.z) + 0.002;
    eggGroup.position.y = getFluidHeightAt(eggGroup.position.x, eggGroup.position.z);

    onionRings.forEach((ring) => {
      ring.mesh.position.y = getFluidHeightAt(ring.mesh.position.x, ring.mesh.position.z) + 0.002;
      ring.mesh.rotation.z = -waveX * 0.8;
      ring.mesh.rotation.x = waveZ * 0.8;
    });

    scallions.forEach((sc) => {
      sc.mesh.position.y = getFluidHeightAt(sc.mesh.position.x, sc.mesh.position.z) + 0.001;
    });

    fatDrops.forEach((fd) => {
      const fx = fd.initX - waveX * 0.035;
      const fz = fd.initZ + waveZ * 0.035;
      fd.mesh.position.set(fx, getFluidHeightAt(fx, fz) + 0.001, fz);
    });

    // Bàn tay phản xạ bỏng
    if (physState.scaldTimer > 0) {
      leftArm.thumb.material.color.setHex(0xef4444);
      rightArm.thumb.material.color.setHex(0xef4444);
      leftArm.armGroup.position.y = 0.132 + Math.sin(timeVal * 40.0) * 0.015;
    } else {
      leftArm.thumb.material.color.setHex(0xd4a373);
      rightArm.thumb.material.color.setHex(0xd4a373);
      leftArm.armGroup.position.y = 0.132;
    }

    // Làn khói
    const isBlowing = physState.isBlowing;
    steamParticles.forEach((p) => {
      p.sprite.position.y += p.speedY * dt;
      if (isBlowing) {
        p.sprite.position.z += 1.0 * dt;
        p.sprite.material.opacity = Math.max(0, p.sprite.material.opacity - 1.5 * dt);
      } else {
        const wobble = Math.sin(timeVal * 3.0 + p.wobbleSeed) * 0.02 * dt;
        p.sprite.position.x += wobble;
        p.sprite.position.z += wobble * 0.5;
      }

      if (p.sprite.position.y > 0.42 || p.sprite.material.opacity <= 0.02) {
        const initRad = Math.random() * 0.10;
        const initAngle = Math.random() * Math.PI * 2;
        p.sprite.position.set(
          Math.cos(initAngle) * initRad,
          targetSurfaceY + 0.015,
          Math.sin(initAngle) * initRad
        );
        p.sprite.material.opacity = 0.20 + Math.random() * 0.15;
      }
    });

    // Giọt canh rơi
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
    if (skinData.soupColor) sloshMat.color.setHex(skinData.soupColor);
  }

  return {
    root,
    bowlMesh,
    sloshMesh,
    toppingsGroup,
    handsGroup,
    update,
    setSkin,
  };
}
