/**
 * CzechMaster — Certificate Generator
 * ======================================
 * Foydalanuvchi barcha 50 ta darsni tugatganda yakuniy sertifikat oladi.
 * Canvas orqali professional dizaynli sertifikat chiziladi va PNG
 * formatida yuklab olish imkoni beriladi. Server yoki tashqi kutubxona
 * talab qilinmaydi — to'liq client-side ishlaydi.
 */
'use strict';

const CertificateEngine = (() => {
  const TOTAL_LESSONS_REQUIRED = 50;
  const CANVAS_WIDTH = 1200;
  const CANVAS_HEIGHT = 850;

  const UZBEK_MONTHS = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];

  /** Sanani "21 Iyun 2026" formatida qaytaradi — brauzerlararo ishonchli ishlaydi */
  function formatUzbekDate(date) {
    return `${date.getDate()} ${UZBEK_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  /** Chexiya bayrog'ini canvas primitivlar bilan chizadi (oq-qizil gorizontal + ko'k uchburchak) */
  function drawCzechFlag(ctx, x, y, w, h) {
    ctx.save();
    // Soya
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    // Oq yuqori yarim
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h / 2);
    // Qizil pastki yarim
    ctx.fillStyle = '#D7141A';
    ctx.fillRect(x, y + h / 2, w, h / 2);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Ko'k uchburchak (chap tomondan markazga)
    ctx.fillStyle = '#11457E';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w * 0.42, y + h / 2);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();

    // Nozik ramka
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  /** Foydalanuvchi sertifikatga loyiqligini tekshiradi */
  function isEligible() {
    const stats = ProgressManager.getStats();
    return stats.completedLessons >= TOTAL_LESSONS_REQUIRED;
  }

  /** Necha dars qolganini qaytaradi (loyiq bo'lmasa) */
  function lessonsRemaining() {
    const stats = ProgressManager.getStats();
    return Math.max(0, TOTAL_LESSONS_REQUIRED - stats.completedLessons);
  }

  /** Ism kiritish uchun modal ochadi */
  function openNameModal() {
    if (!isEligible()) {
      ToastManager.warning(`Sertifikat olish uchun yana ${lessonsRemaining()} ta dars qoldi.`);
      return;
    }

    const savedName = localStorage.getItem('czechmaster_certificate_name') || '';

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width: 440px;">
        <div class="modal-header">
          <h3 class="modal-title">🎓 Sertifikat</h3>
          <button class="modal-close" data-cert-close aria-label="Yopish">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="text-secondary text-sm mb-4">Tabriklaymiz! Siz CzechMaster platformasidagi barcha ${TOTAL_LESSONS_REQUIRED} ta darsni tugatdingiz. Sertifikatga yozilishi kerak bo'lgan to'liq ismingizni kiriting:</p>
          <div class="input-group">
            <label class="input-label" for="cert-name-input">To'liq ism</label>
            <input type="text" id="cert-name-input" class="input" placeholder="Masalan: Alisher Navoiy" value="${escapeAttr(savedName)}" maxlength="60" autocomplete="off">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-cert-close>Bekor qilish</button>
          <button class="btn btn-primary" data-cert-generate>Sertifikat yaratish</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('visible'));

    const nameInput = backdrop.querySelector('#cert-name-input');
    nameInput.focus();
    nameInput.select();

    const closeModal = () => {
      backdrop.classList.remove('visible');
      setTimeout(() => backdrop.remove(), 250);
    };

    backdrop.querySelectorAll('[data-cert-close]').forEach(btn => btn.addEventListener('click', closeModal));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') generateAndShow(nameInput.value, closeModal);
    });

    backdrop.querySelector('[data-cert-generate]').addEventListener('click', () => {
      generateAndShow(nameInput.value, closeModal);
    });
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  /** Ismni tekshiradi, saqlaydi va sertifikatni yaratib ko'rsatadi */
  function generateAndShow(name, closeNameModal) {
    const trimmed = name.trim();
    if (!trimmed) {
      ToastManager.error('Iltimos, ismingizni kiriting.');
      return;
    }
    localStorage.setItem('czechmaster_certificate_name', trimmed);
    closeNameModal();

    const canvas = drawCertificate(trimmed);
    showPreviewModal(canvas);

    // Achievement: sertifikat olingani belgilanadi
    const state = ProgressManager.getState();
    if (!state.achievements.includes('certificate_earned')) {
      AchievementsManager.unlock('certificate_earned');
    }
  }

  /** Sertifikatni Canvas'da chizadi va canvas elementini qaytaradi */
  function drawCertificate(name) {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');

    // === Fon gradienti ===
    const bgGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    bgGradient.addColorStop(0, '#0F172A');
    bgGradient.addColorStop(0.5, '#1E293B');
    bgGradient.addColorStop(1, '#0F172A');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // === Dekorativ burchak doiralar ===
    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.beginPath(); ctx.arc(0, 0, 260, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(CANVAS_WIDTH, CANVAS_HEIGHT, 260, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(225, 29, 72, 0.06)';
    ctx.beginPath(); ctx.arc(CANVAS_WIDTH, 0, 200, 0, Math.PI * 2); ctx.fill();

    // === Tashqi ramka ===
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 80);
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(54, 54, CANVAS_WIDTH - 108, CANVAS_HEIGHT - 108);

    // === Logo / belgi — chizilgan Chexiya bayrog'i (emoji shriftga bog'liq emas) ===
    ctx.textAlign = 'center';
    drawCzechFlag(ctx, CANVAS_WIDTH / 2 - 45, 100, 90, 56);

    // === Sarlavha ===
    ctx.fillStyle = '#F1F5F9';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.fillText('C Z E C H M A S T E R', CANVAS_WIDTH / 2, 225);

    ctx.fillStyle = '#60A5FA';
    ctx.font = '18px Georgia, serif';
    ctx.fillText('Chex tili o\'quv platformasi', CANVAS_WIDTH / 2, 255);

    // === Asosiy sarlavha ===
    ctx.fillStyle = '#F1F5F9';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.fillText('TUGATISH SERTIFIKATI', CANVAS_WIDTH / 2, 340);

    // === Chiziq ===
    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - 100, 365);
    ctx.lineTo(CANVAS_WIDTH / 2 + 100, 365);
    ctx.stroke();

    // === Matn: "ushbu sertifikat beriladi" ===
    ctx.fillStyle = '#94A3B8';
    ctx.font = '20px Georgia, serif';
    ctx.fillText('Ushbu sertifikat quyidagi shaxsga beriladi:', CANVAS_WIDTH / 2, 425);

    // === Ism ===
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 52px Georgia, serif';
    // Juda uzun ismlarni avtomatik kichraytirish
    let fontSize = 52;
    ctx.font = `bold ${fontSize}px Georgia, serif`;
    while (ctx.measureText(name).width > CANVAS_WIDTH - 200 && fontSize > 24) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Georgia, serif`;
    }
    ctx.fillText(name, CANVAS_WIDTH / 2, 495);

    // === Ism ostidagi chiziq ===
    const nameWidth = Math.min(ctx.measureText(name).width + 80, CANVAS_WIDTH - 160);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - nameWidth / 2, 520);
    ctx.lineTo(CANVAS_WIDTH / 2 + nameWidth / 2, 520);
    ctx.stroke();

    // === Tavsif matni ===
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '19px Georgia, serif';
    ctx.fillText('Chex tilini A1 darajasidan C1 darajasigacha bo\'lgan barcha', CANVAS_WIDTH / 2, 570);
    ctx.fillText(`${TOTAL_LESSONS_REQUIRED} ta darsni muvaffaqiyatli tugatgani uchun beriladi.`, CANVAS_WIDTH / 2, 598);

    // === Statistika qatori ===
    const stats = ProgressManager.getStats();
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#60A5FA';
    const statsY = 660;
    ctx.fillText(`⭐ ${stats.totalXp} XP yig'ildi   •   🔥 ${stats.longestStreak} kunlik eng uzun streak   •   🏆 ${stats.achievementsCount} ta yutuq`, CANVAS_WIDTH / 2, statsY);

    // === Sana ===
    const dateStr = formatUzbekDate(new Date());
    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px Georgia, serif';
    ctx.fillText(dateStr, CANVAS_WIDTH / 2, 720);

    // === Pastki imzo chiziqlari ===
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(140, 760);
    ctx.lineTo(380, 760);
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px Arial';
    ctx.fillText('CzechMaster jamoasi', 140, 782);

    ctx.textAlign = 'right';
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - 380, 760);
    ctx.lineTo(CANVAS_WIDTH - 140, 760);
    ctx.stroke();
    ctx.fillText('A1 → C1 daraja', CANVAS_WIDTH - 140, 782);

    return canvas;
  }

  /** Sertifikat preview modalini ko'rsatadi va yuklab olish tugmasini beradi */
  function showPreviewModal(canvas) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width: 760px;">
        <div class="modal-header">
          <h3 class="modal-title">🎉 Sertifikatingiz tayyor!</h3>
          <button class="modal-close" data-cert-preview-close aria-label="Yopish">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="modal-body" style="display:flex; flex-direction:column; align-items:center; gap:var(--space-4);">
          <div data-cert-canvas-holder style="width:100%; border-radius: var(--radius-lg); overflow:hidden; box-shadow: var(--shadow-lg);"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-cert-preview-close>Yopish</button>
          <button class="btn btn-primary" data-cert-download>⬇ PNG yuklab olish</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('visible'));

    const holder = backdrop.querySelector('[data-cert-canvas-holder]');
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';
    holder.appendChild(canvas);

    const closeModal = () => {
      backdrop.classList.remove('visible');
      setTimeout(() => backdrop.remove(), 250);
    };

    backdrop.querySelectorAll('[data-cert-preview-close]').forEach(btn => btn.addEventListener('click', closeModal));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

    backdrop.querySelector('[data-cert-download]').addEventListener('click', () => {
      downloadCanvas(canvas);
    });
  }

  /** Canvas'ni PNG fayl sifatida yuklab oladi */
  function downloadCanvas(canvas) {
    try {
      const link = document.createElement('a');
      link.download = 'CzechMaster-sertifikat.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      ToastManager.success('Sertifikat yuklab olindi!');
    } catch (e) {
      console.error('Sertifikatni yuklab olishda xatolik:', e);
      ToastManager.error('Yuklab olishda xatolik yuz berdi.');
    }
  }

  return { isEligible, lessonsRemaining, openNameModal, TOTAL_LESSONS_REQUIRED };
})();
