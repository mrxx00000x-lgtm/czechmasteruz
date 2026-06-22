/**
 * CzechMaster — Speaking Practice Engine
 * =========================================
 * Mikrofon orqali foydalanuvchi talaffuzini yozib oladi (SpeechRecognition API)
 * va kutilgan chex matni bilan solishtiradi.
 *
 * MUHIM CHEKLOV: SpeechRecognition API barcha brauzerlarda mavjud emas
 * (asosan Chrome/Edge/Safari'da ishlaydi, Firefox'da yo'q). API mavjud
 * bo'lmaganda yoki mikrofon ruxsati berilmaganda, foydalanuvchiga aniq
 * xabar ko'rsatiladi va u faqat eshitib (AudioController orqali) mashq
 * qila oladi — ovoz yozib tekshirish o'sha holatda o'chiriladi.
 */
'use strict';

const SpeakingEngine = (() => {
  let exercises = [];
  let currentIndex = 0;
  let score = 0;
  let rootEl = null;
  let onComplete = null;
  let recognition = null;
  let isRecording = false;

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isRecognitionSupported = !!SpeechRecognitionAPI;

  /** Sessiyani boshlaydi */
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

  function stripDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function normalize(str) {
    return stripDiacritics(str.toLowerCase().trim()).replace(/[.,!?]+$/g, '');
  }

  /** Ikki matn orasidagi o'xshashlikni (0-1) Levenshtein masofasi asosida hisoblaydi */
  function similarity(a, b) {
    const s1 = normalize(a);
    const s2 = normalize(b);
    if (s1 === s2) return 1;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1;
    const editDistance = levenshtein(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  function levenshtein(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i, ...Array(a.length).fill(0)]);
    matrix[0] = Array.from({ length: a.length + 1 }, (_, i) => i);
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[b.length][a.length];
  }

  /** Joriy mashqni render qiladi */
  function renderExercise() {
    const ex = exercises[currentIndex];
    const progress = Math.round((currentIndex / exercises.length) * 100);

    rootEl.innerHTML = `
      <div class="speaking-exercise fade-in">
        <div class="quiz-header" style="margin: calc(-1 * var(--space-6)) calc(-1 * var(--space-6)) var(--space-5); border-radius: var(--radius-card) var(--radius-card) 0 0;">
          <span class="quiz-question-counter">${currentIndex + 1} / ${exercises.length}</span>
          <div class="quiz-progress">
            <div class="progress-bar md"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
          </div>
          <span class="level-badge ${ex.level}"><span class="level-dot"></span>${ex.level.toUpperCase()}</span>
        </div>

        <div class="speaking-prompt czech-text">${ex.czech}</div>
        <div class="speaking-phonetic">${ex.phonetic}</div>
        <div class="text-sm text-secondary mb-4">${ex.translation}</div>

        <div class="flex justify-center mb-4">
          <button class="example-audio-btn" data-speaking-listen aria-label="Namunani tinglash" data-tooltip="Avval tinglang" style="width:40px;height:40px;">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.6L5.7 7H3a1 1 0 00-1 1v4a1 1 0 001 1h2.7l4.3 3.4a.8.8 0 001.3-.6V4.2a.8.8 0 00-1.3-.6z"/></svg>
          </button>
        </div>

        ${isRecognitionSupported ? renderRecognitionUI() : renderUnsupportedUI()}

        <div class="writing-feedback" data-speaking-feedback style="margin-top: var(--space-5);"></div>
        <div class="quiz-actions" data-speaking-actions style="display:none; background:transparent; border:none; padding-top:var(--space-4); justify-content:flex-end;"></div>
      </div>
    `;

    bindExerciseEvents(ex);
  }

  /** Mikrofon qo'llab-quvvatlanganda ko'rsatiladigan UI */
  function renderRecognitionUI() {
    return `
      <button class="microphone-btn" data-speaking-record aria-label="Yozib olishni boshlash">
        <svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M5 9a1 1 0 10-2 0 7 7 0 006 6.93V18H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0017 9a1 1 0 10-2 0 5 5 0 01-10 0z"/></svg>
      </button>
      <div class="speaking-waveform" data-speaking-waveform>
        ${Array.from({ length: 8 }).map(() => '<div class="waveform-bar" style="height:8px;"></div>').join('')}
      </div>
      <div class="speaking-status" data-speaking-status>Tugmani bosib, jumlani talaffuz qiling</div>
    `;
  }

  /** Mikrofon qo'llab-quvvatlanmaganda ko'rsatiladigan UI (faqat eshitish rejimi) */
  function renderUnsupportedUI() {
    return `
      <div class="alert alert-warning" style="text-align:left;">
        <span class="alert-icon">⚠️</span>
        <div class="alert-content">
          <div class="alert-title">Mikrofon orqali tekshirish mavjud emas</div>
          <div>Brauzeringiz ovozni tanib olish (Speech Recognition) funksiyasini qo'llab-quvvatlamaydi. Bu funksiya Chrome yoki Edge brauzerlarida ishlaydi. Hozircha namunani tinglab, o'zingiz mashq qilishingiz mumkin.</div>
        </div>
      </div>
      <div class="quiz-actions" style="background:transparent;border:none;padding-top:var(--space-4);justify-content:center;">
        <button class="btn btn-primary" data-speaking-skip>Keyingisiga o'tish</button>
      </div>
    `;
  }

  /** Event'larni ulaydi */
  function bindExerciseEvents(ex) {
    const listenBtn = rootEl.querySelector('[data-speaking-listen]');
    listenBtn.addEventListener('click', () => {
      AudioController.speak(ex.czech, { rate: 0.8, button: listenBtn });
    });

    if (isRecognitionSupported) {
      const recordBtn = rootEl.querySelector('[data-speaking-record]');
      recordBtn.addEventListener('click', () => toggleRecording(ex));
    } else {
      rootEl.querySelector('[data-speaking-skip]')?.addEventListener('click', () => nextExercise(true));
    }
  }

  /** Yozib olishni boshlaydi/to'xtatadi */
  function toggleRecording(ex) {
    if (isRecording) {
      recognition?.stop();
      return;
    }

    const recordBtn = rootEl.querySelector('[data-speaking-record]');
    const waveform = rootEl.querySelector('[data-speaking-waveform]');
    const statusEl = rootEl.querySelector('[data-speaking-status]');

    recognition = new SpeechRecognitionAPI();
    recognition.lang = 'cs-CZ';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isRecording = true;
      recordBtn.classList.add('recording');
      waveform.classList.add('active');
      statusEl.textContent = 'Tinglanmoqda... gapiring';
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      evaluateAttempt(ex, transcript);
    };

    recognition.onerror = (event) => {
      isRecording = false;
      recordBtn.classList.remove('recording');
      waveform.classList.remove('active');
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        statusEl.textContent = 'Mikrofonga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.';
        ToastManager.warning('Mikrofon ruxsati rad etildi.');
      } else if (event.error === 'no-speech') {
        statusEl.textContent = 'Ovoz eshitilmadi. Qaytadan urinib ko\'ring.';
      } else {
        statusEl.textContent = 'Xatolik yuz berdi. Qaytadan urinib ko\'ring.';
        console.error('SpeechRecognition error:', event.error);
      }
    };

    recognition.onend = () => {
      isRecording = false;
      recordBtn.classList.remove('recording');
      waveform.classList.remove('active');
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Recognition start error:', e);
      ToastManager.error('Ovoz yozishni boshlab bo\'lmadi.');
    }
  }

  /** Tanib olingan matnni kutilgan matn bilan solishtiradi va baholaydi */
  function evaluateAttempt(ex, transcript) {
    const score_ratio = similarity(transcript, ex.czech);
    const percent = Math.round(score_ratio * 100);

    let result;
    if (percent >= 80) result = 'correct';
    else if (percent >= 50) result = 'partial';
    else result = 'wrong';

    if (result === 'correct') score++;
    else if (result === 'partial') score += 0.5;

    renderFeedback(ex, result, transcript, percent);
  }

  /** Natija feedback'ini ko'rsatadi */
  function renderFeedback(ex, result, transcript, percent) {
    const feedback = rootEl.querySelector('[data-speaking-feedback]');
    feedback.classList.add('show');

    const messages = {
      correct: { icon: '✅', title: 'Ajoyib talaffuz!', cls: 'alert-success' },
      partial: { icon: '🟡', title: 'Yaxshi, lekin yaxshilash mumkin', cls: 'alert-warning' },
      wrong: { icon: '❌', title: 'Qaytadan urinib ko\'ring', cls: 'alert-error' }
    };
    const msg = messages[result];

    feedback.innerHTML = `
      <div class="alert ${msg.cls}">
        <span class="alert-icon">${msg.icon}</span>
        <div class="alert-content">
          <div class="alert-title">${msg.title} (${percent}% mos)</div>
          <div>Tizim eshitgani: <em>"${transcript}"</em></div>
          <div style="margin-top:var(--space-1);">Kutilgan: <span class="czech-text">${ex.czech}</span></div>
        </div>
      </div>
    `;

    const isLast = currentIndex === exercises.length - 1;
    const actions = rootEl.querySelector('[data-speaking-actions]');
    actions.style.display = 'flex';
    actions.innerHTML = `
      <button class="btn btn-ghost" data-speaking-retry>Qayta urinish</button>
      <button class="btn btn-primary" data-speaking-next>${isLast ? 'Natijani ko\'rish' : 'Keyingi mashq'}</button>
    `;
    actions.querySelector('[data-speaking-retry]').addEventListener('click', () => {
      feedback.innerHTML = '';
      feedback.classList.remove('show');
      actions.style.display = 'none';
      rootEl.querySelector('[data-speaking-status]').textContent = 'Tugmani bosib, jumlani talaffuz qiling';
    });
    actions.querySelector('[data-speaking-next]').addEventListener('click', () => nextExercise());
  }

  /** Keyingi mashqqa o'tadi */
  function nextExercise(skipped = false) {
    AudioController.stop();
    if (recognition && isRecording) recognition.stop();
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
    const xpEarned = Math.round(score * 6);

    rootEl.innerHTML = `
      <div class="completion-screen">
        <div class="completion-animation">🗣️</div>
        <h2 class="completion-title">Talaffuz mashqi tugadi!</h2>
        <p class="completion-subtitle">${isRecognitionSupported ? `Siz ${total} ta jumlani talaffuz qildingiz` : `Siz ${total} ta jumlani ko'rib chiqdingiz`}</p>

        ${isRecognitionSupported ? `
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
        ` : ''}

        <div class="completion-actions">
          <button class="btn btn-secondary btn-lg" data-speaking-restart>Qayta boshlash</button>
          <button class="btn btn-primary btn-lg" data-speaking-finish>Tugatish</button>
        </div>
      </div>
    `;

    if (xpEarned > 0) ProgressManager.addXp(xpEarned);
    ProgressManager.markActive();

    rootEl.querySelector('[data-speaking-restart]').addEventListener('click', () => {
      start({ container: rootEl, exerciseList: exercises, onCompleteCallback: onComplete });
    });
    rootEl.querySelector('[data-speaking-finish]').addEventListener('click', () => {
      if (onComplete) onComplete({ score, total, percent });
    });
  }

  return { start, isSupported: () => isRecognitionSupported };
})();
