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
    :'<img loading="lazy" src="'+url+'" style="width:100%;max-height:300px;object-fit:cover;border-radius:14px" alt="">')+
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
    try{
      var meC=await frMe();
      var owQ=_cmMode==='post'
        ?await SB.from('kb_posts').select('author_id').eq('id',_cmId).single()
        :await SB.from('kb_reels').select('author_id').eq('id',_cmId).single();
      var ow=owQ.data&&owQ.data.author_id;
      if(ow&&ow!==meC)await SB.rpc('kb_notify',{p_user:meC,p_to:ow,p_type:'comment',p_title:'تعليق جديد 💬',p_body:txt.slice(0,60)});
    }catch(e){}
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
/* ===== الرئيسية: منتجات حقيقية بدل الوهمية ===== */
var _homeDealsLoaded=false;
async function loadHomeDeals(force){
  if(!SB||(_homeDealsLoaded&&!force))return;
  var g=document.getElementById('home-deals');if(!g)return;
  try{
    var r=await SB.from('kb_products').select('id,name,price,wilaya,condition,photos,seller_id').eq('status','active').order('created_at',{ascending:false}).limit(6);
    if(r.error)throw r.error;
    if(!r.data||!r.data.length){g.innerHTML='<p style="color:var(--muted);font-size:13px">ما كاش منتجات بعد — كوني أول بائعة! 💖</p>';return;}
    var ids=[];r.data.forEach(function(p){if(ids.indexOf(p.seller_id)<0)ids.push(p.seller_id);});
    var names={};
    try{var pr=await SB.from('kb_profiles').select('id,full_name').in('id',ids);
      if(!pr.error&&pr.data)pr.data.forEach(function(x){names[x.id]=x.full_name;});}catch(e){}
    g.innerHTML='';
    r.data.forEach(function(p){
      var img=(p.photos&&p.photos.length)?'<img src="'+p.photos[0]+'" style="width:100%;height:100%;object-fit:cover" loading="lazy">':'🛍️';
      var d=document.createElement('div');d.className='prod';d.style.cursor='pointer';
      d.onclick=(function(id){return function(){openProduct(id);};})(p.id);
      d.innerHTML='<div class="img" style="background:linear-gradient(135deg,#ffe0ec,#e9d5ff);overflow:hidden">'+img+'</div><div class="info"><h4>'+escapeHtml(p.name)+'</h4><div class="price">'+(p.price?escapeHtml(p.price)+' دج':'السعر عند التواصل')+'</div><div class="seller">'+escapeHtml(names[p.seller_id]||'بنت الكوكب')+(p.wilaya?' • '+escapeHtml(p.wilaya):'')+'</div></div>';
      g.appendChild(d);
    });
    _homeDealsLoaded=true;
  }catch(e){g.innerHTML='<p style="color:var(--muted);font-size:13px">تعذر التحميل 📡</p>';}
}
/* ===== فلترة السوق حسب القسم ===== */
var _souqCat='';
function filterSouq(cat,el){
  _souqCat=cat;
  var chips=document.querySelectorAll('#souq-chips .chip');
  chips.forEach(function(c){c.classList.remove('on');});
  if(el)el.classList.add('on');
  _productsLoaded=false;loadProducts(true);
}
/* ===== السوق: تحميل المنتجات الحقيقية ===== */
var _productsLoaded=false;
async function loadProducts(force){
  if(!SB||(_productsLoaded&&!force))return;
  try{
    var q=SB.from('kb_products').select('id,name,price,wilaya,condition,photos,seller_id,category').eq('status','active');
    if(_souqCat)q=q.eq('category',_souqCat);
    var r=await q.order('created_at',{ascending:false}).limit(30);
    var g=document.getElementById('souq-grid');g.innerHTML='';
    if(r.error||!r.data||!r.data.length){g.innerHTML='<p style="color:var(--muted);font-size:13px;grid-column:span 2;text-align:center;padding:20px">ما كاش منتجات بعد — كوني أول بائعة! 💖</p>';return;}
    var ids=[];r.data.forEach(function(p){if(ids.indexOf(p.seller_id)<0)ids.push(p.seller_id);});
    var names={};
    try{
      var pr=await SB.from('kb_profiles').select('id,full_name').in('id',ids);
      if(!pr.error&&pr.data)pr.data.forEach(function(x){names[x.id]=x.full_name;});
    }catch(e){}
    r.data.forEach(function(p){
      var img=(p.photos&&p.photos.length)?'<img loading="lazy" src="'+p.photos[0]+'" style="width:100%;height:100%;object-fit:cover">':'🛍️';
      var d=document.createElement('div');d.className='prod';d.style.cursor='pointer';
      d.onclick=(function(id){return function(){openProduct(id);};})(p.id);
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

/* ================= الصداقة الحقيقية 👭 ================= */
async function frMe(){var u=await sbUser();return u?u.id:null;}
async function areFriends(a,b){
  try{
    var r=await SB.from('kb_friendships').select('id').eq('status','accepted')
      .or('and(from_id.eq.'+a+',to_id.eq.'+b+'),and(from_id.eq.'+b+',to_id.eq.'+a+')').limit(1);
    return !!(r.data&&r.data.length);
  }catch(e){return false;}
}
function frCard(p,btnHtml){
  var av=p.avatar_emoji||'🌸';
  return '<div class="svc"><div class="avatar" style="width:56px;height:56px;font-size:26px">'+av+'</div>'
    +'<div style="flex:1"><h4>'+escapeHtml(p.full_name||'بنت الكوكب')+(p.wilaya?' • '+escapeHtml(p.wilaya):'')+'</h4>'
    +'<p>'+escapeHtml(p.bio||'عضوة في الكوكب 🪐')+'</p>'
    +'<div class="row">'+btnHtml+'</div></div></div>';
}
async function frProfiles(ids){
  var m={};if(!ids.length||!SB)return m;
  try{var r=await SB.from('kb_profiles').select('id,full_name,wilaya,avatar_emoji,bio').in('id',ids);
  (r.data||[]).forEach(function(p){m[p.id]=p;});}catch(e){}
  return m;
}
async function sendFriendReq(toId,btn){
  try{
    var me=await frMe();if(!me){toast('سجلي الدخول أولا 🔑');return;}
    if(btn){btn.disabled=true;btn.textContent='⏳';}
    var r=await SB.from('kb_friendships').insert({from_id:me,to_id:toId});
    if(r.error)throw r.error;
    try{var pn=await SB.from('kb_profiles').select('full_name').eq('id',me).single();
      await SB.rpc('kb_notify',{p_user:me,p_to:toId,p_type:'friend_req',p_title:'طلب صداقة جديد 👭',p_body:((pn.data&&pn.data.full_name)||'بنت من الكوكب')+' بعثتلك طلب صداقة 💖'});}catch(e){}
    if(btn){btn.textContent='✅ تم الإرسال';btn.style.background='#9a8a97';}
    toast('تبعث الطلب 💖');
  }catch(e){
    if(btn){btn.disabled=false;btn.textContent='👭 أضيفيها';}
    var m=String((e&&e.message)||'');
    toast(m.indexOf('duplicate')>-1||m.indexOf('unique')>-1?'الطلب مبعوث من قبل ✅':'تعذر الإرسال 📡');
  }
}
async function acceptFriend(fid,btn){
  try{
    if(btn){btn.disabled=true;btn.textContent='⏳';}
    var r=await SB.from('kb_friendships').update({status:'accepted'}).eq('id',fid);
    if(r.error)throw r.error;
    try{var fr=await SB.from('kb_friendships').select('from_id').eq('id',fid).single();
      var me2=await frMe();var pn2=await SB.from('kb_profiles').select('full_name').eq('id',me2).single();
      if(fr.data)await SB.rpc('kb_notify',{p_user:me2,p_to:fr.data.from_id,p_type:'friend_accept',p_title:'قبلت صداقتك 👭💖',p_body:((pn2.data&&pn2.data.full_name)||'بنت من الكوكب')+' قبلت طلب الصداقة — تقدرو تتهادرو دروك 💬'});}catch(e){}
    toast('وليتو صديقات 👭💖');await loadFriendsTab();
  }catch(e){toast('تعذر القبول 📡');if(btn){btn.disabled=false;btn.textContent='قبول ✅';}}
}
async function rejectFriend(fid,btn){
  try{
    var r=await SB.from('kb_friendships').update({status:'rejected'}).eq('id',fid);
    if(r.error)throw r.error;await loadFriendsTab();
  }catch(e){toast('تعذر الرفض 📡');}
}
async function loadFriendsTab(){
  var rq=document.getElementById('fr-requests');if(!rq)return;
  var fl=document.getElementById('fr-list'),sg=document.getElementById('fr-suggest');
  var me=await frMe();if(!me||!SB){rq.innerHTML='<p style="color:var(--muted);font-size:13px">سجلي الدخول أولا 🔑</p>';return;}
  rq.innerHTML='<p style="color:var(--muted);font-size:13px">⏳ نحمل...</p>';fl.innerHTML='';sg.innerHTML='';
  try{
    var rel=await SB.from('kb_friendships').select('*').or('from_id.eq.'+me+',to_id.eq.'+me);
    var rows=rel.data||[],known={},inc=[],frIds=[];
    known[me]=1;
    rows.forEach(function(x){
      known[x.from_id]=1;known[x.to_id]=1;
      if(x.status==='pending'&&x.to_id===me)inc.push(x);
      if(x.status==='accepted')frIds.push(x.from_id===me?x.to_id:x.from_id);
    });
    var pm=await frProfiles(inc.map(function(x){return x.from_id;}).concat(frIds));
    var c=document.getElementById('fr-count');if(c)c.textContent=inc.length||'';
    rq.innerHTML=inc.length?inc.map(function(x){
      var p=pm[x.from_id]||{};
      return frCard(p,'<button class="btn" onclick="acceptFriend(\''+x.id+'\',this)">قبول ✅</button><button class="btn ghost" onclick="rejectFriend(\''+x.id+'\',this)">رفض</button>');
    }).join(''):'<p style="color:var(--muted);font-size:13px">ما كاش طلبات جديدة 💤</p>';
    fl.innerHTML=frIds.length?frIds.map(function(id){
      var p=pm[id]||{};
      return frCard(p,'<button class="btn" onclick="openChat(\''+escapeHtml(p.full_name||'صديقة').replace(/'/g,"\\'")+'\',\''+(p.avatar_emoji||'🌸')+'\',\''+id+'\')">💬 محادثة</button>');
    }).join(''):'<p style="color:var(--muted);font-size:13px">ما عندكش صديقات بعد — أضيفي من لتحت 👇</p>';
    var s=await SB.from('kb_profiles').select('id,full_name,wilaya,avatar_emoji,bio,is_banned,verification_status,role').eq('verification_status','approved').neq('id',me).limit(30);
    var list=(s.data||[]).filter(function(p){return !known[p.id]&&p.is_banned!==true&&p.role!=='owner';}).slice(0,8);
    var html=list.length?list.map(function(p){
      return frCard(p,'<button class="btn" onclick="event.stopPropagation();sendFriendReq(\''+p.id+'\',this)">👭 أضيفيها</button>');
    }).join(''):'<p style="color:var(--muted);font-size:13px">ما كاش اقتراحات دروك ✨</p>';
    sg.innerHTML=html;
    var fs=document.getElementById('fr-discover');if(fs)fs.innerHTML=html;
  }catch(e){rq.innerHTML='<p style="color:var(--muted);font-size:13px">تعذر التحميل 📡</p>';}
}
/* بوابة المحادثة 🔒: غير بعد القبول المتبادل */
function openChat(name,emoji,uid){
  (async function(){
    if(uid&&SB){
      try{
        var me=await frMe();
        if(!(await areFriends(me,uid))){toast('🔒 المحادثة تتفتح غير بعد ما تقبلو الصداقة');return;}
      }catch(e){}
    }
    document.getElementById('chat-name').textContent=name;
    document.getElementById('chat-ava').textContent=emoji;
    _chatUid=uid||null;
    document.getElementById('msgs').innerHTML='';
    go('chat');
    if(_chatUid){loadChat();chatStop();_chatPoll=setInterval(function(){if(document.getElementById('chat').classList.contains('active'))loadChat();},4000);}
  })();
}

/* ================= الرسائل الحقيقية 💬 ================= */
var _chatUid=null,_chatPoll=null;
function chatStop(){if(_chatPoll){clearInterval(_chatPoll);_chatPoll=null;}}
async function loadChat(){
  var box=document.getElementById('msgs');if(!box||!_chatUid)return;
  try{
    var me=await frMe();
    var r=await SB.from('kb_messages').select('*')
      .or('and(from_id.eq.'+me+',to_id.eq.'+_chatUid+'),and(from_id.eq.'+_chatUid+',to_id.eq.'+me+')')
      .order('created_at',{ascending:true}).limit(100);
    var rows=r.data||[];
    box.innerHTML=rows.length?rows.map(function(m){
      return '<div class="msg '+(m.from_id===me?'out':'in')+'">'+escapeHtml(m.content)+'</div>';
    }).join(''):'<p style="text-align:center;color:var(--muted);font-size:13px;padding:20px">ابداي المحادثة 💬💖</p>';
    box.scrollTop=box.scrollHeight;
    // علم الواصلة كمقروءة
    var unread=rows.filter(function(m){return m.to_id===me&&!m.is_read;}).map(function(m){return m.id;});
    if(unread.length)SB.from('kb_messages').update({is_read:true}).in('id',unread);
  }catch(e){}
}
async function sendMsg(){
  var i=document.getElementById('chat-in');
  var t=i.value.trim();if(!t)return;
  if(!_chatUid){ // وضع تجريبي قديم
    var d=document.createElement('div');d.className='msg out';d.textContent=t;
    document.getElementById('msgs').appendChild(d);i.value='';
    window.scrollTo(0,document.body.scrollHeight);return;
  }
  try{
    i.value='';
    var me=await frMe();
    var r=await SB.from('kb_messages').insert({from_id:me,to_id:_chatUid,content:t});
    if(r.error)throw r.error;
    try{await SB.rpc('kb_notify',{p_user:me,p_to:_chatUid,p_type:'message',p_title:'رسالة جديدة 💬',p_body:t.slice(0,60)});}catch(e){}
    await loadChat();
  }catch(e){toast('ما تبعثتش 📡');i.value=t;}
}
/* قائمة المحادثات */
async function loadMessenger(){
  var el=document.getElementById('conv-list');if(!el)return;
  var me=await frMe();if(!me||!SB){el.innerHTML='';return;}
  el.innerHTML='<p style="color:var(--muted);font-size:13px">⏳ نحمل...</p>';
  try{
    var rel=await SB.from('kb_friendships').select('*').eq('status','accepted')
      .or('from_id.eq.'+me+',to_id.eq.'+me);
    var fids=(rel.data||[]).map(function(x){return x.from_id===me?x.to_id:x.from_id;});
    if(!fids.length){el.innerHTML='<p style="color:var(--muted);font-size:13px">ما عندكش صديقات بعد 👭<br>روحي لقسم الأصدقاء وأضيفي بنات!</p>';return;}
    var pm=await frProfiles(fids);
    var mg=await SB.from('kb_messages').select('*').or('from_id.eq.'+me+',to_id.eq.'+me)
      .order('created_at',{ascending:false}).limit(200);
    var last={},unread={};
    (mg.data||[]).forEach(function(m){
      var o=m.from_id===me?m.to_id:m.from_id;
      if(!last[o])last[o]=m;
      if(m.to_id===me&&!m.is_read)unread[o]=true;
    });
    el.innerHTML=fids.map(function(id){
      var p=pm[id]||{},lm=last[id];
      return '<div class="chat-it" onclick="openChat(\''+escapeHtml(p.full_name||'صديقة').replace(/'/g,"\\'")+'\',\''+(p.avatar_emoji||'🌸')+'\',\''+id+'\')">'
        +'<div class="avatar">'+(p.avatar_emoji||'🌸')+'</div>'
        +'<div style="flex:1"><h4 style="font-size:14px">'+escapeHtml(p.full_name||'صديقة')+'</h4>'
        +'<p style="font-size:12.5px;color:var(--muted)">'+escapeHtml(lm?lm.content:'اضغطي لبدء المحادثة 💬')+'</p></div>'
        +(unread[id]?'<span class="dot"></span>':'')+'</div>';
    }).join('');
  }catch(e){el.innerHTML='<p style="color:var(--muted);font-size:13px">تعذر التحميل 📡</p>';}
}

/* ================= الإشعارات الحقيقية 🔔 ================= */
var NT_ICONS={friend_req:'👭',friend_accept:'💖',message:'💬',comment:'💬',like:'❤️',booking:'📅',info:'🪐'};
function ntTime(t){
  try{var d=new Date(t),n=new Date(),s=(n-d)/1000;
  if(s<60)return 'دروك';if(s<3600)return Math.floor(s/60)+' د';
  if(s<86400)return Math.floor(s/3600)+' س';return Math.floor(s/86400)+' يوم';}catch(e){return '';}
}
async function loadNotifs(){
  var el=document.getElementById('notif-list');if(!el)return;
  var me=await frMe();if(!me||!SB){el.innerHTML='';return;}
  el.innerHTML='<p style="color:var(--muted);font-size:13px">⏳ نحمل...</p>';
  try{
    var r=await SB.from('kb_notifications').select('*').eq('user_id',me)
      .order('created_at',{ascending:false}).limit(50);
    var rows=r.data||[];
    el.innerHTML=rows.length?rows.map(function(n){
      var ic=NT_ICONS[n.type]||'🪐';
      return '<div class="notif" style="'+(n.is_read?'':'background:#fff5f9')+'"><div class="nic">'+ic+'</div>'
        +'<div><b>'+escapeHtml(n.title)+'</b>'+(n.body?'<br><small>'+escapeHtml(n.body)+'</small>':'')
        +'<br><small style="color:var(--muted)">'+ntTime(n.created_at)+'</small></div></div>';
    }).join(''):'<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما كاش إشعارات بعد 🔕</p>';
    var unread=rows.filter(function(n){return !n.is_read;}).map(function(n){return n.id;});
    if(unread.length)SB.from('kb_notifications').update({is_read:true}).in('id',unread);
    updateBadges();
  }catch(e){el.innerHTML='<p style="color:var(--muted);font-size:13px">تعذر التحميل 📡</p>';}
}
async function updateBadges(){
  try{
    var me=await frMe();if(!me||!SB)return;
    var n=await SB.from('kb_notifications').select('id',{count:'exact',head:true}).eq('user_id',me).eq('is_read',false);
    var nb=document.getElementById('nt-badge');
    if(nb){var c=n.count||0;nb.textContent=c>9?'9+':c;nb.style.display=c?'':'none';}
    var m=await SB.from('kb_messages').select('id',{count:'exact',head:true}).eq('to_id',me).eq('is_read',false);
    var mb=document.getElementById('msg-badge');
    if(mb){var c2=m.count||0;mb.textContent=c2>9?'9+':c2;mb.style.display=c2?'':'none';}
    var f=await SB.from('kb_friendships').select('id',{count:'exact',head:true}).eq('to_id',me).eq('status','pending');
    var fb=document.getElementById('fr-badge');
    if(fb){var c3=f.count||0;fb.textContent=c3>9?'9+':c3;fb.style.display=c3?'':'none';}
  }catch(e){}
}

/* ================= حجز الخدمات 📅 ================= */
var _bkService='',_bkProvider='';
/* ===== الخدمات الحقيقية ===== */
var _servicesLoaded=false;
async function loadServices(force){
  if(!SB||(_servicesLoaded&&!force))return;
  var el=document.getElementById('services-list');if(!el)return;
  el.innerHTML='<p style="color:var(--muted);font-size:13px">⏳ نحمل الخدمات...</p>';
  try{
    var r=await SB.from('kb_services').select('id,title,description,price,wilaya,provider_id').order('created_at',{ascending:false}).limit(40);
    if(r.error)throw r.error;
    var rows=r.data||[];
    if(!rows.length){el.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما كاش خدمات بعد — كوني أول وحدة تقدم خدمتها! 💅</p>';_servicesLoaded=true;return;}
    var ids=[];rows.forEach(function(s){if(ids.indexOf(s.provider_id)<0)ids.push(s.provider_id);});
    var names={};
    try{var pr=await SB.from('kb_profiles').select('id,full_name').in('id',ids);
      if(!pr.error&&pr.data)pr.data.forEach(function(x){names[x.id]=x.full_name;});}catch(e){}
    el.innerHTML=rows.map(function(s){
      return '<div class="svc"><div class="ico">💅</div><div style="flex:1"><h4>'+escapeHtml(s.title)+'</h4>'
        +'<p>'+escapeHtml(names[s.provider_id]||'بنت الكوكب')+(s.wilaya?' • '+escapeHtml(s.wilaya):'')+'</p>'
        +(s.description?'<p style="font-size:12px;color:var(--muted)">'+escapeHtml(s.description)+'</p>':'')
        +'<div class="row"><span class="price">'+escapeHtml(s.price||'السعر عند التواصل')+'</span><button class="btn" onclick="openBooking(\''+s.id+'\')">احجزي 📅</button></div></div></div>';
    }).join('');
    _servicesLoaded=true;
  }catch(e){el.innerHTML='<p style="color:var(--muted);font-size:13px">تعذر التحميل 📡</p>';}
}
function openAddService(){document.getElementById('svc-modal').style.display='flex';}
function closeAddService(){document.getElementById('svc-modal').style.display='none';}
async function submitService(){
  var t=document.getElementById('svc-title').value.trim();
  if(!t){toast('اكتبي عنوان الخدمة 💅');return;}
  if(!SB){toast('ما كاش اتصال 📡');return;}
  try{
    var me=await frMe();if(!me){toast('سجلي الدخول أولا 🔑');return;}
    var r=await SB.from('kb_services').insert({provider_id:me,
      title:t,
      description:document.getElementById('svc-desc').value.trim()||null,
      price:document.getElementById('svc-price').value.trim()||null,
      wilaya:document.getElementById('svc-wilaya').value.trim()||null});
    if(r.error)throw r.error;
    closeAddService();_servicesLoaded=false;loadServices(true);
    document.getElementById('svc-title').value='';document.getElementById('svc-desc').value='';
    document.getElementById('svc-price').value='';document.getElementById('svc-wilaya').value='';
    toast('تنشرت خدمتك بنجاح! 💅✨');
  }catch(e){toast('تعذر النشر: '+(e.message||'📡'));}
}
var _bkServiceId=null,_bkProviderId=null;
async function openBooking(sid){
  _bkServiceId=sid;_bkProviderId=null;
  try{
    var r=await SB.from('kb_services').select('id,title,provider_id').eq('id',sid).single();
    if(r.data){_bkProviderId=r.data.provider_id;
      document.getElementById('bk-title').textContent='📅 حجز: '+r.data.title;}
  }catch(e){}
  var dt=document.getElementById('bk-date');
  if(dt)dt.min=new Date().toISOString().slice(0,10);
  document.getElementById('bk-date').value='';
  document.getElementById('bk-phone').value='';
  document.getElementById('bk-note').value='';
  document.getElementById('bk-modal').style.display='flex';
}
function closeBooking(){document.getElementById('bk-modal').style.display='none';}
async function submitBooking(){
  var d=document.getElementById('bk-date').value,
      ph=document.getElementById('bk-phone').value.trim(),
      nt=document.getElementById('bk-note').value.trim();
  if(!d){toast('اختاري التاريخ 📅');return;}
  if(!ph){toast('اكتبي رقم الهاتف 📱');return;}
  try{
    var me=await frMe();if(!me){toast('سجلي الدخول أولا 🔑');return;}
    var svcName=document.getElementById('bk-title').textContent.replace('📅 حجز: ','').replace('📅 ','')||'خدمة';
    var r=await SB.from('kb_bookings').insert({client_id:me,service_name:svcName,provider_id:_bkProviderId,service_id:_bkServiceId,booking_date:d,phone:ph,note:nt});
    if(r.error)throw r.error;
    closeBooking();toast('تبعث الحجز ✅ مقدمة الخدمة تشوفو دروك 📅');
    try{
      var mn=(_profile&&_profile.full_name)||'بنت الكوكب';
      if(_bkProviderId)await SB.rpc('kb_notify',{p_user:me,p_to:_bkProviderId,p_type:'booking',p_title:'حجز جديد 📅',p_body:mn+' حجزت عندك — '+d});
    }catch(e){}
  }catch(e){toast('تعذر الحجز 📡');}
}
var BK_ST={pending:'⏳ معلق',confirmed:'✅ مؤكد',done:'🏁 مكتمل',cancelled:'❌ ملغي'};
async function loadMyBookings(){
  var el=document.getElementById('my-bookings');if(!el)return;
  var me=await frMe();if(!me||!SB){el.innerHTML='';return;}
  el.innerHTML='<p style="color:var(--muted);font-size:13px">⏳ نحمل...</p>';
  try{
    var r=await SB.from('kb_bookings').select('*').eq('client_id',me).order('booking_date',{ascending:true});
    var rows=r.data||[];
    el.innerHTML=rows.length?rows.map(function(b){
      return '<div class="svc"><div class="ico">📅</div><div style="flex:1"><h4>'+escapeHtml(b.service_name)+'</h4>'
        +'<p>'+escapeHtml(b.booking_date)+' • '+(BK_ST[b.status]||b.status)+'</p>'
        +(b.status==='pending'?'<div class="row"><button class="btn ghost" style="font-size:12px;padding:6px 12px" onclick="cancelBooking(\''+b.id+'\')">إلغاء</button></div>':'')
        +'</div></div>';
    }).join(''):'<p style="color:var(--muted);font-size:13px;text-align:center;padding:16px">ما عندكش حجوزات بعد 📅</p>';
  }catch(e){el.innerHTML='<p style="color:var(--muted);font-size:13px">تعذر التحميل 📡</p>';}
}
async function cancelBooking(id){
  if(!confirm('متأكدة تحبي تلغي هاذ الحجز؟'))return;
  try{var r=await SB.from('kb_bookings').update({status:'cancelled'}).eq('id',id);
    if(r.error)throw r.error;toast('تلغى الحجز');loadMyBookings();
  }catch(e){toast('تعذر الإلغاء 📡');}
}
/* حجوزات المالك 👑 */
async function loadOwnerBookings(){
  var el=document.getElementById('adm-bookings');if(!el)return;
  el.innerHTML='<p style="text-align:center;color:var(--muted)">نحمل الحجوزات... ⏳</p>';
  try{
    var r=await SB.from('kb_bookings').select('*').order('created_at',{ascending:false}).limit(50);
    if(r.error)throw r.error;
    var rows=r.data||[];
    var ids=[];rows.forEach(function(b){if(ids.indexOf(b.client_id)<0)ids.push(b.client_id);});
    var names={};try{var pr=await SB.from('kb_profiles').select('id,full_name,phone').in('id',ids);
      (pr.data||[]).forEach(function(x){names[x.id]=x;});}catch(e){}
    el.innerHTML=rows.length?rows.map(function(b){
      var p=names[b.client_id]||{};
      return '<div class="svc"><div class="ico">📅</div><div style="flex:1"><h4>'+escapeHtml(b.service_name)+' — '+escapeHtml(p.full_name||'؟')+'</h4>'
        +'<p>📞 '+escapeHtml(b.phone||p.phone||'—')+' • 🗓️ '+escapeHtml(b.booking_date)+(b.note?'<br>📝 '+escapeHtml(b.note):'')+'</p></div>'
        +'<div style="display:flex;flex-direction:column;gap:6px">'
        +(b.status==='pending'?'<button class="btn" style="padding:8px 12px;font-size:13px;background:#22c55e" onclick="bkStatus(\''+b.id+'\',\'confirmed\')">✅ تأكيد</button>':'')
        +(b.status!=='done'&&b.status!=='cancelled'?'<button class="btn ghost" style="padding:8px 12px;font-size:13px" onclick="bkStatus(\''+b.id+'\',\'cancelled\')">❌</button>':'')
        +'<small style="text-align:center">'+(BK_ST[b.status]||b.status)+'</small></div></div>';
    }).join(''):'<p style="text-align:center;color:var(--muted)">ما كاش حجوزات 🎉</p>';
  }catch(e){el.innerHTML='<p style="text-align:center;color:var(--muted)">تعذر التحميل 📡</p>';}
}
async function bkStatus(id,st){
  try{var r=await SB.from('kb_bookings').update({status:st}).eq('id',id);
    if(r.error)throw r.error;
    var b=await SB.from('kb_bookings').select('client_id,service_name').eq('id',id).single();
    if(b.data)try{await SB.rpc('kb_notify',{p_user:(await frMe()),p_to:b.data.client_id,p_type:'booking',
      p_title:st==='confirmed'?'تأكد حجزك ✅':'تغير حجزك 📅',
      p_body:b.data.service_name+' — '+(BK_ST[st]||st)});}catch(e){}
    loadOwnerBookings();
  }catch(e){toast('تعذر التحديث 📡');}
}

/* ================= البحث الحقيقي 🔍 ================= */
var _sqT=null;
function doSearch(q){
  clearTimeout(_sqT);
  _sqT=setTimeout(function(){runSearch(q.trim());},350);
}
async function runSearch(q){
  var box=document.getElementById('search-results');if(!box)return;
  var trend=document.getElementById('search-trend');
  if(!q){box.innerHTML='';if(trend)trend.style.display='block';return;}
  if(trend)trend.style.display='none';
  box.innerHTML='<p style="color:var(--muted);font-size:13px">⏳ نقلب...</p>';
  try{
    var me=await frMe();
    var html='';
    // منتجات
    var pr=await SB.from('kb_products').select('id,name,price,photos,category').or('name.ilike.%'+q+'%,description.ilike.%'+q+'%').limit(12);
    var prods=pr.data||[];
    if(prods.length){
      html+='<div class="sec-title">🛍️ منتجات ('+prods.length+')</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'
        +prods.map(function(p){
          var img=(p.photos&&p.photos[0])?'<img loading="lazy" src="'+p.photos[0]+'" style="width:100%;height:110px;object-fit:cover;border-radius:12px">':'<div style="height:110px;border-radius:12px;background:linear-gradient(135deg,#ffe0ec,#ffd6e8);display:grid;place-items:center;font-size:36px">🛍️</div>';
          return '<div onclick="openProduct(\''+p.id+'\')" style="cursor:pointer">'+img+'<div style="font-size:13px;font-weight:700;margin-top:4px">'+escapeHtml(p.name||'')+'</div><div style="font-size:12px;color:var(--pink-d);font-weight:700">'+escapeHtml(String(p.price||''))+' دج</div></div>';
        }).join('')+'</div>';
    }
    // بنات
    var pf=await SB.from('kb_profiles').select('id,full_name,wilaya,avatar_emoji,bio,role').ilike('full_name','%'+q+'%').neq('id',me||'').limit(10);
    var girls=(pf.data||[]).filter(function(x){return x.id!==me&&x.role!=='owner';});
    if(girls.length){
      html+='<div class="sec-title">👭 بنات ('+girls.length+')</div>'
        +girls.map(function(g){
          return '<div class="svc"><div class="avatar" style="width:48px;height:48px;font-size:22px">'+(g.avatar_emoji||'🌸')+'</div>'
            +'<div style="flex:1"><h4>'+escapeHtml(g.full_name||'')+(g.wilaya?' • '+escapeHtml(g.wilaya):'')+'</h4><p>'+escapeHtml(g.bio||'')+'</p>'
            +'<div class="row"><button class="btn" style="font-size:12px;padding:6px 14px" onclick="sendFriendReq(\''+g.id+'\',this)">👭 أضيفيها</button></div></div></div>';
        }).join('');
    }
    box.innerHTML=html||'<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما لقينا والو ب«'+escapeHtml(q)+'» 😕<br>جربي كلمة أخرى</p>';
  }catch(e){box.innerHTML='<p style="color:var(--muted);font-size:13px">تعذر البحث 📡</p>';}
}
function searchChip(q){var i=document.getElementById('search-input');if(i)i.value=q;runSearch(q);}

/* ================= السوق: تفاصيل + طلبات 🛒 ================= */
var _curProduct=null;
async function openProduct(pid){
  try{
    var r=await SB.from('kb_products').select('*').eq('id',pid).single();
    if(r.error||!r.data){toast('تعذر فتح المنتج 📡');return;}
    var p=r.data;_curProduct=p;
    var sp={};try{var s=await SB.from('kb_profiles').select('id,full_name,wilaya,avatar_emoji').eq('id',p.seller_id).single();
      if(s.data)sp=s.data;}catch(e){}
    var img=(p.photos&&p.photos[0])?'<img loading="lazy" src="'+p.photos[0]+'" style="width:100%;height:100%;object-fit:cover">':'👗';
    var di=document.querySelector('#detail .detail-img');
    di.innerHTML=img+'<div class="back" onclick="go(\'souq\')">→</div>';
    var db=document.querySelector('#detail .detail-body');
    db.querySelector('h2').textContent=p.name||'منتج';
    db.querySelector('.price').textContent=(p.price?p.price+' دج':'السعر عند التواصل');
    db.querySelector('.desc').textContent=p.description||'';
    var sc=db.querySelector('.seller-card');
    sc.innerHTML='<div class="avatar">'+(sp.avatar_emoji||'🌸')+'</div><div><h4 style="font-size:14px">'+escapeHtml(sp.full_name||'بنت الكوكب')+'</h4>'
      +'<small style="color:var(--muted)">'+escapeHtml(sp.wilaya||'')+'</small></div>';
    sc.onclick=function(){if(sp.id)openUserProfile(sp.id);};
    var btns=db.querySelectorAll('.cta-row .btn');
    btns[0].onclick=function(){chatSeller();};
    btns[1].onclick=function(){orderNow();};
    go('detail');
  }catch(e){toast('تعذر فتح المنتج 📡');}
}
async function openUserProfile(uid){
  try{
    var r=await SB.from('kb_profiles').select('*').eq('id',uid).single();
    if(r.error||!r.data)return;
    var p=r.data;
    document.getElementById('op-name').textContent=p.full_name||'بنت الكوكب';
    document.getElementById('op-name2').textContent=p.full_name||'بنت الكوكب';
    var oav=document.querySelector('#oprofile .fb-avatar');
    if(oav){
      if(p.avatar_url){oav.innerHTML='<img loading="lazy" src="'+avatarPublicUrl(p.avatar_url)+'" alt="">';}
      else{oav.innerHTML='<span id="op-emoji">'+escapeHtml(p.avatar_emoji||'🌸')+'</span>';}
    }
    var ocv=document.querySelector('#oprofile .cover');
    if(ocv){
      if(p.cover_url){ocv.style.backgroundImage='url('+avatarPublicUrl(p.cover_url)+')';}
      else{ocv.style.backgroundImage='';}
    }
    var btn=document.getElementById('op-add');
    btn.textContent='👭 أضيفيها صديقة';btn.style.background='';btn.disabled=false;
    btn.onclick=function(){sendFriendReq(uid,btn);};
    var chatB=document.getElementById('op-chat');
    if(chatB)chatB.onclick=function(){openChat(p.full_name||'صديقة',p.avatar_emoji||'🌸',uid);};
    // إحصائيات حقيقية
    try{
      var fr=await SB.from('kb_friendships').select('id',{count:'exact',head:true}).or('from_id.eq.'+uid+',to_id.eq.'+uid).eq('status','accepted');
      var fe=document.getElementById('op-friends');if(fe)fe.textContent=fr.count||0;
      var pr2=await SB.from('kb_products').select('id',{count:'exact',head:true}).eq('seller_id',uid).eq('status','active');
      var pe=document.getElementById('op-products');if(pe)pe.textContent=pr2.count||0;
      var rl2=await SB.from('kb_reels').select('id',{count:'exact',head:true}).eq('author_id',uid);
      var re2=document.getElementById('op-reels');if(re2)re2.textContent=rl2.count||0;
    }catch(e){}
    _opUid=uid;_opTab='posts';
    var _ot=document.querySelectorAll('#op-tabs .tab');_ot.forEach(function(x,i){x.classList.toggle('on',i===0);});
    go('oprofile');loadOpTab();
  }catch(e){}
}
async function chatSeller(){
  if(!_curProduct)return;
  var me=await frMe();
  if(_curProduct.seller_id===me){toast('هاذا منتجك نتي 😊');return;}
  try{
    var sp=await SB.from('kb_profiles').select('full_name,avatar_emoji').eq('id',_curProduct.seller_id).single();
    var nm=(sp.data&&sp.data.full_name)||'البائعة',em=(sp.data&&sp.data.avatar_emoji)||'🌸';
    if(!(await areFriends(me,_curProduct.seller_id))){
      if(confirm('💬 باش تراسلي البائعة لازم تكونو صديقات أولا.\nنبعثولها طلب صداقة دروك؟')){
        await SB.from('kb_friendships').insert({from_id:me,to_id:_curProduct.seller_id});
        toast('تبعث طلب الصداقة 👭');
      }
      return;
    }
    openChat(nm,em,_curProduct.seller_id);
  }catch(e){toast('تعذر 📡');}
}
async function orderNow(){
  if(!_curProduct)return;
  try{
    var me=await frMe();
    if(_curProduct.seller_id===me){toast('هاذا منتجك نتي 😊');return;}
    if(!confirm('🛒 تأكدي الطلب:\n'+_curProduct.name+'\n'+(_curProduct.price||'')+' دج\nالدفع عند الاستلام 🤝'))return;
    var r=await SB.from('kb_orders').insert({product_id:_curProduct.id,buyer_id:me,seller_id:_curProduct.seller_id});
    if(r.error)throw r.error;
    try{
      var pn=await SB.from('kb_profiles').select('full_name').eq('id',me).single();
      await SB.rpc('kb_notify',{p_user:me,p_to:_curProduct.seller_id,p_type:'order',p_title:'طلب جديد 🛒',p_body:((pn.data&&pn.data.full_name)||'زبونة')+' طلبت: '+_curProduct.name});
    }catch(e){}
    toast('تبعث الطلب ✅ البائعة تتواصل معاك');
    go('orders');
  }catch(e){toast('تعذر الطلب 📡');}
}
var ORD_ST={pending:'⏳ معلق',accepted:'✅ مقبول',rejected:'❌ مرفوض',done:'🏁 مكتمل',cancelled:'🚫 ملغي'};
async function loadOrders(){
  var el=document.getElementById('orders-list');if(!el)return;
  var me=await frMe();if(!me||!SB){el.innerHTML='';return;}
  el.innerHTML='<p style="color:var(--muted);font-size:13px">⏳ نحمل...</p>';
  try{
    var r=await SB.from('kb_orders').select('*').or('buyer_id.eq.'+me+',seller_id.eq.'+me).order('created_at',{ascending:false}).limit(50);
    var rows=r.data||[];
    var pids=[];rows.forEach(function(o){if(pids.indexOf(o.product_id)<0)pids.push(o.product_id);});
    var pn={};if(pids.length){try{var pr=await SB.from('kb_products').select('id,name,price,photos').in('id',pids);
      (pr.data||[]).forEach(function(x){pn[x.id]=x;});}catch(e){}}
    el.innerHTML=rows.length?rows.map(function(o){
      var p=pn[o.product_id]||{},isSeller=o.seller_id===me;
      var acts='';
      if(o.status==='pending'&&isSeller)acts='<div class="row"><button class="btn" style="font-size:12px;padding:6px 14px;background:#22c55e" onclick="ordStatus(\''+o.id+'\',\'accepted\')">✅ قبول</button><button class="btn ghost" style="font-size:12px;padding:6px 14px" onclick="ordStatus(\''+o.id+'\',\'rejected\')">❌ رفض</button></div>';
      else if(o.status==='pending'&&!isSeller)acts='<div class="row"><button class="btn ghost" style="font-size:12px;padding:6px 14px" onclick="ordStatus(\''+o.id+'\',\'cancelled\')">إلغاء الطلب</button></div>';
      else if(o.status==='accepted'&&isSeller)acts='<div class="row"><button class="btn" style="font-size:12px;padding:6px 14px" onclick="ordStatus(\''+o.id+'\',\'done\')">🏁 تم التسليم</button></div>';
      var img=(p.photos&&p.photos[0])?'<img loading="lazy" src="'+p.photos[0]+'" style="width:100%;height:100%;object-fit:cover">':'🛍️';
      return '<div class="svc"><div class="avatar" style="width:52px;height:52px;font-size:24px;overflow:hidden">'+img+'</div>'
        +'<div style="flex:1"><h4>'+escapeHtml(p.name||'منتج')+' '+(isSeller?'<small style="color:var(--muted)">(بعتيه)</small>':'<small style="color:var(--muted)">(شريتيه)</small>')+'</h4>'
        +'<p>'+(p.price?p.price+' دج • ':'')+(ORD_ST[o.status]||o.status)+'</p>'+acts+'</div></div>';
    }).join(''):'<p style="color:var(--muted);font-size:13px;text-align:center;padding:16px">ما كاش طلبات بعد 🛒</p>';
  }catch(e){el.innerHTML='<p style="color:var(--muted);font-size:13px">تعذر التحميل 📡</p>';}
}
async function ordStatus(id,st){
  try{var r=await SB.from('kb_orders').update({status:st}).eq('id',id);
    if(r.error)throw r.error;
    var o=await SB.from('kb_orders').select('buyer_id,seller_id,product_id').eq('id',id).single();
    if(o.data){var me=await frMe(),other=me===o.data.buyer_id?o.data.seller_id:o.data.buyer_id;
      var pn=await SB.from('kb_products').select('name').eq('id',o.data.product_id).single();
      try{await SB.rpc('kb_notify',{p_user:me,p_to:other,p_type:'order',p_title:'تحديث الطلب 🛒',p_body:((pn.data&&pn.data.name)||'منتج')+' — '+(ORD_ST[st]||st)});}catch(e){}}
    loadOrders();
  }catch(e){toast('تعذر التحديث 📡');}
}

/* ================= أزرار كانت ميتة 🧹 ================= */
// بروفايل تجريبي: نحاول نلقى الحساب الحقيقي
async function findAndAdd(name,btn){
  try{
    var r=await SB.from('kb_profiles').select('id').ilike('full_name','%'+name+'%').limit(1);
    if(r.data&&r.data.length){sendFriendReq(r.data[0].id,btn);return;}
  }catch(e){}
  toast('هاذا حساب تجريبي 🌸');
}
// تعديل البروفايل ✏️
function openEditProfile(){
  (async function(){
    var me=await frMe();if(!me||!SB){toast('سجلي الدخول أولا 🔑');return;}
    var r=await SB.from('kb_profiles').select('full_name,wilaya,bio,avatar_emoji').eq('id',me).single();
    var p=r.data||{};
    document.getElementById('ep-name').value=p.full_name||'';
    document.getElementById('ep-wilaya').value=p.wilaya||'';
    document.getElementById('ep-bio').value=p.bio||'';
    document.getElementById('ep-emoji').value=p.avatar_emoji||'🌸';
    document.getElementById('ep-modal').style.display='flex';
  })();
}
function closeEditProfile(){document.getElementById('ep-modal').style.display='none';}
async function saveProfile(){
  try{
    var me=await frMe();if(!me)return;
    var upd={full_name:document.getElementById('ep-name').value.trim(),
      wilaya:document.getElementById('ep-wilaya').value.trim(),
      bio:document.getElementById('ep-bio').value.trim(),
      avatar_emoji:document.getElementById('ep-emoji').value.trim()||'🌸'};
    var r=await SB.from('kb_profiles').update(upd).eq('id',me);
    if(r.error)throw r.error;
    closeEditProfile();toast('تحفظ البروفايل ✅');loadOwnProfile();
  }catch(e){toast('تعذر الحفظ: '+(e.message||'📡'));}
}
/* ===== تبويبات البروفايل الحقيقية 📑 ===== */
var _pfTab='posts';
function pfTab(t,el){
  _pfTab=t;
  var tabs=document.querySelectorAll('#pf-tabs .tab');
  tabs.forEach(function(x){x.classList.remove('on');});
  if(el)el.classList.add('on');
  loadPfTab();
}
async function loadPfTab(){
  var box=document.getElementById('pf-tab-content');if(!box)return;
  var me=await frMe();if(!me||!SB)return;
  box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center">⏳ نحمل...</p>';
  try{
    if(_pfTab==='posts'){
      var r=await SB.from('kb_posts').select('id,content,media_url,media_type,likes_count,comments_count,created_at').eq('author_id',me).order('created_at',{ascending:false}).limit(20);
      var rows=r.data||[];
      if(!rows.length){box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما نشرتي والو بعد 📝</p>';return;}
      var nm=(_profile&&_profile.full_name)||'بنت الكوكب';
      box.innerHTML='';
      rows.forEach(function(p){
        var d=postCard(p,nm);
        // زر مسح لمنشوراتي
        var del=document.createElement('button');
        del.textContent='🗑️';del.style.cssText='background:none;border:none;cursor:pointer;font-size:16px';
        del.onclick=function(){delPost(p.id);};
        var acts=d.querySelector('.actions');if(acts)acts.appendChild(del);
        box.appendChild(d);
      });
    }else if(_pfTab==='products'){
      var r2=await SB.from('kb_products').select('id,name,price,photos,condition').eq('seller_id',me).eq('status','active').order('created_at',{ascending:false}).limit(20);
      var prods=r2.data||[];
      if(!prods.length){box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما عندكش منتجات بعد 🛍️</p>';return;}
      box.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+prods.map(function(p){
        var img=(p.photos&&p.photos[0])?'<img loading="lazy" src="'+p.photos[0]+'" style="width:100%;height:110px;object-fit:cover;border-radius:12px">':'<div style="height:110px;border-radius:12px;background:linear-gradient(135deg,#ffe0ec,#e9d5ff);display:grid;place-items:center;font-size:32px">🛍️</div>';
        return '<div onclick="openProduct(\''+p.id+'\')" style="cursor:pointer">'+img+'<div style="font-size:13px;font-weight:700;margin-top:4px">'+escapeHtml(p.name||'')+'</div><div style="font-size:12px;color:var(--pink-d);font-weight:700">'+escapeHtml(String(p.price||''))+' دج</div></div>';
      }).join('')+'</div>';
    }else if(_pfTab==='reels'){
      var r5=await SB.from('kb_reels').select('id,video_url,media_type,title,likes_count,comments_count').eq('author_id',me).order('created_at',{ascending:false}).limit(20);
      var reels=r5.data||[];
      if(!reels.length){box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما نشرتي حتى ريلز بعد 🎬</p>';return;}
      box.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">'+reels.map(function(x){
        var th=x.media_type==='photo'
          ?'<img src="'+reelUrl(x.video_url)+'" loading="lazy" style="width:100%;height:150px;object-fit:cover;border-radius:10px">'
          :'<video src="'+reelUrl(x.video_url)+'" preload="metadata" style="width:100%;height:150px;object-fit:cover;border-radius:10px"></video>';
        return '<div style="position:relative;cursor:pointer" onclick="go(\'video\')">'+th+'<span style="position:absolute;bottom:4px;right:4px;font-size:11px;background:rgba(0,0,0,.5);color:#fff;border-radius:8px;padding:1px 6px">❤️ '+(x.likes_count||0)+'</span></div>';
      }).join('')+'</div>';
    }else{
      var r3=await SB.from('kb_posts').select('media_url,media_type').eq('author_id',me).neq('media_type','none').not('media_url','is',null).order('created_at',{ascending:false}).limit(30);
      var r4=await SB.from('kb_products').select('photos').eq('seller_id',me).eq('status','active').limit(20);
      var imgs=[];
      (r3.data||[]).forEach(function(p){if(p.media_url&&p.media_type!=='video')imgs.push(postUrl(p.media_url));});
      (r4.data||[]).forEach(function(p){(p.photos||[]).forEach(function(u){imgs.push(u);});});
      if(!imgs.length){box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما كاش صور بعد 📷</p>';return;}
      box.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">'+imgs.slice(0,30).map(function(u){
        return '<img src="'+u+'" loading="lazy" style="width:100%;height:110px;object-fit:cover;border-radius:10px">';
      }).join('')+'</div>';
    }
  }catch(e){box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center">تعذر التحميل 📡</p>';}
}
async function delPost(id){
  if(!confirm('متأكدة تحبي تمسحي هاذ المنشور؟'))return;
  try{
    var r=await SB.from('kb_posts').delete().eq('id',id);
    if(r.error)throw r.error;
    toast('تمسح المنشور 🗑️');loadPfTab();_feedLoaded=false;
  }catch(e){toast('تعذر المسح 📡');}
}
/* تبويبات بروفايل الغير */
var _opTab='posts',_opUid=null;
function opTab(t,el){
  _opTab=t;
  var tabs=document.querySelectorAll('#op-tabs .tab');
  tabs.forEach(function(x){x.classList.remove('on');});
  if(el)el.classList.add('on');
  loadOpTab();
}
async function loadOpTab(){
  var box=document.getElementById('op-tab-content');if(!box||!_opUid||!SB)return;
  box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center">⏳ نحمل...</p>';
  try{
    if(_opTab==='posts'){
      var r=await SB.from('kb_posts').select('id,author_id,content,media_url,media_type,likes_count,comments_count,created_at').eq('author_id',_opUid).order('created_at',{ascending:false}).limit(20);
      var rows=r.data||[];
      if(!rows.length){box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما نشرت والو بعد 📝</p>';return;}
      var nm=document.getElementById('op-name').textContent||'بنت الكوكب';
      box.innerHTML='';rows.forEach(function(p){box.appendChild(postCard(p,nm));});
    }else if(_opTab==='products'){
      var r2=await SB.from('kb_products').select('id,name,price,photos').eq('seller_id',_opUid).eq('status','active').order('created_at',{ascending:false}).limit(20);
      var prods=r2.data||[];
      if(!prods.length){box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما عندهاش منتجات بعد 🛍️</p>';return;}
      box.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'+prods.map(function(p){
        var img=(p.photos&&p.photos[0])?'<img loading="lazy" src="'+p.photos[0]+'" style="width:100%;height:110px;object-fit:cover;border-radius:12px">':'<div style="height:110px;border-radius:12px;background:linear-gradient(135deg,#ffe0ec,#e9d5ff);display:grid;place-items:center;font-size:32px">🛍️</div>';
        return '<div onclick="openProduct(\''+p.id+'\')" style="cursor:pointer">'+img+'<div style="font-size:13px;font-weight:700;margin-top:4px">'+escapeHtml(p.name||'')+'</div><div style="font-size:12px;color:var(--pink-d);font-weight:700">'+escapeHtml(String(p.price||''))+' دج</div></div>';
      }).join('')+'</div>';
    }else if(_opTab==='reels'){
      var r5=await SB.from('kb_reels').select('id,video_url,media_type,likes_count').eq('author_id',_opUid).order('created_at',{ascending:false}).limit(20);
      var reels=r5.data||[];
      if(!reels.length){box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما نشرت حتى ريلز بعد 🎬</p>';return;}
      box.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">'+reels.map(function(x){
        var th=x.media_type==='photo'
          ?'<img src="'+reelUrl(x.video_url)+'" loading="lazy" style="width:100%;height:150px;object-fit:cover;border-radius:10px">'
          :'<video src="'+reelUrl(x.video_url)+'" preload="metadata" style="width:100%;height:150px;object-fit:cover;border-radius:10px"></video>';
        return '<div style="position:relative;cursor:pointer" onclick="go(\'video\')">'+th+'<span style="position:absolute;bottom:4px;right:4px;font-size:11px;background:rgba(0,0,0,.5);color:#fff;border-radius:8px;padding:1px 6px">❤️ '+(x.likes_count||0)+'</span></div>';
      }).join('')+'</div>';
    }else{
      var r3=await SB.from('kb_posts').select('media_url,media_type').eq('author_id',_opUid).neq('media_type','none').not('media_url','is',null).order('created_at',{ascending:false}).limit(30);
      var r4=await SB.from('kb_products').select('photos').eq('seller_id',_opUid).eq('status','active').limit(20);
      var imgs=[];
      (r3.data||[]).forEach(function(p){if(p.media_url&&p.media_type!=='video')imgs.push(postUrl(p.media_url));});
      (r4.data||[]).forEach(function(p){(p.photos||[]).forEach(function(u){imgs.push(u);});});
      if(!imgs.length){box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center;padding:20px">ما كاش صور بعد 📷</p>';return;}
      box.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">'+imgs.slice(0,30).map(function(u){
        return '<img src="'+u+'" loading="lazy" style="width:100%;height:110px;object-fit:cover;border-radius:10px">';
      }).join('')+'</div>';
    }
  }catch(e){box.innerHTML='<p style="color:var(--muted);font-size:13px;text-align:center">تعذر التحميل 📡</p>';}
}
async function loadOwnProfile(){
  try{
    var me=await frMe();if(!me||!SB)return;
    var r=await SB.from('kb_profiles').select('full_name,wilaya,bio,avatar_emoji,avatar_url,cover_url').eq('id',me).single();
    if(r.data){var p=r.data;
      document.getElementById('pf-name').textContent=p.full_name||'';
      var mn=document.getElementById('mn-name');if(mn)mn.textContent=p.full_name||'بروفايلي';
      var _cb='?t='+Date.now();
      var av=document.getElementById('pf-avatar');
      if(av){
        if(p.avatar_url){av.innerHTML='<img loading="lazy" src="'+avatarPublicUrl(p.avatar_url)+_cb+'" alt=""><span class="av-cam">📷</span>';}
        else{av.innerHTML=escapeHtml(p.avatar_emoji||'🌸')+'<span class="av-cam">📷</span>';}
      }
      var cv=document.getElementById('pf-cover');
      if(cv){
        if(p.cover_url){cv.style.backgroundImage='url("'+avatarPublicUrl(p.cover_url)+_cb+'")';}
        else{cv.style.backgroundImage='';}
      }
      document.getElementById('pf-bio').innerHTML='📍 '+escapeHtml(p.wilaya||'')+'<br>'+escapeHtml(p.bio||'');
    }
    var c=await SB.from('kb_friendships').select('id',{count:'exact',head:true}).eq('status','accepted').or('from_id.eq.'+me+',to_id.eq.'+me);
    var fb=document.getElementById('pf-friends');if(fb)fb.textContent=c.count||0;
    var pr=await SB.from('kb_products').select('id',{count:'exact',head:true}).eq('seller_id',me).eq('status','active');
    var pc=document.getElementById('pf-products');if(pc)pc.textContent=pr.count||0;
    try{
      var sl=await SB.from('kb_orders').select('id',{count:'exact',head:true}).eq('seller_id',me).in('status',['delivered','done','completed']);
      var se=document.getElementById('pf-sales');if(se)se.textContent=sl.count||0;
    }catch(e){}
    try{
      var rl=await SB.from('kb_reels').select('id',{count:'exact',head:true}).eq('author_id',me);
      var re=document.getElementById('pf-reels');if(re)re.textContent=rl.count||0;
    }catch(e){}
  }catch(e){}
}
/* ===== صور البروفايل الحقيقية 📷 (كيما فيسبوك) ===== */
function avatarPublicUrl(path){
  if(!path)return '';
  if(path.indexOf('http')===0)return path;
  try{return SB.storage.from('kb-avatars').getPublicUrl(path).data.publicUrl;}catch(e){return '';}
}
function avaHtml(p){
  var u=p&&(p.avatar_url||p.avatarUrl);
  if(u)return '<img loading="lazy" src="'+avatarPublicUrl(u)+'" alt="">';
  return escapeHtml((p&&(p.avatar_emoji||p.avatarEmoji))||'🌸');
}
function changeAvatar(){document.getElementById('pf-file-ava').click();}
function changeCover(){document.getElementById('pf-file-cover').click();}
async function uploadProfilePhoto(inp,type){
  var f=inp.files&&inp.files[0];inp.value='';if(!f)return;
  if(f.type.indexOf('image')!==0){toast('اختاري صورة برك 🖼️');return;}
  if(f.size>10*1024*1024){toast('الصورة كبيرة بزاف (أقصى 10MB) 📦');return;}
  if(!SB){toast('ما كاش اتصال 📡');return;}
  var localUrl=URL.createObjectURL(f);
  if(type==='avatar'){
    var _av0=document.getElementById('pf-avatar');
    if(_av0)_av0.innerHTML='<img loading="lazy" src="'+localUrl+'" alt=""><span class="av-cam">📷</span>';
  }else{
    var _cv0=document.getElementById('pf-cover');
    if(_cv0)_cv0.style.backgroundImage='url("'+localUrl+'")';
  }
  toast('نرفعو الصورة... ⏳');
  try{
    var u=await sbUser();if(!u)throw new Error('سجلي الدخول أولا');
    var ext=((f.name||'').split('.').pop()||'jpg').toLowerCase().slice(0,4);
    if(ext!=='jpg'&&ext!=='jpeg'&&ext!=='png'&&ext!=='webp')ext='jpg';
    var path=u.id+'/'+type+'_'+Date.now()+'.'+ext;
    await uploadWithProgress('kb-avatars',path,f,f.type||'image/jpeg',function(){});
    var col=type==='avatar'?'avatar_url':'cover_url';
    var oldPath='';
    try{var _op=await SB.from('kb_profiles').select(col).eq('id',u.id).single();
      if(_op.data)oldPath=_op.data[col]||'';}catch(e2){}
    var upd={};upd[col]=path;
    var r=await SB.from('kb_profiles').update(upd).eq('id',u.id);
    if(r.error)throw r.error;
    if(oldPath&&oldPath!==path){try{await SB.storage.from('kb-avatars').remove([oldPath]);}catch(e3){}}
    // تحديث مباشر بالرابط الجديد — مضمون
    try{
      var _pub=avatarPublicUrl(path)+'?t='+Date.now();
      if(type==='avatar'){
        var _av1=document.getElementById('pf-avatar');
        if(_av1)_av1.innerHTML='<img src="'+_pub+'" alt=""><span class="av-cam">📷</span>';
      }else{
        var _cv1=document.getElementById('pf-cover');
        if(_cv1)_cv1.style.backgroundImage='url("'+_pub+'")';
      }
    }catch(e4){}
    toast(type==='avatar'?'تبدلات تصويرة البروفايل 📷✨':'تبدل الغلاف 🎨✨');
  }catch(e){toast('تعذر الرفع: '+(e.message||'📡'));}
}
// مشاركة ↗️
function shareApp(){
  var url=location.href;
  if(navigator.share){navigator.share({title:'كوكب برق برق 🪐',text:'كوكب بلا ملكة... لأن كل وحدة فيكم ملكة 👑',url:url}).catch(function(){});}
  else{try{navigator.clipboard.writeText(url);toast('تنسخ الرابط ✅ شاركيه مع صاحباتك 💖');}catch(e){toast(url);}}
}
// تحدي الأسبوع 🏆 — تصويت حقيقي في القاعدة
var CH_OPTS=['💄 ميكاب نهاري ناعم','🌸 ميكاب وردي','✨ ميكاب سموكي خفيف'];
function chWeek(){var d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return d.toISOString().slice(0,10);}
async function openChallenge(){
  var box=document.getElementById('ch-opts');
  box.innerHTML='<p style="color:var(--muted);font-size:13px">⏳ نحمل الأصوات...</p>';
  document.getElementById('ch-modal').style.display='flex';
  var counts={},mine=-1,total=0;
  try{
    if(SB){
      var r=await SB.from('kb_challenge_votes').select('option_idx,user_id').eq('week',chWeek());
      if(!r.error&&r.data){
        var me=await frMe();
        r.data.forEach(function(v){counts[v.option_idx]=(counts[v.option_idx]||0)+1;total++;
          if(v.user_id===me)mine=v.option_idx;});
      }
    }
  }catch(e){}
  total=total||1;
  box.innerHTML=CH_OPTS.map(function(o,i){
    var n=counts[i]||0,pct=Math.round(100*n/total);
    return '<div onclick="voteCh('+i+')" style="cursor:pointer;background:#fff;border:2px solid '+(mine===i?'var(--pink)':'#ffe0ec')+';border-radius:14px;padding:12px;margin-bottom:8px">'
      +'<div style="font-weight:700;font-size:14px">'+o+(mine===i?' ✅':'')+'</div>'
      +'<div style="height:8px;background:#ffe0ec;border-radius:4px;margin-top:8px"><i style="display:block;height:100%;width:'+pct+'%;background:linear-gradient(90deg,var(--pink),var(--purple));border-radius:4px"></i></div>'
      +'<small style="color:var(--muted)">'+pct+'% • '+n+' صوت</small></div>';
  }).join('');
}
async function voteCh(i){
  if(!SB){toast('ما كاش اتصال 📡');return;}
  try{
    var me=await frMe();if(!me){toast('سجلي الدخول أولا 🔑');return;}
    var wk=chWeek();
    var ex=await SB.from('kb_challenge_votes').select('id').eq('user_id',me).eq('week',wk).maybeSingle();
    var r;
    if(ex.data){r=await SB.from('kb_challenge_votes').update({option_idx:i}).eq('id',ex.data.id);}
    else{r=await SB.from('kb_challenge_votes').insert({user_id:me,week:wk,option_idx:i});}
    if(r.error)throw r.error;
    toast('تسجل صوتك 🗳️💖');openChallenge();
  }catch(e){toast('تعذر التصويت 📡');}
}
function closeChallenge(){document.getElementById('ch-modal').style.display='none';}

/* ================= عناصر القائمة 📋 ================= */
// رصيدي 💰
function openWallet(){
  document.getElementById('w-modal').style.display='flex';
}
function closeWallet(){document.getElementById('w-modal').style.display='none';}
// روّجي منتجك 🚀
function openBoost(){
  document.getElementById('b-modal').style.display='flex';
}
function closeBoost(){document.getElementById('b-modal').style.display='none';}
async function requestBoost(pkg){
  try{
    var me=await frMe();if(!me){toast('سجلي الدخول أولا 🔑');return;}
    var ow=await SB.from('kb_profiles').select('id').eq('role','owner').limit(1).single();
    if(!ow.data){toast('تعذر 📡');return;}
    var pn=await SB.from('kb_profiles').select('full_name').eq('id',me).single();
    await SB.rpc('kb_notify',{p_user:me,p_to:ow.data.id,p_type:'boost',
      p_title:'طلب ترويج 🚀',p_body:((pn.data&&pn.data.full_name)||'عضوة')+' حابة باقة: '+pkg});
    closeBoost();toast('تبعث الطلب ✅ الإدارة تتواصل معاك');
  }catch(e){toast('تعذر 📡');}
}
// الإعدادات ⚙️
function openSettings(){go('settings');}
