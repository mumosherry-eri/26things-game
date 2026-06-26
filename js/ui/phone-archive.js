(function(){
  const emptyArchive = () => ({ chats: {}, sns: [], order: 0 });
  let archive = emptyArchive();

  function esc(text) {
    return String(text ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function nextOrder() {
    archive.order = Number(archive.order || 0) + 1;
    return archive.order;
  }

  function normalizeMessages(messages) {
    return (messages || [])
      .filter(msg => msg && (msg.text || msg.image || msg.type === 'imagePlaceholder'))
      .map(msg => ({
        who: msg.who || 'left',
        text: msg.text || msg.title || '图片',
        image: msg.image || '',
        type: msg.type || ''
      }));
  }

  function chatKey(config) {
    const passage = window.State?.passage || 'unknown';
    const contact = config.contact || config.title || 'Caleb';
    return config.archiveKey || `${passage}:${contact}`;
  }

  window.unlockPhoneChatArchive = function(config) {
    const messages = normalizeMessages(config.messages);
    if (!messages.length) return;
    const key = chatKey(config);
    const existing = archive.chats[key];
    archive.chats[key] = {
      id: key,
      title: config.contact || config.title || 'Caleb',
      subtitle: config.subtitle || window.State?.passage || '',
      theme: config.theme || '',
      updatedAt: nextOrder(),
      messages
    };
    if (existing && existing.updatedAt > archive.chats[key].updatedAt) {
      archive.chats[key].updatedAt = existing.updatedAt;
    }
  };

  window.unlockPhoneSnsArchive = function(config) {
    const passage = window.State?.passage || 'unknown';
    const theme = config.theme || '';
    const entries = [];
    (config.posts || []).forEach((post, index) => {
      const key = config.archiveKey || `${passage}:post:${index}:${post.author || ''}:${post.text || ''}`;
      entries.push({
        key,
        type: 'post',
        title: post.author || config.title || '微博',
        handle: post.handle || '',
        time: post.time || config.time || '',
        text: post.text || '',
        source: post.source || '',
        imageTitle: post.image?.title || '',
        theme
      });
    });
    if (config.profile && (config.view === 'profile')) {
      entries.push({
        key: config.archiveKey || `${passage}:profile:${config.profile.name || ''}`,
        type: 'profile',
        title: config.profile.name || config.title || '个人主页',
        handle: config.profile.handle || '',
        time: config.time || '',
        text: config.profile.bio || config.profile.meta || config.profile.emptyText || '',
        source: '个人主页',
        imageTitle: '',
        theme
      });
    }
    entries.forEach(entry => {
      const exists = archive.sns.some(item => item.key === entry.key);
      if (!exists) archive.sns.push({ ...entry, order: nextOrder() });
    });
  };

  window.getPhoneArchiveSave = function(){
    return structuredClone(archive);
  };

  window.setPhoneArchiveData = function(data){
    archive = Object.assign(emptyArchive(), structuredClone(data || {}));
    archive.chats = archive.chats && typeof archive.chats === 'object' ? archive.chats : {};
    archive.sns = Array.isArray(archive.sns) ? archive.sns : [];
    archive.order = Number(archive.order || 0);
  };

  window.resetPhoneArchive = function(){
    archive = emptyArchive();
  };

  function sortedChats() {
    return Object.values(archive.chats).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  }

  function sortedSns() {
    return [...archive.sns].sort((a, b) => Number(b.order || 0) - Number(a.order || 0));
  }

  function renderShell(inner, theme) {
    return `
      <div class="phone-shell archive-phone ${theme || ''}">
        <div class="phone-status"><span>现在</span><span>5G  88%</span></div>
        <div class="phone-titlebar archive-titlebar">
          <button class="phone-back archive-close" type="button" data-archive-close>‹</button>
          <span>手机</span>
          <span class="phone-dot"></span>
        </div>
        ${inner}
      </div>`;
  }

  function archiveTabs(active) {
    return `
      <div class="archive-tabs">
        <button class="${active === 'chats' ? 'active' : ''}" type="button" data-archive-tab="chats">私信</button>
        <button class="${active === 'sns' ? 'active' : ''}" type="button" data-archive-tab="sns">微博</button>
      </div>`;
  }

  function renderChats() {
    const chats = sortedChats();
    const list = chats.length ? chats.map(chat => `
      <button class="archive-thread-card ${chat.theme || ''}" type="button" data-archive-chat="${esc(chat.id)}">
        <strong>${esc(chat.title)}</strong>
        <span>${esc(chat.messages.at(-1)?.text || '')}</span>
      </button>
    `).join('') : '<div class="archive-empty">还没有解锁任何私信记录。</div>';
    return renderShell(`${archiveTabs('chats')}<div class="archive-scroll">${list}</div>`);
  }

  function renderChatThread(id) {
    const chat = archive.chats[id];
    if (!chat) return renderChats();
    const messages = chat.messages.map(msg => `
      <div class="msg ${esc(msg.who || 'left')} ${msg.image ? 'image-msg' : ''}">
        ${msg.image ? `<img src="${esc(msg.image)}" alt="${esc(msg.text || '图片')}">` : esc(msg.text || '')}
      </div>
    `).join('');
    return renderShell(`
      <div class="archive-thread-head">
        <button type="button" data-archive-tab="chats">返回</button>
        <strong>${esc(chat.title)}</strong>
      </div>
      <div class="phone-chat archive-chat-log">${messages}</div>
    `, chat.theme);
  }

  function renderSns() {
    const entries = sortedSns();
    const list = entries.length ? entries.map(entry => `
      <article class="archive-sns-card ${entry.theme || ''}">
        <div class="sns-post-head">
          <div class="sns-avatar small">${esc((entry.title || '微').slice(0, 2))}</div>
          <div class="sns-author">
            <div class="sns-name">${esc(entry.title)}</div>
            <div class="sns-time">${esc([entry.time, entry.source].filter(Boolean).join(' · '))}</div>
          </div>
        </div>
        ${entry.text ? `<div class="sns-text">${esc(entry.text)}</div>` : ''}
        ${entry.imageTitle ? `<div class="sns-image-card"><span>${esc(entry.imageTitle)}</span></div>` : ''}
      </article>
    `).join('') : '<div class="archive-empty">还没有解锁任何微博更新。</div>';
    return renderShell(`${archiveTabs('sns')}<div class="archive-scroll archive-sns-list">${list}</div>`);
  }

  function bindArchive(body) {
    body.querySelectorAll('[data-archive-close]').forEach(button => button.addEventListener('click', closePhoneArchive));
    body.querySelectorAll('[data-archive-tab]').forEach(button => {
      button.addEventListener('click', () => {
        const tab = button.getAttribute('data-archive-tab');
        body.innerHTML = tab === 'sns' ? renderSns() : renderChats();
        bindArchive(body);
      });
    });
    body.querySelectorAll('[data-archive-chat]').forEach(button => {
      button.addEventListener('click', () => {
        body.innerHTML = renderChatThread(button.getAttribute('data-archive-chat'));
        bindArchive(body);
      });
    });
  }

  window.openPhoneArchive = function(tab = 'chats'){
    const modal = document.getElementById('phone-archive-modal');
    const body = document.getElementById('phone-archive-body');
    if (!modal || !body) return;
    body.innerHTML = tab === 'sns' ? renderSns() : renderChats();
    bindArchive(body);
    modal.classList.add('open');
  };

  window.closePhoneArchive = function(){
    document.getElementById('phone-archive-modal')?.classList.remove('open');
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('phone-archive-button')?.addEventListener('click', () => openPhoneArchive());
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePhoneArchive();
  });
})();
