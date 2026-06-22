/**
 * CzechMaster — Achievements Manager
 * =====================================
 * Yutuqlarni (badge) tekshiradi, ochadi va bildirishnoma ko'rsatadi.
 * Yutuq ma'lumotlari data/achievements.json faylida saqlanadi.
 */
'use strict';

const AchievementsManager = (() => {
  let definitions = [];

  /** achievements.json faylini yuklaydi */
  async function loadDefinitions() {
    if (definitions.length) return definitions;
    try {
      const res = await fetch('data/achievements.json');
      const data = await res.json();
      definitions = data.achievements || [];
    } catch (e) {
      console.error('Achievements yuklashda xatolik:', e);
      definitions = [];
    }
    return definitions;
  }

  /** Yutuqni ochadi (agar hali ochilmagan bo'lsa) */
  function unlock(achievementId) {
    const state = ProgressManager.getState();
    if (state.achievements.includes(achievementId)) return false;

    state.achievements.push(achievementId);
    ProgressManager.save();

    const def = definitions.find(a => a.id === achievementId);
    if (def) showUnlockToast(def);
    return true;
  }

  /** Yutuq ochilganda toast ko'rsatadi */
  function showUnlockToast(def) {
    if (typeof ToastManager !== 'undefined') {
      ToastManager.show({
        type: 'success',
        title: '🏆 Yangi yutuq!',
        message: `${def.icon} ${def.name} — ${def.description}`,
        duration: 5000
      });
    }
    document.dispatchEvent(new CustomEvent('achievementunlocked', { detail: { achievement: def } }));
  }

  /** Streak asosidagi yutuqlarni tekshiradi */
  function checkStreakAchievements(streak) {
    const streakMap = { 3: 'streak_3', 7: 'streak_7', 14: 'streak_14', 30: 'streak_30', 100: 'streak_100' };
    if (streakMap[streak]) unlock(streakMap[streak]);
  }

  /** Tugatilgan darslar soni asosidagi yutuqlarni tekshiradi */
  function checkLessonAchievements(completedLessons) {
    const count = Object.keys(completedLessons).length;
    const countMap = { 1: 'first_lesson', 10: 'lessons_10', 25: 'lessons_25', 50: 'lessons_50', 100: 'lessons_100' };
    if (countMap[count]) unlock(countMap[count]);

    // Daraja bo'yicha yutuqlar (masalan barcha A1 darslarini tugatish)
    ['a1', 'a2', 'b1', 'b2', 'c1'].forEach(level => {
      const levelLessons = Object.keys(completedLessons).filter(id => id.startsWith(level));
      if (levelLessons.length > 0) {
        document.dispatchEvent(new CustomEvent('checklevelcompletion', { detail: { level, count: levelLessons.length } }));
      }
    });
  }

  /** Darajani to'liq tugatganda chaqiriladi (curriculum.js orqali) */
  function checkLevelCompletion(level, completedCount, totalCount) {
    if (completedCount >= totalCount && totalCount > 0) {
      unlock(`level_${level}_complete`);
    }
  }

  /** Mukammal test natijasi uchun yutuq */
  function checkPerfectScore(score, total) {
    if (score === total && total > 0) unlock('perfect_score');
  }

  /** Lug'at o'zlashtirish yutuqlari */
  function checkVocabAchievements(masteredCount) {
    const map = { 10: 'vocab_10', 50: 'vocab_50', 100: 'vocab_100', 250: 'vocab_250' };
    if (map[masteredCount]) unlock(map[masteredCount]);
  }

  /** Barcha yutuqlarni (ochilgan + qulflangan holatda) qaytaradi */
  function getAllWithStatus() {
    const state = ProgressManager.getState();
    return definitions.map(def => ({
      ...def,
      unlocked: state.achievements.includes(def.id),
      unlockedAt: state.achievements.includes(def.id) ? Date.now() : null
    }));
  }

  function getUnlockedCount() {
    return ProgressManager.getState().achievements.length;
  }

  function getTotalCount() {
    return definitions.length;
  }

  return {
    loadDefinitions, unlock,
    checkStreakAchievements, checkLessonAchievements, checkLevelCompletion,
    checkPerfectScore, checkVocabAchievements,
    getAllWithStatus, getUnlockedCount, getTotalCount
  };
})();
