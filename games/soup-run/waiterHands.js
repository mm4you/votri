/**
 * @file waiterHands.js
 * @description Mô hình Đôi Cánh Tay & Bàn Tay Người Phục Vụ Bưng Phở từ Model Xbot.glb:
 * 1. Sử dụng 100% Lưới SkinnedMesh và Khung Xương (Rig) thật từ Xbot.glb:
 *    - Toàn bộ cánh tay (vai, bắp tay, cẳng tay, cổ tay, bàn tay, 5 ngón tay) là một dải lưới liền mạch.
 *    - Tuyệt đối không ghép nối hình trụ, không có bất kỳ khe hở hay đứt đoạn nào.
 * 2. Tư thế bưng phở chuẩn xác trên mọi góc nhìn (Desktop & Mobile):
 *    - Hai bàn tay hạ vừa vặn bám chắc hai bên thân tô sứ (không bị giơ quá cao lên trời).
 *    - Ngón cái tì phẳng xuôi tự nhiên dọc theo mặt phẳng vành tô sứ (không chỉa thẳng đứng).
 *    - 4 ngón tay uốn cong đỡ vững vàng dưới đáy gờ mép bát.
 *    - Cánh tay áo sơ mi trắng muốt nối dài liền mạch từ cổ tay xuyên suốt ra ngoài hai góc màn hình.
 * 3. Phản ứng bỏng nước sôi chuẩn hướng (Scald Heat Glow):
 *    - Tô nghiêng bên nào (trái/phải), nước sôi tràn đúng bên đó thì chính xác bàn tay bên đó ửng đỏ và giật nảy cơ.
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

  // Khớp chính xác bên bị bỏng:
  // uScaldSide < 0: Nghiêng trái -> Bỏng tay trái màn hình (Xbot RightArm: vRestPos.x < 0)
  // uScaldSide > 0: Nghiêng phải -> Bỏng tay phải màn hình (Xbot LeftArm: vRestPos.x > 0)
  float sideMatch = 1.0;
  if (uScaldSide < -0.5) {
    sideMatch = step(vRestPos.x, 0.0);
  } else if (uScaldSide > 0.5) {
    sideMatch = step(0.0, vRestPos.x);
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

  // Hướng xoay bàn tay chuẩn ôm sát vành tô và hạ thấp ngón cái phẳng theo mép bát:
  // Tay trái (bên phải góc nhìn):
  const leftFwd = new THREE.Vector3(-0.25, 0.08, 0.96).normalize();
  const leftBack = new THREE.Vector3(0.96, 0.15, 0.20).normalize();
  const leftThumb = new THREE.Vector3().crossVectors(leftFwd, leftBack).normalize();
  const leftGripQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(leftFwd, leftBack, leftThumb));

  // Tay phải (bên trái góc nhìn):
  const rightFwd = new THREE.Vector3(0.25, -0.08, -0.96).normalize();
  const rightBack = new THREE.Vector3(-0.96, 0.15, -0.20).normalize();
  const rightThumb = new THREE.Vector3().crossVectors(rightFwd, rightBack).normalize();
  const rightGripQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(rightFwd, rightBack, rightThumb));

  loadXbotModel()
    .then((gltf) => {
      modelScene = cloneSkeleton(gltf.scene);
      // Gắn nhân vật Xbot đứng thẳng ở vị trí người phục vụ (vai ở y=1.438, z=-0.05)
      modelScene.position.set(0, 0, 0);
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
    })
    .catch((err) => {
      console.error('[WaiterHands] Lỗi tải Xbot.glb:', err);
    });

  function applyCarryingPose(bowlMeshRoot) {
    if (!modelScene || !leftArmBone || !rightArmBone || !bowlMeshRoot) return;

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
      const gripQuat = isLeft ? leftGripQuat : rightGripQuat;

      if (!arm || !foreArm || !hand) return;

      const S = new THREE.Vector3();
      const E0 = new THREE.Vector3();
      const W0 = new THREE.Vector3();
      arm.getWorldPosition(S);
      foreArm.getWorldPosition(E0);
      hand.getWorldPosition(W0);

      const L1 = S.distanceTo(E0);
      const L2 = E0.distanceTo(W0);

      // Điểm cổ tay hạ thấp vừa vặn ôm thân ngoài vành bát sứ:
      // x = sign * 0.126m, y = 0.015m, z = -0.020m (không còn bị nhô cao quá miệng bát)
      const localTargetInBowl = new THREE.Vector3(sign * 0.126, 0.015, -0.020);
      const targetWorld = localTargetInBowl.clone();
      bowlMeshRoot.localToWorld(targetWorld);

      const ST = targetWorld.clone().sub(S);
      const d = Math.min(ST.length(), (L1 + L2) * 0.999);
      const dir = ST.clone().normalize();

      const cosAlpha = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
      const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

      // Hướng uốn khuỷu tay: chĩa ra ngoài và chếch xuống tự nhiên
      const elbowBendDir = new THREE.Vector3(sign * 0.70, -0.85, 0.20).normalize();
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

      // Khóa hướng bàn tay theo vành tô phở (tay nghiêng và lắc chính xác cùng góc nghiêng của tô)
      const bowlWorldQuat = bowlMeshRoot.getWorldQuaternion(new THREE.Quaternion());
      const targetHandWorldQuat = bowlWorldQuat.clone().multiply(gripQuat);
      const parentHandQuat = foreArm.getWorldQuaternion(new THREE.Quaternion());
      hand.quaternion.copy(parentHandQuat.clone().invert().multiply(targetHandWorldQuat));

      // 4 ngón tay uốn cong ôm gọn dưới gờ mép tô sứ
      ['Index', 'Middle', 'Ring', 'Pinky'].forEach((f) => {
        const b1 = getBone(prefix + 'Hand' + f + '1');
        const b2 = getBone(prefix + 'Hand' + f + '2');
        const b3 = getBone(prefix + 'Hand' + f + '3');
        if (b1) b1.rotation.z = -sign * 0.70;
        if (b2) b2.rotation.z = -sign * 0.80;
        if (b3) b3.rotation.z = -sign * 0.60;
      });

      // Ngón cái tì phẳng xuôi tự nhiên theo mặt vành miệng tô (không chỉa thẳng đứng)
      const t1 = getBone(prefix + 'HandThumb1');
      const t2 = getBone(prefix + 'HandThumb2');
      const t3 = getBone(prefix + 'HandThumb3');
      if (t1) t1.rotation.set(-0.25, -sign * 0.40, sign * 0.15);
      if (t2) t2.rotation.z = sign * 0.15;
      if (t3) t3.rotation.z = -sign * 0.10;
    }

    solveLimb(true);
    solveLimb(false);
  }

  let scaldTimer = 0.0;
  function update(physState, dt, bowlMeshRoot) {
    if (!modelScene) return;

    // Cập nhật vị trí tay ôm vành bát đồng bộ với chuyển động và độ nghiêng của bát
    applyCarryingPose(bowlMeshRoot);

    // Khi nước phở sôi tràn mép gây bỏng
    if (physState.isScalded) {
      scaldTimer = 1.2;
      uniforms.uScaldSide.value = physState.spillSide || 0.0;
    }

    if (scaldTimer > 0) {
      scaldTimer = Math.max(0, scaldTimer - dt);
      const intensity = Math.min(1.0, scaldTimer / 0.85);
      uniforms.uScaldIntensity.value = intensity;

      // Phản xạ giật nảy cơ tay khi bỏng nước sôi đúng bên bị tràn:
      // uScaldSide < 0: Bỏng tay trái màn hình (rightHandBone)
      // uScaldSide > 0: Bỏng tay phải màn hình (leftHandBone)
      const flinchAmp = Math.sin(physState.time * 38.0) * 0.008 * intensity;
      if (rightHandBone && uniforms.uScaldSide.value < 0) rightHandBone.position.y += flinchAmp;
      if (leftHandBone && uniforms.uScaldSide.value > 0) leftHandBone.position.y += flinchAmp;
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
