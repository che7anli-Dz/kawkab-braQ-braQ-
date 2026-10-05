
/* ===== Supabase — الربط الحقيقي (مع fallback للوضع التجريبي) ===== */
var SB=null;
try{
  if(typeof supabase!=='undefined'){
    SB=supabase.createClient('https://chosrqzpuczmirrxmnkf.supabase.co','sb_publishable__e-8by0NKHyY-mnRowNtqg_zRr8Fq_q');
  }
}catch(e){SB=null;}
var _profile=null;
async function sbUser(){
  if(!SB)return null;
  try{var r=await SB.auth.getUser();return (r.data&&r.data.user)?r.data.user:null;}catch(e){return null;}
}
function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function go(id){
  try{window.scrollTo(0,0);}catch(e){}
  setTimeout(function(){try{window.scrollTo(0,0);}catch(e){}},120);
  var main=['home','friends','video','souq','menu'];
  if(SB&&main.indexOf(id)>-1&&!_verified){go('splash');return;}
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  var main=['home','friends','video','souq','menu'];
  var isMain=main.indexOf(id)>-1;
  document.querySelector('.phone').classList.toggle('withutil',isMain);
  document.getElementById('navbar').style.display=isMain?'flex':'none';
  document.getElementById('fab').style.display=isMain?'block':'none';
  document.querySelectorAll('.nav-it').forEach(n=>n.classList.toggle('on',n.dataset.s===id));
  if(id==='souq'){loadProducts(false);}
  if(id==='video'){loadReels(false);}
  if(id==='home'){loadStories(false);}
  if(id==='sahha'){loadFeed(false);}
  if(id!=='video'){try{if(typeof pauseAllReels==='function')pauseAllReels();}catch(e){}}
  if(id!=='story'){try{if(typeof stopStoryMedia==='function')stopStoryMedia();}catch(e){}}
  if(id!=='story-new'){try{if(_stAudioEl){_stAudioEl.pause();_stPlaying=null;}}catch(e){}}
  if(id!=='reel-new'){try{if(_mqAudioEl){_mqAudioEl.pause();_mqPlaying=null;}}catch(e){}}
  window.scrollTo(0,0);
}
function openSheet(){document.getElementById('sheetbg').style.display='block'}
function closeSheet(){document.getElementById('sheetbg').style.display='none'}
function openChat(name,emoji){
  document.getElementById('chat-name').textContent=name;
  document.getElementById('chat-ava').textContent=emoji;
  go('chat');
}
function sendMsg(){
  var i=document.getElementById('chat-in');
  if(i.value.trim()){
    var d=document.createElement('div'); d.className='msg out'; d.textContent=i.value;
    document.getElementById('msgs').appendChild(d); i.value='';
    window.scrollTo(0,document.body.scrollHeight);
  }
}
var firstPhoto='';
function handlePhoto(input,idx){
  var f=input.files&&input.files[0]; if(!f)return;
  window._pFiles=window._pFiles||{}; window._pFiles[idx]=f;
  var url=URL.createObjectURL(f);
  document.getElementById('phv'+idx).innerHTML='<img src="'+url+'" style="width:100%;height:100%;object-fit:cover">';
  if(idx===1)firstPhoto=url;
}
function toast(t){
  var e=document.getElementById('toast'); e.textContent=t; e.style.display='block';
  clearTimeout(window._tt); window._tt=setTimeout(function(){e.style.display='none'},2300);
}
async function publishProduct(){
  var name=document.getElementById('p-name').value.trim()||'منتج جديد 🛍️';
  var desc=document.getElementById('p-desc').value.trim();
  var price=document.getElementById('p-price').value.trim();
  var wilaya=document.getElementById('p-wilaya').value;
  var cat=document.getElementById('p-cat').value;
  var cond=document.querySelector('.pcond.on').textContent;
  var files=window._pFiles||{};
  var photoUrls=[];
  var me=await sbUser();
  var realSaved=false;
  if(SB&&me){
    try{
      var idxs=Object.keys(files);
      for(var k=0;k<idxs.length;k++){
        var f=files[idxs[k]];
        var safeName=String(f.name||'photo.jpg').replace(/[^a-zA-Z0-9.]/g,'_');
        var path=me.id+'/'+Date.now()+'_'+idxs[k]+'_'+safeName;
        var up=await SB.storage.from('kb-products').upload(path,f,{upsert:true});
        if(!up.error){
          var pub=SB.storage.from('kb-products').getPublicUrl(path);
          if(pub.data&&pub.data.publicUrl)photoUrls.push(pub.data.publicUrl);
        }
      }
      var ins=await SB.from('kb_products').insert({seller_id:me.id,name:name,description:desc,price:price||null,category:cat,wilaya:wilaya,condition:cond,photos:photoUrls,status:'active'});
      if(ins.error)throw ins.error;
      _productsLoaded=false; realSaved=true;
      toast('🎉 تم نشر منتجك بنجاح!');
    }catch(e){toast('تعذر الحفظ في القاعدة — تحققي من الاتصال');}
  }
  if(!realSaved)toast('🎉 تم نشر منتجك بنجاح!');
  var imgHtml=firstPhoto?'<img src="'+firstPhoto+'" style="width:100%;height:100%;object-fit:cover">':'🛍️';
  var d=document.createElement('div'); d.className='prod'; d.setAttribute('onclick',"go('detail')");
  d.innerHTML='<div class="img" style="background:linear-gradient(135deg,#ffe0ec,#e9d5ff);overflow:hidden">'+imgHtml+'<span class="badge">'+cond+'</span></div><div class="info"><h4>'+escapeHtml(name)+'</h4><div class="price">'+(price?escapeHtml(price)+' دج':'السعر عند التواصل')+'</div><div class="seller">'+escapeHtml((_profile&&_profile.full_name)||'لينا')+' • '+escapeHtml(wilaya)+'</div></div>';
  var g=document.getElementById('souq-grid'); g.insertBefore(d,g.firstChild);
  document.getElementById('p-name').value=''; document.getElementById('p-desc').value='';
  document.getElementById('p-price').value=''; firstPhoto=''; window._pFiles={};
  for(var i=1;i<=4;i++){document.getElementById('phv'+i).innerHTML=i===1?'📷<small>رئيسية</small>':'＋';}
  go('souq');
}
/* signup + quiz + voice */
var QUIZ=[
 {q:'الكونسيلر البرتقالي واش يغطي؟',o:['الهالات الغامقة','حب الشباب','النمش'],c:0},
 {q:'"البايكينغ" واش هو؟',o:['تسخين الفرشاة','خلط كريمات','تثبيت بالبودرة'],c:2},
 {q:'المكياج المتكتل سببه؟',o:['ماركة غالية','منتج زايد','وجه مغسول'],c:1},
 {q:'الفوندوتان تجربيه وين؟',o:['خط الفك','على اليد','على الخد'],c:0},
 {q:'"الفال آوت" واش هو؟',o:['سيلان الماسكارا','تشقق الروج','تساقط الظل'],c:2},
 {q:'الماسكارا المقاومة للماء علاش تتجنب؟',o:['غالية بزاف','تقطع الرموش','ما تطولش'],c:1},
 {q:'البرايمر يندار قبل واش؟',o:['الفوندوتان','الماسكارا','أحمر الشفايف'],c:0}
];
var MALENAMES=['mohamed','mohammed','ahmed','amine','yacine','yassine','islam','riad','riyad','karim','walid','samir','bilal','hichem','houssem','oussama','abdel','mehdi','rayan','adam','yousef','omar','khaled','sofiane','anis','rafik','nassim'];
var qIdx=0,qScore=0,qOrder=[];
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
var ACTIVE_QUIZ=QUIZ;
async function fetchQuiz(){
  if(!SB)return QUIZ;
  try{
    var r=await SB.from('kb_quiz_questions').select('question,options,correct_index').eq('active',true).limit(20);
    if(r.error||!r.data||!r.data.length)return QUIZ;
    return r.data.map(function(x){return{q:x.question,o:x.options,c:x.correct_index};});
  }catch(e){return QUIZ;}
}
async function startQuiz(){
  var n=document.getElementById('su-name').value.trim();
  var e=document.getElementById('su-email').value.trim();
  var p=document.getElementById('su-phone').value.trim();
  var w=document.getElementById('su-wilaya').value;
  var pw=document.getElementById('su-pass').value;
  if(!n||!e||!p){toast('عمري الاسم والإيميل والهاتف 📝');return;}
  if(e.indexOf('@')<1){toast('الإيميل ما راهوش صحيح 💌');return;}
  var local=e.split('@')[0].toLowerCase();
  for(var i=0;i<MALENAMES.length;i++){if(local.indexOf(MALENAMES[i])>-1){toast('هاذ الإيميل ما يبانش تاع بنت 💌');return;}}
  if(!pw||pw.length<6){toast('كلمة السر لازم 6 حروف على الأقل 🔑');return;}
  try{localStorage.setItem('kb_pending',JSON.stringify({n:n,e:e,p:p,w:w}));}catch(_){}
  if(SB){
    try{
      var s=await SB.auth.signUp({email:e,password:pw});
      if(s.error)throw s.error;
      var sess=s.data&&s.data.session;
      var u=s.data&&s.data.user;
      if(sess&&u){
        try{await SB.from('kb_profiles').insert({id:u.id,full_name:n,email:e,phone:p,wilaya:w,verification_status:'pending'});}
        catch(_){}
        try{localStorage.removeItem('kb_pending');}catch(_){}
      }else{
        go('verify-email');return;
      }
    }catch(err){toast('التسجيل تعثر: '+err.message+' — نكمل تجريبيا');}
  }
  ACTIVE_QUIZ=await fetchQuiz();
  qIdx=0;qScore=0;qOrder=shuffle(ACTIVE_QUIZ.map(function(_,i){return i;}));
  renderQ();go('quiz');
}
function renderQ(){
  var Q=ACTIVE_QUIZ[qOrder[qIdx]];
  var opts=shuffle(Q.o.map(function(t,i){return{t:t,ok:i===Q.c};}));
  document.getElementById('q-num').textContent='سؤال '+(qIdx+1)+' من '+ACTIVE_QUIZ.length;
  document.getElementById('q-bar').style.width=(qIdx/ACTIVE_QUIZ.length*100)+'%';
  document.getElementById('q-text').textContent=Q.q;
  var box=document.getElementById('q-opts');box.innerHTML='';
  opts.forEach(function(op){
    var b=document.createElement('button');b.className='qopt';b.textContent=op.t;
    b.onclick=function(){answer(op.ok,b);};box.appendChild(b);
  });
}
function answer(ok,btn){
  if(ok){qScore++;btn.classList.add('ok');}else{btn.classList.add('no');}
  var all=document.querySelectorAll('.qopt');for(var i=0;i<all.length;i++)all[i].disabled=true;
  setTimeout(function(){qIdx++;if(qIdx<ACTIVE_QUIZ.length)renderQ();else finishQuiz();},650);
}
async function finishQuiz(){
  document.getElementById('q-bar').style.width='100%';
  if(qScore>=4){
    document.getElementById('pass-score').textContent=qScore+' / '+ACTIVE_QUIZ.length;
    if(SB){
      try{
        var u=await sbUser();
        if(u)await SB.from('kb_profiles').update({quiz_score:qScore,verification_status:'quiz_passed'}).eq('id',u.id);
      }catch(e){}
    }
    _verified=true;
    go('quiz-pass');
  }
  else{document.getElementById('fail-score').textContent=qScore+' / '+ACTIVE_QUIZ.length;go('voice');}
}
var mrRec=null,mrStream=null,mrChunks=[],mrTimer=null,mrSec=0;
function toggleRec(){
  var btn=document.getElementById('rec-btn');
  if(mrRec&&mrRec.state==='recording'){mrRec.stop();return;}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('المتصفح ما يدعمش التسجيل 🎤');return;}
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
    mrStream=stream;mrChunks=[];
    mrRec=new MediaRecorder(stream);
    mrRec.ondataavailable=function(e){mrChunks.push(e.data);};
    mrRec.onstop=function(){
      var blob=new Blob(mrChunks,{type:'audio/webm'});
      window._vocalBlob=blob;
      document.getElementById('rec-play').src=URL.createObjectURL(blob);
      document.getElementById('rec-done').style.display='block';
      document.getElementById('rec-live').style.display='none';
      btn.innerHTML='🎤 سجلي الفوكال';btn.classList.remove('recording');
      if(mrStream)mrStream.getTracks().forEach(function(t){t.stop();});
      clearInterval(mrTimer);
    };
    mrRec.start();mrSec=0;
    document.getElementById('rec-time').textContent='0:00';
    document.getElementById('rec-done').style.display='none';
    document.getElementById('rec-live').style.display='block';
    btn.innerHTML='⏹️ وقفي التسجيل';btn.classList.add('recording');
    mrTimer=setInterval(function(){
      mrSec++;document.getElementById('rec-time').textContent=Math.floor(mrSec/60)+':'+String(mrSec%60).padStart(2,'0');
      if(mrSec>=90&&mrRec.state==='recording')mrRec.stop();
    },1000);
  }).catch(function(){toast('ما قدرناش نوصلو للميكروفون 🎤');});
}
function uploadVocal(input){
  var f=input.files&&input.files[0];if(!f)return;
  window._vocalBlob=f;
  document.getElementById('rec-play').src=URL.createObjectURL(f);
  document.getElementById('rec-done').style.display='block';
  toast('تم رفع الفوكال ✅');
}
function openProfile(name,wilaya,tags,emoji,rank,ret){
  document.getElementById('op-name').textContent=name;
  document.getElementById('op-name2').textContent=name;
  document.getElementById('op-rank').textContent=rank;
  document.getElementById('op-emoji').textContent=emoji;
  document.getElementById('op-emoji2').textContent=emoji;
  document.getElementById('op-bio').innerHTML='📍 '+wilaya+'<br>'+tags;
  document.getElementById('op-back').setAttribute('onclick',"go('"+ret+"')");
  document.getElementById('op-add').textContent='👭 أضيفيها صديقة';
  go('oprofile');
}
/* ===== الدخول / الخروج / البروفايل ===== */
/* ===== بوابة الدخول: غير المتحققين ما يدخلوش للتطبيق ===== */
var _verified=false;
var _seen=false;
var _skipSplash=false;
function hasStoredSession(){
  try{
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i);
      if(k&&k.indexOf('sb-')===0&&k.lastIndexOf('-auth-token')===k.length-11){
        var o=JSON.parse(localStorage.getItem(k)||'null');
        if(o&&o.access_token)return true;
      }
    }
  }catch(e){}
  return false;
}
try{_seen=localStorage.getItem('kb_seen')==='1';}catch(e){}
_skipSplash=_seen||hasStoredSession();
function markSeen(){_seen=true;_skipSplash=true;try{localStorage.setItem('kb_seen','1');}catch(e){}}
async function checkVerified(){
  if(!SB)return true;
  try{
    var u=await sbUser();if(!u)return false;
    var r=await SB.from('kb_profiles').select('verification_status,role,is_banned').eq('id',u.id).single();
    if(r.error||!r.data)return false;
    if(r.data.is_banned)return 'banned';
    if(r.data.role==='owner')return true;
    var st=r.data.verification_status;
    return (st==='quiz_passed'||st==='approved');
  }catch(e){return false;}
}
async function gateAndEnter(){
  await ensureProfile();
  var v=await checkVerified();
  if(v===true){
    _verified=true;
    markSeen();
    await loadUserProfile();
    go('home');
    return true;
  }
  try{if(SB)await SB.auth.signOut();}catch(e){}
  _verified=false;
  go((_skipSplash||_seen)?'login':'splash');
  toast(v==='banned'?'هاذ الحساب محظور 🚫':'كملي التحقق أولا باش تدخلي 🔐');
  return false;
}
async function doLogin(){
  var e=document.getElementById('li-email').value.trim();
  var p=document.getElementById('li-pass').value;
  if(!e||!p){toast('عمري الإيميل وكلمة السر 🔑');return;}
  if(!SB){toast('ما كاش اتصال — دخول تجريبي');markSeen();go('home');return;}
  try{
    var r=await SB.auth.signInWithPassword({email:e,password:p});
    if(r.error)throw r.error;
    await ensureProfile();
    /* تفعيل المالك تلقائيا عند أول دخول — قبل بوابة التحقق */
    try{
      var c=await SB.rpc('kb_claim_owner');
      if(!c.error){
        _verified=true;_wantClaim=false;markSeen();await loadUserProfile();
        toast('👑 راك مالك الكوكب دروك!');go('home');return;
      }
    }catch(_){}
    _wantClaim=false;
    if(await gateAndEnter())toast('مرحبا بيك في الكوكب 💖');
  }catch(err){toast('الدخول ما كملش: '+err.message);}
}
async function doLogout(){
  try{if(SB)await SB.auth.signOut();}catch(e){}
  _profile=null;_verified=false;go('splash');
}
/* إنشاء البروفايل إذا ما كاش (حالة تأكيد الإيميل) */
async function ensureProfile(){
  if(!SB)return;
  try{
    var u=await sbUser();if(!u)return;
    var r=await SB.from('kb_profiles').select('id').eq('id',u.id).single();
    if(r.data)return;
    var pd=null;
    try{pd=JSON.parse(localStorage.getItem('kb_pending')||'null');}catch(_){}
    var row={id:u.id,verification_status:'pending'};
    if(pd&&pd.n){row.full_name=pd.n;row.email=pd.e||u.email;row.phone=pd.p;row.wilaya=pd.w;}
    else{var em=u.email||'عضوة';row.full_name=em.split('@')[0];row.email=u.email;}
    await SB.from('kb_profiles').insert(row);
    try{localStorage.removeItem('kb_pending');}catch(_){}
  }catch(e){}
}
async function loadUserProfile(){
  if(!SB)return;
  try{
    var u=await sbUser();if(!u)return;
    var r=await SB.from('kb_profiles').select('full_name,wilaya,rank,bio,avatar_emoji,role').eq('id',u.id).single();
    if(r.error||!r.data)return;
    _profile=r.data;
    document.getElementById('pf-name').textContent=r.data.full_name||'ملكة الكوكب';
    document.getElementById('pf-rank').textContent='⭐ '+(r.data.rank||'مواطنة');
    document.getElementById('pf-bio').innerHTML='📍 '+escapeHtml(r.data.wilaya||'الجزائر')+'<br>'+escapeHtml(r.data.bio||'💖 عضوة في كوكب برق برق');
    var al=document.getElementById('admin-link');
    if(al)al.style.display=(r.data.role==='owner')?'flex':'none';
  }catch(e){}
}
/* ===== الفوكال: رفع + تسجيل للمراجعة ===== */
async function sendVocal(){
  var blob=window._vocalBlob||null;
  if(!blob){toast('سجلي الفوكال أولا 🎤');return;}
  if(SB){
    try{
      var u=await sbUser();
      if(u){
        var path=u.id+'/'+Date.now()+'.webm';
        var up=await SB.storage.from('kb-voice').upload(path,blob,{contentType:'audio/webm',upsert:true});
        if(up.error)throw up.error;
        await SB.from('kb_voice_notes').insert({user_id:u.id,audio_url:path,status:'pending'});
        await SB.from('kb_profiles').update({verification_status:'voice_pending'}).eq('id',u.id);
        toast('وصل الفوكال ✅');
      }
    }catch(e){toast('تعذر إرسال الفوكال — تحققي من الاتصال');}
  }
  go('pending');
}
/* ===== شفرة المالك: 4 ضغطات متتالية على اللوغو 👑 ===== */
var _taps=[];
var _wantClaim=false;
async function secretTap(){
  var now=Date.now();
  _taps=_taps.filter(function(t){return now-t<2500;});
  _taps.push(now);
  if(_taps.length>=4){_taps=[];claimOwner();}
}
async function claimOwner(){
  if(!SB){toast('ما كاش اتصال');return;}
  try{
    var u=await sbUser();
    if(!u){_wantClaim=true;toast('سجل دخولك باش نفعل المالك 👑');go('login');return;}
    var r=await SB.rpc('kb_claim_owner');
    if(r.error)throw r.error;
    _verified=true;
    await loadUserProfile();
    toast('👑 راك مالك الكوكب دروك!');
    markSeen();
    go('home');
  }catch(e){
    var m=String((e&&e.message)||'');
    if(m.indexOf('ALREADY_CLAIMED')>-1)toast('كاين مالك من قبل 👑');
    else if(m.indexOf('NO_PROFILE')>-1)toast('كملي التسجيل أولا 📝');
    else if(m.indexOf('NOT_LOGGED_IN')>-1){toast('أنشئي حسابك أولا 💖');go('signup');}
    else toast('تعذر التفعيل');
  }
}
/* ===== لوحة المالك 👑 ===== */
function admTab(t){
  document.getElementById('adm-pending').style.display=t==='pending'?'block':'none';
  document.getElementById('adm-members').style.display=t==='members'?'block':'none';
  document.getElementById('adm-t1').style.cssText='flex:1;padding:10px'+(t==='pending'?'':'\;background:transparent;border:2px solid var(--pink);color:var(--pink-d);box-shadow:none');
  document.getElementById('adm-t2').style.cssText='flex:1;padding:10px'+(t==='members'?'':'\;background:transparent;border:2px solid var(--pink);color:var(--pink-d);box-shadow:none');
  if(t==='pending')loadPending();else loadMembers();
}
async function openAdmin(){
  if(!SB){toast('ما كاش اتصال');return;}
  if(!_profile||_profile.role!=='owner'){toast('هاذ البلاصة للمالك برك 👑');return;}
  _verified=true;
  go('admin');admTab('pending');
}
async function loadPending(){
  var box=document.getElementById('adm-pending');
  box.innerHTML='<p style="text-align:center;color:var(--muted)">نحمل الطلبات... ⏳</p>';
  try{
    var r=await SB.from('kb_voice_notes').select('id,user_id,audio_url,created_at').eq('status','pending').order('created_at',{ascending:true}).limit(50);
    if(r.error)throw r.error;
    var notes=r.data||[];
    document.getElementById('adm-count').textContent=notes.length?('('+notes.length+')'):'';
    if(!notes.length){box.innerHTML='<p style="text-align:center;color:var(--muted)">ما كاش طلبات معلقة 🎉</p>';return;}
    var ids=[];notes.forEach(function(n){if(ids.indexOf(n.user_id)<0)ids.push(n.user_id);});
    var names={};
    try{
      var pr=await SB.from('kb_profiles').select('id,full_name,wilaya,quiz_score').in('id',ids);
      if(!pr.error&&pr.data)pr.data.forEach(function(x){names[x.id]=x;});
    }catch(e){}
    box.innerHTML='';
    notes.forEach(function(n){
      var p=names[n.user_id]||{};
      var d=document.createElement('div');d.className='svc';d.id='vn-'+n.id;
      d.innerHTML='<div class="avatar" style="width:48px;height:48px;font-size:24px">🎤</div>'+
        '<div style="flex:1"><h4>'+escapeHtml(p.full_name||'بنت جديدة')+'</h4>'+
        '<p>'+escapeHtml(p.wilaya||'')+' • نتيجة الكويز: '+(p.quiz_score==null?'—':p.quiz_score+' / 7')+'</p>'+
        '<div id="vp-'+n.id+'"></div></div>'+
        '<div style="display:flex;flex-direction:column;gap:6px">'+
        '<button class="btn" style="padding:8px 12px;font-size:13px" onclick="playVoice(\''+n.audio_url+'\',\'vp-'+n.id+'\')">▶️ اسمعي</button>'+
        '<button class="btn" style="padding:8px 12px;font-size:13px;background:#22c55e" onclick="approveUser(\''+n.user_id+'\',\''+n.id+'\')">✅ قبول</button>'+
        '<button class="btn" style="padding:8px 12px;font-size:13px;background:#ef4444" onclick="rejectUser(\''+n.user_id+'\',\''+n.id+'\')">❌ رفض</button></div>';
      box.appendChild(d);
    });
  }catch(e){box.innerHTML='<p style="text-align:center;color:var(--muted)">تعذر التحميل: '+escapeHtml(e.message)+'</p>';}
}
async function playVoice(path,slot){
  var el=document.getElementById(slot);
  el.innerHTML='⏳...';
  try{
    var s=await SB.storage.from('kb-voice').createSignedUrl(path,600);
    if(s.error)throw s.error;
    el.innerHTML='<audio controls style="width:100%;margin-top:6px" src="'+s.data.signedUrl+'"></audio>';
  }catch(e){el.innerHTML='تعذر التشغيل 🎤';}
}
async function approveUser(uid,nid){
  try{
    await SB.from('kb_profiles').update({verification_status:'approved',is_verified:true}).eq('id',uid);
    await SB.from('kb_voice_notes').update({status:'approved'}).eq('id',nid);
    var d=document.getElementById('vn-'+nid);if(d)d.remove();
    toast('تقبلت ✅ مرحبا بيها في الكوكب');
  }catch(e){toast('تعذر القبول: '+e.message);}
}
async function rejectUser(uid,nid){
  if(!confirm('ترفضي هاذ العضوة؟ ما راحش تقدر تدخل.'))return;
  try{
    await SB.from('kb_profiles').update({verification_status:'rejected'}).eq('id',uid);
    await SB.from('kb_voice_notes').update({status:'rejected'}).eq('id',nid);
    var d=document.getElementById('vn-'+nid);if(d)d.remove();
    toast('ترفضت ❌');
  }catch(e){toast('تعذر الرفض: '+e.message);}
}
async function loadMembers(){
  var q=(document.getElementById('adm-q').value||'').trim();
  var box=document.getElementById('adm-list');
  try{
    var qry=SB.from('kb_profiles').select('id,full_name,wilaya,role,verification_status,is_banned,created_at').order('created_at',{ascending:false}).limit(50);
    if(q)qry=qry.ilike('full_name','%'+q+'%');
    var r=await qry;
    if(r.error)throw r.error;
    var rows=(r.data||[]).filter(function(x){return x.role!=='owner';});
    if(!rows.length){box.innerHTML='<p style="text-align:center;color:var(--muted)">ما كاش نتائج</p>';return;}
    box.innerHTML='';
    rows.forEach(function(x){
      var d=document.createElement('div');d.className='svc';
      var st=x.is_banned?'🚫 محظورة':({pending:'⏳ مسجلة',quiz_passed:'✅ كويز',voice_pending:'🎤 فوكال',approved:'✅ مقبولة',rejected:'❌ مرفوضة'}[x.verification_status]||x.verification_status);
      d.innerHTML='<div class="avatar" style="width:48px;height:48px;font-size:24px">🌸</div>'+
        '<div style="flex:1"><h4>'+escapeHtml(x.full_name||'—')+'</h4><p>'+escapeHtml(x.wilaya||'')+' • '+st+'</p></div>'+
        (x.is_banned
          ?'<button class="btn" style="padding:8px 12px;font-size:13px;background:#22c55e" onclick="unbanUser(\''+x.id+'\')">فك الحظر</button>'
          :'<button class="btn" style="padding:8px 12px;font-size:13px;background:#ef4444" onclick="banUser(\''+x.id+'\',\''+escapeHtml(x.full_name||'')+'\')">🚫 حظر</button>');
      box.appendChild(d);
    });
  }catch(e){box.innerHTML='<p style="text-align:center;color:var(--muted)">تعذر التحميل</p>';}
}
async function banUser(uid,name){
  if(!confirm('تحظري '+name+'؟ ما راحش تقدر تدخل للتطبيق.'))return;
  try{
    await SB.from('kb_profiles').update({is_banned:true}).eq('id',uid);
    toast('تحظرت 🚫');loadMembers();
  }catch(e){toast('تعذر الحظر: '+e.message);}
}
async function unbanUser(uid){
  try{
    await SB.from('kb_profiles').update({is_banned:false}).eq('id',uid);
    toast('تفك الحظر ✅');loadMembers();
  }catch(e){toast('تعذر فك الحظر: '+e.message);}
}
/* ===== الريلز الحقيقي 🎬 (فيديو/صور + موسيقى يوتيوب) ===== */
var _reelsLoaded=false,_reelFile=null,_reelType='video',_reelObs=null;
var _reelFilter='none',_trimS=0,_trimE=0,_vidDur=0;
var _reelMusic=null,_mqTimer=null,_mqAudioEl=null,_mqPlaying=null;
var FILTERCSS={none:'none',noir:'grayscale(1) contrast(1.1)',warm:'sepia(.45) saturate(1.4)',cool:'hue-rotate(-15deg) saturate(1.2) brightness(1.05)',bright:'brightness(1.25) saturate(1.1)',drama:'contrast(1.35) saturate(.7)'};
var FILTERLBL={none:'عادي ✨',noir:'كلاسيك ⬛',warm:'دافئ 🌅',cool:'بارد 🧊',bright:'مشرق ☀️',drama:'درامي 🎭'};
var _likedReels={};
try{_likedReels=JSON.parse(localStorage.getItem('kb_liked_reels')||'{}');}catch(e){}
function ytId(url){
  if(!url)return null;
  var m=String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/);
  return m?m[1]:null;
}
function reelUrl(path){
  if(!path)return '';
  if(path.indexOf('http')===0)return path;
  try{return SB.storage.from('kb-reels').getPublicUrl(path).data.publicUrl;}catch(e){return '';}
}
function rnPreview(inp){
  var f=inp.files&&inp.files[0];if(!f)return;
  if(f.size>80*1024*1024){toast('الملف كبير بزاف (أقصى 80MB) 📦');return;}
  _reelFile=f;
  _reelType=f.type.indexOf('image')===0?'photo':'video';
  _reelFilter='none';_trimS=0;_trimE=0;_vidDur=0;
  var box=document.getElementById('rn-prev');
  var url=URL.createObjectURL(f);
  box.innerHTML=_reelType==='photo'
    ?'<img class="wfull" src="'+url+'">'
    :'<video src="'+url+'" playsinline muted loop style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">';
  document.getElementById('rn-edit').style.display='block';
  if(_reelType==='photo'){
    document.getElementById('rn-filters').style.display='block';
    document.getElementById('rn-trim').style.display='none';
    buildFilters();
  }else{
    document.getElementById('rn-filters').style.display='none';
    document.getElementById('rn-trim').style.display='none';
    var v=box.querySelector('video');
    if(v){v.play().catch(function(){});
      v.onloadedmetadata=function(){if(v.duration&&isFinite(v.duration))rnTrimInit(v.duration);};}
  }
}
function buildFilters(){
  var row=document.getElementById('rn-frow');
  row.innerHTML='';
  Object.keys(FILTERLBL).forEach(function(k){
    var b=document.createElement('button');
    b.textContent=FILTERLBL[k];
    if(k==='none')b.className='on';
    b.onclick=function(){rnSetFilter(k,b);};
    row.appendChild(b);
  });
}
function rnSetFilter(f,btn){
  _reelFilter=f;
  var m=document.querySelector('#rn-prev img,#rn-prev video');
  if(m)m.style.filter=FILTERCSS[f]||'none';
  var btns=document.querySelectorAll('#rn-frow button');
  for(var i=0;i<btns.length;i++)btns[i].classList.remove('on');
  if(btn)btn.classList.add('on');
}
function rnTrimInit(dur){
  _vidDur=dur;_trimS=0;_trimE=dur;
  var s=document.getElementById('rn-ts'),e=document.getElementById('rn-te');
  var mx=Math.max(1,Math.floor(dur));
  s.max=mx;e.max=mx;s.value=0;e.value=mx;
  document.getElementById('rn-trim').style.display='block';
  updTrimLab();
}
function updTrimLab(){
  _trimS=parseFloat(document.getElementById('rn-ts').value)||0;
  _trimE=parseFloat(document.getElementById('rn-te').value)||_vidDur;
  if(_trimE<=_trimS)_trimE=_trimS+1;
  document.getElementById('rn-trim-lab').textContent=fmtT(_trimS)+' - '+fmtT(_trimE);
}
function fmtT(s){s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2);}
/* ===== باحث الأغاني 🎶 (كيما انستغرام) ===== */
function rnSearchMusic(q){
  var box=document.getElementById('rn-mres');
  if(!q||q.trim().length<2){box.innerHTML='';return;}
  clearTimeout(_mqTimer);
  _mqTimer=setTimeout(function(){mqDoSearch(q.trim(),box);},450);
}
async function mqDoSearch(q,box){
  box.innerHTML='<p style="text-align:center;color:var(--muted);font-size:13px;padding:10px">نبحث... 🔍</p>';
  var res=await mqFetch(q);
  if(!res.length){box.innerHTML='<p style="text-align:center;color:var(--muted);font-size:13px;padding:10px">ما لقينا والو 😕 جربي كلمة أخرى</p>';return;}
  box.innerHTML='';
  res.forEach(function(t){
    var d=document.createElement('div');
    d.className='mq-item';
    var im=document.createElement('img');im.src=t.art;im.alt='';
    var go=document.createElement('div');go.className='mq-go';
    var b=document.createElement('b');b.textContent=t.title;
    var sm=document.createElement('small');sm.textContent=t.artist;
    go.appendChild(b);go.appendChild(sm);
    var bp=document.createElement('button');bp.className='mq-play';bp.textContent='▶';bp.title='استمعي';
    var ba=document.createElement('button');ba.textContent='＋';ba.title='اختاري';
    bp.onclick=function(){mqPreview(t,bp);};
    ba.onclick=function(){mqSelect(t);};
    d.appendChild(im);d.appendChild(go);d.appendChild(bp);d.appendChild(ba);
    box.appendChild(d);
  });
}
async function mqFetch(q){
  var urls=[
    'https://itunes.apple.com/search?term='+encodeURIComponent(q)+'&media=music&entity=song&limit=12&country=DZ',
    'https://itunes.apple.com/search?term='+encodeURIComponent(q)+'&media=music&entity=song&limit=12&country=US'
  ];
  for(var i=0;i<urls.length;i++){
    try{
      var r=await fetch(urls[i]);
      var j=await r.json();
      if(j.results&&j.results.length){
        return j.results.filter(function(x){return x.previewUrl;}).map(function(x){
          return {preview:x.previewUrl,title:x.trackName||'؟',artist:x.artistName||'؟',
            art:(x.artworkUrl100||'').replace('100x100bb','200x200bb')};
        });
      }
    }catch(e){}
  }
  return [];
}
function mqPreview(t,btn){
  if(!_mqAudioEl){_mqAudioEl=new Audio();_mqAudioEl.preload='none';}
  var btns=document.querySelectorAll('#rn-mres .mq-play');
  for(var i=0;i<btns.length;i++)btns[i].textContent='▶';
  if(_mqPlaying===t.preview&&!_mqAudioEl.paused){_mqAudioEl.pause();_mqPlaying=null;return;}
  _mqAudioEl.src=t.preview;
  _mqAudioEl.play().catch(function(){});
  _mqPlaying=t.preview;btn.textContent='⏸';
}
function mqSelect(t){
  _reelMusic={preview:t.preview,title:t.title,artist:t.artist,start:0};
  if(_mqAudioEl){try{_mqAudioEl.pause();}catch(e){}_mqPlaying=null;}
  document.getElementById('rn-chip-art').src=t.art;
  document.getElementById('rn-chip-t').textContent=t.title;
  document.getElementById('rn-chip-a').textContent=t.artist;
  document.getElementById('rn-song-chip').style.display='flex';
  document.getElementById('rn-mres').innerHTML='';
  document.getElementById('rn-mq').value='';
  document.getElementById('rn-mseg').style.display='block';
  document.getElementById('rn-ms').value=0;
  document.getElementById('rn-ms-lab').textContent='0s';
}
function mqClear(){
  _reelMusic=null;
  document.getElementById('rn-song-chip').style.display='none';
  document.getElementById('rn-mseg').style.display='none';
}
function mqSeg(v){
  if(!_reelMusic)return;
  _reelMusic.start=parseInt(v,10)||0;
  document.getElementById('rn-ms-lab').textContent=_reelMusic.start+'s';
}
async function publishReel(){
  if(!_reelFile){toast('اختاري فيديو أو صورة أولا 📹');return;}
  if(!SB){toast('ما كاش اتصال');return;}
  var btn=document.getElementById('rn-pub');btn.disabled=true;btn.textContent='ننشرو... ⏳';
  try{
    var u=await sbUser();if(!u)throw new Error('سجلي الدخول أولا');
    var ext=((_reelFile.name||'').split('.').pop()||(_reelType==='photo'?'jpg':'mp4')).toLowerCase().slice(0,4);
    var path=u.id+'/'+Date.now()+'.'+ext;
    var up=await SB.storage.from('kb-reels').upload(path,_reelFile,{contentType:_reelFile.type||(_reelType==='photo'?'image/jpeg':'video/mp4')});
    if(up.error)throw up.error;
    var ins=await SB.from('kb_reels').insert({author_id:u.id,video_url:path,
      title:document.getElementById('rn-title').value.trim(),
      media_type:_reelType,
      music_preview_url:_reelMusic?_reelMusic.preview:null,
      music_title:_reelMusic?_reelMusic.title:null,
      music_artist:_reelMusic?_reelMusic.artist:null,
      music_start:_reelMusic?_reelMusic.start:0,
      photo_filter:_reelFilter,trim_start:_trimS,trim_end:_reelType==='video'?_trimE:0});
    if(ins.error)throw ins.error;
    toast('تنشر الريلز 🎉');
    _reelFile=null;document.getElementById('rn-file').value='';
    document.getElementById('rn-title').value='';
    _reelMusic=null;_reelFilter='none';_trimS=0;_trimE=0;_vidDur=0;
    mqClear();
    document.getElementById('rn-mq').value='';
    document.getElementById('rn-mres').innerHTML='';
    document.getElementById('rn-edit').style.display='none';
    document.getElementById('rn-prev').innerHTML='<span style="font-size:15px;opacity:.75">📹 اختاري فيديو أو صورة</span>';
    _reelsLoaded=false;go('video');
  }catch(e){toast('تعذر النشر: '+e.message);}
  btn.disabled=false;btn.textContent='نشر الريلز 🚀';
}
function reelCard(x,name){
  var d=document.createElement('div');
  d.className='reelv';d.dataset.id=x.id;
  d.dataset.yt=x.music_youtube_id||'';
  d.dataset.mp=x.music_preview_url||'';
  d.dataset.ms=x.music_start||0;
  d.dataset.ts=x.trim_start||0;
  d.dataset.te=x.trim_end||0;
  var fc=FILTERCSS[x.photo_filter]||'none';
  var media=x.media_type==='photo'
    ?'<img class="wfull" src="'+reelUrl(x.video_url)+'" loading="lazy" alt="" style="filter:'+fc+'">'
    :'<video src="'+reelUrl(x.video_url)+'" playsinline loop preload="metadata" style="filter:'+fc+'"></video>';
  var liked=_likedReels[x.id];
  var mt=x.music_title?('🎵 '+x.music_title):(x.music_youtube_id?'🎵 موسيقى':'');
  if(mt.length>24)mt=mt.slice(0,24)+'…';
  d.innerHTML=media+
    '<div class="reel-play">▶</div>'+
    (mt?'<div class="reel-music">'+escapeHtml(mt)+'</div>':'')+
    '<div class="reel-side">'+
    '<button onclick="likeReel(\''+x.id+'\',this)">'+(liked?'❤️':'🤍')+'<span>'+(x.likes_count||0)+'</span></button>'+
    '<button onclick="openReelComments(\''+x.id+'\')">💬<span>'+(x.comments_count||0)+'</span></button>'+
    '<button onclick="reportReel(\''+x.id+'\')" style="font-size:16px">🚩</button>'+
    '</div>'+
    '<div class="reel-info"><b>'+escapeHtml(x.title||'')+'</b><small>@'+escapeHtml(name)+'</small></div>';
  d.addEventListener('click',function(e){
    if(e.target.closest('.reel-side'))return;
    toggleReel(d);
  });
  return d;
}
function toggleReel(d){
  var v=d.querySelector('video');
  var btn=d.querySelector('.reel-play');
  if(v){
    if(v.paused){
      pauseAllReels(d);
      var ts=parseFloat(d.dataset.ts)||0,te=parseFloat(d.dataset.te)||0;
      if(ts>0){try{v.currentTime=ts;}catch(e){}}
      v.ontimeupdate=function(){if(te>ts&&te>0&&v.currentTime>=te){v.currentTime=ts;}};
      v.play().catch(function(){});
      btn.style.display='none';
      if(d.dataset.mp)reelAudioPlay(d.dataset.mp,parseFloat(d.dataset.ms)||0);
      else ytPlay(d.dataset.yt);
    }
    else{v.pause();btn.style.display='flex';reelAudioStop();ytStop();}
  }else{
    if(d.dataset.playing==='1'){d.dataset.playing='';reelAudioStop();ytStop();}
    else{pauseAllReels(d);d.dataset.playing='1';
      if(d.dataset.mp){reelAudioPlay(d.dataset.mp,parseFloat(d.dataset.ms)||0);toast('🎵 تشغل الموسيقى');}
      else if(d.dataset.yt){ytPlay(d.dataset.yt);toast('🎵 تشغل الموسيقى');}}
  }
}
var _reelAudio=null;
function reelAudioPlay(url,start){
  reelAudioStop();
  if(!url)return;
  _reelAudio=new Audio(url);
  try{_reelAudio.currentTime=start||0;}catch(e){}
  _reelAudio.play().catch(function(){});
  var s0=start||0;
  _reelAudio.ontimeupdate=function(){
    if(_reelAudio&&_reelAudio.currentTime>s0+15){_reelAudio.currentTime=s0;}
  };
}
function reelAudioStop(){if(_reelAudio){try{_reelAudio.pause();}catch(e){}_reelAudio=null;}}
function pauseAllReels(except){
  document.querySelectorAll('#reels-feed .reelv').forEach(function(d){
    if(d===except)return;
    var v=d.querySelector('video');
    if(v&&!v.paused){v.pause();var b=d.querySelector('.reel-play');if(b)b.style.display='flex';}
    d.dataset.playing='';
  });
  reelAudioStop();
  ytStop();
}
function ytPlay(ytid){
  ytStop();
  if(!ytid)return;
  var f=document.createElement('iframe');
  f.id='yt-audio';
  f.style.cssText='position:fixed;width:2px;height:2px;bottom:0;left:0;opacity:.01;pointer-events:none;border:0';
  f.setAttribute('allow','autoplay; encrypted-media');
  f.src='https://www.youtube-nocookie.com/embed/'+ytid+'?autoplay=1&loop=1&playlist='+ytid;
  document.body.appendChild(f);
}
function ytStop(){var f=document.getElementById('yt-audio');if(f)f.remove();}
async function likeReel(id,btn){
  var liked=_likedReels[id];
  var span=btn.querySelector('span');
  var n=parseInt(span.textContent||'0',10)||0;
  if(liked){delete _likedReels[id];btn.childNodes[0].textContent='🤍';span.textContent=Math.max(0,n-1);}
  else{_likedReels[id]=1;btn.childNodes[0].textContent='❤️';span.textContent=n+1;}
  try{localStorage.setItem('kb_liked_reels',JSON.stringify(_likedReels));}catch(e){}
  if(SB){try{await SB.rpc('kb_like_reel',{p_id:id,p_delta:liked?-1:1});}catch(e){}}
}
function observeReels(){
  if(_reelObs){try{_reelObs.disconnect();}catch(e){}}
  if(!('IntersectionObserver' in window))return;
  _reelObs=new IntersectionObserver(function(es){
    es.forEach(function(en){
      if(!en.isIntersecting){
        var d=en.target,v=d.querySelector('video');
        if(v&&!v.paused){v.pause();var b=d.querySelector('.reel-play');if(b)b.style.display='flex';}
        if(d.dataset.playing==='1'){d.dataset.playing='';ytStop();}
      }
    });
  },{threshold:0.25});
  document.querySelectorAll('#reels-feed .reelv').forEach(function(d){_reelObs.observe(d);});
}
async function loadReels(force){
  if(!SB||(_reelsLoaded&&!force))return;
  var feed=document.getElementById('reels-feed');
  try{
    var r=await SB.from('kb_reels').select('id,author_id,video_url,title,media_type,music_youtube_id,music_preview_url,music_title,music_start,likes_count,comments_count,photo_filter,trim_start,trim_end').order('created_at',{ascending:false}).limit(30);
    if(r.error)throw r.error;
    var rows=r.data||[];
    if(!rows.length){
      feed.innerHTML='<div style="text-align:center;padding:44px 20px;color:var(--muted)">'+
        '<div style="font-size:52px">🎬</div><br>ما كاش ريلز بعد<br>كوني أول وحدة تنشر! 💖<br><br>'+
        '<button class="btn" onclick="go(\'reel-new\')">نشر أول ريلز 🚀</button></div>';
    }else{
      var ids=[];rows.forEach(function(x){if(ids.indexOf(x.author_id)<0)ids.push(x.author_id);});
      var names={};
      try{var pr=await SB.from('kb_profiles').select('id,full_name').in('id',ids);
        if(!pr.error&&pr.data)pr.data.forEach(function(x){names[x.id]=x.full_name;});}catch(e){}
      feed.innerHTML='';
      rows.forEach(function(x){feed.appendChild(reelCard(x,names[x.author_id]||'بنت الكوكب'));});
    }
    _reelsLoaded=true;
    observeReels();
  }catch(e){
    if(!_reelsLoaded)feed.innerHTML='<p style="text-align:center;color:var(--muted);padding:30px">تعذر التحميل — تحققي من الاتصال</p>';
  }
}
/* ===== يومياتي 📖 (ستوري كيما انستغرام) ===== */
var _stFile=null,_stType='photo',_stFilter='none',_stMusic=null;
var _stTimer=null,_stAudioEl=null,_stPlaying=null;
var _storiesByAuthor={},_storiesLoaded=false;
var _stvList=[],_stvIdx=0,_stvTimer=null,_stvDur=5000;
function storyUrl(path){
  if(!path)return '';
  if(path.indexOf('http')===0)return path;
  try{return SB.storage.from('kb-stories').getPublicUrl(path).data.publicUrl;}catch(e){return '';}
}
function stPreview(inp){
  var f=inp.files&&inp.files[0];if(!f)return;
  if(f.size>80*1024*1024){toast('الملف كبير بزاف (أقصى 80MB) 📦');return;}
  _stFile=f;
  _stType=f.type.indexOf('video')===0?'video':'photo';
  _stFilter='none';
  var box=document.getElementById('st-prev');
  var url=URL.createObjectURL(f);
  box.innerHTML=_stType==='photo'
    ?'<img class="wfull" src="'+url+'">'
    :'<video src="'+url+'" playsinline muted loop style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">';
  if(_stType==='video'){var v=box.querySelector('video');if(v)v.play().catch(function(){});}
  document.getElementById('st-filters').style.display='block';
  buildStFilters();
}
function buildStFilters(){
  var row=document.getElementById('st-frow');
  row.innerHTML='';
  Object.keys(FILTERLBL).forEach(function(k){
    var b=document.createElement('button');
    b.textContent=FILTERLBL[k];
    if(k==='none')b.className='on';
    b.onclick=function(){stSetFilter(k,b);};
    row.appendChild(b);
  });
}
function stSetFilter(f,btn){
  _stFilter=f;
  var m=document.querySelector('#st-prev img,#st-prev video');
  if(m)m.style.filter=FILTERCSS[f]||'none';
  var btns=document.querySelectorAll('#st-frow button');
  for(var i=0;i<btns.length;i++)btns[i].classList.remove('on');
  if(btn)btn.classList.add('on');
}
function stSearchMusic(q){
  var box=document.getElementById('st-mres');
  if(!q||q.trim().length<2){box.innerHTML='';return;}
  clearTimeout(_stTimer);
  _stTimer=setTimeout(function(){stDoSearch(q.trim(),box);},450);
}
async function stDoSearch(q,box){
  box.innerHTML='<p style="text-align:center;color:var(--muted);font-size:13px;padding:10px">نبحث... 🔍</p>';
  var res=await mqFetch(q);
  if(!res.length){box.innerHTML='<p style="text-align:center;color:var(--muted);font-size:13px;padding:10px">ما لقينا والو 😕</p>';return;}
  box.innerHTML='';
  res.forEach(function(t){
    var d=document.createElement('div');
    d.className='mq-item';
    var im=document.createElement('img');im.src=t.art;im.alt='';
    var go=document.createElement('div');go.className='mq-go';
    var b=document.createElement('b');b.textContent=t.title;
    var sm=document.createElement('small');sm.textContent=t.artist;
    go.appendChild(b);go.appendChild(sm);
    var bp=document.createElement('button');bp.className='mq-play';bp.textContent='▶';
    var ba=document.createElement('button');ba.textContent='＋';
    bp.onclick=function(){stPreviewSong(t,bp);};
    ba.onclick=function(){stSelect(t);};
    d.appendChild(im);d.appendChild(go);d.appendChild(bp);d.appendChild(ba);
    box.appendChild(d);
  });
}
function stPreviewSong(t,btn){
  if(!_stAudioEl){_stAudioEl=new Audio();_stAudioEl.preload='none';}
  var btns=document.querySelectorAll('#st-mres .mq-play');
  for(var i=0;i<btns.length;i++)btns[i].textContent='▶';
  if(_stPlaying===t.preview&&!_stAudioEl.paused){_stAudioEl.pause();_stPlaying=null;return;}
  _stAudioEl.src=t.preview;_stAudioEl.play().catch(function(){});
  _stPlaying=t.preview;btn.textContent='⏸';
}
function stSelect(t){
  _stMusic={preview:t.preview,title:t.title,artist:t.artist,start:0};
  if(_stAudioEl){try{_stAudioEl.pause();}catch(e){}_stPlaying=null;}
  document.getElementById('st-chip-art').src=t.art;
  document.getElementById('st-chip-t').textContent=t.title;
  document.getElementById('st-chip-a').textContent=t.artist;
  document.getElementById('st-song-chip').style.display='flex';
  document.getElementById('st-mres').innerHTML='';
  document.getElementById('st-mq').value='';
  document.getElementById('st-mseg').style.display='block';
  document.getElementById('st-ms').value=0;
  document.getElementById('st-ms-lab').textContent='0s';
}
function stClear(){
  _stMusic=null;
  document.getElementById('st-song-chip').style.display='none';
  document.getElementById('st-mseg').style.display='none';
}
function stSeg(v){
  if(!_stMusic)return;
  _stMusic.start=parseInt(v,10)||0;
  document.getElementById('st-ms-lab').textContent=_stMusic.start+'s';
}
async function publishStory(){
  if(!_stFile){toast('اختاري صورة أو فيديو أولا 📷');return;}
  if(!SB)return;
  var btn=document.getElementById('st-pub');btn.disabled=true;btn.textContent='ننشرو... ⏳';
  try{
    var u=await sbUser();if(!u)throw new Error('سجلي الدخول أولا');
    var ext=((_stFile.name||'').split('.').pop()||(_stType==='photo'?'jpg':'mp4')).toLowerCase().slice(0,4);
    var path=u.id+'/'+Date.now()+'.'+ext;
    var up=await SB.storage.from('kb-stories').upload(path,_stFile,{contentType:_stFile.type});
    if(up.error)throw up.error;
    var ins=await SB.from('kb_stories').insert({author_id:u.id,media_url:path,
      media_type:_stType,caption:document.getElementById('st-cap-in').value.trim(),
      music_preview_url:_stMusic?_stMusic.preview:null,
      music_title:_stMusic?_stMusic.title:null,
      music_artist:_stMusic?_stMusic.artist:null,
      music_start:_stMusic?_stMusic.start:0,
      photo_filter:_stFilter});
    if(ins.error)throw ins.error;
    toast('تنشرات في يومياتك 🎉');
    _stFile=null;_stMusic=null;_stFilter='none';
    document.getElementById('st-file').value='';
    document.getElementById('st-cap-in').value='';
    document.getElementById('st-mq').value='';
    document.getElementById('st-mres').innerHTML='';
    stClear();
    document.getElementById('st-filters').style.display='none';
    document.getElementById('st-prev').innerHTML='<span style="font-size:15px;opacity:.75">📷 اختاري صورة أو فيديو</span>';
    _storiesLoaded=false;go('home');
  }catch(e){toast('تعذر النشر: '+e.message);}
  btn.disabled=false;btn.textContent='نشر في يومياتي 🚀';
}
async function loadStories(force){
  if(!SB||(_storiesLoaded&&!force))return;
  var row=document.getElementById('story-row');
  if(!row)return;
  try{
    var r=await SB.from('kb_stories')
      .select('id,author_id,media_url,media_type,caption,music_preview_url,music_title,music_start,photo_filter,created_at')
      .gt('expires_at',new Date().toISOString())
      .order('created_at',{ascending:false}).limit(60);
    if(r.error)throw r.error;
    var rows=r.data||[];
    _storiesByAuthor={};
    var ids=[];
    rows.forEach(function(s){
      if(!_storiesByAuthor[s.author_id])_storiesByAuthor[s.author_id]=[];
      _storiesByAuthor[s.author_id].push(s);
      if(ids.indexOf(s.author_id)<0)ids.push(s.author_id);
    });
    var names={};
    if(ids.length){
      try{var pr=await SB.from('kb_profiles').select('id,full_name').in('id',ids);
        if(!pr.error&&pr.data)pr.data.forEach(function(x){names[x.id]=x.full_name;});}catch(e){}
    }
    Object.keys(_storiesByAuthor).forEach(function(aid){
      _storiesByAuthor[aid].forEach(function(s){s._aname=names[aid]||'بنت الكوكب';});
    });
    var u=await sbUser();
    var myId=u?u.id:null;
    row.innerHTML='';
    var mine=myId?_storiesByAuthor[myId]||[]:[];
    var add=document.createElement('div');
    add.className='story';
    var mthumb=mine.length
      ?(mine[0].media_type==='video'
        ?'<video src="'+storyUrl(mine[0].media_url)+'" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;border-radius:13px"></video>'
        :'<img src="'+storyUrl(mine[0].media_url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:13px">')
      :'<span style="font-size:36px">＋</span>';
    add.innerHTML='<div class="im" style="position:relative;overflow:hidden;'+(mine.length?'':'background:#fbe9f1;border-style:dashed')+'">'+mthumb+
      '<span style="position:absolute;bottom:4px;left:4px;background:var(--pink);color:#fff;width:24px;height:24px;border-radius:50%;font-size:15px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;z-index:2">＋</span></div><div class="nm">يومياتي 📷</div>';
    add.onclick=function(e){
      if(e.target.tagName==='SPAN'){go('story-new');return;}
      if(mine.length)openStoryViewer(myId);else go('story-new');
    };
    row.appendChild(add);
    Object.keys(_storiesByAuthor).forEach(function(aid){
      if(aid===String(myId))return;
      var s=_storiesByAuthor[aid][0];
      var d=document.createElement('div');
      d.className='story';
      var th=s.media_type==='video'
        ?'<video src="'+storyUrl(s.media_url)+'" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;border-radius:13px"></video>'
        :'<img src="'+storyUrl(s.media_url)+'" style="width:100%;height:100%;object-fit:cover;border-radius:13px">';
      d.innerHTML='<div class="im" style="overflow:hidden;padding:0">'+th+'</div><div class="nm">'+escapeHtml((s._aname||'بنت').split(' ')[0])+'</div>';
      (function(id){d.onclick=function(){openStoryViewer(id);};})(aid);
      row.appendChild(d);
    });
    _storiesLoaded=true;
  }catch(e){}
}
/* عارض الستوري */
function openStoryViewer(authorId){
  _stvList=_storiesByAuthor[authorId]||[];
  if(!_stvList.length)return;
  _stvIdx=0;
  go('story');
  renderStory();
}
function renderStory(){
  var s=_stvList[_stvIdx];
  if(!s){closeStory();return;}
  var prog=document.getElementById('sprog');
  prog.innerHTML='';
  _stvList.forEach(function(_,i){
    var seg=document.createElement('div');seg.className='seg';
    seg.innerHTML='<i style="'+(i<_stvIdx?'width:100%':'width:0')+'"></i>';
    prog.appendChild(seg);
  });
  stopStoryMedia();
  var box=document.getElementById('st-media');
  var fc=FILTERCSS[s.photo_filter]||'none';
  document.getElementById('st-name').textContent=s._aname||'بنت الكوكب';
  document.getElementById('st-time').textContent=timeAgo(s.created_at);
  document.getElementById('st-cap').textContent=s.caption||'';
  var mus=document.getElementById('st-music');
  if(s.music_title){mus.style.display='block';mus.textContent='🎵 '+s.music_title;}
  else mus.style.display='none';
  if(s.media_type==='video'){
    box.innerHTML='<video src="'+storyUrl(s.media_url)+'" playsinline style="width:100%;height:100%;object-fit:cover;filter:'+fc+'"></video>';
    var v=box.querySelector('video');
    _stvDur=8000;
    v.onloadedmetadata=function(){
      if(v.duration&&isFinite(v.duration))_stvDur=Math.min(15000,v.duration*1000);
      startStoryTimer();
    };
    v.play().catch(function(){startStoryTimer();});
  }else{
    box.innerHTML='<img src="'+storyUrl(s.media_url)+'" style="width:100%;height:100%;object-fit:cover;filter:'+fc+'">';
    _stvDur=5000;
    startStoryTimer();
  }
  if(s.music_preview_url)reelAudioPlay(s.music_preview_url,s.music_start||0);
}
function startStoryTimer(){
  stopStoryTimer();
  var bars=document.querySelectorAll('#sprog .seg i');
  var bar=bars[_stvIdx];
  if(bar){
    bar.style.transition='none';bar.style.width='0';void bar.offsetWidth;
    bar.style.transition='width '+_stvDur+'ms linear';bar.style.width='100%';
  }
  _stvTimer=setTimeout(function(){storyNav(1);},_stvDur);
}
function stopStoryTimer(){if(_stvTimer){clearTimeout(_stvTimer);_stvTimer=null;}}
function storyNav(d){
  var n=_stvIdx+d;
  if(n<0||n>=_stvList.length){closeStory();return;}
  _stvIdx=n;renderStory();
}
function stopStoryMedia(){
  stopStoryTimer();reelAudioStop();
  var box=document.getElementById('st-media');
  if(box){var v=box.querySelector('video');if(v){try{v.pause();}catch(e){}}box.innerHTML='';}
}
function closeStory(){stopStoryMedia();go('home');}
function timeAgo(ts){
  if(!ts)return '';
  var s=Math.floor((Date.now()-new Date(ts).getTime())/1000);
  if(s<60)return 'دروك';
  var m=Math.floor(s/60);
  if(m<60)return 'منذ '+m+' د';
  var h=Math.floor(m/60);
  if(h<24)return 'منذ '+h+' س';
  var d=Math.floor(h/24);
  return 'منذ '+d+' يوم';
}
/* ===== المنشورات الحقيقية 📝 ===== */
var _npFile=null,_npType='none';
var _feedLoaded=false;
var _likedPosts={};
try{_likedPosts=JSON.parse(localStorage.getItem('kb_liked_posts')||'{}');}catch(e){}
function postUrl(path){
  if(!path)return '';
  if(path.indexOf('http')===0)return path;
  try{return SB.storage.from('kb-posts').getPublicUrl(path).data.publicUrl;}catch(e){return '';}
}
function npPreview(inp){
  var f=inp.files&&inp.files[0];if(!f)return;
  if(f.size>80*1024*1024){toast('الملف كبير بزاف 📦');return;}
  _npFile=f;
  _npType=f.type.indexOf('video')===0?'video':'photo';
  var box=document.getElementById('np-prev');
  var url=URL.createObjectURL(f);
  box.style.display='block';
  box.innerHTML='<div class="pimg" style="position:relative">'+(_npType==='video'
    ?'<video src="'+url+'" style="width:100%;max-height:300px;object-fit:cover;display:block;border-radius:14px" playsinline muted loop></video>'
    :'<img src="'+url+'" style="width:100%;max-height:300px;object-fit:cover;border-radius:14px" alt="">')+
    '<button onclick="npClear()" style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,.55);color:#fff;border:none;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer">✖</button></div>';
  var v=box.querySelector('video');if(v)v.play().catch(function(){});
}
function npClear(){_npFile=null;_npType='none';document.getElementById('np-file').value='';var b=document.getElementById('np-prev');b.style.display='none';b.innerHTML='';}
async function publishPost(){
  var txt=document.getElementById('np-txt').value.trim();
  if(!txt&&!_npFile){toast('اكتبي شي حاجة ولا زيدي صورة ✍️');return;}
  if(!SB)return;
  var btn=document.getElementById('np-pub');btn.disabled=true;btn.textContent='ننشرو... ⏳';
  try{
    var u=await sbUser();if(!u)throw new Error('سجلي الدخول أولا');
    var murl=null,mtype='none';
    if(_npFile){
      var ext=((_npFile.name||'').split('.').pop()||(_npType==='photo'?'jpg':'mp4')).toLowerCase().slice(0,4);
      var path=u.id+'/'+Date.now()+'.'+ext;
      var up=await SB.storage.from('kb-posts').upload(path,_npFile,{contentType:_npFile.type});
      if(up.error)throw up.error;
      murl=path;mtype=_npType;
    }
    var ins=await SB.from('kb_posts').insert({author_id:u.id,content:txt,media_url:murl,media_type:mtype});
    if(ins.error)throw ins.error;
    toast('تنشر المنشور 🎉');
    document.getElementById('np-txt').value='';
    npClear();
    _feedLoaded=false;go('sahha');
  }catch(e){toast('تعذر النشر: '+e.message);}
  btn.disabled=false;btn.textContent='نشر 📩';
}
async function loadFeed(force){
  if(!SB||(_feedLoaded&&!force))return;
  var list=document.getElementById('feed-list');
  if(!list)return;
  try{
    var r=await SB.from('kb_posts').select('id,author_id,content,media_url,media_type,likes_count,comments_count,created_at').order('created_at',{ascending:false}).limit(30);
    if(r.error)throw r.error;
    var rows=r.data||[];
    if(!rows.length){
      list.innerHTML='<div style="text-align:center;padding:36px 20px;color:var(--muted)">📝<br><br>ما كاش منشورات بعد<br>كوني أول وحدة تنشر! 💖</div>';
    }else{
      var ids=[];rows.forEach(function(p){if(ids.indexOf(p.author_id)<0)ids.push(p.author_id);});
      var names={};
      try{var pr=await SB.from('kb_profiles').select('id,full_name').in('id',ids);
        if(!pr.error&&pr.data)pr.data.forEach(function(x){names[x.id]=x.full_name;});}catch(e){}
      list.innerHTML='';
      rows.forEach(function(p){list.appendChild(postCard(p,names[p.author_id]||'بنت الكوكب'));});
    }
    _feedLoaded=true;
  }catch(e){
    if(!_feedLoaded)list.innerHTML='<p style="text-align:center;color:var(--muted);padding:20px">تعذر التحميل</p>';
  }
}
function postCard(p,name){
  var d=document.createElement('div');
  d.className='post';d.dataset.pid=p.id;
  var liked=_likedPosts[p.id];
  var media='';
  if(p.media_url&&p.media_type!=='none'){
    var mu=postUrl(p.media_url);
    media='<div class="pimg">'+(p.media_type==='video'
      ?'<video src="'+mu+'" controls playsinline preload="metadata"></video>'
      :'<img src="'+mu+'" loading="lazy" alt="">')+'</div>';
  }
  d.innerHTML='<div class="head"><div class="avatar">🌷</div><div><h4>'+escapeHtml(name)+
    '</h4><small>'+timeAgo(p.created_at)+'</small></div></div>'+
    (p.content?'<div class="txt">'+escapeHtml(p.content)+'</div>':'')+media+
    '<div class="actions"><button onclick="likePost(\''+p.id+'\',this)">'+(liked?'❤️':'🤍')+' <span>'+(p.likes_count||0)+'</span></button>'+
    '<button onclick="openPostComments(\''+p.id+'\')">💬 <span data-cc>'+(p.comments_count||0)+'</span></button>'+
    '<button onclick="sharePost(this)">↗️</button></div>';
  return d;
}
async function likePost(id,btn){
  var liked=_likedPosts[id];
  var span=btn.querySelector('span');
  var n=parseInt(span.textContent||'0',10)||0;
  if(liked){delete _likedPosts[id];btn.childNodes[0].textContent='🤍 ';span.textContent=Math.max(0,n-1);}
  else{_likedPosts[id]=1;btn.childNodes[0].textContent='❤️ ';span.textContent=n+1;}
  try{localStorage.setItem('kb_liked_posts',JSON.stringify(_likedPosts));}catch(e){}
  if(SB){try{await SB.rpc('kb_like_post',{p_id:id,p_delta:liked?-1:1});}catch(e){}}
}
async function sharePost(btn){
  var card=btn.closest('.post');
  var txt=card?card.querySelector('.txt'):null;
  var text=(txt?txt.textContent.slice(0,120):'شوفي هاذ المنشور في كوكب برق برق 🪐');
  if(navigator.share){
    try{await navigator.share({title:'كوكب برق برق 🪐',text:text,url:location.href});}catch(e){}
  }else{
    try{await navigator.clipboard.writeText(text+' '+location.href);toast('تنسخ الرابط 📋');}
    catch(e){toast('المشاركة غير مدعومة');}
  }
}
/* ===== تعليقات موحدة (ريلز + منشورات) 💬 ===== */
var _cmMode='reel',_cmId=null;
function openComments(mode,id){
  _cmMode=mode;_cmId=id;
  document.getElementById('rc-list').innerHTML='<p style="text-align:center;color:var(--muted);padding:20px">نحمل التعليقات... ⏳</p>';
  document.getElementById('rc-input').value='';
  go('reel-comments');
  loadComments();
}
function openReelComments(id){openComments('reel',id);}
function openPostComments(id){openComments('post',id);}
async function loadComments(){
  var list=document.getElementById('rc-list');
  if(!SB||!_cmId)return;
  try{
    var r=_cmMode==='post'
      ?await SB.from('kb_comments').select('id,content,created_at,author_id').eq('post_id',_cmId).order('created_at',{ascending:true}).limit(100)
      :await SB.from('kb_reel_comments').select('id,content,created_at,author_id').eq('reel_id',_cmId).order('created_at',{ascending:true}).limit(100);
    if(r.error)throw r.error;
    var rows=r.data||[];
    if(!rows.length){list.innerHTML='<p style="text-align:center;color:var(--muted);padding:30px">ما كاش تعليقات بعد<br>كوني أول وحدة تعلق 💖</p>';return;}
    var ids=[];rows.forEach(function(x){if(ids.indexOf(x.author_id)<0)ids.push(x.author_id);});
    var names={};
    try{var pr=await SB.from('kb_profiles').select('id,full_name').in('id',ids);
      if(!pr.error&&pr.data)pr.data.forEach(function(x){names[x.id]=x.full_name;});}catch(e){}
    list.innerHTML='';
    rows.forEach(function(x){
      var d=document.createElement('div');
      d.style.cssText='background:var(--card);border-radius:14px;padding:10px 14px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,.05)';
      d.innerHTML='<b style="font-size:13px;color:var(--pink-d)">'+escapeHtml(names[x.author_id]||'بنت الكوكب')+'</b><p style="font-size:14px;margin-top:2px">'+escapeHtml(x.content)+'</p>';
      list.appendChild(d);
    });
  }catch(e){list.innerHTML='<p style="text-align:center;color:var(--muted);padding:30px">تعذر التحميل</p>';}
}
async function sendComment(){
  var inp=document.getElementById('rc-input');
  var txt=inp.value.trim();
  if(!txt){toast('اكتبي شي حاجة أولا ✍️');return;}
  if(!SB||!_cmId)return;
  inp.value='';
  try{
    var r=_cmMode==='post'
      ?await SB.rpc('kb_add_post_comment',{p_post:_cmId,p_content:txt})
      :await SB.rpc('kb_add_reel_comment',{p_reel:_cmId,p_content:txt});
    if(r.error)throw r.error;
    loadComments();
    bumpCommentCount();
    toast('تنشر تعليقك 💖');
  }catch(e){toast('تعذر النشر: '+e.message);}
}
function bumpCommentCount(){
  if(_cmMode==='post'){
    var b=document.querySelector('#feed-list [data-pid="'+_cmId+'"] [data-cc]');
    if(b)b.textContent=(parseInt(b.textContent||'0',10)||0)+1;
  }else{
    var card=document.querySelector('#reels-feed .reelv[data-id="'+_cmId+'"] .reel-side');
    if(card&&card.children[1]){var sp=card.children[1].querySelector('span');if(sp)sp.textContent=(parseInt(sp.textContent||'0',10)||0)+1;}
  }
}
async function reportReel(id){
  var reason=prompt('علاش تبلغي على هاذ الريلز؟ 🚩');
  if(!reason||!reason.trim())return;
  if(!SB)return;
  try{
    var u=await sbUser();if(!u){toast('سجلي الدخول أولا');return;}
    var r=await SB.from('kb_reports').insert({reporter_id:u.id,target_id:id,target_type:'reel',reason:reason.trim().slice(0,500)});
    if(r.error)throw r.error;
    toast('وصل البلاغ، شكرا 🚩');
  }catch(e){toast('تعذر الإبلاغ: '+e.message);}
}
/* ===== السوق: تحميل المنتجات الحقيقية ===== */
var _productsLoaded=false;
async function loadProducts(force){
  if(!SB||(_productsLoaded&&!force))return;
  try{
    var r=await SB.from('kb_products').select('id,name,price,wilaya,condition,photos,seller_id').eq('status','active').order('created_at',{ascending:false}).limit(30);
    if(r.error||!r.data||!r.data.length)return;
    var ids=[];r.data.forEach(function(p){if(ids.indexOf(p.seller_id)<0)ids.push(p.seller_id);});
    var names={};
    try{
      var pr=await SB.from('kb_profiles').select('id,full_name').in('id',ids);
      if(!pr.error&&pr.data)pr.data.forEach(function(x){names[x.id]=x.full_name;});
    }catch(e){}
    var g=document.getElementById('souq-grid');g.innerHTML='';
    r.data.forEach(function(p){
      var img=(p.photos&&p.photos.length)?'<img src="'+p.photos[0]+'" style="width:100%;height:100%;object-fit:cover">':'🛍️';
      var d=document.createElement('div');d.className='prod';
      d.innerHTML='<div class="img" style="background:linear-gradient(135deg,#ffe0ec,#e9d5ff);overflow:hidden">'+img+'<span class="badge">'+escapeHtml(p.condition||'جديد')+'</span></div><div class="info"><h4>'+escapeHtml(p.name)+'</h4><div class="price">'+(p.price?escapeHtml(p.price)+' دج':'السعر عند التواصل')+'</div><div class="seller">'+escapeHtml(names[p.seller_id]||'بنت الكوكب')+(p.wilaya?' • '+escapeHtml(p.wilaya):'')+'</div></div>';
      g.appendChild(d);
    });
    _productsLoaded=true;
  }catch(e){}
}
/* ===== تهيئة: جلسة محفوظة + PWA ===== */
document.addEventListener('DOMContentLoaded',function(){
  if('serviceWorker' in navigator){try{navigator.serviceWorker.register('sw.js').catch(function(){});}catch(e){}}
  if(_skipSplash){
    var sp=document.getElementById('splash');
    if(sp)sp.classList.remove('active');
  }
  setTimeout(async function(){
    if(!SB){go(_skipSplash?'login':'splash');return;}
    try{
      var s=await SB.auth.getSession();
      if(s.data&&s.data.session){await gateAndEnter();}
      else{go(_skipSplash?'login':'splash');}
    }catch(e){go(_skipSplash?'login':'splash');}
  },_skipSplash?100:500);
});
