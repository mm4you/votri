/**
 * @file swimmerModel.js
 * @description Dựng Vận Động Viên Bơi Lội 3D (Nam Mặc Quần Bơi Đùi / Nữ Mặc Đồ Bơi Liền Mảnh):
 * 1. Khớp nối mịn: chỉ làm mịn Pháp Tuyến (Normals) tại các điểm tiếp giáp giữa Beta_Surface và
 *    Beta_Joints (bán kính nhỏ, cùng hướng mặt) - KHÔNG dịch chuyển đỉnh nên hình dáng luôn đúng.
 * 2. Trang phục vẽ theo từng pixel trên chính lưới cơ thể (một SkinnedMesh duy nhất, một Material duy nhất):
 *    Quần bơi / đồ bơi, mũ bơi và kính bơi đều được tính trong Fragment Shader từ tọa độ Rest-Pose,
 *    nên không có lưới phụ nào gắn vào xương có thể bị phóng to sai tỉ lệ.
 */

import * as THREE from '../../shared/vendor/three.module.js';
import { GLTFLoader } from '../../shared/vendor/GLTFLoader.js';
import { clone as cloneSkeleton } from '../../shared/vendor/SkeletonUtils.js';
import { LIMBS, SKINS } from './config.js?v=16';

const gltfLoader = new GLTFLoader();
let cachedProcessedGltfPromise = null;

/**
 * Làm mịn pháp tuyến giữa các mảnh lưới (chỉ normal, không đổi vị trí).
 * Mỗi đỉnh lấy trung bình pháp tuyến của các đỉnh lân cận trong bán kính ~1.4cm có hướng tương đồng,
 * giúp ánh sáng trượt liền mạch qua vai, khuỷu tay, hông, đầu gối.
 */
function smoothJointNormals(gltfScene) {
  const meshes = [];
  gltfScene.traverse((c) => {
    if (c.isMesh && c.geometry && c.geometry.attributes.normal) meshes.push(c);
  });

  const CELL = 0.024;
  const R2 = CELL * CELL;
  const grid = new Map();
  const samples = [];

  for (const m of meshes) {
    const pos = m.geometry.attributes.position;
    const norm = m.geometry.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const s = [pos.getX(i), pos.getY(i), pos.getZ(i), norm.getX(i), norm.getY(i), norm.getZ(i)];
      const key = `${Math.floor(s[0] / CELL)},${Math.floor(s[1] / CELL)},${Math.floor(s[2] / CELL)}`;
      let list = grid.get(key);
      if (!list) {
        list = [];
        grid.set(key, list);
      }
      list.push(samples.length);
      samples.push(s);
    }
  }

  let idx = 0;
  const out = new Float32Array(samples.length * 3);
  for (const s of samples) {
    const gx = Math.floor(s[0] / CELL);
    const gy = Math.floor(s[1] / CELL);
    const gz = Math.floor(s[2] / CELL);
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const list = grid.get(`${gx + dx},${gy + dy},${gz + dz}`);
          if (!list) continue;
          for (const j of list) {
            const o = samples[j];
            const ddx = o[0] - s[0];
            const ddy = o[1] - s[1];
            const ddz = o[2] - s[2];
            const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
            if (d2 > R2) continue;
            const dot = o[3] * s[3] + o[4] * s[4] + o[5] * s[5];
            if (dot < 0.35) continue;
            const w = (1 - d2 / R2) * dot;
            nx += o[3] * w;
            ny += o[4] * w;
            nz += o[5] * w;
          }
        }
      }
    }
    const len = Math.hypot(nx, ny, nz);
    if (len > 1e-6) {
      out[idx * 3] = nx / len;
      out[idx * 3 + 1] = ny / len;
      out[idx * 3 + 2] = nz / len;
    } else {
      out[idx * 3] = s[3];
      out[idx * 3 + 1] = s[4];
      out[idx * 3 + 2] = s[5];
    }
    idx++;
  }

  idx = 0;
  for (const m of meshes) {
    const norm = m.geometry.attributes.normal;
    for (let i = 0; i < norm.count; i++) {
      norm.setXYZ(i, out[idx * 3], out[idx * 3 + 1], out[idx * 3 + 2]);
      idx++;
    }
    norm.needsUpdate = true;
  }
}

/**
 * Lấp khe eo: khối bụng (thuộc Beta_Joints) của Xbot hẹp hơn ngực và hông nên trông như khớp nối đồ chơi.
 * Nới rộng khối bụng theo từng lát cắt ngang để thân người liền một dải từ hông lên ngực.
 */
function fillWaistGap(gltfScene) {
  let joints = null;
  gltfScene.traverse((c) => {
    if (c.isMesh && c.name.includes('Joints')) joints = c;
  });
  if (!joints) return;
  const pos = joints.geometry.attributes.position;
  const Y0 = 1.085;
  const Y1 = 1.38;
  const BIN = 0.01;
  const nBins = Math.ceil((Y1 - Y0) / BIN) + 1;
  const xMax = new Float32Array(nBins);
  const zMax = new Float32Array(nBins);
  const zMin = new Float32Array(nBins);
  const inRegion = (x, y) => y > Y0 && y < Y1 && Math.abs(x) < 0.2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (!inRegion(x, y)) continue;
    const b = Math.floor((y - Y0) / BIN);
    xMax[b] = Math.max(xMax[b], Math.abs(x));
    zMax[b] = Math.max(zMax[b], z);
    zMin[b] = Math.min(zMin[b], z);
  }

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (!inRegion(x, y)) continue;
    const b = Math.floor((y - Y0) / BIN);
    const t = (y - Y0) / (Y1 - Y0);
    // Mức nới giảm dần về hai đầu để nối êm với hông và ngực
    const edge = Math.min(1, Math.sin(Math.PI * t) * 2.6);
    const targetX = THREE.MathUtils.lerp(0.13, 0.125, t);
    const targetZF = THREE.MathUtils.lerp(0.112, 0.118, t);
    const targetZB = THREE.MathUtils.lerp(-0.112, -0.095, t);
    const sx = xMax[b] > 0.01 ? Math.max(1, targetX / xMax[b]) : 1;
    const sz = z >= 0
      ? (zMax[b] > 0.01 ? Math.max(1, targetZF / zMax[b]) : 1)
      : (zMin[b] < -0.01 ? Math.max(1, targetZB / zMin[b]) : 1);
    const kx = 1 + (sx - 1) * edge;
    const kz = 1 + (sz - 1) * edge;
    pos.setXYZ(i, x * kx, y, z * kz);
  }
  pos.needsUpdate = true;
  joints.geometry.computeBoundingSphere();
}

function loadSwimmerGlb() {
  if (!cachedProcessedGltfPromise) {
    cachedProcessedGltfPromise = gltfLoader
      .loadAsync('../../shared/vendor/Xbot.glb')
      .then((gltf) => {
        fillWaistGap(gltf.scene);
        smoothJointNormals(gltf.scene);
        return gltf;
      });
  }
  return cachedProcessedGltfPromise;
}

/**
 * Material duy nhất cho toàn bộ cơ thể: da + trang phục + mũ bơi + kính bơi, tính theo từng pixel.
 * Tọa độ Rest-Pose của Xbot: đơn vị mét, trục Y hướng lên (0 -> 1.81), mặt hướng +Z, tư thế chữ T.
 */
function createSwimmerMaterial(skinCfg, isGhost) {
  const isFemale = skinCfg.gender === 'female';
  const mat = new THREE.MeshStandardMaterial({
    color: skinCfg.skinColor,
    roughness: 0.62,
    metalness: 0.0,
    transparent: isGhost,
    opacity: isGhost ? 0.28 : 1.0,
    depthWrite: !isGhost,
  });

  const uniforms = {
    uSuitColor: { value: new THREE.Color(skinCfg.suitColor) },
    uStripeColor: { value: new THREE.Color(skinCfg.stripeColor) },
    uCapColor: { value: new THREE.Color(skinCfg.capColor) },
    uLensColor: { value: new THREE.Color(skinCfg.goggleLens) },
    uIsFemale: { value: isFemale ? 1.0 : 0.0 },
  };

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader =
      'varying vec3 vRestPos;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvRestPos = position;'
      );

    shader.fragmentShader =
      `uniform vec3 uSuitColor;
uniform vec3 uStripeColor;
uniform vec3 uCapColor;
uniform vec3 uLensColor;
uniform float uIsFemale;
varying vec3 vRestPos;
float bandStep(float edge, float v, float w) { return smoothstep(edge - w, edge + w, v); }
` +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  float rx = vRestPos.x;
  float ry = vRestPos.y;
  float rz = vRestPos.z;
  float ax = abs(rx);
  const float AA = 0.0025;

  // Chỉ phần thân (loại trừ cánh tay đang dang ngang trong tư thế chữ T)
  float torsoW = mix(0.215, 0.168, bandStep(1.3, ry, AA));
  float torsoMask = 1.0 - bandStep(torsoW, ax, AA);

  float suitMask = 0.0;
  float trimMask = 0.0;

  if (uIsFemale > 0.5) {
    // Đồ bơi liền mảnh: ống chân xẻ cao hai bên hông, cổ tròn phía trước, khoét chữ U sau lưng
    float legCut = 0.885 + 0.075 * smoothstep(0.04, 0.15, ax) - 0.02 * step(rz, 0.0);
    float frontTop = 1.385 + 0.55 * ax * ax * 10.0;
    float backTop = 1.235 + 1.7 * ax;
    float topCut = mix(backTop, frontTop, smoothstep(-0.03, 0.03, rz));
    topCut = min(topCut, 1.47);
    suitMask = bandStep(legCut, ry, AA) * (1.0 - bandStep(topCut, ry, AA)) * torsoMask;
    float edgeDist = min(abs(ry - legCut), abs(ry - topCut));
    trimMask = (1.0 - smoothstep(0.008, 0.008 + AA * 2.0, edgeDist));
    float side = bandStep(0.125, ax, AA) * (1.0 - bandStep(0.142, ax, AA));
    trimMask = max(trimMask, side * step(rz, 0.06) * step(-0.06, rz));
  } else {
    // Quần bơi đùi nam (jammer): cạp ngang hông, ống trên đầu gối, sọc dọc hai bên
    float waistY = 1.1 - 0.012 * smoothstep(0.0, 0.1, rz);
    float hemY = 0.66;
    suitMask = bandStep(hemY, ry, AA) * (1.0 - bandStep(waistY, ry, AA)) * torsoMask;
    float waistband = bandStep(waistY - 0.022, ry, AA);
    float side = bandStep(0.128, ax, AA) * (1.0 - bandStep(0.146, ax, AA));
    side *= step(-0.07, rz) * step(rz, 0.07);
    trimMask = max(waistband, side);
  }

  vec3 suitCol = mix(uSuitColor, uStripeColor, clamp(trimMask, 0.0, 1.0));
  diffuseColor.rgb = mix(diffuseColor.rgb, suitCol, suitMask);

  // Mũ bơi: ôm sọ, viền thấp dần từ trán ra sau gáy
  float headMask = bandStep(1.53, ry, AA) * (1.0 - bandStep(0.11, ax, AA));
  float capLine = 1.668 + 0.32 * rz;
  float capMask = bandStep(capLine, ry, AA) * headMask;
  diffuseColor.rgb = mix(diffuseColor.rgb, uCapColor, capMask);

  // Kính bơi: hai mắt kính bầu dục, cầu nối và dây đeo vòng quanh đầu
  float front = smoothstep(0.06, 0.08, rz);
  float lensD = length(vec2((ax - 0.034) / 0.022, (ry - 1.676) / 0.012));
  float lensMask = (1.0 - smoothstep(0.9, 1.0, lensD)) * front * headMask;
  float rimMask = (1.0 - smoothstep(1.15, 1.25, lensD)) * front * headMask;
  float strapMask = (1.0 - bandStep(0.0065, abs(ry - 1.679), AA)) * headMask
    * max(step(0.058, ax), 1.0 - front);
  float bridgeMask = (1.0 - bandStep(0.012, ax, AA)) * (1.0 - bandStep(0.003, abs(ry - 1.679), AA)) * front * headMask;
  float darkMask = clamp(max(max(rimMask, strapMask), bridgeMask), 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.07, 0.09), darkMask);
  diffuseColor.rgb = mix(diffuseColor.rgb, uLensColor, lensMask);

  float fabricMask = max(suitMask, capMask);
  float skinMask = (1.0 - fabricMask) * (1.0 - max(darkMask, lensMask));
  float glossMask = lensMask;`
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
  roughnessFactor = mix(roughnessFactor, 0.32, fabricMask);
  roughnessFactor = mix(roughnessFactor, 0.08, glossMask);`)
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
  // Tán xạ nhẹ dưới da giúp bề mặt mềm mại, bớt cảm giác nhựa cứng
  totalEmissiveRadiance += diffuseColor.rgb * vec3(0.16, 0.07, 0.05) * skinMask;`
        );
  };
  mat.customProgramCacheKey = () => `swimmer-${isFemale ? 'f' : 'm'}`;
  return mat;
}

function createKeyBadgeSprite(keyText, bgHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.fillStyle = bgHex;
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 64px ui-monospace, system-ui, sans-serif';
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
  sprite.scale.set(0.18, 0.18, 1);
  sprite.renderOrder = 25;
  return sprite;
}

export function createSwimmerModel({ skinId = 'male', isGhost = false, showBadges = true } = {}) {
  const skinCfg = SKINS.find((s) => s.id === skinId) || SKINS[0];
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';

  const bodyAlign = new THREE.Group();
  const setBasisForStyle = (isBackstroke) => {
    const basisMat = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 0, isBackstroke ? 1 : -1),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, isBackstroke ? 1 : -1, 0)
    );
    bodyAlign.quaternion.setFromRotationMatrix(basisMat);
  };
  setBasisForStyle(false);
  bodyAlign.position.set(-0.78, 0.03, 0);
  root.add(bodyAlign);

  const rig = {
    ready: false,
    limbs: null,
    spineBones: [],
    headBone: null,
  };

  loadSwimmerGlb()
    .then((gltf) => {
      const modelScene = cloneSkeleton(gltf.scene);
      if (skinCfg.gender === 'female') {
        modelScene.scale.set(0.74, 0.75, 0.74);
      } else {
        modelScene.scale.set(0.79, 0.78, 0.79);
      }
      bodyAlign.add(modelScene);

      const bodyMat = createSwimmerMaterial(skinCfg, isGhost);
      modelScene.traverse((child) => {
        if (!child.isMesh) return;
        child.frustumCulled = false;
        child.material = bodyMat;
      });

      root.updateMatrixWorld(true);
      const modelWorldScale = modelScene.getWorldScale(new THREE.Vector3()).x || 1;

      const getBone = (name) =>
        modelScene.getObjectByName(`mixamorig${name}`) ||
        modelScene.getObjectByName(`mixamorig:${name}`) ||
        modelScene.getObjectByName(`mixamorig_${name}`) ||
        modelScene.getObjectByName(name);

      const limbBoneNames = [
        ['LeftArm', 'LeftForeArm', 'LeftHand'],
        ['RightArm', 'RightForeArm', 'RightHand'],
        ['LeftUpLeg', 'LeftLeg', 'LeftFoot'],
        ['RightUpLeg', 'RightLeg', 'RightFoot'],
      ];

      const worldScaleVec = new THREE.Vector3();

      rig.limbs = limbBoneNames.map(([b0Name, b1Name, b2Name], idx) => {
        const cfg = LIMBS[idx];
        const bones = [b0Name, b1Name, b2Name].map(getBone);
        const restQuats = bones.map((b) => (b ? b.quaternion.clone() : new THREE.Quaternion()));

        const bandColor = new THREE.Color(cfg.color);
        const bandMat = new THREE.MeshStandardMaterial({
          color: bandColor,
          roughness: 0.35,
          emissive: bandColor,
          emissiveIntensity: isGhost ? 0.1 : 0.4,
          transparent: isGhost,
          opacity: isGhost ? 0.3 : 1.0,
        });

        if (bones[1] && bones[2]) {
          // Quy đổi tỉ lệ: kích thước mong muốn tính theo hệ mét của modelScene
          const boneScale = bones[1].getWorldScale(worldScaleVec).x || 1;
          const invScale = THREE.MathUtils.clamp(modelWorldScale / boneScale, 0.5, 400);

          const bandMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.036, 0.036, 0.04, 20, 1, false),
            bandMat
          );
          bandMesh.scale.setScalar(invScale);
          bandMesh.position.copy(bones[2].position).multiplyScalar(0.8);
          bones[1].add(bandMesh);

          if (!isGhost && showBadges) {
            const badge = createKeyBadgeSprite(cfg.keyLabel, cfg.color);
            badge.scale.setScalar(0.16 * invScale);
            badge.position.copy(bones[2].position).multiplyScalar(0.8);
            bones[1].add(badge);
          }
        }

        return {
          cfg,
          bones,
          rest: restQuats,
          bandMat,
        };
      });

      rig.spineBones = ['Spine', 'Spine1', 'Spine2']
        .map(getBone)
        .filter(Boolean)
        .map((b) => ({ bone: b, rest: b.quaternion.clone() }));

      const headB = getBone('Head');
      if (headB) {
        rig.headBone = { bone: headB, rest: headB.quaternion.clone() };
      }

      rig.ready = true;
    })
    .catch((err) => {
      console.error('[SwimmerModel] Lỗi tải model GLB:', err);
    });

  const qRot = new THREE.Quaternion();
  const qParentWorld = new THREE.Quaternion();
  const qRootWorld = new THREE.Quaternion();
  const localAxis = new THREE.Vector3();

  function applyBoneRotation(bone, restQuat, rotations) {
    if (!bone || !bone.parent) return;
    bone.quaternion.copy(restQuat);
    bone.parent.updateWorldMatrix(true, false);
    bone.parent.getWorldQuaternion(qParentWorld).invert();
    root.getWorldQuaternion(qRootWorld);

    for (const [axisVec, angle] of rotations) {
      if (Math.abs(angle) < 0.0001) continue;
      localAxis.copy(axisVec).applyQuaternion(qRootWorld).applyQuaternion(qParentWorld);
      qRot.setFromAxisAngle(localAxis, angle);
      bone.quaternion.premultiply(qRot);
    }
  }

  const AXIS_X = new THREE.Vector3(1, 0, 0);
  const AXIS_Y = new THREE.Vector3(0, 1, 0);
  const AXIS_Z = new THREE.Vector3(0, 0, 1);

  function updatePose(physState, pressedFlags, timeSec, failPose = null) {
    if (!rig.ready || !rig.limbs) return;

    const limbsData = failPose ? failPose.limbs : physState.limbs;
    const styleId = physState.styleId || 'freestyle';

    setBasisForStyle(styleId === 'backstroke');

    const avgArmA = (limbsData[0].a + limbsData[1].a) * 0.5;
    const spineArch = styleId === 'butterfly'
      ? Math.sin(avgArmA * 2.5) * 0.15
      : (styleId === 'doggy' ? 0.12 : 0.04);

    for (const sp of rig.spineBones) {
      applyBoneRotation(sp.bone, sp.rest, [[AXIS_Z, spineArch]]);
    }

    if (rig.headBone) {
      const headUp = styleId === 'doggy'
        ? 0.52
        : (physState.isBreathing ? 0.38 : 0.12);
      const headBob = failPose ? Math.sin(timeSec * 16) * 0.38 : headUp;
      applyBoneRotation(rig.headBone.bone, rig.headBone.rest, [
        [AXIS_Z, headBob],
        [AXIS_X, -physState.roll * 0.35],
      ]);
    }

    for (let i = 0; i < 4; i++) {
      const lRig = rig.limbs[i];
      const lState = limbsData[i];
      const isPressed = !!(pressedFlags && pressedFlags[i]);
      const side = lRig.cfg.z < 0 ? -1 : 1;

      if (lRig.cfg.front) {
        let reachForwardY = side * (0.95 + lState.a * 0.65);
        let sweepUpDownZ = -0.32 + lState.lift * 0.78 + lState.a * 0.52;
        let elbowBendY = side * (0.25 + lState.lift * 0.82);

        if (styleId === 'breaststroke') {
          reachForwardY = side * (0.42 + lState.a * 0.95);
          sweepUpDownZ = -0.22 + lState.lift * 0.36;
          elbowBendY = side * (0.4 + (1 - lState.lift) * 0.62);
        } else if (styleId === 'doggy') {
          reachForwardY = side * 1.15;
          sweepUpDownZ = -0.52 + lState.a * 0.72 + lState.lift * 0.45;
          elbowBendY = side * (0.75 + lState.lift * 0.48);
        }

        applyBoneRotation(lRig.bones[0], lRig.rest[0], [
          [AXIS_Y, reachForwardY],
          [AXIS_Z, sweepUpDownZ],
        ]);
        applyBoneRotation(lRig.bones[1], lRig.rest[1], [
          [AXIS_Y, elbowBendY],
        ]);
      } else {
        let hipKickZ = -lState.a * 0.92 + (lState.lift - 0.3) * 0.35;
        let legSpreadY = side * 0.05;
        let kneeBendZ = -lState.lift * 0.92 - Math.max(0, lState.a) * 0.35;

        if (styleId === 'breaststroke') {
          legSpreadY = side * (0.14 + lState.lift * 0.52);
          kneeBendZ = -lState.lift * 1.32;
        }

        applyBoneRotation(lRig.bones[0], lRig.rest[0], [
          [AXIS_Y, legSpreadY],
          [AXIS_Z, hipKickZ],
        ]);
        applyBoneRotation(lRig.bones[1], lRig.rest[1], [
          [AXIS_Z, kneeBendZ],
        ]);
      }

      if (!isGhost && lRig.bandMat) {
        lRig.bandMat.emissiveIntensity = isPressed ? 1.2 : 0.35;
      }
    }
  }

  return {
    root,
    updatePose,
  };
}
