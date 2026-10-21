/**
 * @file physics.js
 * @description Bộ giải vật lý Bơi lội Thủy động lực học 120Hz — Đằm tay, Chuẩn xác, Không lật nhảm:
 * 1. Thể tích nổi Thân mình (Torso Buoyancy):
 *    - Lồng ngực chứa đầy không khí tạo lực nổi Ác-si-mét nâng đỡ toàn bộ cơ thể.
 *    - Nhấc 1 tay hoặc 1 chân lên KHÔNG BAO GIỜ bị lật ngửa hay chết nhảm; cơ thể chỉ nghiêng nhẹ tự nhiên 10-15 độ.
 * 2. Cơ chế quạt nước & lướt sóng:
 *    - Q (Chân Trái), W (Chân Phải): Đạp nước duy trì trớn.
 *    - O (Tay Trái), P (Tay Phải): Sải tay quạt nước xé nước tiến vọt ~2.2 - 2.8 m/s.
 *    - Đổi nhịp so le (Q-W-O-P) bơi cực êm và thẳng hàng.
 * 3. Hơi thở tự nhiên (O2):
 *    - Quạt tay ngoi đầu lên hít thở O2 đầy ắp kèm âm thanh hít thở đã tai.
 */

import { LIMBS, SWIM_STYLES } from './config.js?v=23';

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const Q = {
  STEP: 1 / 120,
  A_FWD: 0.78,
  A_BACK: -0.22,
  SWING: 7.8,
  PUSH: 6.2,
  RETURN: 6.0,
  LIFT: 0.35,
  LIFT_RATE: 12.0,
  K: 65,
  C: 8.5,
  TRACTION: 13.5,   // Lực đẩy thủy lực bốc, sải tay xé nước cực đã
  SLIDE: 0.45,
  DRAG: 0.18,
  I_PITCH: 0.32,
  I_ROLL: 0.075,
  TIP: 3.5,
  TIP_PITCH: 1.8,
  FALL_ROLL: 1.38,  // ~80 độ nghiêng ngang mới bị lật
  FALL_PITCH: 1.48, // ~85 độ chúi dựng đứng mới bị cắm đầu
  BREATH_DRAIN: 0.065,  // Nín thở được ~15s nếu úp mặt
  BREATH_RECOVER: 2.4,  // Hồi phục O2 nhanh chóng khi ngoi thở
  COM: 0.06,
  ANG_DAMP: 3.5,
};

const REST_HEIGHT = 1.15 - 9.8 / (4 * Q.K);

export function createSwimPhysics(initialStyleId = 'freestyle') {
  let currentStyle = SWIM_STYLES.find((s) => s.id === initialStyleId) || SWIM_STYLES[0];

  const state = {
    styleId: currentStyle.id,
    x: 0,
    vx: 0,
    y: REST_HEIGHT,
    vy: 0,
    z: 0,          // Lệch trái/phải trong làn bơi (-1.10m -> +1.10m)
    vz: 0,
    yaw: 0,        // Góc quay mũi người bơi
    wy: 0,
    pitch: 0,      // Góc chúi / ngửa thân người (Rad)
    wp: 0,
    roll: 0,       // Góc nghiêng lật ngang thân người (Rad)
    wr: 0,
    breath: 1.0,
    isBreathing: true,
    mouthY: 0.08,
    rhythmBonus: 0,
    turboUsed: false,
    limbs: LIMBS.map(() => ({
      a: 0,
      da: 0,
      lift: 0,
      submerged: true,
      load: 0.6,
      tipX: 0,
      tipY: 0,
    })),
    fallen: null, // 'choke' | 'roll+' | 'roll-' | 'pitch+' | 'pitch-'
    events: [],
  };

  let accumulator = 0;
  let breathSoundCooldown = 0;

  function setStyle(styleId) {
    currentStyle = SWIM_STYLES.find((s) => s.id === styleId) || SWIM_STYLES[0];
    state.styleId = currentStyle.id;
  }

  function getJointHeightAndVel(limbCfg) {
    const sinP = Math.sin(state.pitch);
    const sinR = Math.sin(state.roll);
    const cx = limbCfg.x - Q.COM;
    const h = state.y + limbCfg.y + cx * sinP - limbCfg.z * sinR;
    const vh =
      state.vy +
      cx * Math.cos(state.pitch) * state.wp -
      limbCfg.z * Math.cos(state.roll) * state.wr;
    return [h, vh];
  }

  function stepFixed(dt, pressedFlags) {
    let totalLift = 0;
    let pitchTorque = 0;
    let rollTorque = 0;
    let yawTorque = 0;
    let forwardPush = 0;
    let dragCoeff = 0;
    let submergedCount = 0;
    let sideMask = 0;

    const isDoggy = currentStyle.id === 'doggy';
    const isBreast = currentStyle.id === 'breaststroke';
    const isButterfly = currentStyle.id === 'butterfly';
    const isBackstroke = currentStyle.id === 'backstroke';

    const aFwd = isDoggy ? 0.54 : (isBreast ? 0.64 : Q.A_FWD);
    const swingRate = isDoggy ? 9.2 : Q.SWING;
    const pushRate = isDoggy ? 6.5 : Q.PUSH;

    for (let i = 0; i < 4; i++) {
      const cfg = LIMBS[i];
      const limb = state.limbs[i];
      const isPressed = !!pressedFlags[i];

      limb.lift += ((isPressed ? 1 : 0) - limb.lift) * Math.min(1, Q.LIFT_RATE * dt);

      const [jointH, jointVh] = getJointHeightAndVel(cfg);
      const wasSubmerged = limb.submerged;

      // Chi chìm trong nước khi bơi; chỉ nhấc cao khi vươn tay tới trước
      limb.submerged = !(isPressed && limb.a > 0.50 && limb.lift > 0.45);

      let rate;
      if (isPressed) {
        rate = Math.min(swingRate, (aFwd - limb.a) / dt);
        if (limb.a > aFwd) {
          rate = Math.max(-Q.RETURN, (aFwd - limb.a) / dt);
        }
      } else {
        rate = Math.max(-(limb.submerged ? pushRate : Q.RETURN), (Q.A_BACK - limb.a) / dt);
      }

      limb.a += rate * dt;
      limb.da = rate;
      limb.load = 0;

      if (limb.submerged) {
        const waterDepth = Math.max(0, 1.18 - jointH * 0.95);
        const supportForce = Math.max(0, Q.K * waterDepth - Q.C * jointVh);
        limb.load = Math.max(0.65, supportForce / 9.8);
        submergedCount++;
        sideMask |= cfg.z < 0 ? 1 : 2;

        totalLift += supportForce * 0.25;

        // Mô-men xoay từ chi được triệt giảm để không làm lật người nhảm nhí:
        pitchTorque += supportForce * (cfg.x - Q.COM) * 0.08;
        rollTorque -= supportForce * cfg.z * 0.08;

        const clampedLoad = Math.min(1.5, limb.load);
        if (isPressed) {
          dragCoeff += Q.SLIDE * clampedLoad;
        } else {
          // LỰC ĐẨY THỦY ĐỘNG KHI QUẠT NƯỚC:
          const strokeSpeed = Math.max(0, -cfg.len * Math.cos(limb.a) * rate);
          const styleMult = cfg.front ? currentStyle.armThrustMult : currentStyle.legThrustMult;
          const push = Q.TRACTION * styleMult * clampedLoad * strokeSpeed;
          forwardPush += push;
          dragCoeff += 1.0 * clampedLoad;

          if (strokeSpeed > 0.08) {
            // Nghiêng nhẹ tự nhiên khi quạt nước (10-15 độ):
            const pitchDir = cfg.front ? 0.35 : -0.30;
            pitchTorque += pitchDir * push * 0.12;

            const rollDir = cfg.z < 0 ? 1 : -1;
            rollTorque += rollDir * push * 0.15;
            yawTorque += rollDir * push * 0.08;
          }
        }

        if (!wasSubmerged || (!isPressed && Math.abs(limb.a - aFwd) < 0.08 && rate < -1.0)) {
          limb.tipX = state.x + cfg.x + cfg.len * Math.sin(limb.a);
          state.events.push({
            type: 'stroke',
            limb: i,
            front: cfg.front,
            power: clamp(Math.max(0.25, -jointVh * 0.6 + limb.load * 0.5), 0.2, 1),
            x: limb.tipX,
            z: state.z + cfg.z,
          });
        }
      }
    }

    // ĐỒNG BỘ CHÉO QWOP:
    const pair1 = state.limbs[0].da < -1.0 && state.limbs[3].da < -1.0;
    const pair2 = state.limbs[1].da < -1.0 && state.limbs[2].da < -1.0;
    const bothArms = state.limbs[0].da < -1.0 && state.limbs[1].da < -1.0;

    if (pair1 || pair2) {
      rollTorque *= 0.20;
      forwardPush *= 1.25;
      state.rhythmBonus = clamp(state.rhythmBonus + 3.0 * dt, 0, 1);
    } else if (bothArms && (isBreast || isButterfly)) {
      rollTorque *= 0.15;
      forwardPush *= 1.20;
      state.rhythmBonus = clamp(state.rhythmBonus + 2.5 * dt, 0, 1);
    } else {
      state.rhythmBonus = clamp(state.rhythmBonus - 1.5 * dt, 0, 1);
    }

    // Tốc độ tiến & lực cản nước
    const netAx = forwardPush - (2.0 + dragCoeff) * state.vx - Q.DRAG * state.vx * Math.abs(state.vx);
    state.vx = clamp(state.vx + netAx * dt, 0, 3.4);

    // LỰC NỔI ÁC-SI-MÉT CHỦ ĐẠO CỦA LỒNG NGỰC & THÂN MÌNH:
    const torsoBuoyancy = (REST_HEIGHT - state.y) * 36.0;
    state.vy += (totalLift - 9.8 + torsoBuoyancy + 9.8) * dt;
    state.y = clamp(state.y + state.vy * dt, REST_HEIGHT - 0.22, REST_HEIGHT + 0.18);

    // Xoay hướng mũi bơi (yaw)
    state.wy += (yawTorque - 3.5 * state.yaw - 3.0 * state.wy) * dt;
    state.yaw = clamp(state.yaw + state.wy * dt, -0.32, 0.32);

    state.x = Math.max(0, state.x + state.vx * Math.cos(state.yaw) * dt);
    const headingVz = state.vx * Math.sin(state.yaw);
    state.z = clamp(state.z + headingVz * dt, -1.12, 1.12);

    // Cọ phao phân làn: Ma sát nhẹ và nắn thẳng hướng bơi, không nảy bật
    if (Math.abs(state.z) >= 1.05) {
      const bSide = Math.sign(state.z);
      state.z = bSide * 1.05;
      state.yaw *= 0.60;
      state.roll *= 0.70;
      state.vx = Math.max(0.4, state.vx * 0.95);
      state.events.push({ type: 'buoyClatter', side: bSide, x: state.x });
    }

    // Phao Vịt Vàng ở 22m
    if (Math.abs(state.x - 22.0) < 0.75 && Math.abs(state.z - 0.25) < 0.65) {
      state.x = 21.2;
      state.vx = Math.max(0, state.vx * 0.5);
      state.yaw = state.z > 0.25 ? 0.20 : -0.20;
      state.events.push({ type: 'duckBonk' });
    }

    // Luồng Nước Xoáy ở 45m
    if (Math.abs(state.x - 45.0) < 1.2 && Math.abs(state.z) < 0.55 && !state.turboUsed) {
      state.vx = Math.min(4.0, state.vx + 1.4);
      state.turboUsed = true;
      state.events.push({ type: 'turboBoost' });
    }

    // CÂN BẰNG NƯỚC VỮNG VÀNG: Nước nâng đỡ cơ thể nổi ngang bằng
    const pitchRighting = -22.0 * (state.pitch + 0.18 * state.wp);
    state.wp += (
      pitchTorque / Q.I_PITCH +
      pitchRighting -
      Q.ANG_DAMP * state.wp
    ) * dt;

    const buoyantRollRighting = -20.0 * (state.roll + 0.18 * state.wr);
    state.wr += (
      rollTorque / Q.I_ROLL +
      buoyantRollRighting -
      Q.ANG_DAMP * state.wr
    ) * dt;

    state.pitch += state.wp * dt;
    state.roll += state.wr * dt;

    // HƠI THỞ TỰ NHIÊN: Quạt tay, đạp chân hoặc nghiêng thở ngoi đầu lên hít O2
    const armIsStroking = (state.limbs[0].da < -0.8 || state.limbs[1].da < -0.8);
    const legIsKicking = (state.limbs[2].da < -1.0 || state.limbs[3].da < -1.0);
    const headUp = state.pitch > 0.05 || Math.abs(state.roll) > 0.12 || armIsStroking || legIsKicking || isBackstroke || isDoggy;
    state.mouthY = headUp ? 0.14 : -0.12;

    if (headUp) {
      const prevBreath = state.breath;
      state.breath = Math.min(1.0, state.breath + Q.BREATH_RECOVER * dt);
      state.isBreathing = true;
      if (prevBreath < 0.75 && breathSoundCooldown <= 0) {
        state.events.push({ type: 'inhale' });
        breathSoundCooldown = 0.9;
      }
    } else {
      state.isBreathing = false;
      const drain = Q.BREATH_DRAIN * currentStyle.breathDrainMult;
      state.breath = Math.max(0, state.breath - drain * dt);
    }

    if (breathSoundCooldown > 0) {
      breathSoundCooldown -= dt;
    }

    // KIỂM TRA LẬT NGỬA / CẮM ĐẦU / SẶC NƯỚC:
    if (Math.abs(state.roll) > Q.FALL_ROLL) {
      state.fallen = state.roll > 0 ? 'roll+' : 'roll-';
    } else if (state.pitch > Q.FALL_PITCH) {
      state.fallen = 'pitch+';
    } else if (state.pitch < -Q.FALL_PITCH) {
      state.fallen = 'pitch-';
    } else if (state.breath <= 0) {
      state.fallen = 'choke';
    }
  }

  return {
    state,
    setStyle,
    REST_HEIGHT,

    step(dt, pressedFlags) {
      if (state.fallen) return;
      accumulator = Math.min(accumulator + dt, 0.05);
      let count = 0;
      while (accumulator >= Q.STEP && !state.fallen && count < 5) {
        stepFixed(Q.STEP, pressedFlags);
        accumulator -= Q.STEP;
        count++;
      }
    },

    recover() {
      Object.assign(state, {
        vx: 0,
        y: REST_HEIGHT,
        vy: 0.15,
        z: clamp(state.z, -0.8, 0.8),
        vz: 0,
        yaw: 0,
        wy: 0,
        pitch: 0,
        wp: 0,
        roll: 0,
        wr: 0,
        breath: 1.0,
        isBreathing: true,
        rhythmBonus: 0,
        turboUsed: false,
        fallen: null,
      });
      for (const l of state.limbs) {
        Object.assign(l, {
          a: 0,
          da: 0,
          lift: 0,
          submerged: true,
          load: 0.6,
        });
      }
      accumulator = 0;
    },
  };
}
