/**
 * CzechMaster — Search Engine
 * =============================
 * Darslar va lug'at bo'yicha tezkor qidiruv.
 * Curriculum va vocabulary JSON'lari ustida ishlaydi.
 */
'use strict';

const SearchManager = (() => {
  let curriculum = null;
  let vocabulary = null;
  let searchIndex = [];
  let debounceTimer = null;

  /** Qidiruv uchun ma'lumotlarni yuklaydi va indekslaydi */
  async function init(curriculumData, vocabularyData) {
    curriculum = curriculumData;
    vocabulary = vocabularyData;
    buildIndex();
    bindEvents();
  }

  /** Qidiruv indeksini quradi (darslar + so'zlar) */
  function buildIndex() {
    searchIndex = [];

    // Darslarni indekslash
    (curriculum?.levels || []).forEach(level => {
      (level.lessons || []).forEach(lesson => {
        searchIndex.push({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          subtitle: `${level.name} • ${lesson.category || 'Dars'}`,
          searchText: `${lesson.title} ${lesson.description || ''} ${level.name}`.toLowerCase(),
          icon: lesson.icon || '📘',
          url: `lesson.html?id=${lesson.id}`
        });
      });
    });

    // Lug'at so'zlarini indekslash
    (vocabulary?.words || []).forEach(word => {
      searchIndex.push({
        type: 'word',
        id: word.id,
        title: word.czech,
        subtitle: word.translation,
        searchText: `${word.czech} ${word.translation} ${(word.tags || []).join(' ')}`.toLowerCase(),
        icon: '🔤',
        url: `index.html#vocabulary?word=${word.id}`
      });
    });
  }

  /** Oddiy fuzzy-style matching: barcha so'zlar mavjudligini tekshiradi */
  function matches(item, query) {
    const terms = query.toLowerCase().trim().split(/\s+/);
    return terms.every(term => item.searchText.includes(term));
  }

  /** Qidiruvni bajaradi va natijalarni guruhlaydi */
  function search(query) {
    if (!query || query.trim().length < 1) return { lessons: [], words: [] };

    const results = searchIndex.filter(item => matches(item, query));

    return {
      lessons: results.filter(r => r.type === 'lesson').slice(0, 6),
      words: results.filter(r => r.type === 'word').slice(0, 6)
    };
  }

  /** Matnda qidiruv so'zini <mark> bilan belgilaydi */
  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    const terms = query.trim().split(/\s+/).filter(Boolean).map(escapeRegex);
    if (!terms.length) return escapeHtml(text);
    const pattern = new RegExp(`(${terms.join('|')})`, 'gi');
    return escapeHtml(text).replace(pattern, '<span class="search-highlight">$1</span>');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Natijalarni dropdown'da render qiladi */
  function renderResults(query, resultsContainer) {
    const { lessons, words } = search(query);
    const total = lessons.length + words.length;

    if (total === 0) {
      resultsContainer.innerHTML = `
        <div class="search-empty">
          "${escapeHtml(query)}" bo'yicha hech narsa topilmadi
        </div>`;
      resultsContainer.classList.add('open');
      return;
    }

    let html = '';

    if (lessons.length) {
      html += `<div class="search-result-section">
        <div class="search-result-title">Darslar</div>
        ${lessons.map(item => `
          <a href="${item.url}" class="search-result-item" data-search-id="${item.id}">
            <span class="search-result-icon">${item.icon}</span>
            <span class="search-result-info">
              <span class="search-result-name">${highlight(item.title, query)}</span>
              <span class="search-result-meta">${escapeHtml(item.subtitle)}</span>
            </span>
          </a>`).join('')}
      </div>`;
    }

    if (words.length) {
      html += `<div class="search-result-section">
        <div class="search-result-title">Lug'at</div>
        ${words.map(item => `
          <a href="${item.url}" class="search-result-item" data-search-id="${item.id}">
            <span class="search-result-icon">${item.icon}</span>
            <span class="search-result-info">
              <span class="search-result-name">${highlight(item.title, query)}</span>
              <span class="search-result-meta">${escapeHtml(item.subtitle)}</span>
            </span>
          </a>`).join('')}
      </div>`;
    }

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('open');
  }

  /** Input va klaviatura hodisalarini ulaydi */
  function bindEvents() {
    const input = document.querySelector('[data-search-input]');
    const resultsContainer = document.querySelector('[data-search-results]');
    if (!input || !resultsContainer) return;

    input.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      const query = e.target.value;
      debounceTimer = setTimeout(() => {
        if (query.trim()) {
          renderResults(query, resultsContainer);
        } else {
          resultsContainer.classList.remove('open');
          resultsContainer.innerHTML = '';
        }
      }, 150);
    });

    // Tashqariga bosilganda yopish
    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
        resultsContainer.classList.remove('open');
      }
    });

    // Cmd/Ctrl+K tezkor qidiruv
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if (e.key === 'Escape') {
        resultsContainer.classList.remove('open');
        input.blur();
      }
    });
  }

  return { init, search, renderResults };
})();
