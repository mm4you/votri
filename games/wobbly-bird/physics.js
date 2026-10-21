/**
 * @file physics.js
 * @description Bộ giải vật lý 240Hz cho Game #2: Chim Béo Tập Bay (100m).
 * Lối chơi cuốn hút, gây nghiện & Đầy thử thách:
 * 1. Khí Động Học Chú Chim Béo (Chubby Aerodynamics):
 *    - Đôi cánh ngắn tròn mũm mĩm: Đập Cánh Trái (F) lượn sang Phải; Đập Cánh Phải (J) lượn sang Trái.
 *    - Tuyệt kỹ "Nhịp Cánh Đồng Bộ" (F - J - F - J): Đập so le nhịp nhàng sẽ giữ thăng bằng tuyệt hảo,
 *      xé gió lướt thẳng băng với tốc độ tối đa ~4.2 m/s!
 * 2. Căng Cánh Lướt Dù (Glide Flow):
 *    - Nhấn giữ cả 2 nút (F + J) để sải rộng cánh lướt êm, vừa tiết kiệm thể lực vừa lượn thấp né vật cản.
 * 3. Trứng Phản Lực Cứu Nguy (Emergency Egg Rocket - Phím SPACE / Nút Giữa):
 *    - Đang chúi mỏ cắm đất? Bấm SPACE bắn ngay quả trứng hoàng kim xuống dưới! Phản lực nảy vọt +3.2m/s
 *      lên chín tầng mây, cứu bàn thua trông thấy và xoay vòng vui nhộn!
 */

import { BIRD_PHYSICS_CONFIG as P, WINGS } from './config.js?v=21';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);

export function createBirdPhysics() {
  const state = {
    x: 0,
    vx: 0,
    y: P.START_Y,
    vy: 0,
    z: 0,            // Lệch trái/phải trên đường bay (-2.2m -> +2.2m)
    vz: 0,           // Vận tốc ngang
    yaw: 0,          // Góc quay thân lượn vòng
    wy: 0,
    pitch: 0.04,
    wp: 0,
    roll: 0,
    wr: 0,
    stamina: 1.0,    // Thể lực đập cánh (1.0 = sung sức)
    dizzy: 0,        // Thanh Choáng Tiền Đình (0.0 -> 1.0)
    isGliding: false,// Đang căng cánh lướt dù
    gustTimer: 6.0,  // Đếm ngược gió
    gustActive: 0,   // Cường độ gió
    lastFlapSide: -1,
    eggCharges: 2,   // 2 quả trứng phản lực cứu nguy khẩn cấp!
    ringsCollected: 0,
    wings: WINGS.map(() => ({
      a: 0,
      da: 0,
      lift: 0,
    })),
    fallen: null,    // 'faceplant' | 'dizzy' | 'roll' | 'pitch'
    events: [],
  };

  let accumulator = 0;

  function stepFixed(dt, pressedFlags) {
    const leftHeld = !!pressedFlags[0];
    const rightHeld = !!pressedFlags[1];
    const bothHeld = leftHeld && rightHeld && state.y > 0.08;
    state.isGliding = bothHeld;

    // Hồi phục thể lực khi Lướt Dù hoặc khi không đập cánh
    if (bothHeld) {
      state.stamina = Math.min(1.0, state.stamina + 0.75 * dt);
    } else if (!leftHeld && !rightHeld) {
      state.stamina = Math.min(1.0, state.stamina + 0.40 * dt);
    }

    // 1. Quản lý gió ngược & gió tạt ngang
    if (state.x > 20) {
      if (state.gustActive > 0) {
        state.gustActive = Math.max(0, state.gustActive - dt / 2.8);
      } else {
        state.gustTimer -= dt;
        if (state.gustTimer <= 0) {
          state.gustActive = 1.0;
          state.gustTimer = rand(6.0, 10.0);
          state.events.push({ type: 'gust' });
        }
      }
    }

    let liftForce = 0;
    let forwardThrust = 0;
    let rollTorque = 0;
    let pitchTorque = 0;
    let yawTorque = 0;

    // 2. Xử lý từng cánh (0: Cánh Trái F, 1: Cánh Phải J)
    for (let i = 0; i < 2; i++) {
      const cfg = WINGS[i];
      const w = state.wings[i];
      const isPressed = !!pressedFlags[i];

      w.lift += ((isPressed ? 1 : 0) - w.lift) * Math.min(1, 15 * dt);

      let targetAngle = -0.48;
      let maxSpeed = 7.5;

      if (bothHeld) {
        targetAngle = 0.08;
        maxSpeed = 9.5;
      } else if (isPressed) {
        targetAngle = 0.88;
        maxSpeed = 8.5;
      }

      const prevA = w.a;
      const desiredRate = clamp((targetAngle - w.a) / dt, -maxSpeed, maxSpeed);
      w.a += desiredRate * dt;
      w.da = desiredRate;

      // PHA ĐẬP CÁNH XUỐNG (Nhả nút từ vị trí giơ cao)
      if (!isPressed && desiredRate < -0.5) {
        const staminaFactor = 0.40 + 0.60 * state.stamina;
        let flapPower = clamp(-desiredRate / 6.8, 0.30, 1.30) * staminaFactor;

        // Tiêu hao thể lực mỗi lần vỗ cánh
        state.stamina = Math.max(0.18, state.stamina - 0.11);

        // THƯỞNG NHỊP ĐẬP SO LE CÁNH (F rồi tới J liên tục):
        // Giúp chú chim thăng bằng và bay lướt cực bốc!
        const isAlternating = state.lastFlapSide !== i && state.lastFlapSide !== -1;
        if (isAlternating) {
          flapPower *= 1.25;
        }

        const verticalEfficiency = Math.max(0.25, Math.cos(state.roll));
        liftForce += 9.2 * flapPower * verticalEfficiency;
        forwardThrust += 6.2 * flapPower * Math.cos(state.pitch * 0.6);

        // Lực bẻ lái ngang 3D mượt mà:
        // Cánh Trái (cfg.side = -1) đập tạo phản lực hướng mũi sang PHẢI (+yaw, +roll)
        // Cánh Phải (cfg.side = 1) đập tạo phản lực hướng mũi sang TRÁI (-yaw, -roll)
        const steerDir = -cfg.side;
        yawTorque += steerDir * 2.2 * flapPower;
        rollTorque -= cfg.side * 2.4 * flapPower;
        pitchTorque += flapPower * 1.0;

        if (state.gustActive > 0.3) {
          pitchTorque += state.gustActive * flapPower * 1.5;
        }

        if (prevA > 0.18 && w.a <= 0.18) {
          state.lastFlapSide = i;
          state.events.push({
            type: 'flap',
            wing: i,
            left: i === 0,
            alternating: isAlternating,
            power: clamp(flapPower, 0.3, 1.0),
          });
        }
      }
    }

    // 3. Trọng lực & Lướt Dù
    const baseGravity = 6.4;
    const effectiveGravity = bothHeld ? baseGravity * 0.40 : baseGravity;
    let glideLift = bothHeld ? clamp(state.vx * 0.72, 0, 2.4) : 0;

    // Đệm khí mặt đất (Ground effect) khi bay là là ngọn cỏ
    if (state.y < 0.45 && state.y > 0.02) {
      glideLift += (0.45 - state.y) * 3.6;
    }

    // Gió tạt & Gió ngược
    const gustPushback = state.gustActive > 0
      ? state.gustActive * (bothHeld ? 1.0 : 2.5)
      : 0;

    const netAx = forwardThrust - gustPushback - 0.52 * state.vx - 0.22 * state.vx * Math.abs(state.vx);
    const netAy = liftForce + glideLift - effectiveGravity - 1.3 * state.vy;

    state.vx = clamp(state.vx + netAx * dt, 0, 5.0);
    state.vy = clamp(state.vy + netAy * dt, -5.0, 4.8);
    state.x = Math.max(0, state.x + state.vx * dt);
    state.y = clamp(state.y + state.vy * dt, 0, 4.5);

    // Xoay góc mũi bay (yaw) và di chuyển ngang Z theo hướng bay:
    state.wy += (yawTorque - 3.2 * state.yaw - 2.8 * state.wy) * dt;
    state.yaw = clamp(state.yaw + state.wy * dt, -0.40, 0.40);

    // Di chuyển ngang mượt mà theo góc nghiêng & góc quay mũi:
    const bankLateralSpeed = state.vx * Math.sin(state.yaw) + Math.sin(state.roll) * 1.4;
    state.z = clamp(state.z + bankLateralSpeed * dt, -2.2, 2.2);

    // Biên hành lang bay bầu trời (gió lốc biên đẩy nhẹ lại)
    if (Math.abs(state.z) >= 2.15) {
      const bSide = Math.sign(state.z);
      state.z = bSide * 2.15;
      state.yaw = -bSide * 0.15;
      state.roll *= 0.5;
    }

    // KIỂM TRA VÒNG GIA TỐC KHÍ ĐỘNG (AERIAL SPEED HOOPS):
    // Đặt tại các cự ly 16m, 36m, 58m, 78m. Bay xuyên qua vòng được tăng tốc và điểm thưởng!
    const hoopDistances = [16.0, 36.0, 58.0, 78.0];
    for (const hx of hoopDistances) {
      if (Math.abs(state.x - hx) < 0.65 && Math.abs(state.z) < 0.85 && state.y > 0.8 && state.y < 2.5) {
        state.vx = Math.min(5.2, state.vx + 1.2);
        state.vy = Math.max(0.8, state.vy + 0.6);
        state.ringsCollected++;
        state.events.push({ type: 'hoopBoost', x: hx });
      }
    }

    // KIỂM TRA CHƯỚNG NGẠI VẬT THEO VỊ TRÍ 3D (X, Y, Z)
    if (Math.abs(state.x - 24.0) < 0.65 && Math.abs(state.z) < 1.0 && state.y > 0.45 && state.y < 1.48) {
      // Dây phơi quần áo ở trung tâm: Lượn lách ra 2 bên (|z| > 1.0) hoặc bay vọt qua
      state.x = 23.2;
      state.vx = -0.6;
      state.vy = -0.2;
      state.dizzy = Math.min(0.85, state.dizzy + 0.32);
      state.events.push({ type: 'obstacleBonk', name: 'clothesline' });
    } else if (Math.abs(state.x - 48.0) < 0.75 && state.z > -0.2 && state.y > 1.55) {
      // Tán cây táo vươn bên phải: Lượn sang trái (z < -0.2) để né
      state.x = 47.2;
      state.vx = -0.6;
      state.vy = -0.3;
      state.dizzy = Math.min(0.85, state.dizzy + 0.32);
      state.events.push({ type: 'obstacleBonk', name: 'appletree' });
    } else if (Math.abs(state.x - 72.0) < 0.75 && Math.abs(state.z) < 0.9 && state.y < 1.85 && state.y > 0.25) {
      // Bù nhìn rơm
      state.x = 71.2;
      state.vx = -0.7;
      state.dizzy = Math.min(0.85, state.dizzy + 0.35);
      state.events.push({ type: 'obstacleBonk', name: 'scarecrow' });
    }

    // 4. Cân bằng Roll & Pitch
    const rollStab = bothHeld ? 36.0 : 14.0;
    const windRollDisturbance = state.gustActive > 0
      ? Math.sin(state.x * 2.8 + state.gustTimer * 8) * state.gustActive * 1.2
      : 0;

    const rollRighting = -rollStab * (state.roll + 0.16 * state.wr);

    state.wr += (
      (rollTorque + windRollDisturbance) / 0.082 +
      rollRighting -
      2.6 * state.wr
    ) * dt;

    const targetPitch = bothHeld ? -0.06 : clamp(state.vy * 0.11, -0.30, 0.30);
    const pitchRighting = -8.0 * (state.pitch - targetPitch);

    state.wp += (
      (pitchTorque + pitchRighting) / 0.28 -
      2.6 * state.wp
    ) * dt;

    state.roll += state.wr * dt;
    state.pitch += state.wp * dt;

    // 5. Thanh Rối Loạn Tiền Đình (Dizzy Meter)
    const angularStress = Math.abs(state.wr) * 0.08 + Math.max(0, Math.abs(state.roll) - 0.55) * 0.40;
    if (angularStress > 0.20 && !bothHeld) {
      state.dizzy = Math.min(1.0, state.dizzy + angularStress * 0.38 * dt);
    } else {
      const recoverRate = bothHeld ? 0.75 : 0.32;
      state.dizzy = Math.max(0, state.dizzy - recoverRate * dt);
    }

    // 6. Kiểm tra tiếp đất
    if (state.y <= 0.03 && state.x > 0.4) {
      if (bothHeld && state.vy > -1.2 && state.pitch >= -0.20 && state.dizzy < 0.60) {
        state.y = 0.04;
        state.vy = Math.max(0.6, -state.vy * 0.4);
        state.pitch = Math.max(-0.05, state.pitch * 0.4);
        state.roll *= 0.50;
        state.vx *= 0.88;
        state.events.push({ type: 'grassBounce' });
      } else {
        state.y = 0.02;
        state.vx = 0;
        state.vy = 0;
        state.fallen = 'faceplant';
      }
    } else if (state.dizzy >= 1.0) {
      state.fallen = 'dizzy';
    } else if (Math.abs(state.roll) > 1.38) {
      state.fallen = 'roll';
    } else if (Math.abs(state.pitch) > 1.25) {
      state.fallen = 'pitch';
    }
  }

  return {
    state,

    step(dt, pressedFlags) {
      if (state.fallen) return;
      accumulator = Math.min(accumulator + dt, 0.05);
      const STEP = 1 / 120;
      let count = 0;
      while (accumulator >= STEP && !state.fallen && count < 5) {
        stepFixed(STEP, pressedFlags);
        accumulator -= STEP;
        count++;
      }
    },

    dropEgg() {
      if (state.fallen || state.eggCharges <= 0) return false;
      state.eggCharges--;
      // Bắn trứng hoàng kim xuống dưới, phản lực đẩy vọt chú chim lên trời!
      state.vy = Math.max(state.vy + 3.4, 2.8);
      state.vx = Math.min(state.vx + 1.4, 4.8);
      state.pitch = -0.15;
      state.wp = 2.0;
      state.dizzy = Math.max(0, state.dizzy - 0.50); // Hết choáng ngay lập tức!
      state.events.push({
        type: 'eggRocket',
        x: state.x,
        y: state.y,
        z: state.z
      });
      return true;
    },

    recover() {
      Object.assign(state, {
        vx: 0,
        y: P.START_Y,
        vy: 0.40,
        z: 0,
        vz: 0,
        yaw: 0,
        wy: 0,
        pitch: 0.04,
        wp: 0,
        roll: 0,
        wr: 0,
        stamina: 1.0,
        dizzy: 0,
        isGliding: false,
        lastFlapSide: -1,
        eggCharges: 2,
        ringsCollected: 0,
        fallen: null,
      });
      for (let i = 0; i < 2; i++) {
        Object.assign(state.wings[i], { a: 0, da: 0, lift: 0 });
      }
      accumulator = 0;
    },
  };
}
