/**
 * CzechMaster — Audio Controller (Web Speech API)
 * ===================================================
 * Brauzerning o'rnatilgan ovoz sintezatori (speechSynthesis) orqali
 * chex tilidagi matnlarni ovoz bilan o'qiydi. Fayl talab qilinmaydi.
 *
 * Chex ovozi mavjud bo'lmasa, eng yaqin slavyan/standart ovozga
 * tushadi va sekinroq tezlik bilan o'qiydi (tushunarliroq bo'lishi uchun).
 */
'use strict';

const AudioController = (() => {
  const LANG_CZECH = 'cs-CZ';
  let voices = [];
  let czechVoice = null;
  let isSupported = 'speechSynthesis' in window;
  let currentUtterance = null;
  let playingButtons = new Set();

  /** Tizimdagi mavjud ovozlarni yuklaydi (ba'zi brauzerlarda asinxron keladi) */
  function loadVoices() {
    if (!isSupported) return;
    voices = window.speechSynthesis.getVoices();
    czechVoice = voices.find(v => v.lang === LANG_CZECH) ||
                 voices.find(v => v.lang?.startsWith('cs')) ||
                 null;
  }

  /** Init — ovozlar ro'yxatini tayyorlaydi va o'zgarish hodisasini kuzatadi */
  function init() {
    if (!isSupported) {
      console.warn('Bu brauzer ovoz sintezini qo\'llab-quvvatlamaydi.');
      return;
    }
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Berilgan matnni ovoz bilan o'qiydi.
   * @param {string} text - O'qiladigan chex matni
   * @param {object} options - { rate, onStart, onEnd, button }
   */
  function speak(text, options = {}) {
    if (!isSupported) {
      ToastManager?.warning?.('Bu brauzer ovoz sintezini qo\'llab-quvvatlamaydi.');
      return;
    }

    // Oldingi o'qishni to'xtatish
    window.speechSynthesis.cancel();
    playingButtons.forEach(btn => btn.classList.remove('playing'));
    playingButtons.clear();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_CZECH;
    utterance.rate = options.rate || 0.85; // Sal sekinroq — til o'rganuvchilar uchun tushunarliroq
    utterance.pitch = 1;
    utterance.volume = 1;

    if (czechVoice) {
      utterance.voice = czechVoice;
    }

    if (options.button) {
      options.button.classList.add('playing');
      playingButtons.add(options.button);
    }

    utterance.onstart = () => {
      if (options.onStart) options.onStart();
    };

    utterance.onend = () => {
      if (options.button) {
        options.button.classList.remove('playing');
        playingButtons.delete(options.button);
      }
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      if (options.button) {
        options.button.classList.remove('playing');
        playingButtons.delete(options.button);
      }
      console.error('Ovoz sintezida xatolik:', e);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  /** Joriy o'qishni to'xtatadi */
  function stop() {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    playingButtons.forEach(btn => btn.classList.remove('playing'));
    playingButtons.clear();
  }

  /** Chex ovozi mavjudligini qaytaradi */
  function hasCzechVoice() {
    return !!czechVoice;
  }

  /** Ovoz sintezi umuman qo'llab-quvvatlanadimi */
  function isAvailable() {
    return isSupported;
  }

  /**
   * Sahifadagi barcha [data-audio-play] tugmalarini avtomatik ulaydi.
   * lesson-engine.js va boshqa joylarda dinamik render bo'lgandan keyin chaqiriladi.
   */
  function bindAudioButtons(root = document) {
    root.querySelectorAll('[data-audio-play]').forEach(btn => {
      if (btn.dataset.audioBound) return; // Takror ulanmasin
      btn.dataset.audioBound = 'true';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = btn.dataset.audioPlay || btn.dataset.audioText;
        if (text) speak(text, { button: btn });
      });
    });
  }

  return { init, speak, stop, hasCzechVoice, isAvailable, bindAudioButtons };
})();

document.addEventListener('DOMContentLoaded', AudioController.init);
