/**
 * @file skyScene.js
 * @description Khung cảnh Bầu Trời, Đường Bay 100m & 4 Chướng Ngại Vật Hài Hước (Goofy Obstacles):
 * 1. Mốc 22m: Dây phơi quần áo (Clotheslines) - Phơi chăn trắng & tất màu, bay thấp luồn dưới hoặc vỗ cao bay qua!
 * 2. Mốc 48m: Vòm cây táo trĩu quả (Apple Tree Branch) - Quả táo lúc lỉu, luồn qua khoảng giữa!
 * 3. Mốc 72m: Bù nhìn rơm giang tay (Goofy Scarecrow) - Đội mũ rơm, lượn né sang trái hoặc phải!
 * 4. Mốc 88m: Cánh quạt cối xay gió (Windmill Sails) - Cánh quạt quay chậm thử thách căn thời điểm!
 * 5. Mốc 100m: Tổ ấm đích khổng lồ (Cozy Giant Nest) - Đầy rơm vàng ấm áp chào đón chú chim về đích!
 */

import * as THREE from '../../shared/vendor/three.module.js?v=16';
import { BIRD_GAME_CONFIG } from './config.js?v=16';

const rand = (min, max) => min + Math.random() * (max - min);

export function createSkyScene(scene) {
  const Z = BIRD_GAME_CONFIG.TRACK_LENGTH; // 100m

  // 1. Ánh sáng bầu trời ban ngày tươi sáng
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x86efac, 1.9);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
  dirLight.position.set(-4, 12, 4);
  scene.add(dirLight, dirLight.target);

  // 2. Thảm cỏ xanh dưới mặt đất (y = -0.25)
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.85 });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(Z + 90, 24).rotateX(-Math.PI / 2),
    grassMat
  );
  ground.position.set(Z / 2, -0.25, 0);
  scene.add(ground);

  const pathStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(Z + 12, 2.2).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xbbf7d0 })
  );
  pathStrip.position.set(Z / 2, -0.24, 0);
  scene.add(pathStrip);

  const tickMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
  for (let x = 0; x <= Z + 10; x += 2.5) {
    const tick = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 2.4).rotateX(-Math.PI / 2),
      tickMat
    );
    tick.position.set(x, -0.235, 0);
    scene.add(tick);
  }

  // 3. Đám mây 3D hai bên hành lang bay (-Z và +Z)
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    transparent: true,
    opacity: 0.92,
  });

  const clouds = [];
  for (let x = -5; x <= Z + 25; x += 4.5) {
    for (const side of [-1, 1]) {
      const cGroup = new THREE.Group();
      const puff1 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), cloudMat);
      const puff2 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), cloudMat);
      puff2.position.set(0.42, -0.08, 0.12);
      const puff3 = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), cloudMat);
      puff3.position.set(-0.38, -0.1, -0.1);
      cGroup.add(puff1, puff2, puff3);
      cGroup.position.set(x + rand(-1, 1), rand(1.6, 3.8), side * rand(2.3, 4.2));
      scene.add(cGroup);
      clouds.push(cGroup);
    }
  }

  // 4. Tổ Chim Xuất Phát (x = 0) & Tổ Chim Đích (x = 100m)
  const nestMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.75 });
  const createNest = (xPos, yPos) => {
    const nest = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.16, 14, 28).rotateX(Math.PI / 2),
      nestMat
    );
    nest.position.set(xPos, yPos, 0);
    scene.add(nest);
  };
  createNest(0, 0.65);
  createNest(Z, 0.85);

  // 5. Cổng & Biển báo mốc khoảng cách
  const makeBannerMesh = (text, w, h, bg, fg) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * 128);
    canvas.height = Math.round(h * 128);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = fg;
    ctx.font = `900 ${Math.round(canvas.height * 0.58)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + canvas.height * 0.03);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
    );
  };

  const postMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.4 });
  for (let m = 10; m < Z; m += 10) {
    if (m === 50) continue;
    const g = new THREE.Group();
    for (const zSide of [-1.75, 1.75]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 3.2, 10).translate(0, 1.35, 0),
        postMat
      );
      pole.position.set(0, 0, zSide);
      g.add(pole);

      const sign = makeBannerMesh(`${m}m`, 0.85, 0.42, '#ffffff', '#0f172a');
      sign.rotation.y = -Math.PI / 2;
      sign.position.set(0, 2.2, zSide);
      g.add(sign);
    }
    g.position.x = m;
    scene.add(g);
  }

  const createGate = (xPos, label, colorHex) => {
    const g = new THREE.Group();
    const gMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
    for (const zSide of [-1.85, 1.85]) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 3.4, 0.16).translate(0, 1.45, 0),
        gMat
      );
      pillar.position.set(0, 0, zSide);
      g.add(pillar);
    }
    const topBanner = makeBannerMesh(label, 3.8, 0.65, colorHex, '#ffffff');
    topBanner.position.set(0, 3.1, 0);
    topBanner.rotation.y = -Math.PI / 2;
    g.add(topBanner);
    g.position.x = xPos;
    scene.add(g);
  };

  createGate(-1.2, 'START', '#d97706');
  createGate(50, 'HALFWAY 50m', '#0284c7');
  createGate(Z, `NEST ${Z}m`, '#e11d48');

  // ==============================================================
  // 6. CÁC CHƯỚNG NGẠI VẬT HÀI HƯỚC (GOOFY OBSTACLES)
  // ==============================================================
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  const sheetMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, side: THREE.DoubleSide });
  const sockMat1 = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
  const sockMat2 = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
  const appleMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.25 });
  const strawMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.8 });

  // A. Mốc 22m: Dây phơi quần áo (Clotheslines)
  const clotheslineGroup = new THREE.Group();
  clotheslineGroup.position.x = 22;

  // 2 Cọc gỗ 2 bên
  for (const zSide of [-1.8, 1.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.6, 10).translate(0, 1.1, 0), woodMat);
    post.position.z = zSide;
    clotheslineGroup.add(post);
  }
  // Dây căng ngang ở y = 1.35
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.6, 8).rotateX(Math.PI / 2), woodMat);
  rope.position.y = 1.35;
  clotheslineGroup.add(rope);

  // 2 Chiếc chăn trắng phơi trên dây (rơi từ y = 1.35 xuống y = 0.5)
  for (const zSide of [-0.65, 0.65]) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.82), sheetMat);
    sheet.position.set(0, 0.94, zSide);
    sheet.rotation.y = -Math.PI / 2;
    clotheslineGroup.add(sheet);
  }
  // Vài chiếc tất màu treo lủng lẳng
  for (const zSide of [-1.2, 0, 1.2]) {
    const sock = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.14, 6, 8), zSide < 0 ? sockMat1 : sockMat2);
    sock.position.set(0, 1.18, zSide);
    clotheslineGroup.add(sock);
  }
  scene.add(clotheslineGroup);

  // B. Mốc 48m: Vòm cây táo trĩu quả (Apple Tree Arch)
  const treeArchGroup = new THREE.Group();
  treeArchGroup.position.x = 48;
  for (const zSide of [-1.7, 1.7]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.8, 10).translate(0, 1.2, 0), woodMat);
    trunk.position.z = zSide;
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.65, 14, 12), foliageMat);
    foliage.position.set(0, 2.4, zSide);
    treeArchGroup.add(trunk, foliage);
  }
  // Cành ngang bắc qua ở y = 2.1 với chùm lá và táo đỏ rủ xuống
  const crossBranch = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3.4, 8).rotateX(Math.PI / 2), woodMat);
  crossBranch.position.y = 2.05;
  treeArchGroup.add(crossBranch);

  const appleFoliage = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.8, 12).rotateX(Math.PI / 2), foliageMat);
  appleFoliage.position.y = 2.05;
  treeArchGroup.add(appleFoliage);

  for (let z = -1.1; z <= 1.1; z += 0.55) {
    const apple = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), appleMat);
    apple.position.set(rand(-0.1, 0.1), 1.72, z);
    treeArchGroup.add(apple);
  }
  scene.add(treeArchGroup);

  // C. Mốc 72m: Bù nhìn rơm ngộ nghĩnh (Goofy Scarecrow)
  const scarecrowGroup = new THREE.Group();
  scarecrowGroup.position.set(72, 0, 0.12);

  const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8).translate(0, 0.95, 0), woodMat);
  const sArms = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.4, 8).rotateX(Math.PI / 2), woodMat);
  sArms.position.y = 1.15;
  const sCoat = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.72, 10), strawMat);
  sCoat.position.y = 0.82;
  const sHead = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), strawMat);
  sHead.position.y = 1.35;
  const sHat = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 12), woodMat);
  sHat.position.y = 1.52;

  scarecrowGroup.add(sPost, sArms, sCoat, sHead, sHat);
  scene.add(scarecrowGroup);

  // D. Mốc 88m: Cối xay gió nông trại (Windmill)
  const windmillGroup = new THREE.Group();
  windmillGroup.position.set(88, 0, -1.8);

  const wTower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 3.8, 14).translate(0, 1.7, 0), woodMat);
  windmillGroup.add(wTower);

  const sailsGroup = new THREE.Group();
  sailsGroup.position.set(0, 3.1, 0.52);

  const sailMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5, side: THREE.DoubleSide });
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.2), sailMat);
    blade.position.y = 0.6;
    const bArm = new THREE.Group();
    bArm.rotation.z = (b * Math.PI) / 2;
    bArm.add(blade);
    sailsGroup.add(bArm);
  }
  windmillGroup.add(sailsGroup);
  scene.add(windmillGroup);

  // ==============================================================
  // 7. HẠT HIỆU ỨNG: Lông Vũ, Bụi Cỏ, Vệt Gió Ngược
  // ==============================================================
  const feathers = [];
  const featherGeo = new THREE.PlaneGeometry(0.14, 0.06);
  const featherMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });

  for (let i = 0; i < 45; i++) {
    const mesh = new THREE.Mesh(featherGeo, featherMat.clone());
    mesh.visible = false;
    scene.add(mesh);
    feathers.push({
      mesh,
      age: 1,
      life: 1,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }
  let featherIdx = 0;

  const grassPuffs = [];
  const grassGeo = new THREE.PlaneGeometry(0.08, 0.08);
  const grassPuffMat = new THREE.MeshBasicMaterial({
    color: 0x16a34a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  for (let i = 0; i < 25; i++) {
    const gp = new THREE.Mesh(grassGeo, grassPuffMat.clone());
    gp.visible = false;
    scene.add(gp);
    grassPuffs.push({
      mesh: gp,
      age: 1,
      life: 1,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }
  let grassIdx = 0;

  const windLines = [];
  const windGeo = new THREE.BoxGeometry(1.6, 0.025, 0.025);
  const windMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.0,
  });
  for (let i = 0; i < 20; i++) {
    const wl = new THREE.Mesh(windGeo, windMat);
    wl.position.set(rand(0, 20), rand(0.4, 3.4), rand(-1.8, 1.8));
    scene.add(wl);
    windLines.push(wl);
  }

  return {
    dirLight,

    spawnFeathers(x, y, z, count = 4) {
      for (let i = 0; i < count; i++) {
        const f = feathers[featherIdx++ % feathers.length];
        f.age = 0;
        f.life = rand(0.45, 0.85);
        f.x = x + rand(-0.18, 0.18);
        f.y = y + rand(-0.1, 0.15);
        f.z = z + rand(-0.22, 0.22);
        f.vx = rand(-1.2, 0.4);
        f.vy = rand(0.3, 1.2);
        f.vz = rand(-0.7, 0.7);
        f.mesh.visible = true;
      }
    },

    spawnGrassPuff(x, z, count = 6) {
      for (let i = 0; i < count; i++) {
        const p = grassPuffs[grassIdx++ % grassPuffs.length];
        p.age = 0;
        p.life = rand(0.35, 0.65);
        p.x = x + rand(-0.15, 0.15);
        p.y = 0.05;
        p.z = z + rand(-0.15, 0.15);
        p.vx = rand(-0.8, -0.2);
        p.vy = rand(0.5, 1.4);
        p.vz = rand(-0.6, 0.6);
        p.mesh.visible = true;
      }
    },

    update(dt, timeSec, birdX, gustActive = 0) {
      // Xoay cánh quạt cối xay gió
      sailsGroup.rotation.z += dt * 0.95;

      // Cỏ & Chăn phơi lay động trong gió
      clotheslineGroup.rotation.z = Math.sin(timeSec * 4) * 0.04;
      scarecrowGroup.rotation.z = Math.sin(timeSec * 5) * 0.05;

      for (const f of feathers) {
        if (!f.mesh.visible) continue;
        f.age += dt;
        if (f.age >= f.life) {
          f.mesh.visible = false;
          continue;
        }
        const t = f.age / f.life;
        f.vy -= 1.8 * dt;
        f.x += f.vx * dt;
        f.y = Math.max(-0.2, f.y + f.vy * dt);
        f.z += f.vz * dt;
        f.mesh.position.set(f.x, f.y, f.z);
        f.mesh.rotation.set(timeSec * 6, timeSec * 4, timeSec * 8);
        f.mesh.material.opacity = 0.9 * (1 - t);
      }

      for (const p of grassPuffs) {
        if (!p.mesh.visible) continue;
        p.age += dt;
        if (p.age >= p.life) {
          p.mesh.visible = false;
          continue;
        }
        const t = p.age / p.life;
        p.vy -= 3.2 * dt;
        p.x += p.vx * dt;
        p.y = Math.max(0, p.y + p.vy * dt);
        p.z += p.vz * dt;
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.material.opacity = 0.85 * (1 - t);
      }

      windMat.opacity = gustActive * 0.75;
      if (gustActive > 0.01) {
        for (const wl of windLines) {
          wl.position.x -= 15 * dt;
          if (wl.position.x < birdX - 4) {
            wl.position.x = birdX + rand(5, 16);
            wl.position.y = rand(0.3, 3.4);
            wl.position.z = rand(-1.6, 1.6);
          }
        }
      }
    },
  };
}
