/**
 * @file waiterModel.js
 * @description Mô hình 3D Người Phục Vụ Quán Phở:
 * - Góc Bưng Bát (First-Person): Đặt tô phở và đôi tay áo sơ mi bưng bát tại tọa độ vàng (Y=1.17m, Z=+0.44m) nhìn thẳng vào mặt nước dùng óng ả.
 * - Góc Sau Lưng (Chase View): Hiển thị đầy đủ toàn thân người phục vụ (áo sơ mi, tạp dề xanh navy, đầu tóc ngộ nghĩnh, chân bước đi).
 */

import * as THREE from '../../shared/vendor/three.module.js';
import { createPhoBowlModel } from './phoModel.js';

export function createWaiterCharacter({ skin = {} } = {}) {
  const root = new THREE.Group();
  root.name = 'waiter-character-root';

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xdeb887,
    roughness: 0.55,
    metalness: 0.02,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.75,
    metalness: 0.0,
  });
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    roughness: 0.65,
    metalness: 0.02,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.4,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.85,
  });

  // 1. CỤM THÂN TRÊN
  const upperBody = new THREE.Group();
  upperBody.position.y = 0.95;
  root.add(upperBody);

  const torsoGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.48, 16);
  torsoGeo.scale(1.2, 1.0, 0.85);
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.position.y = 0.24;
  torso.castShadow = true;
  upperBody.add(torso);

  const apronGeo = new THREE.CylinderGeometry(0.185, 0.17, 0.38, 16, 1, false, 0, Math.PI * 1.4);
  apronGeo.scale(1.22, 1.0, 0.88);
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.position.y = 0.18;
  apron.rotation.y = -Math.PI * 0.7;
  upperBody.add(apron);

  // 2. ĐẦU & KHUÔN MẶT
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.58, 0.02);
  upperBody.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 20, 18), skinMat);
  headGroup.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.152, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
    hairMat
  );
  hair.position.y = 0.02;
  headGroup.add(hair);

  const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const eyeGeo = new THREE.SphereGeometry(0.03, 12, 10);
  const pupilGeo = new THREE.SphereGeometry(0.016, 10, 8);

  const eyeL = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  eyeL.position.set(-0.055, 0.02, 0.128);
  const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
  pupilL.position.set(0, -0.01, 0.02);
  eyeL.add(pupilL);

  const eyeR = new THREE.Mesh(eyeGeo, eyeWhiteMat);
  eyeR.position.set(0.055, 0.02, 0.128);
  const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
  pupilR.position.set(0, -0.01, 0.02);
  eyeR.add(pupilR);
  headGroup.add(eyeL, eyeR);

  // 3. ĐÔI CHÂN BƯỚC ĐI
  const legL = new THREE.Group();
  legL.position.set(-0.11, 0.95, 0.0);
  root.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.11, 0.95, 0.0);
  root.add(legR);

  const thighGeo = new THREE.CylinderGeometry(0.06, 0.052, 0.48, 12);
  const shinGeo = new THREE.CylinderGeometry(0.052, 0.044, 0.48, 12);
  const shoeGeo = new THREE.BoxGeometry(0.09, 0.07, 0.18);

  const thighL = new THREE.Mesh(thighGeo, pantsMat);
  thighL.position.y = -0.24;
  legL.add(thighL);
  const shinL = new THREE.Mesh(shinGeo, pantsMat);
  shinL.position.y = -0.68;
  legL.add(shinL);
  const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
  shoeL.position.set(0, -0.92, 0.04);
  legL.add(shoeL);

  const thighR = new THREE.Mesh(thighGeo, pantsMat);
  thighR.position.y = -0.24;
  legR.add(thighR);
  const shinR = new THREE.Mesh(shinGeo, pantsMat);
  shinR.position.y = -0.68;
  legR.add(shinR);
  const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
  shoeR.position.set(0, -0.92, 0.04);
  legR.add(shoeR);

  // 4. CỤM TÔ PHỞ MIỀN NAM CHUẨN
  const phoBowl = createPhoBowlModel({ skin });
  const bowlHolder = new THREE.Group();
  bowlHolder.name = 'pho-bowl-holder';
  bowlHolder.position.set(0, 0.22, 0.44);
  bowlHolder.add(phoBowl.root);
  upperBody.add(bowlHolder);

  function setCameraMode(mode) {
    const isFirstPerson = mode === 'firstPerson';
    headGroup.visible = !isFirstPerson;
    torso.visible = !isFirstPerson;
    apron.visible = !isFirstPerson;
    legL.visible = !isFirstPerson;
    legR.visible = !isFirstPerson;

    bowlHolder.visible = true;
    phoBowl.root.visible = true;
  }

  function update(physState, dt) {
    phoBowl.update(physState, dt);

    const strideFreq = physState.isTiptoeing ? 3.5 : 2.5;
    const gaitPhase = physState.time * strideFreq * Math.PI * 2;
    const isMoving = physState.forwardSpeed > 0.1 && physState.status === 'running';

    if (isMoving) {
      if (physState.isTiptoeing) {
        legL.rotation.x = Math.sin(gaitPhase) * 0.35;
        legR.rotation.x = -Math.sin(gaitPhase) * 0.35;
        legL.position.y = 0.95 + Math.max(0, Math.sin(gaitPhase)) * 0.08;
        legR.position.y = 0.95 + Math.max(0, -Math.sin(gaitPhase)) * 0.08;
      } else {
        const legAmp = 0.48;
        legL.rotation.x = Math.sin(gaitPhase) * legAmp;
        legR.rotation.x = -Math.sin(gaitPhase) * legAmp;
        legL.position.y = 0.95;
        legR.position.y = 0.95;
      }

      upperBody.position.y = 0.95 + Math.abs(Math.sin(gaitPhase)) * 0.03;
      upperBody.rotation.z = Math.sin(gaitPhase) * 0.035 - physState.tiltRoll * 0.55;
    } else {
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      upperBody.position.y = 0.95;
      upperBody.rotation.z = -physState.tiltRoll * 0.55;
    }
  }

  function setSkin(skinData) {
    phoBowl.setSkin(skinData);
  }

  return {
    root,
    upperBody,
    bowlHolder,
    phoBowl,
    setCameraMode,
    update,
    setSkin,
  };
}
