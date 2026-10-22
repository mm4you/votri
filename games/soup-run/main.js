/**
 * @file main.js
 * @description Vòng lặp chính Game #3: Bát Canh Bỏng Tay / Bưng Phở Sài Gòn (Hot Soup Run).
 * - Nhân vật người phục vụ 3D sống động: áo sơ mi trắng, tạp dề xanh navy, bước chân nhịp nhàng.
 * - Cơ chế vật lý mất thăng bằng tự nhiên: nếu thả tay không giữ, bát sẽ tự nghiêng qua nghiêng lại ngày càng mạnh!
 * - Điều khiển cơ động 2 trục: Vừa nghiêng giữ thăng bằng (F / J), vừa lạng lách trái/phải né chướng ngại vật.
 * - Góc nhìn camera trực diện tô phở ngon lành, bốc khói nghi ngút, không bị che khuất bởi nút bấm.
 */

import * as THREE from '../../shared/vendor/three.module.js';
import { SOUP_GAME_CONFIG, OBSTACLES, SOUP_SKINS, SOUP_RANKS } from './config.js?v=72';
import { createSoupPhysics } from './physics.js?v=72';
import { createWaiterCharacter } from './waiterModel.js?v=72';
import { createCorridorScene } from './corridorScene.js?v=72';
import { createSynthEngine } from '../../shared/audio/synthEngine.js?v=40';
import { createGameCache, portalSettings } from '../../shared/storage/portalCache.js?v=40';
import { GAMES } from '../../shared/ui/gameRegistry.js?v=40';
import { initSecurityGuard } from '../../shared/security/securityGuard.js?v=40';
import { initI18n, onLangChange, getLang } from '../../shared/i18n/i18n.js?v=40';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

initSecurityGuard();
initI18n();

window.addEventListener('error', (e) => {
  console.error('RUNTIME ERROR:', e.message, e.filename, e.lineno);
});

const cache = createGameCache('soup-run', {
  skinId: 'blue-pattern',
  cameraMode: 'firstPerson',
});

const stage = document.querySelector('.game-stage');
const q = (sel) => document.querySelector(sel);

const ui = {
  remain: q('[data-score="remain"]'),
  time: q('[data-time]'),
  spills: q('[data-spills]'),
  soupFill: q('[data-soup-fill]'),
  soupPts: q('[data-soup-pts]'),
  statusVi: q('[data-soup-status-vi]'),
  statusEn: q('[data-soup-status-en]'),
  hud: q('[data-hud]'),
  screenStart: q('[data-screen="start"]'),
  screenResult: q('[data-screen="result"]'),
  stampSpill: q('[data-stamp="spill"]'),
  stampScald: q('[data-stamp="scald"]'),
  stampGoal: q('[data-stamp="goal"]'),
  camBtn: q('[data-cam-toggle]'),
  camLabelVi: q('[data-cam-vi]'),
  camLabelEn: q('[data-cam-en]'),
  muteBtn: q('.game-bar__mute'),
  langBtns: [...document.querySelectorAll('.lang__btn')],
  menuBtn: q('.game-bar__menu'),
  menuDialog: q('#game-menu'),
  menuList: q('[data-menu-games]'),
  padLeft: q('[data-action="tilt-left"]'),
  padBlow: q('[data-action="blow"]'),
  padRight: q('[data-action="tilt-right"]'),
  skinPicker: q('[data-skin-picker]'),
  pbBadge: q('[data-pb-badge]'),
  newRecordBadge: q('[data-new-record]'),
  clearCacheBtn: q('[data-clear-cache]'),
  hints: Object.fromEntries(
    [...stage.querySelectorAll('[data-hint]')].map((el) => [el.dataset.hint, el])
  ),
};

let settings = cache.getSettings();

// Procedural Audio Engine
let isMuted = false;
const synth = createSynthEngine({ isMuted: () => isMuted });

// Three.js Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a0f08);

const camera = new THREE.PerspectiveCamera(52, stage.clientWidth / stage.clientHeight, 0.05, 100);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
stage.appendChild(renderer.domElement);

// Ánh sáng môi trường quán phở
const ambientLight = new THREE.AmbientLight(0xffedd5, 0.82);
scene.add(ambientLight);

// Đèn chiếu chính rọi theo nhân vật
const followLight = new THREE.SpotLight(0xfff7ed, 1.8, 14, Math.PI / 3.8, 0.35, 1.2);
followLight.castShadow = true;
followLight.shadow.mapSize.width = 1024;
followLight.shadow.mapSize.height = 1024;
followLight.shadow.bias = -0.001;
scene.add(followLight);
scene.add(followLight.target);

// Khởi tạo Nhân vật Người Phục Vụ & Hành lang quán ăn
let currentSkin = SOUP_SKINS.find((s) => s.id === settings.skinId) || SOUP_SKINS[0];
const waiter = createWaiterCharacter({ skin: currentSkin });
scene.add(waiter.root);

// Đèn chiếu trực diện ấm áp tôn vinh tô phở và đôi bàn tay (Mềm mại, không gắt lóa)
const bowlFillLight = new THREE.DirectionalLight(0xffedd5, 0.72);
bowlFillLight.position.set(0.25, 1.85, 0.20);
bowlFillLight.target.position.set(0, 1.15, 0.44);
waiter.root.add(bowlFillLight);
waiter.root.add(bowlFillLight.target);

const corridor = createCorridorScene();
scene.add(corridor.sceneGroup);

// Khởi tạo Vật lý
const physics = createSoupPhysics(SOUP_GAME_CONFIG);

window.__debug = { waiter, scene, camera, physics, corridor };

// Điều khiển bàn phím & cảm ứng
const keysDown = {
  f: false,
  j: false,
  space: false,
  a: false,
  d: false,
};

function updateInputs() {
  physics.setInputs({
    f: keysDown.f,
    j: keysDown.j,
    space: keysDown.space,
    a: keysDown.a,
    d: keysDown.d,
  });
}

window.addEventListener('keydown', (e) => {
  // F & J chuyên biệt dùng để nghiêng nâng mép giữ thăng bằng tô phở (không làm lệch hướng đi!)
  if (e.code === 'KeyF') { keysDown.f = true; updateInputs(); }
  if (e.code === 'KeyJ') { keysDown.j = true; updateInputs(); }
  // A & D / Mũi tên dùng để lạng lách né chướng ngại vật
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') { keysDown.a = true; updateInputs(); }
  if (e.code === 'KeyD' || e.code === 'ArrowRight') { keysDown.d = true; updateInputs(); }
  if (e.code === 'Space') {
    e.preventDefault();
    const isResultVisible = ui.screenResult && !ui.screenResult.hasAttribute('hidden');
    const isStartVisible = ui.screenStart && !ui.screenStart.hasAttribute('hidden');
    if (isResultVisible || isStartVisible || physics.state.status !== 'running') {
      startGame();
      return;
    }
    keysDown.space = true;
    updateInputs();
  }
  if (e.code === 'Enter') {
    const isResultVisible = ui.screenResult && !ui.screenResult.hasAttribute('hidden');
    const isStartVisible = ui.screenStart && !ui.screenStart.hasAttribute('hidden');
    if (isResultVisible || isStartVisible || physics.state.status !== 'running') {
      startGame();
    }
  }
  if (e.code === 'KeyR') {
    if (physics.state.status === 'running' || physics.state.status === 'lost' || physics.state.status === 'won') {
      startGame();
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyF') { keysDown.f = false; updateInputs(); }
  if (e.code === 'KeyJ') { keysDown.j = false; updateInputs(); }
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') { keysDown.a = false; updateInputs(); }
  if (e.code === 'KeyD' || e.code === 'ArrowRight') { keysDown.d = false; updateInputs(); }
  if (e.code === 'Space') { keysDown.space = false; updateInputs(); }
});

function bindTouch(btn, keyProp) {
  if (!btn) return;
  const start = (e) => {
    e.preventDefault();
    keysDown[keyProp] = true;
    updateInputs();
    btn.classList.add('is-active');
  };
  const end = (e) => {
    e.preventDefault();
    keysDown[keyProp] = false;
    updateInputs();
    btn.classList.remove('is-active');
  };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('pointerleave', end);
}

bindTouch(ui.padLeft, 'f');
bindTouch(ui.padBlow, 'space');
bindTouch(ui.padRight, 'j');

// Cố định duy nhất 1 góc nhìn bưng bát (Ẩn nút toggle theo yêu cầu)
if (ui.camBtn) {
  ui.camBtn.setAttribute('hidden', '');
  ui.camBtn.style.display = 'none';
}

// Âm thanh Mute Toggle
if (ui.muteBtn) {
  ui.muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    synth.setMuted(isMuted);
    ui.muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
  });
}

// Chuyển đổi ngôn ngữ
ui.langBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang;
    document.documentElement.lang = lang;
    ui.langBtns.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
    renderSkinPicker();
    updatePbBadge();
  });
});

// Menu danh mục game
if (ui.menuBtn && ui.menuDialog) {
  ui.menuBtn.addEventListener('click', () => {
    renderMenu();
    ui.menuDialog.showModal();
  });
  const closeBtn = ui.menuDialog.querySelector('[data-action="close"]');
  if (closeBtn) closeBtn.addEventListener('click', () => ui.menuDialog.close());
  ui.menuDialog.addEventListener('click', (e) => {
    if (e.target === ui.menuDialog) ui.menuDialog.close();
  });
}

function renderMenu() {
  if (!ui.menuList) return;
  const en = getLang() === 'en';
  ui.menuList.innerHTML = GAMES.map((g) => `
    <li class="game-menu__item ${g.id === 'soup-run' ? 'is-active' : ''}">
      <a href="${g.path}">
        <span class="dot" style="background:var(--c)"></span>
        <div>
          <b>${en ? g.titleEn : g.titleVi}</b>
          <small>${en ? g.badgeEn : g.badgeVi}</small>
        </div>
      </a>
    </li>
  `).join('');
}

// Bộ chọn Skin Tô Phở
function renderSkinPicker() {
  if (!ui.skinPicker) return;
  const en = getLang() === 'en';
  ui.skinPicker.innerHTML = SOUP_SKINS.map((s) => `
    <button type="button" class="skin-chip ${s.id === currentSkin.id ? 'is-active' : ''}" data-skin-id="${s.id}">
      <span class="dot" style="background:${s.badgeColor}"></span>
      <span>${en ? s.nameEn : s.nameVi}</span>
    </button>
  `).join('');

  ui.skinPicker.querySelectorAll('[data-skin-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const skinId = btn.dataset.skinId;
      currentSkin = SOUP_SKINS.find((s) => s.id === skinId) || SOUP_SKINS[0];
      cache.updateSettings({ skinId });
      waiter.setSkin(currentSkin);
      renderSkinPicker();
    });
  });
}

renderSkinPicker();

// Cập nhật kỷ lục cá nhân
function updatePbBadge() {
  if (!ui.pbBadge) return;
  const en = getLang() === 'en';
  const best = portalSettings.getGameBest('soup-run');
  if (best) {
    ui.pbBadge.textContent = en
      ? `Personal Best: ${best.time.toFixed(1)}s (${best.score || 0}% broth)`
      : `Kỷ lục cá nhân: ${best.time.toFixed(1)}s (còn ${best.score || 0}% nước)`;
  } else {
    ui.pbBadge.textContent = en ? 'Personal Best: None' : 'Kỷ lục cá nhân: Chưa có';
  }
}

updatePbBadge();

if (ui.clearCacheBtn) {
  ui.clearCacheBtn.addEventListener('click', () => {
    cache.clear();
    portalSettings.clearGame('soup-run');
    updatePbBadge();
  });
}

// Bắt đầu game
function startGame() {
  physics.start();
  announcedObstacles.clear();
  keysDown.f = false;
  keysDown.j = false;
  keysDown.space = false;
  keysDown.a = false;
  keysDown.d = false;
  updateInputs();
  waiter.setSkin(currentSkin);
  waiter.setCameraMode(settings.cameraMode);
  ui.screenStart.setAttribute('hidden', '');
  ui.screenResult.setAttribute('hidden', '');
  ui.hud.removeAttribute('hidden');
  hideAllHints();
  showHint('start');
  setTimeout(() => hideHint('start'), 5000);
}

document.querySelectorAll('[data-action="start"]').forEach((btn) => {
  btn.addEventListener('click', startGame);
});

function showHint(name) {
  if (ui.hints[name]) ui.hints[name].removeAttribute('hidden');
}
function hideHint(name) {
  if (ui.hints[name]) ui.hints[name].setAttribute('hidden', '');
}
function hideAllHints() {
  Object.values(ui.hints).forEach((el) => el.setAttribute('hidden', ''));
}

// Quản lý âm thanh vòng lặp
let lastSloshTime = 0;
let lastSpillSoundTime = 0;
let wasBlowing = false;
let announcedObstacles = new Set();

// Vòng lặp Render chính
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  const dt = clamp(rawDt, 0.001, 0.05);

  const st = physics.update(dt);

  // 1. Cập nhật vị trí không gian 3D nhân vật & tô phở
  waiter.update(st, dt);
  corridor.update(st, dt);

  const posX = st.posX;
  const currentZ = st.dist;
  waiter.root.position.set(posX, 0.0, currentZ);

  // Đèn rọi theo nhân vật
  followLight.position.set(posX, 3.4, currentZ - 0.6);
  followLight.target.position.set(posX, 1.0, currentZ + 1.2);

  // 2. GÓC NHÌN CAMERA TRỰC DIỆN TÔ PHỞ CỐ ĐỊNH DUY NHẤT (Chân thực, ngon mắt, thấy rõ hành lang)
  camera.position.set(posX, 1.48, currentZ + 0.05);
  camera.lookAt(posX, 1.08, currentZ + 0.65);

  // 3. Xử lý âm thanh
  if (st.status === 'running') {
    const waveAmp = Math.abs(st.waveX);
    if (waveAmp > 0.08 && now - lastSloshTime > 260) {
      synth.soupSlosh({ intensity: waveAmp * 3.0 });
      lastSloshTime = now;
    }

    if (st.spillIntensity > 0 && now - lastSpillSoundTime > 220) {
      synth.soupSpill({ intensity: st.spillIntensity });
      lastSpillSoundTime = now;
      if (ui.stampSpill) {
        ui.stampSpill.removeAttribute('hidden');
        setTimeout(() => ui.stampSpill && ui.stampSpill.setAttribute('hidden', ''), 400);
      }
    }

    if (st.isScalded) {
      synth.scaldBurn();
      if (ui.stampScald) {
        ui.stampScald.removeAttribute('hidden');
        setTimeout(() => ui.stampScald && ui.stampScald.setAttribute('hidden', ''), 800);
      }
    }

    if (st.isBlowing && !wasBlowing) {
      synth.blowCool();
    }
    wasBlowing = st.isBlowing;

    // Chướng ngại vật
    if (st.activeObstacle && !announcedObstacles.has(st.activeObstacle.id)) {
      if (st.activeObstacle.id === 'cat') {
        showHint('cat');
        if (st.activeObstacle.tripped) {
          synth.catMeow();
          synth.obstacleTrip();
          announcedObstacles.add(st.activeObstacle.id);
        }
      } else if (st.activeObstacle.id === 'puddle') {
        showHint('puddle');
        synth.slipWarning();
        announcedObstacles.add(st.activeObstacle.id);
      } else if (st.activeObstacle.id === 'fan') {
        showHint('fan');
        announcedObstacles.add(st.activeObstacle.id);
      } else if (st.activeObstacle.id === 'lego') {
        showHint('lego');
        if (st.activeObstacle.tripped) {
          synth.obstacleTrip();
          announcedObstacles.add(st.activeObstacle.id);
        }
      }
    } else if (!st.activeObstacle) {
      hideHint('cat');
      hideHint('puddle');
      hideHint('fan');
      hideHint('lego');
    }
  }

  // 4. Đồng bộ HUD
  if (st.status === 'running' || st.status === 'won' || st.status === 'lost') {
    const remainDist = Math.max(0, SOUP_GAME_CONFIG.courseLength - st.dist);
    if (ui.remain) ui.remain.textContent = Math.ceil(remainDist);
    if (ui.time) ui.time.textContent = st.time.toFixed(1);
    if (ui.spills) ui.spills.textContent = Math.round(st.spillsTotal * 10) / 10;

    const soupPct = Math.max(0, Math.round(st.soupVolume));
    if (ui.soupPts) ui.soupPts.textContent = soupPct;
    if (ui.soupFill) {
      ui.soupFill.style.setProperty('--v', (soupPct / 100.0).toFixed(2));
      if (soupPct <= 30) {
        ui.soupFill.style.background = '#dc2626';
      } else if (soupPct <= 60) {
        ui.soupFill.style.background = '#f97316';
      } else {
        ui.soupFill.style.background = '#16a34a';
      }
    }

    const absTilt = Math.abs(st.tiltRoll + st.waveX);
    if (ui.statusVi && ui.statusEn) {
      if (st.isScalded) {
        ui.statusVi.textContent = 'BỎNG TAY!!';
        ui.statusEn.textContent = 'SCALDED!!';
      } else if (st.spillIntensity > 0) {
        ui.statusVi.textContent = 'TRÀN BÁT!!';
        ui.statusEn.textContent = 'SPILLING!!';
      } else if (absTilt > 0.12) {
        ui.statusVi.textContent = 'CHAO ĐẢO';
        ui.statusEn.textContent = 'WOBBLY';
      } else {
        ui.statusVi.textContent = 'ỔN ĐỊNH';
        ui.statusEn.textContent = 'STEADY';
      }
    }
  }

  // 5. Kiểm tra kết thúc
  if (st.status === 'won' && ui.screenResult.hasAttribute('hidden')) {
    synth.fanfare();
    showResultScreen(true, st);
  } else if (st.status === 'lost' && ui.screenResult.hasAttribute('hidden')) {
    showResultScreen(false, st);
  }

  renderer.render(scene, camera);
}

function showResultScreen(isWin, st) {
  ui.screenResult.removeAttribute('hidden');
  const en = getLang() === 'en';

  const winTitle = q('[data-result="win"]');
  const loseTitle = q('[data-result="lose"]');
  if (winTitle) winTitle.hidden = !isWin;
  if (loseTitle) loseTitle.hidden = isWin;

  const reasonEmpty = q('[data-reason="empty"]');
  const reasonTime = q('[data-reason="timeup"]');
  const reasonFlip = q('[data-reason="flipped"]');
  if (reasonEmpty) reasonEmpty.hidden = st.failReason !== 'empty';
  if (reasonTime) reasonTime.hidden = st.failReason !== 'timeup';
  if (reasonFlip) reasonFlip.hidden = st.failReason !== 'flipped';

  const finalTimeEl = q('[data-final="time"]');
  const finalSoupEl = q('[data-final="soup"]');
  const finalSpeedEl = q('[data-final="speed"]');
  const rankTitleEl = q('[data-rank-title]');
  const rankSubEl = q('[data-rank-sub]');

  if (finalTimeEl) finalTimeEl.textContent = st.time.toFixed(1);
  if (finalSoupEl) finalSoupEl.textContent = Math.round(st.soupVolume);
  if (finalSpeedEl) finalSpeedEl.textContent = Math.round(st.topSpeed);

  let rankKey = 'failed';
  if (isWin) {
    if (st.soupVolume >= SOUP_RANKS.legend.minSoup) rankKey = 'legend';
    else if (st.soupVolume >= SOUP_RANKS.pro.minSoup) rankKey = 'pro';
    else rankKey = 'clumsy';
  }

  const r = SOUP_RANKS[rankKey];
  if (rankTitleEl) rankTitleEl.textContent = en ? r.nameEn : r.nameVi;
  if (rankSubEl) rankSubEl.textContent = en ? r.subEn : r.subVi;

  if (isWin) {
    const isNewBest = portalSettings.saveGameBest('soup-run', {
      time: st.time,
      score: Math.round(st.soupVolume),
      rank: rankKey,
    });
    if (ui.newRecordBadge) ui.newRecordBadge.hidden = !isNewBest;
  } else {
    if (ui.newRecordBadge) ui.newRecordBadge.hidden = true;
  }

  updatePbBadge();
}

window.addEventListener('resize', () => {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

requestAnimationFrame(animate);
