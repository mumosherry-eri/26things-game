function getDarkLabel(dk){
  if (dk <= 20) return '？？？';
  if (dk <= 50) return '阴影';
  return '阴暗度';
}

/* === 渲染状态内容（供 open/更新 共用） === */
function renderStatsHTML(){
  const fy = State.getVar('$favorYizhou');
  const fc = State.getVar('$favorCaleb');
  const dk = State.getVar('$darkness');
  const pct = v => Math.min(100, Math.max(0, v));  // 0-100 直接当百分比

  return `
    <div class="stats-section">
      <div class="stat-row">
        <div class="stat-label">夏以昼好感度</div>
        <div class="stat-val">${fy}%</div>
        <div class="stat-meter"><span style="width:${pct(fy)}%"></span></div>
      </div>
      <div class="stat-row">
        <div class="stat-label">Caleb</div>
        <div class="stat-val">${fc}%</div>
        <div class="stat-meter"><span style="width:${pct(fc)}%"></span></div>
      </div>
      <div class="stat-row">
        <div class="stat-label">${getDarkLabel(dk)}</div>
        <div class="stat-val">${dk}%</div>
        <div class="stat-meter dark"><span style="width:${pct(dk)}%"></span></div>
      </div>
    </div>`;
}

/* === 状态面板 === */
window.openStats = function(){
  const modal = document.getElementById('stats-modal');
  const body  = document.getElementById('stats-body');
  if (!modal || !body) return;

  body.innerHTML = renderStatsHTML();
  modal.classList.add('open');
};

/* 在不关闭弹窗的情况下刷新内容 */
window.updateStats = function(){
  const modal = document.getElementById('stats-modal');
  const body  = document.getElementById('stats-body');
  if (modal && modal.classList.contains('open') && body){
    body.innerHTML = renderStatsHTML();
  }
};

window.closeStats = function(){
  document.getElementById('stats-modal')?.classList.remove('open');
};

window.memoEntries = [];
window.addMemo = function(text){
  window.memoEntries.push(text);
  showPhoneToast('记忆已解锁', 'memo');
};

window.openMemo = function(){
  const modal = document.getElementById('memo-modal');
  const body  = document.getElementById('memo-body');
  if (!modal || !body) return;

  body.innerHTML = '';
  if(window.memoEntries.length === 0){
    body.innerHTML = '<p>目前还没有解锁任何回忆。</p>';
  } else {
    window.memoEntries.forEach((t)=>{
      body.innerHTML += `<div class="memo-entry">${t}</div>`;
    });
  }
  modal.classList.add('open');
};

window.closeMemo = function(){
  document.getElementById('memo-modal')?.classList.remove('open');
};

/* === 通用：Esc 关闭 === */
document.addEventListener('keydown', (e)=>{
  if(e.key==='Escape'){
    window.closeStats();
    window.closeMemo();
    window.closeNavigate();
  }
});

/* 可选：每次换页如果状态弹窗开着则自动刷新 */
window.lastStats = { favorYizhou: 0, favorCaleb: 0, darkness: 0 };
$(document).on(':passageend', ()=> window.updateStats());

$(document).on(':passagedisplay', function () {
  const passage = document.querySelector('.passage');
  if (passage) {
    const allInlineLinks = Array.from(passage.querySelectorAll('a.link-internal')).filter(link =>
      !link.closest('.phone-shell, .ticket-app, .phone-complete, .image-lightbox-inline') &&
      !link.classList.contains('is-toolbar-proxied')
    );
    const linearCandidates = allInlineLinks.filter(link => /^(继续|继续.+|进入第一场演出|打开消息|回家|擦头发|第二场演出|关闭图片)$/.test(link.textContent.trim()));
    const choiceLinks = linearCandidates.length === 1 && allInlineLinks.length === 1 ? [] : allInlineLinks;
    if (choiceLinks.length && !passage.querySelector('.choice-panel')) {
      const panel = document.createElement('div');
      panel.className = 'choice-panel';
      const first = choiceLinks[0];
      first.parentNode.insertBefore(panel, first);
      choiceLinks.forEach(link => {
        const prev = link.previousSibling;
        if (prev && prev.nodeType === Node.TEXT_NODE) {
          prev.textContent = prev.textContent.replace(/[\s\r\n-]+$/, '');
        }
        panel.appendChild(link);
      });
    }
  }

  const vars = State.variables || {};
  const current = {
    favorYizhou: Number(vars.favorYizhou || 0),
    favorCaleb: Number(vars.favorCaleb || 0),
    darkness: Number(vars.darkness || 0)
  };
  const changes = [];
  if (current.favorYizhou > window.lastStats.favorYizhou) changes.push('夏以昼好感度 +' + (current.favorYizhou - window.lastStats.favorYizhou));
  if (current.favorCaleb > window.lastStats.favorCaleb) changes.push('Caleb +' + (current.favorCaleb - window.lastStats.favorCaleb));
  if (current.darkness > window.lastStats.darkness) changes.push(getDarkLabel(current.darkness) + ' +' + (current.darkness - window.lastStats.darkness));
  window.lastStats = current;
  if (changes.length) showPhoneToast(changes.join(' / '), 'stat');
});
