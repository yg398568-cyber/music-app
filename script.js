const $=id=>document.getElementById(id),a=new Audio();
const S=(k,d)=>{try{const v=localStorage.getItem('p_'+k);return v===null?d:JSON.parse(v)}catch(e){return d}};
const W=(k,v)=>{try{localStorage.setItem('p_'+k,JSON.stringify(v))}catch(e){}};
let all=[],q=[],i=-1,cur=null,sleepT=null,shown={songs:[],favs:[]};
let favs=new Set(S('favs',[])),shuf=S('shuf',false),rep=S('rep',false),speed=S('speed',1),theme=S('theme','violet');
const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
let toastT;
function toast(t){const e=$('toast');e.textContent=t;e.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,3000)}
function alertBox(t){$('mtext').textContent=t;$('modal').hidden=false}
$('mok').onclick=()=>$('modal').hidden=true;
const msg=t=>{$('msg').textContent=t;toast(t)};
const AUD=/\.(mp3|m4a|aac|wav|ogg|opus|flac|wma|amr)$/i;

/* الأقسام */
function tab(n){
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on',p.id==='p-'+n));
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===n));
  $('mini').hidden=!cur||n==='player';
}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
$('mini').onclick=e=>{if(!e.target.closest('#mplay'))tab('player')};

/* القوايم */
function fill(ul,arr,empty){
  ul.innerHTML='';
  if(!arr.length){ul.innerHTML='<li class="empty">'+empty+'</li>';return}
  const f=document.createDocumentFragment();
  arr.forEach((t,n)=>{
    const li=document.createElement('li');li.dataset.n=n;
    if(cur&&cur.key===t.key)li.className='cur';
    const sp=document.createElement('span');sp.textContent=t.name;
    if(t.artist){const sm=document.createElement('small');sm.textContent=t.artist;sp.appendChild(sm)}
    const b=document.createElement('button');b.className='heart';b.textContent=favs.has(t.key)?'❤️':'🤍';b.setAttribute('aria-label','مفضلة');
    li.append(sp,b);f.appendChild(li);
  });
  ul.appendChild(f);
}
function renderSongs(){
  const s=$('search').value.trim().toLowerCase();
  shown.songs=all.filter(t=>!s||(t.name+' '+t.artist).toLowerCase().includes(s));
  fill($('songs'),shown.songs,all.length?'مفيش نتايج':'لسه مفيش أغاني، روح الإعدادات ودوس "دوّر على أغاني جهازك"');
}
function renderFavs(){
  shown.favs=all.filter(t=>favs.has(t.key));
  fill($('favlist'),shown.favs,'لسه مضفتش أغاني للمفضلة 🤍');
}
const renderAll=()=>{renderSongs();renderFavs()};
$('search').oninput=renderSongs;
[['songs','songs'],['favlist','favs']].forEach(([id,k])=>$(id).onclick=e=>{
  const li=e.target.closest('li[data-n]');if(!li)return;
  const n=+li.dataset.n,t=shown[k][n];
  if(e.target.closest('.heart'))toggleFav(t.key);else{play(shown[k],n);tab('player')}
});
function toggleFav(k){favs.has(k)?favs.delete(k):favs.add(k);W('favs',[...favs]);renderAll();info()}
$('fav').onclick=()=>{if(cur)toggleFav(cur.key)};

/* التشغيل */
function play(list,n,go=true){
  q=list;i=n;cur=q[n];a.src=cur.url;W('last',cur.key);
  info();renderAll();
  if(go)a.play().catch(()=>{});
  if('mediaSession' in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:cur.name,artist:cur.artist||''});
}
function info(){
  $('title').textContent=cur?cur.name:'اختار أغنية';
  $('artist').textContent=cur?cur.artist||'':'';
  $('mtitle').textContent=cur?cur.name:'';
  $('fav').textContent=cur&&favs.has(cur.key)?'❤️':'🤍';
  $('mini').hidden=!cur||document.getElementById('p-player').classList.contains('on');
}
const nxt=()=>{if(q.length)play(q,shuf?Math.floor(Math.random()*q.length):(i+1)%q.length)};
const prv=()=>{if(!q.length)return;if(a.currentTime>3){a.currentTime=0;return}play(q,(i-1+q.length)%q.length)};
const toggle=()=>{if(cur)a.paused?a.play():a.pause()};
$('play').onclick=$('mplay').onclick=toggle;
$('next').onclick=nxt;$('prev').onclick=prv;
$('shuf').onclick=()=>{shuf=!shuf;W('shuf',shuf);btns()};
$('rep').onclick=()=>{rep=!rep;W('rep',rep);btns()};
function btns(){$('shuf').classList.toggle('act',shuf);$('rep').classList.toggle('act',rep)}
a.onplay=()=>{$('play').textContent=$('mplay').textContent='❚❚';$('disc').classList.add('on')};
a.onpause=()=>{$('play').textContent=$('mplay').textContent='▶';$('disc').classList.remove('on')};
a.onloadedmetadata=()=>$('dur').textContent=fmt(a.duration);
a.ontimeupdate=()=>{$('cur').textContent=fmt(a.currentTime);if(a.duration)$('seek').value=a.currentTime/a.duration*100};
$('seek').oninput=e=>{if(a.duration)a.currentTime=e.target.value/100*a.duration};
a.onended=()=>{if(rep){a.currentTime=0;a.play()}else nxt()};
if('mediaSession' in navigator){
  navigator.mediaSession.setActionHandler('nexttrack',nxt);
  navigator.mediaSession.setActionHandler('previoustrack',prv);
  navigator.mediaSession.setActionHandler('play',toggle);
  navigator.mediaSession.setActionHandler('pause',toggle);
}

/* الإعدادات */
function seg(id,items,get,set){
  const box=$(id);box.innerHTML='';
  items.forEach(([v,label])=>{
    const b=document.createElement('button');b.textContent=label;
    b.onclick=()=>{set(v);paint()};box.appendChild(b);b._v=v;
  });
  function paint(){[...box.children].forEach(b=>b.classList.toggle('act',b._v===get()))}
  paint();
}
let sleepMin=0;
seg('seg-theme',[['violet','بنفسجي'],['ocean','أزرق'],['sunset','غروب']],()=>theme,v=>{theme=v;W('theme',v);document.documentElement.dataset.theme=v});
seg('seg-speed',[[0.75,'0.75×'],[1,'عادي'],[1.25,'1.25×'],[1.5,'1.5×']],()=>speed,v=>{speed=v;W('speed',v);a.defaultPlaybackRate=a.playbackRate=v});
seg('seg-sleep',[[0,'إيقاف'],[15,'15 د'],[30,'30 د'],[60,'60 د']],()=>sleepMin,v=>{
  sleepMin=v;clearTimeout(sleepT);
  $('sleepinfo').textContent=v?'هيقف التشغيل بعد '+v+' دقيقة 😴':'';
  if(v)sleepT=setTimeout(()=>{a.pause();sleepMin=0;$('sleepinfo').textContent='وقف التشغيل 😴';
    document.querySelectorAll('#seg-sleep button').forEach(b=>b.classList.toggle('act',b._v===0))},v*60000);
});
document.documentElement.dataset.theme=theme;
a.defaultPlaybackRate=a.playbackRate=speed;btns();

/* تحميل الأغاني */
function setAll(list,note){
  all=list;renderAll();
  if(list.length)msg(note);else alertBox('مالقيتش أغاني في الجهاز 🤔');
  const last=S('last',null),n=all.findIndex(t=>t.key===last);
  if(n>=0&&!cur)play(all,n,false);
}
const isApp=()=>window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform();
async function scanApp(){
  msg('بدوّر على أغانيك...');
  try{
    const P=Capacitor.Plugins&&Capacitor.Plugins.MusicScanner;
    if(!P)throw new Error('إضافة البحث مش متسجلة في التطبيق');
    const r=await P.scan();
    setAll((r.songs||[]).sort((x,y)=>(x.title||'').localeCompare(y.title||'','ar')).map(x=>({name:x.title||'بدون اسم',artist:x.artist&&x.artist!=='<unknown>'?x.artist:'',key:x.path,url:Capacitor.convertFileSrc?Capacitor.convertFileSrc('file://'+encodeURI(x.path)):location.origin+'/_capacitor_file_'+encodeURI(x.path)})),'لقيت '+(r.songs||[]).length+' أغنية 🎉');
  }catch(e){const m=(e&&e.message)||String(e);alertBox(m==='denied'?'محتاج إذن الموسيقى عشان ألاقي أغانيك 🙏\n\nافتح إعدادات الموبايل ← التطبيقات ← التطبيق ← الأذونات ← الموسيقى والصوت ← سماح، وبعدين دوس البحث تاني.':'حصلت مشكلة: '+m)}
}
const fromFiles=fs=>[...fs].filter(f=>AUD.test(f.name)||(f.type||'').startsWith('audio/')).map(f=>({name:f.name.replace(/\.[^.]+$/,''),artist:'',key:f.name,url:URL.createObjectURL(f)}));
async function walk(d,out){for await(const [n,h] of d.entries()){if(h.kind==='file'){if(AUD.test(n))out.push(await h.getFile())}else await walk(h,out)}}
$('scan').onclick=async()=>{
  if(isApp()){await scanApp();tab('songs');return}
  if(window.showDirectoryPicker){
    try{const h=await showDirectoryPicker({mode:'read'}),o=[];await walk(h,o);setAll(fromFiles(o),'لقيت '+o.length+' أغنية 🎉');tab('songs')}catch(e){}
  }else $('files').click();
};
$('files').onchange=e=>{const l=fromFiles(e.target.files);setAll(all.concat(l),'ضفت '+l.length+' أغنية 🎉');e.target.value='';tab('songs')};
if(isApp()){$('addl').hidden=true;scanApp()}
renderAll();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
