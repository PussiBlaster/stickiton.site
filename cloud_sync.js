(function () {
  // ===== Настройки =====
  const LS_KEY = "sio_products_v1";         // ключ каталога
  const API_URL = "/api/products";          // endpoint на Vercel
  const MAX_IMGS = 5;                       // максимум изображений на товар

  // ===== i18n (минимально) =====
  const t = (() => {
    // определим язык по активной кнопке/атрибуту, иначе RU
    const activeLang =
      (document.querySelector('[data-lang].active')?.getAttribute('data-lang')) ||
      (document.documentElement.getAttribute('lang')) ||
      'ru';
    const lang = String(activeLang).toLowerCase();

    const dict = {
      ru: {
        loadBtn: "Загрузить из облака",
        saveBtn: "Сохранить в облако",
        loadOk: n => `Загружено товаров: ${n}`,
        saveOk: n => `Сохранено в облако: ${n}`,
        secretAsk: "Введите секрет для синхронизации",
        errLoad: msg => `Ошибка загрузки: ${msg}`,
        errSave: msg => `Ошибка сохранения: ${msg}`,
        unauthorized: "Неверный секрет (401)",
      },
      uk: {
        loadBtn: "Завантажити з хмари",
        saveBtn: "Зберегти в хмару",
        loadOk: n => `Завантажено товарів: ${n}`,
        saveOk: n => `Збережено в хмару: ${n}`,
        secretAsk: "Введіть секрет для синхронізації",
        errLoad: msg => `Помилка завантаження: ${msg}`,
        errSave: msg => `Помилка збереження: ${msg}`,
        unauthorized: "Невірний секрет (401)",
      },
      en: {
        loadBtn: "Load from Cloud",
        saveBtn: "Save to Cloud",
        loadOk: n => `Loaded products: ${n}`,
        saveOk: n => `Saved to cloud: ${n}`,
        secretAsk: "Enter sync secret",
        errLoad: msg => `Load error: ${msg}`,
        errSave: msg => `Save error: ${msg}`,
        unauthorized: "Wrong secret (401)",
      }
    };
    if (lang.startsWith('uk')) return dict.uk;
    if (lang.startsWith('en')) return dict.en;
    return dict.ru;
  })();

  // ===== Утилиты =====
  const isValidUrl = u =>
    !!u && typeof u === "string" &&
    /^(https?:)?\/\//i.test(u); // http(s) или protocol-relative

  const uniq = arr => Array.from(new Set(arr || []));

  function sanitizeProducts(list) {
    const src = Array.isArray(list) ? list : [];
    return src.map(p => {
      const raw = Array.isArray(p.imgs) ? p.imgs : (p.img ? [p.img] : []);
      // убираем пустые/битые, дедупим, режем до MAX_IMGS
      const imgs = uniq(raw.filter(isValidUrl)).slice(0, MAX_IMGS);
      return { ...p, imgs, img: imgs[0] || "" };
    });
  }

  function getLocal() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setLocal(list) {
    const clean = sanitizeProducts(list);
    localStorage.setItem(LS_KEY, JSON.stringify(clean));
    // если есть функция отрисовки — дернём её
    if (typeof window.renderProducts === "function") {
      try { window.renderProducts(); } catch { /* no-op */ }
    }
  }

  async function apiGet() {
    const r = await fetch(API_URL, { cache: "no-store" });
    if (!r.ok) throw new Error("GET " + r.status);
    const j = await r.json();
    return sanitizeProducts(j?.products || []);
  }

  async function apiPost(list, secret) {
    const r = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret || ""
      },
      body: JSON.stringify({ products: sanitizeProducts(list || []) })
    });
    if (!r.ok) {
      // 401 — неверный секрет, 403 — write запрещён, остальное — общая ошибка
      let body = "";
      try { body = await r.text(); } catch { /* no-op */ }
      const msg = r.status === 401 ? t.unauthorized : `POST ${r.status} ${body || ""}`;
      throw new Error(msg);
    }
    return r.json();
  }

  function toast(msg) {
    // Простая «алертовая» прослойка: если есть свой модал — используй его
    alert(msg);
  }

  // ===== Кнопки в админ-доке =====
  function addButtons() {
    const dock = document.getElementById("adminDock");
    if (!dock) return; // нет админ-дока — не добавляем

    // Чтобы не дублировать при повторном init
    if (dock.querySelector('[data-cloud="load"]')) return;

    const btnLoad = document.createElement("button");
    btnLoad.className = "btn";
    btnLoad.dataset.cloud = "load";
    btnLoad.textContent = t.loadBtn;

    const btnSave = document.createElement("button");
    btnSave.className = "btn";
    btnSave.dataset.cloud = "save";
    btnSave.textContent = t.saveBtn;

    btnLoad.addEventListener("click", async () => {
      try {
        const list = await apiGet();
        setLocal(list);
        toast(t.loadOk(list.length));
      } catch (e) {
        toast(t.errLoad(e.message || e));
      }
    });

    btnSave.addEventListener("click", async () => {
      try {
        const secret = prompt(t.secretAsk);
        if (!secret) return;
        const local = getLocal();
        const res = await apiPost(local, secret);
        // после успешного сохранения — сразу подтянем из облака (истина)
        const fresh = await apiGet();
        setLocal(fresh);
        toast(t.saveOk(res?.count ?? fresh.length ?? 0));
      } catch (e) {
        toast(t.errSave(e.message || e));
      }
    });

    dock.appendChild(btnLoad);
    dock.appendChild(btnSave);
  }

  // ===== Автозагрузка при «пустом» каталоге =====
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const local = getLocal();
      if (!local || !local.length) {
        const cloud = await apiGet();
        if (cloud && cloud.length) setLocal(cloud);
      } else {
        // даже если локально что-то есть — почистим (уберёт пустые/дубли)
        setLocal(local);
      }
    } catch { /* молча */ }

    addButtons();
  });

})();
