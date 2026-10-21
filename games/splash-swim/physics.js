/**
 * @file physics.js
 * @description Bộ giải vật lý Bơi 240Hz — Cân bằng tốc độ chuẩn xác:
 * - Tốc độ bơi tối đa được khống chế ở mức thể thao thực tế: ~1.8 - 2.6 m/s (chạy nước rút ~3.0 m/s).
 *   Hoàn thành 100m mất khoảng 38s - 55s tùy nhịp điệu (không còn hiện tượng phóng vèo 1 phát về đích).
 * - Lực cản nước (Drag) tỉ lệ thực tế theo lực đẩy, giữ độ lướt nước đằm tay và tự nhiên.
 * - Cơ chế thở tự nhiên theo chu kỳ sải tay, lượng O2 cân bằng chuẩn xác.
 */

import { LIMBS, SWIM_STYLES } from './config.js?v=15';

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const Q = {
  STEP: 1 / 240,
  A_FWD: 0.74,
  A_BACK: -0.18,
  SWING: 7.2,
  PUSH: 5.4,
  RETURN: 5.6,
  LIFT: 0.35,
  LIFT_RATE: 11.0,
  K: 68,
  C: 9.0,
  TRACTION: 6.8,    // Lực đẩy thể thao vừa vặn, nhịp nhàng
  SLIDE: 1.2,       // Lực cản khi giữ phím vươn tay
  DRAG: 0.38,       // Lực cản nước cơ bản
  I_PITCH: 0.38,
  I_ROLL: 0.088,    // Quán tính ngang đằm: nghiêng từ từ, dễ giữ nhịp
  TIP: 6.8,         // Lực xoắn nghiêng vừa phải, vui nhộn nhưng không lật gắt
  TIP_PITCH: 2.2,
  BALANCE: 96,      // Cân bằng vững vàng
  BAL4: 76,
  BAL2: 32.0,       // Thăng bằng tốt khi đổi cặp chéo 2 chi
  REAR: 0.36,
  LEG_I: 0.008,
  COM: 0.06,
  ANG_DAMP: 2.8,
  FALL_ROLL: 1.05,  // ~60 độ nghiêng ngang mới bị lật
  FALL_PITCH: 0.95, // ~54 độ chúi/ngửa mới bị cắm đầu
  BREATH_DRAIN: 0.045, // O2 dồi dào (~22 giây lặn liên tục)
  BREATH_RECOVER: 2.2, // Hồi O2 nhanh khi đầu nhô lên mặt nước
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
    z: 0,          // Lệch trái/phải trong làn bơi (-1.25m -> +1.25m)
    vz: 0,
    yaw: 0,        // Góc ngoáy thân trái/phải khi quạt lệch
    wy: 0,
    pitch: 0,
    wp: 0,
    roll: 0,
    wr: 0,
    breath: 1.0,
    isBreathing: true,
    mouthY: 0.05,
    rhythmBonus: 0,
    limbs: LIMBS.map(() => ({
      a: 0,
      da: 0,
      lift: 0,
      submerged: true,
      load: 0.25,
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
    let accelImpulseSum = 0;
    let activeStrokeEffort = 0;

    const isDoggy = currentStyle.id === 'doggy';
    const isBreast = currentStyle.id === 'breaststroke';
    const isButterfly = currentStyle.id === 'butterfly';
    const isBackstroke = currentStyle.id === 'backstroke';

    const aFwd = isDoggy ? 0.50 : (isBreast ? 0.60 : Q.A_FWD);
    const swingRate = isDoggy ? 8.8 : Q.SWING;
    const pushRate = isDoggy ? 6.0 : Q.PUSH;

    for (let i = 0; i < 4; i++) {
      const cfg = LIMBS[i];
      const limb = state.limbs[i];
      const isPressed = !!pressedFlags[i];

      limb.lift += ((isPressed ? 1 : 0) - limb.lift) * Math.min(1, Q.LIFT_RATE * dt);

      const effectiveReach = (cfg.len - Q.LIFT * limb.lift) * Math.cos(limb.a);
      const [jointH, jointVh] = getJointHeightAndVel(cfg);
      const wasSubmerged = limb.submerged;

      limb.submerged = effectiveReach >= jointH * 0.68;

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
      accelImpulseSum += rate - limb.da;
      limb.da = rate;
      limb.load = 0;

      if (Math.abs(rate) > 0.4) {
        activeStrokeEffort += 0.25;
      }

      if (limb.submerged) {
        const supportForce = Math.max(0, Q.K * (effectiveReach - jointH * 0.68) - Q.C * jointVh);
        limb.load = supportForce / 9.8;
        submergedCount++;
        sideMask |= cfg.z < 0 ? 1 : 2;

        totalLift += supportForce;
        pitchTorque += supportForce * (cfg.x - Q.COM) * Math.cos(state.pitch);
        rollTorque -= supportForce * cfg.z * Math.cos(state.roll);

        const clampedLoad = Math.min(1.5, limb.load);
        if (isPressed) {
          dragCoeff += Q.SLIDE * clampedLoad;
          pitchTorque -= 0.14 * clampedLoad;
        } else {
          const strokeSpeed = -cfg.len * Math.cos(limb.a) * rate;
          const styleMult = cfg.front ? currentStyle.armThrustMult : currentStyle.legThrustMult;
          const push = Q.TRACTION * styleMult * clampedLoad * strokeSpeed;
          forwardPush += push;
          // Lực cản nước đối kháng thực tế, giữ tốc độ trong tầm kiểm soát
          dragCoeff += 5.2 * clampedLoad;

          if (strokeSpeed > 0.08) {
            yawTorque += -cfg.z * push * 0.32;
            rollTorque += -cfg.z * push * 0.12;
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

    // Nhịp điệu đồng bộ (Rhythm Bonus)
    const bothArmsPull = state.limbs[0].da < -1.1 && state.limbs[1].da < -1.1;
    const bothLegsKick = state.limbs[2].da < -1.1 && state.limbs[3].da < -1.1;
    const diag1 = state.limbs[0].da < -1.1 && state.limbs[3].da < -1.1;
    const diag2 = state.limbs[1].da < -1.1 && state.limbs[2].da < -1.1;

    if (currentStyle.syncBonusType === 'paired' && (bothArmsPull || bothLegsKick)) {
      forwardPush *= 1.18;
      state.rhythmBonus = clamp(state.rhythmBonus + 2.0 * dt, 0, 1);
    } else if (currentStyle.syncBonusType === 'diagonal' && (diag1 || diag2)) {
      forwardPush *= 1.15;
      state.rhythmBonus = clamp(state.rhythmBonus + 2.0 * dt, 0, 1);
    } else if (isDoggy && activeStrokeEffort > 0.4) {
      forwardPush *= 1.10;
      state.rhythmBonus = clamp(state.rhythmBonus + 1.8 * dt, 0, 1);
    } else {
      state.rhythmBonus = clamp(state.rhythmBonus - 1.2 * dt, 0, 1);
    }

    // Gia tốc tịnh tiến & Lực cản nước cân bằng chuẩn:
    // Tốc độ bình thường ~1.6 - 2.2 m/s; bơi nước rút nhịp chuẩn đạt tối đa ~2.7 m/s.
    const netAx = forwardPush - (2.4 + dragCoeff) * state.vx - Q.DRAG * state.vx * Math.abs(state.vx);
    state.vx = clamp(state.vx + netAx * dt, 0, 3.1);
    state.vy += (totalLift - 9.8) * dt;
    state.y += state.vy * dt;

    // Ngoáy thân trái/phải mượt mà
    state.wy += (yawTorque - 4.5 * state.yaw - 2.8 * state.wy) * dt;
    state.yaw = clamp(state.yaw + state.wy * dt, -0.42, 0.42);

    state.x = Math.max(0, state.x + state.vx * Math.cos(state.yaw) * dt);
    state.z = clamp(state.z + state.vx * Math.sin(state.yaw) * dt, -1.25, 1.25);

    // Cân bằng Pitch (chúi/ngửa)
    pitchTorque += Q.REAR * netAx * state.y;
    const recoilScale = isButterfly ? 0.45 : 0.85;
    state.wp -= (Q.LEG_I * recoilScale * accelImpulseSum) / Q.I_PITCH;
    state.wp += (
      pitchTorque / Q.I_PITCH +
      Q.TIP_PITCH * Math.sin(state.pitch) -
      5.2 * state.pitch -
      Q.ANG_DAMP * state.wp
    ) * dt;

    // Cân bằng Roll (nghiêng ngang): Nước luôn có lực đẩy Ác-si-mét nâng đỡ cơ thể
    const rollStabilizer = sideMask === 3
      ? [0, 0, Q.BAL2, Q.BALANCE, Q.BAL4][submergedCount] * currentStyle.rollStabilityMult
      : 14.5;

    // Lực tự phục hồi cân bằng tự nhiên của nước (Keel effect)
    const buoyantRighting = -12.0 * state.roll;

    state.wr += (
      (rollTorque + buoyantRighting) / Q.I_ROLL +
      Q.TIP * Math.sin(state.roll) -
      rollStabilizer * (state.roll + 0.22 * state.wr) -
      Q.ANG_DAMP * state.wr
    ) * dt;

    state.pitch += state.wp * dt;
    state.roll += state.wr * dt;

    // TÍNH TOÁN ĐỘ CAO MŨI / MIỆNG ĐỂ LẤY HƠI (BREATHING):
    let isHeadAboveWater = false;

    if (isBackstroke) {
      isHeadAboveWater = Math.abs(state.roll) < 0.95;
    } else if (isDoggy) {
      isHeadAboveWater = state.pitch > -0.35 && Math.abs(state.roll) < 0.85;
    } else {
      const strokeLift = (isBreast || isButterfly)
        ? (bothArmsPull ? 0.28 : 0.08)
        : Math.abs(state.roll) * 0.22;
      const headHeight = (state.y - REST_HEIGHT) + 0.45 * Math.sin(state.pitch) + strokeLift;
      isHeadAboveWater = headHeight > -0.12 && Math.abs(state.roll) < 0.82;
    }

    state.mouthY = isHeadAboveWater ? 0.12 : -0.15;

    if (isHeadAboveWater) {
      const prevBreath = state.breath;
      state.breath = Math.min(1.0, state.breath + Q.BREATH_RECOVER * dt);
      state.isBreathing = true;
      if (prevBreath < 0.65 && breathSoundCooldown <= 0) {
        state.events.push({ type: 'inhale' });
        breathSoundCooldown = 1.0;
      }
    } else {
      state.isBreathing = false;
      const drain = (Q.BREATH_DRAIN + activeStrokeEffort * 0.015) * currentStyle.breathDrainMult;
      state.breath = Math.max(0, state.breath - drain * dt);
    }

    if (breathSoundCooldown > 0) {
      breathSoundCooldown -= dt;
    }

    // Kiểm tra lật ngửa / cắm đầu / hết hơi
    if (Math.abs(state.roll) > Q.FALL_ROLL) {
      state.fallen = state.roll > 0 ? 'roll+' : 'roll-';
    } else if (Math.abs(state.pitch) > Q.FALL_PITCH) {
      state.fallen = state.pitch > 0 ? 'pitch+' : 'pitch-';
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
      accumulator += dt;
      while (accumulator >= Q.STEP && !state.fallen) {
        stepFixed(Q.STEP, pressedFlags);
        accumulator -= Q.STEP;
      }
    },

    recover() {
      Object.assign(state, {
        vx: 0,
        y: REST_HEIGHT,
        vy: 0,
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
        fallen: null,
      });
      for (const l of state.limbs) {
        Object.assign(l, {
          a: 0,
          da: 0,
          lift: 0,
          submerged: true,
          load: 0.25,
        });
      }
      accumulator = 0;
    },
  };
}
