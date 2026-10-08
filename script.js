const a=new Audio(),$=id=>document.getElementById(id);
let q=[],i=-1,shuf=false,rep=false;
const fmt=s=>isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
function render(){
  const l=$('list');
  if(!q.length){l.innerHTML='<li class="empty">القايمة فاضية</li>';return}
  l.innerHTML='';
  q.forEach((t,n)=>{const li=document.createElement('li');if(n===i)li.className='cur';
    li.innerHTML='<small>'+(n+1)+'</small><span></span>';li.querySelector('span').textContent=t.name;
    li.onclick=()=>load(n,true);l.appendChild(li)});
}
function load(n,go){
  if(n<0||n>=q.length)return;i=n;a.src=q[n].url;
  $('title').textContent=q[n].name;$('sub').textContent='أغنية '+(n+1)+' من '+q.length;
  render();if(go)a.play().catch(()=>{});
  if('mediaSession' in navigator)navigator.mediaSession.metadata=new MediaMetadata({title:q[n].name});
}
function nxt(){if(!q.length)return;load(shuf?Math.floor(Math.random()*q.length):(i+1)%q.length,true)}
function prv(){if(!q.length)return;if(a.currentTime>3){a.currentTime=0;return}load((i-1+q.length)%q.length,true)}
$('files').onchange=e=>{
  const was=q.length;
  [...e.target.files].forEach(f=>q.push({name:f.name.replace(/\.[^.]+$/,''),url:URL.createObjectURL(f)}));
  if(q.length&&i<0)load(0,true);else render();
  e.target.value='';
};
$('play').onclick=()=>{if(i<0)return;a.paused?a.play():a.pause()};
$('next').onclick=prv;$('prev').onclick=nxt;
$('shuf').onclick=e=>{shuf=!shuf;e.currentTarget.classList.toggle('act',shuf)};
$('rep').onclick=e=>{rep=!rep;e.currentTarget.classList.toggle('act',rep)};
a.onplay=()=>{$('play').textContent='❚❚';$('disc').classList.add('on')};
a.onpause=()=>{$('play').textContent='▶';$('disc').classList.remove('on')};
a.onloadedmetadata=()=>$('dur').textContent=fmt(a.duration);
a.ontimeupdate=()=>{$('cur').textContent=fmt(a.currentTime);if(a.duration)$('seek').value=a.currentTime/a.duration*100};
$('seek').oninput=e=>{if(a.duration)a.currentTime=e.target.value/100*a.duration};
a.onended=()=>{if(rep){a.currentTime=0;a.play()}else nxt()};
if('mediaSession' in navigator){
  navigator.mediaSession.setActionHandler('nexttrack',nxt);
  navigator.mediaSession.setActionHandler('previoustrack',prv);
}

/* ===== اكتشاف الأغاني من فولدر ===== */
const AUD=/\.(mp3|m4a|aac|wav|ogg|opus|flac|wma|amr)$/i;
const msg=t=>$('msg').textContent=t;
function db(){return new Promise((ok,no)=>{const r=indexedDB.open('player',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function kv(mode,key,val){try{const d=await db();return await new Promise((ok,no)=>{const tx=d.transaction('kv',mode==='r'?'readonly':'readwrite'),s=tx.objectStore('kv'),r=mode==='r'?s.get(key):s.put(val,key);r.onsuccess=()=>ok(r.result);r.onerror=()=>no()})}catch(e){return null}}
function setQueue(files){
  files=files.filter(f=>AUD.test(f.name)||(f.type||'').startsWith('audio/'));
  if(!files.length){msg('مالقيتش أغاني في المكان ده 🤔');return}
  files.sort((x,y)=>x.name.localeCompare(y.name,'ar'));
  a.pause();q.forEach(t=>URL.revokeObjectURL(t.url));
  q=files.map(f=>({name:f.name.replace(/\.[^.]+$/,''),url:URL.createObjectURL(f)}));
  i=-1;load(0,false);msg('لقيت '+q.length+' أغنية 🎉');
}
async function walk(dir,out){
  for await(const [n,h] of dir.entries()){
    if(h.kind==='file'){if(AUD.test(n))out.push(await h.getFile())}
    else await walk(h,out);
  }
}
async function scanHandle(h){
  msg('بدوّر...');const out=[];
  try{await walk(h,out);setQueue(out)}catch(e){msg('حصلت مشكلة في القراءة، جرّب تاني')}
}
$('scan').onclick=async()=>{
  if(window.showDirectoryPicker){
    try{
      const h=await showDirectoryPicker({mode:'read'});
      await kv('w','dir',h);$('rescan').hidden=false;await scanHandle(h);
    }catch(e){if(e.name!=='AbortError')$('dir').click()}
  }else $('dir').click();
};
$('dir').onchange=e=>{setQueue([...e.target.files]);e.target.value=''};
$('rescan').onclick=async()=>{
  const h=await kv('r','dir');if(!h){$('rescan').hidden=true;return}
  try{
    if(await h.requestPermission({mode:'read'})==='granted')await scanHandle(h);
    else msg('لازم توافق على الإذن عشان أقدر أقرا الأغاني');
  }catch(e){msg('الفولدر ده مبقاش متاح، اختاره من جديد')}
};
kv('r','dir').then(h=>{if(h)$('rescan').hidden=false});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
