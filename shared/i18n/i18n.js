/**
 * @file i18n.js
 * @description Hệ thống Đa ngôn ngữ (i18n VIE - ENG) dùng chung cho toàn bộ Vô Tri Game Portal.
 * Tự động đồng bộ với Browser Cache (portalSettings) và cập nhật tiêu đề trang + sự kiện đổi ngôn ngữ.
 */

import { portalSettings } from '../storage/portalCache.js';

const listeners = new Set();

export function getLang() {
  const saved = portalSettings.get().lang;
  return saved === 'en' ? 'en' : 'vi';
}

export function t(dict) {
  if (!dict) return '';
  const lang = getLang();
  return dict[lang] ?? dict.vi ?? '';
}

export function setLang(nextLang) {
  const lang = nextLang === 'en' ? 'en' : 'vi';
  document.documentElement.lang = lang;
  portalSettings.update({ lang });

  const titleAttr = lang === 'en'
    ? document.documentElement.dataset.titleEn
    : document.documentElement.dataset.titleVi;
  if (titleAttr) {
    document.title = titleAttr;
  }

  document.querySelectorAll('.lang__btn').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
  });

  for (const fn of listeners) {
    fn(lang);
  }
}

export function onLangChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initI18n() {
  const initial = getLang();
  setLang(initial);

  document.querySelectorAll('.lang__btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.lang);
    });
  });

  return { getLang, setLang, t, onLangChange };
}
