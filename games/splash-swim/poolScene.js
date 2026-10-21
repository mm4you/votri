/**
 * @file poolScene.js
 * @description Hồ bơi Olympic 100m 3D với Mặt Nước Trong Xanh (Crystal Turquoise Water) & Vân Nắng Caustics:
 * - Đáy hồ lát gạch xanh ngọc kèm lớp Vân Nắng Nước (Animated Caustics) chuyển động lung linh
 * - Mặt nước 3D lấp lánh ánh nắng, có Vòng Sóng Bọt Nước (Expanding Foam Ripple Rings) lan tỏa quanh người bơi
 * - 2 Dây phao phân làn Đỏ-Trắng-Xanh đối xứng 2 bên Trái (-Z) và Phải (+Z) của VĐV suốt 100m
 * - Cổng vòm khoảng cách mỗi 10m (10m -> 90m, 50m HALFWAY, GOAL 100m).
 */

import * as THREE from '../../shared/vendor/three.module.js';
import { GAME_CONFIG } from './config.js?v=12';

const rand = (min, max) => min + Math.random() * (max - min);

export function createPoolScene(scene) {
  const Z = GAME_CONFIG.POOL_LENGTH;

  // 1. Ánh sáng mặt trời hồ bơi ngoài trời trong trẻo, tôn làn da & cơ bắp của Nam VĐV
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x00b4d8, 2.0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfffbeb, 2.4);
  dirLight.position.set(-4, 11, 2.5);
  scene.add(dirLight, dirLight.target);

  // 2. Đáy hồ bơi lát gạch Ceramic xanh ngọc + Vân nắng Caustics chuyển động mượt mà
  const createPoolFloorTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#0096c7');
    grad.addColorStop(0.5, '#00b4d8');
    grad.addColorStop(1, '#0077b6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Đường ron gạch trắng dịu
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.28)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(60, 8);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  // Vân sóng nước tự nhiên (Organic Sine-Wave Shimmer, không vẽ vòng tròn)
  const createWaveShimmerTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(224, 242, 254, 0.22)';
    ctx.lineWidth = 3;
    for (let row = 16; row < 256; row += 32) {
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const y = row + Math.sin((x / 256) * Math.PI * 4 + row) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 6);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  const floorTex = createPoolFloorTexture();
  const causticsTex = createWaveShimmerTexture();

  const poolFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(Z + 80, 18).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.7 })
  );
  poolFloor.position.set(Z / 2, -1.25, 0);
  scene.add(poolFloor);

  // Lớp vân nắng Caustics trôi nhẹ dưới đáy hồ và trên mặt nước
  const causticsFloorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(Z + 80, 16).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      map: causticsTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  causticsFloorMesh.position.set(Z / 2, -1.22, 0);
  scene.add(causticsFloorMesh);

  // Vạch kẻ tâm làn bơi màu xanh đậm chạy dọc chính giữa dưới bụng VĐV suốt 100m
  const centerLaneLine = new THREE.Mesh(
    new THREE.PlaneGeometry(Z + 12, 0.34).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x03045e })
  );
  centerLaneLine.position.set(Z / 2, -1.23, 0);
  scene.add(centerLaneLine);

  // Các vạch ngang dưới đáy hồ mỗi 2.5m để thấy rõ tốc độ trôi khi nhìn từ sau lưng
  const tickMat = new THREE.MeshBasicMaterial({ color: 0x90e0ef });
  for (let x = 0; x <= Z + 10; x += 2.5) {
    const tick = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 3.0).rotateX(-Math.PI / 2),
      tickMat
    );
    tick.position.set(x, -1.235, 0);
    scene.add(tick);
  }

  // Hai bờ thành hồ bơi 2 bên (z = -4.5 và z = +4.5)
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55 });
  for (const side of [-1, 1]) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(Z + 80, 0.45, 2.5), deckMat);
    deck.position.set(Z / 2, 0.05, side * 4.5);
    scene.add(deck);
  }

  // 3. HAI DÂY PHAO PHÂN LÀN ĐỐI XỨNG TRÁI (-1.45m) & PHẢI (+1.45m) DÀI 100m
  const buoyGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.40, 12).rotateZ(Math.PI / 2);
  const matRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const matBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });

  for (const zRope of [-1.45, 1.45]) {
    const ropeGroup = new THREE.Group();
    for (let x = -8; x <= Z + 15; x += 0.46) {
      const isEndZone = x < 5 || x > Z - 5;
      const isMidZone = Math.abs(x - 50) < 2.5;
      const mat = isEndZone
        ? matRed
        : isMidZone
          ? matGold
          : Math.floor(x) % 2 === 0
            ? matBlue
            : matWhite;
      const buoy = new THREE.Mesh(buoyGeo, mat);
      buoy.position.set(x, -0.02, zRope);
      ropeGroup.add(buoy);
    }
    scene.add(ropeGroup);
  }

  // 4. Mặt nước 3D trong vắt lấp lánh vân sóng (Không làm đục hay che khuất cơ thể Nam VĐV!)
  const surfaceTex = createWaveShimmerTexture();
  surfaceTex.repeat.set(55, 7);

  const waterSegsX = 200;
  const waterGeo = new THREE.PlaneGeometry(Z + 80, 7.2, waterSegsX, 8);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x48cae4,
    map: surfaceTex,
    roughness: 0.12,
    metalness: 0.08,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const waterSurface = new THREE.Mesh(waterGeo, waterMat);
  waterSurface.position.set(Z / 2, -0.05, 0);
  scene.add(waterSurface);

  // 5. Vòng Sóng Bọt Nước Lan Tỏa (Expanding White Foam Ripple Rings) quanh VĐV
  const createRippleRingTex = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(64, 64, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 34, 0, Math.PI * 2);
    ctx.stroke();
    return new THREE.CanvasTexture(c);
  };

  const rippleRingTex = createRippleRingTex();
  const rippleGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const ripples = [];
  for (let i = 0; i < 28; i++) {
    const rMesh = new THREE.Mesh(
      rippleGeo,
      new THREE.MeshBasicMaterial({
        map: rippleRingTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    rMesh.visible = false;
    scene.add(rMesh);
    ripples.push({ mesh: rMesh, age: 1, life: 0.9, x: 0, z: 0, maxScale: 1.4 });
  }
  let rippleIdx = 0;

  function spawnRipple(x, z, maxScale = 1.35) {
    const r = ripples[rippleIdx++ % ripples.length];
    r.age = 0;
    r.life = rand(0.65, 1.05);
    r.x = x;
    r.z = z;
    r.maxScale = maxScale;
    r.mesh.position.set(x, -0.035, z);
    r.mesh.scale.setScalar(0.25);
    r.mesh.visible = true;
  }

  // 6. CỔNG KHOẢNG CÁCH (10m -> 90m, START, HALF 50m, GOAL 100m) QUAY VỀ PHÍA CAMERA SAU LƯNG
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

  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });

  for (let m = 10; m < Z; m += 10) {
    const archGroup = new THREE.Group();
    for (const zSide of [-1.55, 1.55]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 1.75, 0.07).translate(0, 0.875, 0),
        pillarMat
      );
      post.position.set(0, 0, zSide);
      archGroup.add(post);

      const sideSign = makeBannerMesh(`${m}m`, 0.82, 0.40, '#ffffff', '#0f172a');
      sideSign.rotation.y = -Math.PI / 2;
      sideSign.position.set(0, 1.30, zSide);
      archGroup.add(sideSign);
    }
    archGroup.position.x = m;
    scene.add(archGroup);
  }

  const createGate = (xPos, label, colorHex) => {
    const g = new THREE.Group();
    const gateMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
    for (const zSide of [-1.65, 1.65]) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 2.4, 0.14).translate(0, 1.2, 0),
        gateMat
      );
      pillar.position.set(0, 0, zSide);
      g.add(pillar);
    }
    const topBanner = makeBannerMesh(label, 3.4, 0.58, colorHex, '#ffffff');
    topBanner.position.set(0, 2.25, 0);
    topBanner.rotation.y = -Math.PI / 2;
    g.add(topBanner);

    g.position.x = xPos;
    scene.add(g);
  };

  createGate(-1.2, 'START', '#0284c7');
  createGate(50, '50m HALFWAY', '#f59e0b');
  createGate(Z, `GOAL ${Z}m`, '#e11d48');

  // 7. Hạt Bọt Nước Trắng (Splash Foam) & Bong Bóng (Bubbles)
  const createSplashTex = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,0.98)');
    grad.addColorStop(0.6, 'rgba(224,242,254,0.75)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  };

  const splashTex = createSplashTex();
  const splashes = [];
  for (let i = 0; i < 65; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: splashTex,
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
      })
    );
    sp.visible = false;
    scene.add(sp);
    splashes.push({
      mesh: sp,
      age: 1,
      life: 1,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      size: 0.24,
    });
  }
  let splashIdx = 0;
  let bodyRippleTimer = 0;

  return {
    dirLight,

    spawnSplash(x, z, power = 0.7) {
      spawnRipple(x, z, 0.9 + power * 0.75);
      const count = 3 + Math.round(power * 4);
      for (let i = 0; i < count; i++) {
        const p = splashes[splashIdx++ % splashes.length];
        p.age = 0;
        p.life = rand(0.32, 0.58);
        p.x = x + rand(-0.14, 0.14);
        p.y = rand(-0.02, 0.10);
        p.z = z + rand(-0.14, 0.14);
        p.vx = rand(-0.8, 0.2);
        p.vy = rand(0.48, 1.25) * (0.5 + power * 0.55);
        p.vz = rand(-0.35, 0.35);
        p.size = 0.20 + power * 0.32;
        p.mesh.visible = true;
      }
    },

    spawnBubbles(x, y, z, count = 3) {
      this.spawnSplash(x, z, Math.min(1, count * 0.22));
    },

    update(dt, timeSec, swimmerX, swimmerZ = 0) {
      // Chuyển động vân nắng Caustics lung linh dưới đáy hồ và trên mặt nước
      causticsTex.offset.x = (timeSec * 0.08) % 1;
      causticsTex.offset.y = Math.sin(timeSec * 0.5) * 0.15;
      surfaceTex.offset.x = (-timeSec * 0.06) % 1;
      surfaceTex.offset.y = Math.cos(timeSec * 0.4) * 0.12;

      // Vòng sóng nước tự nhiên tỏa ra quanh thân VĐV ngay cả khi đang nổi
      bodyRippleTimer -= dt;
      if (bodyRippleTimer <= 0) {
        spawnRipple(swimmerX - 0.1, swimmerZ, 1.35);
        bodyRippleTimer = 0.32;
      }

      const posAttr = waterGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const wx = posAttr.getX(i) + Z / 2;
        const wz = posAttr.getZ(i);
        const dist = Math.abs(wx - swimmerX);
        const wake = Math.max(0, 1 - dist / 3.5) * 0.038;
        const waveY =
          Math.sin(wx * 2.2 - timeSec * 4.0 + wz * 1.6) * 0.014 +
          Math.cos(wx * 4.5 - timeSec * 6.8) * wake;
        posAttr.setY(i, waveY);
      }
      posAttr.needsUpdate = true;

      for (const r of ripples) {
        if (!r.mesh.visible) continue;
        r.age += dt;
        if (r.age >= r.life) {
          r.mesh.visible = false;
          continue;
        }
        const t = r.age / r.life;
        const sc = 0.28 + t * r.maxScale;
        r.mesh.scale.setScalar(sc);
        r.mesh.material.opacity = 0.65 * (1 - t);
      }

      for (const s of splashes) {
        if (!s.mesh.visible) continue;
        s.age += dt;
        if (s.age >= s.life) {
          s.mesh.visible = false;
          continue;
        }
        const t = s.age / s.life;
        s.vy -= 3.2 * dt;
        s.x += s.vx * dt;
        s.y = Math.max(-0.08, s.y + s.vy * dt);
        s.z += s.vz * dt;
        s.mesh.position.set(s.x, s.y, s.z);
        s.mesh.scale.setScalar(s.size * (0.85 + t * 1.35));
        s.mesh.material.opacity = 0.85 * (1 - t);
      }
    },
  };
}
