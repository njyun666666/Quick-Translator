(function () {
  "use strict";

  const LANGUAGES = [
    { code: "auto", label: "自動偵測" },
    { code: "en", label: "英文" },
    { code: "zh-TW", label: "繁體中文" },
    { code: "ja", label: "日文" },
    { code: "ko", label: "韓文" },
  ];

  const TARGET_LANGS = LANGUAGES.filter((l) => l.code !== "auto");

  // ---------- build DOM ----------

  const btnEl = document.createElement("div");
  btnEl.id = "qt-btn";
  btnEl.title = "翻譯選取文字";
  btnEl.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white">
      <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5
        7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98
        4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21
        22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
    </svg>`;

  const popupEl = document.createElement("div");
  popupEl.id = "qt-popup";
  popupEl.innerHTML = `
    <div class="qt-header">
      <span class="qt-title">翻譯</span>
      <div class="qt-header-actions">
        <a id="qt-open-google" class="qt-open-google" href="#" target="_blank" rel="noopener" aria-label="在 Google 翻譯開啟">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
        <button class="qt-close" aria-label="關閉">✕</button>
      </div>
    </div>
    <div class="qt-lang-row">
      <select id="qt-source" aria-label="來源語言">
        ${LANGUAGES.map(
          (l) => `<option value="${l.code}">${l.label}</option>`,
        ).join("")}
      </select>
      <span class="qt-arrow">&#8594;</span>
      <select id="qt-target" aria-label="目標語言">
        ${TARGET_LANGS.map(
          (l) =>
            `<option value="${l.code}" ${l.code === "zh-TW" ? "selected" : ""}>${l.label}</option>`,
        ).join("")}
      </select>
    </div>
    <div class="qt-original-wrap">
      <div class="qt-original-box" id="qt-original"></div>
      <button class="qt-speak" id="qt-speak-original" aria-label="朗讀原文">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
      </button>
    </div>
    <div class="qt-result-box" id="qt-result"></div>
  `;

  document.body.appendChild(btnEl);
  document.body.appendChild(popupEl);

  // refs
  const sourceSelect = popupEl.querySelector("#qt-source");
  const targetSelect = popupEl.querySelector("#qt-target");
  const originalBox     = popupEl.querySelector("#qt-original");
  const resultBox       = popupEl.querySelector("#qt-result");
  const closeBtn        = popupEl.querySelector(".qt-close");
  const googleLink      = popupEl.querySelector("#qt-open-google");
  const speakOriginalBtn = popupEl.querySelector("#qt-speak-original");

  // state
  let savedText          = "";
  let savedRect          = null;
  let detectedSourceLang = "";

  // ---------- helpers ----------

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function langLabel(code) {
    const found = LANGUAGES.find((l) => l.code === code);
    return found ? found.label : code;
  }

  function hide() {
    btnEl.style.display  = "none";
    popupEl.style.display = "none";
  }

  function positionEl(el, rect, width) {
    const margin = 8;
    let left = rect.left;
    let top  = rect.bottom + margin;

    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - width - margin;
    }
    if (left < margin) left = margin;

    if (top + 260 > window.innerHeight) {
      top = rect.top - 260 - margin;
      if (top < margin) top = margin;
    }

    el.style.left = left + "px";
    el.style.top  = top  + "px";
  }

  function showBtn(rect) {
    const cx = rect.left + rect.width / 2;
    btnEl.style.left    = cx - 16 + "px";
    btnEl.style.top     = rect.bottom + 8 + "px";
    btnEl.style.display = "flex";
    popupEl.style.display = "none";
  }

  function updateGoogleLink() {
    const sl = sourceSelect.value;
    const tl = targetSelect.value;
    googleLink.href =
      "https://translate.google.com.tw/?sl=" + sl +
      "&tl=" + tl +
      "&text=" + encodeURIComponent(savedText);
  }

  function showPopup(rect) {
    resultBox.innerHTML  = "";
    resultBox.className  = "qt-result-box";
    originalBox.textContent = savedText;
    positionEl(popupEl, rect, 300);
    popupEl.style.display = "block";
    btnEl.style.display   = "none";
    updateGoogleLink();
    doTranslate();
  }

  const svgCopy  = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const svgSpeak = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
  const svgStop  = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`;

  // ---------- speak ----------

  function speakText(btn, lang, text) {
    if (!lang || lang === "auto") return;

    if (btn._audio && !btn._audio.paused) {
      btn._audio.pause();
      btn._audio = null;
      btn.classList.remove("qt-speaking");
      btn.innerHTML = btn._origHtml;
      return;
    }

    btn.classList.add("qt-speak-loading");
    btn.disabled = true;

    chrome.runtime.sendMessage(
      { type: "SPEAK", payload: { target: lang, text } },
      (res) => {
        btn.classList.remove("qt-speak-loading");
        btn.disabled = false;

        if (!res || !res.ok) {
          btn.classList.add("qt-speak-error");
          setTimeout(() => btn.classList.remove("qt-speak-error"), 1500);
          return;
        }

        const audio = new Audio(res.dataUrl);
        btn._audio = audio;
        btn._origHtml = btn.innerHTML;
        btn.innerHTML = svgStop;
        audio.play();
        btn.classList.add("qt-speaking");
        audio.addEventListener("ended", () => {
          btn.classList.remove("qt-speaking");
          btn._audio = null;
          btn.innerHTML = btn._origHtml;
        });
      },
    );
  }

  // ---------- translate ----------

  function doTranslate() {
    const source = sourceSelect.value;
    const target = targetSelect.value;

    if (!savedText) return;

    resultBox.className = "qt-result-box";
    resultBox.innerHTML = '<span class="qt-loading">翻譯中…</span>';

    chrome.runtime.sendMessage(
      { type: "TRANSLATE", payload: { source, target, text: savedText } },
      (response) => {
        if (chrome.runtime.lastError || !response || !response.ok) {
          resultBox.className += " qt-result-error";
          resultBox.innerHTML  = "<span>翻譯失敗，請稍後再試</span>";
          return;
        }

        const data = response.data;
        if (data.status === "success") {
          const translated = data.translatedText;
          const targetLang  = data.targetLanguage;

          // 更新偵測到的來源語言，供原文語音使用
          detectedSourceLang = data.sourceLanguage;

          resultBox.innerHTML = `
            <div class="qt-result-header">
              <span class="qt-result-lang">
                ${escapeHtml(langLabel(detectedSourceLang))} &#8594; ${escapeHtml(langLabel(targetLang))}
              </span>
              <button class="qt-speak" aria-label="朗讀譯文">${svgSpeak}</button>
            </div>
            <div class="qt-result-text">${escapeHtml(translated)}</div>
            <div class="qt-copy-row">
              <button class="qt-copy" aria-label="複製譯文">${svgCopy} 複製</button>
            </div>
          `;

          resultBox.querySelector(".qt-copy").addEventListener("click", () => {
            navigator.clipboard.writeText(translated).then(() => {
              const btn = resultBox.querySelector(".qt-copy");
              btn.textContent = "已複製";
              btn.classList.add("qt-copied");
              setTimeout(() => {
                btn.innerHTML = svgCopy + " 複製";
                btn.classList.remove("qt-copied");
              }, 1500);
            });
          });

          resultBox.querySelector(".qt-speak").addEventListener("click", function () {
            speakText(this, targetLang, translated);
          });
        } else {
          resultBox.className += " qt-result-error";
          resultBox.innerHTML  = "<span>翻譯失敗，請稍後再試</span>";
        }
      },
    );
  }

  // ---------- events ----------

  // Prevent mousedown on our UI from losing the selection
  btnEl.addEventListener("mousedown", (e) => e.preventDefault());
  popupEl.addEventListener("mousedown", (e) => {
    const tag = e.target.tagName;
    if (!["SELECT", "BUTTON", "INPUT", "TEXTAREA"].includes(tag)) {
      e.preventDefault();
    }
  });

  // Hide when clicking outside
  document.addEventListener("mousedown", (e) => {
    if (!btnEl.contains(e.target) && !popupEl.contains(e.target)) {
      hide();
    }
  });

  // Detect text selection
  document.addEventListener("mouseup", (e) => {
    if (btnEl.contains(e.target) || popupEl.contains(e.target)) return;

    setTimeout(() => {
      const sel  = window.getSelection();
      const text = sel ? sel.toString().trim() : "";

      if (text.length === 0) {
        hide();
        return;
      }

      savedText = text;
      try {
        savedRect = sel.getRangeAt(0).getBoundingClientRect();
      } catch {
        return;
      }

      showBtn(savedRect);
    }, 10);
  });

  btnEl.addEventListener("click", (e) => {
    e.stopPropagation();
    showPopup(savedRect);
  });

  closeBtn.addEventListener("click", () => hide());

  speakOriginalBtn.addEventListener("click", function () {
    speakText(this, detectedSourceLang, savedText);
  });

  // Re-translate and update Google link on language change
  sourceSelect.addEventListener("change", () => { updateGoogleLink(); doTranslate(); });
  targetSelect.addEventListener("change", () => { updateGoogleLink(); doTranslate(); });

  popupEl.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hide();
  });
})();
