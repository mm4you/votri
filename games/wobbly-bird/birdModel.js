/**
 * @file birdModel.js
 * @description Dựng mô hình 3D Chú Chim Béo Tập Bay (Wobbly Wings Bird) ngộ nghĩnh, hài hước (Goofy Borb):
 * - Thân tròn phúng phính hình quả trứng (Egg Borb), phao câu vểnh cao nhún nhảy.
 * - Cặp mắt lồi Googly Eyes to tròn trên đỉnh đầu, tròng mắt đảo ngơ ngác (nhìn từ sau lưng vẫn thấy rõ).
 * - Cặp cánh 3D dày dặn bo tròn mềm mại (Capsule Aerodynamics) kèm nhãn phím F (Cam) / J (Tím) to rõ.
 * - Đôi chân ngắn củn chổng phao câu ra phía sau khi bay, quẫy tít mù khi gặp chướng ngại vật.
 * - 4 Bộ cánh ngộ nghĩnh: Vịt Vàng Mỏ Bẹt, Bồ Câu Ngơ Ngác, Vẹt Nhiệt Đới, Cú Mèo Mắt Lồi.
 */

import * as THREE from '../../shared/vendor/three.module.js?v=17';
import { WINGS, BIRD_SKINS } from './config.js?v=17';

function createKeyBadgeSprite(keyText, bgHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fillStyle = bgHex;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px ui-monospace, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(keyText, 64, 68);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.28, 0.28, 1);
  sprite.renderOrder = 25;
  return sprite;
}

export function createBirdModel({ skinId = 'pigeon', isGhost = false } = {}) {
  const skinCfg = BIRD_SKINS.find((s) => s.id === skinId) || BIRD_SKINS[0];
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';

  const makeMat = (colorHex, roughness = 0.48, emissiveHex = 0x000000, emissiveIntensity = 0) =>
    new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness,
      metalness: 0.02,
      emissive: emissiveHex,
      emissiveIntensity: isGhost ? 0 : emissiveIntensity,
      transparent: isGhost,
      opacity: isGhost ? 0.28 : 1.0,
      depthWrite: !isGhost,
    });

  const bodyMat = makeMat(skinCfg.bodyColor, 0.52);
  const bellyMat = makeMat(skinCfg.bellyColor, 0.58);
  const wingTipMat = makeMat(skinCfg.wingTipColor, 0.42);
  const beakMat = makeMat(skinCfg.beakColor, 0.22);
  const crestMat = makeMat(skinCfg.crestColor, 0.35);
  const collarMat = makeMat(skinCfg.collarColor || skinCfg.crestColor, 0.38, skinCfg.collarColor, 0.20);
  const whiteMat = makeMat(0xffffff, 0.12);
  const pupilMat = makeMat(0x0f172a, 0.05);
  const blushMat = makeMat(0xf43f5e, 0.45, 0xf43f5e, 0.22);
  const footMat = makeMat(skinCfg.id === 'duck' ? 0xf97316 : 0xfb923c, 0.32);

  // 1. Thân tròn xoe quả trứng phúng phính (Chubby Borb)
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 28), bodyMat);
  torso.scale.set(1.20, 1.06, 1.02);
  bodyGroup.add(torso);

  // Yếm bụng phồng to sáng màu ôm trọn phía trước
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.33, 28, 24), bellyMat);
  belly.scale.set(1.14, 0.92, 0.95);
  belly.position.set(0.06, -0.08, 0);
  bodyGroup.add(belly);

  // Vòng cổ lông mềm mại
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.026, 14, 32),
    collarMat
  );
  collar.rotation.y = Math.PI / 2;
  collar.rotation.x = 0.22;
  collar.position.set(0.24, 0.06, 0);
  bodyGroup.add(collar);

  // 2. Mắt lồi Googly Eyes siêu ngố trên đỉnh đầu (nhìn từ sau lưng thấy rõ 2 tròng mắt tròn xoe!)
  const pupils = [];
  const xEyes = [];
  for (const side of [-1, 1]) {
    const eyeHolder = new THREE.Group();
    eyeHolder.position.set(0.18, 0.30, side * 0.16);

    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.11, 22, 18), whiteMat);
    eyeHolder.add(eyeWhite);

    const pupilPivot = new THREE.Group();
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 14), pupilMat);
    pupil.position.set(0.068, 0.02, side * 0.035);
    pupilPivot.add(pupil);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.020, 8, 8), whiteMat);
    glint.position.set(0.092, 0.045, side * 0.042);
    pupilPivot.add(glint);

    eyeHolder.add(pupilPivot);
    pupils.push(pupilPivot);

    // Mắt chữ X ngất xỉu hoa mắt khi cắm mỏ
    const xEyePivot = new THREE.Group();
    xEyePivot.position.set(0.082, 0.02, side * 0.035);
    const xMat = makeMat(0x0f172a, 0.2);
    const xBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.095, 0.016), xMat);
    xBar1.rotation.z = Math.PI / 4;
    xEyePivot.add(xBar1);
    const xBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.095, 0.016), xMat);
    xBar2.rotation.z = -Math.PI / 4;
    xEyePivot.add(xBar2);
    xEyePivot.visible = false;
    eyeHolder.add(xEyePivot);
    xEyes.push(xEyePivot);

    bodyGroup.add(eyeHolder);

    // Mí mắt ngố
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 10, 24), bodyMat);
    lid.rotation.y = Math.PI / 2;
    eyeHolder.add(lid);

    // Má hồng tròn xoe
    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.062, 12, 10), blushMat);
    blush.scale.set(0.7, 0.5, 0.35);
    blush.position.set(0.24, 0.10, side * 0.28);
    bodyGroup.add(blush);
  }

  // 2b. VÒNG SAO VÀNG CHOÁNG VÁNG TIỀN ĐÌNH (DIZZY STARS HALO)
  // 4 ngôi sao 3D lấp lánh xoay vòng trên đỉnh đầu khi chim bị cắm mỏ hoặc choáng
  const haloGroup = new THREE.Group();
  haloGroup.position.set(0.12, 0.52, 0);
  const starMat = makeMat(0xfacc15, 0.15, 0xf59e0b, 0.85);
  const stars = [];
  for (let i = 0; i < 4; i++) {
    const starHolder = new THREE.Group();
    const s1 = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), starMat);
    s1.scale.set(1.2, 0.32, 1.2);
    starHolder.add(s1);
    const s2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), starMat);
    s2.scale.set(0.32, 1.2, 1.2);
    starHolder.add(s2);
    haloGroup.add(starHolder);
    stars.push(starHolder);
  }
  haloGroup.visible = false;
  bodyGroup.add(haloGroup);

  // 3. Mào lông ngộ nghĩnh trên đỉnh đầu
  const crestGroup = new THREE.Group();
  crestGroup.position.set(0.05, 0.44, 0);
  for (let i = 0; i < 3; i++) {
    const tuft = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.038, 0.14 + i * 0.02, 8, 12),
      crestMat
    );
    tuft.position.set((i - 1) * 0.042, 0.02, 0);
    tuft.rotation.z = -0.32 - (i - 1) * 0.22;
    crestGroup.add(tuft);
  }
  bodyGroup.add(crestGroup);

  // 4. Mỏ ngộ nghĩnh (Chubby Beak)
  if (skinCfg.id === 'duck') {
    // Mỏ vịt bẹt to đùng siêu hài
    const duckBill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.11, 0.28, 16).rotateZ(Math.PI / 2),
      beakMat
    );
    duckBill.scale.set(0.85, 0.42, 1.15);
    duckBill.position.set(0.42, 0.10, 0);
    bodyGroup.add(duckBill);
  } else if (skinCfg.id === 'parrot') {
    const hookBeak = new THREE.Mesh(
      new THREE.ConeGeometry(0.095, 0.26, 14).rotateZ(-Math.PI / 2),
      beakMat
    );
    hookBeak.position.set(0.40, 0.12, 0);
    hookBeak.rotation.z = -0.32;
    bodyGroup.add(hookBeak);
  } else {
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.095, 0.24, 16).rotateZ(-Math.PI / 2),
      beakMat
    );
    beak.position.set(0.42, 0.11, 0);
    beak.scale.set(1.0, 0.68, 1.15);
    bodyGroup.add(beak);
  }

  // 5. Đuôi phao câu vểnh cao nhún nhảy (Perky Fan Tail)
  const tailGroup = new THREE.Group();
  tailGroup.position.set(-0.36, 0.06, 0);
  for (let i = -1; i <= 1; i++) {
    const tFeather = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.046, 0.26, 8, 12),
      i === 0 ? crestMat : wingTipMat
    );
    tFeather.rotation.z = Math.PI / 2 + 0.35; // vểnh cao 20 độ
    tFeather.rotation.y = i * 0.25;
    tFeather.position.set(-0.08, (1 - Math.abs(i)) * 0.025, i * 0.065);
    tailGroup.add(tFeather);
  }
  bodyGroup.add(tailGroup);

  // 6. Đôi chân ngắn củn chổng phao câu ra sau khi bay
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(-0.16, -0.28, side * 0.14);

    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.12, 8, 10), footMat);
    foot.rotation.z = Math.PI / 2 - 0.25;
    foot.position.set(-0.08, 0, 0);
    leg.add(foot);

    bodyGroup.add(leg);
    legs.push(leg);
  }

  // 7. CẶP CÁNH BO TRÒN MỀM MẠI (ROUNDED AERODYNAMIC WINGS)
  // Lông vũ bo tròn capsule xếp tầng, kèm đai phát sáng và nhãn phím F / J to rõ hướng thẳng về camera
  const wingRigs = WINGS.map((cfg) => {
    const side = cfg.side; // -1: Cánh Trái (-Z, Cam F), +1: Cánh Phải (+Z, Tím J)
    const shoulder = new THREE.Group();
    shoulder.position.set(0.06, 0.08, side * 0.28);
    bodyGroup.add(shoulder);

    // Bắp cánh dày dặn
    const bicep = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.26, 12, 16),
      bodyMat
    );
    bicep.rotation.x = Math.PI / 2;
    bicep.rotation.y = side * 0.15;
    bicep.position.set(-0.02, 0, side * 0.14);
    shoulder.add(bicep);

    // Đai đeo cánh thể thao phát sáng
    const bandColor = new THREE.Color(cfg.color);
    const bandMat = new THREE.MeshStandardMaterial({
      color: bandColor,
      roughness: 0.2,
      emissive: bandColor,
      emissiveIntensity: isGhost ? 0.1 : 0.75,
      transparent: isGhost,
      opacity: isGhost ? 0.3 : 1.0,
    });
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.092, 0.092, 0.075, 20).rotateX(Math.PI / 2),
      bandMat
    );
    band.position.set(-0.02, 0, side * 0.18);
    shoulder.add(band);

    if (!isGhost) {
      const badge = createKeyBadgeSprite(cfg.keyLabel, cfg.color);
      badge.position.set(-0.06, 0.20, side * 0.26);
      shoulder.add(badge);
    }

    // Khớp cánh ngoài
    const elbow = new THREE.Group();
    elbow.position.set(0, 0, side * 0.28);
    shoulder.add(elbow);

    // 3 Lông vũ uốn cong bo tròn
    for (let f = 0; f < 3; f++) {
      const feather = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.048 - f * 0.005, 0.30 - f * 0.03, 8, 12),
        f === 0 ? crestMat : wingTipMat
      );
      feather.rotation.x = Math.PI / 2;
      feather.rotation.y = side * (0.18 + f * 0.14);
      feather.position.set(-0.04 * f, 0, side * (0.12 + f * 0.065));
      elbow.add(feather);
    }

    return {
      cfg,
      side,
      shoulder,
      elbow,
      bandMat,
    };
  });

  function updatePose(physState, pressedFlags, timeSec, failPose = null) {
    const wingsData = failPose ? failPose.wings : physState.wings;
    const dizzyVal = physState.dizzy || 0;

    // 1. Biến dạng Squashing & Jiggle (Bẹp dí ngộ nghĩnh khi cắm mỏ)
    if (failPose) {
      const splatSquash = 0.44 + Math.sin(timeSec * 16) * 0.08;
      bodyGroup.scale.set(1.42, splatSquash, 1.42);
    } else {
      const breath = Math.sin(timeSec * 8) * 0.025;
      bodyGroup.scale.set(1.0 + breath * 0.5, 1.0 - breath * 0.3, 1.0 + breath * 0.5);
    }

    // 2. Cử động cánh Trái (F) & Phải (J)
    for (let i = 0; i < 2; i++) {
      const wRig = wingRigs[i];
      const wState = wingsData[i];
      const isPressed = !!(pressedFlags && pressedFlags[i]);

      if (failPose) {
        // Khi cắm mỏ: Cánh buông thõng bẹp dí dính chặt mặt cỏ
        wRig.shoulder.rotation.x = -wRig.side * 1.45;
        wRig.shoulder.rotation.y = -wRig.side * 0.22;
        wRig.shoulder.rotation.z = 0.35;
        wRig.elbow.rotation.x = -wRig.side * 0.72;
        if (!isGhost && wRig.bandMat) {
          wRig.bandMat.emissiveIntensity = 0.15;
        }
      } else {
        wRig.shoulder.rotation.z = 0;
        const flapAngleX = -wRig.side * wState.a;
        wRig.shoulder.rotation.x = flapAngleX;
        wRig.shoulder.rotation.y = wRig.side * (physState.isGliding ? 0.06 : -wState.a * 0.16);

        const foldAngleX = -wRig.side * Math.max(-0.15, wState.a) * 0.45;
        wRig.elbow.rotation.x = foldAngleX;

        if (!isGhost && wRig.bandMat) {
          wRig.bandMat.emissiveIntensity = isPressed ? 1.4 : 0.45;
        }
      }
    }

    // 3. Đuôi, Đầu & Mắt Lồi (Mắt chữ X khi ngất xỉu)
    if (failPose) {
      tailGroup.rotation.z = 0.85 + Math.sin(timeSec * 18) * 0.25;
      tailGroup.rotation.y = Math.sin(timeSec * 22) * 0.35;
    } else {
      tailGroup.rotation.z = Math.sin(timeSec * 14) * 0.10 - (physState.pitch || 0) * 0.40;
      tailGroup.rotation.y = -(physState.roll || 0) * 0.30;
    }

    crestGroup.rotation.x = Math.sin(timeSec * 6) * 0.2;

    for (let i = 0; i < pupils.length; i++) {
      const p = pupils[i];
      const xEye = xEyes[i];
      if (failPose) {
        p.visible = false;
        if (xEye) xEye.visible = true;
      } else {
        p.visible = true;
        if (xEye) xEye.visible = false;
        if (dizzyVal > 0.30) {
          const spinSpeed = 12 + dizzyVal * 14;
          const dir = i === 0 ? 1 : -1;
          p.rotation.x = Math.cos(timeSec * spinSpeed * dir) * 0.35;
          p.rotation.y = Math.sin(timeSec * spinSpeed * dir) * 0.35;
        } else {
          p.rotation.set(0, 0, 0);
        }
      }
    }

    // 4. Vòng sao vàng lấp lánh xoay quanh đầu
    if (failPose || dizzyVal > 0.42) {
      haloGroup.visible = true;
      const orbitSpeed = failPose ? 8.0 : 4.5;
      for (let i = 0; i < stars.length; i++) {
        const starAngle = timeSec * orbitSpeed + (i * Math.PI * 2 / stars.length);
        stars[i].position.set(
          Math.cos(starAngle) * 0.28,
          Math.sin(starAngle * 3) * 0.04,
          Math.sin(starAngle) * 0.28
        );
        stars[i].rotation.y = timeSec * 10;
        stars[i].rotation.x = timeSec * 6;
      }
    } else {
      haloGroup.visible = false;
    }

    // 5. Cử động chân: Giãy đạp lia lịa khi cắm mỏ, co gọn khi lướt dù
    for (let i = 0; i < legs.length; i++) {
      if (failPose) {
        legs[i].rotation.z = -1.15 + Math.sin(timeSec * 24 + i * Math.PI) * 0.65;
      } else if (physState.isGliding) {
        legs[i].rotation.z = -0.75;
      } else {
        legs[i].rotation.z = -0.25 + Math.sin(timeSec * 10 + i * Math.PI) * 0.22;
      }
    }
  }

  return {
    root,
    updatePose,
  };
}
