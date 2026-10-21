/**
 * @file main.js
 * @description Vòng lặp chính Game #2: Chim Béo Tập Bay (Wobbly Wings Bird - Chỉ 2 Nút F & J).
 * - Góc nhìn mặc định: Chính diện Sau Lưng (Straight Behind-the-Back, không chéo)
 * - Điều khiển 2 cánh: F (Cánh Trái) & J (Cánh Phải); Nhấn giữ cả F + J để Căng Cánh Lướt Dù (Glide)
 * - Cơ chế Tiền Đình (Dizzy Meter), Gió Ngược (Wind Gust) và Cắm Mỏ Chổng Phao Câu (Faceplant).
 */

import * as THREE from '../../shared/vendor/three.module.js';
import { BIRD_GAME_CONFIG, WINGS, BIRD_RANKS, BIRD_SKINS } from './config.js?v=22';
import { createBirdPhysics } from './physics.js?v=22';
import { createBirdModel } from './birdModel.js?v=22';
import { createSkyScene } from './skyScene.js?v=22';
import { createSynthEngine } from '../../shared/audio/synthEngine.js?v=22';
import { createGameCache } from '../../shared/storage/portalCache.js?v=22';
import { GAMES } from '../../shared/ui/gameRegistry.js?v=22';
import { initSecurityGuard, createRateLimiter } from '../../shared/security/securityGuard.js?v=22';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const lerp = (a, b, t) => a + (b - a) * t;

const cache = createGameCache('wobbly-bird', {
  skinId: 'pigeon',
  cameraMode: 'chase',
  showGhost: true,
});

cache.updateSettings({ cameraMode: 'chase' });

const stage = document.querySelector('.game-stage');
const q = (sel) => document.querySelector(sel);

const ui = {
  remain: q('[data-score="remain"]'),
  time: q('[data-time]'),
  falls: q('[data-falls]'),
  dizzyCard: q('[data-dizzy-card]'),
  dizzyFill: q('[data-dizzy-fill]'),
  dizzyStatusVi: q('[data-dizzy-status-vi]'),
  dizzyStatusEn: q('[data-dizzy-status-en]'),
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
  padBtns: [0, 1].map((i) => q(`[data-wing="${i}"]`)),
  skinPicker: q('[data-skin-picker]'),
  pbBadge: q('[data-pb-badge]'),
  newRecordBadge: q('[data-new-record]'),
  clearCacheBtn: q('[data-clear-cache]'),
  hints: Object.fromEntries(
    [...stage.querySelectorAll('[data-hint]')].map((el) => [el.dataset.hint, el])
  ),
};

let settings = cache.getSettings();

const security = initSecurityGuard();
const allowUiAction = createRateLimiter(10, 1000);

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
  synth.setMuted?.(muted);
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

function renderMenuGames() {
  if (!ui.menuList) return;
  const lang = document.documentElement.lang;
  ui.menuList.innerHTML = GAMES.map((g) => {
    const isCurrent = g.id === 'wobbly-bird';
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

function renderSkinPicker() {
  if (!ui.skinPicker) return;
  ui.skinPicker.innerHTML = BIRD_SKINS.map((s) => {
    const active = s.id === settings.skinId;
    const hex = '#' + s.bodyColor.toString(16).padStart(6, '0');
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
      rebuildBirdModel();
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
        ? `Personal Best: ${best.time.toFixed(2)}s • Top ${best.topSpeedKmh} km/h (${best.chokes} crashes)`
        : `Kỷ lục cá nhân: ${best.time.toFixed(2)}s • Đỉnh ${best.topSpeedKmh} km/h (${best.chokes} lần cắm mỏ)`;
  }
}

ui.clearCacheBtn?.addEventListener('click', () => {
  cache.clearRecords();
  updatePbDisplay();
});

ui.menuBtn?.addEventListener('click', () => ui.menuDialog?.showModal());
ui.menuDialog?.addEventListener('click', (e) => {
  if (e.target === ui.menuDialog || e.target.closest('[data-action="close"]')) {
    ui.menuDialog.close();
  }
});

// ============================================================================
// THREE.JS SCENE & BIRD MODEL
// ============================================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 350);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.domElement.className = 'game-canvas';
stage.prepend(renderer.domElement);

const sky = createSkyScene(scene);

let bird = null;
let physics = createBirdPhysics();

function rebuildBirdModel() {
  if (bird) {
    scene.remove(bird.root);
  }
  bird = createBirdModel({ skinId: settings.skinId, isGhost: false });
  scene.add(bird.root);
}

rebuildBirdModel();
renderSkinPicker();
updatePbDisplay();

const padEl = stage.querySelector('.game-pad');
function handleResize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
const resizeObs = new ResizeObserver(handleResize);
resizeObs.observe(stage);
if (padEl) resizeObs.observe(padEl);
handleResize();

const session = {
  screen: 'start',
  playing: false,
  finished: false,
  finishTimer: 0,
  time: 0,
  crashes: 0,
  flaps: 0,
  topSpeed: 0,
  hintTimer: 0,
  failPose: null,
};

const isInputActive = () => session.playing && session.screen === 'playing';

function bindHoldButton(btnEl, keyCode) {
  const pointers = new Set();
  const keys = new Set();
  let tapTimer = 0;

  btnEl.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    e.preventDefault();
    pointers.add(e.pointerId);
    tapTimer = 0.18;
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
    tapTimer = 0;
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
      return pointers.size > 0 || keys.size > 0 || tapTimer > 0;
    },
    tick(dt) {
      if (tapTimer > 0) tapTimer = Math.max(0, tapTimer - dt);
    },
    reset() {
      pointers.clear();
      keys.clear();
      tapTimer = 0;
    },
  };
}

const wingInputs = WINGS.map((cfg, idx) => bindHoldButton(ui.padBtns[idx], cfg.key));

function showHint(name, duration = 2.6) {
  for (const [k, el] of Object.entries(ui.hints)) {
    el.hidden = k !== name;
  }
  session.hintTimer = name ? duration : 0;
}

const stampTimerMap = new WeakMap();
function triggerStamp(el, durationMs = 1350) {
  if (!el) return;
  el.hidden = true;
  void el.offsetWidth;
  el.hidden = false;
  if (stampTimerMap.has(el)) clearTimeout(stampTimerMap.get(el));
  const t = setTimeout(() => {
    el.hidden = true;
  }, durationMs);
  stampTimerMap.set(el, t);
}

function showScreen(screenName) {
  session.screen = screenName;
  ui.screenStart.hidden = screenName !== 'start';
  ui.screenResult.hidden = screenName !== 'result';
  ui.hud.hidden = screenName === 'start';
}


function triggerEggRocket() {
  if (!isInputActive() || session.failPose) return;
  if (physics.dropEgg()) {
    synth.eggPop?.();
    sky.spawnFeathers(physics.state.x, physics.state.y - 0.2, physics.state.z || 0, 16);
    if (ui.stampFallVi) ui.stampFallVi.textContent = 'BẮN TRỨNG PHẢN LỰC!!';
    if (ui.stampFallEn) ui.stampFallEn.textContent = 'EGG ROCKET BOOST!!';
    triggerStamp(ui.stampFall, 1200);
  }
}

const eggRocketBtn = q('[data-egg]');
if (eggRocketBtn) {
  eggRocketBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    triggerEggRocket();
  });
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat && isInputActive() && !session.failPose) {
    e.preventDefault();
    triggerEggRocket();
  }
});

function startGame() {
  if (!allowUiAction()) return;
  physics = createBirdPhysics();
  Object.assign(session, {
    screen: 'playing',
    playing: true,
    finished: false,
    finishTimer: 0,
    time: 0,
    crashes: 0,
    flaps: 0,
    topSpeed: 0,
    hintTimer: 0,
    failPose: null,
  });

  for (const inp of wingInputs) inp.reset();
  ui.getupBtn.hidden = true;
  ui.stampFall.hidden = true;
  ui.stampGoal.hidden = true;
  if (ui.newRecordBadge) ui.newRecordBadge.hidden = true;

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

function onBirdCrash(reason) {
  session.crashes++;
  const s = physics.state;
  session.failPose = {
    reason,
    roll: reason === 'faceplant' ? (Math.random() > 0.5 ? 0.18 : -0.18) : s.roll,
    pitch: reason === 'faceplant' ? -1.35 : s.pitch,
    y: reason === 'faceplant' ? 0.02 : s.y,
    rise: 0,
    from: null,
    wings: s.wings.map((w) => ({ a: w.a, da: 0, lift: w.lift })),
  };

  if (reason === 'dizzy') {
    if (ui.stampFallVi) ui.stampFallVi.textContent = 'TIỀN ĐÌNH!!';
    if (ui.stampFallEn) ui.stampFallEn.textContent = 'DIZZY SPIN!!';
    showHint('dizzy', Infinity);
  } else {
    if (ui.stampFallVi) ui.stampFallVi.textContent = 'CẮM MỎ BẸP DÍ!!';
    if (ui.stampFallEn) ui.stampFallEn.textContent = 'FACEPLANT SPLAT!!';
    showHint('crash', Infinity);
  }

  triggerStamp(ui.stampFall);
  ui.getupBtn.hidden = false;
  synth.birdCrash?.({ dizzy: reason === 'dizzy' });
  sky.spawnFeathers(s.x, 0.08, 0, 16);
  sky.spawnGrassPuff(s.x, 0, 10);
  sky.spawnGrassPuff(s.x + 0.25, 0, 8);
}

function triggerRecover() {
  const fp = session.failPose;
  if (!fp || fp.rise > 0) return;
  fp.rise = 0.0001;
  fp.from = {
    roll: fp.roll,
    pitch: fp.pitch,
    y: fp.y,
  };
  ui.getupBtn.hidden = true;
  ui.stampFall.hidden = true;
  showHint(null);
  sky.spawnFeathers(physics.state.x, 0.6, 0, 12);
  synth.recoverPop?.();
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

function finishGame(isWin) {
  session.playing = false;
  showHint(null);
  ui.getupBtn.hidden = true;
  ui.stampGoal.hidden = true;

  const topSpeedKmh = Math.round(session.topSpeed * 3.6 * 10) / 10;
  const rankObj = BIRD_RANKS.find((r) => session.time < r.maxTime) || BIRD_RANKS[BIRD_RANKS.length - 1];

  const isNewRecord = cache.saveRunResult({
    finished: isWin,
    time: Number(session.time.toFixed(2)),
    distance: Math.floor(physics.state.x),
    topSpeedKmh,
    chokes: session.crashes,
    strokes: session.flaps,
    rankId: rankObj.id,
  });

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
  rEl.querySelector('[data-final-falls]').textContent = session.crashes;
  rEl.querySelector('[data-steps]').textContent = session.flaps;

  rEl.querySelectorAll('[data-rank]').forEach((el) => {
    el.hidden = el.dataset.rank !== rankObj.id;
  });

  if (ui.newRecordBadge) {
    ui.newRecordBadge.hidden = !isNewRecord;
  }

  showScreen('result');
}

const camState = {
  x: 0,
  y: 1.0,
  z: 0,
  dist: 6.5,
  lookAt: new THREE.Vector3(),
};

function updateCamera(dt) {
  const s = physics.state;
  const smooth = dt > 0 ? 1 - Math.exp(-dt * 6.0) : 1;
  camState.x += (s.x + s.vx * 0.15 - camState.x) * smooth;
  camState.y += (s.y - camState.y) * smooth;
  camState.z += ((s.z || 0) * 0.85 - camState.z) * smooth;

  if (settings.cameraMode === 'side') {
    camera.position.set(camState.x + 0.3, camState.y + 0.5, 6.8);
    camState.lookAt.set(camState.x + 0.3, camState.y, 0);
  } else {
    // MẶC ĐỊNH: GÓC NHÌN THẲNG SAU LƯNG 100%
    camera.position.set(camState.x - 2.8, camState.y + 0.85, camState.z);
    camState.lookAt.set(camState.x + 2.5, camState.y - 0.1, (s.z || 0) * 0.6);
  }

  camera.lookAt(camState.lookAt);
  sky.dirLight.position.set(camState.x - 2, 12, 3);
  sky.dirLight.target.position.set(camState.x + 1, 0, 0);
}

let lastTimeMs = 0;

renderer.setAnimationLoop((nowMs) => {
  const dt = lastTimeMs ? Math.min((nowMs - lastTimeMs) / 1000, 0.05) : 0;
  lastTimeMs = nowMs;
  const timeSec = nowMs / 1000;

  if (ui.menuDialog?.open || document.hidden) {
    return;
  }

  for (const inp of wingInputs) inp.tick(dt);
  const pressedFlags = wingInputs.map((inp) => inp.pressed);
  const s = physics.state;

  if (isInputActive()) {
    if (!session.finished) {
      session.time += dt;
    }

    if (session.failPose) {
      const fp = session.failPose;
      if (fp.rise > 0) {
        fp.rise = Math.min(1, fp.rise + dt / BIRD_GAME_CONFIG.RECOVER_DURATION);
        if (fp.rise >= 1) {
          physics.recover();
          session.failPose = null;
          for (const inp of wingInputs) inp.reset();
        }
      } else {
        fp.y = Math.max(0.02, fp.y - 3.5 * dt);
        fp.pitch = lerp(fp.pitch, -1.35, Math.min(1, dt * 8));
      }
    } else {
      physics.step(dt, pressedFlags);
      for (const ev of s.events) {
        if (ev.type === 'flap') {
          session.flaps++;
          synth.wingFlap?.({ power: ev.power, left: ev.left });
          sky.spawnFeathers(s.x, s.y, ev.left ? -0.3 : 0.3, 2);
        } else if (ev.type === 'grassBounce') {
          sky.spawnGrassPuff(s.x, s.roll * 0.1, 5);
          synth.wingFlap?.({ power: 0.45, left: true });
        } else if (ev.type === 'obstacleBonk') {
          sky.spawnFeathers(s.x, s.y, 0, 8);
          synth.waterSplash?.(0.85);
        } else if (ev.type === 'gust') {
          showHint('gust', 2.2);
        }
      }
      s.events.length = 0;

      if (s.fallen) {
        onBirdCrash(s.fallen);
      }
    }

    session.topSpeed = Math.max(session.topSpeed, s.vx);

    if (s.x >= BIRD_GAME_CONFIG.TRACK_LENGTH && !session.finished) {
      session.finished = true;
      session.finishTimer = BIRD_GAME_CONFIG.FINISH_DELAY;
      triggerStamp(ui.stampGoal);
      synth.fanfare?.();
    }

    if (session.finished) {
      session.finishTimer -= dt;
      if (session.finishTimer <= 0) {
        finishGame(true);
      }
    } else if (session.time >= BIRD_GAME_CONFIG.TIME_LIMIT) {
      session.time = BIRD_GAME_CONFIG.TIME_LIMIT;
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
    bird.root.position.set(s.x, lerp(fp.from.y, 0.95, smoothT), 0);
    bird.root.rotation.set(
      lerp(fp.from.roll, 0, smoothT),
      0,
      lerp(fp.from.pitch, 0.04, smoothT)
    );
  } else if (fp) {
    bird.root.position.set(s.x, fp.y, 0);
    bird.root.rotation.set(fp.roll, 0, fp.pitch);
  } else {
    bird.root.position.set(s.x, s.y, s.z || 0);
    bird.root.rotation.set(s.roll, 0, s.pitch);
  }

  bird.updatePose(
    s,
    isInputActive() ? pressedFlags : [false, false],
    timeSec,
    fp
  );

  for (let i = 0; i < 2; i++) {
    ui.padBtns[i].classList.toggle('is-on', isInputActive() && pressedFlags[i]);
  }

  const remainMeters = Math.max(0, Math.ceil(BIRD_GAME_CONFIG.TRACK_LENGTH - s.x));
  ui.remain.textContent = remainMeters;
  ui.time.textContent = session.time.toFixed(1);
  ui.falls.textContent = session.crashes;

  const calmRatio = clamp(1 - s.dizzy, 0, 1);
  ui.dizzyFill.style.setProperty('--v', calmRatio.toFixed(3));
  ui.dizzyCard.classList.toggle('is-low', s.dizzy > 0.65);

  if (ui.dizzyStatusVi && ui.dizzyStatusEn) {
    if (s.isGliding) {
      ui.dizzyStatusVi.textContent = 'ĐANG LƯỚT DÙ';
      ui.dizzyStatusEn.textContent = 'GLIDING';
    } else if (s.dizzy > 0.65) {
      ui.dizzyStatusVi.textContent = 'SẮP TIỀN ĐÌNH!';
      ui.dizzyStatusEn.textContent = 'DIZZY!';
    } else {
      ui.dizzyStatusVi.textContent = 'TỈNH TÁO';
      ui.dizzyStatusEn.textContent = 'STEADY';
    }
  }

  sky.update(dt, timeSec, s.x, s.gustActive);
  updateCamera(dt);
  renderer.render(scene, camera);
});
