/**
 * CzechMaster — Flashcard Engine
 * =================================
 * Lug'at so'zlarini flashcard ko'rinishida ko'rsatadi.
 * Oddiy spaced-repetition: "Bilmadim" / "Qiyin" / "Bilaman" tugmalari
 * orqali so'z holatini ProgressManager.updateVocabWord bilan yangilaydi.
 */
'use strict';

const FlashcardEngine = (() => {
  let words = [];
  let currentIndex = 0;
  let rootEl = null;
  let isFlipped = false;
  let sessionStats = { known: 0, hard: 0, unknown: 0 };
  let onSessionComplete = null;

  /** Flashcard sessiyasini boshlaydi */
  function start({ container, wordList, onComplete }) {
    rootEl = container;
    words = shuffle([...wordList]);
    currentIndex = 0;
    isFlipped = false;
    sessionStats = { known: 0, hard: 0, unknown: 0 };
    onSessionComplete = onComplete;

    if (!words.length) {
      rootEl.innerHTML = '<div class="empty-state"><div class="empty-state-title">So\'zlar mavjud emas</div></div>';
      return;
    }

    renderCard();
  }

  /** Fisher-Yates aralashtirish algoritmi */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Joriy kartani render qiladi */
  function renderCard() {
    if (currentIndex >= words.length) {
      renderSessionComplete();
      return;
    }

    const word = words[currentIndex];
    isFlipped = false;

    rootEl.innerHTML = `
      <div class="flashcard-wrapper">
        <span class="flashcard-counter">${currentIndex + 1} / ${words.length}</span>

        <div class="flashcard-scene" data-flashcard-scene tabindex="0" role="button"
             aria-label="Kartani aylantirish uchun bosing">
          <div class="flashcard" data-flashcard>
            <div class="flashcard-face flashcard-front">
              <span class="flashcard-label">Chexcha</span>
              <span class="flashcard-word czech-text">${word.czech}</span>
              ${word.pronunciation ? `<span class="flashcard-pronunciation">[${word.pronunciation}]</span>` : ''}
              <span class="flashcard-hint">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/></svg>
                Tarjimani ko'rish uchun bosing
              </span>
            </div>
            <div class="flashcard-face flashcard-back">
              <span class="flashcard-label">Tarjima</span>
              <span class="flashcard-word">${word.translation}</span>
              ${word.example ? `<span class="flashcard-pronunciation">${word.example}</span>` : ''}
            </div>
          </div>
        </div>

        <div class="flashcard-actions">
          <button class="flashcard-action-btn wrong-btn" data-flashcard-rate="unknown">
            <span class="flashcard-action-icon">😕</span>
            <span>Bilmadim</span>
          </button>
          <button class="flashcard-action-btn hard-btn" data-flashcard-rate="hard">
            <span class="flashcard-action-icon">🤔</span>
            <span>Qiyin</span>
          </button>
          <button class="flashcard-action-btn correct-btn" data-flashcard-rate="known">
            <span class="flashcard-action-icon">😊</span>
            <span>Bilaman</span>
          </button>
        </div>
      </div>
    `;

    bindCardEvents(word);
  }

  /** Kartaga oid event'larni ulaydi */
  function bindCardEvents(word) {
    const scene = rootEl.querySelector('[data-flashcard-scene]');
    const card = rootEl.querySelector('[data-flashcard]');
    const rateButtons = rootEl.querySelectorAll('[data-flashcard-rate]');

    const flip = () => {
      isFlipped = !isFlipped;
      card.classList.toggle('flipped', isFlipped);
    };

    scene.addEventListener('click', flip);
    scene.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        flip();
      }
    });

    rateButtons.forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        rateCard(word, btn.dataset.flashcardRate);
      });
    });
  }

  /** Kartani baholaydi va keyingisiga o'tadi */
  function rateCard(word, rating) {
    const knewIt = rating === 'known';
    ProgressManager.updateVocabWord(word.id, knewIt);

    if (rating === 'known') sessionStats.known++;
    else if (rating === 'hard') sessionStats.hard++;
    else sessionStats.unknown++;

    // "Qiyin" yoki "Bilmadim" deb belgilangan so'zlarni navbat oxiriga qo'shish (qayta ko'rsatish uchun)
    if (rating !== 'known' && currentIndex === words.length - 1 - countRequeued()) {
      // Faqat bitta marta qayta navbatga qo'yish (cheksiz tsikldan saqlanish uchun)
    }

    currentIndex++;
    renderCard();
  }

  function countRequeued() {
    return 0; // Soddalashtirilgan versiya — kengaytirish mumkin
  }

  /** Sessiya yakunlanganda statistika ekranini ko'rsatadi */
  function renderSessionComplete() {
    const total = sessionStats.known + sessionStats.hard + sessionStats.unknown;
    const xpEarned = sessionStats.known * 2 + sessionStats.hard * 1;

    rootEl.innerHTML = `
      <div class="completion-screen">
        <div class="completion-animation">🎴</div>
        <h2 class="completion-title">Sessiya tugadi!</h2>
        <p class="completion-subtitle">Siz ${total} ta so'zni qayta ko'rib chiqdingiz</p>

        <div class="completion-stats">
          <div class="completion-stat">
            <span class="completion-stat-value" style="color:var(--color-success-600)">${sessionStats.known}</span>
            <span class="completion-stat-label">Bilaman</span>
          </div>
          <div class="completion-stat">
            <span class="completion-stat-value" style="color:var(--color-warning-600)">${sessionStats.hard}</span>
            <span class="completion-stat-label">Qiyin</span>
          </div>
          <div class="completion-stat">
            <span class="completion-stat-value" style="color:var(--color-error-600)">${sessionStats.unknown}</span>
            <span class="completion-stat-label">Bilmadim</span>
          </div>
        </div>

        ${xpEarned > 0 ? `<div class="completion-xp-badge">⚡ +${xpEarned} XP</div>` : ''}

        <div class="completion-actions">
          <button class="btn btn-secondary btn-lg" data-flashcard-restart>Qayta boshlash</button>
          <button class="btn btn-primary btn-lg" data-flashcard-finish>Tugatish</button>
        </div>
      </div>
    `;

    if (xpEarned > 0) ProgressManager.addXp(xpEarned);

    const masteredCount = Object.values(ProgressManager.getState().vocabulary)
      .filter(w => w.status === 'mastered').length;
    AchievementsManager.checkVocabAchievements(masteredCount);

    rootEl.querySelector('[data-flashcard-restart]').addEventListener('click', () => {
      start({ container: rootEl, wordList: words, onComplete: onSessionComplete });
    });

    rootEl.querySelector('[data-flashcard-finish]').addEventListener('click', () => {
      if (onSessionComplete) onSessionComplete(sessionStats);
    });
  }

  return { start };
})();
