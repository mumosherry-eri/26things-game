function showPhoneToast(text, tone){
  const toast = document.createElement('div');
  toast.className = 'phone-toast phone-notice stat-pop ' + (tone || '');
  toast.textContent = text;
  document.body.appendChild(toast);
  requestAnimationFrame(()=> toast.classList.add('show'));
  setTimeout(()=>{
    toast.classList.remove('show');
    setTimeout(()=> toast.remove(), 260);
  }, 1700);
}

window.renderPhoneChat = function(config){
  const root = document.getElementById(config.id);
  if (!root) return;

  const contact = root.dataset.contact || config.contact || 'Caleb';
  const messages = config.messages || [];
  let index = 0;
  let done = false;
  root.classList.toggle('phone-short', messages.length <= 2);

  root.innerHTML = `
    <div class="phone-status"><span>23:46</span><span>5G  72%</span></div>
    <div class="phone-titlebar">
      <span class="phone-back">‹</span>
      <span>${escapeHTML(contact)}</span>
      <span class="phone-dot"></span>
    </div>
    <div class="phone-chat" id="${config.id}-chat"></div>
    <div class="phone-typing" id="${config.id}-typing">${escapeHTML(contact)} 正在输入中</div>
    <button class="phone-compose" id="${config.id}-compose" type="button"></button>
  `;
  let complete = document.getElementById(config.id + '-complete');
  if (!complete) {
    complete = document.createElement('div');
    complete.id = config.id + '-complete';
    complete.className = 'phone-complete phone-complete-outside';
    root.insertAdjacentElement('afterend', complete);
  }
  complete.innerHTML = '';

  const box = document.getElementById(config.id + '-chat');
  const typing = document.getElementById(config.id + '-typing');
  const compose = document.getElementById(config.id + '-compose');
  const incomingDelay = Number(config.incomingDelay || 900);
  const outgoingDelay = Number(config.outgoingDelay || 560);
  let waitingForPlayer = false;

  function appendMessage(msg){
    typing.classList.remove('show');
    const div = document.createElement('div');
    div.className = 'msg ' + msg.who + (msg.text === '【二维码图片】' || msg.text === '【图片】' ? ' image-msg' : '');
    if (msg.image) {
      const img = document.createElement('img');
      img.alt = msg.text || '';
      img.src = msg.image;
      img.onerror = function(){
        if (msg.fallbackImage && img.src !== msg.fallbackImage) {
          img.src = msg.fallbackImage;
          return;
        }
        div.textContent = msg.text || '【图片】';
      };
      div.appendChild(img);
    } else {
      div.textContent = msg.text;
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function finishChat(){
    if (done) return;
    done = true;
    if (window.unlockPhoneChatArchive) {
      window.unlockPhoneChatArchive({
        contact,
        messages,
        theme: root.classList.contains('yizhou-phone') ? 'yizhou-phone' : ''
      });
    }
    if (config.completeText) {
      const note = document.createElement('div');
      note.className = 'phone-chapter-note';
      note.textContent = config.completeText;
      complete.appendChild(note);
    }
    if (config.nextTarget) {
      const link = document.createElement('a');
      link.className = 'link-internal phone-continue';
      link.setAttribute('data-passage', config.nextTarget);
      link.href = 'javascript:void(0)';
      link.textContent = config.nextText || '继续';
      link.addEventListener('click', function(){
        Engine.play(config.nextTarget);
      });
      complete.appendChild(link);
    }
    complete.classList.add('show');
  }

  function step(){
    if (done) return;
    if (index >= messages.length) {
      finishChat();
      return;
    }

    const msg = messages[index++];
    if (msg.who === 'left') {
      compose.classList.remove('show');
      typing.classList.add('show');
      root.classList.add('buzz');
      setTimeout(()=> root.classList.remove('buzz'), 220);
      setTimeout(()=>{
        appendMessage(msg);
        setTimeout(step, incomingDelay);
      }, 520);
    } else {
      waitingForPlayer = true;
      compose.textContent = msg.text;
      compose.classList.add('show');
      compose.onclick = function(){
        if (!waitingForPlayer) return;
        waitingForPlayer = false;
        compose.classList.remove('show');
        appendMessage(msg);
        setTimeout(step, outgoingDelay);
      };
    }
  }

  showPhoneToast('新私信', 'notice');
  setTimeout(step, 520);
};
