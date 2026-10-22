/**
 * @file waiterModel.js
 * @description Mô hình Người Phục Vụ Bưng Phở Góc Nhìn Thứ Nhất (First-Person Waiter Rig):
 * - Đôi cánh tay người phục vụ bằng lưới SkinnedMesh Xbot gắn liền vào tư thế người bưng.
 * - Khung đỡ tô phở nhấp nhô và nghiêng tự nhiên theo bước chân người đi.
 * - Hai bàn tay tự động bám chặt hai bên vành tô phở trên mọi độ nghiêng.
 */

import * as THREE from '../../shared/vendor/three.module.js';
import { createPhoBowlModel } from './phoModel.js?v=75';
import { createWaiterHands } from './waiterHands.js?v=75';

export function createWaiterCharacter({ skin = {} } = {}) {
  const root = new THREE.Group();
  root.name = 'waiter-character-root';

  // Khung đỡ tô phở
  const bowlHolder = new THREE.Group();
  bowlHolder.name = 'pho-bowl-holder';
  bowlHolder.position.set(0, 1.15, 0.44);
  root.add(bowlHolder);

  const phoBowl = createPhoBowlModel({ skin });
  bowlHolder.add(phoBowl.root);

  // Đôi cánh tay Xbot gắn vào thân người phục vụ
  const waiterHands = createWaiterHands({ skin });
  root.add(waiterHands.root);

  function setCameraMode(mode) {
    bowlHolder.visible = true;
    phoBowl.root.visible = true;
    waiterHands.root.visible = true;
  }

  function update(physState, dt) {
    phoBowl.update(physState, dt);
    waiterHands.update(physState, dt, phoBowl.root);

    const strideFreq = physState.isTiptoeing ? 3.5 : 2.5;
    const gaitPhase = physState.time * strideFreq * Math.PI * 2;
    const isMoving = physState.forwardSpeed > 0.1 && physState.status === 'running';

    if (isMoving) {
      // Nhấp nhô nhịp bước chân người bưng phở (Gait bounce & sway)
      const bounceAmp = physState.isTiptoeing ? 0.003 : 0.007;
      const swayAmp = physState.isTiptoeing ? 0.004 : 0.010;

      bowlHolder.position.y = 1.15 + Math.abs(Math.sin(gaitPhase)) * bounceAmp;
      bowlHolder.rotation.z = Math.sin(gaitPhase) * swayAmp;
    } else {
      // Nhịp thở nhẹ nhàng khi đứng yên
      bowlHolder.position.y = 1.15 + Math.sin(physState.time * 2.0) * 0.002;
      bowlHolder.rotation.z = 0;
    }
  }

  function setSkin(skinData) {
    phoBowl.setSkin(skinData);
    waiterHands.setSkin(skinData);
  }

  return {
    root,
    bowlHolder,
    phoBowl,
    waiterHands,
    setCameraMode,
    update,
    setSkin,
  };
}
