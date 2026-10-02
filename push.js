(function(){
const C=window.BUDDY_CONFIG||{};
const b64=s=>{const r=atob((s+'='.repeat((4-s.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...r].map(c=>c.charCodeAt(0)))};
let dip=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();dip=e});
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const supported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window&&!!C.VAPID_PUBLIC;
const reg=()=>navigator.serviceWorker.ready;
async function status(){
  if(!supported())return 'unsupported';
  if(Notification.permission==='denied')return 'denied';
  const s=await(await reg()).pushManager.getSubscription();
  return s&&Notification.permission==='granted'?'on':'off';
}
async function enable(sb){
  if(!supported())return 'unsupported';
  const p=await Notification.requestPermission();
  if(p!=='granted')return p;
  const r=await reg();
  let s=await r.pushManager.getSubscription();
  if(!s)s=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(C.VAPID_PUBLIC)});
  const j=s.toJSON();
  const {error}=await sb.rpc('save_push',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth});
  return error?'error':'on';
}
async function resync(sb){
  try{if(supported()&&Notification.permission==='granted'){const s=await(await reg()).pushManager.getSubscription();if(s){const j=s.toJSON();await sb.rpc('save_push',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth})}}}catch(e){}
}
async function disable(sb){
  const s=await(await reg()).pushManager.getSubscription();
  if(s){await sb.rpc('drop_push',{p_endpoint:s.endpoint});await s.unsubscribe()}
}
async function install(){if(!dip)return false;dip.prompt();const c=await dip.userChoice;dip=null;return c.outcome==='accepted'}
window.BuddyPush={supported,status,enable,disable,resync,install,canInstall:()=>!!dip,standalone};
})();
