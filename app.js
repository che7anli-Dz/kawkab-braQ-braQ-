
/* ===== Supabase — الربط الحقيقي (مع fallback للوضع التجريبي) ===== */
var SB=null;
var SB_URL='https://chosrqzpuczmirrxmnkf.supabase.co';
var SB_KEY='sb_publishable__e-8by0NKHyY-mnRowNtqg_zRr8Fq_q';
try{
  if(typeof supabase!=='undefined'){
    SB=supabase.createClient(SB_URL,SB_KEY);
  }
}catch(e){SB=null;}
/* استخراج المقطع المختار مضغوطا (كيما تيكتوك) — يصغر الفيديو قبل الرفع */
function extractClip(file,start,end,onTick){
  return new Promise(function(resolve,reject){
    try{
      var v=document.createElement('video');
      v.preload='auto';v.playsInline=true;v.muted=false;
      v.src=URL.createObjectURL(file);
      var dur=Math.max(1,end-start);
      var to=setTimeout(function(){cleanup();reject(new Error('timeout'));},(dur+20)*1000);
      function cleanup(){clearTimeout(to);try{URL.revokeObjectURL(v.src);}catch(e){}}
      v.onloadedmetadata=function(){
        var scale=Math.min(1,720/(v.videoWidth||1280));
        var cw=Math.max(2,Math.round(v.videoWidth*scale/2)*2);
        var ch=Math.max(2,Math.round(v.videoHeight*scale/2)*2);
        var canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;
        var ctx=canvas.getContext('2d');
        var cStream=null;
        try{cStream=canvas.captureStream(30);}catch(e){cleanup();reject(e);return;}
        try{
          var vs=v.captureStream?v.captureStream():(v.mozCaptureStream?v.mozCaptureStream():null);
          if(vs)vs.getAudioTracks().forEach(function(t){try{cStream.addTrack(t);}catch(x){}});
        }catch(e){}
        var mime='video/webm;codecs=vp9,opus';
        if(typeof MediaRecorder==='undefined'||!MediaRecorder.isTypeSupported(mime))mime='video/webm';
        var rec;
        try{rec=new MediaRecorder(cStream,mime?{mimeType:mime,videoBitsPerSecond:2200000}:{videoBitsPerSecond:2200000});}
        catch(e){cleanup();reject(e);return;}
        var chunks=[];
        rec.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data);};
        rec.onstop=function(){cleanup();resolve(new Blob(chunks,{type:'video/webm'}));};
        v.currentTime=Math.max(0,start-0.2);
        v.onseeked=function(){
          v.onseeked=null;
          var playP=v.play();
          if(playP&&playP.catch)playP.catch(function(){v.muted=true;v.play().catch(function(){});});
          var raf=0,t0=Date.now();
          function draw(){
            try{ctx.drawImage(v,0,0,cw,ch);}catch(e){}
            if(onTick)onTick((Date.now()-t0)/1000);
            raf=requestAnimationFrame(draw);
          }
          draw();
          try{rec.start(500);}catch(e){cleanup();reject(e);return;}
          setTimeout(function(){
            cancelAnimationFrame(raf);
            try{if(rec.state!=='inactive')rec.stop();}catch(e){cleanup();reject(e);}
            try{v.pause();}catch(e){}
          },dur*1000+500);
        };
      };
      v.onerror=function(){cleanup();reject(new Error('video'));};
    }catch(e){reject(e);}
  });
}
/* رفع بتقدم حقيقي (كيما تيكتوك) عبر XMLHttpRequest */
function uploadWithProgress(bucket,path,file,contentType,onProgress){
  return new Promise(function(resolve,reject){
    var done=false;
    function fail(msg){if(!done){done=true;reject(new Error(msg));}}
    try{
      var xhr=new XMLHttpRequest();
      xhr.open('POST',SB_URL+'/storage/v1/object/'+bucket+'/'+path);
      xhr.setRequestHeader('apikey',SB_KEY);
      xhr.setRequestHeader('x-upsert','false');
      var to=setTimeout(function(){try{xhr.abort();}catch(e){}fail('الرفع طول بزاف ⏱️ جربي فيديو أصغر أو اتصال أقوى 📶');},180000);
      SB.auth.getSession().then(function(s){
        var token=(s.data&&s.data.session&&s.data.session.access_token)||SB_KEY;
        xhr.setRequestHeader('Authorization','Bearer '+token);
        if(contentType)xhr.setRequestHeader('Content-Type',contentType);
        xhr.upload.onprogress=function(e){
          if(e.lengthComputable&&onProgress){try{onProgress(Math.round(e.loaded/e.total*100));}catch(x){}}
        };
        xhr.onload=function(){
          clearTimeout(to);
          if(done)return;done=true;
          if(xhr.status>=200&&xhr.status<300)resolve();
          else{
            var m='خطأ '+xhr.status;
            try{var j=JSON.parse(xhr.responseText);if(j.message)m=j.message;}catch(x){}
            reject(new Error(m));
          }
        };
        xhr.onerror=function(){clearTimeout(to);fail('انقطع الاتصال أثناء الرفع 📡');};
        xhr.send(file);
      }).catch(function(){fail('تعذر التخويل 🔑');});
    }catch(e){fail(e.message||'تعذر الرفع');}
  });
}
var _profile=null;
async function sbUser(){
  if(!SB)return null;
  try{var r=await SB.auth.getUser();return (r.data&&r.data.user)?r.data.user:null;}catch(e){return null;}
}
function escapeHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var _navStack=[];
var _goingBack=false;
function goBack(){
  var prev=_navStack.pop();
  _goingBack=true;
  try{if(prev&&document.getElementById(prev)){go(prev);}else{go('home');}}
  catch(e){go('home');}
  _goingBack=false;
}
function go(id){
  var main=['home','friends','video','souq','menu'];
  if(SB&&main.indexOf(id)>-1&&!_verified){go('splash');return;}
  var _prevEl=document.querySelector('.screen.active');
  var _prevId=_prevEl?_prevEl.id:null;
  if(!_goingBack&&_prevId&&_prevId!==id){
    if(main.indexOf(id)>-1){_navStack=[];}
    else{_navStack.push(_prevId);if(_navStack.length>25)_navStack.shift();}
  }
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  var main=['home','friends','video','souq','menu'];
  var isMain=main.indexOf(id)>-1;
  document.querySelector('.phone').classList.toggle('withutil',isMain&&id!=='video');
  document.getElementById('navbar').style.display=isMain?'flex':'none';
  document.getElementById('fab').style.display=isMain?'block':'none';
  var _noBack=['splash','login','signup','verify-email','quiz','quiz-pass','voice','pending','chat'];
  var _bb=document.getElementById('backbtn');
  if(_bb){_bb.style.display=(!isMain&&_noBack.indexOf(id)<0)?'flex':'none';}
  document.querySelectorAll('.nav-it').forEach(n=>n.classList.toggle('on',n.dataset.s===id));
  if(id==='souq'){loadProducts(false);}
  if(id==='video'){loadReels(false);}
  if(id==='home'){loadStories(false);loadHomeDeals(false);}
  if(id==='services'){loadServices(false);}
  if(id==='sahha'){loadFeed(false);}
  if(id==='friends'){loadFriendsTab();}
  if(id==='friendship'){loadFriendsTab();}
  if(id==='messenger'){loadMessenger();}
  if(id==='notifications'){loadNotifs();}
  if(id==='mybookings'){loadMyBookings();}
  if(id==='orders'){loadOrders();}
  if(id==='profile'){loadOwnProfile();_pfTab='posts';var _pt=document.querySelectorAll('#pf-tabs .tab');_pt.forEach(function(x,i){x.classList.toggle('on',i===0);});loadPfTab();updateBadges();}
  if(id!=='chat'){chatStop();}
  if(id!=='video'){try{if(typeof pauseAllReels==='function')pauseAllReels();}catch(e){}}
  if(id!=='story'){try{if(typeof stopStoryMedia==='function')stopStoryMedia();}catch(e){}}
  if(id!=='story-new'){try{if(_stAudioEl){_stAudioEl.pause();_stPlaying=null;}}catch(e){}}
  if(id!=='reel-new'){try{if(_mqAudioEl){_mqAudioEl.pause();_mqPlaying=null;}}catch(e){}}
  window.scrollTo(0,0);
  /* تركيز تلقائي: الكيبورد يخرج وحده في الدخول/التسجيل */
  if(id==='login'||id==='signup'){
    setTimeout(function(){
      var i=document.getElementById(id==='login'?'li-email':'su-name');
      if(i){try{i.focus({preventScroll:true});}catch(e){i.focus();}}
    },450);
  }
}
function openSheet(){document.getElementById('sheetbg').style.display='block'}
function closeSheet(){document.getElementById('sheetbg').style.display='none'}
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
      var ins=await SB.from('kb_products').insert({seller_id:me.id,name:name,description:desc,price:price||null,category:cat,wilaya:wilaya,condition:cond,photos:photoUrls,status:'active'}).select('id').single();
      if(ins.error||!ins.data)throw ins.error||new Error('no id');
      _productsLoaded=false; realSaved=true; _newProductId=ins.data.id;
      toast('🎉 تم نشر منتجك بنجاح!');
    }catch(e){toast('تعذر الحفظ في القاعدة — تحققي من الاتصال 📡');}
  }
  if(!realSaved){toast('ما تنشرش المنتج — عاودي حاولي 📡');return;}
  var imgHtml=firstPhoto?'<img src="'+firstPhoto+'" style="width:100%;height:100%;object-fit:cover">':'🛍️';
  var d=document.createElement('div'); d.className='prod';
  d.onclick=(function(pid){return function(){openProduct(pid);};})(_newProductId);
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
  document.getElementById('op-add').style.background='';document.getElementById('op-add').disabled=false;
  document.getElementById('op-add').onclick=function(){findAndAdd(name,document.getElementById('op-add'));};
  var oc=document.getElementById('op-chat');
  if(oc)oc.onclick=function(){toast('🔒 أضيفيها صديقة أولا باش تتهادرو 👭');};
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
  document.getElementById('adm-bookings').style.display=t==='bookings'?'block':'none';
  document.getElementById('adm-t1').style.cssText='flex:1;padding:10px'+(t==='pending'?'':'\;background:transparent;border:2px solid var(--pink);color:var(--pink-d);box-shadow:none');
  document.getElementById('adm-t2').style.cssText='flex:1;padding:10px'+(t==='members'?'':'\;background:transparent;border:2px solid var(--pink);color:var(--pink-d);box-shadow:none');
  document.getElementById('adm-t3').style.cssText='flex:1;padding:10px'+(t==='bookings'?'':'\;background:transparent;border:2px solid var(--pink);color:var(--pink-d);box-shadow:none');
  if(t==='pending')loadPending();else if(t==='bookings')loadOwnerBookings();else loadMembers();
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
    :'<video src="'+url+'" playsinline muted loop onclick="this.paused?this.play():this.pause()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">';
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
/* ===== قص تيكتوك: سحب مباشر بإصبعك 👆 ===== */
var _tlDrag=null;
function rnTrimInit(dur){
  _vidDur=dur;_trimS=0;_trimE=Math.min(15,dur);
  document.getElementById('rn-trim').style.display='block';
  tlBind();
  rnTlDraw();
  var v=document.querySelector('#rn-prev video');
  if(v){v.ontimeupdate=function(){
    if(_trimE>_trimS&&v.currentTime>=_trimE){try{v.currentTime=_trimS;}catch(e){}}
  };}
  updTrimLab();
}
function rnTlDraw(){
  if(!_vidDur)return;
  var win=document.getElementById('rn-tl-win');
  if(!win)return;
  win.style.left=(_trimS/_vidDur*100)+'%';
  win.style.width=Math.max(2,(_trimE-_trimS)/_vidDur*100)+'%';
}
function tlBind(){
  if(tlBind._done)return;tlBind._done=true;
  var cfg=[['l','rn-hdl-l'],['r','rn-hdl-r'],['win','rn-tl-win']];
  cfg.forEach(function(c){
    var el=document.getElementById(c[1]);
    if(!el)return;
    el.addEventListener('pointerdown',function(e){
      e.preventDefault();e.stopPropagation();
      _tlDrag={type:c[0],x:e.clientX,s:_trimS,e:_trimE};
    });
  });
  document.addEventListener('pointermove',function(e){rnTlMove(e);});
  document.addEventListener('pointerup',function(){_tlDrag=null;});
  document.addEventListener('pointercancel',function(){_tlDrag=null;});
}
function rnTlMove(e){
  if(!_tlDrag||!_vidDur)return;
  var track=document.getElementById('rn-tl-track');
  if(!track)return;
  var rc=track.getBoundingClientRect();
  if(rc.width<=0)return;
  var dt=(e.clientX-_tlDrag.x)/rc.width*_vidDur;
  var d=_tlDrag;
  if(d.type==='l'){_trimS=Math.max(0,Math.min(d.s+dt,_trimE-1));}
  else if(d.type==='r'){_trimE=Math.min(_vidDur,Math.max(d.e+dt,_trimS+1));}
  else{var len=d.e-d.s;var ns=Math.max(0,Math.min(d.s+dt,_vidDur-len));_trimS=ns;_trimE=ns+len;}
  _trimS=Math.round(_trimS*10)/10;_trimE=Math.round(_trimE*10)/10;
  rnTlDraw();updTrimLab();
}
function updTrimLab(){
  var lab=document.getElementById('rn-trim-lab');
  if(lab)lab.textContent='▶ '+fmtT(_trimS)+' - '+fmtT(_trimE);
  var v=document.querySelector('#rn-prev video');
  if(v){try{v.currentTime=_trimS;}catch(e){}v.play().catch(function(){});}
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
    var fileToUpload=_reelFile,finalTS=_trimS,finalTE=_reelType==='video'?_trimE:0;
    var ctype=_reelFile.type||(_reelType==='photo'?'image/jpeg':'video/mp4');
    if(_reelType==='video'&&_reelFile.size>8*1024*1024){
      btn.textContent='نجهزو الفيديو... ⏳';
      try{
        var _t0=Date.now();
        var blob=await extractClip(_reelFile,_trimS,_trimE,function(sec){
          btn.textContent='نجهزو الفيديو... '+Math.floor(sec)+'s ⏳';
        });
        fileToUpload=new File([blob],'clip.webm',{type:'video/webm'});
        ctype='video/webm';finalTS=0;finalTE=0;
      }catch(e){/* نكمل بالملف الأصلي */}
    }
    var ext=((fileToUpload.name||'').split('.').pop()||'mp4').toLowerCase().slice(0,4);
    var path=u.id+'/'+Date.now()+'.'+ext;
    btn.textContent='نرفعو... 0% ⏳';
    await uploadWithProgress('kb-reels',path,fileToUpload,ctype,function(p){
      btn.textContent='نرفعو... '+p+'% ⏳';
    });
    btn.textContent='ننشرو... 🚀';
    var ins=await SB.from('kb_reels').insert({author_id:u.id,video_url:path,
      title:document.getElementById('rn-title').value.trim(),
      media_type:_reelType,
      music_preview_url:_reelMusic?_reelMusic.preview:null,
      music_title:_reelMusic?_reelMusic.title:null,
      music_artist:_reelMusic?_reelMusic.artist:null,
      music_start:_reelMusic?_reelMusic.start:0,
      photo_filter:_reelFilter,trim_start:finalTS,trim_end:finalTE}).select('id');
    if(ins.error)throw ins.error;
    var newId=ins.data&&ins.data[0]&&ins.data[0].id;
    if(!newId)throw new Error('الحفظ ما تمش (بلا id)');
    var chk=await SB.from('kb_reels').select('id').eq('id',newId).single();
    if(chk.error)throw new Error('تنشر بصح ما يتقراش: '+chk.error.message);
    // تحقق أن الريل يظهر في قائمة العرض
    var feedChk=await SB.from('kb_reels').select('id').order('created_at',{ascending:false}).limit(30);
    var found=false;(feedChk.data||[]).forEach(function(r){if(r.id===newId)found=true;});
    if(!found)throw new Error('تحفظ بصح ما ظهرش في القائمة (خطأ عرض)');
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
    setTimeout(function(){loadReels(true);},900);
    setTimeout(function(){loadReels(true);},2500);
  }catch(e){toast('تعذر النشر: '+e.message);}
  btn.disabled=false;btn.textContent='نشر الريلز 🚀';
}
function reelCard(x,name,isMine,ava){
  var d=document.createElement('div');
  d.className='reelv';d.dataset.id=x.id;
  d.dataset.path=x.video_url||'';
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
  var isPhoto=x.media_type==='photo';
  d.innerHTML=media+
    (isPhoto?'':'<div class="reel-play">▶</div>')+
    '<div class="reel-heart">❤️</div>'+
    '<div class="reel-side">'+
    '<div class="reel-ava">'+(ava||'🌸')+'</div>'+
    '<button onclick="likeReel(\''+x.id+'\',this)">'+(liked?'❤️':'🤍')+'<span>'+(x.likes_count||0)+'</span></button>'+
    '<button onclick="openReelComments(\''+x.id+'\')">💬<span>'+(x.comments_count||0)+'</span></button>'+
    '<button onclick="shareReel(\''+x.id+'\')">↗️</button>'+
    '<button onclick="reportReel(\''+x.id+'\')">🚩</button>'+
    (isMine?'<button onclick="editReelTitle(\''+x.id+'\',this)">✏️</button>':'')+
    (isMine?'<button onclick="delReel(\''+x.id+'\',this)">🗑️</button>':'')+
    '</div>'+
    '<div class="reel-info"><b>@'+escapeHtml(name)+'</b><span>'+escapeHtml(x.title||'')+'</span>'+
    (mt?'<small class="reel-mus">🎵 '+escapeHtml(mt)+'</small>':'')+'</div>'+
    '<div class="reel-prog"><i></i></div>';
  d.addEventListener('click',function(e){
    if(e.target.closest('.reel-side'))return;
    var now=Date.now();
    if(now-(d._lt||0)<320){
      d._lt=0;
      var ht=d.querySelector('.reel-heart');
      ht.classList.remove('boom');void ht.offsetWidth;ht.classList.add('boom');
      if(!_likedReels[d.dataset.id])likeReel(d.dataset.id,d.querySelector('.reel-side button'));
      var v=d.querySelector('video');
      if(v&&v.paused)toggleReel(d);
      return;
    }
    d._lt=now;
    toggleReel(d);
  });
  return d;
}
async function delReel(id,btn){
  if(!confirm('تمحي هاذ الريلز نهائيا؟ 🗑️'))return;
  try{
    var card=btn.closest('.reelv');
    var path=card?card.dataset.path:'';
    var r=await SB.from('kb_reels').delete().eq('id',id);
    if(r.error)throw r.error;
    if(path&&path.indexOf('http')!==0){try{await SB.storage.from('kb-reels').remove([path]);}catch(e){}}
    if(card)card.remove();
    toast('تمحى الريلز 🗑️');
  }catch(e){toast('تعذر المسح: '+e.message);}
}
async function editReelTitle(id,btn){
  var card=btn.closest('.reelv');
  var cur=card&&card.querySelector('.reel-info b')?card.querySelector('.reel-info b').textContent:'';
  var t=prompt('✏️ عدلي العنوان:',cur);
  if(t===null)return;
  t=t.trim().slice(0,80);
  try{
    var r=await SB.from('kb_reels').update({title:t}).eq('id',id);
    if(r.error)throw r.error;
    if(card&&card.querySelector('.reel-info b'))card.querySelector('.reel-info b').textContent=t;
    toast('تعدل العنوان ✏️');
  }catch(e){toast('تعذر التعديل: '+e.message);}
}
function shareReel(id){
  var url=location.origin+location.pathname+'#reel-'+id;
  if(navigator.share){navigator.share({title:'ريلز 🪐',text:'شوفي هاذ الريلز 💖',url:url}).catch(function(){});}
  else if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(function(){toast('تنسخ الرابط 🔗');},function(){prompt('انسخي الرابط:',url);});}
  else{prompt('انسخي الرابط:',url);}
}
function toggleReel(d){
  var v=d.querySelector('video');
  var btn=d.querySelector('.reel-play');
  if(v){
    if(v.paused){
      pauseAllReels(d);
      var ts=parseFloat(d.dataset.ts)||0,te=parseFloat(d.dataset.te)||0;
      if(ts>0){try{v.currentTime=ts;}catch(e){}}
      v.ontimeupdate=function(){
        if(te>ts&&te>0&&v.currentTime>=te){v.currentTime=ts;}
        try{var pr=d.querySelector('.reel-prog i');
          if(pr&&v.duration)pr.style.width=(100*v.currentTime/v.duration)+'%';}catch(e){}
      };
      var pp=v.play();
      if(pp&&pp.then){pp.then(function(){btn.style.display='none';}).catch(function(){btn.style.display='flex';});}
      else{btn.style.display='none';}
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
      var d=en.target,v=d.querySelector('video');
      if(en.isIntersecting&&en.intersectionRatio>=0.55){
        if(v&&v.paused)toggleReel(d);
        else if(!v&&d.dataset.playing!=='1')toggleReel(d);
      }else if(!en.isIntersecting){
        if(v&&!v.paused){v.pause();var b=d.querySelector('.reel-play');if(b)b.style.display='flex';}
        if(d.dataset.playing==='1'){d.dataset.playing='';reelAudioStop();ytStop();}
      }
    });
  },{threshold:[0,0.55,1]});
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
      try{var pr=await SB.from('kb_profiles').select('id,full_name,avatar_emoji,avatar_url').in('id',ids);
        if(!pr.error&&pr.data)pr.data.forEach(function(x){names[x.id]={n:x.full_name,a:x.avatar_emoji,u:x.avatar_url};});}catch(e){}
      feed.innerHTML='';
      var _me=null;try{_me=await frMe();}catch(e){}
      rows.forEach(function(x){var nm=names[x.author_id]||{n:'بنت الكوكب',a:'🌸'};feed.appendChild(reelCard(x,nm.n,_me&&_me===x.author_id,avaHtml(nm)));});
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
    :'<video src="'+url+'" playsinline muted loop onclick="this.paused?this.play():this.pause()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">';
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
