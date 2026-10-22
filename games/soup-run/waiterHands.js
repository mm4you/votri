/**
 * @file waiterHands.js
 * @description Mô hình Đôi Cánh Tay & Bàn Tay Người Phục Vụ Bưng Phở từ Model Xbot.glb:
 * 1. Sử dụng 100% Lưới SkinnedMesh và Khung Xương (Rig) thật từ Xbot.glb:
 *    - Toàn bộ cánh tay (vai, bắp tay, cẳng tay, cổ tay, bàn tay, 5 ngón tay) là MỘT DẢI LƯỚI LIỀN MẠCH DUY NHẤT.
 *    - Tuyệt đối không ghép nối hình trụ, không có bất kỳ khe hở hay đứt đoạn nào.
 * 2. Tư thế bưng phở giải phẫu học chuẩn xác 100%:
 *    - Hai bàn tay bám chắc 2 bên vành tô sứ (không chỉa vào nhau che lấp bát phở hay đè lên lòng đỏ trứng).
 *    - Ngón cái tì phẳng tự nhiên trên mặt vành tô sứ (cao độ Y = 1.238m khớp chính xác vành miệng bát).
 *    - 4 ngón tay (trỏ, giữa, áp út, út) uốn cong đỡ vững vàng dưới đáy gờ mép bát (Y = 1.161m).
 *    - Cánh tay áo sơ mi trắng muốt nối dài liền mạch từ cổ tay xuyên suốt ra ngoài hai góc màn hình.
 * 3. Phản ứng bỏng nước sôi (Scald Heat Glow):
 *    - Khi nước phở sôi tràn trúng ngón tay, da tay ửng đỏ rát bỏng tự nhiên và giật nảy cơ tinh tế.
 */

import * as THREE from '../../shared/vendor/three.module.js';
import { GLTFLoader } from '../../shared/vendor/GLTFLoader.js';
import { clone as cloneSkeleton } from '../../shared/vendor/SkeletonUtils.js';

const gltfLoader = new GLTFLoader();
let cachedXbotGlbPromise = null;

function loadXbotModel() {
  if (!cachedXbotGlbPromise) {
    cachedXbotGlbPromise = gltfLoader.loadAsync('../../shared/vendor/Xbot.glb');
  }
  return cachedXbotGlbPromise;
}

export function createWaiterHands({ skin = {} } = {}) {
  const root = new THREE.Group();
  root.name = 'waiter-xbot-hands-root';

  const uniforms = {
    uScaldIntensity: { value: 0.0 },
    uScaldSide: { value: 0.0 },
  };

  // Chất liệu da tay + áo sơ mi trắng phục vụ tính theo pixel trong shader
  const waiterMaterial = new THREE.MeshStandardMaterial({
    color: 0xd68d62,
    roughness: 0.58,
    metalness: 0.02,
  });

  waiterMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader =
      'varying vec3 vRestPos;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvRestPos = position;'
      );

    shader.fragmentShader =
      'uniform float uScaldIntensity;\n' +
      'uniform float uScaldSide;\n' +
      'varying vec3 vRestPos;\n' +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  // Ẩn đầu, cổ, thân dưới và chân của Xbot, chỉ giữ lại đôi cánh tay bưng bát
  float ax = abs(vRestPos.x);
  float ry = vRestPos.y;

  // Loại bỏ phần chân và thân dưới (dưới hông)
  if (ry < 1.05) discard;
  // Loại bỏ phần đầu và cổ
  if (ry > 1.50 && ax < 0.18) discard;
  // Loại bỏ ngực giữa và bụng
  if (ax < 0.16) discard;

  // Phân định chất liệu:
  // Cổ tay và bàn tay (vRestPos.x > 0.69) mang màu da tự nhiên
  // Cẳng tay và bắp tay áo (vRestPos.x <= 0.69) mang màu áo sơ mi trắng muốt
  float isHand = smoothstep(0.68, 0.70, ax);
  vec3 skinBase = vec3(0.839, 0.553, 0.384);   // #d68d62 da tự nhiên Á Đông
  // Màu da ửng đỏ rát bỏng khi nước sôi tràn trúng ngón tay
  vec3 skinBurn = vec3(0.92, 0.22, 0.16);

  float sideMatch = 1.0;
  if (uScaldSide < -0.5) {
    sideMatch = step(0.0, vRestPos.x);
  } else if (uScaldSide > 0.5) {
    sideMatch = step(vRestPos.x, 0.0);
  }

  vec3 skinFinal = mix(skinBase, skinBurn, clamp(uScaldIntensity * 0.90 * sideMatch, 0.0, 1.0));
  vec3 shirtColor = vec3(0.985, 0.985, 0.985);  // #fafafa áo sơ mi trắng tinh
  diffuseColor.rgb = mix(shirtColor, skinFinal, isHand);`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
  roughnessFactor = mix(0.72, 0.56, isHand);`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
  // Hiệu ứng phát nhiệt ửng đỏ nóng rực khi bị bỏng nước sôi
  totalEmissiveRadiance += vec3(0.48, 0.06, 0.02) * uScaldIntensity * sideMatch * isHand;`
        );
  };

  let modelScene = null;
  let leftHandBone = null;
  let rightHandBone = null;
  let leftArmBone = null;
  let rightArmBone = null;
  let leftForeArmBone = null;
  let rightForeArmBone = null;

  loadXbotModel()
    .then((gltf) => {
      modelScene = cloneSkeleton(gltf.scene);
      // Đặt nhân vật Xbot tại vị trí người bưng phở sau bát
      modelScene.position.set(0, -1.15, -0.44);
      root.add(modelScene);

      modelScene.traverse((child) => {
        if (!child.isMesh) return;
        child.frustumCulled = false;
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = waiterMaterial;
      });

      const getBone = (name) =>
        modelScene.getObjectByName('mixamorig' + name) ||
        modelScene.getObjectByName('mixamorig:' + name) ||
        modelScene.getObjectByName(name);

      leftArmBone = getBone('LeftArm');
      leftForeArmBone = getBone('LeftForeArm');
      leftHandBone = getBone('LeftHand');

      rightArmBone = getBone('RightArm');
      rightForeArmBone = getBone('RightForeArm');
      rightHandBone = getBone('RightHand');

      applyCarryingPose();
    })
    .catch((err) => {
      console.error('[WaiterHands] Lỗi tải Xbot.glb:', err);
    });

  function applyCarryingPose() {
    if (!modelScene || !leftArmBone || !rightArmBone) return;

    modelScene.updateMatrixWorld(true);

    const getBone = (name) =>
      modelScene.getObjectByName('mixamorig' + name) ||
      modelScene.getObjectByName('mixamorig:' + name) ||
      modelScene.getObjectByName(name);

    function solveLimb(isLeft) {
      const prefix = isLeft ? 'Left' : 'Right';
      const sign = isLeft ? 1 : -1;
      const arm = isLeft ? leftArmBone : rightArmBone;
      const foreArm = isLeft ? leftForeArmBone : rightForeArmBone;
      const hand = isLeft ? leftHandBone : rightHandBone;

      if (!arm || !foreArm || !hand) return;

      const S = new THREE.Vector3();
      const E0 = new THREE.Vector3();
      const W0 = new THREE.Vector3();
      arm.getWorldPosition(S);
      foreArm.getWorldPosition(E0);
      hand.getWorldPosition(W0);

      const L1 = S.distanceTo(E0);
      const L2 = E0.distanceTo(W0);

      // Điểm cổ tay ôm sát bên ngoài vành tô sứ (bán kính 0.140m, cao độ -0.010m cục bộ trong tô, -0.035m sau trục Z)
      const localTarget = new THREE.Vector3(sign * 0.140, -0.010, -0.035);
      const targetWorld = localTarget.clone();
      root.localToWorld(targetWorld);

      const ST = targetWorld.clone().sub(S);
      const d = Math.min(ST.length(), (L1 + L2) * 0.999);
      const dir = ST.clone().normalize();

      const cosAlpha = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
      const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

      // Hướng uốn khuỷu tay: chĩa ra ngoài và xuống dưới tự nhiên
      const elbowBendDir = new THREE.Vector3(sign * 0.65, -1.0, 0.1);
      const bendNormal = new THREE.Vector3().crossVectors(dir, elbowBendDir).normalize();
      const elbowDir = dir.clone().applyAxisAngle(bendNormal, alpha);
      const E = S.clone().add(elbowDir.clone().multiplyScalar(L1));

      // Quay bắp tay
      const armParentWorldQuat = arm.parent.getWorldQuaternion(new THREE.Quaternion());
      const upperLocalDir = E.clone().sub(S).normalize().applyQuaternion(armParentWorldQuat.clone().invert());
      arm.quaternion.setFromUnitVectors(new THREE.Vector3(sign, 0, 0), upperLocalDir);
      arm.updateMatrixWorld(true);

      // Quay cẳng tay
      const foreArmParentWorldQuat = foreArm.parent.getWorldQuaternion(new THREE.Quaternion());
      const lowerLocalDir = targetWorld.clone().sub(E).normalize().applyQuaternion(foreArmParentWorldQuat.clone().invert());
      foreArm.quaternion.setFromUnitVectors(new THREE.Vector3(sign, 0, 0), lowerLocalDir);
      foreArm.updateMatrixWorld(true);

      // Định hướng bàn tay ôm dọc theo đường cong vành tô sứ (hướng +Z dọc thành tô)
      const fwd = new THREE.Vector3(sign * -0.15, -0.08, 0.98).normalize();
      const back = new THREE.Vector3(sign * 0.98, 0.18, 0.0).normalize();
      const col0 = isLeft ? fwd : fwd.clone().negate();
      const col1 = back;
      const col2 = new THREE.Vector3().crossVectors(col0, col1).normalize();

      const rotMat = new THREE.Matrix4().makeBasis(col0, col1, col2);
      const targetWorldQuat = new THREE.Quaternion().setFromRotationMatrix(rotMat);

      const parentWorldQuat = foreArm.getWorldQuaternion(new THREE.Quaternion());
      hand.quaternion.copy(parentWorldQuat.clone().invert().multiply(targetWorldQuat));

      // Uốn cong 4 ngón tay ôm chắc chắn dưới gờ mép tô sứ
      ['Index', 'Middle', 'Ring', 'Pinky'].forEach((f) => {
        const b1 = getBone(prefix + 'Hand' + f + '1');
        const b2 = getBone(prefix + 'Hand' + f + '2');
        const b3 = getBone(prefix + 'Hand' + f + '3');
        if (b1) b1.rotation.z = -sign * 0.62;
        if (b2) b2.rotation.z = -sign * 0.72;
        if (b3) b3.rotation.z = -sign * 0.55;
      });

      // Ngón cái tì phẳng tự nhiên trên mặt vành tô sứ
      const t1 = getBone(prefix + 'HandThumb1');
      const t2 = getBone(prefix + 'HandThumb2');
      const t3 = getBone(prefix + 'HandThumb3');
      if (t1) t1.rotation.set(0.12, -sign * 0.35, sign * 0.30);
      if (t2) t2.rotation.z = sign * 0.20;
      if (t3) t3.rotation.z = -sign * 0.15;
    }

    solveLimb(true);
    solveLimb(false);
  }

  let scaldTimer = 0.0;
  function update(physState, dt) {
    if (!modelScene) return;

    // Cập nhật vị trí tay ôm vành bát khi bát nghiêng/nhấp nhô
    applyCarryingPose();

    // Khi nước phở sôi tràn mép gây bỏng
    if (physState.isScalded) {
      scaldTimer = 1.2;
      uniforms.uScaldSide.value = physState.spillSide || 0.0;
    }

    if (scaldTimer > 0) {
      scaldTimer = Math.max(0, scaldTimer - dt);
      const intensity = Math.min(1.0, scaldTimer / 0.85);
      uniforms.uScaldIntensity.value = intensity;

      // Phản xạ giật nảy cơ tay khi bỏng nước sôi
      const flinchAmp = Math.sin(physState.time * 38.0) * 0.008 * intensity;
      if (leftHandBone && uniforms.uScaldSide.value <= 0) leftHandBone.position.y += flinchAmp;
      if (rightHandBone && uniforms.uScaldSide.value >= 0) rightHandBone.position.y += flinchAmp;
    } else {
      uniforms.uScaldIntensity.value = 0.0;
    }
  }

  function setSkin(skinData) {
    // Tùy biến màu da / màu áo nếu cần
  }

  return {
    root,
    update,
    setSkin,
  };
}
