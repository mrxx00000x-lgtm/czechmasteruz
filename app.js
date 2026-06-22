/**
 * CzechMaster — Main Application Engine
 * ========================================
 * index.html (Dashboard) ning barcha qismlarini boshqaradi:
 * sidebar navigatsiya, statistika, level kartalari, dars ro'yxati,
 * vocabulary, achievements va flashcard sahifalari.
 */
'use strict';

const App = (() => {
  let curriculum = null;
  let vocabulary = null;
  let currentRoute = 'dashboard';

  const LEVEL_ICONS = { a1: '🌱', a2: '🌿', b1: '🌳', b2: '🏔️', c1: '👑' };
  const CATEGORY_ICONS = {
    'Grammatika': '📐', 'Lug\'at': '📚', 'Talaffuz': '🗣️',
    'Yozish': '✍️', 'O\'qish': '📖', 'Tinglash': '🎧'
  };

  /** Ilovani ishga tushiradi */
  async function init() {
    ProgressManager.load();
    ThemeManager.init();
    registerServiceWorker();

    try {
      [curriculum, vocabulary] = await Promise.all([
        fetchJson('data/curriculum.json'),
        fetchJson('data/vocabulary.json')
      ]);
    } catch (e) {
      console.error('Ma\'lumotlarni yuklashda xatolik:', e);
      ToastManager.error('Ma\'lumotlarni yuklab bo\'lmadi. Internetni tekshiring.');
      return;
    }

    await AchievementsManager.loadDefinitions();
    SearchManager.init(curriculum, vocabulary);

    renderSidebar();
    bindGlobalEvents();
    handleRoute();

    window.addEventListener('hashchange', handleRoute);
    document.addEventListener('progresschange', () => {
      if (currentRoute === 'dashboard') renderDashboardStats();
      updateSidebarXp();
    });

    hidePageLoader();
  }

  async function fetchJson(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Fetch failed: ${path}`);
    return res.json();
  }

  function hidePageLoader() {
    const loader = document.querySelector('[data-page-loader]');
    if (loader) {
      loader.classList.add('hiding');
      setTimeout(() => loader.remove(), 400);
    }
  }

  /** Service Worker'ni ro'yxatdan o'tkazadi (PWA offline rejimi) */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
          console.warn('Service Worker ro\'yxatdan o\'tmadi:', err);
        });
      });
    }

    window.addEventListener('online', () => updateOfflineBanner(false));
    window.addEventListener('offline', () => updateOfflineBanner(true));
    if (!navigator.onLine) updateOfflineBanner(true);
  }

  function updateOfflineBanner(isOffline) {
    let banner = document.querySelector('[data-offline-banner]');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'offline-banner';
      banner.setAttribute('data-offline-banner', '');
      banner.innerHTML = `
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.3 3.86a1.5 1.5 0 012.4 0l6.3 9.5A1.5 1.5 0 0115.8 16H4.2a1.5 1.5 0 01-1.2-2.64l6.3-9.5zM10 7a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0v-2.5A.75.75 0 0110 7zm0 6.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clip-rule="evenodd"/></svg>
        <span>Siz oflayn rejimdasiz — saqlangan darslar mavjud</span>
      `;
      document.body.appendChild(banner);
    }
    requestAnimationFrame(() => banner.classList.toggle('visible', isOffline));
  }

  /* ============================================================
     SIDEBAR
     ============================================================ */

  function renderSidebar() {
    const sidebarNav = document.querySelector('[data-sidebar-nav]');
    if (!sidebarNav) return;

    const stats = ProgressManager.getStats();
    const levelInfo = ProgressManager.getLevelInfo();

    sidebarNav.innerHTML = `
      <div class="nav-section">
        <a href="#dashboard" class="nav-link" data-route="dashboard">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10.5 2.6a1 1 0 00-1 0L3 6.8V17a1 1 0 001 1h4a1 1 0 001-1v-4h2v4a1 1 0 001 1h4a1 1 0 001-1V6.8l-6.5-4.2z"/></svg>
          <span class="nav-label">Bosh sahifa</span>
        </a>
        <a href="#lessons" class="nav-link" data-route="lessons">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M9 4.8A6.5 6.5 0 003 3v11.5a5.5 5.5 0 016 1V4.8zM11 4.8v10.7a5.5 5.5 0 016-1V3a6.5 6.5 0 00-6 1.8z"/></svg>
          <span class="nav-label">Darslar</span>
        </a>
        <a href="#vocabulary" class="nav-link" data-route="vocabulary">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v14l-6-3-6 3V4z" clip-rule="evenodd"/></svg>
          <span class="nav-label">Lug'at</span>
        </a>
        <a href="#flashcards" class="nav-link" data-route="flashcards">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V8.4a2 2 0 00-.6-1.4l-4.4-4.4A2 2 0 0010.6 2H5a2 2 0 00-2 1z"/></svg>
          <span class="nav-label">Flashcards</span>
        </a>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">Mashqlar</div>
        <a href="#quiz" class="nav-link" data-route="quiz">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a1 1 0 00-.93 1.36c.16.42.43.61.7.8.32.24.63.46.63.84a1 1 0 11-2 0 1 1 0 10-2 0 3 3 0 106 0c0-1.2-.78-1.78-1.32-2.16-.2-.15-.38-.28-.38-.44A1 1 0 0010 5zm0 9a1.13 1.13 0 100 2.25A1.13 1.13 0 0010 14z" clip-rule="evenodd"/></svg>
          <span class="nav-label">Testlar</span>
        </a>
        <a href="#listening" class="nav-link" data-route="listening">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a6 6 0 00-6 6v3.5a2.5 2.5 0 002.5 2.5H7a1 1 0 001-1v-4a1 1 0 00-1-1h-1V8a4 4 0 118 0v2h-1a1 1 0 00-1 1v4a1 1 0 001 1h.5a2.5 2.5 0 002.5-2.5V8a6 6 0 00-6-6z"/></svg>
          <span class="nav-label">Tinglash</span>
        </a>
        <a href="#speaking" class="nav-link" data-route="speaking">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a3 3 0 00-3 3v5a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M5 9a1 1 0 10-2 0 7 7 0 006 6.93V18H7a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0017 9a1 1 0 10-2 0 5 5 0 01-10 0z"/></svg>
          <span class="nav-label">Talaffuz</span>
        </a>
        <a href="#writing" class="nav-link" data-route="writing">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M13.6 2.3a1 1 0 011.4 0l2.7 2.7a1 1 0 010 1.4L8.4 15.7l-4.6.7.7-4.6L13.6 2.3z"/></svg>
          <span class="nav-label">Yozish</span>
        </a>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">Men</div>
        <a href="#favorites" class="nav-link" data-route="favorites">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M9.3 3.3a1 1 0 011.4 0l1.9 2.7 3.2.5a1 1 0 01.6 1.7l-2.3 2.3.5 3.2a1 1 0 01-1.5 1.1L10 13.3l-2.9 1.5a1 1 0 01-1.5-1l.5-3.3-2.3-2.3a1 1 0 01.6-1.7l3.2-.5L9.3 3.3z"/></svg>
          <span class="nav-label">Sevimlilar</span>
          ${stats.completedLessons ? '' : ''}
        </a>
        <a href="#achievements" class="nav-link" data-route="achievements">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 1a5 5 0 00-5 5v1H4a1 1 0 00-1 1l1 7a2 2 0 002 2h8a2 2 0 002-2l1-7a1 1 0 00-1-1h-1V6a5 5 0 00-5-5zm3 6V6a3 3 0 10-6 0v1h6z" clip-rule="evenodd"/></svg>
          <span class="nav-label">Yutuqlar</span>
          <span class="nav-badge">${AchievementsManager.getUnlockedCount()}</span>
        </a>
        <a href="#progress" class="nav-link" data-route="progress">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path d="M3 13a1 1 0 011-1h1a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zM9 7a1 1 0 011-1h1a1 1 0 011 1v10a1 1 0 01-1 1h-1a1 1 0 01-1-1V7zM15 4a1 1 0 011-1h1a1 1 0 011 1v13a1 1 0 01-1 1h-1a1 1 0 01-1-1V4z"/></svg>
          <span class="nav-label">Progress</span>
        </a>
      </div>

      <div class="nav-section">
        <a href="#settings" class="nav-link" data-route="settings">
          <svg class="nav-link-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.05 3a1 1 0 00-2.1 0l-.16.96a6.97 6.97 0 00-1.5.87l-.92-.34a1 1 0 00-1.2.45L4.13 6.6a1 1 0 00.27 1.27l.76.6a7 7 0 000 1.73l-.76.6a1 1 0 00-.27 1.27l1.04 1.66a1 1 0 001.2.45l.92-.34c.45.36.96.66 1.5.87l.16.96a1 1 0 002.1 0l.16-.96c.54-.21 1.05-.51 1.5-.87l.92.34a1 1 0 001.2-.45l1.04-1.66a1 1 0 00-.27-1.27l-.76-.6a7 7 0 000-1.73l.76-.6a1 1 0 00.27-1.27L15.6 4.94a1 1 0 00-1.2-.45l-.92.34a6.97 6.97 0 00-1.5-.87L11.81 3zM10 13a3 3 0 110-6 3 3 0 010 6z" clip-rule="evenodd"/></svg>
          <span class="nav-label">Sozlamalar</span>
        </a>
      </div>
    `;

    updateSidebarXp();
  }

  function updateSidebarXp() {
    const stats = ProgressManager.getStats();
    const levelInfo = ProgressManager.getLevelInfo();
    const xpSection = document.querySelector('[data-sidebar-xp]');
    if (xpSection) {
      xpSection.innerHTML = `
        <div class="xp-bar-label">
          <span>Daraja ${levelInfo.level}</span>
          <span>${levelInfo.xpInCurrentLevel}/${levelInfo.xpForNextLevel} XP</span>
        </div>
        <div class="xp-bar-track">
          <div class="xp-bar-fill" style="width:${levelInfo.progressPercent}%"></div>
        </div>
      `;
    }

    const streakBadge = document.querySelector('[data-header-streak]');
    if (streakBadge) streakBadge.textContent = stats.streak;
  }

  /* ============================================================
     ROUTING
     ============================================================ */

  function handleRoute() {
    const hash = window.location.hash.slice(1) || 'dashboard';
    const [route] = hash.split('?');
    currentRoute = route;

    document.querySelectorAll('[data-route]').forEach(link => {
      link.classList.toggle('active', link.dataset.route === route);
    });
    document.querySelectorAll('[data-mobile-route]').forEach(link => {
      link.classList.toggle('active', link.dataset.mobileRoute === route);
    });

    const routes = {
      dashboard: renderDashboard,
      lessons: renderLessonsPage,
      vocabulary: renderVocabularyPage,
      flashcards: renderFlashcardsPage,
      quiz: renderQuizListPage,
      writing: renderWritingPage,
      listening: renderListeningPage,
      speaking: renderSpeakingPage,
      favorites: renderFavoritesPage,
      achievements: renderAchievementsPage,
      progress: renderProgressPage,
      settings: renderSettingsPage
    };

    (routes[route] || renderDashboard)();
    closeMobileSidebar();
    document.querySelector('.main-content')?.scrollTo({ top: 0, behavior: 'instant' });
  }

  function navigateTo(route) {
    window.location.hash = route;
  }

  /* ============================================================
     DASHBOARD PAGE
     ============================================================ */

  function renderDashboard() {
    const main = document.querySelector('[data-main-content]');
    const stats = ProgressManager.getStats();
    const levelInfo = ProgressManager.getLevelInfo();
    const hour = new Date().getHours();
    const greeting = hour < 6 ? 'Xayrli tun' : hour < 12 ? 'Xayrli tong' : hour < 18 ? 'Xayrli kun' : 'Xayrli kech';

    main.innerHTML = `
      <div class="dashboard-hero fade-in">
        <div class="hero-content">
          <div class="hero-text">
            <div class="hero-greeting">${greeting}! 👋</div>
            <h1 class="hero-title">Chex tilini o'rganishni davom ettiramiz</h1>
            <p class="hero-subtitle">Har kuni biroz mashq qiling — kichik qadamlar katta natijalarga olib keladi.</p>
            <div class="hero-actions">
              <a href="#lessons" class="hero-btn-primary">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M6.3 4.2A1 1 0 005 5v10a1 1 0 001.5.86l8-5a1 1 0 000-1.72l-8-5z"/></svg>
                O'rganishni boshlash
              </a>
              <a href="#progress" class="hero-btn-secondary">Statistikani ko'rish</a>
            </div>
          </div>
          <div class="hero-streak">
            <span class="hero-streak-icon">🔥</span>
            <span class="hero-streak-count">${stats.streak}</span>
            <span class="hero-streak-label">kunlik streak</span>
          </div>
        </div>
        <div class="hero-xp">
          <div class="hero-xp-header">
            <span>Daraja ${levelInfo.level}</span>
            <span>${levelInfo.xpInCurrentLevel} / ${levelInfo.xpForNextLevel} XP</span>
          </div>
          <div class="hero-xp-bar">
            <div class="hero-xp-fill" style="width:${levelInfo.progressPercent}%"></div>
          </div>
        </div>
      </div>

      <div class="stats-grid stagger" data-stats-grid></div>

      ${renderContinueLearningHtml()}

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">O'quv darajalari</h2>
          <a href="#lessons" class="section-link">Barchasini ko'rish →</a>
        </div>
        <div class="levels-grid stagger" data-levels-grid></div>
      </div>

      <div class="grid-2" style="grid-template-columns: 1.5fr 1fr; align-items: start;">
        <div class="section" style="margin-bottom:0;">
          <div class="section-header">
            <h2 class="section-title">So'nggi faollik</h2>
          </div>
          <div class="card" data-recent-activity></div>
        </div>
        <div class="section" style="margin-bottom:0;">
          <div class="section-header">
            <h2 class="section-title">Kunlik maqsad</h2>
          </div>
          <div class="daily-goals-card" data-daily-goals></div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Kun so'zi</h2>
        </div>
        <div data-word-of-day></div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Tezkor amallar</h2>
        </div>
        <div class="quick-actions-grid" data-quick-actions></div>
      </div>
    `;

    renderDashboardStats();
    renderLevelCards();
    renderRecentActivity();
    renderDailyGoals();
    renderWordOfDay();
    renderQuickActions();
  }

  function renderDashboardStats() {
    const grid = document.querySelector('[data-stats-grid]');
    if (!grid) return;
    const stats = ProgressManager.getStats();
    const totalLessons = curriculum.levels.reduce((sum, l) => sum + l.lessons.length, 0);

    const items = [
      { icon: '📘', label: 'Tugatilgan darslar', value: `${stats.completedLessons}/${totalLessons}`, bg: 'var(--level-a1-bg)' },
      { icon: '🔥', label: 'Joriy streak', value: `${stats.streak} kun`, bg: 'var(--color-warning-100)' },
      { icon: '⭐', label: 'Jami XP', value: stats.totalXp, bg: 'var(--level-b1-bg)' },
      { icon: '🎯', label: 'O\'rtacha natija', value: `${stats.avgScore}%`, bg: 'var(--level-a2-bg)' }
    ];

    grid.innerHTML = items.map(item => `
      <div class="stat-card">
        <div class="stat-card-icon" style="background:${item.bg}">${item.icon}</div>
        <div class="stat-card-content">
          <div class="stat-card-value">${item.value}</div>
          <div class="stat-card-label">${item.label}</div>
        </div>
      </div>
    `).join('');
  }

  function renderContinueLearningHtml() {
    const nextLesson = findNextLesson();
    if (!nextLesson) return '';

    return `
      <div class="section">
        <div class="section-header"><h2 class="section-title">Davom ettirish</h2></div>
        <a href="lesson.html?id=${nextLesson.lesson.id}" class="continue-card">
          <div class="continue-card-icon">${nextLesson.lesson.icon || '📘'}</div>
          <div class="continue-card-content">
            <div class="continue-card-label">${nextLesson.level.name}</div>
            <div class="continue-card-title">${nextLesson.lesson.title}</div>
            <div class="continue-card-meta">
              <span>⏱ ${nextLesson.lesson.duration || 15} daqiqa</span>
              <span>📝 ${(nextLesson.lesson.exercises?.length || 0) + (nextLesson.lesson.quiz?.length || 0)} mashq</span>
            </div>
          </div>
          <div class="continue-card-arrow">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.3 15.7a1 1 0 010-1.4L11.58 10 7.3 5.7a1 1 0 011.42-1.4l5 5a1 1 0 010 1.4l-5 5a1 1 0 01-1.42 0z" clip-rule="evenodd"/></svg>
          </div>
        </a>
      </div>
    `;
  }

  /** Birinchi tugallanmagan, ochiq darsni topadi */
  function findNextLesson() {
    for (const level of curriculum.levels) {
      for (const lesson of level.lessons) {
        if (ProgressManager.isLessonUnlocked(lesson.id) && !ProgressManager.isLessonCompleted(lesson.id)) {
          return { level, lesson };
        }
      }
    }
    return null;
  }

  function renderLevelCards() {
    const grid = document.querySelector('[data-levels-grid]');
    if (!grid) return;

    grid.innerHTML = curriculum.levels.map(level => {
      const completed = level.lessons.filter(l => ProgressManager.isLessonCompleted(l.id)).length;
      const progress = Math.round((completed / level.lessons.length) * 100);
      const isLocked = !level.lessons.some(l => ProgressManager.isLessonUnlocked(l.id));

      return `
        <a href="#lessons?level=${level.id}" class="level-card ${level.id}" data-level-link="${level.id}">
          <div class="level-card-label">${level.id.toUpperCase()}</div>
          <div class="level-card-name">${level.name}</div>
          <div class="level-card-desc">${level.lessons.length} ta dars</div>
          <div class="level-card-progress">
            <div class="level-card-progress-fill" style="width:${progress}%"></div>
          </div>
          <div class="level-card-stats">
            <span>${completed}/${level.lessons.length} tugatildi</span>
            <span>${progress}%</span>
          </div>
          ${isLocked ? `<div class="level-card-locked"><span>🔒</span> Oldingi darajani tugating</div>` : ''}
        </a>
      `;
    }).join('');

    grid.querySelectorAll('[data-level-link]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(`lessons?level=${link.dataset.levelLink}`);
      });
    });
  }

  function renderRecentActivity() {
    const el = document.querySelector('[data-recent-activity]');
    if (!el) return;

    const state = ProgressManager.getState();
    const completed = Object.entries(state.completedLessons)
      .sort((a, b) => b[1].completedAt - a[1].completedAt)
      .slice(0, 5);

    if (!completed.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding: var(--space-8);">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-title">Hali faollik yo'q</div>
          <div class="empty-state-desc">Birinchi darsni boshlang va bu yerda ko'rinadi</div>
        </div>`;
      return;
    }

    el.innerHTML = `<div class="activity-list">${completed.map(([lessonId, data]) => {
      const lesson = findLessonById(lessonId);
      return `
        <div class="activity-item">
          <div class="activity-icon lesson">📘</div>
          <div class="activity-content">
            <div class="activity-text"><strong>${lesson?.lesson.title || lessonId}</strong> darsini tugatdingiz</div>
            <div class="activity-time">${formatRelativeTime(data.completedAt)}</div>
          </div>
          <span class="activity-xp">+20 XP</span>
        </div>`;
    }).join('')}</div>`;
  }

  function findLessonById(lessonId) {
    for (const level of curriculum.levels) {
      const lesson = level.lessons.find(l => l.id === lessonId);
      if (lesson) return { level, lesson };
    }
    return null;
  }

  const UZBEK_MONTHS = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
  ];

  /** Sanani "21 iyun" yoki "21 iyun 2025" formatida qaytaradi (uz-UZ lokali ba'zi brauzerlarda to'liq qo'llab-quvvatlanmagani uchun qo'lda formatlanadi) */
  function formatUzbekDate(date, includeYear = false) {
    const day = date.getDate();
    const month = UZBEK_MONTHS[date.getMonth()];
    return includeYear ? `${day} ${month} ${date.getFullYear()}` : `${day} ${month}`;
  }

  function formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'hozirgina';
    if (minutes < 60) return `${minutes} daqiqa oldin`;
    if (hours < 24) return `${hours} soat oldin`;
    if (days < 7) return `${days} kun oldin`;
    return formatUzbekDate(new Date(timestamp), true);
  }

  function renderDailyGoals() {
    const el = document.querySelector('[data-daily-goals]');
    if (!el) return;

    const state = ProgressManager.getState();
    const { lessonsTarget, xpTarget, lessonsToday, xpToday } = state.dailyGoal;
    const weekActivity = ProgressManager.getWeekActivity();
    const dayLabels = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

    el.innerHTML = `
      <div class="daily-goals-header">
        <span class="daily-goals-title">Bugungi maqsad</span>
        <span class="daily-goals-date">${formatUzbekDate(new Date())}</span>
      </div>
      <div class="daily-goal-item ${lessonsToday >= lessonsTarget ? 'completed' : ''}">
        <div class="daily-goal-icon" style="background:var(--level-a1-bg)">📘</div>
        <div class="daily-goal-info">
          <div class="daily-goal-name">${lessonsTarget} ta dars tugatish</div>
          <div class="daily-goal-progress-text">${lessonsToday}/${lessonsTarget} bajarildi</div>
        </div>
        <div class="daily-goal-check">✓</div>
      </div>
      <div class="daily-goal-item ${xpToday >= xpTarget ? 'completed' : ''}">
        <div class="daily-goal-icon" style="background:var(--level-b1-bg)">⚡</div>
        <div class="daily-goal-info">
          <div class="daily-goal-name">${xpTarget} XP yig'ish</div>
          <div class="daily-goal-progress-text">${xpToday}/${xpTarget} XP</div>
        </div>
        <div class="daily-goal-check">✓</div>
      </div>
      <div class="week-streak">
        ${weekActivity.map((day, i) => `
          <div class="streak-day ${day.active ? 'completed' : ''} ${day.isToday ? 'today' : ''}">
            <span class="streak-day-label">${dayLabels[new Date(day.date).getDay()]}</span>
            <span class="streak-day-dot">${day.active ? '🔥' : ''}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderWordOfDay() {
    const el = document.querySelector('[data-word-of-day]');
    if (!el || !vocabulary?.words?.length) return;

    // Sana asosida deterministik so'z tanlash (har kuni bir xil so'z)
    const dayIndex = Math.floor(Date.now() / 86400000) % vocabulary.words.length;
    const word = vocabulary.words[dayIndex];

    el.innerHTML = `
      <div class="word-of-day">
        <div class="word-of-day-label">📅 Kun so'zi</div>
        <div class="word-of-day-czech">${word.czech}</div>
        ${word.pronunciation ? `<div class="word-of-day-pronunciation">[${word.pronunciation}]</div>` : ''}
        <div class="word-of-day-translation">${word.translation}</div>
        ${word.example ? `<div class="word-of-day-example">"${word.example}"</div>` : ''}
        <div class="word-of-day-actions">
          <button class="hero-btn-secondary" data-word-favorite="${word.id}">
            ${ProgressManager.isFavorite(word.id) ? '★ Saqlangan' : '☆ Saqlash'}
          </button>
        </div>
      </div>
    `;
  }

  function renderQuickActions() {
    const el = document.querySelector('[data-quick-actions]');
    if (!el) return;

    const actions = [
      { icon: '🎴', label: 'Flashcards', route: 'flashcards', bg: 'var(--level-a1-bg)' },
      { icon: '🎯', label: 'Test ishlash', route: 'quiz', bg: 'var(--level-b1-bg)' },
      { icon: '🎧', label: 'Tinglash', route: 'listening', bg: 'var(--level-c1-bg)' },
      { icon: '🗣️', label: 'Talaffuz', route: 'speaking', bg: 'var(--level-b2-bg)' },
      { icon: '✍️', label: 'Yozish mashqi', route: 'writing', bg: 'var(--level-a2-bg)' },
      { icon: '📊', label: 'Statistika', route: 'progress', bg: 'var(--level-b2-bg)' }
    ];

    el.innerHTML = actions.map(a => `
      <a href="#${a.route}" class="quick-action-card">
        <div class="quick-action-icon" style="background:${a.bg}">${a.icon}</div>
        <span class="quick-action-label">${a.label}</span>
      </a>
    `).join('');
  }

  /* ============================================================
     LESSONS PAGE
     ============================================================ */

  function renderLessonsPage() {
    const main = document.querySelector('[data-main-content]');
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const filterLevel = params.get('level');

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Darslar</h1>
        <p class="page-subtitle">A1 dan C1 gacha bo'lgan barcha darajalardagi darslar</p>
      </div>
      <div class="tab-list-pill mb-6" data-level-tabs role="tablist">
        <button class="tab-item ${!filterLevel ? 'active' : ''}" data-filter-level="all">Barchasi</button>
        ${curriculum.levels.map(l => `
          <button class="tab-item ${filterLevel === l.id ? 'active' : ''}" data-filter-level="${l.id}">${l.id.toUpperCase()}</button>
        `).join('')}
      </div>
      <div data-lessons-list></div>
    `;

    renderLessonsList(filterLevel);

    document.querySelectorAll('[data-filter-level]').forEach(btn => {
      btn.addEventListener('click', () => {
        const level = btn.dataset.filterLevel;
        navigateTo(level === 'all' ? 'lessons' : `lessons?level=${level}`);
      });
    });
  }

  function renderLessonsList(filterLevel) {
    const container = document.querySelector('[data-lessons-list]');
    const levels = filterLevel ? curriculum.levels.filter(l => l.id === filterLevel) : curriculum.levels;

    container.innerHTML = levels.map(level => `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">
            <span class="level-badge ${level.id}"><span class="level-dot"></span>${level.id.toUpperCase()}</span>
            ${level.name}
          </h2>
        </div>
        <div class="grid-auto stagger">
          ${level.lessons.map(lesson => renderLessonCard(lesson, level)).join('')}
        </div>
      </div>
    `).join('');
  }

  function renderLessonCard(lesson, level) {
    const isCompleted = ProgressManager.isLessonCompleted(lesson.id);
    const isUnlocked = ProgressManager.isLessonUnlocked(lesson.id);
    const progressData = ProgressManager.getState().completedLessons[lesson.id];

    return `
      <a href="${isUnlocked ? `lesson.html?id=${lesson.id}` : '#'}" class="lesson-card ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}">
        <div class="lesson-card-header">
          <div class="lesson-card-icon" style="background:var(--level-${level.id}-bg)">${lesson.icon || '📘'}</div>
          ${isCompleted ? '<span class="badge badge-success">✓</span>' : !isUnlocked ? '<span class="badge badge-neutral">🔒</span>' : ''}
        </div>
        <div>
          <div class="lesson-card-title">${lesson.title}</div>
          <p class="lesson-card-desc">${lesson.description}</p>
        </div>
        <div class="lesson-card-footer">
          <div class="lesson-card-progress">
            <div class="progress-bar sm">
              <div class="progress-bar-fill" style="width:${isCompleted ? 100 : 0}%"></div>
            </div>
          </div>
          ${progressData?.stars ? `<span class="text-xs">⭐ ${progressData.stars}</span>` : ''}
        </div>
      </a>
    `;
  }

  /* ============================================================
     VOCABULARY PAGE
     ============================================================ */

  function renderVocabularyPage() {
    const main = document.querySelector('[data-main-content]');
    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Lug'at</h1>
        <p class="page-subtitle">${vocabulary.words.length} ta so'z — barchasini o'rganib chiqing</p>
      </div>
      <div class="grid-auto stagger" data-vocab-list></div>
    `;

    const list = document.querySelector('[data-vocab-list]');
    const state = ProgressManager.getState();

    list.innerHTML = vocabulary.words.map(word => {
      const wordState = state.vocabulary[word.id];
      const status = wordState?.status || 'new';
      const statusBadge = { new: '', learning: '<span class="badge badge-warning">O\'rganilmoqda</span>', mastered: '<span class="badge badge-success">O\'zlashtirilgan</span>' };

      return `
        <div class="card">
          <div class="flex justify-between items-start mb-3">
            <div>
              <div class="czech-text text-lg font-semibold">${word.czech}</div>
              ${word.pronunciation ? `<div class="text-xs text-tertiary">[${word.pronunciation}]</div>` : ''}
            </div>
            ${statusBadge[status]}
          </div>
          <div class="text-secondary text-sm mb-2">${word.translation}</div>
          ${word.example ? `<div class="text-xs text-tertiary" style="font-style:italic">${word.example}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     FLASHCARDS PAGE
     ============================================================ */

  function renderFlashcardsPage() {
    const main = document.querySelector('[data-main-content]');
    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Flashcards</h1>
        <p class="page-subtitle">So'zlarni takrorlang va eslab qoling</p>
      </div>
      <div data-flashcard-container></div>
    `;

    FlashcardEngine.start({
      container: document.querySelector('[data-flashcard-container]'),
      wordList: vocabulary.words,
      onComplete: () => navigateTo('dashboard')
    });
  }

  /* ============================================================
     QUIZ LIST PAGE
     ============================================================ */

  function renderQuizListPage() {
    const main = document.querySelector('[data-main-content]');
    const lessonsWithQuiz = curriculum.levels.flatMap(level =>
      level.lessons.filter(l => l.quiz?.length).map(l => ({ ...l, level }))
    );

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Testlar</h1>
        <p class="page-subtitle">Bilimingizni sinab ko'ring</p>
      </div>
      <div class="grid-auto stagger">
        ${lessonsWithQuiz.map(lesson => `
          <a href="lesson.html?id=${lesson.id}#quiz" class="lesson-card ${!ProgressManager.isLessonUnlocked(lesson.id) ? 'locked' : ''}">
            <div class="lesson-card-header">
              <div class="lesson-card-icon" style="background:var(--level-${lesson.level.id}-bg)">🎯</div>
              <span class="level-badge ${lesson.level.id}">${lesson.level.id.toUpperCase()}</span>
            </div>
            <div class="lesson-card-title">${lesson.title}</div>
            <p class="lesson-card-desc">${lesson.quiz.length} ta savol</p>
          </a>
        `).join('')}
      </div>
    `;
  }

  /* ============================================================
     LISTENING PAGE
     ============================================================ */

  function renderListeningPage() {
    const main = document.querySelector('[data-main-content]');
    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Tinglash mashqlari</h1>
        <p class="page-subtitle">Jumlalarni tinglang va tushunganingizni tekshiring — brauzeringizning ovoz sintezatori orqali</p>
      </div>
      <div class="tab-list-pill mb-6" data-listening-level-tabs role="tablist">
        <button class="tab-item active" data-listening-filter="all">Barchasi</button>
        <button class="tab-item" data-listening-filter="a1">A1</button>
        <button class="tab-item" data-listening-filter="a2">A2</button>
        <button class="tab-item" data-listening-filter="b1">B1</button>
        <button class="tab-item" data-listening-filter="b2">B2</button>
        <button class="tab-item" data-listening-filter="c1">C1</button>
      </div>
      <div data-listening-container></div>
    `;

    loadAndStartListening('all');

    document.querySelectorAll('[data-listening-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-listening-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadAndStartListening(btn.dataset.listeningFilter);
      });
    });
  }

  let listeningData = null;

  async function loadAndStartListening(levelFilter) {
    const container = document.querySelector('[data-listening-container]');
    if (!container) return;

    if (!listeningData) {
      try {
        listeningData = await fetchJson('data/listening.json');
      } catch (e) {
        container.innerHTML = `<div class="alert alert-error"><span class="alert-icon">⚠️</span><div class="alert-content">Tinglash mashqlarini yuklab bo'lmadi.</div></div>`;
        return;
      }
    }

    const filtered = levelFilter === 'all'
      ? listeningData.exercises
      : listeningData.exercises.filter(ex => ex.level === levelFilter);

    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🎧</div><div class="empty-state-title">Bu darajada mashq yo'q</div></div>`;
      return;
    }

    ListeningEngine.start({
      container,
      exerciseList: filtered,
      onCompleteCallback: () => navigateTo('dashboard')
    });
  }

  /* ============================================================
     SPEAKING PAGE
     ============================================================ */

  function renderSpeakingPage() {
    const main = document.querySelector('[data-main-content]');
    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Talaffuz mashqlari</h1>
        <p class="page-subtitle">Jumlalarni tinglang, so'ng mikrofon orqali takrorlang va talaffuzingizni tekshiring</p>
      </div>
      ${!SpeakingEngine.isSupported() ? `
        <div class="alert alert-info mb-6">
          <span class="alert-icon">ℹ️</span>
          <div class="alert-content">
            <div class="alert-title">Eslatma</div>
            <div>Brauzeringiz mikrofon orqali tekshirishni qo'llab-quvvatlamaydi. Chrome yoki Edge brauzerida to'liq funksiya ishlaydi.</div>
          </div>
        </div>` : ''}
      <div class="tab-list-pill mb-6" data-speaking-level-tabs role="tablist">
        <button class="tab-item active" data-speaking-filter="all">Barchasi</button>
        <button class="tab-item" data-speaking-filter="a1">A1</button>
        <button class="tab-item" data-speaking-filter="a2">A2</button>
        <button class="tab-item" data-speaking-filter="b1">B1</button>
        <button class="tab-item" data-speaking-filter="b2">B2</button>
        <button class="tab-item" data-speaking-filter="c1">C1</button>
      </div>
      <div data-speaking-container></div>
    `;

    loadAndStartSpeaking('all');

    document.querySelectorAll('[data-speaking-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-speaking-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadAndStartSpeaking(btn.dataset.speakingFilter);
      });
    });
  }

  let speakingData = null;

  async function loadAndStartSpeaking(levelFilter) {
    const container = document.querySelector('[data-speaking-container]');
    if (!container) return;

    if (!speakingData) {
      try {
        speakingData = await fetchJson('data/speaking.json');
      } catch (e) {
        container.innerHTML = `<div class="alert alert-error"><span class="alert-icon">⚠️</span><div class="alert-content">Talaffuz mashqlarini yuklab bo'lmadi.</div></div>`;
        return;
      }
    }

    const filtered = levelFilter === 'all'
      ? speakingData.exercises
      : speakingData.exercises.filter(ex => ex.level === levelFilter);

    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🗣️</div><div class="empty-state-title">Bu darajada mashq yo'q</div></div>`;
      return;
    }

    SpeakingEngine.start({
      container,
      exerciseList: filtered,
      onCompleteCallback: () => navigateTo('dashboard')
    });
  }

  /* ============================================================
     WRITING PAGE
     ============================================================ */

  function renderWritingPage() {
    const main = document.querySelector('[data-main-content]');
    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Yozish mashqlari</h1>
        <p class="page-subtitle">Tarjima qiling, gaplarni to'ldiring va erkin yozuv mashq qiling</p>
      </div>
      <div class="tab-list-pill mb-6" data-writing-level-tabs role="tablist">
        <button class="tab-item active" data-writing-filter="all">Barchasi</button>
        <button class="tab-item" data-writing-filter="a1">A1</button>
        <button class="tab-item" data-writing-filter="a2">A2</button>
        <button class="tab-item" data-writing-filter="b1">B1</button>
        <button class="tab-item" data-writing-filter="b2">B2</button>
        <button class="tab-item" data-writing-filter="c1">C1</button>
      </div>
      <div data-writing-container></div>
    `;

    loadAndStartWriting('all');

    document.querySelectorAll('[data-writing-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-writing-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadAndStartWriting(btn.dataset.writingFilter);
      });
    });
  }

  let writingData = null;

  async function loadAndStartWriting(levelFilter) {
    const container = document.querySelector('[data-writing-container]');
    if (!container) return;

    if (!writingData) {
      try {
        writingData = await fetchJson('data/writing.json');
      } catch (e) {
        container.innerHTML = `<div class="alert alert-error"><span class="alert-icon">⚠️</span><div class="alert-content">Yozish mashqlarini yuklab bo'lmadi.</div></div>`;
        return;
      }
    }

    const filtered = levelFilter === 'all'
      ? writingData.exercises
      : writingData.exercises.filter(ex => ex.level === levelFilter);

    if (!filtered.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✍️</div><div class="empty-state-title">Bu darajada mashq yo'q</div></div>`;
      return;
    }

    WritingEngine.start({
      container,
      exerciseList: filtered,
      onCompleteCallback: () => navigateTo('dashboard')
    });
  }

  /* ============================================================
     FAVORITES PAGE
     ============================================================ */

  function renderFavoritesPage() {
    const main = document.querySelector('[data-main-content]');
    const state = ProgressManager.getState();
    const favLessons = state.favorites
      .map(id => findLessonById(id))
      .filter(Boolean);

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Sevimlilar</h1>
        <p class="page-subtitle">Siz belgilab qo'ygan darslar</p>
      </div>
      ${favLessons.length ? `
        <div class="grid-auto stagger">
          ${favLessons.map(({ lesson, level }) => renderLessonCard(lesson, level)).join('')}
        </div>
      ` : `
        <div class="empty-state">
          <div class="empty-state-icon">⭐</div>
          <div class="empty-state-title">Hali sevimlilar yo'q</div>
          <div class="empty-state-desc">Darslarni sevimlilarga qo'shish uchun yurak belgisini bosing</div>
          <a href="#lessons" class="btn btn-primary mt-4">Darslarni ko'rish</a>
        </div>
      `}
    `;
  }

  /* ============================================================
     ACHIEVEMENTS PAGE
     ============================================================ */

  function renderAchievementsPage() {
    const main = document.querySelector('[data-main-content]');
    const achievements = AchievementsManager.getAllWithStatus();

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Yutuqlar</h1>
        <p class="page-subtitle">${AchievementsManager.getUnlockedCount()}/${AchievementsManager.getTotalCount()} yutuq ochilgan</p>
      </div>
      <div class="grid-auto stagger">
        ${achievements.map(a => `
          <div class="card" style="text-align:center; ${!a.unlocked ? 'opacity:0.5;filter:grayscale(1)' : ''}">
            <div style="font-size:40px;margin-bottom:var(--space-3)">${a.icon}</div>
            <div class="font-bold mb-2">${a.name}</div>
            <div class="text-sm text-secondary">${a.description}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /* ============================================================
     PROGRESS PAGE
     ============================================================ */

  function renderProgressPage() {
    const main = document.querySelector('[data-main-content]');
    const stats = ProgressManager.getStats();
    const levelInfo = ProgressManager.getLevelInfo();

    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Progress</h1>
        <p class="page-subtitle">Sizning o'rganish statistikangiz</p>
      </div>
      <div class="stats-grid stagger mb-8">
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--level-a1-bg)">📘</div><div class="stat-card-content"><div class="stat-card-value">${stats.completedLessons}</div><div class="stat-card-label">Tugatilgan darslar</div></div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--color-warning-100)">🔥</div><div class="stat-card-content"><div class="stat-card-value">${stats.longestStreak}</div><div class="stat-card-label">Eng uzun streak</div></div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--level-b1-bg)">⚡</div><div class="stat-card-content"><div class="stat-card-value">${stats.totalXp}</div><div class="stat-card-label">Jami XP</div></div></div>
        <div class="stat-card"><div class="stat-card-icon" style="background:var(--level-a2-bg)">🏆</div><div class="stat-card-content"><div class="stat-card-value">${stats.achievementsCount}</div><div class="stat-card-label">Yutuqlar</div></div></div>
      </div>
      <div class="card mb-6" style="background: var(--gradient-hero); border: none;">
        <div class="flex items-center gap-4" style="flex-wrap: wrap;">
          <div style="font-size: 48px; flex-shrink: 0;">🎓</div>
          <div style="flex: 1; min-width: 240px;">
            <h3 style="color: white; margin-bottom: var(--space-1);">Tugatish sertifikati</h3>
            <p style="color: rgba(255,255,255,0.8); font-size: var(--text-sm); margin-bottom: var(--space-3);">
              ${CertificateEngine.isEligible()
                ? `Tabriklaymiz! Siz barcha ${CertificateEngine.TOTAL_LESSONS_REQUIRED} ta darsni tugatdingiz va sertifikatga ega bo'lish huquqiga egasiz.`
                : `Sertifikat olish uchun yana <strong>${CertificateEngine.lessonsRemaining()}</strong> ta dars qoldi (${stats.completedLessons}/${CertificateEngine.TOTAL_LESSONS_REQUIRED}).`}
            </p>
            <div class="progress-bar md" style="background: rgba(255,255,255,0.2); margin-bottom: var(--space-3);">
              <div class="progress-bar-fill" style="width:${Math.min(100, Math.round((stats.completedLessons / CertificateEngine.TOTAL_LESSONS_REQUIRED) * 100))}%; background: white;"></div>
            </div>
            <button class="hero-btn-primary" data-open-certificate ${!CertificateEngine.isEligible() ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
              🎓 Sertifikatni olish
            </button>
          </div>
        </div>
      </div>
      <div class="card mb-6">
        <h3 class="mb-4">Daraja bo'yicha progress</h3>
        ${curriculum.levels.map(level => {
          const progress = ProgressManager.getLevelProgress(level.id, level.lessons.length);
          return `
            <div class="mb-4">
              <div class="flex justify-between mb-2 text-sm">
                <span class="level-badge ${level.id}">${level.id.toUpperCase()}</span>
                <span class="text-secondary">${progress}%</span>
              </div>
              <div class="progress-bar md"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="card">
        <h3 class="mb-4">Lug'at statistikasi</h3>
        <div class="flex gap-6">
          <div><div class="stat-card-value">${stats.wordsTotal}</div><div class="text-sm text-tertiary">Boshlangan</div></div>
          <div><div class="stat-card-value" style="color:var(--color-success-600)">${stats.wordsMastered}</div><div class="text-sm text-tertiary">O'zlashtirilgan</div></div>
        </div>
      </div>
    `;

    document.querySelector('[data-open-certificate]')?.addEventListener('click', () => {
      CertificateEngine.openNameModal();
    });
  }

  /* ============================================================
     SETTINGS PAGE
     ============================================================ */

  function renderSettingsPage() {
    const main = document.querySelector('[data-main-content]');
    main.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Sozlamalar</h1>
        <p class="page-subtitle">Ilova sozlamalarini boshqaring</p>
      </div>
      <div class="card mb-4">
        <h3 class="mb-4">Ko'rinish</h3>
        <div class="flex justify-between items-center">
          <span>Qorong'u rejim</span>
          <button class="btn btn-secondary btn-sm" data-theme-toggle>Almashtirish</button>
        </div>
      </div>
      <div class="card mb-4">
        <h3 class="mb-4">Ma'lumotlar</h3>
        <div class="flex gap-3 flex-wrap">
          <button class="btn btn-secondary" data-export-data>Progressni eksport qilish</button>
          <button class="btn btn-danger" data-reset-data>Barchasini tozalash</button>
        </div>
      </div>
      <div class="card">
        <h3 class="mb-4">Ilova haqida</h3>
        <p class="text-sm text-secondary">CzechMaster v1.0.0 — Chex tilini o'rganish platformasi</p>
      </div>
    `;

    document.querySelector('[data-export-data]').addEventListener('click', () => {
      const data = ProgressManager.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'czechmaster-progress.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    document.querySelector('[data-reset-data]').addEventListener('click', () => {
      if (ProgressManager.resetAll()) {
        ToastManager.success('Progress tozalandi');
        setTimeout(() => location.reload(), 1000);
      }
    });
  }

  /* ============================================================
     GLOBAL EVENTS (Sidebar toggle, mobile menu, search)
     ============================================================ */

  function bindGlobalEvents() {
    document.querySelector('[data-sidebar-toggle]')?.addEventListener('click', () => {
      document.querySelector('.app-sidebar')?.classList.toggle('collapsed');
    });

    document.querySelector('[data-menu-toggle]')?.addEventListener('click', openMobileSidebar);
    document.querySelector('[data-sidebar-overlay]')?.addEventListener('click', closeMobileSidebar);

    document.querySelectorAll('[data-mobile-route]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.mobileRoute));
    });
  }

  function openMobileSidebar() {
    document.querySelector('.app-sidebar')?.classList.add('open');
    const overlay = document.querySelector('[data-sidebar-overlay]');
    overlay?.classList.add('visible');
  }

  function closeMobileSidebar() {
    document.querySelector('.app-sidebar')?.classList.remove('open');
    document.querySelector('[data-sidebar-overlay]')?.classList.remove('visible');
  }

  return { init, navigateTo };
})();

document.addEventListener('DOMContentLoaded', App.init);
