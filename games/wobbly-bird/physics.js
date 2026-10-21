/**
 * @file physics.js
 * @description Bộ giải vật lý 240Hz cho Game #2: Chim Béo Tập Bay — Phong cách QWOP / Ragdoll Bựa & Cuốn hút:
 * 1. Khí Động Học Chú Chim Béo QWOP (Chubby Borb Balance):
 *    - F: Cánh Trái đập xuống -> Nâng mạnh cánh trái làm thân chim NGHIÊNG SANG PHẢI (+Roll)!
 *    - J: Cánh Phải đập xuống -> Nâng mạnh cánh phải làm thân chim NGHIÊNG SANG TRÁI (-Roll)!
 *    - Tuyệt kỹ "Đi trên cánh" (Wing Walking F - J - F - J):
 *      Đập so le liên tục (Trái đỡ Phải, Phải đỡ Trái) để giữ thăng bằng cho chú chim béo tròn bay vút tới trước!
 *      Đập lệch 1 bên liên tục sẽ bị lộn mèo xoắn ốc cắm đầu xuống đất!
 * 2. Căng Cánh Lướt Dù (Hold F + J):
 *    - Căng 2 cánh xẻ gió, thăng bằng tức thì và hạ độ cao nhẹ nhàng.
 * 3. Trứng Phản Lực Cứu Nguy Cực Bựa (Emergency Egg Rocket - Phím SPACE / Nút Giữa):
 *    - Đang xoắn quẩy hay sắp cắm mỏ? Bấm SPACE bắn ra quả trứng vàng khổng lồ! Phản lực nảy vọt +3.8m/s
 *      lên mây xanh, kéo thăng bằng thẳng lại và hồi tỉnh tiền đình tức khắc!
 */

import { BIRD_PHYSICS_CONFIG as P, WINGS } from './config.js?v=22';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);

export function createBirdPhysics() {
  const state = {
    x: 0,
    vx: 0,
    y: P.START_Y,
    vy: 0,
    z: 0,            // Lệch trái/phải trên bầu trời (-2.2m -> +2.2m)
    vz: 0,
    yaw: 0,
    wy: 0,
    pitch: 0.04,     // Góc chúi/ngửa mỏ chim
    wp: 0,
    roll: 0,         // Góc nghiêng lộn nhào cánh (Rad)
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
      state.stamina = Math.min(1.0, state.stamina + 0.85 * dt);
    } else if (!leftHeld && !rightHeld) {
      state.stamina = Math.min(1.0, state.stamina + 0.45 * dt);
    }

    // Gió tạt ngang
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

    // XỬ LÝ 2 CÁNH ĐỘC LẬP CHUẨN QWOP:
    // Cánh 0: Cánh Trái (F), Cánh 1: Cánh Phải (J)
    for (let i = 0; i < 2; i++) {
      const cfg = WINGS[i];
      const w = state.wings[i];
      const isPressed = !!pressedFlags[i];

      w.lift += ((isPressed ? 1 : 0) - w.lift) * Math.min(1, 16 * dt);

      let targetAngle = -0.48;
      let maxSpeed = 7.5;

      if (bothHeld) {
        targetAngle = 0.08;
        maxSpeed = 9.5;
      } else if (isPressed) {
        targetAngle = 0.90;
        maxSpeed = 8.8;
      }

      const prevA = w.a;
      const desiredRate = clamp((targetAngle - w.a) / dt, -maxSpeed, maxSpeed);
      w.a += desiredRate * dt;
      w.da = desiredRate;

      // PHA ĐẬP CÁNH XUỐNG MẠNH MẼ (Nhả phím từ vị trí giơ cao)
      if (!isPressed && desiredRate < -0.5) {
        const staminaFactor = 0.40 + 0.60 * state.stamina;
        let flapPower = clamp(-desiredRate / 6.8, 0.35, 1.35) * staminaFactor;

        // Tiêu hao thể lực
        state.stamina = Math.max(0.18, state.stamina - 0.10);

        // THƯỞNG NHỊP ĐỔI CÁNH SO LE QWOP (F rồi J liên tục):
        const isAlternating = state.lastFlapSide !== i && state.lastFlapSide !== -1;
        if (isAlternating) {
          flapPower *= 1.30;
        }

        const verticalEfficiency = Math.max(0.20, Math.cos(state.roll));
        liftForce += 9.5 * flapPower * verticalEfficiency;
        forwardThrust += 6.5 * flapPower * Math.cos(state.pitch * 0.6);

        // MÔ-MEN XOẮN LỘN CÁNH QWOP:
        // Cánh Trái (cfg.side = -1) đập -> rollTorque = +4.5 * flapPower (Nghiêng mạnh sang PHẢI)!
        // Cánh Phải (cfg.side = 1) đập -> rollTorque = -4.5 * flapPower (Nghiêng mạnh sang TRÁI)!
        rollTorque -= cfg.side * 4.2 * flapPower;

        // Lực bẻ hướng mũi chim
        yawTorque += -cfg.side * 2.2 * flapPower;
        pitchTorque += flapPower * 1.1;

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

    // Khí động học & Lướt Dù
    const baseGravity = 6.4;
    const effectiveGravity = bothHeld ? baseGravity * 0.38 : baseGravity;
    let glideLift = bothHeld ? clamp(state.vx * 0.75, 0, 2.5) : 0;

    // Đệm khí mặt đất
    if (state.y < 0.45 && state.y > 0.02) {
      glideLift += (0.45 - state.y) * 3.8;
    }

    // Gió thổi
    const gustPushback = state.gustActive > 0
      ? state.gustActive * (bothHeld ? 1.0 : 2.4)
      : 0;

    const netAx = forwardThrust - gustPushback - 0.50 * state.vx - 0.20 * state.vx * Math.abs(state.vx);
    const netAy = liftForce + glideLift - effectiveGravity - 1.2 * state.vy;

    state.vx = clamp(state.vx + netAx * dt, 0, 5.2);
    state.vy = clamp(state.vy + netAy * dt, -5.0, 5.0);
    state.x = Math.max(0, state.x + state.vx * dt);
    state.y = clamp(state.y + state.vy * dt, 0, 4.6);

    // Xoay hướng mũi bay (yaw)
    state.wy += (yawTorque - 3.2 * state.yaw - 2.8 * state.wy) * dt;
    state.yaw = clamp(state.yaw + state.wy * dt, -0.42, 0.42);

    // Dạt ngang 3D chân thực theo góc lật cánh Roll và mũi Yaw:
    const bankLateralSpeed = state.vx * Math.sin(state.yaw) + Math.sin(state.roll) * 1.6;
    state.z = clamp(state.z + bankLateralSpeed * dt, -2.2, 2.2);

    // Biên hành lang bay bầu trời
    if (Math.abs(state.z) >= 2.15) {
      const bSide = Math.sign(state.z);
      state.z = bSide * 2.15;
      state.yaw = -bSide * 0.15;
      state.roll *= 0.5;
    }

    // VÒNG TĂNG TỐC HOÀNG KIM (AERIAL HOOPS):
    const hoopDistances = [16.0, 36.0, 58.0, 78.0];
    for (const hx of hoopDistances) {
      if (Math.abs(state.x - hx) < 0.65 && Math.abs(state.z) < 0.85 && state.y > 0.8 && state.y < 2.5) {
        state.vx = Math.min(5.5, state.vx + 1.2);
        state.vy = Math.max(0.8, state.vy + 0.6);
        state.ringsCollected++;
        state.events.push({ type: 'hoopBoost', x: hx });
      }
    }

    // CHƯỚNG NGẠI VẬT HÀI HƯỚC:
    if (Math.abs(state.x - 24.0) < 0.65 && Math.abs(state.z) < 1.0 && state.y > 0.45 && state.y < 1.48) {
      state.x = 23.2;
      state.vx = -0.6;
      state.vy = -0.2;
      state.dizzy = Math.min(0.85, state.dizzy + 0.35);
      state.events.push({ type: 'obstacleBonk', name: 'clothesline' });
    } else if (Math.abs(state.x - 48.0) < 0.75 && state.z > -0.2 && state.y > 1.55) {
      state.x = 47.2;
      state.vx = -0.6;
      state.vy = -0.3;
      state.dizzy = Math.min(0.85, state.dizzy + 0.35);
      state.events.push({ type: 'obstacleBonk', name: 'appletree' });
    } else if (Math.abs(state.x - 72.0) < 0.75 && Math.abs(state.z) < 0.9 && state.y < 1.85 && state.y > 0.25) {
      state.x = 71.2;
      state.vx = -0.7;
      state.dizzy = Math.min(0.85, state.dizzy + 0.38);
      state.events.push({ type: 'obstacleBonk', name: 'scarecrow' });
    }

    // CÂN BẰNG RAGDOLL ROLL (LỘN NGHIÊNG CÁNH QWOP):
    // Khi giữ cả 2 nút (Lướt dù) thì cánh xòe rộng tự cân bằng; khi thả ra chim béo chao đảo tự do:
    const rollStab = bothHeld ? 32.0 : 7.2;
    const windRollDisturbance = state.gustActive > 0
      ? Math.sin(state.x * 2.8 + state.gustTimer * 8) * state.gustActive * 1.2
      : 0;

    const rollRighting = -rollStab * (state.roll + 0.14 * state.wr);

    state.wr += (
      (rollTorque + windRollDisturbance) / 0.062 +
      rollRighting -
      2.4 * state.wr
    ) * dt;

    // CÂN BẰNG RAGDOLL PITCH (CHÚI MỎ / NGỬA CỔ):
    const targetPitch = bothHeld ? -0.06 : clamp(state.vy * 0.12, -0.35, 0.35);
    const pitchRighting = -6.5 * (state.pitch - targetPitch);

    state.wp += (
      (pitchTorque + pitchRighting) / 0.22 -
      2.4 * state.wp
    ) * dt;

    state.roll += state.wr * dt;
    state.pitch += state.wp * dt;

    // THANH CHOÁNG TIỀN ĐÌNH (DIZZY METER):
    const angularStress = Math.abs(state.wr) * 0.08 + Math.max(0, Math.abs(state.roll) - 0.55) * 0.40;
    if (angularStress > 0.20 && !bothHeld) {
      state.dizzy = Math.min(1.0, state.dizzy + angularStress * 0.38 * dt);
    } else {
      const recoverRate = bothHeld ? 0.75 : 0.32;
      state.dizzy = Math.max(0, state.dizzy - recoverRate * dt);
    }

    // KIỂM TRA TIẾP ĐẤT & CẮM MỎ CHỔNG PHAO CÂU:
    if (state.y <= 0.03 && state.x > 0.4) {
      if (bothHeld && state.vy > -1.2 && state.pitch >= -0.22 && state.dizzy < 0.65) {
        // Nảy bụng cao su vui nhộn!
        state.y = 0.04;
        state.vy = Math.max(0.65, -state.vy * 0.45);
        state.pitch = Math.max(-0.05, state.pitch * 0.4);
        state.roll *= 0.50;
        state.vx *= 0.88;
        state.events.push({ type: 'grassBounce' });
      } else {
        // CẮM MỎ CHỔNG PHAO CÂU (SPLAT)!
        state.y = 0.02;
        state.vx = 0;
        state.vy = 0;
        state.fallen = 'faceplant';
      }
    } else if (state.dizzy >= 1.0) {
      state.fallen = 'dizzy'; // Choáng váng hoa mắt
    } else if (Math.abs(state.roll) > 1.35) {
      state.fallen = 'roll';  // Lộn mèo lật ngửa
    } else if (Math.abs(state.pitch) > 1.25) {
      state.fallen = 'pitch'; // Cắm đầu đo đất
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
      // BẮN TRỨNG PHẢN LỰC CỨU NGUY SIÊU BỰA:
      state.vy = Math.max(state.vy + 3.8, 3.2);
      state.vx = Math.min(state.vx + 1.6, 5.0);
      state.pitch = -0.15;
      state.roll *= 0.20; // Nắn thẳng cánh lại!
      state.wp = 2.0;
      state.dizzy = Math.max(0, state.dizzy - 0.60); // Hồi tỉnh tiền đình tức thì!
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
        vy: 0.45,
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
