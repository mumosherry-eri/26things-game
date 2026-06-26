window.ensureCalebChapterState = function(){
  const vars = State.variables;
  if (vars.liveHabit === undefined) vars.liveHabit = "";
  if (vars.calebHairclipRebought === undefined) vars.calebHairclipRebought = false;
  if (vars.calebInviteTone === undefined) vars.calebInviteTone = "";
  if (vars.calebAskedToMeet === undefined) vars.calebAskedToMeet = false;
  if (vars.calebEyeFlashSeen === undefined) vars.calebEyeFlashSeen = false;
  if (vars.calebSnsPosted === undefined) vars.calebSnsPosted = false;
  if (vars.calebHairclipViewed === undefined) vars.calebHairclipViewed = false;
  if (vars.calebFirstReplySent === undefined) vars.calebFirstReplySent = false;
  if (vars.calebEyeFlashBlackout === undefined) vars.calebEyeFlashBlackout = false;
};

window.ensureDrownChapterState = function(){
  const vars = State.variables;
  if (vars.drownOfficialSeen === undefined) vars.drownOfficialSeen = false;
  if (vars.drownPracticePhotoViewed === undefined) vars.drownPracticePhotoViewed = false;
  if (vars.drownYizhouAccountSeen === undefined) vars.drownYizhouAccountSeen = false;
  if (vars.drownYizhouFollowed === undefined) vars.drownYizhouFollowed = false;
  if (vars.drownLotteryReposted === undefined) vars.drownLotteryReposted = false;
  if (vars.drownCalebJealousRead === undefined) vars.drownCalebJealousRead = false;
  if (vars.drownYizhouPostSeen === undefined) vars.drownYizhouPostSeen = false;
};

window.showCalebEyeFlash = function(done){
  const finish = function(){
    if (typeof done === 'function') done();
  };
  const sources = [
    'assets/caleb-eye-strip.jpg',
    'file:///E:/codex/openclaw/assets/caleb-eye-strip.jpg'
  ];
  let sourceIndex = 0;
  const img = new Image();
  img.onload = function(){
    const overlay = document.createElement('div');
    overlay.className = 'caleb-eye-flash';
    if (State.variables.calebEyeFlashBlackout) {
      overlay.classList.add('blackout');
    }
    const strip = document.createElement('img');
    strip.src = img.src;
    strip.alt = '';
    overlay.appendChild(strip);
    document.body.appendChild(overlay);
    State.variables.calebEyeFlashSeen = true;
    setTimeout(()=> overlay.classList.add('show'), 820);
    setTimeout(()=> overlay.classList.add('fade'), 1120);
    setTimeout(()=>{
      overlay.remove();
      finish();
    }, 1380);
  };
  img.onerror = function(){
    sourceIndex += 1;
    if (sourceIndex >= sources.length) {
      finish();
      return;
    }
    img.src = sources[sourceIndex];
  };
  img.src = sources[sourceIndex];
};

window.renderCalebMeetChat = function(config){
  const root = document.getElementById(config.id);
  if (!root) return;

  root.innerHTML = `
    <div class="phone-status"><span>00:24</span><span>5G  66%</span></div>
    <div class="phone-titlebar">
      <span class="phone-back">‹</span>
      <span>Caleb</span>
      <span class="phone-dot"></span>
    </div>
    <div class="phone-chat" id="${config.id}-chat"></div>
    <div class="phone-typing" id="${config.id}-typing">Caleb 正在输入中</div>
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

  function addBubble(who, text){
    const div = document.createElement('div');
    div.className = 'msg ' + who;
    div.textContent = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function finish(){
    if (window.unlockPhoneChatArchive) {
      window.unlockPhoneChatArchive({
        contact: 'Caleb',
        messages: [
          { who: 'left', text: '你真的很想跟我见面吗？' },
          { who: 'right', text: '真的真的。' }
        ]
      });
    }
    const link = document.createElement('a');
    link.className = 'link-internal phone-continue';
    link.href = 'javascript:void(0)';
    link.textContent = '继续';
    link.addEventListener('click', function(){
      Engine.play(config.nextTarget || 'Caleb-10');
    });
    complete.appendChild(link);
    complete.classList.add('show');
    if (window.syncToolbarContinue) window.syncToolbarContinue();
  }

  setTimeout(function(){
    typing.classList.add('show');
  }, 400);
  setTimeout(function(){
    typing.classList.remove('show');
    addBubble('left', '你真的很想跟我见面吗？');
    compose.textContent = '真的真的（秒回）';
    compose.classList.add('show');
  }, 1200);

  compose.addEventListener('click', function(){
    if (!compose.classList.contains('show')) return;
    compose.classList.remove('show');
    addBubble('right', '真的真的。');
    setTimeout(function(){
      const silence = document.createElement('div');
      silence.className = 'phone-silence';
      silence.textContent = 'Caleb沉寂了，并没有回复你的消息。';
      box.appendChild(silence);
      box.scrollTop = box.scrollHeight;
    }, 700);
    setTimeout(function(){
      if (State.variables.calebEyeFlashSeen) {
        finish();
        return;
      }
      State.variables.calebEyeFlashBlackout = true;
      showCalebEyeFlash(function(){
        State.variables.calebEyeFlashBlackout = false;
        finish();
      });
    }, 1700);
  });
};

/* === 剧情记忆面板 === */
