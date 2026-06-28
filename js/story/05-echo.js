window.ensureEchoChapterState = function(){
  const vars = window.State?.variables;
  if (!vars) return;
  if (vars.echoPrizeNoticeSeen === undefined) vars.echoPrizeNoticeSeen = false;
  if (vars.echoOfficialWinSeen === undefined) vars.echoOfficialWinSeen = false;
  if (vars.echoCalebCongratsRead === undefined) vars.echoCalebCongratsRead = false;
  if (vars.echoYizhouCongratsRead === undefined) vars.echoYizhouCongratsRead = false;
  if (vars.echoBackstageVisited === undefined) vars.echoBackstageVisited = false;
};

window.STORY_DATA = window.STORY_DATA || {};
Object.assign(window.STORY_DATA, {
  "Echo-1": `<<run ensureEchoChapterState()>>
<<set $echoPrizeNoticeSeen = true>>
<div class="phone-shell echo-alert-phone buzz">
  <div class="phone-status"><span>20:03</span><span>5G  66%</span></div>
  <div class="phone-titlebar">
    <span class="phone-back">‹</span>
    <span>消息</span>
    <span class="phone-dot"></span>
  </div>
  <div class="echo-notification-rain">
    <div class="echo-count-badge">128</div>
    <div class="echo-notice">Skyline Horizon 官方账号 转发了你</div>
    <div class="echo-notice">你有 32 条新的 @</div>
    <div class="echo-notice">你有 58 条新的转发</div>
    <div class="echo-notice">Skyline Horizon 官方账号 提到了你</div>
    <div class="echo-notice">你有 128 条未读消息</div>
  </div>
</div>

手机嗡嗡嗡地震个不停，你满头问号地抓过来一看，屏幕上的提示像下雨一样往下刷——短短几分钟，消息数已经飙到三位数。

[[继续->Echo-2]]`,

  "Echo-2": `不会是……被网暴了吧？前几天转发的时候写的那个等一个私联，不会有人拿着你的转发大做文章吧。

你有点心虚地咽了口口水，颤巍巍地点开app。消息全是红点，你心脏突突直跳，点进通知栏——清一色的转发和@。

下一秒，看到被转发的原文，你瞪大了眼睛，手机差点扔了出去。

[[继续->Echo-3]]`,

  "Echo-3": `<<run ensureEchoChapterState()>>
<<set $echoOfficialWinSeen = true>>
<div id="echo3-sns" class="sns-phone phone-shell"></div>
<<done>><<run renderSnsApp({
  id: 'echo3-sns',
  view: 'feed',
  title: '消息',
  time: '20:04',
  battery: '65%',
  unread: true,
  activeTab: 'messages',
  topNotice: '转发和@ 正在刷新',
  user: { name: '你', avatar: '你', handle: '@live_notes', meta: 'Skyline Horizon 现场记录' },
  posts: [
    {
      author: 'Skyline_Horizon_Official',
      avatar: 'SH',
      handle: '@SkylineHorizon',
      time: '刚刚',
      source: '官方账号',
      text: '恭喜@你 获得本次后台一日游资格。请联系本账号与工作人员对接。',
      reposts: 423,
      comments: 168,
      likes: 2306
    }
  ]
})>><</done>>

<div class="phone-complete phone-complete-outside">[[继续->Echo-4]]</div>`,

  "Echo-4": `啊？

啊？？？？？

谁？？？我吗？？？你现在满脑子都是那个指着自己一脸疑惑的表情包。你激动的手都有些发抖，点进官方账号之前，先点开了Caleb的对话框。

[[继续->Echo-5]]`,

  "Echo-5": `<<run ensureEchoChapterState()>>
<<set $echoCalebCongratsRead = true>>
<div id="echo5-chat" class="phone-shell" data-contact="Caleb"></div>
<<done>><<run renderPhoneChat({
  id: 'echo5-chat',
  messages: [
    { who: 'left', text: '看到你中奖了，恭喜你。' },
    { who: 'left', text: '【摸头表情】', type: 'stickerPlaceholder', title: '摸头表情' },
    { who: 'right', text: '卧槽卧槽卧槽，居然能中啊啊啊' },
    { who: 'right', text: '中了我中了我中了！！！' },
    { who: 'left', text: '看来有人今天要高兴得睡不着了' },
    { who: 'right', text: '嘿嘿嘿嘿我要跟夏以昼独处了，想想就爽' }
  ],
  nextText: '继续',
  nextTarget: 'Echo-6'
})>><</done>>`,

  "Echo-6": `<<run ensureEchoChapterState()>>
<<set $echoYizhouCongratsRead = true>>
与此同时，那个全黑头像的夏以昼的账号也给你发了一条私信，只有简简单单的两个字：

<div id="echo6-chat" class="phone-shell yizhou-phone" data-contact="夏以昼"></div>
<<done>><<run renderPhoneChat({
  id: 'echo6-chat',
  contact: '夏以昼',
  messages: [
    { who: 'left', text: '恭喜。' }
  ],
  nextText: '继续',
  nextTarget: 'Echo-7'
})>><</done>>`,

  "Echo-7": `“昼哥，那今天后台整理就拜托你了。”贝斯收拾好了琴，拍了拍夏以昼的肩膀。

夏以昼扬了扬下巴：“没事，交给我。”

贝斯咧嘴一笑，正要走，又像是想起什么似的回头：“对了，你认识这次中奖的粉丝吗？”

夏以昼摸了摸自己的下巴，眼底的神色一闪而过，似乎带着一点若有若无的笑意：“算是吧，有的时候演出结束会跟她打个招呼。”

贝斯听了也没多问，只是点点头，把琴背在肩上，朝门外走去。

[[继续->Echo-8]]`,

  "Echo-8": `你站在昏暗的走廊里，刚刚结束的演出带来的兴奋还没完全褪去，你的心跳还没从刚才的狂热中平复下来，身上微微发热，连皮肤都在隐隐发烫。

出门前你特意喷了点带着清甜花香的香水，你本来想穿的隆重一些，但是又怕那套有点性感的深v包臀连衣裙会弄巧成拙。最后还是换了平时参加live会穿的衣服。这样他应该也更熟悉一点吧。

走廊的灯光昏黄，墙壁上贴着几张旧海报，角落里堆放着杂乱的设备箱，空气中弥漫着一股淡淡的烟味和酒精味，并不太好闻。你低头看了看手机，官方账号的私信里说“演出结束后工作人员会带你到后台入口”，可现在你站在这里，空无一人。偶尔有酒吧的工作人员从你身边经过，好奇地看了你一眼便匆匆离去。

[[继续->Echo-9]]`,

  "Echo-9": `你的手指不自觉地攥紧了手机，指尖微微发凉。身体因为过度兴奋而微微颤抖，你甚至能感觉到自己的呼吸有些急促。脚下不自觉地来回挪动，鞋底在地板上发出轻微的摩擦声，你低着头看着脚尖，一阵脚步声传来，你抬头看过去，是贝斯手。

“原来是你啊，总是看到你盯着昼哥看。跟我来吧。”他对你笑笑，示意你跟上。

你跟在贝斯手身后，穿过几个拐角，到了一条比外面更昏暗的通道。走廊尽头是一扇半掩着的门，灯光从门缝里透出来，贝斯手推开门，侧过身比了个请的手势：“到了，进去吧，昼哥在里面等你。”

[[继续->Echo-10]]`,

  "Echo-10": `<<set $echoBackstageVisited = true>>
“来了？”有些低沉的嗓音打破寂静，你看到他的脚尖出现在你的视线里，知道他就站在你面前，但是还是紧张的不太好意思抬头。轻笑声在你头上响起，下一秒，夏以昼半蹲下来，抬头看着你：“怎么不看我？刚才在舞台下不是一直盯着我吗？”

你喉咙一紧，大脑一片空白，除了第一次来酒吧那次不小心撞到他，从来没跟夏以昼离得这么近过。他脸上的毛孔清晰可见，眼睫毛又密又长，仿佛画了加粗眼线。你以为他的眼睛是紫色的，今天才知道，下面还有一圈淡淡的橙色。他的眼睛里带着化不开的温柔和笑意，看的你心里漏跳了一拍。

“呃……我……”

[[继续->Echo-11]]`,

  "Echo-11": `他低低笑了一声，缓缓起身，把手里的水瓶塞进你怀里：“别傻站着了，走吧，带你看看后台。”你终于鼓起勇气抬起头，他已经转身，背对你走向房间深处。

“这里还挺小的。”他眼神扫过这个窄小的房间。“我们每场演出前后都在这里待一会儿。”

你也是这个时候才开始认真打量这个后台休息室。这里比你想象中还要小不少，推开门时甚至需要侧身才不至于碰到门后的乐器箱。昏黄的灯光下，靠墙摆着一张略显旧的皮沙发，坐垫中央处已经有了凹陷。旁边是一排临时搭起的服装架，挂着几件还留着褶痕的演出服。沙发前的茶几上，随意地散放着几只喝到一半或空掉的水瓶，还有一些看不出是谁的私人物品随意地丢在桌面上。靠另一面墙摆着化妆镜，镜框上贴着几张褪色的贴纸，台面上有细碎的粉末和几支用过的眼线笔。

[[继续->Echo-12]]`,

  "Echo-12": `夏以昼轻轻用脚尖推了下地上的空瓶子，看向你：“这里虽然比较小，但是我觉得我们之后会站上更大的舞台。”简单介绍完，他似乎也没了话题，空气里弥漫着短暂的沉默，你只能听到自己的心跳震得耳膜响个不停。

你听到他似乎吞了口口水：“要不要问我几个私人问题？我不介意的。”

你被这句话惊得愣了一下，急忙摆摆手，笑得有些局促：“不了……我只是很欣赏你的人和音乐，不想给你造成太大的困扰。”夏以昼微微挑眉，似乎对你的反应有些意外，他微微蹙眉，摸了摸下巴：“嗯……那签名呢？有什么地方想让我给你签字吗？”

[[继续->Echo-13]]`,

  "Echo-13": `夏以昼低头拧开手里的水瓶，喝了一口，又慢悠悠地走到沙发旁坐下，拍了拍身边的位置：“坐啊，不用拘谨。”

你犹豫了一下，还是走过去，在他旁边坐下，摸出手机和平板，递给他：“那能在我的手机壳上和平板壳子上都签个名吗？”

夏以昼接过你的物品，在沙发茶几的抽屉里翻了半天，翻出一只金色的油漆笔，签下自己的名字。他的签名和你想的不太一样，一点也不龙飞凤舞，规规整整的。他把签好名的手机和平板都还给你，指尖轻轻地碰到你的手背：“就当我一直都在你身边。”

你抬头想说点什么，却又撞进他那双带笑的眼睛，脑子一片空白，只能紧紧攥住手里的东西。

夏以昼看着有些呆住的你，又露出温和的笑容，用右手轻轻摸了摸你的发顶：“回家路上小心。”

[[继续->Echo-14]]`,

  "Echo-14": `依旧是那个昏暗的房间。夏以昼坐在床上，面前墙壁的投影是女孩社媒账号上的自拍，占据了整个墙面。他低低地喘息着，左手捏着一个飞机形状的发夹，右手握着尺寸傲人的阴茎，上下撸动着。

她好小……看起来软软的……凑近就是甜甜的香味。

在那个小小的后台房间里，意识到只有你们两人，靠得那么近，他就兴奋的要勃起。他只能在脑子里一遍一遍地整理着他练习过的最难的鼓点节奏保持冷静，可最后还是没忍住，摸了她的头。

没错……就是这只手。夏以昼的手又收紧了些，喉咙里发出一声低哑的闷哼。

过度的快感让夏以昼的眼神短暂失焦，最后短暂定格在面前墙壁的女孩的笑脸上。

第五章 Echo 线待续。`
});
