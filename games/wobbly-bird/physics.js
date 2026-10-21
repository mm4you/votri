/**
 * @file physics.js
 * @description Bộ giải vật lý 240Hz cho Game #2: Chim Béo Tập Bay (100m, Chỉ 2 Nút F & J).
 * Cân bằng độ khó chuẩn xác & Lối chơi gây nghiện:
 * 1. Nhịp bay Thể Lực (Flap Stamina):
 *    - Đập cánh liên tục không ngừng sẽ làm chú chim béo mỏi cánh (stamina giảm, lực nâng yếu dần).
 *    - Nhấn giữ cả 2 phím (F + J) để Lướt Dù (Glide) vừa xẻ gió cân bằng, vừa hồi phục thể lực nhanh chóng!
 *    - Tạo vòng lặp nhịp điệu hoàn hảo: Vỗ 2-3 nhịp -> Căng cánh Lướt Dù -> Vỗ tiếp!
 * 2. Khí động học Chubby Bird:
 *    - Trọng lực thực tế: Lướt dù là hạ cánh từ từ (không còn bay lơ lửng vô tận như khinh khí cầu).
 *    - Lực nâng đệm khí mặt đất (Ground Effect) khi bay là là ngọn cỏ, nảy bụng lướt cỏ mượt mà.
 * 3. Thử thách đường bay 100m:
 *    - 0m - 25m: Xuất phát êm ả, làm quen nhịp vỗ F - J và lướt dù.
 *    - 25m - 55m: Gió tạt nghiêng (Crosswinds) đòi hỏi đập bù cánh để giữ đường bay thẳng.
 *    - 55m - 85m: Gió ngược mạnh (Headwinds) đòi hỏi lướt dù thấp để lách qua luồng gió.
 *    - 85m - 100m: Tăng tốc về tổ ấm đích!
 */

import { BIRD_PHYSICS_CONFIG as P, WINGS } from './config.js?v=15';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);

export function createBirdPhysics() {
  const state = {
    x: 0,
    vx: 0,
    y: P.START_Y,
    vy: 0,
    pitch: 0.05,
    wp: 0,
    roll: 0,
    wr: 0,
    stamina: 1.0,    // Thể lực đập cánh (1.0 = sung sức; đập liên tục giảm về 0.2; lướt dù hồi lại)
    dizzy: 0,        // Thanh Choáng Tiền Đình (0.0 -> 1.0)
    isGliding: false,// True khi đang giữ cả 2 nút căng cánh lướt dù
    gustTimer: 5.0,  // Đếm ngược tới cơn gió tiếp theo
    gustActive: 0,   // Cường độ gió (0 -> 1)
    lastFlapSide: -1,
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
      state.stamina = Math.min(1.0, state.stamina + 0.65 * dt);
    } else if (!leftHeld && !rightHeld) {
      state.stamina = Math.min(1.0, state.stamina + 0.35 * dt);
    }

    // 1. Quản lý gió ngược & gió tạt ngang theo các chặng trên đường bay 100m
    if (state.x > 20) {
      if (state.gustActive > 0) {
        state.gustActive = Math.max(0, state.gustActive - dt / 2.6);
      } else {
        state.gustTimer -= dt;
        if (state.gustTimer <= 0) {
          state.gustActive = 1.0;
          state.gustTimer = rand(5.5, 9.0);
          state.events.push({ type: 'gust' });
        }
      }
    }

    let liftForce = 0;
    let forwardThrust = 0;
    let rollTorque = 0;
    let pitchTorque = 0;

    // 2. Xử lý từng cánh (0: Cánh Trái F, 1: Cánh Phải J)
    for (let i = 0; i < 2; i++) {
      const cfg = WINGS[i];
      const w = state.wings[i];
      const isPressed = !!pressedFlags[i];

      w.lift += ((isPressed ? 1 : 0) - w.lift) * Math.min(1, 14 * dt);

      let targetAngle = -0.48;
      let maxSpeed = 7.0;

      if (bothHeld) {
        targetAngle = 0.08;
        maxSpeed = 9.0;
      } else if (isPressed) {
        targetAngle = 0.88;
        maxSpeed = 8.0;
      }

      const prevA = w.a;
      const desiredRate = clamp((targetAngle - w.a) / dt, -maxSpeed, maxSpeed);
      w.a += desiredRate * dt;
      w.da = desiredRate;

      // PHA ĐẬP CÁNH XUỐNG (Nhả nút từ vị trí giơ cao)
      if (!isPressed && desiredRate < -0.5) {
        // Thể lực ảnh hưởng trực tiếp tới lực đập cánh
        const staminaFactor = 0.35 + 0.65 * state.stamina;
        let flapPower = clamp(-desiredRate / 6.8, 0.25, 1.25) * staminaFactor;

        // Tiêu hao thể lực mỗi lần vỗ cánh
        state.stamina = Math.max(0.15, state.stamina - 0.12);

        // Thưởng nhịp đập so le cánh F rồi tới J
        if (state.lastFlapSide !== i && state.lastFlapSide !== -1) {
          flapPower *= 1.20;
        }

        const verticalEfficiency = Math.max(0.20, Math.cos(state.roll));
        liftForce += 8.6 * flapPower * verticalEfficiency;
        forwardThrust += 5.8 * flapPower * Math.cos(state.pitch * 0.6);

        // Mô-men xoắn nghiêng
        rollTorque -= cfg.side * 2.1 * flapPower;
        pitchTorque += flapPower * 1.2;

        if (state.gustActive > 0.3) {
          pitchTorque += state.gustActive * flapPower * 1.8;
        }

        if (prevA > 0.18 && w.a <= 0.18) {
          state.lastFlapSide = i;
          state.events.push({
            type: 'flap',
            wing: i,
            left: i === 0,
            power: clamp(flapPower, 0.3, 1.0),
          });
        }
      }
    }

    // 3. Trọng lực thực tế & Lướt Dù (Gliding):
    // Khi lướt dù, chim béo hạ dần độ cao với tốc độ êm (~ -0.65 m/s), không còn bay lơ lửng bất tử
    const baseGravity = 6.8;
    const effectiveGravity = bothHeld ? baseGravity * 0.42 : baseGravity;

    // Lực nâng khí động học khi có vận tốc tới
    let glideLift = bothHeld ? clamp(state.vx * 0.68, 0, 2.2) : 0;

    // Đệm khí mặt đất (Ground Effect) khi bay là là ngọn cỏ (< 0.45m)
    if (state.y < 0.45 && state.y > 0.02) {
      glideLift += (0.45 - state.y) * 3.4;
    }

    // Gió tạt & Gió ngược
    const gustPushback = state.gustActive > 0
      ? state.gustActive * (bothHeld ? 1.1 : 2.8)
      : 0;

    const netAx = forwardThrust - gustPushback - 0.58 * state.vx - 0.26 * state.vx * Math.abs(state.vx);
    const netAy = liftForce + glideLift - effectiveGravity - 1.4 * state.vy;

    state.vx = clamp(state.vx + netAx * dt, 0, 4.8);
    state.vy = clamp(state.vy + netAy * dt, -5.2, 4.5);
    state.x = Math.max(0, state.x + state.vx * dt);
    state.y = clamp(state.y + state.vy * dt, 0, 4.2);

    // 4. Cân bằng Roll & Pitch
    const rollStab = bothHeld ? 38.0 : 13.5;
    const windRollDisturbance = state.gustActive > 0
      ? Math.sin(state.x * 2.8 + state.gustTimer * 8) * state.gustActive * 1.4
      : 0;

    const rollRighting = -rollStab * (state.roll + 0.16 * state.wr);

    state.wr += (
      (rollTorque + windRollDisturbance) / 0.082 +
      rollRighting -
      2.6 * state.wr
    ) * dt;

    const targetPitch = bothHeld ? -0.06 : clamp(state.vy * 0.11, -0.32, 0.32);
    const pitchRighting = -7.5 * (state.pitch - targetPitch);

    state.wp += (
      (pitchTorque + pitchRighting) / 0.28 -
      2.6 * state.wp
    ) * dt;

    state.roll += state.wr * dt;
    state.pitch += state.wp * dt;

    // 5. Thanh Rối Loạn Tiền Đình (Dizzy Meter)
    const angularStress = Math.abs(state.wr) * 0.09 + Math.max(0, Math.abs(state.roll) - 0.55) * 0.42;
    if (angularStress > 0.20 && !bothHeld) {
      state.dizzy = Math.min(1.0, state.dizzy + angularStress * 0.40 * dt);
    } else {
      const recoverRate = bothHeld ? 0.75 : 0.32;
      state.dizzy = Math.max(0, state.dizzy - recoverRate * dt);
    }

    // 6. Kiểm tra tiếp đất: Cắm Mỏ hay Nảy Bụng Cỏ (Belly Bounce)
    if (state.y <= 0.03 && state.x > 0.4) {
      if (state.pitch < -0.30 || state.vy < -2.2) {
        state.y = 0;
        state.fallen = 'faceplant';
      } else {
        // Nảy bụng cỏ lướt tiếp
        state.y = 0.04;
        state.vy = Math.max(0.60, -state.vy * 0.40);
        state.pitch = Math.max(-0.06, state.pitch * 0.45);
        state.roll *= 0.50;
        state.vx *= 0.88;
        state.events.push({ type: 'grassBounce' });
      }
    } else if (state.dizzy >= 1.0) {
      state.fallen = 'dizzy';
    } else if (Math.abs(state.roll) > 1.35) {
      state.fallen = 'roll';
    } else if (Math.abs(state.pitch) > 1.20) {
      state.fallen = 'pitch';
    }
  }

  return {
    state,

    step(dt, pressedFlags) {
      if (state.fallen) return;
      accumulator += dt;
      while (accumulator >= 1 / 240 && !state.fallen) {
        stepFixed(1 / 240, pressedFlags);
        accumulator -= 1 / 240;
      }
    },

    recover() {
      Object.assign(state, {
        vx: 0,
        y: P.START_Y,
        vy: 0.40,
        pitch: 0.04,
        wp: 0,
        roll: 0,
        wr: 0,
        stamina: 1.0,
        dizzy: 0,
        isGliding: false,
        lastFlapSide: -1,
        fallen: null,
      });
      for (let i = 0; i < 2; i++) {
        Object.assign(state.wings[i], { a: 0, da: 0, lift: 0 });
      }
      accumulator = 0;
    },
  };
}
