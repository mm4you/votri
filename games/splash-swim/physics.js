/**
 * @file physics.js
 * @description Bộ giải vật lý Bơi lội Thủy động lực học 120Hz — Cực kỳ cuốn hút & Đã tay:
 * 1. Thủy động lực sải tay (Catch & Pull Thrust):
 *    - Quạt tay (O, P) vươn bắt nước và kéo mạnh về sau tạo phản lực tiến vọt ~2.2 - 2.8 m/s.
 *    - Đạp chân (Q, W) duy trì trớn lướt nước và giữ hông nổi cao.
 *    - Nhịp bơi so le (Trái - Phải - Trái - Phải) kích hoạt "Nhịp Thủy Động", bơi nhanh và lướt mượt mà!
 * 2. Lạng lách 3D chân thực (Smooth Hydrodynamic Heading):
 *    - Quạt lệch 1 bên sẽ bẻ góc mũi bơi (yaw) nhẹ nhàng 2-4 độ để lượn qua trái/phải êm ái.
 *    - TUYỆT ĐỐI KHÔNG BỊ NẢY VĂNG SIÊU TỐC: Cọ vào phao phân làn chỉ bị giảm tốc nhẹ và tự nắn thẳng hướng!
 * 3. Hơi thở tự nhiên (Breath & O2 Rhythm):
 *    - Mỗi sải quạt tay hoặc đạp chân ngoi đầu lên sẽ tự động hít một hơi O2 căng tràn (kèm âm thanh hít thở).
 *    - Nín thở lướt nước được ~14s; bơi đều đặn thì O2 luôn dồi dào, không lo ngạt thở bất tử!
 */

import { LIMBS, SWIM_STYLES } from './config.js?v=21';

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const Q = {
  STEP: 1 / 120,
  A_FWD: 0.74,
  A_BACK: -0.18,
  SWING: 7.2,
  PUSH: 5.4,
  RETURN: 5.6,
  LIFT: 0.35,
  LIFT_RATE: 11.0,
  K: 68,
  C: 9.0,
  TRACTION: 12.0,   // Lực đẩy thủy lực mạnh mẽ, sải tay xé nước cực đã
  SLIDE: 0.5,       // Lực cản khi vươn tay
  DRAG: 0.20,       // Lực cản nước cơ bản
  I_PITCH: 0.38,
  I_ROLL: 0.088,
  TIP: 4.8,         // Chao đảo vui nhộn nhưng không lật gắt
  TIP_PITCH: 1.8,
  BALANCE: 96,
  BAL4: 76,
  BAL2: 32.0,
  REAR: 0.36,
  LEG_I: 0.008,
  COM: 0.06,
  ANG_DAMP: 3.2,
  FALL_ROLL: 1.30,  // ~74 độ nghiêng ngang mới bị lật
  FALL_PITCH: 1.48, // ~85 độ chúi dựng đứng mới bị cắm đầu
  BREATH_DRAIN: 0.065,  // Nín thở được ~15s nếu lướt không quạt tay
  BREATH_RECOVER: 2.2,  // Hồi phục O2 nhanh chóng khi quạt tay/đạp chân ngoi thở
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
    z: 0,          // Lệch trái/phải trong làn bơi (-1.08m -> +1.08m)
    vz: 0,
    yaw: 0,        // Góc quay mũi người bơi (-0.28 rad -> +0.28 rad)
    wy: 0,
    pitch: 0,
    wp: 0,
    roll: 0,
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
    let accelImpulseSum = 0;
    let activeStrokeEffort = 0;

    const isDoggy = currentStyle.id === 'doggy';
    const isBreast = currentStyle.id === 'breaststroke';
    const isButterfly = currentStyle.id === 'butterfly';
    const isBackstroke = currentStyle.id === 'backstroke';

    const aFwd = isDoggy ? 0.52 : (isBreast ? 0.62 : Q.A_FWD);
    const swingRate = isDoggy ? 8.8 : Q.SWING;
    const pushRate = isDoggy ? 6.0 : Q.PUSH;

    for (let i = 0; i < 4; i++) {
      const cfg = LIMBS[i];
      const limb = state.limbs[i];
      const isPressed = !!pressedFlags[i];

      limb.lift += ((isPressed ? 1 : 0) - limb.lift) * Math.min(1, Q.LIFT_RATE * dt);

      const [jointH, jointVh] = getJointHeightAndVel(cfg);
      const wasSubmerged = limb.submerged;

      // Chi chìm trong nước khi quạt; chỉ nhấc cao khỏi nước khi giơ cao vung tay tới trước
      limb.submerged = !(isPressed && limb.a > 0.48 && limb.lift > 0.45);

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
        const waterDepth = Math.max(0, 1.18 - jointH * 0.95);
        const supportForce = Math.max(0, Q.K * waterDepth - Q.C * jointVh);
        limb.load = Math.max(0.65, supportForce / 9.8);
        submergedCount++;
        sideMask |= cfg.z < 0 ? 1 : 2;

        totalLift += supportForce;
        pitchTorque += supportForce * (cfg.x - Q.COM) * Math.cos(state.pitch);
        rollTorque -= supportForce * cfg.z * Math.cos(state.roll);

        const clampedLoad = Math.min(1.5, limb.load);
        if (isPressed) {
          dragCoeff += Q.SLIDE * clampedLoad;
          pitchTorque -= 0.10 * clampedLoad;
        } else {
          // Lực quạt nước đẩy tới
          const strokeSpeed = Math.max(0, -cfg.len * Math.cos(limb.a) * rate);
          const styleMult = cfg.front ? currentStyle.armThrustMult : currentStyle.legThrustMult;
          const push = Q.TRACTION * styleMult * clampedLoad * strokeSpeed;
          forwardPush += push;
          dragCoeff += 1.0 * clampedLoad;

          if (strokeSpeed > 0.08) {
            // Lực bẻ góc mũi bơi (yaw) êm ái:
            // Quạt chi trái (cfg.z < 0) hướng mũi sang phải (+yaw), quạt chi phải hướng mũi sang trái (-yaw)
            const steerDir = cfg.z < 0 ? 1 : -1;
            yawTorque += steerDir * (push * 0.08);
            rollTorque += steerDir * (push * 0.04);
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
      forwardPush *= 1.20;
      state.rhythmBonus = clamp(state.rhythmBonus + 2.2 * dt, 0, 1);
    } else if (currentStyle.syncBonusType === 'diagonal' && (diag1 || diag2)) {
      forwardPush *= 1.16;
      state.rhythmBonus = clamp(state.rhythmBonus + 2.2 * dt, 0, 1);
    } else if (isDoggy && activeStrokeEffort > 0.4) {
      forwardPush *= 1.12;
      state.rhythmBonus = clamp(state.rhythmBonus + 1.8 * dt, 0, 1);
    } else {
      state.rhythmBonus = clamp(state.rhythmBonus - 1.2 * dt, 0, 1);
    }

    // Gia tốc tịnh tiến & Lực cản nước cân bằng chuẩn thể thao (~2.2 - 2.8 m/s)
    const netAx = forwardPush - (2.2 + dragCoeff) * state.vx - Q.DRAG * state.vx * Math.abs(state.vx);
    state.vx = clamp(state.vx + netAx * dt, 0, 3.2);

    // Lực nâng mặt nước giữ thăng bằng độ sâu
    const buoyancyPush = (REST_HEIGHT - state.y) * 28.0;
    state.vy += (totalLift - 9.8 + buoyancyPush) * dt;
    state.y = clamp(state.y + state.vy * dt, REST_HEIGHT - 0.25, REST_HEIGHT + 0.18);

    // Góc mũi bơi (yaw) lượn êm ái và tự trả về thẳng
    state.wy += (yawTorque - 3.8 * state.yaw - 3.0 * state.wy) * dt;
    state.yaw = clamp(state.yaw + state.wy * dt, -0.32, 0.32);

    // Vị trí tiến X và vị trí ngang Z dịch chuyển êm theo hướng mũi bơi:
    state.x = Math.max(0, state.x + state.vx * Math.cos(state.yaw) * dt);
    // Vận tốc ngang hoàn toàn dựa vào góc mũi bơi, KHÔNG CÓ BẬT NHẢY SIÊU TỐC:
    const headingVz = state.vx * Math.sin(state.yaw);
    state.z = clamp(state.z + headingVz * dt, -1.15, 1.15);

    // Va chạm phao phân làn hồ bơi:
    // Cọ vào phao chỉ bị ma sát làm giảm nhẹ tốc độ và nắn mũi bơi thẳng lại, KHÔNG NẢY BẬT:
    if (Math.abs(state.z) >= 1.05) {
      const bSide = Math.sign(state.z);
      state.z = bSide * 1.05;
      state.yaw *= 0.65; // Nắn thẳng mũi bơi
      state.wy = -bSide * 0.4;
      state.vx = Math.max(0.4, state.vx * 0.96); // Giảm tốc nhẹ do ma sát với dây phao
      state.events.push({ type: 'buoyClatter', side: bSide, x: state.x });
    }

    // Chướng ngại vật trên đường bơi:
    // 1. Phao Vịt Vàng Khổng Lồ ở 22m (z ~ 0.25)
    if (Math.abs(state.x - 22.0) < 0.75 && Math.abs(state.z - 0.25) < 0.65) {
      state.x = 21.2;
      state.vx = Math.max(0, state.vx * 0.6);
      state.yaw = state.z > 0.25 ? 0.18 : -0.18;
      state.events.push({ type: 'duckBonk' });
    }

    // 2. Luồng Nước Xoáy Tăng Tốc Turbo ở 45m
    if (Math.abs(state.x - 45.0) < 1.2 && Math.abs(state.z) < 0.55 && !state.turboUsed) {
      state.vx = Math.min(3.8, state.vx + 1.2);
      state.turboUsed = true;
      state.events.push({ type: 'turboBoost' });
    }

    // 3. Vòng Xoáy Nước (Whirlpool) ở 68m (z ~ -0.4)
    if (Math.abs(state.x - 68.0) < 0.85 && Math.abs(state.z - (-0.4)) < 0.65) {
      state.yaw += 0.25;
      state.vx = Math.max(0.8, state.vx * 0.85);
      state.events.push({ type: 'whirlpool' });
    }

    // 4. Phao Hồng Hạc Flamingo ở 88m (z ~ 0.3)
    if (Math.abs(state.x - 88.0) < 0.75 && Math.abs(state.z - 0.3) < 0.65) {
      state.x = 87.2;
      state.vx = Math.max(0, state.vx * 0.6);
      state.yaw = state.z > 0.3 ? 0.18 : -0.18;
      state.events.push({ type: 'flamingoBonk' });
    }

    // Cân bằng Pitch (chúi/ngửa)
    pitchTorque += Q.REAR * netAx * (state.y - REST_HEIGHT);
    const recoilScale = isButterfly ? 0.45 : 0.85;
    state.wp -= (Q.LEG_I * recoilScale * accelImpulseSum) / Q.I_PITCH;

    const pitchRighting = -28.0 * (state.pitch + 0.18 * state.wp);

    state.wp += (
      (pitchTorque + pitchRighting) / Q.I_PITCH +
      Q.TIP_PITCH * Math.sin(state.pitch) -
      Q.ANG_DAMP * state.wp
    ) * dt;

    // Cân bằng Roll (nghiêng ngang):
    const rollStabilizer = sideMask === 3
      ? [0, 0, Q.BAL2, Q.BALANCE, Q.BAL4][submergedCount] * currentStyle.rollStabilityMult
      : 24.0;

    const buoyantRighting = -18.0 * state.roll;

    state.wr += (
      (rollTorque + buoyantRighting) / Q.I_ROLL +
      Q.TIP * Math.sin(state.roll) -
      rollStabilizer * (state.roll + 0.22 * state.wr) -
      Q.ANG_DAMP * state.wr
    ) * dt;

    state.pitch += state.wp * dt;
    state.roll += state.wr * dt;

    // TÍNH TOÁN LẤY HƠI TRỰC QUAN & CHÍNH XÁC:
    // Quạt tay hoặc đạp chân hoặc nghiêng người hoặc bơi ngửa/chó sẽ ngoi đầu lấy hơi
    const armIsStroking = (state.limbs[0].da < -0.8 || state.limbs[1].da < -0.8);
    const legIsKicking = (state.limbs[2].da < -1.0 || state.limbs[3].da < -1.0);
    const rollBreathing = Math.abs(state.roll) > 0.12;
    const isHeadAboveWater = armIsStroking || legIsKicking || rollBreathing || isBackstroke || isDoggy;
    state.mouthY = isHeadAboveWater ? 0.14 : -0.12;

    if (isHeadAboveWater) {
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
        vy: 0,
        z: 0,
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
