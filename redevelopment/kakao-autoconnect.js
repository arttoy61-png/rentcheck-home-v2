/* Automatic browser-key setup; preserves the approved Sites34 map engine. */
(()=>{'use strict';
function start(){
 const config=window.RENTCHECK_MAP_CONFIG||{};
 const key=String(config.kakaoJavaScriptKey||'').trim();
 const input=document.querySelector('#kakaoSessionKey');
 const button=document.querySelector('#connectKakao');
 const status=document.querySelector('#kakaoConnectionStatus');
 if(config.autoConnect===false||!input||!button||!/^[a-f0-9]{32}$/i.test(key))return;
 input.hidden=true;
 document.querySelector('label[for="kakaoSessionKey"]')?.setAttribute('hidden','');
 const panel=document.querySelector('.kakao-connect');
 const summary=panel?.querySelector('summary');
 const description=panel?.querySelector('details > p');
 if(summary)summary.textContent='카카오 지도 연결 상태';
 if(description)description.textContent='페이지를 열면 카카오 지도에 자동 연결합니다. 방문자가 키를 입력할 필요는 없습니다.';
 button.textContent='지도 연결 다시 시도';
 button.addEventListener('click',()=>{input.value=key;},true);
 if(status){
  const observer=new MutationObserver(()=>{
   const text=status.textContent||'';
   if(text.includes('새로고침하면 키를 다시 입력해야'))status.textContent='카카오 지도 연결됨 · 새로고침 후에도 자동으로 연결합니다.';
   else if(text.includes('연결하지 못했습니다. JavaScript 키'))status.textContent='카카오 지도에 연결하지 못했습니다. 등록 도메인과 지도 API 활성화 상태를 확인한 뒤 다시 시도해 주세요. 보조 지도와 검색은 계속 사용할 수 있습니다.';
  });
  observer.observe(status,{childList:true,subtree:true,characterData:true});
 }
 button.click();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
