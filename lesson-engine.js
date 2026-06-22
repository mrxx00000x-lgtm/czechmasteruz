/**
 * CzechMaster — Lesson Engine
 * =============================
 * lesson.html sahifasidagi darsni JSON ma'lumotlar asosida quradi:
 * nazariya, jadvallar, misollar, mashqlar, test, audio.
 */
'use strict';

const LessonEngine = (() => {
  let lessonData = null;
  let curriculum = null;
  let levelData = null;
  let lessonIndex = -1;

  /** Lesson ID bo'yicha to'liq dars sahifasini yuklaydi va render qiladi */
  async function init(lessonId) {
    try {
      curriculum = await fetchJson('data/curriculum.json');
      const found = findLesson(lessonId);

      if (!found) {
        renderNotFound();
        return;
      }

      levelData = found.level;
      lessonData = found.lesson;
      lessonIndex = found.index;

      if (!ProgressManager.isLessonUnlocked(lessonId)) {
        renderLocked();
        return;
      }

      renderLessonHeader();
      renderTableOfContents();
      renderProgressSteps();
      renderTheorySections();
      renderExercises();
      renderQuizSection();
      renderLessonNav();
      bindTocScrollSpy();
      updatePageMeta();
      AudioController.bindAudioButtons();

      ProgressManager.markActive();
    } catch (e) {
      console.error('Dars yuklashda xatolik:', e);
      renderError();
    }
  }

  async function fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Fetch failed: ${path}`);
    return res.json();
  }

  /** Curriculum ichidan darsni va uning darajasini topadi */
  function findLesson(lessonId) {
    for (const level of curriculum.levels) {
      const index = level.lessons.findIndex(l => l.id === lessonId);
      if (index !== -1) {
        return { level, lesson: level.lessons[index], index };
      }
    }
    return null;
  }

  /** Berilgan ID'dan oldingi/keyingi darsni topadi (global tartibda) */
  function getAdjacentLesson(direction) {
    const allLessons = curriculum.levels.flatMap(l => l.lessons.map(ls => ({ ...ls, levelId: l.id, levelName: l.name })));
    const currentGlobalIndex = allLessons.findIndex(l => l.id === lessonData.id);
    const targetIndex = direction === 'next' ? currentGlobalIndex + 1 : currentGlobalIndex - 1;
    return allLessons[targetIndex] || null;
  }

  /** Sahifa boshidagi breadcrumb va sarlavhani render qiladi */
  function renderLessonHeader() {
    const headerEl = document.querySelector('[data-lesson-header]');
    if (!headerEl) return;

    headerEl.innerHTML = `
      <div class="lesson-header">
        <a href="index.html" class="lesson-back-btn">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.7 4.3a1 1 0 010 1.4L8.42 10l4.3 4.3a1 1 0 01-1.42 1.4l-5-5a1 1 0 010-1.4l5-5a1 1 0 011.42 0z" clip-rule="evenodd"/></svg>
          Orqaga
        </a>
        <div class="lesson-header-divider"></div>
        <nav class="lesson-breadcrumb" aria-label="Breadcrumb">
          <span class="lesson-breadcrumb-item">${levelData.name}</span>
          <span class="lesson-breadcrumb-separator">/</span>
          <span class="lesson-breadcrumb-current">${lessonData.title}</span>
        </nav>
        <button class="icon-btn" data-toggle-favorite aria-label="Sevimlilarga qo'shish" data-tooltip="Sevimlilarga qo'shish">
          <svg viewBox="0 0 20 20" fill="${ProgressManager.isFavorite(lessonData.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5"><path d="M10 17.3l-1.1-1C4.4 12.4 2 10.2 2 7.4 2 5.1 3.8 3.3 6.1 3.3c1.3 0 2.6.6 3.4 1.6.8-1 2.1-1.6 3.4-1.6 2.3 0 4.1 1.8 4.1 4.1 0 2.8-2.4 5-6.9 8.9l-1.1 1z"/></svg>
        </button>
      </div>

      <div class="lesson-title-block">
        <div class="lesson-meta-row">
          <span class="level-badge ${levelData.id}">
            <span class="level-dot"></span>${levelData.id.toUpperCase()}
          </span>
          <span class="badge badge-neutral">${lessonData.category || 'Grammatika'}</span>
          ${ProgressManager.isLessonCompleted(lessonData.id) ? '<span class="badge badge-success">✓ Tugatilgan</span>' : ''}
        </div>
        <h1 class="lesson-main-title">${lessonData.title}</h1>
        <p class="lesson-description">${lessonData.description}</p>
        <div class="lesson-info-row">
          <span class="lesson-info-item">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .3.15.55.4.7l3.5 2a.75.75 0 00.75-1.3l-3.15-1.8V5z" clip-rule="evenodd"/></svg>
            ${lessonData.duration || 15} daqiqa
          </span>
          <span class="lesson-info-item">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 00-1 1v1H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-3V3a1 1 0 10-2 0v1H9V3z"/></svg>
            ${(lessonData.exercises?.length || 0) + (lessonData.quiz?.length || 0)} mashq
          </span>
          <span class="lesson-info-item">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm9-3a1 1 0 10-2 0v3a1 1 0 00.3.7l2 2a1 1 0 001.4-1.4L11 9.6V7z" clip-rule="evenodd"/></svg>
            ${lessonData.wordCount || (lessonData.vocabulary?.length || 0)} yangi so'z
          </span>
        </div>
      </div>
    `;

    headerEl.querySelector('[data-toggle-favorite]').addEventListener('click', e => {
      const isFav = ProgressManager.toggleFavorite(lessonData.id);
      e.currentTarget.querySelector('svg').setAttribute('fill', isFav ? 'currentColor' : 'none');
      ToastManager.show({ type: 'info', message: isFav ? 'Sevimlilarga qo\'shildi' : 'Sevimlilardan olib tashlandi', duration: 2000 });
    });
  }

  /** O'ng tomondagi mundarija (TOC) ni render qiladi */
  function renderTableOfContents() {
    const tocEl = document.querySelector('[data-lesson-toc]');
    if (!tocEl) return;

    const sections = lessonData.sections || [];
    tocEl.innerHTML = `
      <div class="lesson-toc-card">
        <div class="lesson-toc-title">Dars tarkibi</div>
        <nav class="lesson-toc-list">
          ${sections.map((s, i) => `
            <a href="#section-${i}" class="lesson-toc-item" data-toc-link="section-${i}">
              <span class="toc-item-dot"></span>${s.title}
            </a>`).join('')}
          ${lessonData.exercises?.length ? `<a href="#exercises" class="lesson-toc-item" data-toc-link="exercises"><span class="toc-item-dot"></span>Mashqlar</a>` : ''}
          ${lessonData.quiz?.length ? `<a href="#quiz" class="lesson-toc-item" data-toc-link="quiz"><span class="toc-item-dot"></span>Test</a>` : ''}
        </nav>
      </div>
    `;
  }

  /** Yuqoridagi progress bar (qadamlar) render qiladi */
  function renderProgressSteps() {
    const el = document.querySelector('[data-lesson-progress]');
    if (!el) return;

    const totalSteps = (lessonData.sections?.length || 0) + (lessonData.quiz?.length ? 1 : 0);
    el.innerHTML = `
      <div class="lesson-progress-bar-wrapper">
        <div class="lesson-progress-inner">
          <div class="lesson-progress-steps">
            ${Array.from({ length: totalSteps }).map((_, i) =>
              `<div class="lesson-step-dot ${i === 0 ? 'active' : ''}" data-step="${i}"></div>`
            ).join('')}
          </div>
          <span class="lesson-progress-text">0% bajarildi</span>
        </div>
      </div>
    `;
  }

  /** Nazariya bo'limlarini (theory sections) render qiladi */
  function renderTheorySections() {
    const container = document.querySelector('[data-lesson-content]');
    if (!container) return;

    const sections = lessonData.sections || [];
    container.innerHTML = sections.map((section, i) => `
      <section class="theory-section" id="section-${i}">
        <div class="theory-section-header">
          <span class="theory-section-icon">${section.icon || '📖'}</span>
          <h2 class="theory-section-title">${section.title}</h2>
        </div>
        <div class="theory-content">
          ${section.content || ''}
          ${section.keyPoint ? `<div class="key-point"><div class="key-point-title">💡 Muhim qoida</div>${section.keyPoint}</div>` : ''}
          ${section.tip ? `<div class="tip-block">${section.tip}</div>` : ''}
          ${section.warning ? `<div class="warning-block">${section.warning}</div>` : ''}
          ${section.table ? renderTable(section.table) : ''}
          ${section.examples ? renderExamples(section.examples) : ''}
        </div>
      </section>
    `).join('');
  }

  /** Grammatika jadvalini render qiladi */
  function renderTable(table) {
    return `
      <div class="grammar-table-wrapper">
        <table class="grammar-table">
          ${table.caption ? `<caption>${table.caption}</caption>` : ''}
          <thead>
            <tr>${table.headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${table.rows.map(row => `
              <tr>${row.map((cell, i) =>
                `<td class="${i === 0 ? 'category' : ''} ${typeof cell === 'object' ? 'highlight' : ''}">${typeof cell === 'object' ? cell.value : cell}</td>`
              ).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /** Misollar ro'yxatini render qiladi */
  function renderExamples(examples) {
    return `
      <div class="example-list">
        ${examples.map((ex, i) => `
          <div class="example-card">
            <span class="example-number">${i + 1}</span>
            <div class="example-content">
              <div class="example-czech">${ex.czech}</div>
              <div class="example-translation">${ex.translation}</div>
              ${ex.note ? `<div class="example-note">${ex.note}</div>` : ''}
            </div>
            <button class="example-audio-btn" data-audio-play="${escapeAttr(ex.czech)}" aria-label="Tinglash" data-tooltip="Tinglash">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.6L5.7 7H3a1 1 0 00-1 1v4a1 1 0 001 1h2.7l4.3 3.4a.8.8 0 001.3-.6V4.2a.8.8 0 00-1.3-.6z"/></svg>
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  /** HTML atributiga xavfsiz joylash uchun qo'shtirnoqlarni escape qiladi */
  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  /** Interaktiv mashqlarni render qiladi (fill-blank, word-order) */
  function renderExercises() {
    const container = document.querySelector('[data-lesson-exercises]');
    if (!container || !lessonData.exercises?.length) {
      if (container) container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <section class="exercise-section" id="exercises">
        <div class="exercise-header">
          <h2 class="exercise-title">✍️ Mashqlar</h2>
          <span class="exercise-count">${lessonData.exercises.length} ta mashq</span>
        </div>
        <div data-exercise-list></div>
      </section>
    `;

    const list = container.querySelector('[data-exercise-list]');
    lessonData.exercises.forEach((ex, i) => {
      const exEl = document.createElement('div');
      if (ex.type === 'fillblank') {
        exEl.innerHTML = renderFillBlankExercise(ex, i);
      } else if (ex.type === 'wordorder') {
        exEl.innerHTML = renderWordOrderExercise(ex, i);
      }
      list.appendChild(exEl.firstElementChild);
    });

    bindExerciseEvents();
  }

  function renderFillBlankExercise(ex, i) {
    return `
      <div class="fill-blank-exercise" data-exercise="${i}" data-exercise-type="fillblank">
        <div class="fill-blank-question">
          ${ex.question.replace('___', `<input type="text" class="fill-blank-input" data-fill-input autocomplete="off" spellcheck="false">`)}
        </div>
        <button class="btn btn-secondary btn-sm" data-check-exercise>Tekshirish</button>
      </div>
    `;
  }

  function renderWordOrderExercise(ex, i) {
    const shuffled = [...ex.words].sort(() => Math.random() - 0.5);
    return `
      <div class="word-order-exercise" data-exercise="${i}" data-exercise-type="wordorder" data-correct="${ex.words.join('|')}">
        <p class="fill-blank-question" style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3)">
          ${ex.instruction || 'So\'zlarni to\'g\'ri tartibda joylashtiring:'}
        </p>
        <div class="word-order-sentence" data-drop-zone></div>
        <div class="word-bank" data-word-bank>
          ${shuffled.map(w => `<span class="word-token" draggable="true" data-word="${w}">${w}</span>`).join('')}
        </div>
        <button class="btn btn-secondary btn-sm mt-4" data-check-exercise>Tekshirish</button>
      </div>
    `;
  }

  /** Mashqlar uchun click/drag event'larni ulaydi */
  function bindExerciseEvents() {
    // Fill-blank tekshirish
    document.querySelectorAll('[data-exercise-type="fillblank"]').forEach((exEl, idx) => {
      const checkBtn = exEl.querySelector('[data-check-exercise]');
      checkBtn.addEventListener('click', () => {
        const input = exEl.querySelector('[data-fill-input]');
        const ex = lessonData.exercises[idx];
        const correctAnswers = Array.isArray(ex.correctAnswer) ? ex.correctAnswer : [ex.correctAnswer];
        const isCorrect = correctAnswers.some(a => a.toLowerCase().trim() === input.value.toLowerCase().trim());
        input.classList.remove('correct', 'wrong');
        input.classList.add(isCorrect ? 'correct' : 'wrong');
        if (isCorrect) {
          ToastManager.success('To\'g\'ri javob!');
          checkBtn.disabled = true;
        } else {
          ToastManager.error(`To'g'ri javob: ${correctAnswers[0]}`);
        }
      });
    });

    // Word-order: click orqali joylashtirish (mobil uchun ham ishlaydi)
    document.querySelectorAll('[data-exercise-type="wordorder"]').forEach(exEl => {
      const dropZone = exEl.querySelector('[data-drop-zone]');
      const wordBank = exEl.querySelector('[data-word-bank]');
      const checkBtn = exEl.querySelector('[data-check-exercise]');

      wordBank.querySelectorAll('.word-token').forEach(token => {
        token.addEventListener('click', () => {
          const clone = token.cloneNode(true);
          dropZone.appendChild(clone);
          token.classList.add('placed');
          bindPlacedWordRemoval(clone, token);
        });
      });

      checkBtn.addEventListener('click', () => {
        const placed = Array.from(dropZone.querySelectorAll('.word-token')).map(t => t.dataset.word);
        const correct = exEl.dataset.correct.split('|');
        const isCorrect = JSON.stringify(placed) === JSON.stringify(correct);
        dropZone.style.borderColor = isCorrect ? 'var(--color-success-500)' : 'var(--color-error-500)';
        if (isCorrect) {
          ToastManager.success('Ajoyib! Gap to\'g\'ri tuzildi.');
          checkBtn.disabled = true;
        } else {
          ToastManager.error('Tartib noto\'g\'ri, qaytadan urinib ko\'ring.');
        }
      });
    });
  }

  /** Joylashtirilgan so'zni bosganda uni word-bank'ga qaytaradi */
  function bindPlacedWordRemoval(clone, originalToken) {
    clone.addEventListener('click', () => {
      clone.remove();
      originalToken.classList.remove('placed');
    });
  }

  /** Test (quiz) bo'limini render qilish uchun joy tayyorlaydi va QuizEngine'ni chaqiradi */
  function renderQuizSection() {
    const container = document.querySelector('[data-lesson-quiz]');
    if (!container || !lessonData.quiz?.length) {
      if (container) container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <section class="exercise-section" id="quiz">
        <div class="exercise-header">
          <h2 class="exercise-title">🎯 Yakuniy test</h2>
          <span class="exercise-count">${lessonData.quiz.length} ta savol</span>
        </div>
        <div data-quiz-root></div>
      </section>
    `;

    QuizEngine.start({
      container: container.querySelector('[data-quiz-root]'),
      quizQuestions: lessonData.quiz,
      lessonIdParam: lessonData.id,
      onCompleteCallback: handleQuizComplete
    });
  }

  /** Quiz tugatilganda darsni progress'da yopadi */
  function handleQuizComplete({ passed, percent, stars }) {
    if (passed) {
      const next = getAdjacentLesson('next');
      ProgressManager.completeLesson(lessonData.id, {
        score: percent, total: 100, stars, nextLessonId: next?.id
      });
      ToastManager.success(`Dars tugatildi! ${stars} ⭐`, 'Tabriklaymiz!');
    }
    renderLessonNav(); // Keyingi dars endi ochilgan bo'lishi mumkin
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Pastdagi Oldingi/Keyingi dars navigatsiyasini render qiladi */
  function renderLessonNav() {
    const navEl = document.querySelector('[data-lesson-nav]');
    if (!navEl) return;

    const prev = getAdjacentLesson('prev');
    const next = getAdjacentLesson('next');
    const nextUnlocked = next && ProgressManager.isLessonUnlocked(next.id);

    navEl.innerHTML = `
      <div class="lesson-nav">
        ${prev ? `
          <a href="lesson.html?id=${prev.id}" class="lesson-nav-btn prev-btn">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.7 4.3a1 1 0 010 1.4L8.42 10l4.3 4.3a1 1 0 01-1.42 1.4l-5-5a1 1 0 010-1.4l5-5a1 1 0 011.42 0z" clip-rule="evenodd"/></svg>
            <span>
              <span class="lesson-nav-label">Oldingi</span>
              <span class="lesson-nav-title">${prev.title}</span>
            </span>
          </a>` : '<div></div>'}
        ${next ? (nextUnlocked ? `
          <a href="lesson.html?id=${next.id}" class="lesson-nav-btn next-btn">
            <span>
              <span class="lesson-nav-label">Keyingi</span>
              <span class="lesson-nav-title">${next.title}</span>
            </span>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.3 15.7a1 1 0 010-1.4L11.58 10 7.3 5.7a1 1 0 011.42-1.4l5 5a1 1 0 010 1.4l-5 5a1 1 0 01-1.42 0z" clip-rule="evenodd"/></svg>
          </a>` : `
          <div class="lesson-nav-btn next-btn" style="opacity:0.5;cursor:not-allowed;pointer-events:none;">
            <span>
              <span class="lesson-nav-label">🔒 Qulflangan</span>
              <span class="lesson-nav-title">Avval testdan o'ting</span>
            </span>
          </div>`) : ''}
      </div>
    `;
  }

  /** TOC linklarni scroll bilan sinxronlashtiradi */
  function bindTocScrollSpy() {
    const tocLinks = document.querySelectorAll('[data-toc-link]');
    const sections = lessonData.sections.map((_, i) => document.getElementById(`section-${i}`)).filter(Boolean);

    if (!sections.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tocLinks.forEach(l => l.classList.remove('active'));
          document.querySelector(`[data-toc-link="${entry.target.id}"]`)?.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    sections.forEach(s => observer.observe(s));
  }

  /** SEO uchun sahifa title/meta yangilaydi */
  function updatePageMeta() {
    document.title = `${lessonData.title} — CzechMaster`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', lessonData.description);
  }

  function renderNotFound() {
    document.querySelector('[data-lesson-header]').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">Dars topilmadi</div>
        <div class="empty-state-desc">Siz qidirgan dars mavjud emas yoki o'chirilgan</div>
        <a href="index.html" class="btn btn-primary mt-4">Bosh sahifaga qaytish</a>
      </div>
    `;
  }

  function renderLocked() {
    document.querySelector('[data-lesson-header]').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔒</div>
        <div class="empty-state-title">Dars qulflangan</div>
        <div class="empty-state-desc">Bu darsni ochish uchun avval oldingi darslarni tugatishingiz kerak</div>
        <a href="index.html" class="btn btn-primary mt-4">Darslar ro'yxatiga qaytish</a>
      </div>
    `;
  }

  function renderError() {
    document.querySelector('[data-lesson-header]').innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Xatolik yuz berdi</div>
        <div class="empty-state-desc">Darsni yuklashda muammo. Internetga ulanishni tekshiring.</div>
        <button class="btn btn-primary mt-4" onclick="location.reload()">Qayta urinish</button>
      </div>
    `;
  }

  return { init };
})();
