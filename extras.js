/* Buddy extras: hidden chats (PIN) + voice/video calls + UI polish */
(()=>{
const $=s=>document.querySelector(s),HK='buddy_hidden',PK='buddy_hpin';
const H=()=>{try{return JSON.parse(localStorage.getItem(HK)||'[]')}catch(e){return[]}};
const sha=async t=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('buddy:'+t)))].map(b=>b.toString(16).padStart(2,'0')).join('');
let revealed=false;
function pinBox(title,cb){const d=document.createElement('div');d.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center';
d.innerHTML=`<div style="background:#fff;color:#111;border-radius:22px;padding:22px;width:280px;text-align:center;font:600 15px system-ui"><div style="margin-bottom:12px">${title}</div><input type=password inputmode=numeric maxlength=8 style="width:100%;box-sizing:border-box;font-size:24px;text-align:center;letter-spacing:8px;padding:10px;border:1px solid #ddd;border-radius:12px"><div style="display:flex;gap:10px;margin-top:14px"><button data-c style="flex:1;padding:11px;border-radius:12px;border:0;background:#eee">Cancel</button><button data-o style="flex:1;padding:11px;border-radius:12px;border:0;background:#ff4f86;color:#fff">OK</button></div></div>`;
document.body.appendChild(d);const i=d.querySelector('input');i.focus();d.querySelector('[data-c]').onclick=()=>d.remove();d.querySelector('[data-o]').onclick=()=>{const v=i.value;d.remove();if(v.length>=4)cb(v);else toast('PIN must be 4-8 digits')}}
const needPin=cb=>{const h=localStorage.getItem(PK);if(!h)return pinBox('Set a hidden-chat PIN',async v=>{localStorage.setItem(PK,await sha(v));cb()});pinBox('Enter PIN',async v=>{(await sha(v))===h?cb():toast('Wrong PIN')})};
const _cl=chatList;chatList=function(){const h=H();return _cl().filter(p=>revealed||!h.includes(p.id))};
const refresh=()=>{if(route.v==='home')fillHome()};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&revealed){revealed=false;refresh()}});
let lp;const hold=(sel,fn)=>{document.addEventListener('pointerdown',e=>{const t=e.target.closest(sel);if(!t)return;lp=setTimeout(()=>{lp=0;fn(t)},800)});['pointerup','pointercancel','pointermove'].forEach(ev=>document.addEventListener(ev,()=>clearTimeout(lp)))};
hold('#nav button[data-tab="chats"]',()=>needPin(()=>{revealed=!revealed;toast(revealed?'Hidden chats shown':'Hidden chats locked');refresh()}));
hold('#chp',()=>{const pid=T.pid,h=H();if(h.includes(pid))return needPin(()=>{localStorage.setItem(HK,JSON.stringify(h.filter(x=>x!==pid)));toast('Chat unhidden')});
needPin(()=>{localStorage.setItem(HK,JSON.stringify([...h,pid]));toast('Chat hidden. Long-press Chats tab to open');goBack()})});
/* ---- calls ---- */
let pc,ls,peer,chs={},q=[],ring,ui,offerIn,kind;
const ICE={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};
function send(pid,p){let c=chs[pid];if(!c){c=sb.channel('call_'+pid);c.subscribe();chs[pid]=c}const go=()=>c.send({type:'broadcast',event:'sig',payload:{...p,from:me.id}});c.state==='joined'?go():setTimeout(go,1000)}
function ringOn(){try{const a=new AudioContext();ring=setInterval(()=>{const o=a.createOscillator();o.frequency.value=520;o.connect(a.destination);o.start();o.stop(a.currentTime+.4);navigator.vibrate&&navigator.vibrate(300)},1200)}catch(e){}}
function view(name,sub,btns){ui&&ui.remove();ui=document.createElement('div');ui.style.cssText='position:fixed;inset:0;z-index:99998;background:#0b0b12;color:#fff;font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:60px 20px 50px';
ui.innerHTML=`<video id="rv" autoplay playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video><video id="lv" autoplay playsinline muted style="position:absolute;top:60px;right:16px;width:96px;height:140px;object-fit:cover;border-radius:14px;background:#222;display:none"></video><div style="position:relative;text-align:center;text-shadow:0 1px 8px #000"><div style="font-size:26px;font-weight:800">${name}</div><div id="cs2" style="opacity:.8;margin-top:6px">${sub}</div></div><div style="position:relative;display:flex;gap:18px">${btns}</div>`;document.body.appendChild(ui)}
const cb=(id,bg,t)=>`<button id="${id}" style="width:64px;height:64px;border-radius:50%;border:0;font-size:26px;background:${bg};color:#fff">${t}</button>`;
function bindCtl(pid){const m=$('#cmu'),v=$('#cvd'),e=$('#cen');if(m)m.onclick=()=>{const t=ls.getAudioTracks()[0];t.enabled=!t.enabled;m.style.opacity=t.enabled?1:.4};if(v)v.onclick=()=>{const t=ls.getVideoTracks()[0];if(t){t.enabled=!t.enabled;v.style.opacity=t.enabled?1:.4}};e.onclick=()=>{send(pid,{t:'end'});stop()}}
function stop(){clearInterval(ring);ring=0;pc&&pc.close();pc=null;ls&&ls.getTracks().forEach(t=>t.stop());ls=null;peer=null;q=[];offerIn=null;ui&&ui.remove();ui=null}
async function media(video){try{return await navigator.mediaDevices.getUserMedia({audio:true,video:video?{facingMode:'user'}:false})}catch(e){toast('Allow mic/camera permission');return null}}
function mk(pid,video){pc=new RTCPeerConnection(ICE);ls.getTracks().forEach(t=>pc.addTrack(t,ls));pc.onicecandidate=e=>e.candidate&&send(pid,{t:'ice',c:e.candidate});
pc.ontrack=e=>{const r=$('#rv');if(r)r.srcObject=e.streams[0]};pc.onconnectionstatechange=()=>{const s=pc&&pc.connectionState,c=$('#cs2');if(s==='connected'&&c)c.textContent='Connected';if(s==='failed'||s==='disconnected'){toast('Call dropped');stop()}};
const l=$('#lv');if(video&&l){l.srcObject=ls;l.style.display='block'}}
async function start(pid,video){if(pc)return;peer=pid;kind=video?'video':'voice';ls=await media(video);if(!ls)return stop();
view(people.get(pid).name,'Calling…',(video?cb('cvd','#444','🎥'):'')+cb('cmu','#444','🎤')+cb('cen','#e53935','📵'));bindCtl(pid);mk(pid,video);
await pc.setLocalDescription(await pc.createOffer());send(pid,{t:'offer',k:kind,sdp:pc.localDescription});setTimeout(()=>{if(pc&&pc.connectionState!=='connected'){toast('No answer');send(pid,{t:'end'});stop()}},40000)}
async function accept(){clearInterval(ring);const o=offerIn,pid=o.from,video=o.k==='video';peer=pid;ls=await media(video);if(!ls){send(pid,{t:'end'});return stop()}
view(people.get(pid)?people.get(pid).name:'Buddy','Connecting…',(video?cb('cvd','#444','🎥'):'')+cb('cmu','#444','🎤')+cb('cen','#e53935','📵'));bindCtl(pid);mk(pid,video);
await pc.setRemoteDescription(o.sdp);for(const c of q)await pc.addIceCandidate(c);q=[];await pc.setLocalDescription(await pc.createAnswer());send(pid,{t:'answer',sdp:pc.localDescription})}
async function onSig(p){if(p.t==='offer'){if(pc||offerIn)return send(p.from,{t:'busy'});offerIn=p;const n=people.get(p.from);
view(n?n.name:'Buddy','Incoming '+p.k+' call',cb('cno','#e53935','✖')+cb('cye','#2ecc71','📞'));$('#cno').onclick=()=>{send(p.from,{t:'end'});stop()};$('#cye').onclick=accept;ringOn()}
else if(p.t==='answer'&&pc){await pc.setRemoteDescription(p.sdp);for(const c of q)await pc.addIceCandidate(c);q=[]}
else if(p.t==='ice'){pc&&pc.remoteDescription?pc.addIceCandidate(p.c):q.push(p.c)}
else if(p.t==='end'||p.t==='busy'){if(p.t==='busy')toast('User is busy');stop()}}
const wait=setInterval(()=>{if(typeof me!=='undefined'&&me&&typeof sb!=='undefined'){clearInterval(wait);sb.channel('call_'+me.id).on('broadcast',{event:'sig'},({payload})=>onSig(payload)).subscribe()}},700);
new MutationObserver(()=>{const s=$('.chead #cs');if(s&&!$('#cvc')&&typeof T!=='undefined'&&T){const mkb=(id,t,v)=>{const b=document.createElement('button');b.className='ib';b.id=id;b.textContent=t;b.style.fontSize='19px';b.onclick=()=>start(T.pid,v);return b};s.before(mkb('cvc','📞',false),mkb('cvv','🎥',true))}}).observe(document.body,{childList:true,subtree:true});
/* ---- polish ---- */
const st=document.createElement('style');st.textContent='.item{transition:background .15s,transform .1s}.item:active{transform:scale(.98)}.chead{backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.badge{box-shadow:0 2px 8px rgba(255,79,134,.45)}img{content-visibility:auto}';document.head.appendChild(st);
})();
