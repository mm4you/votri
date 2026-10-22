/**
 * @file synthEngine.js
 * @description Bộ tổng hợp âm thanh Procedural WebAudio 100% không cần file âm thanh ngoài.
 * Được thiết kế dùng chung cho mọi game trong Vô Tri Game Portal (Bơi, Chạy, Bò...).
 */

const rand = (min, max) => min + Math.random() * (max - min);

export function createSynthEngine({ isMuted = () => false } = {}) {
  let ctx = null;
  let masterGain = null;
  let reverbNode = null;
  let noiseBuffer = null;
  const curveCache = new Map();

  function initContext() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    ctx = new AudioCtx();
    const compressor = ctx.createDynamicsCompressor();
    masterGain = ctx.createGain();
    masterGain.gain.value = isMuted() ? 0 : 0.72;
    masterGain.connect(compressor).connect(ctx.destination);

    // Tạo buffer nhiễu trắng 2 giây dùng chung
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Tạo Impulse Response cho Reverb tự nhiên
    const irLen = Math.floor(ctx.sampleRate * 1.8);
    const irBuf = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const chData = irBuf.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        chData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2);
      }
    }
    reverbNode = ctx.createConvolver();
    reverbNode.buffer = irBuf;
    reverbNode.connect(masterGain);
  }

  function unlock() {
    if (!ctx) {
      initContext();
    } else if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  function getDistortionCurve(drive) {
    if (!curveCache.has(drive)) {
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) {
        const x = (i / 1023) * 2 - 1;
        curve[i] = Math.tanh(x * drive) / Math.tanh(drive);
      }
      curveCache.set(drive, curve);
    }
    return curveCache.get(drive);
  }

  function routeOutput(node, { drive = 0, wet = 0 }) {
    let current = node;
    if (drive > 0) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = getDistortionCurve(drive);
      shaper.oversample = '2x';
      current = current.connect(shaper);
    }
    const outGain = ctx.createGain();
    current.connect(outGain).connect(masterGain);
    if (wet > 0 && reverbNode) {
      const wetGain = ctx.createGain();
      wetGain.gain.value = wet;
      outGain.connect(wetGain).connect(reverbNode);
    }
    return outGain;
  }

  function createNoiseSource(startTime) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    src.start(startTime, Math.random() * 1.4);
    return src;
  }

  function createFilter(type, freq, q) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  function applyEnvelope(gainNode, startTime, peak, attack, dur) {
    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
  }

  function burst({
    dur = 0.4,
    freq = [1800, 250],
    filter = 'lowpass',
    q = 1,
    gain = 0.4,
    attack = 0.008,
    delay = 0,
    drive = 0,
    wet = 0,
  }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const src = createNoiseSource(t0);
    const flt = createFilter(filter, freq[0], q);
    flt.frequency.setValueAtTime(freq[0], t0);
    flt.frequency.exponentialRampToValueAtTime(Math.max(20, freq[1]), t0 + dur);
    const out = routeOutput(src.connect(flt), { drive, wet });
    applyEnvelope(out, t0, gain, attack, dur);
    src.stop(t0 + dur + 0.04);
  }

  function tone({
    type = 'sine',
    freq = [440, 440],
    dur = 0.2,
    gain = 0.25,
    attack = 0.005,
    delay = 0,
    drive = 0,
    wet = 0,
    lowpass = null,
  }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq[0], t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq[1]), t0 + dur);

    let chain = osc;
    if (lowpass) {
      const flt = createFilter('lowpass', lowpass[0], 1);
      flt.frequency.setValueAtTime(lowpass[0], t0);
      flt.frequency.exponentialRampToValueAtTime(lowpass[1], t0 + Math.max(attack, 0.06));
      chain = osc.connect(flt);
    }

    const out = routeOutput(chain, { drive, wet });
    applyEnvelope(out, t0, gain, attack, dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.04);
  }

  return {
    setMuted(muted) {
      if (masterGain && ctx) {
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.72, ctx.currentTime, 0.02);
      }
    },

    /** Tiếng quạt tay rẽ nước kèm bong bóng (Arm Stroke Splash) */
    strokeSplash({ power = 0.7, front = true, gain = 0.85 } = {}) {
      const p = 0.4 + power * 0.6;
      const pitchShift = front ? 1.0 : 0.82;
      // Tiếng nước rẽ mặt
      burst({
        dur: 0.14 + power * 0.12,
        freq: [2200 * pitchShift, 680 * pitchShift],
        filter: 'bandpass',
        q: 0.9,
        gain: 0.36 * p * gain,
        attack: 0.01,
        wet: 0.25,
      });
      // Tiếng đẩy nước trầm dưới sâu
      burst({
        dur: 0.28 + power * 0.18,
        freq: [950 * pitchShift, 180],
        filter: 'lowpass',
        q: 0.8,
        gain: 0.34 * p * gain,
        attack: 0.015,
        drive: 1.1,
        wet: 0.3,
      });
      // Các hạt bong bóng nổ lách tách
      const bubbleCount = 2 + Math.round(power * 4);
      for (let i = 0; i < bubbleCount; i++) {
        const f = rand(480, 1250) * pitchShift;
        tone({
          type: 'sine',
          freq: [f, f * rand(1.55, 2.25)],
          dur: rand(0.035, 0.075),
          gain: rand(0.035, 0.08) * gain,
          delay: rand(0.03, 0.24),
          wet: 0.25,
        });
      }
    },

    /** Tiếng hít hơi nhanh khi đầu nhô lên khỏi mặt nước */
    breathInhale({ gain = 0.55 } = {}) {
      burst({
        dur: 0.18,
        freq: [1200, 2400],
        filter: 'bandpass',
        q: 2.2,
        gain: 0.18 * gain,
        attack: 0.04,
        wet: 0.2,
      });
      tone({
        type: 'sine',
        freq: [520, 780],
        dur: 0.12,
        gain: 0.06 * gain,
        attack: 0.02,
      });
    },

    /** Tiếng sặc nước / chìm nghỉm (Glug Glug Choke) */
    chokeGlug({ gain = 0.9 } = {}) {
      tone({
        type: 'sawtooth',
        freq: [560, 140],
        dur: 0.42,
        gain: 0.14 * gain,
        lowpass: [1400, 320],
        wet: 0.35,
      });
      for (let i = 0; i < 6; i++) {
        const f = rand(320, 780);
        tone({
          type: 'sine',
          freq: [f, f * 1.9],
          dur: rand(0.06, 0.11),
          gain: rand(0.09, 0.16) * gain,
          delay: i * 0.075 + rand(0, 0.03),
          wet: 0.4,
        });
      }
      burst({
        dur: 0.45,
        freq: [1600, 220],
        filter: 'bandpass',
        q: 1.2,
        gain: 0.35 * gain,
        wet: 0.35,
      });
    },

    /** Tiếng ngoi lên mặt nước phục hồi (Recover Pop) */
    recoverPop({ gain = 0.8 } = {}) {
      tone({
        type: 'sine',
        freq: [280, 640],
        dur: 0.16,
        gain: 0.24 * gain,
        wet: 0.25,
      });
      this.strokeSplash({ power: 0.6, gain: 0.65 * gain });
    },

    /** Tiếng vỗ cánh phần phật (Wing Flap Whoosh) cho game Chim Béo */
    wingFlap({ power = 0.8, left = true, gain = 0.85 } = {}) {
      const pitchShift = left ? 1.05 : 0.94;
      burst({
        dur: 0.14 + power * 0.08,
        freq: [620 * pitchShift, 180 * pitchShift],
        filter: 'bandpass',
        q: 1.1,
        gain: 0.42 * power * gain,
        attack: 0.012,
        wet: 0.2,
      });
      tone({
        type: 'triangle',
        freq: [165 * pitchShift, 75 * pitchShift],
        dur: 0.11,
        gain: 0.22 * power * gain,
        attack: 0.008,
      });
    },

    /** Tiếng cắm mỏ xuống đất / tiền đình (Faceplant / Dizzy Boing) */
    birdCrash({ dizzy = false, gain = 0.9 } = {}) {
      if (dizzy) {
        for (let i = 0; i < 5; i++) {
          const f = 420 + (i % 2) * 180;
          tone({
            type: 'sine',
            freq: [f, f * 1.25],
            dur: 0.09,
            gain: 0.14 * gain,
            delay: i * 0.075,
            wet: 0.35,
          });
        }
      } else {
        burst({
          dur: 0.32,
          freq: [950, 65],
          filter: 'lowpass',
          gain: 0.65 * gain,
          drive: 1.8,
        });
        tone({
          type: 'sine',
          freq: [140, 42],
          dur: 0.28,
          gain: 0.55 * gain,
        });
        // Tiếng "quạc" ngố tàu khi cắm mỏ
        tone({
          type: 'sawtooth',
          freq: [380, 240],
          dur: 0.16,
          gain: 0.14 * gain,
          delay: 0.04,
          lowpass: [1200, 450],
        });
        // Tiếng chít éc hoạt hình khi bẹp dí
        tone({
          type: 'sine',
          freq: [820, 260],
          dur: 0.22,
          gain: 0.32 * gain,
          delay: 0.02,
        });
      }
    },

    /** Tiếng kèn chiến thắng khi chạm đích 50m */
    fanfare({ gain = 0.9 } = {}) {
      const brassNote = (f, delay, dur, g) => {
        for (const detune of [1, 1.006]) {
          tone({
            type: 'sawtooth',
            freq: [f * detune, f * detune],
            dur,
            gain: g,
            attack: 0.025,
            delay,
            lowpass: [500, 3200],
            wet: 0.35,
          });
        }
      };
      [392, 392, 392].forEach((f, idx) => brassNote(f, idx * 0.11, 0.1, 0.09 * gain));
      [440, 494].forEach((f, idx) => brassNote(f, 0.33 + idx * 0.11, 0.1, 0.09 * gain));
      const chordTime = 0.55;
      for (const f of [523.25, 659.25, 783.99, 1046.5]) {
        brassNote(f, chordTime, 1.35, 0.075 * gain);
      }
      brassNote(130.8, chordTime, 1.35, 0.11 * gain);
    },

    /** Tiếng "bụp... boing!" hoạt hình siêu bựa khi bắn trứng phản lực cứu nguy */
    eggPop({ gain = 0.9 } = {}) {
      tone({
        type: 'sine',
        freq: [320, 880],
        dur: 0.18,
        gain: 0.45 * gain,
      });
      burst({
        dur: 0.15,
        freq: [220, 950],
        filter: 'highpass',
        gain: 0.35 * gain,
      });
    },

    /** Tiếng trượt / va chạm nhẹ */
    slipWarning({ gain = 0.7 } = {}) {
      tone({
        type: 'sine',
        freq: [620, 280],
        dur: 0.12,
        gain: 0.25 * gain,
      });
    },

    /** Tiếng vịt cao su bóp chít éc vui nhộn khi đụng phao vịt */
    duckSqueak({ gain = 0.85 } = {}) {
      tone({
        type: 'sine',
        freq: [980, 1380],
        dur: 0.13,
        gain: 0.32 * gain,
      });
      tone({
        type: 'sawtooth',
        freq: [460, 580],
        dur: 0.15,
        gain: 0.18 * gain,
        delay: 0.04,
        lowpass: [1400, 900],
      });
    },

    /** Tiếng phụt nước tăng tốc cực đã khi bơi qua vòng xoáy bọt */
    turboBoost({ gain = 0.85 } = {}) {
      burst({
        dur: 0.45,
        freq: [350, 1400],
        filter: 'bandpass',
        gain: 0.55 * gain,
        drive: 1.2,
      });
      tone({
        type: 'sine',
        freq: [280, 720],
        dur: 0.36,
        gain: 0.38 * gain,
      });
    },

    /** Tiếng sóng canh sánh chao đảo trong bát sứ (Soup Slosh) */
    soupSlosh({ intensity = 0.5, gain = 0.75 } = {}) {
      const p = Math.max(0.2, Math.min(1.2, intensity));
      burst({
        dur: 0.18 + p * 0.12,
        freq: [780, 260],
        filter: 'bandpass',
        q: 1.4,
        gain: 0.28 * p * gain,
        attack: 0.02,
        wet: 0.25,
      });
      tone({
        type: 'sine',
        freq: [240 * (1 + p * 0.3), 160],
        dur: 0.14,
        gain: 0.18 * p * gain,
        attack: 0.015,
      });
    },

    /** Tiếng canh nóng tràn đổ xuống sàn xèo xèo bốc khói (Soup Spill & Sizzle) */
    soupSpill({ intensity = 0.7, gain = 0.85 } = {}) {
      const p = Math.max(0.3, Math.min(1.0, intensity));
      // Giọt nước văng toé
      burst({
        dur: 0.22,
        freq: [1600, 450],
        filter: 'bandpass',
        q: 1.1,
        gain: 0.4 * p * gain,
        attack: 0.01,
        wet: 0.3,
      });
      // Tiếng xèo xèo bốc hơi trên nền gỗ nóng
      burst({
        dur: 0.35 * p,
        freq: [3800, 2200],
        filter: 'highpass',
        q: 2.2,
        gain: 0.24 * p * gain,
        attack: 0.03,
        drive: 1.1,
        delay: 0.05,
      });
      // Giọt bắn lách tách
      tone({
        type: 'sine',
        freq: [680, 920],
        dur: 0.06,
        gain: 0.15 * p * gain,
        wet: 0.2,
      });
    },

    /** Tiếng bỏng rát kêu réo hài hước khi nước canh sôi bắn vào ngón tay (Scald Burn) */
    scaldBurn({ gain = 0.85 } = {}) {
      // Tiếng réo hài hước "Ái da!" trượt âm cao
      tone({
        type: 'sawtooth',
        freq: [380, 920],
        dur: 0.28,
        gain: 0.22 * gain,
        lowpass: [1600, 600],
        wet: 0.3,
      });
      tone({
        type: 'sine',
        freq: [640, 1100],
        dur: 0.25,
        gain: 0.25 * gain,
      });
    },

    /** Tiếng thổi phù phù làm nguội và dịu sóng canh (Blow Cool) */
    blowCool({ gain = 0.65 } = {}) {
      burst({
        dur: 0.32,
        freq: [1400, 750],
        filter: 'bandpass',
        q: 2.5,
        gain: 0.22 * gain,
        attack: 0.06,
        wet: 0.15,
      });
    },

    /** Tiếng vấp chân loạng choạng (Trip Stumble) */
    obstacleTrip({ gain = 0.85 } = {}) {
      tone({
        type: 'triangle',
        freq: [190, 85],
        dur: 0.18,
        gain: 0.45 * gain,
      });
      burst({
        dur: 0.25,
        freq: [550, 120],
        filter: 'lowpass',
        gain: 0.5 * gain,
        drive: 1.4,
      });
      tone({
        type: 'sine',
        freq: [480, 220],
        dur: 0.15,
        gain: 0.2 * gain,
        delay: 0.04,
      });
    },

    /** Tiếng mèo kêu ngơ ngác khi bị bước suýt trúng (Cat Meow) */
    catMeow({ gain = 0.75 } = {}) {
      tone({
        type: 'sawtooth',
        freq: [620, 880],
        dur: 0.18,
        gain: 0.18 * gain,
        lowpass: [1800, 1200],
      });
      tone({
        type: 'sine',
        freq: [880, 520],
        dur: 0.22,
        gain: 0.18 * gain,
        delay: 0.15,
      });
    },
  };
}
