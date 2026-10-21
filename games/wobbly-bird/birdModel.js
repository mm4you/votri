/**
 * @file birdModel.js
 * @description Dựng mô hình 3D Chú Chim Béo Tập Bay (Wobbly Wings Bird) siêu rõ nét, hài hước:
 * - Thân tròn mũm mĩm, bụng phệ, má hồng, mào lông nhún nhảy, cặp mắt lồi (Googly Eyes) đảo tròng khi tiền đình (Dizzy)
 * - 2 Cánh lớn tách biệt Trái (F - Cam) & Phải (J - Tím) với nhiều lớp lông vũ xếp tầng + Vòng màu phát sáng & Nhãn phím F / J
 * - Đôi chân ngắn củn đạp loạn xạ khi lộn vòng hoặc chổng phao câu khi cắm mỏ (Faceplant).
 */

import * as THREE from '../../shared/vendor/three.module.js?v=4';
import { WINGS, BIRD_SKINS } from './config.js?v=4';

function createKeyBadgeSprite(keyText, bgHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fillStyle = bgHex;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 66px ui-monospace, system-ui, sans-serif';
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
  sprite.scale.set(0.24, 0.24, 1);
  sprite.renderOrder = 25;
  return sprite;
}

export function createBirdModel({ skinId = 'pigeon', isGhost = false } = {}) {
  const skinCfg = BIRD_SKINS.find((s) => s.id === skinId) || BIRD_SKINS[0];
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';

  const makeMat = (colorHex, roughness = 0.35, emissiveHex = 0x000000, emissiveIntensity = 0) =>
    new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness,
      emissive: emissiveHex,
      emissiveIntensity: isGhost ? 0 : emissiveIntensity,
      transparent: isGhost,
      opacity: isGhost ? 0.28 : 1.0,
      depthWrite: !isGhost,
    });

  const bodyMat = makeMat(skinCfg.bodyColor, 0.38);
  const bellyMat = makeMat(skinCfg.bellyColor, 0.42);
  const wingTipMat = makeMat(skinCfg.wingTipColor, 0.35);
  const beakMat = makeMat(skinCfg.beakColor, 0.28);
  const crestMat = makeMat(skinCfg.crestColor, 0.32);
  const whiteMat = makeMat(0xffffff, 0.15);
  const pupilMat = makeMat(0x0f172a, 0.1);
  const blushMat = makeMat(0xf43f5e, 0.4, 0xf43f5e, 0.15);

  // 1. Thân chim tròn mũm mĩm (Hướng đầu về +X, Lưng +Y, Cánh Trái -Z, Cánh Phải +Z)
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 20), bodyMat);
  torso.scale.set(1.25, 0.96, 1.05);
  bodyGroup.add(torso);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 16), bellyMat);
  belly.scale.set(1.15, 0.82, 0.92);
  belly.position.set(0.05, -0.08, 0);
  bodyGroup.add(belly);

  // Đuôi xòe 3 lông vũ phía sau (-X) nhìn từ Góc Sau Lưng cực rõ
  const tailGroup = new THREE.Group();
  tailGroup.position.set(-0.38, 0.04, 0);
  for (const side of [-1, 0, 1]) {
    const feather = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.04, 0.14),
      side === 0 ? crestMat : wingTipMat
    );
    feather.position.set(-0.1, 0, side * 0.09);
    feather.rotation.y = side * 0.28;
    feather.rotation.z = -0.18;
    tailGroup.add(feather);
  }
  bodyGroup.add(tailGroup);

  // 2. Đầu, Mào, Mỏ & Cặp Mắt Lồi (Googly Eyes)
  const headGroup = new THREE.Group();
  headGroup.position.set(0.32, 0.18, 0);
  bodyGroup.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 18), bodyMat);
  headGroup.add(headMesh);

  // Mào lông trên đỉnh đầu
  const crestGroup = new THREE.Group();
  crestGroup.position.set(-0.02, 0.22, 0);
  for (let i = 0; i < 3; i++) {
    const tuft = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.16, 10),
      crestMat
    );
    tuft.position.set((i - 1) * 0.05, 0.05, 0);
    tuft.rotation.z = (1 - i) * 0.25 + 0.2;
    crestGroup.add(tuft);
  }
  headGroup.add(crestGroup);

  // Mỏ trên & Mỏ dưới
  const upperBeak = new THREE.Mesh(
    new THREE.ConeGeometry(0.085, 0.22, 12).rotateZ(-Math.PI / 2),
    beakMat
  );
  upperBeak.position.set(0.26, 0.02, 0);
  headGroup.add(upperBeak);

  const lowerBeak = new THREE.Mesh(
    new THREE.ConeGeometry(0.065, 0.16, 12).rotateZ(-Math.PI / 2),
    beakMat
  );
  lowerBeak.position.set(0.23, -0.04, 0);
  headGroup.add(lowerBeak);

  // Cặp mắt lồi Googly Eyes + Má hồng
  const pupils = [];
  for (const side of [-1, 1]) {
    const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.078, 16, 14), whiteMat);
    eyeBall.position.set(0.12, 0.07, side * 0.16);
    headGroup.add(eyeBall);

    const pupilPivot = new THREE.Group();
    pupilPivot.position.copy(eyeBall.position);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), pupilMat);
    pupil.position.set(0.052, 0, side * 0.035);
    pupilPivot.add(pupil);
    headGroup.add(pupilPivot);
    pupils.push(pupilPivot);

    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), blushMat);
    blush.scale.set(0.8, 0.55, 0.4);
    blush.position.set(0.11, -0.03, side * 0.19);
    headGroup.add(blush);
  }

  // 3. Đôi chân ngắn củn phía dưới bụng
  const legs = [];
  for (const side of [-1, 1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(-0.04, -0.28, side * 0.14);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.022, 0.18, 10), beakMat);
    shank.position.y = -0.09;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.1), beakMat);
    foot.position.set(0.03, -0.18, 0);
    legPivot.add(shank, foot);
    bodyGroup.add(legPivot);
    legs.push(legPivot);
  }

  // 4. Hai Cánh Lớn Trái (F) & Phải (J) có khớp khuỷu + Vòng phát sáng + Nhãn phím F / J
  const wingRigs = WINGS.map((cfg) => {
    const side = cfg.side; // -1: Trái (-Z), +1: Phải (+Z)
    const shoulder = new THREE.Group();
    shoulder.position.set(0.04, 0.06, side * 0.28);
    bodyGroup.add(shoulder);

    // Phần cánh trong (Inner Wing)
    const innerWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.065, 0.42),
      bodyMat
    );
    innerWing.position.set(0, 0, side * 0.19);
    shoulder.add(innerWing);

    // Vòng màu phát sáng (Band) quanh cánh để nhận diện nút F (Cam) và J (Tím)
    const bandColor = new THREE.Color(cfg.color);
    const bandMat = new THREE.MeshStandardMaterial({
      color: bandColor,
      roughness: 0.22,
      emissive: bandColor,
      emissiveIntensity: isGhost ? 0.1 : 0.55,
      transparent: isGhost,
      opacity: isGhost ? 0.3 : 1.0,
    });
    const bandMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.082, 0.11),
      bandMat
    );
    bandMesh.position.set(0, 0, side * 0.28);
    shoulder.add(bandMesh);

    if (!isGhost) {
      const badge = createKeyBadgeSprite(cfg.keyLabel, cfg.color);
      badge.position.set(-0.04, 0.16, side * 0.36);
      shoulder.add(badge);
    }

    // Khớp cánh ngoài (Outer Wing Tip) gập mở theo pha vỗ cánh
    const elbow = new THREE.Group();
    elbow.position.set(0, 0, side * 0.38);
    shoulder.add(elbow);

    const outerWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.05, 0.38),
      wingTipMat
    );
    outerWing.position.set(-0.02, 0, side * 0.17);
    elbow.add(outerWing);

    // Các lông vũ đầu cánh
    for (let f = 0; f < 3; f++) {
      const featherTip = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.032, 0.18),
        crestMat
      );
      featherTip.position.set(-0.06 * f, 0, side * (0.34 + f * 0.04));
      featherTip.rotation.y = side * (0.12 * f);
      elbow.add(featherTip);
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

    // 1. Cử động 2 cánh Trái (F) & Phải (J)
    for (let i = 0; i < 2; i++) {
      const wRig = wingRigs[i];
      const wState = wingsData[i];
      const isPressed = !!(pressedFlags && pressedFlags[i]);

      // Xoay quanh trục X: side * angle để cả 2 cánh cùng giơ lên (+Y) khi angle > 0 và đập xuống (-Y) khi angle < 0
      const flapAngleX = -wRig.side * wState.a;
      wRig.shoulder.rotation.x = flapAngleX;
      wRig.shoulder.rotation.y = wRig.side * (physState.isGliding ? 0.04 : -wState.a * 0.18);

      // Gập nhẹ đầu cánh khi đang giơ cánh lên
      const foldAngleX = -wRig.side * Math.max(0, wState.a) * 0.45;
      wRig.elbow.rotation.x = foldAngleX;

      if (!isGhost) {
        wRig.bandMat.emissiveIntensity = isPressed ? 1.35 : 0.42;
      }
    }

    // 2. Cử động Đuôi, Đầu, Mắt Lồi (đảo xoay tròn khi Choáng Tiền Đình / Dizzy) & Đôi Chân
    const dizzyVal = physState.dizzy || 0;
    tailGroup.rotation.z = Math.sin(timeSec * 12) * 0.12 - (physState.pitch || 0) * 0.35;
    headGroup.rotation.z = Math.max(-0.35, Math.min(0.45, -(physState.pitch || 0) * 0.45));
    headGroup.rotation.x = -(physState.roll || 0) * 0.35;

    for (let i = 0; i < pupils.length; i++) {
      const p = pupils[i];
      if (failPose || dizzyVal > 0.35) {
        const spinSpeed = failPose ? 18 : 10 + dizzyVal * 12;
        const dir = i === 0 ? 1 : -1;
        p.rotation.x = Math.cos(timeSec * spinSpeed * dir) * 0.35;
        p.rotation.y = Math.sin(timeSec * spinSpeed * dir) * 0.35;
      } else {
        p.rotation.set(0, 0, 0);
      }
    }

    // Chân đạp loạn xạ khi lộn vòng hoặc đang bay
    for (let i = 0; i < legs.length; i++) {
      const speed = failPose ? 22 : 9;
      const amp = failPose ? 0.65 : (physState.isGliding ? 0.12 : 0.32);
      legs[i].rotation.z = -0.35 + Math.sin(timeSec * speed + i * Math.PI) * amp;
    }
  }

  return {
    root,
    updatePose,
  };
}
