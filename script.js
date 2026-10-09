const $=id=>document.getElementById(id),a=new Audio(),D=document.documentElement;
const S=(k,d)=>{try{const v=localStorage.getItem('p_'+k);return v===null?d:JSON.parse(v)}catch(e){return d}};
const W=(k,v)=>{try{localStorage.setItem('p_'+k,JSON.stringify(v))}catch(e){}};
let raw=[],all=[],map=new Map(),q=[],i=-1,cur=null,Q=[],sleepT=null,toastT,sleepMin=0,shown={songs:[],favs:[],lib:[]},lib={v:'pl',open:null};
let favs=new Set(S('favs',[])),hid=new Set(S('hid',[])),pls=S('pls',{}),plays=S('plays',{}),recent=S('recent',[]),edits=S('edits',{}),secs=S('secs',0);
let shuf=S('shuf',false),rep=S('rep',false),speed=S('speed',1),theme=S('theme','violet'),font=S('font','Cairo'),fade=S('fade',false),sortBy=S('sort','name');
const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
const AUD=/\.(mp3|m4a|aac|wav|ogg|opus|flac|wma|amr)$/i;
function toast(t){const e=$('toast');e.textContent=t;e.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,3000)}
function alertBox(t){$('mtext').textContent=t;$('modal').hidden=false}
$('mok').onclick=()=>$('modal').hidden=true;
const msg=t=>{$('msg').textContent=t;toast(t)};
function sheet(title,opts){
  const b=$('sbox');b.innerHTML='';
  const p=document.createElement('p');p.textContent=title;b.appendChild(p);
  opts.concat([['إلغاء']]).forEach(([l,f])=>{const x=document.createElement('button');x.className='opt';x.textContent=l;x.onclick=()=>{$('sheet').hidden=true;if(f)f()};b.appendChild(x)});
  $('sheet').hidden=false;
}
const mk=(tag,txt,cls,fn)=>{const e=document.createElement(tag);if(txt)e.textContent=txt;if(cls)e.className=cls;if(fn)e.onclick=fn;return e};

/* الأقسام */
function tab(n){
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on',p.id==='p-'+n));
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===n));
  $('mini').hidden=!cur||n==='player';
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('mini').onclick=e=>{if(!e.target.closest('#mplay'))tab('player')};

/* البيانات */
function rebuild(){
  all=raw.filter(t=>!hid.has(t.key)).map(t=>{const e=edits[t.key];return e?Object.assign({},t,{name:e.n||t.name,artist:e.a}):t});
  const cmp={name:(x,y)=>x.name.localeCompare(y.name,'ar'),artist:(x,y)=>(x.artist||'~').localeCompare(y.artist||'~','ar')||x.name.localeCompare(y.name,'ar'),new:(x,y)=>(y.added||0)-(x.added||0)}[sortBy];
  all.sort(cmp);map=new Map(all.map(t=>[t.key,t]));
  $('unhide').textContent='🙈 إظهار الأغاني المخفية ('+hid.size+')';
  renderAll();
}
const grp=f=>{const m=new Map();all.forEach(t=>{const k=f(t)||'غير معروف';if(!m.has(k))m.set(k,[]);m.get(k).push(t)});return m};

/* القوايم */
function fill(ul,arr,empty){
  ul.innerHTML='';
  if(!arr.length){ul.appendChild(mk('li',empty,'empty'));return}
  const f=document.createDocumentFragment();
  arr.forEach((t,n)=>{
    const li=mk('li');li.dataset.n=n;if(cur&&cur.key===t.key)li.className='cur';
    const sp=mk('span',t.name);if(t.artist)sp.appendChild(mk('small',t.artist));
    li.append(sp,mk('button',favs.has(t.key)?'❤️':'🤍','heart'),mk('button','⋮','more'));
    li.children[1].setAttribute('aria-label','مفضلة');li.children[2].setAttribute('aria-label','خيارات');
    f.appendChild(li);
  });
  ul.appendChild(f);
}
function renderSongs(){
  const s=$('search').value.trim().toLowerCase();
  shown.songs=all.filter(t=>!s||(t.name+' '+t.artist).toLowerCase().includes(s));
  fill($('songs'),shown.songs,all.length?'مفيش نتايج':'لسه مفيش أغاني، روح الإعدادات ودوس "دوّر على أغاني جهازك"');
}
function renderFavs(){shown.favs=all.filter(t=>favs.has(t.key));fill($('favlist'),shown.favs,'لسه مضفتش أغاني للمفضلة 🤍')}
function renderLib(){
  const ul=$('liblist'),h=$('libhead'),v=lib.v;h.innerHTML='';ul.innerHTML='';
  const songs=(arr,em)=>{shown.lib=arr;fill(ul,arr,em)};
  const G={pl:()=>new Map(Object.keys(pls).map(n=>[n,pls[n].map(k=>map.get(k)).filter(Boolean)])),ar:()=>grp(t=>t.artist),al:()=>grp(t=>t.album),fo:()=>grp(t=>t.folder)};
  if(G[v]){
    const g=G[v]();
    if(lib.open!==null){
      h.appendChild(mk('button','→ رجوع','',()=>{lib.open=null;renderLib()}));
      h.appendChild(mk('span',lib.open));
      if(v==='pl')h.appendChild(mk('button','🗑','',()=>{if(confirm('تحذف القايمة دي؟')){delete pls[lib.open];W('pls',pls);lib.open=null;renderLib()}}));
      return songs(g.get(lib.open)||[],'القايمة فاضية، ضيف أغاني من ⋮');
    }
    if(v==='pl')h.appendChild(mk('button','+ قايمة جديدة','',()=>{const n=(prompt('اسم القايمة؟')||'').trim();if(n&&!pls[n]){pls[n]=[];W('pls',pls);renderLib()}}));
    const names=[...g.keys()].sort((x,y)=>x.localeCompare(y,'ar'));
    if(!names.length){ul.appendChild(mk('li','مفيش حاجة هنا لسه','empty'));return}
    names.forEach(n=>{const li=mk('li');li.dataset.g=n;const sp=mk('span',n);sp.appendChild(mk('small',g.get(n).length+' أغنية'));li.appendChild(sp);ul.appendChild(li)});
    return;
  }
  if(v==='top')return songs(all.filter(t=>plays[t.key]).sort((x,y)=>plays[y.key]-plays[x.key]).slice(0,30),'لسه مسمعتش حاجة');
  if(v==='rec')return songs(recent.map(k=>map.get(k)).filter(Boolean),'لسه مسمعتش حاجة');
  if(v==='qu'){if(Q.length)h.appendChild(mk('button','مسح القايمة','',()=>{Q=[];renderLib()}));return songs(Q.slice(),'قايمة الانتظار فاضية، اختار "شغّلها بعد الأغنية الحالية" من ⋮')}
  const tot=Object.values(plays).reduce((x,y)=>x+y,0),top=all.slice().sort((x,y)=>(plays[y.key]||0)-(plays[x.key]||0))[0];
  [['⏱ وقت الاستماع: '+Math.floor(secs/3600)+' ساعة و '+Math.floor(secs%3600/60)+' دقيقة'],['🎵 عدد الأغاني: '+all.length],['❤️ المفضلة: '+favs.size],['▶️ مرات التشغيل: '+tot],['🏆 الأكتر تشغيلاً: '+(top&&plays[top.key]?top.name:'—')]].forEach(([t])=>ul.appendChild(mk('li',t,'stat')));
}
const renderAll=()=>{renderSongs();renderFavs();renderLib()};
$('search').oninput=renderSongs;
[['songs','songs'],['favlist','favs'],['liblist','lib']].forEach(([id,k])=>$(id).onclick=e=>{
  const g=e.target.closest('li[data-g]');if(g){lib.open=g.dataset.g;renderLib();return}
  const li=e.target.closest('li[data-n]');if(!li)return;
  const n=+li.dataset.n,t=shown[k][n];
  if(e.target.closest('.heart'))toggleFav(t.key);
  else if(e.target.closest('.more'))more(t);
  else{play(shown[k],n);tab('player')}
});
function toggleFav(k){favs.has(k)?favs.delete(k):favs.add(k);W('favs',[...favs]);renderAll();info()}
$('fav').onclick=()=>{if(cur)toggleFav(cur.key)};
function addPl(n,k){if(!pls[n])pls[n]=[];if(!pls[n].includes(k))pls[n].push(k);W('pls',pls);renderLib();toast('اتضافت لـ '+n)}
function more(t){
  const o=[['▶ شغّلها بعد الأغنية الحالية',()=>{Q.push(t);toast('اتضافت لقايمة الانتظار');renderLib()}],
    ['➕ أضف لقايمة تشغيل',()=>sheet('اختار قايمة',Object.keys(pls).map(n=>[n,()=>addPl(n,t.key)]).concat([['+ قايمة جديدة',()=>{const n=(prompt('اسم القايمة؟')||'').trim();if(n)addPl(n,t.key)}]]))],
    ['✏️ عدّل الاسم والفنان',()=>{const n=prompt('اسم الأغنية',t.name);if(n===null)return;const r=prompt('اسم الفنان',t.artist||'');if(r===null)return;edits[t.key]={n:n.trim()||t.name,a:r.trim()};W('edits',edits);rebuild();if(cur&&cur.key===t.key){cur=map.get(t.key)||cur;info()}}],
    ['🙈 اخفي الأغنية',()=>{hid.add(t.key);W('hid',[...hid]);rebuild();toast('اتخفت، تقدر ترجعها من الإعدادات')}]];
  if(lib.v==='pl'&&lib.open!==null&&pls[lib.open]&&pls[lib.open].includes(t.key))o.unshift(['➖ شيلها من القايمة دي',()=>{pls[lib.open]=pls[lib.open].filter(x=>x!==t.key);W('pls',pls);renderLib()}]);
  sheet(t.name,o);
}

/* التشغيل */
function start(t,go=true){
  cur=t;a.src=t.url;W('last',t.key);
  if(go){plays[t.key]=(plays[t.key]||0)+1;recent=[t.key].concat(recent.filter(x=>x!==t.key)).slice(0,30);W('plays',plays);W('recent',recent)}
  info();renderAll();
  if(go)a.play().catch(()=>{});
  if('mediaSession' in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:t.name,artist:t.artist||''});
}
const play=(list,n,go=true)=>{q=list;i=n;start(list[n],go)};
function info(){
  $('title').textContent=cur?cur.name:'اختار أغنية';
  $('artist').textContent=cur?cur.artist||'':'';
  $('mtitle').textContent=cur?cur.name:'';
  $('fav').textContent=cur&&favs.has(cur.key)?'❤️':'🤍';
  $('mini').hidden=!cur||$('p-player').classList.contains('on');
}
const nxt=()=>{if(Q.length){start(Q.shift());return}if(q.length)play(q,shuf?Math.floor(Math.random()*q.length):(i+1)%q.length)};
const prv=()=>{if(!q.length)return;if(a.currentTime>3){a.currentTime=0;return}play(q,(i-1+q.length)%q.length)};
const toggle=()=>{if(cur)a.paused?a.play():a.pause()};
$('play').onclick=$('mplay').onclick=toggle;
$('next').onclick=nxt;$('prev').onclick=prv;
$('shuf').onclick=()=>{shuf=!shuf;W('shuf',shuf);btns()};
$('rep').onclick=()=>{rep=!rep;W('rep',rep);btns()};
function btns(){$('shuf').classList.toggle('act',shuf);$('rep').classList.toggle('act',rep)}
a.onplay=()=>{$('play').textContent=$('mplay').textContent='❚❚';$('disc').classList.add('on');syncNotif()};
a.onpause=()=>{$('play').textContent=$('mplay').textContent='▶';$('disc').classList.remove('on');syncNotif()};
a.onloadedmetadata=()=>$('dur').textContent=fmt(a.duration);
a.ontimeupdate=()=>{
  $('cur').textContent=fmt(a.currentTime);if(a.duration)$('seek').value=a.currentTime/a.duration*100;
  if(fade&&a.duration)a.volume=Math.max(.1,Math.min(1,Math.min(a.currentTime,a.duration-a.currentTime)/2));
  else if(a.volume!==1)a.volume=1;
};
$('seek').oninput=e=>{if(a.duration)a.currentTime=e.target.value/100*a.duration};
a.onended=()=>{if(rep){a.currentTime=0;a.play()}else nxt()};
setInterval(()=>{if(!a.paused&&cur){secs++;if(secs%15===0)W('secs',secs)}},1000);
if('mediaSession' in navigator){
  navigator.mediaSession.setActionHandler('nexttrack',nxt);
  navigator.mediaSession.setActionHandler('previoustrack',prv);
  navigator.mediaSession.setActionHandler('play',toggle);
  navigator.mediaSession.setActionHandler('pause',toggle);
}

/* الإشعار والتحكم من برا التطبيق */
const NP=()=>window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()&&Capacitor.Plugins&&Capacitor.Plugins.MusicScanner;
function syncNotif(){const P=NP();if(P&&cur)P.showNotification({title:cur.name,artist:cur.artist||'',playing:!a.paused}).catch(()=>{})}
(function(){const P=NP();if(!P)return;
  P.addListener('mediaAction',e=>{
    if(!cur)return;const m=e&&e.action;
    if(m==='play')a.play().catch(()=>{});else if(m==='pause')a.pause();else if(m==='next')nxt();else if(m==='prev')prv();
  });
})();

/* الإعدادات */
function seg(id,items,get,set){
  const box=$(id);box.innerHTML='';
  const paint=()=>[...box.children].forEach(b=>b.classList.toggle('act',b._v===get()));
  items.forEach(([v,label])=>{const b=mk('button',label,'',()=>{set(v);paint()});b._v=v;box.appendChild(b)});
  paint();
}
const FM={Cairo:"'Cairo'",Tajawal:"'Tajawal'",Amiri:"'Amiri'",sys:'system-ui'};
const setFont=v=>{font=v;W('font',v);D.style.setProperty('--f',FM[v])};
seg('seg-theme',[['violet','بنفسجي'],['ocean','أزرق'],['sunset','غروب'],['night','ليلي']],()=>theme,v=>{theme=v;W('theme',v);D.dataset.theme=v});
seg('seg-font',[['Cairo','Cairo'],['Tajawal','Tajawal'],['Amiri','Amiri'],['sys','خط النظام']],()=>font,setFont);
seg('seg-fade',[[false,'إيقاف'],[true,'تشغيل']],()=>fade,v=>{fade=v;W('fade',v)});
seg('seg-sort',[['name','الاسم'],['artist','الفنان'],['new','الأحدث']],()=>sortBy,v=>{sortBy=v;W('sort',v);rebuild()});
seg('seg-speed',[[0.75,'0.75×'],[1,'عادي'],[1.25,'1.25×'],[1.5,'1.5×']],()=>speed,v=>{speed=v;W('speed',v);a.defaultPlaybackRate=a.playbackRate=v});
seg('seg-sleep',[[0,'إيقاف'],[15,'15 د'],[30,'30 د'],[60,'60 د']],()=>sleepMin,v=>{
  sleepMin=v;clearTimeout(sleepT);
  $('sleepinfo').textContent=v?'هيقف التشغيل بعد '+v+' دقيقة 😴':'';
  if(v)sleepT=setTimeout(()=>{a.pause();sleepMin=0;$('sleepinfo').textContent='وقف التشغيل 😴';
    document.querySelectorAll('#seg-sleep button').forEach(b=>b.classList.toggle('act',b._v===0))},v*60000);
});
seg('seg-lib',[['pl','قوايم'],['ar','فنانين'],['al','ألبومات'],['fo','فولدرات'],['top','الأكتر'],['rec','آخر ما سمعت'],['qu','الانتظار'],['st','إحصائيات']],()=>lib.v,v=>{lib.v=v;lib.open=null;renderLib()});
$('unhide').onclick=()=>{hid.clear();W('hid',[]);rebuild();toast('رجعت كل الأغاني')};
D.dataset.theme=theme;setFont(font);a.defaultPlaybackRate=a.playbackRate=speed;btns();

/* تحميل الأغاني */
function setAll(list,note){
  raw=list;rebuild();
  if(list.length)msg(note);else alertBox('مالقيتش أغاني في الجهاز 🤔');
  if(list.length&&NP()&&!S('notifAsked',false)){W('notifAsked',true);NP().askNotif().catch(()=>{})}
  const last=S('last',null),n=all.findIndex(t=>t.key===last);
  if(n>=0&&!cur)play(all,n,false);
}
const isApp=()=>window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform();
async function scanApp(){
  msg('بدوّر على أغانيك...');
  try{
    const P=Capacitor.Plugins&&Capacitor.Plugins.MusicScanner;
    if(!P)throw new Error('إضافة البحث مش متسجلة في التطبيق');
    const r=await P.scan(),s=r.songs||[];
    setAll(s.map(x=>({name:x.title||'بدون اسم',artist:x.artist&&x.artist!=='<unknown>'?x.artist:'',album:x.album&&x.album!=='<unknown>'?x.album:'',folder:(x.path||'').split('/').slice(-2,-1)[0]||'',added:x.added||0,key:x.path,url:Capacitor.convertFileSrc?Capacitor.convertFileSrc('file://'+encodeURI(x.path)):location.origin+'/_capacitor_file_'+encodeURI(x.path)})),'لقيت '+s.length+' أغنية 🎉');
  }catch(e){const m=(e&&e.message)||String(e);alertBox(m==='denied'?'محتاج إذن الموسيقى عشان ألاقي أغانيك 🙏\n\nافتح إعدادات الموبايل ← التطبيقات ← التطبيق ← الأذونات ← الموسيقى والصوت ← سماح، وبعدين دوس البحث تاني.':'حصلت مشكلة: '+m)}
}
const fromFiles=fs=>[...fs].filter(f=>AUD.test(f.name)||(f.type||'').startsWith('audio/')).map(f=>({name:f.name.replace(/\.[^.]+$/,''),artist:'',album:'',folder:'',added:Date.now(),key:f.name,url:URL.createObjectURL(f)}));
async function walk(d,out){for await(const [n,h] of d.entries()){if(h.kind==='file'){if(AUD.test(n))out.push(await h.getFile())}else await walk(h,out)}}
$('scan').onclick=async()=>{
  if(isApp()){await scanApp();tab('songs');return}
  if(window.showDirectoryPicker){
    try{const h=await showDirectoryPicker({mode:'read'}),o=[];await walk(h,o);setAll(fromFiles(o),'لقيت '+o.length+' أغنية 🎉');tab('songs')}catch(e){}
  }else $('files').click();
};
$('files').onchange=e=>{const l=fromFiles(e.target.files);setAll(raw.concat(l),'ضفت '+l.length+' أغنية 🎉');e.target.value='';tab('songs')};
if(isApp()){$('addl').hidden=true;scanApp()}
renderAll();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
