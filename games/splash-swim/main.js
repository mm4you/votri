/**
 * @file main.js
 * @description Vòng lặp chính Game #1: Kình Ngư Vô Tri (Splash-Stroke Swimmer - 100m Olympic).
 * - Góc nhìn mặc định: Chính diện Sau Lưng (Straight Behind-the-Back, không chéo)
 * - 5 Chế độ Kiểu Bơi: Bơi Sải, Bơi Bướm, Bơi Ếch, Bơi Chó, Bơi Ngửa (Có thể đổi ngay trên màn hình bắt đầu hoặc khi đang bơi)
 * - Nhân vật 3D .glb có xương thật (Michelle, Soldier, Cyber Bot) + Mũ bơi, Kính bơi, Chân vịt, Bàn quạt nước & Vòng màu phát sáng Q, W, O, P
 * - Vật lý 240Hz độ khó cao chuẩn Clip-Clop Horse: Lật ngửa / Chúi đầu / Sặc nước + Giãy giụa xoay vòng khi ngã.
 */

import * as THREE from '../../shared/vendor/three.module.js';
import { GAME_CONFIG, LIMBS, RANKS, SKINS, SWIM_STYLES } from './config.js?v=15';
import { createSwimPhysics } from './physics.js?v=15';
import { createSwimmerModel } from './swimmerModel.js?v=15';
import { createPoolScene } from './poolScene.js?v=15';
import { createSynthEngine } from '../../shared/audio/synthEngine.js?v=15';
import { createGameCache } from '../../shared/storage/portalCache.js?v=15';
import { GAMES } from '../../shared/ui/gameRegistry.js?v=15';
import { initSecurityGuard, createRateLimiter } from '../../shared/security/securityGuard.js?v=15';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

const cache = createGameCache('splash-swim', {
  skinId: 'male',
  styleId: 'freestyle',
  cameraMode: 'chase', // Mặc định Góc Nhìn Chính Diện Sau Lưng
  showGhost: true,
});

// Đảm bảo mặc định luôn là góc nhìn Chính Diện Sau Lưng ('chase') và kiểm tra skinId hợp lệ ('male' hoặc 'female')
const initSaved = cache.getSettings();
const validSkinId = SKINS.some((s) => s.id === initSaved.skinId) ? initSaved.skinId : 'male';
cache.updateSettings({ cameraMode: 'chase', skinId: validSkinId });

const stage = document.querySelector('.game-stage');
const q = (sel) => document.querySelector(sel);

const ui = {
  remain: q('[data-score="remain"]'),
  time: q('[data-time]'),
  chokes: q('[data-falls]'),
  styleHudNameVi: q('[data-hud-style-vi]'),
  styleHudNameEn: q('[data-hud-style-en]'),
  hudStylePicker: q('[data-hud-style-picker]'),
  breathCard: q('[data-breath-card]'),
  breathFill: q('[data-breath-fill]'),
  breathStatusVi: q('[data-breath-status-vi]'),
  breathStatusEn: q('[data-breath-status-en]'),
  hypoxiaOverlay: q('.game-hypoxia'),
  hud: q('[data-hud]'),
  screenStart: q('[data-screen="start"]'),
  screenResult: q('[data-screen="result"]'),
  stampFall: q('[data-stamp="fall"]'),
  stampFallVi: q('[data-stamp-fall-vi]'),
  stampFallEn: q('[data-stamp-fall-en]'),
  stampGoal: q('[data-stamp="goal"]'),
  getupBtn: q('[data-getup]'),
  camBtn: q('[data-cam-toggle]'),
  camLabelVi: q('[data-cam-vi]'),
  camLabelEn: q('[data-cam-en]'),
  muteBtn: q('.game-bar__mute'),
  langBtns: [...document.querySelectorAll('.lang__btn')],
  menuBtn: q('.game-bar__menu'),
  menuDialog: q('#game-menu'),
  menuList: q('[data-menu-games]'),
  padBtns: [0, 1, 2, 3].map((i) => q(`[data-limb="${i}"]`)),
  stylePicker: q('[data-style-picker]'),
  styleTipVi: q('[data-style-tip-vi]'),
  styleTipEn: q('[data-style-tip-en]'),
  skinPicker: q('[data-skin-picker]'),
  pbBadge: q('[data-pb-badge]'),
  newRecordBadge: q('[data-new-record]'),
  clearCacheBtn: q('[data-clear-cache]'),
  hints: Object.fromEntries(
    [...stage.querySelectorAll('[data-hint]')].map((el) => [el.dataset.hint, el])
  ),
};

let settings = cache.getSettings();

const security = initSecurityGuard({
  onDevToolsChange(isOpen) {
    if (isOpen && session.playing) {
      showHint('tip', 4.0);
    }
  },
});
const allowUiAction = createRateLimiter(10, 1000);

// ============================================================================
// 1. ĐA NGÔN NGỮ (i18n VIE - ENG), ÂM THANH & CHẾ ĐỘ CAMERA
// ============================================================================
function applyLang(lang) {
  const validLang = lang === 'en' ? 'en' : 'vi';
  document.documentElement.lang = validLang;
  for (const btn of ui.langBtns) {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === validLang));
  }
  cache.updateSettings({ lang: validLang });
  settings = cache.getSettings();
  renderMenuGames();
  updatePbDisplay();
}

const synth = createSynthEngine({
  isMuted: () => settings.muted,
});

function applyMute(muted) {
  if (muted) {
    document.documentElement.dataset.muted = '1';
  } else {
    delete document.documentElement.dataset.muted;
  }
  ui.muteBtn?.setAttribute('aria-pressed', String(muted));
  synth.setMuted(muted);
  cache.updateSettings({ muted });
  settings = cache.getSettings();
}

function applyCameraLabel() {
  const isChase = settings.cameraMode !== 'side';
  if (ui.camLabelVi) ui.camLabelVi.textContent = isChase ? 'Góc Sau Lưng' : 'Góc Ngang';
  if (ui.camLabelEn) ui.camLabelEn.textContent = isChase ? 'Behind View' : 'Side View';
}

applyLang(settings.lang || 'vi');
applyMute(!!settings.muted);
applyCameraLabel();

ui.muteBtn?.addEventListener('click', () => applyMute(!settings.muted));
for (const btn of ui.langBtns) {
  btn.addEventListener('click', () => applyLang(btn.dataset.lang));
}
ui.camBtn?.addEventListener('click', () => {
  const nextCam = settings.cameraMode === 'side' ? 'chase' : 'side';
  cache.updateSettings({ cameraMode: nextCam });
  settings = cache.getSettings();
  applyCameraLabel();
});

// ============================================================================
// 2. CHỌN KIỂU BƠI (5 MODES) & CHỌN NHÂN VẬT 3D (SKINS)
// ============================================================================
function renderMenuGames() {
  if (!ui.menuList) return;
  const lang = document.documentElement.lang;
  ui.menuList.innerHTML = GAMES.map((g) => {
    const isCurrent = g.id === 'splash-swim';
    const title = lang === 'en' ? g.titleEn : g.titleVi;
    const badge = lang === 'en' ? g.badgeEn : g.badgeVi;
    return `
      <li>
        <a class="game-menu__game" href="${g.path}" style="--hue:${g.hue}" ${isCurrent ? 'aria-current="page"' : ''}>
          <span class="dot" aria-hidden="true"></span>
          <span style="flex:1">${title}</span>
          <small style="font-size:11px;opacity:0.7">${badge}</small>
        </a>
      </li>
    `;
  }).join('');
}

function updateActiveStyleInfo() {
  const st = SWIM_STYLES.find((s) => s.id === settings.styleId) || SWIM_STYLES[0];
  if (ui.styleTipVi) ui.styleTipVi.textContent = st.tipVi;
  if (ui.styleTipEn) ui.styleTipEn.textContent = st.tipEn;
  if (ui.styleHudNameVi) ui.styleHudNameVi.textContent = st.nameVi.toUpperCase();
  if (ui.styleHudNameEn) ui.styleHudNameEn.textContent = st.nameEn.toUpperCase();
}

function selectSwimStyle(styleId) {
  cache.updateSettings({ styleId });
  settings = cache.getSettings();
  physics.setStyle(settings.styleId);
  renderStylePicker();
  updateActiveStyleInfo();
}

function renderStylePicker() {
  const currentStyleId = settings.styleId || 'freestyle';
  const chipsHtml = SWIM_STYLES.map((st) => {
    const active = st.id === currentStyleId;
    return `
      <button type="button" class="skin-chip ${active ? 'is-active' : ''}" data-style="${st.id}">
        <span class="dot"></span>
        <span class="t-vi" lang="vi">${st.nameVi}</span>
        <span class="t-en" lang="en">${st.nameEn}</span>
      </button>
    `;
  }).join('');

  if (ui.stylePicker) {
    ui.stylePicker.innerHTML = chipsHtml;
    ui.stylePicker.querySelectorAll('[data-style]').forEach((btn) => {
      btn.addEventListener('click', () => selectSwimStyle(btn.dataset.style));
    });
  }

  if (ui.hudStylePicker) {
    ui.hudStylePicker.innerHTML = chipsHtml;
    ui.hudStylePicker.querySelectorAll('[data-style]').forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        selectSwimStyle(btn.dataset.style);
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectSwimStyle(btn.dataset.style);
      });
    });
  }

  updateActiveStyleInfo();
}

// Phím tắt 1, 2, 3, 4, 5 để đổi nhanh 5 Kiểu Bơi ngay trong lúc đang bơi
window.addEventListener('keydown', (e) => {
  if (e.repeat || ui.menuDialog?.open) return;
  const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(e.code);
  if (idx !== -1 && SWIM_STYLES[idx]) {
    selectSwimStyle(SWIM_STYLES[idx].id);
  }
});

function renderSkinPicker() {
  if (!ui.skinPicker) return;
  ui.skinPicker.innerHTML = SKINS.map((s) => {
    const active = s.id === settings.skinId;
    const hex = '#' + s.capColor.toString(16).padStart(6, '0');
    return `
      <button type="button" class="skin-chip ${active ? 'is-active' : ''}" data-skin="${s.id}">
        <span class="dot" style="background:${hex}"></span>
        <span class="t-vi" lang="vi">${s.nameVi}</span>
        <span class="t-en" lang="en">${s.nameEn}</span>
      </button>
    `;
  }).join('');

  ui.skinPicker.querySelectorAll('[data-skin]').forEach((btn) => {
    btn.addEventListener('click', () => {
      cache.updateSettings({ skinId: btn.dataset.skin });
      settings = cache.getSettings();
      renderSkinPicker();
      rebuildSwimmerModel();
    });
  });
}

function updatePbDisplay() {
  if (!ui.pbBadge) return;
  const best = cache.getBestRecord();
  const lang = document.documentElement.lang;
  if (!best) {
    ui.pbBadge.textContent =
      lang === 'en'
        ? 'Personal Best (Browser Cache): None yet'
        : 'Kỷ lục lưu trên trình duyệt: Chưa có';
  } else {
    ui.pbBadge.textContent =
      lang === 'en'
        ? `Personal Best: ${best.time.toFixed(2)}s • Top ${best.topSpeedKmh} km/h (${best.chokes} fails)`
        : `Kỷ lục cá nhân: ${best.time.toFixed(2)}s • Đỉnh ${best.topSpeedKmh} km/h (${best.chokes} lần lật/sặc)`;
  }
}

ui.clearCacheBtn?.addEventListener('click', () => {
  cache.clearRecords();
  rebuildGhostModel();
  updatePbDisplay();
});

ui.menuBtn?.addEventListener('click', () => ui.menuDialog?.showModal());
ui.menuDialog?.addEventListener('click', (e) => {
  if (e.target === ui.menuDialog || e.target.closest('[data-action="close"]')) {
    ui.menuDialog.close();
  }
});

// ============================================================================
// 3. KHỞI TẠO THREE.JS SCENE & MODEL NHÂN VẬT 3D .GLB
// ============================================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 380);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.domElement.className = 'game-canvas';
stage.prepend(renderer.domElement);

const pool = createPoolScene(scene);

let swimmer = null;
let ghostSwimmer = null;
let physics = createSwimPhysics(settings.styleId || 'freestyle');

function rebuildSwimmerModel() {
  if (swimmer) {
    scene.remove(swimmer.root);
  }
  swimmer = createSwimmerModel({ skinId: settings.skinId, isGhost: false });
  scene.add(swimmer.root);
}

function rebuildGhostModel() {
  if (ghostSwimmer) {
    scene.remove(ghostSwimmer.root);
    ghostSwimmer = null;
  }
  const ghostData = cache.getGhostData();
  if (ghostData && ghostData.frames && ghostData.frames.length > 1) {
    ghostSwimmer = createSwimmerModel({
      skinId: ghostData.skinId || 'ocean',
      isGhost: true,
    });
    ghostSwimmer.root.visible = false;
    scene.add(ghostSwimmer.root);
  }
}

rebuildSwimmerModel();
rebuildGhostModel();
renderStylePicker();
renderSkinPicker();
updatePbDisplay();

const padEl = stage.querySelector('.game-pad');
function handleResize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  const padH = Math.min(padEl?.offsetHeight ?? 0, h * 0.45);
  camera.aspect = w / (h + padH);
  if (padH > 0) {
    camera.setViewOffset(w, h + padH, 0, padH, w, h);
  } else {
    camera.clearViewOffset();
  }
  camera.updateProjectionMatrix();
}
const resizeObs = new ResizeObserver(handleResize);
resizeObs.observe(stage);
if (padEl) resizeObs.observe(padEl);
handleResize();

// ============================================================================
// 4. QUẢN LÝ 4 NÚT (Q, W, O, P) & GIÃY GIỤA KHI LẬT/SẶC CHUẨN CLIP-CLOP HORSE
// ============================================================================
const session = {
  screen: 'start',
  playing: false,
  finished: false,
  finishTimer: 0,
  time: 0,
  chokes: 0,
  strokes: 0,
  topSpeed: 0,
  hintTimer: 0,
  failPose: null,
  ghostRecordFrames: [],
  nextGhostSampleTime: 0,
};

const isInputActive = () => session.playing && session.screen === 'playing';

function bindHoldButton(btnEl, keyCode) {
  const pointers = new Set();
  const keys = new Set();

  btnEl.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    pointers.add(e.pointerId);
    try {
      btnEl.setPointerCapture(e.pointerId);
    } catch {}
  });

  const releasePointer = (e) => pointers.delete(e.pointerId);
  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);
  window.addEventListener('blur', () => {
    pointers.clear();
    keys.clear();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === keyCode && !e.defaultPrevented && isInputActive()) {
      e.preventDefault();
      keys.add(e.code);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === keyCode) keys.delete(e.code);
  });

  return {
    get pressed() {
      return pointers.size > 0 || keys.size > 0;
    },
    reset() {
      pointers.clear();
      keys.clear();
    },
  };
}

const limbInputs = LIMBS.map((cfg, idx) => bindHoldButton(ui.padBtns[idx], cfg.key));

function showHint(name, duration = 2.6) {
  for (const [k, el] of Object.entries(ui.hints)) {
    el.hidden = k !== name;
  }
  session.hintTimer = name ? duration : 0;
}

function triggerStamp(el) {
  if (!el) return;
  el.hidden = true;
  void el.offsetWidth;
  el.hidden = false;
}

function showScreen(screenName) {
  session.screen = screenName;
  ui.screenStart.hidden = screenName !== 'start';
  ui.screenResult.hidden = screenName !== 'result';
  ui.hud.hidden = screenName === 'start';
}

function startGame() {
  if (!allowUiAction()) return;
  physics = createSwimPhysics(settings.styleId || 'freestyle');
  Object.assign(session, {
    screen: 'playing',
    playing: true,
    finished: false,
    finishTimer: 0,
    time: 0,
    chokes: 0,
    strokes: 0,
    topSpeed: 0,
    hintTimer: 0,
    failPose: null,
    ghostRecordFrames: [[0, 0, 0, 0, 0]],
    nextGhostSampleTime: GAME_CONFIG.GHOST_SAMPLE_INTERVAL,
  });

  for (const inp of limbInputs) inp.reset();
  ui.getupBtn.hidden = true;
  ui.stampFall.hidden = true;
  ui.stampGoal.hidden = true;
  if (ui.newRecordBadge) ui.newRecordBadge.hidden = true;

  if (ghostSwimmer) {
    ghostSwimmer.root.visible = true;
  }

  updateActiveStyleInfo();
  showScreen('playing');
  showHint('start', 4.2);
}

document.querySelectorAll('[data-action="start"]').forEach((btn) => {
  btn.addEventListener('click', startGame);
});
window.addEventListener('keydown', (e) => {
  if (
    e.code === 'Space' &&
    !e.repeat &&
    !ui.menuDialog?.open &&
    (session.screen === 'start' || session.screen === 'result')
  ) {
    e.preventDefault();
    startGame();
  }
});

// Xử lý khi bị Lật Ngửa / Chúi Đầu / Sặc Nước (Giống hệt ln() và un() của Clip-Clop Horse!)
function onSwimmerFail(reason) {
  session.chokes++;
  const s = physics.state;
  session.failPose = {
    reason,
    roll: s.roll,
    wr: s.wr,
    pitch: s.pitch,
    wp: s.wp,
    y: s.y - physics.REST_HEIGHT,
    z: s.z,
    yaw: s.yaw,
    vx: s.vx,
    w: 0,
    t: 0,
    landed: false,
    rise: 0,
    from: null,
    limbs: s.limbs.map((l) => ({ a: l.a, da: 0, lift: l.lift })),
  };

  if (reason === 'choke') {
    if (ui.stampFallVi) ui.stampFallVi.textContent = 'SẶC NƯỚC!!';
    if (ui.stampFallEn) ui.stampFallEn.textContent = 'GLUG GLUG!!';
    showHint('choke', Infinity);
  } else if (reason.startsWith('roll')) {
    if (ui.stampFallVi) ui.stampFallVi.textContent = 'LẬT NGỬA!!';
    if (ui.stampFallEn) ui.stampFallEn.textContent = 'TOPPLED!!';
    showHint('roll', Infinity);
  } else {
    if (ui.stampFallVi) ui.stampFallVi.textContent = 'CẮM ĐẦU!!';
    if (ui.stampFallEn) ui.stampFallEn.textContent = 'FLIPPED!!';
    showHint('pitch', Infinity);
  }

  triggerStamp(ui.stampFall);
  ui.getupBtn.hidden = false;
  synth.chokeGlug();
  pool.spawnSplash(s.x, s.z, 1.0);
}

function triggerRecover() {
  const fp = session.failPose;
  if (!fp || fp.rise > 0) return;
  fp.rise = 0.0001;
  fp.from = {
    roll: fp.roll,
    pitch: fp.pitch,
    y: fp.y,
    yaw: fp.yaw,
    z: fp.z,
  };
  ui.getupBtn.hidden = true;
  ui.stampFall.hidden = true;
  showHint(null);
  synth.recoverPop();
}

ui.getupBtn?.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  e.preventDefault();
  if (isInputActive() && session.failPose) triggerRecover();
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && !e.repeat && isInputActive() && session.failPose) {
    e.preventDefault();
    triggerRecover();
  }
});

/**
 * Mô phỏng VĐV bị lật nghiêng/ngửa và vẫn đập tay chân xoay vòng tròn trên mặt nước
 * (Chuyển thể trực tiếp từ hàm ln() và un() của Clip-Clop Horse)
 */
function updateFailPhysics(dt) {
  const fp = session.failPose;
  const clampBounce = (ang, vel, limit) => {
    if (Math.abs(ang) < limit) return [ang, vel];
    return [
      Math.sign(ang) * limit,
      Math.sign(vel) === Math.sign(ang) ? -vel * 0.25 : vel,
    ];
  };

  fp.wr += 9.5 * Math.sin(fp.roll || 0.35) * dt;
  fp.wp += 4.8 * Math.sin(fp.pitch || 0.25) * dt;
  const damp = Math.exp(-0.85 * dt);
  fp.wr *= damp;
  fp.wp *= damp;
  fp.roll += fp.wr * dt;
  fp.pitch += fp.wp * dt;
  [fp.roll, fp.wr] = clampBounce(fp.roll, fp.wr, 1.48);
  [fp.pitch, fp.wp] = clampBounce(fp.pitch, fp.wp, 0.65);

  fp.y = lerp(fp.y, -0.12, Math.min(1, dt * 4));
  fp.landed = true;

  // Khi đang nằm ngửa/nghiêng, nếu bấm nút các chi vẫn quẫy nước làm VĐV xoay mòng mòng (yaw)
  const rollSign = Math.sign(fp.roll || 1);
  const isRolled = Math.abs(fp.roll) > 0.75;

  for (let i = 0; i < 4; i++) {
    const l = fp.limbs[i];
    const pressed = limbInputs[i].pressed;
    l.lift += ((pressed ? 1 : 0) - l.lift) * Math.min(1, 10 * dt);
    const rate = clamp(((pressed ? 0.9 : -0.4) - l.a) / Math.max(dt, 0.001), -5, 7);
    l.a += rate * dt;
    l.da = rate;

    if (isRolled && LIMBS[i].z * rollSign > 0 && l.lift < 0.5) {
      fp.vx -= rate * 0.45 * dt;
      fp.w += rate * (LIMBS[i].front ? 1 : -1) * rollSign * 1.05 * dt;
      if (Math.abs(rate) > 2.5 && Math.random() < 0.25) {
        pool.spawnSplash(physics.state.x, fp.z, 0.45);
      }
    }
  }

  const moveDamp = Math.exp(-2.5 * dt);
  fp.vx *= moveDamp;
  fp.w *= moveDamp;
  fp.yaw += fp.w * dt;
  physics.state.x = Math.max(0, physics.state.x + fp.vx * Math.cos(fp.yaw) * dt);
  fp.z = clamp(fp.z - fp.vx * Math.sin(fp.yaw) * dt, -1.35, 1.35);
}

function finishGame(isWin) {
  session.playing = false;
  showHint(null);
  ui.getupBtn.hidden = true;
  ui.stampGoal.hidden = true;

  const topSpeedKmh = Math.round(session.topSpeed * 3.6 * 10) / 10;
  const rankObj = RANKS.find((r) => session.time < r.maxTime) || RANKS[RANKS.length - 1];

  const isNewRecord = cache.saveRunResult(
    {
      finished: isWin,
      time: Number(session.time.toFixed(2)),
      distance: Math.floor(physics.state.x),
      topSpeedKmh,
      chokes: session.chokes,
      strokes: session.strokes,
      rankId: rankObj.id,
    },
    isWin ? session.ghostRecordFrames : []
  );

  if (isNewRecord) {
    rebuildGhostModel();
  }
  updatePbDisplay();

  const rEl = ui.screenResult;
  rEl.querySelectorAll('[data-result]').forEach((el) => {
    el.hidden = el.dataset.result !== (isWin ? 'win' : 'lose');
  });
  const reasonEl = rEl.querySelector('[data-reason="timeup"]');
  if (reasonEl) reasonEl.hidden = isWin;

  const tallyEl = rEl.querySelector('[data-tally]');
  if (tallyEl) tallyEl.hidden = !isWin;

  rEl.querySelector('[data-final="you"]').textContent = session.time.toFixed(1);
  rEl.querySelector('[data-dist]').textContent = Math.floor(physics.state.x);
  rEl.querySelector('[data-top]').textContent = topSpeedKmh.toFixed(1);
  rEl.querySelector('[data-final-falls]').textContent = session.chokes;
  rEl.querySelector('[data-steps]').textContent = session.strokes;

  rEl.querySelectorAll('[data-rank]').forEach((el) => {
    el.hidden = el.dataset.rank !== rankObj.id;
  });

  if (ui.newRecordBadge) {
    ui.newRecordBadge.hidden = !isNewRecord;
  }

  showScreen('result');
}

// ============================================================================
// 5. CAMERA CHÍNH DIỆN SAU LƯNG (STRAIGHT BEHIND-THE-BACK, KHÔNG CHÉO!)
// ============================================================================
const camState = {
  x: 0,
  z: 0,
  dist: 6.5,
  lookAt: new THREE.Vector3(),
};

function updateCamera(dt) {
  const s = physics.state;
  const fp = session.failPose;
  const activeZ = fp ? fp.z : s.z;

  const smooth = dt > 0 ? 1 - Math.exp(-dt * 6.0) : 1;
  camState.x += (s.x + s.vx * 0.15 - camState.x) * smooth;
  camState.z += (activeZ * 0.5 - camState.z) * smooth;

  if (settings.cameraMode === 'side') {
    const fovRad = THREE.MathUtils.degToRad(camera.fov / 2);
    const hFov = 2 * Math.atan(Math.tan(fovRad) * camera.aspect);
    const targetDist = clamp(2.1 / Math.tan(hFov / 2), 6.2, 12.5);
    camState.dist += (targetDist - camState.dist) * smooth;

    camera.position.set(camState.x + 0.3, 0.9, camState.dist);
    camState.lookAt.set(camState.x + 0.3, 0.0, 0);
  } else {
    // MẶC ĐỊNH: GÓC NHÌN THẲNG SAU LƯNG 100% (ZERO DIAGONAL OFFSET!)
    // Đặt ngay chính giữa phía sau VĐV (cùng tọa độ Z), nhìn thẳng về phía đích (+X)
    camera.position.set(camState.x - 2.75, 1.45, camState.z);
    camState.lookAt.set(camState.x + 2.3, -0.04, camState.z);
  }

  camera.lookAt(camState.lookAt);
  pool.dirLight.position.set(camState.x - 2, 10, 2);
  pool.dirLight.target.position.set(camState.x + 1, 0, 0);
}

function processPhysicsEvents() {
  const s = physics.state;
  for (const ev of s.events) {
    if (ev.type === 'stroke') {
      session.strokes++;
      synth.strokeSplash({ power: ev.power, front: ev.front });
      pool.spawnSplash(ev.x, ev.z, ev.power);
    } else if (ev.type === 'inhale') {
      synth.breathInhale();
    }
  }
  s.events.length = 0;
}

function updateGhostPose(timeSec) {
  if (!ghostSwimmer || !ghostSwimmer.root.visible) return;
  const ghostData = cache.getGhostData();
  if (!ghostData || !ghostData.frames || ghostData.frames.length < 2) {
    ghostSwimmer.root.visible = false;
    return;
  }

  const frames = ghostData.frames;
  if (timeSec > ghostData.time + 0.5) {
    ghostSwimmer.root.visible = false;
    return;
  }

  let idx = 0;
  while (idx < frames.length - 2 && frames[idx + 1][0] < timeSec) {
    idx++;
  }
  const f0 = frames[idx];
  const f1 = frames[idx + 1];
  const span = Math.max(0.0001, f1[0] - f0[0]);
  const alpha = clamp((timeSec - f0[0]) / span, 0, 1);

  const gx = lerp(f0[1], f1[1], alpha);
  const gy = lerp(f0[2], f1[2], alpha);
  const gPitch = lerp(f0[3], f1[3], alpha);
  const gRoll = lerp(f0[4], f1[4], alpha);

  ghostSwimmer.root.position.set(gx, gy, -0.65);
  ghostSwimmer.root.rotation.set(gRoll, 0, gPitch);

  const fakeLimbs = [0, 1, 2, 3].map((i) => {
    const phase = timeSec * 7 + (i % 2) * Math.PI;
    return {
      a: Math.sin(phase) * 0.5,
      da: Math.cos(phase) * 3.5,
      lift: Math.max(0, Math.sin(phase)),
    };
  });
  ghostSwimmer.updatePose(
    { limbs: fakeLimbs, isBreathing: true, breath: 1, roll: gRoll, styleId: settings.styleId },
    [false, false, false, false],
    timeSec
  );
}

let lastTimeMs = 0;

renderer.setAnimationLoop((nowMs) => {
  const dt = lastTimeMs ? Math.min((nowMs - lastTimeMs) / 1000, 0.1) : 0;
  lastTimeMs = nowMs;
  const timeSec = nowMs / 1000;

  if (ui.menuDialog?.open || document.hidden || security.isTampered) {
    return;
  }

  const pressedFlags = limbInputs.map((inp) => inp.pressed);
  const s = physics.state;
  const waterY = s.y - physics.REST_HEIGHT;

  if (isInputActive()) {
    if (!session.finished) {
      session.time += dt;
    }

    if (session.failPose) {
      const fp = session.failPose;
      if (fp.rise > 0) {
        fp.rise = Math.min(1, fp.rise + dt / GAME_CONFIG.RECOVER_DURATION);
        if (fp.rise >= 1) {
          physics.recover();
          session.failPose = null;
          for (const inp of limbInputs) inp.reset();
        }
      } else {
        fp.t += dt;
        updateFailPhysics(dt);
      }
    } else {
      physics.step(dt, pressedFlags);
      processPhysicsEvents();

      if (session.time >= session.nextGhostSampleTime) {
        session.ghostRecordFrames.push([
          Number(session.time.toFixed(2)),
          Number(s.x.toFixed(2)),
          Number(waterY.toFixed(3)),
          Number(s.pitch.toFixed(3)),
          Number(s.roll.toFixed(3)),
        ]);
        session.nextGhostSampleTime += GAME_CONFIG.GHOST_SAMPLE_INTERVAL;
      }

      if (s.fallen) {
        onSwimmerFail(s.fallen);
      } else if (session.hintTimer <= 0) {
        if (s.breath < 0.28) {
          showHint('breath', 0.65);
        } else if (Math.abs(s.roll) > 0.28 || Math.abs(s.pitch) > 0.30) {
          showHint('tip', 0.6);
        }
      }
    }

    session.topSpeed = Math.max(session.topSpeed, s.vx);

    if (s.x >= GAME_CONFIG.POOL_LENGTH && !session.finished) {
      session.finished = true;
      session.finishTimer = GAME_CONFIG.FINISH_DELAY;
      session.ghostRecordFrames.push([
        Number(session.time.toFixed(2)),
        GAME_CONFIG.POOL_LENGTH,
        Number(waterY.toFixed(3)),
        Number(s.pitch.toFixed(3)),
        Number(s.roll.toFixed(3)),
      ]);
      triggerStamp(ui.stampGoal);
      synth.fanfare();
    }

    if (session.finished) {
      session.finishTimer -= dt;
      if (session.finishTimer <= 0) {
        finishGame(true);
      }
    } else if (session.time >= GAME_CONFIG.TIME_LIMIT) {
      session.time = GAME_CONFIG.TIME_LIMIT;
      finishGame(false);
    }
  }

  if (session.hintTimer > 0) {
    session.hintTimer -= dt;
    if (session.hintTimer <= 0) showHint(null);
  }

  const fp = session.failPose;
  if (fp && fp.rise > 0) {
    const smoothT = fp.rise * fp.rise * (3 - 2 * fp.rise);
    swimmer.root.position.set(
      s.x,
      lerp(fp.from.y, 0, smoothT),
      lerp(fp.from.z, 0, smoothT)
    );
    swimmer.root.rotation.set(
      lerp(fp.from.roll, 0, smoothT),
      lerp(fp.from.yaw, 0, smoothT),
      lerp(fp.from.pitch, 0, smoothT)
    );
  } else if (fp) {
    swimmer.root.position.set(s.x, fp.y, fp.z);
    swimmer.root.rotation.set(fp.roll, fp.yaw, fp.pitch);
  } else {
    swimmer.root.position.set(s.x, waterY, s.z);
    swimmer.root.rotation.set(s.roll, s.yaw, s.pitch);
  }

  swimmer.updatePose(
    s,
    isInputActive() ? pressedFlags : [false, false, false, false],
    timeSec,
    fp
  );

  if (session.playing) {
    updateGhostPose(session.time);
  }

  for (let i = 0; i < 4; i++) {
    ui.padBtns[i].classList.toggle('is-on', isInputActive() && pressedFlags[i]);
  }

  const remainMeters = Math.max(0, Math.ceil(GAME_CONFIG.POOL_LENGTH - s.x));
  ui.remain.textContent = remainMeters;
  ui.time.textContent = session.time.toFixed(1);
  ui.chokes.textContent = session.chokes;

  ui.breathFill.style.setProperty('--v', s.breath.toFixed(3));
  const isLowBreath = s.breath < 0.32;
  ui.breathCard.classList.toggle('is-low', isLowBreath);
  ui.breathCard.classList.toggle('is-breathing', s.isBreathing && !isLowBreath);

  if (ui.breathStatusVi && ui.breathStatusEn) {
    if (isLowBreath) {
      ui.breathStatusVi.textContent = 'SẮP NGẠT!';
      ui.breathStatusEn.textContent = 'LOW O₂!';
    } else if (s.isBreathing) {
      ui.breathStatusVi.textContent = 'ĐANG THỞ';
      ui.breathStatusEn.textContent = 'BREATHING';
    } else {
      ui.breathStatusVi.textContent = 'NÍN THỞ';
      ui.breathStatusEn.textContent = 'HOLDING';
    }
  }

  if (ui.hypoxiaOverlay) {
    const vignetteAlpha = s.breath < 0.38 ? clamp((0.38 - s.breath) / 0.38, 0, 0.88) : 0;
    ui.hypoxiaOverlay.style.opacity = vignetteAlpha.toFixed(2);
  }

  pool.update(dt, timeSec, s.x, session.failPose ? session.failPose.z : s.z);
  updateCamera(dt);
  renderer.render(scene, camera);
});
