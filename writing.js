/**
 * CzechMaster — Writing Practice Engine
 * ========================================
 * Uchta mashq turini qo'llab-quvvatlaydi:
 *   - translate:    O'zbekcha gapni chexchaga tarjima qilish (aniq javob solishtirish)
 *   - fillsentence:  Gapdagi bo'sh joyni to'ldirish (aniq javob solishtirish)
 *   - freeform:      Erkin yozish (so'z sonini hisoblash, diakritik belgi tekshiruvi)
 *
 * Aniq javobli mashqlarda diakritik belgilarsiz yozilgan javob ham qisman to'g'ri
 * deb hisoblanadi (masalan "Dekuji" -> "Děkuji"), lekin "deyarli to'g'ri" deb belgilanadi.
 */
'use strict';

const WritingEngine = (() => {
  let exercises = [];
  let currentIndex = 0;
  let score = 0;
  let rootEl = null;
  let onComplete = null;

  /** Yozish sessiyasini boshlaydi */
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

    renderExercise();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Diakritik belgilarni olib tashlaydi (taqqoslash uchun) */
  function stripDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /** Matnni solishtirish uchun normallashtiradi: kichik harf, ortiqcha bo'shliq, tinish belgilari */
  function normalize(str) {
    return str.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.,!?]+$/g, '');
  }

  /** Joriy mashqni render qiladi */
  function renderExercise() {
    const ex = exercises[currentIndex];
    const progress = Math.round((currentIndex / exercises.length) * 100);

    rootEl.innerHTML = `
      <div class="writing-exercise fade-in">
        <div class="quiz-header" style="margin: calc(-1 * var(--space-6)) calc(-1 * var(--space-6)) var(--space-5); border-radius: var(--radius-card) var(--radius-card) 0 0;">
          <span class="quiz-question-counter">${currentIndex + 1} / ${exercises.length}</span>
          <div class="quiz-progress">
            <div class="progress-bar md"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
          </div>
          <span class="level-badge ${ex.level}"><span class="level-dot"></span>${ex.level.toUpperCase()}</span>
        </div>

        <div class="writing-prompt">${ex.prompt}</div>
        ${ex.source ? `<div class="writing-prompt-note czech-text" style="font-size:var(--text-lg);color:var(--text-primary);font-weight:var(--weight-semibold);">${ex.source}</div>` : ''}
        ${ex.type === 'freeform' ? `<div class="writing-prompt-note">Kamida ${ex.minWords} ta so'z yozing.</div>` : ''}

        <textarea class="writing-input-area" data-writing-input placeholder="Javobingizni shu yerga yozing..." rows="${ex.type === 'freeform' ? 5 : 2}"></textarea>

        <div class="writing-actions">
          <span class="writing-char-count" data-writing-count>0 ta belgi</span>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm" data-writing-hint>💡 Maslahat</button>
            <button class="btn btn-primary btn-sm" data-writing-check disabled>Tekshirish</button>
          </div>
        </div>

        <div class="writing-feedback" data-writing-feedback></div>
      </div>
      <div class="quiz-actions" data-writing-actions style="display:none; background:transparent; border:none; padding-top:var(--space-4);"></div>
    `;

    bindExerciseEvents(ex);
  }

  /** Mashq uchun event'larni ulaydi */
  function bindExerciseEvents(ex) {
    const input = rootEl.querySelector('[data-writing-input]');
    const checkBtn = rootEl.querySelector('[data-writing-check]');
    const hintBtn = rootEl.querySelector('[data-writing-hint]');
    const countEl = rootEl.querySelector('[data-writing-count]');

    input.addEventListener('input', () => {
      const len = input.value.trim().length;
      countEl.textContent = `${len} ta belgi`;
      checkBtn.disabled = len === 0;
    });

    input.focus();

    hintBtn.addEventListener('click', () => {
      ToastManager.info(ex.hint || 'Maslahat mavjud emas', 'Maslahat');
    });

    checkBtn.addEventListener('click', () => {
      checkAnswer(ex, input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !checkBtn.disabled) {
        checkAnswer(ex, input.value);
      }
    });
  }

  /** Javobni tekshiradi va feedback ko'rsatadi */
  function checkAnswer(ex, userAnswer) {
    const input = rootEl.querySelector('[data-writing-input]');
    input.disabled = true;
    rootEl.querySelector('[data-writing-check]').disabled = true;

    let result; // 'correct' | 'partial' | 'wrong' | 'review'

    if (ex.type === 'freeform') {
      const wordCount = userAnswer.trim().split(/\s+/).filter(Boolean).length;
      result = wordCount >= ex.minWords ? 'review' : 'wrong';
    } else {
      const normalizedUser = normalize(userAnswer);
      const exactMatch = ex.acceptedAnswers.some(ans => normalize(ans) === normalizedUser);
      const diacriticMatch = ex.acceptedAnswers.some(ans => stripDiacritics(normalize(ans)) === stripDiacritics(normalizedUser));

      if (exactMatch) result = 'correct';
      else if (diacriticMatch) result = 'partial';
      else result = 'wrong';
    }

    if (result === 'correct' || result === 'review') score++;
    else if (result === 'partial') score += 0.5;

    if (result === 'correct' || result === 'review') {
      input.classList.add('correct');
    } else if (result === 'wrong') {
      input.classList.add('wrong');
    }
    // 'partial' holatda maxsus klass qo'shilmaydi — neytral chegarada qoladi

    renderFeedback(ex, result);
  }

  /** Natija turiga qarab feedback bloklarini ko'rsatadi */
  function renderFeedback(ex, result) {
    const feedback = rootEl.querySelector('[data-writing-feedback]');
    feedback.classList.add('show');

    const messages = {
      correct: { icon: '✅', title: 'Mukammal!', cls: 'alert-success', text: 'Javobingiz to\'g\'ri.' },
      partial: { icon: '🟡', title: 'Deyarli to\'g\'ri', cls: 'alert-warning', text: 'Mazmun to\'g\'ri, lekin diakritik belgilarga (háček, čárka) e\'tibor bering.' },
      wrong: { icon: '❌', title: 'Noto\'g\'ri', cls: 'alert-error', text: 'Qaytadan urinib ko\'ring yoki to\'g\'ri javobni ko\'ring.' },
      review: { icon: '📝', title: 'Yozuv qabul qilindi', cls: 'alert-info', text: 'Erkin yozish mashqlari avtomatik baholanmaydi — o\'z javobingizni qoidalar bilan solishtirib ko\'ring.' }
    };
    const msg = messages[result];

    let correctAnswerHtml = '';
    if (result !== 'correct' && result !== 'review' && ex.acceptedAnswers) {
      correctAnswerHtml = `<div style="margin-top:var(--space-2); font-weight:var(--weight-semibold);">To'g'ri javob: <span class="czech-text">${ex.acceptedAnswers[0]}</span></div>`;
    }

    feedback.innerHTML = `
      <div class="alert ${msg.cls}">
        <span class="alert-icon">${msg.icon}</span>
        <div class="alert-content">
          <div class="alert-title">${msg.title}</div>
          <div>${msg.text}</div>
          ${correctAnswerHtml}
        </div>
      </div>
    `;

    const isLast = currentIndex === exercises.length - 1;
    const actions = rootEl.querySelector('[data-writing-actions]');
    actions.style.display = 'flex';
    actions.style.justifyContent = 'flex-end';
    actions.innerHTML = `<button class="btn btn-primary" data-writing-next>${isLast ? 'Natijani ko\'rish' : 'Keyingi mashq'}</button>`;
    actions.querySelector('[data-writing-next]').addEventListener('click', nextExercise);
  }

  /** Keyingi mashqqa o'tadi yoki natijani ko'rsatadi */
  function nextExercise() {
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
    const xpEarned = Math.round(score * 5);

    rootEl.innerHTML = `
      <div class="completion-screen">
        <div class="completion-animation">✍️</div>
        <h2 class="completion-title">Yozish mashqi tugadi!</h2>
        <p class="completion-subtitle">Siz ${total} ta mashqni bajardingiz</p>

        <div class="completion-stats">
          <div class="completion-stat">
            <span class="completion-stat-value">${score}/${total}</span>
            <span class="completion-stat-label">Ball</span>
          </div>
          <div class="completion-stat">
            <span class="completion-stat-value">${percent}%</span>
            <span class="completion-stat-label">Natija</span>
          </div>
        </div>

        ${xpEarned > 0 ? `<div class="completion-xp-badge">⚡ +${xpEarned} XP</div>` : ''}

        <div class="completion-actions">
          <button class="btn btn-secondary btn-lg" data-writing-restart>Qayta boshlash</button>
          <button class="btn btn-primary btn-lg" data-writing-finish>Tugatish</button>
        </div>
      </div>
    `;

    if (xpEarned > 0) ProgressManager.addXp(xpEarned);
    ProgressManager.markActive();

    rootEl.querySelector('[data-writing-restart]').addEventListener('click', () => {
      start({ container: rootEl, exerciseList: exercises, onCompleteCallback: onComplete });
    });

    rootEl.querySelector('[data-writing-finish]').addEventListener('click', () => {
      if (onComplete) onComplete({ score, total, percent });
    });
  }

  return { start };
})();
