/**
 * @file physics.js
 * @description Mô phỏng cơ học chất lỏng sóng sánh (Sloshing Fluid Dynamics) và động học di chuyển cho Bát Canh Bỏng Tay.
 * - Cơ chế mất thăng bằng tự nhiên: Không điều khiển sẽ tự nghiêng qua nghiêng lại ngày càng mạnh.
 * - Điều khiển cơ động 2 trục: Vừa nghiêng giữ cân bằng (F / J), vừa lạng lách trái/phải né chướng ngại vật.
 * - Phím Space: Rón rén bước chậm + Thổi phù phù làm nguội và dập tắt sóng sánh tức thì.
 */

import { SOUP_GAME_CONFIG, OBSTACLES } from './config.js';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function createSoupPhysics(config = SOUP_GAME_CONFIG) {
  const state = {
    // Vị trí không gian 3D (X: ngang hành lang, Z: dọc hành lang)
    posX: 0.0,           // -1.2m (rìa trái) đến +1.2m (rìa phải)
    dist: 0.0,           // 0m đến 50m (Z axis)
    time: 0.0,
    status: 'ready',     // 'ready' | 'running' | 'won' | 'lost'
    failReason: '',      // 'empty' | 'timeup' | 'flipped'

    // Lượng canh và thống kê
    soupVolume: config.initialSoup,
    spillsTotal: 0,
    scaldCount: 0,
    stumbleCount: 0,
    topSpeed: 0.0,
    bonusTip: 0,         // Tiền boa thưởng tích lũy (VNĐ)

    // Động học bát sứ (Roll = Nghiêng trái/phải, Pitch = Nghiêng trước/sau)
    tiltRoll: 0.0,
    tiltRollVel: 0.0,
    tiltPitch: 0.0,
    tiltPitchVel: 0.0,

    // Sóng sánh chất lỏng trong lòng bát
    waveX: 0.0,
    vWaveX: 0.0,
    waveZ: 0.0,
    vWaveZ: 0.0,

    // Trạng thái tràn và bỏng
    spillIntensity: 0.0,
    spillSide: 0,
    spillPos: { x: 0, y: 0, z: 0 },
    isScalded: false,
    scaldTimer: 0.0,

    // Trạng thái điều khiển & di chuyển
    isBlowing: false,
    isTiptoeing: false,
    fPressed: false,
    jPressed: false,
    spacePressed: false,
    aPressed: false,
    dPressed: false,
    forwardSpeed: 0.0,
    lateralVel: 0.0,
    stumbleTimer: 0.0,

    // Chướng ngại vật đang kích hoạt
    activeObstacle: null,
    passedObstacles: new Set(),
  };

  function reset() {
    state.posX = 0.0;
    state.dist = 0.0;
    state.time = 0.0;
    state.status = 'ready';
    state.failReason = '';
    state.soupVolume = config.initialSoup;
    state.spillsTotal = 0;
    state.scaldCount = 0;
    state.stumbleCount = 0;
    state.topSpeed = 0.0;
    state.bonusTip = 0;

    state.tiltRoll = 0.0;
    state.tiltRollVel = 0.0;
    state.tiltPitch = 0.0;
    state.tiltPitchVel = 0.0;

    state.waveX = 0.0;
    state.vWaveX = 0.0;
    state.waveZ = 0.0;
    state.vWaveZ = 0.0;

    state.spillIntensity = 0.0;
    state.spillSide = 0;
    state.isScalded = false;
    state.scaldTimer = 0.0;

    state.isBlowing = false;
    state.isTiptoeing = false;
    state.fPressed = false;
    state.jPressed = false;
    state.spacePressed = false;
    state.forwardSpeed = 0.0;
    state.lateralVel = 0.0;
    state.stumbleTimer = 0.0;

    state.activeObstacle = null;
    state.passedObstacles.clear();
  }

  function start() {
    reset();
    state.status = 'running';
  }

  function setInputs({ f = false, j = false, space = false, a = false, d = false }) {
    state.fPressed = f;
    state.jPressed = j;
    state.spacePressed = space;
    state.aPressed = a;
    state.dPressed = d;
    state.isBlowing = space;
    state.isTiptoeing = space;
  }

  function triggerJolt(magnitudeRoll, magnitudeWave) {
    state.tiltRollVel += magnitudeRoll;
    state.vWaveX += magnitudeWave;
    state.stumbleCount++;
    state.stumbleTimer = config.stumbleRecoveryTime;
  }

  function update(rawDt) {
    if (state.status !== 'running') return state;

    const dt = clamp(rawDt, 0.001, 0.04);
    state.time += dt;

    if (state.time >= config.maxTime) {
      state.status = 'lost';
      state.failReason = 'timeup';
      return state;
    }

    // 1. TỐC ĐỘ DI CHUYỂN TIẾN (Forward Speed)
    if (state.stumbleTimer > 0) {
      state.stumbleTimer = Math.max(0, state.stumbleTimer - dt);
      state.forwardSpeed = clamp(state.forwardSpeed - 4.5 * dt, 0.3, config.walkSpeed);
    } else if (state.isTiptoeing) {
      state.forwardSpeed = config.tiptoeSpeed;
    } else {
      state.forwardSpeed = config.walkSpeed;
    }

    state.dist += state.forwardSpeed * dt;
    const currentSpeedKmh = state.forwardSpeed * 3.6;
    if (currentSpeedKmh > state.topSpeed) {
      state.topSpeed = currentSpeedKmh;
    }

    // 2. DI CHUYỂN LẠNG LÁCH TRÁI / PHẢI (Chỉ khi bấm A/D hoặc Mũi tên, F & J chỉ dùng giữ thăng bằng tô phở!)
    let steerDir = 0.0;
    if (state.aPressed && !state.dPressed) steerDir = -1.0;
    else if (state.dPressed && !state.aPressed) steerDir = 1.0;

    const targetLateralVel = steerDir * 1.2;
    state.lateralVel += (targetLateralVel - state.lateralVel) * 8.0 * dt;
    state.posX += state.lateralVel * dt;
    // Tự động giữ nhân vật đi thẳng giữa hành lang nếu không cố ý lách A/D
    if (steerDir === 0.0) {
      state.posX += (0.0 - state.posX) * 1.5 * dt;
    }
    state.posX = clamp(state.posX, -1.15, 1.15);

    // 3. DAO ĐỘNG BƯỚC CHÂN VÀ MẤT THĂNG BẰNG TỰ NHIÊN (Natural Gait Sway & Instability)
    // Khi đi bình thường mà KHÔNG bấm F và J, bát phở sẽ tự động lắc lư chao đảo ngày càng mạnh
    const strideFreq = state.isTiptoeing ? 3.5 : (config.strideFreq || 2.5);
    const gaitPhase = state.time * strideFreq * Math.PI * 2;
    const gaitIntensity = state.isTiptoeing ? 0.10 : 1.0;

    // Lực lắc lư bước chân tự nhiên vừa vặn
    const naturalGaitTorque = (Math.sin(gaitPhase) * 4.6 + Math.sin(state.time * 0.95 + 1.2) * 2.2) * gaitIntensity;

    // 4. LỰC ĐIỀU KHIỂN CỔ TAY (Player Wrist Torque F & J)
    let userTorque = 0.0;
    const tiltPower = config.tiltTorque || 5.2;
    if (state.fPressed && !state.jPressed) {
      userTorque += tiltPower * 1.55;
    } else if (state.jPressed && !state.fPressed) {
      userTorque -= tiltPower * 1.55;
    }

    // 5. CƠ CHẾ CON LẮC NGƯỢC & HIỆU ỨNG MẶT THOÁNG CHẤT LỎNG (Free Surface Fluid Mass Shift)
    // Sóng nước dồn sang bên nào sẽ kéo bát phở tự nghiêng về bên đó vừa vặn
    const fluidMassTorque = state.waveX * 4.8;
    const gravityOverturn = state.tiltRoll * 4.0;
    const passiveWristSpring = -1.2 * state.tiltRoll;
    const dampingConstant = state.isTiptoeing ? 3.8 : 2.2;
    const passiveDamping = -dampingConstant * state.tiltRollVel;

    // 6. KIỂM TRA CHƯỚNG NGẠI VẬT DỌC ĐƯỜNG
    state.activeObstacle = null;
    let externalWind = 0.0;

    for (const obs of OBSTACLES) {
      const dMin = obs.dist - 0.7;
      const dMax = obs.dist + obs.span;

      if (state.dist >= dMin && state.dist <= dMax) {
        state.activeObstacle = obs;

        if (!state.passedObstacles.has(obs.id)) {
          if (obs.id === 'cat') {
            const hitCat = Math.abs(state.posX) < 0.50;
            if (hitCat) {
              if (!state.isTiptoeing) {
                state.passedObstacles.add(obs.id);
                triggerJolt(2.6, 3.6);
                state.activeObstacle.tripped = true;
              } else {
                state.activeObstacle.tiptoed = true;
              }
            }
          } else if (obs.id === 'puddle') {
            const onPuddle = state.posX < 0.35;
            if (onPuddle) {
              const slipDamp = state.isTiptoeing ? 0.25 : 1.0;
              const puddleSlip = Math.sin(state.time * 18.0) * 0.60 * slipDamp;
              userTorque += puddleSlip * 12.0;
              state.lateralVel += Math.cos(state.time * 18.0) * 0.9 * slipDamp;
            }
          } else if (obs.id === 'fan') {
            externalWind = (obs.windForce || -0.26) * 1.8;
          } else if (obs.id === 'lego') {
            const hitLego = state.posX > -0.15 && state.posX < 0.70;
            if (hitLego) {
              if (!state.isTiptoeing) {
                state.passedObstacles.add(obs.id);
                triggerJolt(-2.8, 4.0);
                state.activeObstacle.tripped = true;
              } else {
                state.activeObstacle.tiptoed = true;
              }
            }
          }
        }
      }
    }

    // 7. CẬP NHẬT GIA TỐC GÓC NGHIÊNG BÁT
    const rollTotalAcc =
      userTorque +
      naturalGaitTorque +
      gravityOverturn +
      fluidMassTorque +
      passiveWristSpring +
      passiveDamping +
      externalWind * 5.5;

    state.tiltRollVel += rollTotalAcc * dt;
    state.tiltRoll += state.tiltRollVel * dt;

    // Chống NaN bảo vệ hệ thống vật lý
    if (isNaN(state.tiltRoll)) {
      state.tiltRoll = 0.0;
      state.tiltRollVel = 0.0;
    }

    // Pitch (nhấp nhô theo nhịp chạy)
    const targetPitch = (state.forwardSpeed / config.walkSpeed) * 0.045;
    state.tiltPitch += (targetPitch - state.tiltPitch) * 5.0 * dt;
    if (isNaN(state.tiltPitch)) state.tiltPitch = 0.0;

    // Kiểm tra lật nhào bát canh (> 52 độ)
    if (Math.abs(state.tiltRoll) > 0.9) {
      state.status = 'lost';
      state.failReason = 'flipped';
      state.soupVolume = 0;
      return state;
    }

    // 8. CẬP NHẬT SÓNG SÁNH CHẤT LỎNG TRONG LÒNG TÔ PHỞ
    const currentDamping = state.isBlowing ? config.sloshDampingBlown : config.sloshDampingNormal;
    const omega = config.sloshFreq;

    const waveExcitationX = -state.tiltRollVel * 2.4 + naturalGaitTorque * 1.2 + externalWind * 7.0;
    const waveAccX = -2.0 * currentDamping * state.vWaveX - (omega * omega) * state.waveX + waveExcitationX;

    state.vWaveX += waveAccX * dt;
    state.waveX += state.vWaveX * dt;

    const waveAccZ = -2.0 * currentDamping * state.vWaveZ - (omega * omega) * state.waveZ;
    state.vWaveZ += waveAccZ * dt;
    state.waveZ += state.vWaveZ * dt;

    if (isNaN(state.waveX)) { state.waveX = 0; state.vWaveX = 0; }
    if (isNaN(state.waveZ)) { state.waveZ = 0; state.vWaveZ = 0; }

    state.waveX = clamp(state.waveX, -0.65, 0.65);
    state.waveZ = clamp(state.waveZ, -0.45, 0.45);

    // 9. TÍNH TOÁN ĐỘ TRÀN MÉP TÔ (Spill Dynamics)
    const effectiveTilt = state.tiltRoll + state.waveX;
    const absEffectiveTilt = Math.abs(effectiveTilt);

    state.spillIntensity = 0.0;
    state.spillSide = 0;
    state.isScalded = false;

    if (absEffectiveTilt > config.rimOverflowAngle && state.soupVolume > 0) {
      const overflowSeverity = (absEffectiveTilt - config.rimOverflowAngle) / config.rimOverflowAngle;
      state.spillIntensity = clamp(overflowSeverity, 0.15, 1.4);
      state.spillSide = effectiveTilt > 0 ? 1 : -1;

      const loss = state.spillIntensity * config.spillRateBase * 1.15 * dt;
      state.soupVolume = Math.max(0.0, state.soupVolume - loss);
      state.spillsTotal += dt;

      if (absEffectiveTilt > config.scaldThreshold && state.scaldTimer <= 0) {
        state.isScalded = true;
        state.scaldCount++;
        state.scaldTimer = 1.2;
        state.tiltRollVel += (state.spillSide === 1 ? -1 : 1) * 1.5;
      }
    }

    if (state.scaldTimer > 0) {
      state.scaldTimer = Math.max(0, state.scaldTimer - dt);
    }

    // 10. KIỂM TRA THẮNG / THUA
    if (state.soupVolume <= 0.05) {
      state.soupVolume = 0.0;
      state.status = 'lost';
      state.failReason = 'empty';
      return state;
    }

    if (state.dist >= config.courseLength) {
      state.dist = config.courseLength;
      if (state.soupVolume >= config.minWinSoup) {
        state.status = 'won';
      } else {
        state.status = 'lost';
        state.failReason = 'empty';
      }
      return state;
    }

    return state;
  }

  return {
    state,
    reset,
    start,
    setInputs,
    triggerJolt,
    update,
  };
}
