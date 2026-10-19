/* User-operated session-only Kakao SDK connection. Never stores or logs the key. */
(()=>{'use strict';
const input=document.querySelector('#kakaoSessionKey'),button=document.querySelector('#connectKakao'),status=document.querySelector('#kakaoConnectionStatus');
let latest=null,ready=false,busy=false,started=false,selected=null,script=null,timer=null,attempt=0;
function message(text){status.textContent=text;}
function sync(opts){latest=opts;if(!ready)return;document.querySelector('#kakaoMap').hidden=false;document.querySelector('#map').style.visibility='hidden';document.querySelector('.mapcanvas').classList.add('kakao-connected');
if(!started){started=window.RentKakaoMap.start({container:'#kakaoMap',statusSelector:'#kakaoMapStatus',onPick:(id,open,kind)=>latest?.onPick(id,open,kind),onMove:(c,tab)=>{if(latest?.tab===tab)latest.onMove?.(c);}});if(!started)throw Error('map unavailable');}
window.RentKakaoMap.update(opts);
}
function fail(){++attempt;clearTimeout(timer);script?.remove();script=null;busy=false;ready=false;input.disabled=false;const panel=document.querySelector('.kakao-connect');if(panel)panel.hidden=false;document.querySelector('#kakaoMap').hidden=true;document.querySelector('#map').style.visibility='';document.querySelector('.mapcanvas').classList.remove('kakao-connected');button.disabled=false;button.textContent='지도 연결 다시 시도';input.value='';message('연결하지 못했습니다. JavaScript 키와 등록 도메인을 확인한 뒤 다시 입력해 주세요. 키 값은 표시하지 않습니다.');}
button.addEventListener('click',()=>{if(busy||ready)return;let key=input.value.trim();if(!/^[a-f0-9]{32}$/i.test(key)){message('카카오 JavaScript 키 형식을 확인해 주세요.');return;}
const current=++attempt;busy=true;button.disabled=true;message('카카오에 지도 연결을 요청하고 있습니다…');script=document.createElement('script');script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';script.src='https://dapi.kakao.com/v2/maps/sdk.js?appkey='+encodeURIComponent(key)+'&autoload=false&libraries=services';key='';input.value='';
script.onerror=()=>{if(current===attempt)fail();};script.onload=()=>{if(current!==attempt)return;script?.remove();script=null;try{if(!window.kakao?.maps?.load){fail();return;}window.kakao.maps.load(()=>{if(current!==attempt)return;try{ready=true;if(latest)sync(latest);clearTimeout(timer);busy=false;input.value='';input.disabled=true;button.textContent='이 탭에서 연결됨';const badge=document.querySelector('.private');if(badge)badge.textContent='재개발 지도 · 카카오 연결';const panel=document.querySelector('.kakao-connect');if(panel)panel.hidden=true;window.RentKakaoMap.resize();message('카카오 지도 연결됨 · 재개발 지도에 연결됐습니다. 새로고침하면 키를 다시 입력해야 합니다.');}catch{fail();}});}catch{fail();}};
timer=setTimeout(fail,20000);document.head.append(script);
});
window.RentKakaoSession={sync,isActive:()=>ready,activeTab:()=>window.RentKakaoMap.activeTab?.()};
})();

