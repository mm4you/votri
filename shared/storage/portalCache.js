/**
 * @file portalCache.js
 * @description Hệ thống lưu trữ dữ liệu trên Browser Cache (localStorage) dùng chung cho toàn bộ Portal.
 * Tự động ký số kiểm tra tính toàn vẹn (Anti-Tamper Checksum) bằng securityGuard.js
 * để ngăn chặn việc chỉnh sửa kỷ lục hoặc Ghost Replay qua DevTools Application tab.
 */

import { signData, verifyData, validateRunPlausibility } from '../security/securityGuard.js?v=6';

const PORTAL_PREFIX = 'votrigame_portal_v1:';
const GLOBAL_SETTINGS_KEY = `${PORTAL_PREFIX}global_settings`;

const DEFAULT_GLOBAL = {
  lang: 'vi',
  muted: false,
};

function safeReadSigned(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return verifyData(parsed, fallback);
  } catch (err) {
    return fallback;
  }
}

function safeWriteSigned(key, value) {
  try {
    const envelope = signData(value);
    localStorage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Quản lý cài đặt chung của cả Portal (Ngôn ngữ, Âm lượng)
 */
export const portalSettings = {
  get() {
    return { ...DEFAULT_GLOBAL, ...safeReadSigned(GLOBAL_SETTINGS_KEY, {}) };
  },
  update(partial) {
    const next = { ...this.get(), ...partial };
    safeWriteSigned(GLOBAL_SETTINGS_KEY, next);
    return next;
  },
  getGameBest(gameId) {
    return safeReadSigned(`${PORTAL_PREFIX}${gameId}:best`, null);
  }
};

/**
 * Tạo bộ lưu trữ Cache riêng cho một Game cụ thể
 * @param {string} gameId - Định danh game (VD: 'splash-swim')
 * @param {Object} defaultGameSettings - Cài đặt mặc định riêng của game đó
 */
export function createGameCache(gameId, defaultGameSettings = {}) {
  const keys = {
    settings: `${PORTAL_PREFIX}${gameId}:settings`,
    best: `${PORTAL_PREFIX}${gameId}:best`,
    ghost: `${PORTAL_PREFIX}${gameId}:ghost`,
    history: `${PORTAL_PREFIX}${gameId}:history`,
  };

  let gameSettings = { ...defaultGameSettings, ...safeReadSigned(keys.settings, {}) };
  let bestRecord = safeReadSigned(keys.best, null);
  let ghostData = safeReadSigned(keys.ghost, null);
  let history = safeReadSigned(keys.history, []);

  return {
    getSettings() {
      return { ...portalSettings.get(), ...gameSettings };
    },

    updateSettings(partial) {
      const globalPatch = {};
      if ('lang' in partial) globalPatch.lang = partial.lang;
      if ('muted' in partial) globalPatch.muted = partial.muted;
      if (Object.keys(globalPatch).length > 0) {
        portalSettings.update(globalPatch);
      }

      gameSettings = { ...gameSettings, ...partial };
      safeWriteSigned(keys.settings, gameSettings);
      return this.getSettings();
    },

    getBestRecord() {
      return bestRecord;
    },

    getGhostData() {
      return ghostData;
    },

    getHistory() {
      return history;
    },

    /**
     * Lưu kết quả lượt chơi & cập nhật Ghost Replay nếu hợp lệ vật lý và lập kỷ lục mới
     */
    saveRunResult(runResult, ghostFrames = []) {
      if (!validateRunPlausibility(runResult)) {
        console.warn('[PortalCache] Kết quả lượt chơi không hợp lệ vật lý, bỏ qua lưu trữ.');
        return false;
      }

      const entry = {
        ...runResult,
        timestamp: Date.now(),
      };

      history.unshift(entry);
      if (history.length > 8) history.length = 8;
      safeWriteSigned(keys.history, history);

      let isNewRecord = false;
      if (runResult.finished) {
        if (!bestRecord || runResult.time < bestRecord.time) {
          isNewRecord = true;
          bestRecord = {
            time: Number(runResult.time.toFixed(2)),
            topSpeedKmh: runResult.topSpeedKmh,
            chokes: runResult.chokes,
            strokes: runResult.strokes,
            rankId: runResult.rankId,
            skinId: gameSettings.skinId || 'ocean',
            timestamp: entry.timestamp,
          };
          safeWriteSigned(keys.best, bestRecord);

          if (ghostFrames && ghostFrames.length > 0) {
            ghostData = {
              time: bestRecord.time,
              skinId: bestRecord.skinId,
              frames: ghostFrames,
            };
            safeWriteSigned(keys.ghost, ghostData);
          }
        }
      }

      return isNewRecord;
    },

    clearRecords() {
      bestRecord = null;
      ghostData = null;
      history = [];
      try {
        localStorage.removeItem(keys.best);
        localStorage.removeItem(keys.ghost);
        localStorage.removeItem(keys.history);
      } catch {}
    }
  };
}
