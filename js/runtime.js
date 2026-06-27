const STORY = window.STORY_DATA;
const START_PASSAGE = window.STORY_START;
const SAVE_KEY = "twenty-six-things-save-v1";
const SAVE_CODE_PREFIX = "26TY-";
const Temp = {};
const eventBus = new EventTarget();
const CATALOG_CHAPTERS = window.CATALOG_CHAPTERS || [];

let catalogState = {
  unlockedChapters: ["start"],
  chapterSnapshots: {}
};

window.State = {
  variables: {},
  history: [],
  passage: "",
  getVar(name) {
    if (typeof name === "string" && name[0] === "$") return this.variables[name.slice(1)] ?? 0;
    return this.variables[name] ?? 0;
  }
};

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
window.random = random;

function emitStoryEvent(name) {
  eventBus.dispatchEvent(new Event(name));
  document.dispatchEvent(new Event(name));
}

window.$ = function(target) {
  return {
    on(events, handler) {
      String(events).split(/\s+/).filter(Boolean).forEach(name => {
        const clean = name.replace(/^:/, "");
        eventBus.addEventListener(clean, handler);
      });
      return this;
    }
  };
};

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[ch]));
}

function transformExpr(expr) {
  return String(expr)
    .replace(/\bis\b/g, "===")
    .replace(/\band\b/g, "&&")
    .replace(/\bor\b/g, "||")
    .replace(/\bnot\s+/g, "!")
    .replace(/\$(\w+)/g, "State.variables.$1")
    .replace(/\b_([A-Za-z]\w*)\b/g, "Temp.$1");
}

function evalExpr(expr) {
  const js = transformExpr(expr);
  return Function("State", "Temp", "Engine", "random", "Math", "document", "window", "return (" + js + ");")(
    State, Temp, Engine, random, Math, document, window
  );
}

function execCode(code) {
  const normalized = String(code).replace(/\bto\b/, "=");
  const js = transformExpr(normalized);
  return Function("State", "Temp", "Engine", "random", "Math", "document", "window", js)(
    State, Temp, Engine, random, Math, document, window
  );
}

function findMatching(src, startIndex, openName, closeName) {
  const re = /<<\/?([A-Za-z_][\w-]*)(?:\s[^>]*)?>>/g;
  re.lastIndex = startIndex;
  let depth = 1;
  let m;
  while ((m = re.exec(src))) {
    const full = m[0];
    const name = m[1];
    if (name === openName && !full.startsWith("<</")) depth += 1;
    if (name === closeName && full.startsWith("<</")) {
      depth -= 1;
      if (depth === 0) return { start: m.index, end: re.lastIndex };
    }
  }
  return null;
}

function splitIfBranches(inner, firstCond) {
  const branches = [{ cond: firstCond, bodyStart: 0, bodyEnd: inner.length }];
  const re = /<<(elseif)([^>]*)>>|<<(else)>>|<<if\s+[^>]*>>|<<\/if>>/g;
  let depth = 0;
  let current = branches[0];
  let m;
  while ((m = re.exec(inner))) {
    const token = m[0];
    if (token.startsWith("<<if")) {
      depth += 1;
      continue;
    }
    if (token.startsWith("<</if")) {
      depth -= 1;
      continue;
    }
    if (depth !== 0) continue;
    current.bodyEnd = m.index;
    if (m[1] === "elseif") {
      current = { cond: m[2].trim(), bodyStart: re.lastIndex, bodyEnd: inner.length };
    } else {
      current = { cond: null, bodyStart: re.lastIndex, bodyEnd: inner.length };
    }
    branches.push(current);
  }
  return branches.map(b => ({ cond: b.cond, body: inner.slice(b.bodyStart, b.bodyEnd) }));
}

function processInlineScripts(html, deferred) {
  return html.replace(/<script>([\s\S]*?)<\/script>/gi, (_, code) => {
    deferred.push(() => execCode(code));
    return "";
  });
}

function processWiki(src, options = {}) {
  const deferred = [];
  const immediate = options.immediate !== false;
  const deferRuns = !!options.deferRuns;

  function renderRange(text) {
    let out = "";
    let i = 0;
    while (i < text.length) {
      const idx = text.indexOf("<<", i);
      if (idx === -1) {
        out += text.slice(i);
        break;
      }
      out += text.slice(i, idx);

      const rest = text.slice(idx);
      let m;
      if ((m = rest.match(/^<<=\s*([\s\S]*?)\s*>>/))) {
        out += escapeHTML(evalExpr(m[1]));
        i = idx + m[0].length;
        continue;
      }
      if ((m = rest.match(/^<<set\s+([\s\S]*?)>>/))) {
        if (immediate) execCode(m[1]);
        i = idx + m[0].length;
        continue;
      }
      if ((m = rest.match(/^<<run\s+([\s\S]*?)>>/))) {
        const fn = () => execCode(m[1]);
        if (deferRuns) deferred.push(fn);
        else if (immediate) fn();
        i = idx + m[0].length;
        continue;
      }
      if ((m = rest.match(/^<<done>>/))) {
        const match = findMatching(text, idx + m[0].length, "done", "done");
        if (!match) { i = idx + m[0].length; continue; }
        const sub = processWiki(text.slice(idx + m[0].length, match.start), { deferRuns: true, immediate });
        out += sub.html;
        deferred.push(...sub.deferred);
        i = match.end;
        continue;
      }
      if ((m = rest.match(/^<<if\s+([\s\S]*?)>>/))) {
        const match = findMatching(text, idx + m[0].length, "if", "if");
        if (!match) { i = idx + m[0].length; continue; }
        const inner = text.slice(idx + m[0].length, match.start);
        const branches = splitIfBranches(inner, m[1].trim());
        const selected = branches.find(b => b.cond === null || !!evalExpr(b.cond));
        if (selected) {
          const sub = processWiki(selected.body, { immediate, deferRuns });
          out += sub.html;
          deferred.push(...sub.deferred);
        }
        i = match.end;
        continue;
      }
      if ((m = rest.match(/^<<replace\s+["']([^"']+)["']>>/))) {
        const match = findMatching(text, idx + m[0].length, "replace", "replace");
        if (!match) { i = idx + m[0].length; continue; }
        const selector = m[1];
        const body = text.slice(idx + m[0].length, match.start);
        if (immediate) {
          const sub = processWiki(body, { immediate: true });
          const fn = () => {
            document.querySelectorAll(selector).forEach(el => {
              el.innerHTML = sub.html;
              enhanceLinks(el);
              runDeferred(sub.deferred);
            });
            syncToolbarContinue();
          };
          deferred.push(fn);
        }
        i = match.end;
        continue;
      }
      if ((m = rest.match(/^<<timed\s+([\d.]+)s>>/))) {
        const match = findMatching(text, idx + m[0].length, "timed", "timed");
        if (!match) { i = idx + m[0].length; continue; }
        const seconds = Number(m[1]);
        const body = text.slice(idx + m[0].length, match.start);
        if (immediate) deferred.push(() => setTimeout(() => {
          const sub = processWiki(body, { immediate: true });
          runDeferred(sub.deferred);
        }, seconds * 1000));
        i = match.end;
        continue;
      }
      if ((m = rest.match(/^<<button\s+["']([^"']+)["']>>/))) {
        const match = findMatching(text, idx + m[0].length, "button", "button");
        if (!match) { i = idx + m[0].length; continue; }
        const id = "action-" + Math.random().toString(36).slice(2);
        const body = text.slice(idx + m[0].length, match.start);
        out += '<button class="link-internal runtime-button" data-runtime-action="' + id + '">' + escapeHTML(m[1]) + '</button>';
        deferred.push(() => {
          const btn = document.querySelector('[data-runtime-action="' + id + '"]');
          if (btn) btn.addEventListener("click", () => {
            const sub = processWiki(body, { immediate: true });
            runDeferred(sub.deferred);
            if (sub.html.trim()) {
              const span = document.createElement("span");
              span.innerHTML = sub.html;
              btn.insertAdjacentElement("afterend", span);
              enhanceLinks(span);
            }
          });
        });
        i = match.end;
        continue;
      }
      if ((m = rest.match(/^<<\/?(?:elseif|else|if|done|replace|timed|button|widget|link)[^>]*>>/))) {
        i = idx + m[0].length;
        continue;
      }
      out += "<<";
      i = idx + 2;
    }
    return out;
  }

  let html = renderRange(src);
  html = html.replace(/\[\[([^\]|]+?)->([^\]]+?)\]\]/g, (_, label, target) =>
    '<a href="#" class="link-internal" data-passage="' + escapeHTML(target.trim()) + '">' + escapeHTML(label.trim()) + '</a>'
  );
  html = html.replace(/\[\[([^\]|]+?)\]\]/g, (_, target) =>
    '<a href="#" class="link-internal" data-passage="' + escapeHTML(target.trim()) + '">' + escapeHTML(target.trim()) + '</a>'
  );
  html = processInlineScripts(html, deferred);
  return { html, deferred };
}

function runDeferred(tasks) {
  for (const task of tasks) {
    try { task(); } catch (err) { console.error(err); }
  }
}

function enhanceLinks(root = document) {
  root.querySelectorAll("a.link-internal[data-passage]").forEach(link => {
    if (link.dataset.bound) return;
    link.dataset.bound = "1";
    link.addEventListener("click", ev => {
      ev.preventDefault();
      Engine.play(link.dataset.passage);
    });
  });
}

const LINEAR_LINK_RE = /^(继续|继续.+|进入第一场演出|打开消息|回家|擦头发|第二场演出|关闭图片)$/;
let toolbarContinueTarget = "";

function getLinearContinueLinks(root = document) {
  const passage = root.querySelector?.(".passage") || document.querySelector(".passage");
  if (!passage) return [];
  const links = Array.from(passage.querySelectorAll("a.link-internal[data-passage]")).filter(link => {
    if (link.closest(".phone-shell .phone-action-row, .ticket-app, .choice-panel, .landing-page")) return false;
    const text = link.textContent.trim();
    return LINEAR_LINK_RE.test(text);
  });
  return links.length === 1 ? links : [];
}

function syncToolbarContinue() {
  const button = document.getElementById("toolbar-continue");
  if (!button) return;
  const links = getLinearContinueLinks(document);
  if (!links.length) {
    toolbarContinueTarget = "";
    button.disabled = true;
    button.classList.add("is-hidden");
    button.querySelector("span:last-child").textContent = "继续";
    return;
  }
  const link = links[0];
  toolbarContinueTarget = link.dataset.passage || "";
  button.disabled = !toolbarContinueTarget;
  button.classList.remove("is-hidden");
  button.querySelector("span:last-child").textContent = link.textContent.trim() || "继续";
  link.classList.add("is-toolbar-proxied");
}

window.syncToolbarContinue = syncToolbarContinue;

function cloneData(value) {
  return structuredClone(value || {});
}

function findChapterForPassage(name) {
  return CATALOG_CHAPTERS.find(chapter => {
    if ((chapter.matches || []).includes(name)) return true;
    return (chapter.prefixes || []).some(prefix => name === prefix || name.startsWith(prefix));
  }) || null;
}

function getChapterIndex(id) {
  return CATALOG_CHAPTERS.findIndex(chapter => chapter.id === id);
}

function normalizeCatalogState(save = {}) {
  const saved = save.catalog || {};
  const unlocked = Array.isArray(saved.unlockedChapters) ? [...saved.unlockedChapters] : ["start"];
  const snapshots = saved.chapterSnapshots && typeof saved.chapterSnapshots === "object" ? saved.chapterSnapshots : {};
  const currentChapter = findChapterForPassage(save.passage || State.passage || START_PASSAGE);
  const maxIndex = Math.max(0, currentChapter ? getChapterIndex(currentChapter.id) : 0);

  CATALOG_CHAPTERS.slice(0, maxIndex + 1).forEach(chapter => {
    if (!unlocked.includes(chapter.id)) unlocked.push(chapter.id);
  });
  if (!unlocked.includes("start")) unlocked.unshift("start");

  catalogState = {
    unlockedChapters: unlocked.filter((id, index, list) => list.indexOf(id) === index),
    chapterSnapshots: snapshots
  };
}

function recordChapterProgress(passageName) {
  const chapter = findChapterForPassage(passageName);
  if (!chapter) return;
  const chapterIndex = getChapterIndex(chapter.id);

  CATALOG_CHAPTERS.slice(0, chapterIndex + 1).forEach(item => {
    if (!catalogState.unlockedChapters.includes(item.id)) catalogState.unlockedChapters.push(item.id);
  });

  if (!catalogState.chapterSnapshots[chapter.id]) {
    catalogState.chapterSnapshots[chapter.id] = {
      passage: chapter.entry,
      variables: cloneData(State.variables),
      memoEntries: [...(window.memoEntries || [])],
      phoneArchive: window.getPhoneArchiveSave ? window.getPhoneArchiveSave() : {}
    };
  }
}

function getCatalogSaveData() {
  return {
    unlockedChapters: [...catalogState.unlockedChapters],
    chapterSnapshots: cloneData(catalogState.chapterSnapshots)
  };
}

function createSavePayload() {
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    passage: State.passage,
    variables: cloneData(State.variables),
    memoEntries: [...(window.memoEntries || [])],
    catalog: getCatalogSaveData(),
    phoneArchive: window.getPhoneArchiveSave ? window.getPhoneArchiveSave() : undefined
  };
}

function encodeSaveCode(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return SAVE_CODE_PREFIX + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeSaveCode(code) {
  const trimmed = String(code || "").trim();
  if (!trimmed.startsWith(SAVE_CODE_PREFIX)) throw new Error("bad-prefix");
  let body = trimmed.slice(SAVE_CODE_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
  body += "=".repeat((4 - (body.length % 4)) % 4);
  const binary = atob(body);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  const payload = JSON.parse(new TextDecoder().decode(bytes));
  if (!payload || typeof payload !== "object") throw new Error("bad-payload");
  if (!payload.passage || typeof payload.passage !== "string") throw new Error("bad-passage");
  return payload;
}

function applySavePayload(save) {
  const target = STORY[save.passage] == null ? START_PASSAGE : save.passage;
  State.variables = save.variables && typeof save.variables === "object" ? cloneData(save.variables) : {};
  window.memoEntries = Array.isArray(save.memoEntries) ? [...save.memoEntries] : [];
  if (window.setPhoneArchiveData) window.setPhoneArchiveData(save.phoneArchive || {});
  normalizeCatalogState({ ...save, passage: target });
  State.history = [];
  Engine.play(target, { replace: true });
  return target;
}

function persistSavePayload(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function restoreCatalogChapter(chapterId) {
  const chapter = CATALOG_CHAPTERS.find(item => item.id === chapterId);
  if (!chapter || !catalogState.unlockedChapters.includes(chapterId)) return;
  if (!window.confirm("将从该章节入口继续，并使用当时的章节状态。")) return;

  const snapshot = catalogState.chapterSnapshots[chapterId] || chapter.defaults || { variables: {}, memoEntries: [] };
  State.variables = cloneData(snapshot.variables);
  window.memoEntries = [...(snapshot.memoEntries || [])];
  if (window.setPhoneArchiveData) window.setPhoneArchiveData(snapshot.phoneArchive || window.getPhoneArchiveSave?.() || {});
  State.history = [];
  window.closeNavigate();
  Engine.play(chapter.entry, { replace: true, skipCatalogRecord: true });
}

window.Engine = {
  play(name, opts = {}) {
    const body = STORY[name];
    if (body == null) {
      console.error("Missing passage", name);
      return;
    }
    if (!opts.skipCatalogRecord) recordChapterProgress(name);
    if (!opts.replace && State.passage) State.history.push({ passage: State.passage, variables: structuredClone(State.variables), memoEntries: [...(window.memoEntries || [])] });
    State.passage = name;
    emitStoryEvent("passageinit");
    const result = processWiki(body, { immediate: true });
    const passage = document.getElementById("passages");
    passage.innerHTML = '<div class="passage" data-passage="' + escapeHTML(name) + '">' + result.html + '</div>';
    enhanceLinks(passage);
    runDeferred(result.deferred);
    emitStoryEvent("passagedisplay");
    emitStoryEvent("passageend");
    syncToolbarContinue();
    window.scrollTo({ top: 0, behavior: "instant" });
  },
  back() {
    const previous = State.history.pop();
    if (!previous) return;
    State.variables = structuredClone(previous.variables);
    window.memoEntries = [...(previous.memoEntries || [])];
    const name = previous.passage;
    State.passage = "";
    this.play(name, { replace: true });
  },
  restart() {
    localStorage.removeItem(SAVE_KEY);
    State.variables = {};
    State.history = [];
    window.memoEntries = [];
    if (window.resetPhoneArchive) window.resetPhoneArchive();
    normalizeCatalogState({ passage: START_PASSAGE });
    this.play(START_PASSAGE, { replace: true });
  }
};

function saveGame() {
  const save = createSavePayload();
  persistSavePayload(save);
  openSaveCodeModal(encodeSaveCode(save));
  showPhoneToast("已保存", "stat");
}

function loadGame() {
  openLoadCodeModal();
}

function loadLocalGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    showPhoneToast("没有可读取的存档", "notice");
    return;
  }
  try {
    const save = JSON.parse(raw);
    applySavePayload(save);
    closeLoadCodeModal();
    showPhoneToast("已读取", "stat");
  } catch (err) {
    console.error(err);
    showPhoneToast("本地存档读取失败", "notice");
  }
}

function importSaveCode() {
  const input = document.getElementById("load-code-input");
  try {
    const save = decodeSaveCode(input?.value || "");
    persistSavePayload(save);
    const target = applySavePayload(save);
    closeLoadCodeModal();
    showPhoneToast(STORY[save.passage] == null && target === START_PASSAGE ? "存档入口不存在，已回到开始" : "已读取存档码", "stat");
  } catch (err) {
    console.error(err);
    showPhoneToast("存档码无效", "notice");
  }
}

function openSaveCodeModal(code) {
  const modal = document.getElementById("save-code-modal");
  const output = document.getElementById("save-code-output");
  if (!modal || !output) return;
  output.value = code;
  modal.classList.add("open");
  output.focus();
  output.select();
}

function openLoadCodeModal() {
  const modal = document.getElementById("load-code-modal");
  if (!modal) return;
  modal.classList.add("open");
  document.getElementById("load-code-input")?.focus();
}

function closeSaveCodeModal() {
  document.getElementById("save-code-modal")?.classList.remove("open");
}

function closeLoadCodeModal() {
  document.getElementById("load-code-modal")?.classList.remove("open");
}

async function copySaveCode() {
  const output = document.getElementById("save-code-output");
  if (!output?.value) return;
  try {
    await navigator.clipboard.writeText(output.value);
    showPhoneToast("存档码已复制", "stat");
  } catch (err) {
    output.focus();
    output.select();
    showPhoneToast("请手动复制存档码", "notice");
  }
}

function toggleGameMenu(force) {
  const menu = document.getElementById("game-menu");
  const open = force == null ? !menu.classList.contains("open") : !!force;
  menu.classList.toggle("open", open);
}

window.saveGame = saveGame;
window.loadGame = loadGame;
window.loadLocalGame = loadLocalGame;
window.importSaveCode = importSaveCode;
window.closeSaveCodeModal = closeSaveCodeModal;
window.closeLoadCodeModal = closeLoadCodeModal;
window.toggleGameMenu = toggleGameMenu;
window.restoreCatalogChapter = restoreCatalogChapter;

window.openNavigate = function(){
  normalizeCatalogState({ passage: State.passage, catalog: getCatalogSaveData() });
  const modal = document.getElementById("navigate-modal");
  const body = document.getElementById("navigate-body");
  if (!modal || !body) return;

  const chapterHTML = CATALOG_CHAPTERS.map(chapter => {
    const unlocked = catalogState.unlockedChapters.includes(chapter.id);
    const title = unlocked ? chapter.title : "未解锁章节";
    const state = unlocked ? "进入" : "Locked";
    return `
      <button class="navigate-chapter${unlocked ? "" : " locked"}" type="button" ${unlocked ? `data-chapter="${chapter.id}"` : "disabled"}>
        <span class="navigate-chapter-title">${escapeHTML(title)}</span>
        <span class="navigate-chapter-state">${escapeHTML(state)}</span>
      </button>
    `;
  }).join("");

  body.innerHTML = `
    <section class="navigate-hero">
      <h2 class="navigate-title">关于你的26个变数</h2>
      <div class="navigate-meta">2025年9月制作 - by Eri</div>
      <div class="navigate-cp">CP：【夏以昼x你】</div>
      <div class="navigate-note">现代paro，没有Evol的世界</div>
    </section>
    <div class="navigate-section-title">人物</div>
    <section class="navigate-character-grid">
      <button class="navigate-character" type="button">
        <strong>夏以昼</strong>
        <span>地下乐团Skyline Horizon的鼓手，本职工作：？？？？</span>
      </button>
      <button class="navigate-character" type="button">
        <strong>你</strong>
        <span>普通社畜，最近受朋友邀请经常看各种乐团演出</span>
      </button>
    </section>
    <div class="navigate-section-title">目录</div>
    <section class="navigate-list">${chapterHTML}</section>
  `;

  body.querySelectorAll(".navigate-character").forEach(button => {
    button.addEventListener("click", () => button.classList.toggle("open"));
  });
  body.querySelectorAll("[data-chapter]").forEach(button => {
    button.addEventListener("click", () => restoreCatalogChapter(button.dataset.chapter));
  });
  modal.classList.add("open");
};

window.closeNavigate = function(){
  document.getElementById("navigate-modal")?.classList.remove("open");
};

document.addEventListener("click", ev => {
  if (ev.target.closest("#game-menu-button")) {
    toggleGameMenu();
    return;
  }
  if (!ev.target.closest("#game-menu") && !ev.target.closest("#game-menu-button")) {
    toggleGameMenu(false);
  }
});

document.addEventListener("keydown", ev => {
  if (ev.key === "Escape") {
    closeSaveCodeModal();
    closeLoadCodeModal();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("toolbar-continue").addEventListener("click", () => {
    if (toolbarContinueTarget) Engine.play(toolbarContinueTarget);
  });
  document.getElementById("toolbar-navigate-button").addEventListener("click", () => {
    toggleGameMenu(false);
    openNavigate();
  });
  document.getElementById("menu-back").addEventListener("click", () => { toggleGameMenu(false); Engine.back(); });
  document.getElementById("menu-stats").addEventListener("click", () => { toggleGameMenu(false); openStats(); });
  document.getElementById("menu-memo").addEventListener("click", () => { toggleGameMenu(false); openMemo(); });
  document.getElementById("menu-save").addEventListener("click", () => { toggleGameMenu(false); saveGame(); });
  document.getElementById("menu-load").addEventListener("click", () => { toggleGameMenu(false); loadGame(); });
  document.getElementById("menu-restart").addEventListener("click", () => { toggleGameMenu(false); Engine.restart(); });
  document.getElementById("copy-save-code")?.addEventListener("click", copySaveCode);
  document.getElementById("load-local-save")?.addEventListener("click", loadLocalGame);
  document.getElementById("import-save-code")?.addEventListener("click", importSaveCode);
  normalizeCatalogState({ passage: START_PASSAGE });
  Engine.play(START_PASSAGE, { replace: true });
});

/* === 工具：根据数值返回阴暗度标签 === */
