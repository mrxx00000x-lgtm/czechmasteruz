/**
 * CzechMaster — Quiz Engine
 * ===========================
 * Test savollarini render qiladi, javoblarni avtomatik tekshiradi,
 * ball hisoblaydi va natijani ProgressManager'ga uzatadi.
 *
 * Qo'llab-quvvatlanadigan turlari:
 *   - single   (bitta to'g'ri javob, ko'p variantli)
 *   - multiple (bir nechta to'g'ri javob)
 *   - truefalse
 *   - fillblank (matn kiritish)
 *   - wordorder (so'zlarni tartiblash)
 */
'use strict';

const QuizEngine = (() => {
  let questions = [];
  let currentIndex = 0;
  let score = 0;
  let answers = [];          // Har bir savol uchun foydalanuvchi javobi
  let lessonId = null;
  let onComplete = null;
  let rootEl = null;
  let startTime = null;

  /** Quiz'ni boshlaydi */
  function start({ container, quizQuestions, lessonIdParam, onCompleteCallback }) {
    rootEl = container;
    questions = quizQuestions || [];
    lessonId = lessonIdParam;
    onComplete = onCompleteCallback;
    currentIndex = 0;
    score = 0;
    answers = [];
    startTime = Date.now();

    if (!questions.length) {
      rootEl.innerHTML = '<div class="empty-state"><div class="empty-state-title">Test mavjud emas</div></div>';
      return;
    }

    renderQuestion();
  }

  /** Joriy savolni render qiladi */
  function renderQuestion() {
    const q = questions[currentIndex];
    const progress = Math.round(((currentIndex) / questions.length) * 100);

    rootEl.innerHTML = `
      <div class="quiz-container fade-in">
        <div class="quiz-header">
          <span class="quiz-question-counter">${currentIndex + 1} / ${questions.length}</span>
          <div class="quiz-progress">
            <div class="progress-bar md">
              <div class="progress-bar-fill" style="width:${progress}%"></div>
            </div>
          </div>
        </div>
        <div class="quiz-question-area">
          <h3 class="quiz-question-text">${q.question}</h3>
          ${q.subtext ? `<p class="quiz-question-sub">${q.subtext}</p>` : ''}
          <div class="quiz-options" data-quiz-options>
            ${renderOptionsForType(q)}
          </div>
        </div>
        <div class="quiz-feedback" data-quiz-feedback></div>
        <div class="quiz-actions" data-quiz-actions>
          <button class="btn btn-primary" data-quiz-check disabled>Tekshirish</button>
        </div>
      </div>
    `;

    bindQuestionEvents(q);
  }

  /** Savol turiga qarab variantlarni render qiladi */
  function renderOptionsForType(q) {
    switch (q.type) {
      case 'truefalse':
        return `
          <div class="quiz-tf-options">
            <button class="quiz-option quiz-tf-option" data-option="true">
              <span>✓</span><span>To'g'ri</span>
            </button>
            <button class="quiz-option quiz-tf-option" data-option="false">
              <span>✗</span><span>Noto'g'ri</span>
            </button>
          </div>`;

      case 'multiple':
        return q.options.map((opt, i) => `
          <button class="quiz-option" data-option="${i}" data-multi="true">
            <span class="quiz-option-letter">${String.fromCharCode(65 + i)}</span>
            <span class="quiz-option-text">${opt}</span>
          </button>`).join('');

      case 'fillblank':
        return `
          <div class="fill-blank-question">
            ${q.question.replace('___', `<input type="text" class="fill-blank-input" data-fill-input autocomplete="off" spellcheck="false">`)}
          </div>`;

      case 'single':
      default:
        return q.options.map((opt, i) => `
          <button class="quiz-option" data-option="${i}">
            <span class="quiz-option-letter">${String.fromCharCode(65 + i)}</span>
            <span class="quiz-option-text">${opt}</span>
          </button>`).join('');
    }
  }

  /** Savol uchun event handler'larni ulaydi */
  function bindQuestionEvents(q) {
    const checkBtn = rootEl.querySelector('[data-quiz-check]');
    let selectedOptions = new Set();
    let fillValue = '';

    if (q.type === 'fillblank') {
      const input = rootEl.querySelector('[data-fill-input]');
      input.addEventListener('input', e => {
        fillValue = e.target.value.trim();
        checkBtn.disabled = fillValue.length === 0;
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !checkBtn.disabled) checkAnswer();
      });
      input.focus();
    } else {
      rootEl.querySelectorAll('[data-option]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (q.type === 'multiple') {
            btn.classList.toggle('selected');
            const val = btn.dataset.option;
            selectedOptions.has(val) ? selectedOptions.delete(val) : selectedOptions.add(val);
            checkBtn.disabled = selectedOptions.size === 0;
          } else {
            rootEl.querySelectorAll('[data-option]').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedOptions = new Set([btn.dataset.option]);
            checkBtn.disabled = false;
          }
        });
      });
    }

    checkBtn.addEventListener('click', () => checkAnswer());

    function checkAnswer() {
      let userAnswer, isCorrect;

      if (q.type === 'fillblank') {
        userAnswer = fillValue;
        const correctAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        isCorrect = correctAnswers.some(ans => ans.toLowerCase().trim() === userAnswer.toLowerCase().trim());
      } else if (q.type === 'multiple') {
        userAnswer = Array.from(selectedOptions).map(Number).sort();
        const correct = [...q.correctAnswer].sort();
        isCorrect = JSON.stringify(userAnswer) === JSON.stringify(correct);
      } else if (q.type === 'truefalse') {
        userAnswer = Array.from(selectedOptions)[0] === 'true';
        isCorrect = userAnswer === q.correctAnswer;
      } else {
        userAnswer = Number(Array.from(selectedOptions)[0]);
        isCorrect = userAnswer === q.correctAnswer;
      }

      submitAnswer(q, userAnswer, isCorrect);
    }
  }

  /** Javobni qayd qiladi va feedback ko'rsatadi */
  function submitAnswer(q, userAnswer, isCorrect) {
    answers.push({ questionId: q.id, userAnswer, isCorrect });
    if (isCorrect) score++;

    // Visual feedback variantlarda
    if (q.type !== 'fillblank') {
      rootEl.querySelectorAll('[data-option]').forEach(btn => {
        btn.disabled = true;
        const optVal = q.type === 'truefalse' ? (btn.dataset.option === 'true') : Number(btn.dataset.option);
        const isThisCorrect = q.type === 'multiple'
          ? q.correctAnswer.includes(Number(btn.dataset.option))
          : optVal === q.correctAnswer;

        if (isThisCorrect) btn.classList.add('correct');
        else if (btn.classList.contains('selected')) btn.classList.add('wrong');
      });
    } else {
      const input = rootEl.querySelector('[data-fill-input]');
      input.disabled = true;
      input.classList.add(isCorrect ? 'correct' : 'wrong');
    }

    // Feedback panel
    const feedback = rootEl.querySelector('[data-quiz-feedback]');
    feedback.className = `quiz-feedback show ${isCorrect ? 'correct' : 'wrong'}`;
    feedback.innerHTML = `
      <span class="quiz-feedback-icon">${isCorrect ? '✅' : '❌'}</span>
      <div class="quiz-feedback-content">
        <div class="quiz-feedback-title">${isCorrect ? 'To\'g\'ri javob!' : 'Noto\'g\'ri javob'}</div>
        <div class="quiz-feedback-text">${q.explanation || (isCorrect ? 'Zo\'r ketyapsiz, davom eting!' : `To'g'ri javob: ${formatCorrectAnswer(q)}`)}</div>
      </div>
    `;

    // Tugmani "Keyingisi" ga o'zgartirish
    const actions = rootEl.querySelector('[data-quiz-actions]');
    const isLast = currentIndex === questions.length - 1;
    actions.innerHTML = `
      <button class="btn btn-primary" data-quiz-next>
        ${isLast ? 'Natijani ko\'rish' : 'Keyingi savol'}
      </button>
    `;
    actions.querySelector('[data-quiz-next]').addEventListener('click', nextQuestion);
  }

  /** To'g'ri javobni o'qiladigan formatda qaytaradi */
  function formatCorrectAnswer(q) {
    if (q.type === 'fillblank') return Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer;
    if (q.type === 'truefalse') return q.correctAnswer ? "To'g'ri" : "Noto'g'ri";
    if (q.type === 'multiple') return q.correctAnswer.map(i => q.options[i]).join(', ');
    return q.options[q.correctAnswer];
  }

  /** Keyingi savolga o'tadi yoki natijani ko'rsatadi */
  function nextQuestion() {
    currentIndex++;
    if (currentIndex >= questions.length) {
      renderResults();
    } else {
      renderQuestion();
    }
  }

  /** Yakuniy natija ekranini render qiladi */
  function renderResults() {
    const total = questions.length;
    const percent = Math.round((score / total) * 100);
    const stars = percent >= 90 ? 3 : percent >= 70 ? 2 : percent >= 50 ? 1 : 0;
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const passed = percent >= 60;

    rootEl.innerHTML = `
      <div class="quiz-container">
        <div class="completion-screen">
          <div class="completion-animation">${passed ? '🎉' : '💪'}</div>
          <h2 class="completion-title">${passed ? 'Tabriklaymiz!' : 'Yana urinib ko\'ring!'}</h2>
          <p class="completion-subtitle">
            ${passed ? `Siz testni ${percent}% natija bilan muvaffaqiyatli tugatdingiz` : `Sizning natijangiz ${percent}%. O'tish balli — 60%`}
          </p>

          <div class="stars-container">
            ${[1, 2, 3].map(i => `<span class="star ${i <= stars ? 'filled' : ''}">⭐</span>`).join('')}
          </div>

          <div class="completion-stats">
            <div class="completion-stat">
              <span class="completion-stat-value">${score}/${total}</span>
              <span class="completion-stat-label">To'g'ri javob</span>
            </div>
            <div class="completion-stat">
              <span class="completion-stat-value">${percent}%</span>
              <span class="completion-stat-label">Natija</span>
            </div>
            <div class="completion-stat">
              <span class="completion-stat-value">${formatTime(timeSpent)}</span>
              <span class="completion-stat-label">Vaqt</span>
            </div>
          </div>

          ${passed ? `<div class="completion-xp-badge">⚡ +${20 + score * 5} XP</div>` : ''}

          <div class="completion-actions">
            ${!passed ? '<button class="btn btn-primary btn-lg" data-quiz-retry">Qayta urinish</button>' : ''}
            <button class="btn ${passed ? 'btn-primary' : 'btn-secondary'} btn-lg" data-quiz-continue>
              ${passed ? 'Davom etish' : 'Darsga qaytish'}
            </button>
          </div>
        </div>
      </div>
    `;

    if (passed) {
      ProgressManager.addXp(score * 5);
      AchievementsManager.checkPerfectScore(score, total);
    }
    ProgressManager.recordQuizResult(lessonId, score, total);

    rootEl.querySelector('[data-quiz-retry]')?.addEventListener('click', () => {
      start({ container: rootEl, quizQuestions: questions, lessonIdParam: lessonId, onCompleteCallback: onComplete });
    });

    rootEl.querySelector('[data-quiz-continue]')?.addEventListener('click', () => {
      if (onComplete) onComplete({ score, total, percent, stars, passed });
    });
  }

  /** Soniyani mm:ss formatiga o'tkazadi */
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return { start };
})();
