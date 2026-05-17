(function () {
  const API_URL = "http://localhost:11434/api/generate";
  const MODEL = "llama3.2:3b";

  let enabled = false;
  let selectedEl = null;

  const panel = document.createElement("div");
  panel.id = "jbc-ai-panel";
  panel.innerHTML = `
    <div class="jbc-ai-head">
      <strong>JBC Local AI</strong>
      <button id="jbc-ai-close">×</button>
    </div>
    <div class="jbc-ai-body">
      <p id="jbc-ai-target">Press Alt + A, then click an element.</p>
      <textarea id="jbc-ai-prompt" placeholder="Example: make this section background less stretched, remove this line, make this text more elegant..."></textarea>
      <button id="jbc-ai-ask">Ask local Ollama</button>
      <pre id="jbc-ai-output"></pre>
    </div>
  `;
  document.body.appendChild(panel);

  const style = document.createElement("style");
  style.textContent = `
    #jbc-ai-panel {
      position: fixed;
      right: 18px;
      bottom: 18px;
      width: 390px;
      max-height: 72vh;
      background: rgba(5,5,5,0.94);
      color: #f0e6da;
      border: 1px solid rgba(240,230,218,0.22);
      z-index: 999999;
      font-family: Inter, Arial, sans-serif;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      display: none;
    }
    #jbc-ai-panel.open { display: block; }
    .jbc-ai-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(240,230,218,0.14);
      letter-spacing: 1px;
      text-transform: uppercase;
      font-size: 11px;
    }
    #jbc-ai-close {
      background: transparent;
      color: #f0e6da;
      border: 0;
      font-size: 22px;
      cursor: pointer;
    }
    .jbc-ai-body { padding: 14px; }
    #jbc-ai-target {
      font-size: 12px;
      color: rgba(240,230,218,0.72);
      margin-bottom: 10px;
    }
    #jbc-ai-prompt {
      width: 100%;
      height: 90px;
      background: rgba(255,255,255,0.06);
      color: #f0e6da;
      border: 1px solid rgba(240,230,218,0.18);
      border-radius: 10px;
      padding: 10px;
      resize: vertical;
      font-family: inherit;
      box-sizing: border-box;
    }
    #jbc-ai-ask {
      margin-top: 10px;
      width: 100%;
      padding: 10px;
      border: 0;
      border-radius: 10px;
      background: #e8891d;
      color: #050505;
      font-weight: 700;
      cursor: pointer;
    }
    #jbc-ai-output {
      margin-top: 12px;
      max-height: 280px;
      overflow: auto;
      white-space: pre-wrap;
      font-size: 12px;
      line-height: 1.45;
      background: rgba(255,255,255,0.04);
      padding: 10px;
      border-radius: 10px;
    }
    .jbc-ai-selected {
      outline: 2px solid #e8891d !important;
      outline-offset: 3px !important;
    }
  `;
  document.head.appendChild(style);

  function describeElement(el) {
    const section = el.closest("section, header, footer, nav, main") || el;
    const styles = window.getComputedStyle(el);

    return {
      selected: {
        tag: el.tagName,
        id: el.id || "",
        className: String(el.className || ""),
        editorId: el.getAttribute("data-editor-id") || "",
        text: (el.innerText || "").slice(0, 500),
        inlineStyle: el.getAttribute("style") || ""
      },
      section: {
        tag: section.tagName,
        id: section.id || "",
        className: String(section.className || ""),
        editorId: section.getAttribute("data-editor-id") || "",
        htmlPreview: section.outerHTML.slice(0, 3500)
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

  async function askOllama(userRequest, context) {
    const prompt = `
You are a senior front-end engineer and visual web designer helping edit a static HTML/CSS/JS website.

Rules:
- Do not rewrite whole files.
- Prefer minimal, reversible changes.
- Identify likely selector and file.
- Preserve homepage unless explicitly asked.
- Avoid background-size: 100% 100% for photos.
- Use background-size: cover and object-fit: cover.
- Output copy-paste terminal commands or CSS/HTML/JS patch only.
- Mention risks briefly.

User request:
${userRequest}

Selected element context:
${JSON.stringify(context, null, 2)}
`;

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, stream: false })
    });

    if (!res.ok) throw new Error("Ollama request failed: " + res.status);
    const data = await res.json();
    return data.response || "No response.";
  }

  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key.toLowerCase() === "a") {
      enabled = !enabled;
      panel.classList.toggle("open", enabled);
      document.body.style.cursor = enabled ? "crosshair" : "";
    }
  });

  document.addEventListener("click", (e) => {
    if (!enabled) return;
    if (panel.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    if (selectedEl) selectedEl.classList.remove("jbc-ai-selected");
    selectedEl = e.target;
    selectedEl.classList.add("jbc-ai-selected");

    document.getElementById("jbc-ai-target").textContent =
      `${selectedEl.tagName.toLowerCase()} ${selectedEl.id ? "#" + selectedEl.id : ""} ${selectedEl.className ? "." + String(selectedEl.className).replace(/\\s+/g, ".") : ""}`;

    panel.classList.add("open");
  }, true);

  document.getElementById("jbc-ai-close").addEventListener("click", () => {
    enabled = false;
    panel.classList.remove("open");
    document.body.style.cursor = "";
    if (selectedEl) selectedEl.classList.remove("jbc-ai-selected");
    selectedEl = null;
  });

  document.getElementById("jbc-ai-ask").addEventListener("click", async () => {
    const output = document.getElementById("jbc-ai-output");
    const userRequest = document.getElementById("jbc-ai-prompt").value.trim();

    if (!selectedEl) {
      output.textContent = "Select an element first. Press Alt + A, then click an element.";
      return;
    }

    if (!userRequest) {
      output.textContent = "Write what you want changed first.";
      return;
    }

    output.textContent = "Thinking locally with Ollama...";
    try {
      const context = describeElement(selectedEl);
      output.textContent = await askOllama(userRequest, context);
    } catch (err) {
      output.textContent = String(err.message || err);
    }
  });

  console.log("JBC Local AI Inspector loaded. Press Alt + A to select an element.");
})();
