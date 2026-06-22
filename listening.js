/**
 * CzechMaster — Listening Practice Engine
 * ==========================================
 * Jumlani Web Speech API orqali o'qib beradi, foydalanuvchi tinglagandan
 * keyin tushunish savoliga javob beradi. Natija ProgressManager'ga yoziladi.
 */
'use strict';

const ListeningEngine = (() => {
  let exercises = [];
  let currentIndex = 0;
  let score = 0;
  let rootEl = null;
  let onComplete = null;
  let hasPlayedOnce = false;

  /** Tinglash sessiyasini boshlaydi */
  function start({ container, exerciseList, onCompleteCallback }) {
    rootEl = container;
    exercises = shuffle([...exerciseList]);
    currentIndex = 0;
    score = 0;
    onComplete = onCompleteCallback;

    if (!exercises.length) {
      rootEl.innerHTML = '<div class="empty-state"><div class="empty-state-title">Mashqlar mavjud emas</div></div>';
      return;
    }

    if (!AudioController.isAvailable()) {
      rootEl.innerHTML = `
        <div class="alert alert-warning">
          <span class="alert-icon">⚠️</span>
          <div class="alert-content">
            <div class="alert-title">Ovoz sintezi qo'llab-quvvatlanmaydi</div>
            <div>Brauzeringiz Web Speech API'ni qo'llab-quvvatlamaydi. Iltimos, Chrome yoki Edge brauzerini sinab ko'ring.</div>
          </div>
        </div>`;
      return;
    }

    renderExercise();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Joriy mashqni render qiladi (tinglash bosqichi) */
  function renderExercise() {
    const ex = exercises[currentIndex];
    hasPlayedOnce = false;
    const progress = Math.round((currentIndex / exercises.length) * 100);

    rootEl.innerHTML = `
      <div class="quiz-container fade-in">
        <div class="quiz-header">
          <span class="quiz-question-counter">${currentIndex + 1} / ${exercises.length}</span>
          <div class="quiz-progress">
            <div class="progress-bar md"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
          </div>
          <span class="level-badge ${ex.level}"><span class="level-dot"></span>${ex.level.toUpperCase()}</span>
        </div>

        <div class="listening-player" style="margin: var(--space-6);">
          <div class="listening-player-sentence" data-listening-text>
            <span data-reveal-placeholder>🔊 Tinglash uchun tugmani bosing</span>
          </div>
          <div class="audio-player-controls">
            <button class="audio-play-btn" data-listening-play aria-label="Jumlani tinglash">
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.6L5.7 7H3a1 1 0 00-1 1v4a1 1 0 001 1h2.7l4.3 3.4a.8.8 0 001.3-.6V4.2a.8.8 0 00-1.3-.6z"/></svg>
            </button>
            <button class="audio-speed-btn" data-listening-replay-slow>0.7x sekin</button>
          </div>
        </div>

        <div class="quiz-question-area" style="padding-top:0;">
          <h3 class="quiz-question-text" style="font-size:var(--text-lg);">${ex.question}</h3>
          <div class="quiz-options" data-listening-options>
            ${ex.options.map((opt, i) => `
              <button class="quiz-option" data-option="${i}">
                <span class="quiz-option-letter">${String.fromCharCode(65 + i)}</span>
                <span class="quiz-option-text">${opt}</span>
              </button>`).join('')}
          </div>
        </div>

        <div class="quiz-feedback" data-listening-feedback></div>
        <div class="quiz-actions" data-listening-actions>
          <button class="btn btn-primary" data-listening-check disabled>Tekshirish</button>
        </div>
      </div>
    `;

    bindExerciseEvents(ex);
  }

  /** Tugmalar va variant tanlash hodisalarini ulaydi */
  function bindExerciseEvents(ex) {
    const playBtn = rootEl.querySelector('[data-listening-play]');
    const slowBtn = rootEl.querySelector('[data-listening-replay-slow]');
    const checkBtn = rootEl.querySelector('[data-listening-check]');
    let selectedOption = null;

    const playSentence = (rate) => {
      AudioController.speak(ex.sentence, {
        rate: rate || 0.85,
        button: playBtn,
        onEnd: () => {
          hasPlayedOnce = true;
        }
      });
    };

    playBtn.addEventListener('click', () => playSentence(0.85));
    slowBtn.addEventListener('click', () => playSentence(0.55));

    rootEl.querySelectorAll('[data-option]').forEach(btn => {
      btn.addEventListener('click', () => {
        rootEl.querySelectorAll('[data-option]').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedOption = Number(btn.dataset.option);
        checkBtn.disabled = false;
      });
    });

    checkBtn.addEventListener('click', () => {
      if (selectedOption === null) return;
      submitAnswer(ex, selectedOption);
    });
  }

  /** Javobni tekshiradi va feedback ko'rsatadi */
  function submitAnswer(ex, selectedOption) {
    const isCorrect = selectedOption === ex.correctAnswer;
    if (isCorrect) score++;

    rootEl.querySelectorAll('[data-option]').forEach(btn => {
      btn.disabled = true;
      const optVal = Number(btn.dataset.option);
      if (optVal === ex.correctAnswer) btn.classList.add('correct');
      else if (optVal === selectedOption) btn.classList.add('wrong');
    });

    // Jumla matnini va tarjimasini ochib ko'rsatish
    const textEl = rootEl.querySelector('[data-listening-text]');
    textEl.innerHTML = `
      <span class="listening-reveal-text czech-text">${ex.sentence}</span>
      <div style="font-size: var(--text-sm); opacity: 0.85; margin-top: var(--space-2); font-style: italic;">${ex.translation}</div>
    `;

    const feedback = rootEl.querySelector('[data-listening-feedback]');
    feedback.className = `quiz-feedback show ${isCorrect ? 'correct' : 'wrong'}`;
    feedback.innerHTML = `
      <span class="quiz-feedback-icon">${isCorrect ? '✅' : '❌'}</span>
      <div class="quiz-feedback-content">
        <div class="quiz-feedback-title">${isCorrect ? 'To\'g\'ri tushundingiz!' : 'Noto\'g\'ri javob'}</div>
        <div class="quiz-feedback-text">Jumla matni va tarjimasi yuqorida ko'rsatildi.</div>
      </div>
    `;

    const isLast = currentIndex === exercises.length - 1;
    const actions = rootEl.querySelector('[data-listening-actions]');
    actions.innerHTML = `<button class="btn btn-primary" data-listening-next>${isLast ? 'Natijani ko\'rish' : 'Keyingi mashq'}</button>`;
    actions.querySelector('[data-listening-next]').addEventListener('click', nextExercise);
  }

  /** Keyingi mashqqa o'tadi yoki yakuniy natijani ko'rsatadi */
  function nextExercise() {
    AudioController.stop();
    currentIndex++;
    if (currentIndex >= exercises.length) {
      renderResults();
    } else {
      renderExercise();
    }
  }

  /** Yakuniy natija ekrani */
  function renderResults() {
    const total = exercises.length;
    const percent = Math.round((score / total) * 100);
    const xpEarned = score * 6;

    rootEl.innerHTML = `
      <div class="quiz-container">
        <div class="completion-screen">
          <div class="completion-animation">🎧</div>
          <h2 class="completion-title">Tinglash mashqi tugadi!</h2>
          <p class="completion-subtitle">Siz ${total} ta jumlani tingladingiz va ${score} tasiga to'g'ri javob berdingiz</p>

          <div class="completion-stats">
            <div class="completion-stat">
              <span class="completion-stat-value">${score}/${total}</span>
              <span class="completion-stat-label">To'g'ri javob</span>
            </div>
            <div class="completion-stat">
              <span class="completion-stat-value">${percent}%</span>
              <span class="completion-stat-label">Natija</span>
            </div>
          </div>

          ${xpEarned > 0 ? `<div class="completion-xp-badge">⚡ +${xpEarned} XP</div>` : ''}

          <div class="completion-actions">
            <button class="btn btn-secondary btn-lg" data-listening-restart>Qayta boshlash</button>
            <button class="btn btn-primary btn-lg" data-listening-finish>Tugatish</button>
          </div>
        </div>
      </div>
    `;

    if (xpEarned > 0) ProgressManager.addXp(xpEarned);
    ProgressManager.markActive();

    rootEl.querySelector('[data-listening-restart]').addEventListener('click', () => {
      start({ container: rootEl, exerciseList: exercises, onCompleteCallback: onComplete });
    });

    rootEl.querySelector('[data-listening-finish]').addEventListener('click', () => {
      if (onComplete) onComplete({ score, total, percent });
    });
  }

  return { start };
})();
