window.renderSnsApp = function(config){
  const root = document.getElementById(config.id);
  if (!root) return;

  const user = Object.assign({
    name: '你',
    avatar: '你',
    handle: '@live_notes',
    meta: 'Skyline Horizon 现场记录'
  }, config.user || {});
  const view = config.view || 'feed';
  const activeTab = config.activeTab || (view === 'messages' || view === 'thread' ? 'messages' : (view === 'profile' ? 'profile' : 'home'));
  const titleMap = {
    compose: '发微博',
    feed: '首页',
    notifications: '消息',
    messages: '消息',
    profile: '个人主页',
    thread: config.contact || '私信'
  };

  function avatarHTML(profile, small){
    const p = Object.assign(user, profile || {});
    const empty = p.avatar === '';
    return `<div class="sns-avatar${small ? ' small' : ''}${empty ? ' empty' : ''}">${empty ? '' : escapeHTML(p.avatar || p.name || '你').slice(0, 2)}</div>`;
  }

  function actionButton(action, extraClass){
    if (!action) return '';
    const label = escapeHTML(action.label || '继续');
    return `<button class="sns-action ${extraClass || ''}" type="button" data-sns-action="${escapeHTML(action.id || '')}">${label}</button>`;
  }

  function navHTML(){
    const items = [
      ['home', '首页'],
      ['discover', '发现'],
      ['messages', '消息'],
      ['profile', '我的']
    ];
    return `<div class="sns-bottom-nav">${items.map(([id, label]) =>
      `<span class="${activeTab === id ? 'active' : ''}">${escapeHTML(label)}</span>`
    ).join('')}</div>`;
  }

  function topbarHTML(){
    const title = config.title || titleMap[view] || '首页';
    const unread = config.unread ? '<span class="sns-top-dot"></span>' : '';
    return `
      <div class="phone-status"><span>${escapeHTML(config.time || '00:12')}</span><span>5G  ${escapeHTML(config.battery || '72%')}</span></div>
      <div class="sns-topbar">
        <span class="phone-back">${config.back === false ? '' : '‹'}</span>
        <strong>${escapeHTML(title)}</strong>
        <span class="sns-more">${unread || '•••'}</span>
      </div>`;
  }

  function imageCardHTML(image){
    if (!image) return '';
    const cls = image.fallbackClass ? ` ${escapeHTML(image.fallbackClass)}` : '';
    const src = image.src ? ` style="--sns-img:url('${escapeHTML(image.src)}')"` : '';
    return `<div class="sns-image-card${cls}"${src}><span>${escapeHTML(image.title || '图片')}</span></div>`;
  }

  function repostHTML(repost){
    if (!repost) return '';
    return `<div class="sns-repost"><strong>${escapeHTML(repost.author || '')}</strong><p>${escapeHTML(repost.text || '')}</p></div>`;
  }

  function postHTML(post){
    const p = Object.assign({
      author: user.name,
      avatar: user.avatar,
      handle: user.handle,
      time: '刚刚',
      source: '微博移动端',
      reposts: 0,
      comments: 0,
      likes: 0
    }, post || {});
    return `
      <article class="sns-feed-card">
        <div class="sns-post-head">
          ${avatarHTML({ name: p.author, avatar: p.avatar }, true)}
          <div class="sns-author">
            <div class="sns-name">${escapeHTML(p.author)}</div>
            <div class="sns-time">${escapeHTML(p.time)} · 来自 ${escapeHTML(p.source)}</div>
          </div>
        </div>
        <div class="sns-text">${escapeHTML(p.text || '')}</div>
        ${imageCardHTML(p.image)}
        ${repostHTML(p.repostOf)}
        <div class="sns-actionbar">
          <span>转发 ${escapeHTML(p.reposts)}</span>
          <span>评论 ${escapeHTML(p.comments)}</span>
          <span>赞 ${escapeHTML(p.likes)}</span>
        </div>
      </article>`;
  }

  function composeHTML(){
    return `
      ${topbarHTML()}
      <div class="sns-scroll sns-publish-page">
        <div class="sns-profile-strip">
          ${avatarHTML(user)}
          <div>
            <div class="sns-profile-name">${escapeHTML(user.name)}</div>
            <div class="sns-profile-meta">${escapeHTML(user.meta)}</div>
          </div>
        </div>
        <div class="sns-editor">
          <div class="sns-editor-text">${escapeHTML(config.composeText || '')}</div>
          ${repostHTML(config.repostOf)}
          <div class="sns-tool-row"><span>图片</span><span># 话题</span><span>位置</span><span>公开</span></div>
        </div>
        ${actionButton(config.primaryAction, 'primary')}
      </div>
      ${navHTML()}`;
  }

  function feedHTML(){
    const posts = config.posts || [];
    return `
      ${topbarHTML()}
      <div class="sns-scroll sns-feed">
        ${config.topNotice ? `<div class="sns-notice-pill">${escapeHTML(config.topNotice)}</div>` : ''}
        <div class="sns-profile-strip compact">
          ${avatarHTML(user)}
          <div>
            <div class="sns-profile-name">${escapeHTML(user.name)}</div>
            <div class="sns-profile-meta">${escapeHTML(user.meta)}</div>
          </div>
        </div>
        ${posts.map(postHTML).join('')}
        ${config.messageAction ? `
          <button class="sns-thread-card unread" type="button" data-sns-action="${escapeHTML(config.messageAction.id)}">
            ${avatarHTML(config.messageAction.profile || { name: 'Caleb', avatar: 'C' }, true)}
            <span><strong>${escapeHTML(config.messageAction.title || '私信')}</strong><em>${escapeHTML(config.messageAction.preview || '')}</em></span>
            <b>${escapeHTML(config.messageAction.badge || '1')}</b>
          </button>` : ''}
        ${(config.items || []).map(item => `
          <div class="sns-thread-card ${item.unread ? 'unread' : ''}">
            ${avatarHTML(item.profile || {}, true)}
            <span><strong>${escapeHTML(item.title || '')}</strong><em>${escapeHTML(item.preview || '')}</em></span>
            ${item.badge ? `<b>${escapeHTML(item.badge)}</b>` : ''}
          </div>`).join('')}
      </div>
      ${navHTML()}`;
  }

  function profileHTML(){
    const profile = Object.assign({
      name: user.name,
      avatar: user.avatar,
      handle: user.handle,
      meta: user.meta,
      bio: '',
      stats: ['0 关注', '0 粉丝', '0 动态'],
      emptyText: '还没有发布任何内容'
    }, config.profile || {});
    return `
      ${topbarHTML()}
      <div class="sns-scroll sns-profile-page">
        <div class="sns-profile-hero">
          <div class="sns-profile-avatar">${avatarHTML(profile)}</div>
          <div class="sns-profile-main">
            <strong>${escapeHTML(profile.name)}</strong>
            <span>${escapeHTML(profile.handle || '')}</span>
          </div>
          ${actionButton(config.profileAction, 'primary compact')}
        </div>
        <div class="sns-profile-bio">${escapeHTML(profile.bio || profile.meta || '')}</div>
        <div class="sns-profile-stats">${(profile.stats || []).map(s => `<span>${escapeHTML(s)}</span>`).join('')}</div>
        <div class="sns-empty-state">${escapeHTML(profile.emptyText || '')}</div>
      </div>
      ${navHTML()}`;
  }

  function notificationsHTML(){
    return `
      ${topbarHTML()}
      <div class="sns-scroll sns-message-list">
        ${(config.items || []).map(item => `
          <button class="sns-thread-card ${item.unread ? 'unread' : ''}" type="button" data-sns-action="${escapeHTML(item.action || '')}">
            ${avatarHTML(item.profile || {}, true)}
            <span><strong>${escapeHTML(item.title || '')}</strong><em>${escapeHTML(item.preview || '')}</em></span>
            ${item.badge ? `<b>${escapeHTML(item.badge)}</b>` : ''}
          </button>`).join('')}
      </div>
      ${navHTML()}`;
  }

  function threadHTML(){
    const messages = config.messages || [];
    return `
      ${topbarHTML()}
      <div class="phone-chat sns-thread">
        ${messages.map(msg => {
          if (msg.type === 'imagePlaceholder') {
            return `<div class="hairclip-card">${escapeHTML(msg.title || '图片')}<br><span>${escapeHTML(msg.caption || '图片占位')}</span></div>`;
          }
          return `<div class="msg ${escapeHTML(msg.who || 'left')}">${escapeHTML(msg.text || '')}</div>`;
        }).join('')}
      </div>
      ${config.bodyNote ? `<div class="sns-inline-note">${escapeHTML(config.bodyNote)}</div>` : ''}
      ${config.secondaryAction ? `<div class="phone-action-row">${actionButton(config.secondaryAction)}</div>` : ''}
      ${config.actions && config.actions.length ? `<div class="phone-action-row">${config.actions.map(action => actionButton(action)).join('')}</div>` : ''}`;
  }

  const renderers = {
    compose: composeHTML,
    feed: feedHTML,
    notifications: notificationsHTML,
    messages: notificationsHTML,
    profile: profileHTML,
    thread: threadHTML
  };

  root.classList.add('sns-phone', 'phone-shell');
  root.innerHTML = (renderers[view] || feedHTML)();

  const actions = {};
  (config.actions || []).concat(config.primaryAction || [], config.secondaryAction || [], config.messageAction || [], config.profileAction || [], config.items || [])
    .filter(Boolean)
    .forEach(action => {
      const id = action.id || action.action;
      if (id) actions[id] = action;
    });

  root.querySelectorAll('[data-sns-action]').forEach(button => {
    button.addEventListener('click', function(){
      const action = actions[button.getAttribute('data-sns-action')];
      if (!action) return;
      if (typeof action.onClick === 'function') {
        action.onClick();
        return;
      }
      if (action.setVars) {
        Object.keys(action.setVars).forEach(key => {
          State.variables[key] = action.setVars[key];
        });
      }
      if (action.goto) Engine.play(action.goto);
    });
  });
};

/* === 第三章 Caleb 线工具 === */
