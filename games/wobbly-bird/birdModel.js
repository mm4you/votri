/**
 * @file birdModel.js
 * @description Dựng mô hình 3D Chú Chim Béo Tập Bay (Wobbly Wings Bird) cao cấp, cực kỳ đáng yêu:
 * - Dáng thân tròn phúng phính (Chubby Borb), bụng phệ mềm mại, phao câu nhún nhảy.
 * - Cặp cánh 3D đầy đặn (Volumetric Aerodynamic Wings) xếp 3 tầng lông vũ bo tròn mềm mại,
 *   không dùng khối hộp hay mặt phẳng mỏng dính.
 * - Đai cánh thể thao phát sáng & nhãn phím F (Cam) / J (Tím) to rõ, hướng thẳng về camera sau lưng.
 * - Mắt tròn to long lanh có đốm sáng, má hồng phúng phính, mào lông nhún nhảy theo gió.
 * - 4 Loài chim đặc trưng: Bồ Câu Đưa Thư, Vẹt Nhiệt Đới, Cú Mèo Tròn Xoe, Vịt Vàng Bụng Bự.
 */

import * as THREE from '../../shared/vendor/three.module.js?v=15';
import { WINGS, BIRD_SKINS } from './config.js?v=15';

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
  sprite.scale.set(0.25, 0.25, 1);
  sprite.renderOrder = 25;
  return sprite;
}

export function createBirdModel({ skinId = 'pigeon', isGhost = false } = {}) {
  const skinCfg = BIRD_SKINS.find((s) => s.id === skinId) || BIRD_SKINS[0];
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';

  const makeMat = (colorHex, roughness = 0.52, emissiveHex = 0x000000, emissiveIntensity = 0) =>
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

  const bodyMat = makeMat(skinCfg.bodyColor, 0.55);
  const bellyMat = makeMat(skinCfg.bellyColor, 0.58);
  const wingTipMat = makeMat(skinCfg.wingTipColor, 0.48);
  const beakMat = makeMat(skinCfg.beakColor, 0.25);
  const crestMat = makeMat(skinCfg.crestColor, 0.45);
  const collarMat = makeMat(skinCfg.collarColor || skinCfg.crestColor, 0.40, skinCfg.collarColor, 0.20);
  const whiteMat = makeMat(0xffffff, 0.18);
  const pupilMat = makeMat(0x0f172a, 0.06);
  const blushMat = makeMat(0xf43f5e, 0.45, 0xf43f5e, 0.25);
  const footMat = makeMat(0xf97316, 0.35);

  // 1. Thân chim hình giọt nước mũm mĩm (Chubby Borb Body)
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 28), bodyMat);
  torso.scale.set(1.18, 1.04, 1.02);
  bodyGroup.add(torso);

  // Bụng phệ mềm mại ôm phía dưới
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.31, 28, 24), bellyMat);
  belly.scale.set(1.12, 0.90, 0.96);
  belly.position.set(0.04, -0.09, 0);
  bodyGroup.add(belly);

  // Vòng lông cổ mềm mại
  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.028, 14, 32),
    collarMat
  );
  collar.rotation.y = Math.PI / 2;
  collar.rotation.x = 0.22;
  collar.position.set(0.24, 0.06, 0);
  bodyGroup.add(collar);

  // Đuôi phao câu xòe 3 cọng lông đầy đặn, chếch nhẹ 20 độ lên trên
  const tailGroup = new THREE.Group();
  tailGroup.position.set(-0.35, 0.05, 0);

  for (let idx = 0; idx < 3; idx++) {
    const fAngle = (idx - 1) * 0.22;
    const isCenter = idx === 1;
    const feather = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.055, 0.28, 8, 12),
      isCenter ? crestMat : wingTipMat
    );
    feather.rotation.z = Math.PI / 2 + 0.25;
    feather.rotation.y = fAngle;
    feather.position.set(-0.10, isCenter ? 0.02 : 0, (idx - 1) * 0.075);
    tailGroup.add(feather);
  }
  bodyGroup.add(tailGroup);

  // 2. Đầu, Mào Lông, Mỏ & Cặp Mắt Tròn Xoe
  const headGroup = new THREE.Group();
  headGroup.position.set(0.33, 0.18, 0);
  bodyGroup.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 24), bodyMat);
  headGroup.add(headMesh);

  // Mào lông đỉnh đầu
  const crestGroup = new THREE.Group();
  crestGroup.position.set(-0.02, 0.22, 0);

  if (skinCfg.id === 'duck') {
    const duckTuft = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 12), crestMat);
    duckTuft.scale.set(0.9, 1.4, 0.8);
    duckTuft.rotation.z = -0.22;
    crestGroup.add(duckTuft);
  } else if (skinCfg.id === 'owl') {
    for (const side of [-1, 1]) {
      const earTuft = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 12), crestMat);
      earTuft.position.set(-0.04, 0.05, side * 0.13);
      earTuft.rotation.z = -0.28;
      earTuft.rotation.x = side * 0.35;
      crestGroup.add(earTuft);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.15 + i * 0.02, 12), crestMat);
      tuft.position.set((i - 1) * 0.045, 0.04, 0);
      tuft.rotation.z = (1 - i) * 0.22 + 0.18;
      crestGroup.add(tuft);
    }
  }
  headGroup.add(crestGroup);

  // Mỏ đặc trưng từng loài
  if (skinCfg.id === 'duck') {
    const duckBill = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 0.24, 14).rotateZ(Math.PI / 2), beakMat);
    duckBill.scale.set(0.8, 0.45, 1.0);
    duckBill.position.set(0.24, -0.02, 0);
    headGroup.add(duckBill);
  } else if (skinCfg.id === 'parrot') {
    const hookBeak = new THREE.Mesh(
      new THREE.ConeGeometry(0.088, 0.24, 14).rotateZ(-Math.PI / 2),
      beakMat
    );
    hookBeak.position.set(0.23, 0.02, 0);
    hookBeak.rotation.z = -0.32;
    headGroup.add(hookBeak);
  } else {
    const upperBeak = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.20, 14).rotateZ(-Math.PI / 2),
      beakMat
    );
    upperBeak.position.set(0.24, 0.015, 0);
    const lowerBeak = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.15, 12).rotateZ(-Math.PI / 2),
      beakMat
    );
    lowerBeak.position.set(0.22, -0.035, 0);
    headGroup.add(upperBeak, lowerBeak);
  }

  // Mắt tròn to có hồn + Má hồng
  const pupils = [];
  for (const side of [-1, 1]) {
    const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(0.084, 20, 18), whiteMat);
    eyeBall.position.set(0.12, 0.075, side * 0.165);
    eyeBall.scale.set(1.0, 1.05, 0.95);
    headGroup.add(eyeBall);

    const pupilPivot = new THREE.Group();
    pupilPivot.position.copy(eyeBall.position);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 12), pupilMat);
    pupil.position.set(0.055, 0.005, side * 0.032);

    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), whiteMat);
    glint.position.set(0.032, 0.016, side * 0.012);
    pupil.add(glint);

    pupilPivot.add(pupil);
    headGroup.add(pupilPivot);
    pupils.push(pupilPivot);

    const blush = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), blushMat);
    blush.scale.set(0.75, 0.52, 0.35);
    blush.position.set(0.11, -0.04, side * 0.19);
    headGroup.add(blush);
  }

  // 3. Đôi chân nhỏ xinh
  const legs = [];
  for (const side of [-1, 1]) {
    const legPivot = new THREE.Group();
    legPivot.position.set(-0.02, -0.26, side * 0.13);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.024, 0.12, 12), bodyMat);
    thigh.position.set(0, -0.04, 0);

    const footGroup = new THREE.Group();
    footGroup.position.set(0.02, -0.14, 0);
    for (let t = -1; t <= 1; t++) {
      const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.07, 6, 8), footMat);
      toe.rotation.z = Math.PI / 2;
      toe.rotation.y = t * 0.32;
      toe.position.set(0.035, 0, t * 0.03);
      footGroup.add(toe);
    }
    legPivot.add(thigh, footGroup);
    bodyGroup.add(legPivot);
    legs.push(legPivot);
  }

  // 4. CẶP CÁNH 3D ĐẦY ĐẶN (VOLUMETRIC AERODYNAMIC WINGS)
  // Nhìn từ góc sau lưng cực kỳ mượt mà, lông vũ xếp lớp mềm mại:
  const wingRigs = WINGS.map((cfg) => {
    const side = cfg.side; // -1: Cánh Trái (-Z, Cam F), +1: Cánh Phải (+Z, Tím J)
    const shoulder = new THREE.Group();
    shoulder.position.set(0.05, 0.07, side * 0.26);
    bodyGroup.add(shoulder);

    // Bắp cánh trong (Inner Wing) - Khối bầu dục tròn trịa
    const innerWingMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.075, 0.28, 12, 16),
      bodyMat
    );
    innerWingMesh.rotation.x = Math.PI / 2;
    innerWingMesh.position.set(0, 0, side * 0.15);
    shoulder.add(innerWingMesh);

    // Đai thể thao phát sáng nhận diện phím F / J
    const bandColor = new THREE.Color(cfg.color);
    const bandMat = new THREE.MeshStandardMaterial({
      color: bandColor,
      roughness: 0.22,
      emissive: bandColor,
      emissiveIntensity: isGhost ? 0.1 : 0.65,
      transparent: isGhost,
      opacity: isGhost ? 0.3 : 1.0,
    });
    const bandRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.088, 0.075, 20).rotateX(Math.PI / 2),
      bandMat
    );
    bandRing.position.set(0, 0, side * 0.20);
    shoulder.add(bandRing);

    if (!isGhost) {
      const badge = createKeyBadgeSprite(cfg.keyLabel, cfg.color);
      badge.position.set(-0.06, 0.18, side * 0.28);
      shoulder.add(badge);
    }

    // Khớp cánh ngoài (Outer Wing Tip)
    const elbow = new THREE.Group();
    elbow.position.set(0, 0, side * 0.30);
    shoulder.add(elbow);

    // 3 Lông vũ dài bo tròn xếp tầng (không phải hộp dẹt)
    for (let f = 0; f < 3; f++) {
      const featherMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.045 - f * 0.006, 0.32 - f * 0.04, 8, 12),
        f === 0 ? crestMat : wingTipMat
      );
      featherMesh.rotation.x = Math.PI / 2;
      featherMesh.rotation.y = side * (0.15 + f * 0.14);
      featherMesh.position.set(-0.05 * f, 0, side * (0.14 + f * 0.065));
      elbow.add(featherMesh);
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

    // 1. Cử động cánh Trái (F) & Phải (J)
    for (let i = 0; i < 2; i++) {
      const wRig = wingRigs[i];
      const wState = wingsData[i];
      const isPressed = !!(pressedFlags && pressedFlags[i]);

      const flapAngleX = -wRig.side * wState.a;
      wRig.shoulder.rotation.x = flapAngleX;
      wRig.shoulder.rotation.y = wRig.side * (physState.isGliding ? 0.06 : -wState.a * 0.16);

      const foldAngleX = -wRig.side * Math.max(-0.15, wState.a) * 0.45;
      wRig.elbow.rotation.x = foldAngleX;

      if (!isGhost && wRig.bandMat) {
        wRig.bandMat.emissiveIntensity = isPressed ? 1.4 : 0.45;
      }
    }

    // 2. Đuôi, Đầu & Mắt Lồi
    const dizzyVal = physState.dizzy || 0;
    tailGroup.rotation.z = Math.sin(timeSec * 14) * 0.10 - (physState.pitch || 0) * 0.40;
    tailGroup.rotation.y = -(physState.roll || 0) * 0.30;

    headGroup.rotation.z = Math.max(-0.35, Math.min(0.42, -(physState.pitch || 0) * 0.45));
    headGroup.rotation.x = -(physState.roll || 0) * 0.35;

    for (let i = 0; i < pupils.length; i++) {
      const p = pupils[i];
      if (failPose || dizzyVal > 0.30) {
        const spinSpeed = failPose ? 20 : 12 + dizzyVal * 14;
        const dir = i === 0 ? 1 : -1;
        p.rotation.x = Math.cos(timeSec * spinSpeed * dir) * 0.35;
        p.rotation.y = Math.sin(timeSec * spinSpeed * dir) * 0.35;
      } else {
        p.rotation.set(0, 0, 0);
      }
    }

    // 3. Cử động chân: Co gọn gàng khi lướt dù
    for (let i = 0; i < legs.length; i++) {
      if (failPose) {
        legs[i].rotation.z = -0.3 + Math.sin(timeSec * 24 + i * Math.PI) * 0.75;
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
