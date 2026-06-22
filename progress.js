/**
 * CzechMaster — Progress System
 * ================================
 * Foydalanuvchi progressini boshqaradi: XP, daraja, streak,
 * tugatilgan darslar, test natijalari, bookmarklar.
 * Barcha ma'lumotlar localStorage'da JSON sifatida saqlanadi.
 */
'use strict';

const ProgressManager = (() => {
  const STORAGE_KEY = 'czechmaster_progress';
  const XP_PER_LEVEL = 100;

  /** Default progress strukturasi */
  const DEFAULT_STATE = {
    xp: 0,
    totalXp: 0,
    streak: 0,
    longestStreak: 0,
    lastActiveDate: null,
    completedLessons: {},     // { lessonId: { score, stars, completedAt, attempts } }
    unlockedLessons: ['a1-01'], // Boshlang'ich ochiq dars
    favorites: [],             // lessonId ro'yxati
    bookmarks: [],             // { lessonId, sectionId, note, createdAt }
    vocabulary: {},            // { wordId: { status: 'new'|'learning'|'mastered', reviewCount, lastReview } }
    achievements: [],          // achievementId ro'yxati
    quizHistory: [],           // { lessonId, score, total, date }
    dailyGoal: { lessonsTarget: 1, xpTarget: 50, lessonsToday: 0, xpToday: 0, date: null },
    settings: { soundEnabled: true, autoPlayAudio: false, fontSize: 'normal' },
    weekActivity: {},          // { 'YYYY-MM-DD': true }
    createdAt: null
  };

  let state = null;

  /** State'ni localStorage'dan yuklaydi yoki default qiymat yaratadi */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE, createdAt: Date.now() };
    } catch (e) {
      console.error('Progress yuklashda xatolik:', e);
      state = { ...DEFAULT_STATE, createdAt: Date.now() };
    }
    checkStreak();
    resetDailyGoalIfNeeded();
    save();
    return state;
  }

  /** State'ni localStorage'ga saqlaydi */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      document.dispatchEvent(new CustomEvent('progresschange', { detail: { state } }));
    } catch (e) {
      console.error('Progress saqlashda xatolik:', e);
    }
  }

  /** Bugungi sanani YYYY-MM-DD formatida qaytaradi */
  function todayKey() {
    return new Date().toISOString().split('T')[0];
  }

  /** Kunlik maqsadni yangi kun bo'lsa qayta o'rnatadi */
  function resetDailyGoalIfNeeded() {
    const today = todayKey();
    if (state.dailyGoal.date !== today) {
      state.dailyGoal.date = today;
      state.dailyGoal.lessonsToday = 0;
      state.dailyGoal.xpToday = 0;
    }
  }

  /** Streak hisoblashni tekshiradi (ketma-ket kunlar) */
  function checkStreak() {
    const today = todayKey();
    if (!state.lastActiveDate) return;

    const last = new Date(state.lastActiveDate);
    const now = new Date(today);
    const diffDays = Math.round((now - last) / 86400000);

    if (diffDays === 1) {
      // Ketma-ket kun — streak davom etadi (markActive chaqirilganda oshadi)
    } else if (diffDays > 1) {
      // Streak uzilgan
      state.streak = 0;
    }
  }

  /** Foydalanuvchi faolligini belgilaydi va streak'ni yangilaydi */
  function markActive() {
    const today = todayKey();
    if (state.lastActiveDate === today) return; // Bugun allaqachon belgilangan

    const wasYesterday = state.lastActiveDate &&
      Math.round((new Date(today) - new Date(state.lastActiveDate)) / 86400000) === 1;

    state.streak = wasYesterday ? state.streak + 1 : 1;
    state.longestStreak = Math.max(state.longestStreak, state.streak);
    state.lastActiveDate = today;
    state.weekActivity[today] = true;
    save();

    AchievementsManager?.checkStreakAchievements?.(state.streak);
  }

  /** XP qo'shadi va levelni hisoblaydi */
  function addXp(amount) {
    state.xp += amount;
    state.totalXp += amount;
    state.dailyGoal.xpToday += amount;
    markActive();
    save();
    return getLevelInfo();
  }

  /** Joriy XP darajasi haqida ma'lumot */
  function getLevelInfo() {
    const level = Math.floor(state.totalXp / XP_PER_LEVEL) + 1;
    const xpInCurrentLevel = state.totalXp % XP_PER_LEVEL;
    const xpForNextLevel = XP_PER_LEVEL;
    const progressPercent = Math.round((xpInCurrentLevel / xpForNextLevel) * 100);
    return { level, xpInCurrentLevel, xpForNextLevel, progressPercent, totalXp: state.totalXp };
  }

  /** Darsni tugatilgan deb belgilaydi */
  function completeLesson(lessonId, { score, total, stars, nextLessonId } = {}) {
    const isFirstCompletion = !state.completedLessons[lessonId];
    const prevAttempts = state.completedLessons[lessonId]?.attempts || 0;

    state.completedLessons[lessonId] = {
      score: score ?? null,
      total: total ?? null,
      stars: stars ?? 3,
      completedAt: Date.now(),
      attempts: prevAttempts + 1
    };

    if (nextLessonId && !state.unlockedLessons.includes(nextLessonId)) {
      state.unlockedLessons.push(nextLessonId);
    }

    if (isFirstCompletion) {
      state.dailyGoal.lessonsToday += 1;
      addXp(20); // Dars tugatish uchun bonus XP
    }

    markActive();
    save();
    AchievementsManager?.checkLessonAchievements?.(state.completedLessons);

    return isFirstCompletion;
  }

  /** Dars ochilganmi tekshiradi */
  function isLessonUnlocked(lessonId) {
    return state.unlockedLessons.includes(lessonId);
  }

  /** Dars tugatilganmi tekshiradi */
  function isLessonCompleted(lessonId) {
    return !!state.completedLessons[lessonId];
  }

  /** Darsni qo'lda ochadi (masalan admin/test rejimi uchun) */
  function unlockLesson(lessonId) {
    if (!state.unlockedLessons.includes(lessonId)) {
      state.unlockedLessons.push(lessonId);
      save();
    }
  }

  /** Sevimlilarga qo'shish/olib tashlash */
  function toggleFavorite(lessonId) {
    const idx = state.favorites.indexOf(lessonId);
    if (idx === -1) {
      state.favorites.push(lessonId);
    } else {
      state.favorites.splice(idx, 1);
    }
    save();
    return idx === -1; // true = qo'shildi
  }

  function isFavorite(lessonId) {
    return state.favorites.includes(lessonId);
  }

  /** Bookmark qo'shish */
  function addBookmark(lessonId, sectionId, note = '') {
    state.bookmarks.push({ id: `bm_${Date.now()}`, lessonId, sectionId, note, createdAt: Date.now() });
    save();
  }

  function removeBookmark(bookmarkId) {
    state.bookmarks = state.bookmarks.filter(b => b.id !== bookmarkId);
    save();
  }

  /** Lug'at so'zi holatini yangilaydi (spaced repetition uchun asos) */
  function updateVocabWord(wordId, knewIt) {
    const word = state.vocabulary[wordId] || { status: 'new', reviewCount: 0, lastReview: null, correctStreak: 0 };
    word.reviewCount += 1;
    word.lastReview = Date.now();
    word.correctStreak = knewIt ? word.correctStreak + 1 : 0;
    word.status = word.correctStreak >= 3 ? 'mastered' : (word.reviewCount > 1 ? 'learning' : 'new');
    state.vocabulary[wordId] = word;
    save();
  }

  /** Test natijasini saqlaydi */
  function recordQuizResult(lessonId, score, total) {
    state.quizHistory.push({ lessonId, score, total, date: Date.now() });
    if (state.quizHistory.length > 100) state.quizHistory.shift(); // Faqat oxirgi 100ta
    save();
  }

  /** Umumiy statistika */
  function getStats() {
    const completedCount = Object.keys(state.completedLessons).length;
    const wordsTotal = Object.keys(state.vocabulary).length;
    const wordsMastered = Object.values(state.vocabulary).filter(w => w.status === 'mastered').length;
    const avgScore = state.quizHistory.length
      ? Math.round(state.quizHistory.reduce((sum, q) => sum + (q.score / q.total) * 100, 0) / state.quizHistory.length)
      : 0;

    return {
      completedLessons: completedCount,
      streak: state.streak,
      longestStreak: state.longestStreak,
      totalXp: state.totalXp,
      wordsTotal,
      wordsMastered,
      avgScore,
      achievementsCount: state.achievements.length
    };
  }

  /** Berilgan darajadagi progress foizini hisoblaydi */
  function getLevelProgress(levelId, totalLessonsInLevel) {
    if (!totalLessonsInLevel) return 0;
    const completed = Object.keys(state.completedLessons).filter(id => id.startsWith(levelId)).length;
    return Math.round((completed / totalLessonsInLevel) * 100);
  }

  /** Haftalik faollik (oxirgi 7 kun) */
  function getWeekActivity() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: key, active: !!state.weekActivity[key], isToday: i === 0 });
    }
    return days;
  }

  /** Barcha progressni reset qiladi */
  function resetAll() {
    if (!confirm('Barcha progress o\'chiriladi. Davom etasizmi?')) return false;
    state = { ...DEFAULT_STATE, createdAt: Date.now() };
    save();
    return true;
  }

  /** Progressni export qiladi (JSON backup) */
  function exportData() {
    return JSON.stringify(state, null, 2);
  }

  /** Progressni import qiladi */
  function importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      state = { ...DEFAULT_STATE, ...parsed };
      save();
      return true;
    } catch (e) {
      console.error('Import xatolik:', e);
      return false;
    }
  }

  function getState() {
    return state;
  }

  return {
    load, save, addXp, getLevelInfo,
    completeLesson, isLessonUnlocked, isLessonCompleted, unlockLesson,
    toggleFavorite, isFavorite,
    addBookmark, removeBookmark,
    updateVocabWord, recordQuizResult,
    getStats, getLevelProgress, getWeekActivity,
    markActive, resetAll, exportData, importData,
    getState
  };
})();
