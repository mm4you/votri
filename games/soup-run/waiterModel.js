/**
 * @file waiterModel.js
 * @description Mô hình Người Phục Vụ Bưng Phở Góc Nhìn Thứ Nhất (First-Person Waiter Rig):
 * - Theo yêu cầu: Chỉ cần 2 bàn tay bưng bát, không cần full nhân vật.
 * - 1 góc camera cố định trực diện tô phở ngon lành, bao quát toàn cảnh hành lang quán ăn phía trước.
 * - Mô phỏng nhịp thở và nhịp bước chân nhấp nhô tự nhiên của người phục vụ khi bưng tô phở nóng.
 */

import * as THREE from '../../shared/vendor/three.module.js';
import { createPhoBowlModel } from './phoModel.js?v=72';

export function createWaiterCharacter({ skin = {} } = {}) {
  const root = new THREE.Group();
  root.name = 'waiter-character-root';

  // Khung đỡ tô phở và đôi tay
  const bowlHolder = new THREE.Group();
  bowlHolder.name = 'pho-bowl-holder';
  bowlHolder.position.set(0, 1.15, 0.44);
  root.add(bowlHolder);

  const phoBowl = createPhoBowlModel({ skin });
  bowlHolder.add(phoBowl.root);

  function setCameraMode(mode) {
    // Góc nhìn cố định duy nhất: Góc bưng bát
    bowlHolder.visible = true;
    phoBowl.root.visible = true;
  }

  function update(physState, dt) {
    phoBowl.update(physState, dt);

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
  }

  return {
    root,
    bowlHolder,
    phoBowl,
    setCameraMode,
    update,
    setSkin,
  };
}
