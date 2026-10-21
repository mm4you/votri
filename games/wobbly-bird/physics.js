/**
 * @file physics.js
 * @description Bộ giải vật lý 240Hz cho Game #2: Chim Béo Tập Bay (Chỉ 2 Nút F & J).
 * Cơ chế hài hước:
 * - Nhấn giữ 1 nút: Giơ cánh đó lên. Nhả nút: Đập mạnh cánh xuống tạo lực nâng + đẩy tới,
 *   nhưng đồng thời tạo mô-men xoắn nghiêng (Roll) về phía bên kia!
 * - Nhấn giữ CẢ 2 NÚT (F + J): Căng ngang 2 cánh (Chế độ Lướt Dù / Glide) giúp hãm rơi,
 *   tự cân bằng lại góc nghiêng và chống bị gió thổi lật ngửa!
 * - Đập lệch cánh quá nhiều -> Xoáy ốc rối loạn tiền đình (Dizzy); Rơi chạm đất -> Cắm mỏ chổng phao câu (Faceplant)!
 */

import { BIRD_PHYSICS_CONFIG as P, WINGS } from './config.js';

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
    dizzy: 0,        // Thanh Choáng Tiền Đình (0.0 -> 1.0; đầy 1.0 là mắt quay mòng mòng rơi tự do)
    isGliding: false,// True khi đang nhấn giữ cả 2 cánh để căng dù lướt
    gustTimer: 3.8,  // Đếm ngược tới cơn gió ngược tiếp theo
    gustActive: 0,   // Cường độ gió ngược hiện tại (0 -> 1)
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
    const bothHeld = leftHeld && rightHeld && state.y > 0.18;
    state.isGliding = bothHeld;

    // 1. Quản lý cơn gió ngược tinh quái (Wind Gust)
    if (state.x > 4) {
      if (state.gustActive > 0) {
        state.gustActive = Math.max(0, state.gustActive - dt / P.GUST_DURATION);
      } else {
        state.gustTimer -= dt;
        if (state.gustTimer <= 0) {
          state.gustActive = 1.0;
          state.gustTimer = rand(P.GUST_INTERVAL_MIN, P.GUST_INTERVAL_MAX);
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

      w.lift += ((isPressed ? 1 : 0) - w.lift) * Math.min(1, 12 * dt);

      let targetAngle = P.WING_DOWN;
      let maxSpeed = P.FLAP_SPEED;

      if (bothHeld) {
        // Giữ cả 2 nút: Dang ngang cánh ở góc Lướt Dù (WING_GLIDE)
        targetAngle = P.WING_GLIDE;
        maxSpeed = P.GLIDE_RATE;
      } else if (isPressed) {
        // Nhấn giữ 1 nút: Giơ cao cánh lên chuẩn bị đập
        targetAngle = P.WING_UP;
        maxSpeed = P.UPSTROKE_SPEED;
      }

      const prevA = w.a;
      const desiredRate = clamp((targetAngle - w.a) / dt, -maxSpeed, maxSpeed);
      w.a += desiredRate * dt;
      w.da = desiredRate;

      // PHA ĐẬP CÁNH XUỐNG (Nhả nút từ vị trí cánh đang giơ cao)
      if (!isPressed && desiredRate < -0.5) {
        const flapPower = clamp(-desiredRate / P.FLAP_SPEED, 0.2, 1.2);
        // Lực nâng theo cos(roll) - nếu chim nghiêng quá 60 độ thì đập cánh ít nâng mà toàn đẩy ngang!
        const verticalEfficiency = Math.max(0.15, Math.cos(state.roll));
        liftForce += P.FLAP_LIFT * flapPower * verticalEfficiency;
        forwardThrust += P.FLAP_THRUST * flapPower * Math.cos(state.pitch * 0.7);

        // Mô-men xoắn nghiêng (Roll): Đập Cánh Trái đẩy bên trái nảy lên -> nghiêng sang phải (+roll)
        rollTorque -= cfg.side * P.ROLL_TORQUE_PER_WING * flapPower;

        // Mô-men bốc đầu nhẹ khi đập cánh
        pitchTorque += flapPower * 1.45;

        // Nếu đang có gió ngược mạnh mà cố đập cánh thật lực -> gió thổi bốc đầu lật ngửa!
        if (state.gustActive > 0.3) {
          pitchTorque += state.gustActive * flapPower * 2.8;
        }

        if (prevA > 0.25 && w.a <= 0.25) {
          state.events.push({
            type: 'flap',
            wing: i,
            left: i === 0,
            power: clamp(flapPower, 0.3, 1.0),
          });
        }
      }
    }

    // 3. Khí động lực học & Lướt Dù (Gliding)
    const effectiveGravity = bothHeld
      ? P.GRAVITY * P.GLIDE_GRAVITY_MULT
      : P.GRAVITY;

    // Lực nâng lướt gió khi đang có vận tốc ngang
    const glideLift = bothHeld ? clamp(state.vx * 0.85, 0, 2.2) : 0;

    // Lực đẩy lùi của cơn gió ngược (Nếu đang giữ 2 cánh lướt đằm thì ít bị thổi lùi hơn)
    const gustPushback = state.gustActive > 0
      ? state.gustActive * (bothHeld ? 0.85 : 2.35)
      : 0;

    const netAx =
      forwardThrust -
      gustPushback -
      P.LINEAR_DRAG * state.vx -
      P.AIR_DRAG * state.vx * Math.abs(state.vx);

    const netAy = liftForce + glideLift - effectiveGravity - 1.8 * state.vy;

    state.vx = Math.max(-0.8, state.vx + netAx * dt);
    state.vy = clamp(state.vy + netAy * dt, -5.5, 5.5);
    state.x = Math.max(0, state.x + state.vx * dt);
    state.y = clamp(state.y + state.vy * dt, 0, P.MAX_Y);

    // 4. Tích phân góc Nghiêng (Roll) & Chúi/Ngửa (Pitch)
    const rollStab = bothHeld ? P.ROLL_STABILIZE_GLIDE : P.ROLL_STABILIZE_NORMAL;
    const windRollDisturbance = state.gustActive > 0
      ? Math.sin(state.x * 3 + state.gustTimer * 9) * state.gustActive * 1.8
      : 0;

    state.wr += (
      (rollTorque + windRollDisturbance) / P.I_ROLL -
      rollStab * (state.roll + 0.18 * state.wr) -
      P.ANG_DAMP * state.wr
    ) * dt;

    // Cân bằng Pitch: Bay nhanh hoặc đang Lướt Dù giúp thân chim nằm ngang ổn định
    const targetPitch = bothHeld ? -0.05 : clamp(state.vy * 0.12, -0.35, 0.35);
    const pitchRighting = -6.5 * (state.pitch - targetPitch);

    state.wp += (
      (pitchTorque + pitchRighting) / P.I_PITCH -
      P.ANG_DAMP * state.wp
    ) * dt;

    state.roll += state.wr * dt;
    state.pitch += state.wp * dt;

    // 5. Thanh Rối Loạn Tiền Đình (Dizzy Meter)
    // Quay lắc mạnh hoặc nghiêng quá đà làm tăng độ choáng váng; giữ Lướt Dù giúp tỉnh táo lại nhanh
    const angularStress = Math.abs(state.wr) * 0.11 + Math.max(0, Math.abs(state.roll) - 0.5) * 0.45;
    if (angularStress > 0.18 && !bothHeld) {
      state.dizzy = Math.min(1.0, state.dizzy + angularStress * P.DIZZY_SPIN_RATE * dt);
    } else {
      const recoverRate = bothHeld ? 0.65 : 0.28;
      state.dizzy = Math.max(0, state.dizzy - recoverRate * dt);
    }

    // 6. Kiểm tra điều kiện Cắm Mỏ / Tiền Đình / Lộn Vòng
    if (state.y <= P.GROUND_Y + 0.02 && state.x > 0.35) {
      state.y = P.GROUND_Y;
      state.fallen = 'faceplant';
    } else if (state.dizzy >= 1.0) {
      state.fallen = 'dizzy';
    } else if (Math.abs(state.roll) > P.FALL_ROLL) {
      state.fallen = 'roll';
    } else if (Math.abs(state.pitch) > P.FALL_PITCH) {
      state.fallen = 'pitch';
    }
  }

  return {
    state,

    step(dt, pressedFlags) {
      if (state.fallen) return;
      accumulator += dt;
      while (accumulator >= P.STEP && !state.fallen) {
        stepFixed(P.STEP, pressedFlags);
        accumulator -= P.STEP;
      }
    },

    recover() {
      Object.assign(state, {
        vx: 0,
        y: P.START_Y,
        vy: 0.4,
        pitch: 0.04,
        wp: 0,
        roll: 0,
        wr: 0,
        dizzy: 0,
        isGliding: false,
        fallen: null,
      });
      for (let i = 0; i < 2; i++) {
        Object.assign(state.wings[i], { a: 0, da: 0, lift: 0 });
      }
      accumulator = 0;
    },
  };
}
