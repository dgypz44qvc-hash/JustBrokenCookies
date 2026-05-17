(function () {
  const API_URL = "/api/ai-suggest";

  let selectedEl = null;
  let pickMode = false;
  let lastHoverEl = null;

  const style = document.createElement("style");
  style.textContent = `
    #jbc-ai-dock {
      position: fixed !important;
      right: 18px !important;
      bottom: 18px !important;
      width: min(430px, calc(100vw - 36px)) !important;
      max-height: 78vh !important;
      z-index: 2147483647 !important;
      background: rgba(5, 5, 5, 0.96) !important;
      color: #f0e6da !important;
      border: 1px solid rgba(240, 230, 218, 0.26) !important;
      border-radius: 16px !important;
      box-shadow: 0 24px 80px rgba(0,0,0,0.62) !important;
      overflow: hidden !important;
      font-family: Inter, Arial, sans-serif !important;
      pointer-events: auto !important;
    }

    #jbc-ai-dock * {
      box-sizing: border-box !important;
      pointer-events: auto !important;
    }

    #jbc-ai-dock.is-collapsed {
      width: 58px !important;
      height: 58px !important;
      border-radius: 999px !important;
      overflow: hidden !important;
    }

    #jbc-ai-dock.is-collapsed .jbc-ai-head,
    #jbc-ai-dock.is-collapsed .jbc-ai-body {
      display: none !important;
    }

    #jbc-ai-dock.is-collapsed #jbc-ai-open {
      display: block !important;
    }

    #jbc-ai-open {
      display: none !important;
      width: 58px !important;
      height: 58px !important;
      border: 0 !important;
      border-radius: 999px !important;
      background: #e8891d !important;
      color: #050505 !important;
      font-weight: 900 !important;
      cursor: pointer !important;
    }

    .jbc-ai-head {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 12px 14px !important;
      border-bottom: 1px solid rgba(240,230,218,0.14) !important;
      background: rgba(255,255,255,0.035) !important;
    }

    .jbc-ai-title {
      font-size: 11px !important;
      font-weight: 800 !important;
      letter-spacing: 1.5px !important;
      text-transform: uppercase !important;
    }

    #jbc-ai-close {
      width: 32px !important;
      height: 32px !important;
      border-radius: 999px !important;
      border: 0 !important;
      background: rgba(255,255,255,0.08) !important;
      color: #f0e6da !important;
      font-size: 18px !important;
      cursor: pointer !important;
    }

    .jbc-ai-body {
      padding: 14px !important;
      max-height: calc(78vh - 56px) !important;
      overflow-y: auto !important;
    }

    #jbc-ai-selected-label,
    #jbc-ai-hover-label,
    #jbc-ai-status {
      margin: 0 0 10px !important;
      color: rgba(240,230,218,0.72) !important;
      font-size: 12px !important;
      line-height: 1.4 !important;
    }

    #jbc-ai-hover-label {
      color: rgba(232,137,29,0.9) !important;
      min-height: 18px !important;
    }

    #jbc-ai-pick,
    #jbc-ai-send {
      width: 100% !important;
      border: 0 !important;
      border-radius: 12px !important;
      cursor: pointer !important;
      font-family: inherit !important;
      font-weight: 900 !important;
    }

    #jbc-ai-pick {
      margin-bottom: 10px !important;
      padding: 10px !important;
      background: rgba(255,255,255,0.08) !important;
      color: #f0e6da !important;
      border: 1px solid rgba(240,230,218,0.16) !important;
      text-align: left !important;
    }

    #jbc-ai-pick.is-active {
      background: rgba(232,137,29,0.22) !important;
      border-color: rgba(232,137,29,0.62) !important;
    }

    #jbc-ai-prompt {
      display: block !important;
      width: 100% !important;
      min-height: 110px !important;
      resize: vertical !important;
      padding: 11px !important;
      border-radius: 12px !important;
      border: 1px solid rgba(240,230,218,0.18) !important;
      outline: none !important;
      background: rgba(255,255,255,0.065) !important;
      color: #f0e6da !important;
      font: 13px/1.45 Inter, Arial, sans-serif !important;
      user-select: text !important;
      -webkit-user-select: text !important;
      cursor: text !important;
    }

    #jbc-ai-send {
      margin-top: 10px !important;
      padding: 12px !important;
      background: #e8891d !important;
      color: #050505 !important;
    }

    #jbc-ai-output {
      margin: 10px 0 0 !important;
      max-height: 300px !important;
      overflow: auto !important;
      white-space: pre-wrap !important;
      background: rgba(255,255,255,0.045) !important;
      color: #f0e6da !important;
      border-radius: 12px !important;
      padding: 10px !important;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
    }

    .jbc-ai-selected-outline {
      outline: 2px solid #e8891d !important;
      outline-offset: 3px !important;
    }

    .jbc-ai-hover-outline {
      outline: 2px dashed rgba(232,137,29,0.75) !important;
      outline-offset: 4px !important;
    }

    html.jbc-ai-picking,
    html.jbc-ai-picking * {
      cursor: crosshair !important;
    }
  `;
  document.head.appendChild(style);

  const dock = document.createElement("div");
  dock.id = "jbc-ai-dock";
  dock.innerHTML = `
    <button id="jbc-ai-open" type="button">AI</button>
    <div class="jbc-ai-head">
      <span class="jbc-ai-title">JBC AI Inspector</span>
      <button id="jbc-ai-close" type="button">×</button>
    </div>
    <div class="jbc-ai-body">
      <p id="jbc-ai-selected-label">No element selected. You can still ask a general question.</p>
      <p id="jbc-ai-hover-label"></p>
      <button id="jbc-ai-pick" type="button">Pick element on page</button>
      <textarea id="jbc-ai-prompt" placeholder="Ask what you want. Example: Which selector controls this? Make this background less stretched. Do not apply changes."></textarea>
      <button id="jbc-ai-send" type="button">Ask AI</button>
      <div id="jbc-ai-status"></div>
      <pre id="jbc-ai-output"></pre>
    </div>
  `;
  document.body.appendChild(dock);

  const openBtn = dock.querySelector("#jbc-ai-open");
  const closeBtn = dock.querySelector("#jbc-ai-close");
  const pickBtn = dock.querySelector("#jbc-ai-pick");
  const sendBtn = dock.querySelector("#jbc-ai-send");
  const promptBox = dock.querySelector("#jbc-ai-prompt");
  const output = dock.querySelector("#jbc-ai-output");
  const status = dock.querySelector("#jbc-ai-status");
  const selectedLabel = dock.querySelector("#jbc-ai-selected-label");
  const hoverLabel = dock.querySelector("#jbc-ai-hover-label");

  function stop(event) {
    event.stopPropagation();
  }

  ["pointerdown", "mousedown", "mouseup", "click", "dblclick", "touchstart", "touchend", "keydown", "keyup"].forEach((type) => {
    dock.addEventListener(type, stop, false);
  });

  function setStatus(text) {
    status.textContent = text || "";
  }

  function clsName(el) {
    if (!el || !el.className) return "";
    if (typeof el.className === "string") return el.className;
    if (el.className.baseVal) return el.className.baseVal;
    return String(el.className);
  }

  function labelFor(el) {
    if (!el) return "No element";
    const cls = clsName(el).trim().replace(/\s+/g, ".");
    return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${cls ? "." + cls : ""}`;
  }

  function setSelected(el) {
    if (selectedEl) selectedEl.classList.remove("jbc-ai-selected-outline");
    selectedEl = el;
    if (selectedEl) selectedEl.classList.add("jbc-ai-selected-outline");
    selectedLabel.textContent = selectedEl ? `Selected: ${labelFor(selectedEl)}` : "No element selected. You can still ask a general question.";
  }

  function describeElement(el) {
    const win = el.ownerDocument.defaultView || window;
    const section = el.closest("section, header, footer, nav, main, article") || el;
    const styles = win.getComputedStyle(el);

    return {
      selected: {
        selectorHint: labelFor(el),
        tag: el.tagName,
        id: el.id || "",
        className: clsName(el),
        editorId: el.getAttribute("data-editor-id") || "",
        text: (el.innerText || el.textContent || "").slice(0, 900),
        inlineStyle: el.getAttribute("style") || ""
      },
      section: {
        selectorHint: labelFor(section),
        tag: section.tagName,
        id: section.id || "",
        className: clsName(section),
        editorId: section.getAttribute("data-editor-id") || "",
        htmlPreview: section.outerHTML.slice(0, 5000)
      },
      computed: {
        display: styles.display,
        position: styles.position,
        width: styles.width,
        height: styles.height,
        backgroundImage: styles.backgroundImage,
        backgroundSize: styles.backgroundSize,
        backgroundPosition: styles.backgroundPosition,
        opacity: styles.opacity,
        zIndex: styles.zIndex
      }
    };
  }

  function getAllPreviewDocuments() {
    const docs = [document];
    document.querySelectorAll("iframe").forEach((iframe) => {
      try {
        if (iframe.contentDocument) docs.push(iframe.contentDocument);
      } catch (_) {}
    });
    return docs;
  }

  function endPickMode() {
    pickMode = false;
    pickBtn.classList.remove("is-active");
    document.documentElement.classList.remove("jbc-ai-picking");
    if (lastHoverEl) lastHoverEl.classList.remove("jbc-ai-hover-outline");
    lastHoverEl = null;
    hoverLabel.textContent = "";
  }

  function startPickMode(event) {
    event.preventDefault();
    event.stopPropagation();

    pickMode = true;
    pickBtn.classList.add("is-active");
    document.documentElement.classList.add("jbc-ai-picking");
    setStatus("Move over the page, then click the element you want.");
  }

  function onMove(event) {
    if (!pickMode || dock.contains(event.target)) return;

    const el = event.target;
    if (!el || el === document.documentElement || el === document.body) return;

    if (lastHoverEl && lastHoverEl !== el) {
      lastHoverEl.classList.remove("jbc-ai-hover-outline");
    }

    lastHoverEl = el;
    lastHoverEl.classList.add("jbc-ai-hover-outline");
    hoverLabel.textContent = `Hover: ${labelFor(el)}`;
  }

  function onPickClick(event) {
    if (!pickMode || dock.contains(event.target)) return;

    event.preventDefault();
    event.stopPropagation();

    setSelected(event.target);
    setStatus("Element selected. Ask your question.");
    endPickMode();
  }

  getAllPreviewDocuments().forEach((doc) => {
    doc.addEventListener("mousemove", onMove, true);
    doc.addEventListener("click", onPickClick, true);
  });

  async function askAI(request, context) {
    const prompt = `You are a senior front-end engineer and visual web designer helping with a static HTML/CSS/JS website.

Do not apply changes.
Give the likely file, selector, and minimal safe code only.
Preserve the homepage unless explicitly asked.
Avoid background-size: 100% 100% for photos.

User request:
${request}

Context:
${JSON.stringify(context, null, 2)}`;

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context })
    });

    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `AI endpoint failed with HTTP ${res.status}`);
    }

    return data.response || data.text || data.message || (Array.isArray(data.suggestions) ? data.suggestions.join("\n\n") : JSON.stringify(data, null, 2));
  }

  async function sendToAI(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const request = (promptBox.value || "").trim();

    if (!request) {
      setStatus("Write a question first.");
      promptBox.focus();
      return;
    }

    const context = selectedEl
      ? describeElement(selectedEl)
      : {
          selected: null,
          note: "No element selected. User is asking from the editor AI panel.",
          page: window.location.pathname
        };

    setStatus("Thinking…");
    output.textContent = "";

    try {
      const answer = await askAI(request, context);
      output.textContent = answer;
      setStatus("Done.");
    } catch (err) {
      output.textContent = "AI request failed: " + String(err.message || err);
      setStatus("Failed. Check console/server.");
      console.error("JBC AI failed", err);
    }
  }

  closeBtn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    dock.classList.add("is-collapsed");
  });

  openBtn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();
    dock.classList.remove("is-collapsed");
  });

  pickBtn.addEventListener("click", startPickMode);
  sendBtn.addEventListener("click", sendToAI);

  promptBox.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      sendToAI(event);
    }
  });

  window.jbcAskAI = sendToAI;
  window.jbcAISelected = function () {
    return selectedEl ? describeElement(selectedEl) : null;
  };

  console.log("JBC clean AI dock loaded. Endpoint:", API_URL);
})();
