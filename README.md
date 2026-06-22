# 🇨🇿 CzechMaster

**Internetdagi eng yaxshi bepul chex tili o'quv platformasi.**
A1 dan C1 gacha — grammatika, lug'at, flashcards, testlar, yozish va tinglash mashqlari bitta joyda.

🔗 **Live demo:** `https://<username>.github.io/<repo>/` (GitHub Pages'ga yuklagandan keyin)

---

## ✨ Imkoniyatlar

- 📊 **Professional Dashboard** — progress, streak, XP, kunlik maqsadlar
- 🔍 **Tezkor qidiruv** — darslar va lug'at bo'yicha (⌘K / Ctrl+K)
- 🌗 **Dark / Light tema** — tizim sozlamasini avtomatik aniqlaydi
- 📚 **5 ta daraja** — A1, A2, B1, B2, C1, har birida to'liq nazariya + jadval + 100+ misol
- 🎴 **Flashcards** — spaced-repetition asosida lug'at takrorlash
- 🎧 **Tinglash mashqlari** — Web Speech API orqali chex tilini ovoz bilan tinglash va tushunish testlari
- 🗣️ **Talaffuz mashqlari** — mikrofon orqali talaffuzni Speech Recognition bilan tekshirish (Chrome/Edge)
- ✍️ **Yozish mashqlari** — tarjima, gap to'ldirish va erkin yozuv, diakritik-bardosh tekshirish
- 🎓 **Tugatish sertifikati** — barcha 50 ta darsni tugatganda Canvas orqali generatsiya qilinadigan, PNG sifatida yuklab olinadigan sertifikat
- 🎯 **Interaktiv testlar** — avtomatik tekshirish, ball hisoblash, izoh
- ✍️ **Yozish va so'z tartibini tuzish mashqlari**
- 🏆 **Yutuqlar (Achievements)** tizimi — 19 ta turli badge
- ⭐ **Sevimlilar va Bookmarklar**
- 📡 **Offline rejim** — Service Worker orqali to'liq PWA
- ♿ **Accessibility** — ARIA atributlar, klaviatura navigatsiyasi, skip-link
- 🔎 **SEO** — meta teglar, Open Graph, structured data (JSON-LD)
- 📱 **Mobile-first** — responsive dizayn, pastki navigatsiya

---

## 🗂 Papka tuzilmasi

```
/
├── index.html              # Bosh sahifa (Dashboard SPA)
├── lesson.html              # Dars sahifasi
├── manifest.json             # PWA manifest
├── sw.js                     # Service Worker (offline keshlash)
├── favicon.ico
├── README.md
│
├── css/
│   ├── variables.css         # Design tokens (ranglar, shrift, spacing)
│   ├── style.css             # Global stil, layout, header, sidebar
│   ├── components.css        # Qayta ishlatiladigan komponentlar
│   ├── dashboard.css          # Dashboard sahifasiga xos stillar
│   └── lesson.css            # Dars sahifasiga xos stillar
│
├── js/
│   ├── app.js                 # Asosiy ilova dvigateli (routing, dashboard)
│   ├── lesson-engine.js       # Dars sahifasini JSON'dan quradi
│   ├── progress.js            # XP, streak, progress, localStorage
│   ├── achievements.js        # Yutuqlar tizimi
│   ├── quiz.js                # Test dvigateli (avtomatik tekshirish)
│   ├── flashcard.js           # Flashcard dvigateli
│   ├── audio.js               # Web Speech API — ovoz sintezi (chex talaffuzi)
│   ├── listening.js           # Tinglash mashqi dvigateli
│   ├── speaking.js            # Talaffuz mashqi dvigateli (Speech Recognition)
│   ├── writing.js             # Yozish mashqi dvigateli
│   ├── certificate.js         # Tugatish sertifikati generatori (Canvas)
│   ├── search.js              # Qidiruv dvigateli
│   ├── theme.js               # Dark/Light tema
│   └── toast.js               # Bildirishnoma tizimi
│
├── data/
│   ├── curriculum.json        # Barcha darslar (A1-C1, 50 dars)
│   ├── vocabulary.json        # Lug'at bazasi (75+ so'z)
│   ├── achievements.json      # Yutuqlar ro'yxati
│   ├── listening.json         # Tinglash mashqlari bazasi
│   ├── speaking.json          # Talaffuz mashqlari bazasi
│   └── writing.json           # Yozish mashqlari bazasi
│
├── images/                    # PWA ikonkalari
└── audio/                     # (ixtiyoriy) audio fayllar uchun joy
```

---

## 🚀 GitHub Pages'ga yuklash

1. Ushbu papkani GitHub repozitoriyasiga yuklang:
   ```bash
   git init
   git add .
   git commit -m "CzechMaster: initial release"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```

2. Repozitoriya **Settings → Pages** bo'limiga o'ting.

3. **Source** sifatida `main` branch va `/ (root)` papkasini tanlang.

4. Bir necha daqiqadan so'ng sayt `https://<username>.github.io/<repo>/` manzilida ishga tushadi.

> ⚠️ Agar repo nomi `<username>.github.io` bo'lmasa, `manifest.json` dagi `start_url` va `scope` qiymatlarini repo nomiga moslab `/repo-nomi/` qilib o'zgartiring.

---

## 🛠 Lokal ishga tushirish

GitHub Pages kabi statik server kerak (fetch() CORS siyosati tufayli `file://` orqali to'g'ridan-to'g'ri ochib bo'lmaydi):

```bash
# Python orqali
python3 -m http.server 8000

# yoki Node.js orqali
npx serve .
```

So'ng brauzerda `http://localhost:8000` manzilini oching.

---

## 🧩 Yangi dars qo'shish

`data/curriculum.json` faylidagi tegishli daraja ichiga yangi obyekt qo'shing:

```json
{
  "id": "a1-06",
  "title": "Dars sarlavhasi",
  "description": "Qisqa tavsif",
  "icon": "📘",
  "category": "Grammatika",
  "duration": 20,
  "wordCount": 10,
  "sections": [ ... ],
  "exercises": [ ... ],
  "quiz": [ ... ]
}
```

To'liq struktura namunasi uchun mavjud darslarga qarang (`a1-01`, `b1-01` va h.k.).

---

## 📦 Texnologiyalar

- HTML5 / CSS3 (custom properties, Grid, Flexbox)
- Vanilla JavaScript (ES2024, modul shaklida emas — to'g'ridan-to'g'ri `<script>` orqali, GitHub Pages bilan to'liq mos)
- Progressive Web App (Service Worker, Web App Manifest)
- LocalStorage — progress va sozlamalarni saqlash
- JSON — ma'lumotlar bazasi sifatida

Tashqi kutubxonalar yo'q — 100% vanilla, tezkor va engil.

---

## 📄 Litsenziya

Bu loyiha ta'lim maqsadida ochiq manba sifatida taqdim etiladi.
