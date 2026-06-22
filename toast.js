/**
 * CzechMaster — Toast Notification Manager
 * Ekran burchagida vaqtinchalik bildirishnomalar ko'rsatadi
 */
'use strict';

const ToastManager = (() => {
  let container = null;
  const ICONS = {
    success: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 111.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clip-rule="evenodd"/></svg>',
    error:   '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.7 7.3a1 1 0 00-1.4 1.4L8.6 10l-1.3 1.3a1 1 0 101.4 1.4L10 11.4l1.3 1.3a1 1 0 001.4-1.4L11.4 10l1.3-1.3a1 1 0 00-1.4-1.4L10 8.6 8.7 7.3z" clip-rule="evenodd"/></svg>',
    warning: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.3 3.86a1.5 1.5 0 012.4 0l6.3 9.5A1.5 1.5 0 0115.8 16H4.2a1.5 1.5 0 01-1.2-2.64l6.3-9.5zM10 7a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0v-2.5A.75.75 0 0110 7zm0 6.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>',
    info:    '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
  };

  /** Konteynerni yaratadi (agar mavjud bo'lmasa) */
  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('role', 'status');
    document.body.appendChild(container);
    return container;
  }

  /** Toast ko'rsatadi */
  function show({ type = 'info', title = '', message = '', duration = 3500 }) {
    const root = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${ICONS[type] || ICONS.info}</span>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
        ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Yopish">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
          <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    `;

    root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    const remove = () => {
      toast.classList.add('hiding');
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    };

    toast.querySelector('.toast-close').addEventListener('click', remove);
    if (duration > 0) setTimeout(remove, duration);

    return remove;
  }

  /** XSS oldini olish uchun matnni xavfsizlashtiradi */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /** Qisqartmalar */
  const success = (message, title = 'Ajoyib!') => show({ type: 'success', title, message });
  const error   = (message, title = 'Xatolik') => show({ type: 'error', title, message });
  const warning = (message, title = 'Diqqat') => show({ type: 'warning', title, message });
  const info    = (message, title = '') => show({ type: 'info', title, message });

  return { show, success, error, warning, info };
})();
