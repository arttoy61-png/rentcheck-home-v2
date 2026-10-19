/* One Google tag, same HOME property. No hand-sent page_view events. */
(()=>{'use strict';const id='G-MPRR3J99YQ';let initialized=false,lastSite=null;
function ready(){if(initialized)return;initialized=true;if(!['rent-check.kr','www.rent-check.kr'].includes(location.hostname)&&!window.__RC_MAP_ANALYTICS_TEST__)return;
window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
gtag('js',new Date());gtag('config',id,{page_location:location.href,page_referrer:document.referrer,debug_mode:new URLSearchParams(location.search).get('rc_debug')==='1'});
const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;script.dataset.rentcheckMapAnalytics='true';document.head.append(script);}
function observe(state){if(!initialized||typeof window.gtag!=='function')return;const site=state.selected||null;if(site===lastSite)return;lastSite=site;if(site)gtag('event','map_site_open',{site_id:String(site),map_section:'redevelopment',send_to:id});}
window.RentHomeMapAnalytics={ready,observe};})();
