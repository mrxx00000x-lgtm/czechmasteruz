/**
 * CzechMaster — Theme Manager
 * Dark / Light mode boshqaruvi
 */
'use strict';

const ThemeManager = (() => {
  const STORAGE_KEY = 'czechmaster_theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  /** Mavjud temani qaytaradi */
  function getCurrent() {
    return localStorage.getItem(STORAGE_KEY) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT);
  }

  /** Temani o'rnatadi */
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleIcons(theme);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  /** Toggle qiladi */
  function toggle() {
    apply(getCurrent() === DARK ? LIGHT : DARK);
  }

  /** Barcha toggle tugmalarini yangilaydi */
  function updateToggleIcons(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-label', theme === DARK ? 'Yorug\' rejimga o\'tish' : 'Qorong\'u rejimga o\'tish');
      const sunIcon  = btn.querySelector('.icon-sun');
      const moonIcon = btn.querySelector('.icon-moon');
      if (sunIcon)  sunIcon.style.display  = theme === DARK  ? 'block' : 'none';
      if (moonIcon) moonIcon.style.display = theme === LIGHT ? 'block' : 'none';
    });
  }

  /** Tizim preferencini kuzatadi */
  function watchSystem() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (!localStorage.getItem(STORAGE_KEY)) apply(e.matches ? DARK : LIGHT);
    });
  }

  /** Init */
  function init() {
    apply(getCurrent());
    watchSystem();
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.addEventListener('click', toggle);
    });
  }

  return { init, toggle, getCurrent, apply };
})();
