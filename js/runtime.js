const STORY = window.STORY_DATA;
const START_PASSAGE = window.STORY_START;
const SAVE_KEY = "twenty-six-things-save-v1";
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
          }, { once: true });
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
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    passage: State.passage,
    variables: State.variables,
    memoEntries: window.memoEntries || [],
    catalog: getCatalogSaveData(),
    phoneArchive: window.getPhoneArchiveSave ? window.getPhoneArchiveSave() : undefined
  }));
  showPhoneToast("已保存", "stat");
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    showPhoneToast("没有可读取的存档", "notice");
    return;
  }
  const save = JSON.parse(raw);
  State.variables = save.variables || {};
  window.memoEntries = save.memoEntries || [];
  if (window.setPhoneArchiveData) window.setPhoneArchiveData(save.phoneArchive || {});
  normalizeCatalogState(save);
  Engine.play(save.passage || START_PASSAGE, { replace: true });
  showPhoneToast("已读取", "stat");
}

function toggleGameMenu(force) {
  const menu = document.getElementById("game-menu");
  const open = force == null ? !menu.classList.contains("open") : !!force;
  menu.classList.toggle("open", open);
}

window.saveGame = saveGame;
window.loadGame = loadGame;
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
  normalizeCatalogState({ passage: START_PASSAGE });
  Engine.play(START_PASSAGE, { replace: true });
});

/* === 工具：根据数值返回阴暗度标签 === */
