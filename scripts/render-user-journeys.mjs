/** User journeys: additive presentation only; never changes calculator formulas or feeds. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const read=p=>fs.readFileSync(p,'utf8');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const changes=new Set();
function put(p,s){if(!fs.existsSync(p)||read(p)!==s){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);changes.add(p)}}
function extract(s,re,label){const m=s.match(re);assert(m,`Missing source: ${label}`);return m[1]}
function swap(s,a,b,label){if(s.includes(b))return s;assert(s.split(a).length===2,`Changed anchor: ${label}`);return s.replace(a,b)}
function block(s,name,html,at){const a=`<!-- rc-journey:${name} -->`,b=`<!-- /rc-journey:${name} -->`;if(s.includes(a)){const start=s.indexOf(a),end=s.indexOf(b,start);assert(end>start);return s.slice(0,start)+a+html+b+s.slice(end+b.length)}assert(at>=0);return s.slice(0,at)+a+html+b+s.slice(at)}
function rootBounds(s){const start=s.indexOf('<body');const m=/<(main|div)\b[^>]*(?:class="[^"]*\b(?:page|v2-tool-main|wrap|container)\b[^"]*")[^>]*>/.exec(s.slice(start));assert(m,'Missing tool wrapper');const at=start+m.index,openEnd=at+m[0].length,tag=m[1],re=new RegExp(`<\\/?${tag}\\b[^>]*>`,'g');re.lastIndex=openEnd;let depth=1;for(let n;(n=re.exec(s));){depth+=n[0].startsWith('</')?-1:1;if(!depth)return {openEnd,end:n.index}}throw Error('Unbalanced tool wrapper')}
const extra={
 'brokerage-fee':{
  title:'계산된 상한과 실제로 지급할 중개보수는 구분하세요',
  lead:'이 계산기는 서울 기준으로 선택한 물건과 거래 방식에 적용되는 중개보수 상한을 비교합니다. 결과가 곧 청구서나 약정금액은 아닙니다. 주택·오피스텔·상가 구분, 월세 환산금액, 부가가치세 별도 여부를 함께 확인하세요.',
  steps:['계약할 물건의 종류와 거래 방식을 고릅니다. 오피스텔은 면적과 설비 질문도 확인합니다.','금액은 만원 단위입니다. 월세는 보증금과 월 임대료를 따로 입력합니다.','결과의 적용 거래금액·상한요율·한도액을 보고 실제 약정 보수와 비교합니다.'],
  example:'가정 예시: 보증금 1,000만원에 월세 50만원이면 이 도구의 환산 거래금액은 1,000만원 + 50만원 × 100 = 6,000만원입니다. 매매가격을 넣는 칸과 혼동하지 마세요. 실제 보수는 선택한 물건 유형에 따라 결과에서 확인합니다.',
  caution:'서울 외 지역, 복합건물, 설비가 다른 오피스텔은 적용 기준을 별도로 확인해야 합니다. 결과에는 부가가치세가 별도이며, 상한 이내에서 약정한 금액과 구분하세요.',
  source:'계산 기준과 적용범위는 위 계산 기준 및 서울시 요율표 링크에서 확인합니다. 이번 보완은 이용 안내이며 세율 변경이나 개별 계약 검수가 아닙니다.',
  related:[['blog/brokerage-fee-check/','계산한 중개보수와 계약서 대조'],['blog/registration-cost-budget/','그 밖의 계약·등기 비용 확인']]
 },
 'rent-vs-monthly':{
  title:'월 환산비용은 실제 월세 청구액과 다릅니다',
  lead:'전세와 월세를 비교할 때는 월세뿐 아니라 보증금으로 묶이는 돈의 비용도 같은 기준으로 봐야 합니다. 이 도구는 양쪽 보증금에 같은 연 자금비용률을 적용합니다. 자기 돈과 대출 비율이 다른 계약의 실제 이자 청구액을 그대로 계산하는 도구는 아닙니다.',
  steps:['전세보증금과 월세 계약의 보증금·월세를 만원 단위로 입력합니다.','연 자금비용은 비교 가정입니다. 실제 대출금리 또는 내 돈을 다른 용도로 쓸 때의 비용을 참고해 정합니다.','월 차이를 확인한 다음 관리비·이사비·보증료와 보증금 회수 조건을 따로 비교합니다.'],
  example:'가정 예시: 전세 3억원과 보증금 5,000만원·월세 100만원을 연 4%로 비교하면 월 환산비용은 전세 100만원, 월세 약 116만6,667원입니다. 차이는 월 약 16만6,667원입니다. 이 숫자는 실제 월세 100만원에 보증금 자금비용을 더한 비교값입니다.',
  caution:'관리비·보증료·세액공제·이사비·중도상환수수료는 결과에 포함되지 않습니다. 비용이 낮다는 결과가 보증금 안전성이나 해당 집의 품질을 보증하지 않습니다.',
  source:'산식: 전세보증금 × 연 자금비용 ÷ 12 / 월세보증금 × 연 자금비용 ÷ 12 + 월세. 예시는 실제 매물이나 대출 제안이 아닌 산술 비교입니다.',
  related:[['blog/jeonse-vs-monthly-cost/','환산비용과 실제 지출 구분'],['blog/maintenance-fee-rent-compare/','관리비까지 합쳐 비교'],['blog/jeonse-safety/','보증금 안전 확인 순서']]
 },
 'rent-yield':{
  title:'표시 수익률보다 실제로 남는 돈과 빠진 비용을 보세요',
  lead:'단순 임대수익률은 연 월세를 매매가로 나눈 값이고, 세전 현금수익률은 이자·입력한 비용을 뺀 연 실수익을 실투자금으로 나눈 값입니다. 분모와 포함 비용이 다르므로 서로 다른 매물의 광고 수익률을 그대로 비교하지 마세요.',
  steps:['매매가·보증금·월세를 만원 단위로 넣고 대출비율과 이율을 실제 검토 조건에 맞춥니다.','공실·미수율, 보유·운영비, 초기비용을 입력합니다. 확인하지 않은 비용을 0원으로 확정하지 마세요.','실투자금과 월 현금흐름을 먼저 확인하고, 공실·금리 가정을 바꿔 결과 차이를 봅니다.'],
  example:'단순화한 가정: 매매가 3억원, 보증금 3,000만원, 월세 100만원이며 대출·취득비용·운영비를 모두 제외하면 실투자금은 2억7,000만원, 연 월세는 1,200만원입니다. 현금수익률은 약 4.44%, 매매가 기준 단순 수익률은 4.00%입니다. 비용을 제외한 설명용 예시이지 예상 실수익 보장이 아닙니다.',
  caution:'원금상환·소득세·법인세·매각손익·보증금 반환 위험은 포함하지 않습니다. 보증금은 나중에 돌려줄 돈입니다. 대출이나 보증금으로 실투자금이 작아졌다고 위험까지 줄어드는 것은 아닙니다.',
  source:'산식은 위 계산 내역과 계산 기준에 표시됩니다. 취득 관련 세금의 자동 참고값과 최종 적용 세율은 실제 거래 시 공식 기준으로 다시 확인하세요.',
  related:[['blog/rent-yield-good-rate/','수익률과 공실·이자 함께 읽기'],['blog/registration-cost-budget/','초기 비용 항목 확인'],['tools/neighborhood-price/','입력 월세를 실거래와 비교']]
 },
 'tenant-message':{
  title:'문자는 자동 발송되지 않습니다. 계약 상황을 확인하고 복사하세요',
  lead:'상황별 문구를 만드는 보조도구입니다. 세입자·집주인 입장과 요청 목적을 선택한 뒤 실제 계약과 다른 표현이 없는지 읽어보세요. 문구를 만들었다는 사실만으로 계약 해지나 보증금 반환 일정이 확정되는 것은 아닙니다.',
  steps:['내 입장과 계약 갱신·수리·퇴거·보증금 등 해당 상황을 고릅니다.','날짜·금액·요청 내용을 확인하고 본인 계약에 맞지 않는 표현을 고칩니다.','복사한 문구를 직접 보내고 발송일·수신 여부·합의 내용을 따로 보관합니다.'],
  example:'확인할 날짜가 정해지지 않았다면 확정일처럼 적지 말고 협의 요청으로 표현하세요. 예를 들어 원하는 이사일과 보증금 반환 가능일이 서로 맞는지 묻는 문장으로 시작할 수 있습니다.',
  caution:'분쟁 중인 계약의 법적 효력이나 상대방의 의무를 자동 판정하지 않습니다. 연락처·계좌·주민등록번호 등 민감한 정보는 오류 제보에 넣지 마세요.',
  source:'상황별 문구 작성 보조용입니다. 계약 유형에 따른 차이는 관련 가이드와 해당 계약서에서 확인합니다.',
  related:[['blog/early-move-deposit-return/','중도퇴거와 보증금 반환 확인'],['blog/tacit-renewal-move-out-3-months/','갱신된 계약인지 먼저 구분']]
 }
};
const interpretations={
 apartment:'표시된 금액은 해당 조건의 신고 사례입니다. 한 건의 가격을 감정가나 매물 호가로 받아들이지 말고 같은 면적의 계약일·층·거래유형을 나란히 보세요.',
 'neighborhood-price':'거래가 없거나 적게 나오는 결과는 가격이 0원이거나 싼 집이라는 뜻이 아닙니다. 집 종류를 유지한 채 면적·지역 조건을 한 단계씩 넓혀 비교하세요.',
 redevelopment:'예상 분담금은 권리가액과 조합원 분양가를 넣은 시나리오입니다. 감정평가액을 모르면 매매가로 자동 대체하지 말고 여러 가정값을 구분해 비교하세요. 확정 청구액이 아닙니다.',
 'youth-score':'선택한 순위 안에서의 참고 가점입니다. 자격 충족·서류 인정·당첨 여부는 다른 판단입니다. 신혼부부·행복주택 등 지원하지 않는 유형의 자격을 이 결과로 판정하지 마세요.',
 'longterm-jeonse-51':'선택한 단지·면적에 해당하는 제51차 일반공급 참고 결과입니다. 다른 회차로 적용하지 말고 실제 접수 진행 여부와 동순위 기준을 해당 공고에서 확인하세요.',
 'rent-check':'현재 도구 화면에 안내된 화곡동 자료 범위 안에서 비교합니다. 표본이 적거나 조건이 다른 경우 결과를 시세 확정으로 쓰지 마세요. 강서구 다른 동은 동네시세에서 비교할 수 있습니다.',
 'jeonse-ratio':'예를 들어 80%는 전세보증금이 입력한 매매가의 80%라는 뜻입니다. 돌려받을 확률 80%나 안전점수가 아닙니다.',
 'rent-conversion':'보증금 조정액은 현재 보증금 전체가 아니라 바꾸는 차액입니다. 월세 조정액과 조정 후 월세를 구분하세요. 적용 전환율과 법정 상한 참고값도 서로 다른 값입니다.',
 'brokerage-fee':'최대 중개보수는 계산 조건에 따른 상한 참고값입니다. 실제 약정액·부가가치세 포함 여부·적용 지역을 확인한 뒤 지급 금액과 비교하세요.',
 'rent-vs-monthly':'전세 월 환산비용과 월세 월 환산비용의 차이입니다. 보증금 전체에 같은 비용률을 적용한 가정이므로 실제 통장에서 나가는 이자·월세와 구분하세요.',
 'rent-yield':'수익률의 분모가 매매가인지 실투자금인지 확인하세요. 공실·비용을 낮게 넣으면 결과가 높아집니다. 세전 수익률이며 매각 시 손익은 계산하지 않습니다.',
 'tenant-message':'문구는 검토할 초안입니다. 복사·발송·상대방의 확인·합의는 각각 별개 단계입니다.'
};
function copies(){const common=read('tools/tool-common.js');const object=extract(common,/const contentGuide=([\s\S]*?);\s*const join=/,'existing tool guide');return {...vm.runInNewContext('('+object+')',Object.create(null),{timeout:1000}),...extra}}
function css(){const common=read('tools/tool-common.js');return extract(common,/style\.id='v2-content-guide-style';\s*style\.textContent='([^']*)';/,'guide styles')+'\n/* Only the explanatory panel is restyled; inputs and results are untouched. */\n.v2-content-guide{overflow-wrap:anywhere}.v2-content-guide__lead,.v2-content-guide li,.v2-content-guide__box,.v2-content-guide__faq summary,.v2-content-guide__faq p{font-size:14px;line-height:1.8}.v2-content-guide__source{font-size:12px;color:#4f5a68}.v2-content-guide__link{font-size:14px;padding:10px 14px;line-height:1.5;max-width:100%}.rc-tool-reading-nav{display:flex;flex-wrap:wrap;gap:8px 16px;margin:0 0 12px;font-size:13px}.rc-tool-reading-nav a,.rc-tool-help a{color:#1565c0;text-underline-offset:3px}.rc-tool-help{font-size:13px;line-height:1.7;margin:16px 0 0}.rc-tool-interpretation{scroll-margin-top:90px}.v2-result-next{flex-wrap:wrap;gap:8px!important}.v2-result-next a{white-space:normal!important;line-height:1.5!important}.v2-content-guide :focus-visible,.rc-tool-reading-nav :focus-visible{outline:3px solid #1565c0;outline-offset:3px}.v2-content-guide__source a{color:#1565c0}\n'}
export function renderUserJourneys(){
 const guides=copies();put('tools/tool-guides.css',css());
 const tools=JSON.parse(read('data/tools.json')).filter(x=>x.status==='available'&&x.url);
 for(const tool of tools){
  const p=tool.url.replace(/^\//,'')+'index.html';let s=read(p);
  const id=extract(s,/<body\b[^>]*data-tool-id="([^"]+)"/,'tool ID');const g=guides[id];assert(g,`No guide for ${id}`);
  const prefix=id==='redevelopment'?'../':'../../';
  const existing=s.match(/<!-- rc-static:tool-guide -->[\s\S]*?<!-- \/rc-static:tool-guide -->/);
  if(existing)s=s.replace(existing[0],'');
  s=s.replace(/<!-- rc-static:tool-style -->[\s\S]*?<!-- \/rc-static:tool-style -->/g,'');
  const faq=(g.faq||[]).map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
  const links=(g.related||[]).map(([href,label],i)=>{assert(fs.existsSync(href+'index.html'),`Missing related page: ${href}`);return `<a class="v2-content-guide__link${i?' alt':''}"${i?'':' data-primary-guide="true"'} href="${prefix}${esc(href)}">${esc(label)} →</a>`}).join('');
  const html=`<section class="v2-content-guide" data-journey-version="20260925" aria-labelledby="v2-content-guide-title"><p class="v2-content-guide__eyebrow">入力の前後に確認</p><h2 id="v2-content-guide-title">${esc(g.title)}</h2><p class="v2-content-guide__lead">${esc(g.lead)}</p><ol>${g.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="v2-content-guide__box v2-content-guide__example rc-tool-interpretation" id="rc-guide-interpretation"><strong>결과는 이렇게 읽으세요</strong><br>${esc(interpretations[id])}</div><div class="v2-content-guide__box v2-content-guide__example"><strong>비교 예시</strong><br>${esc(g.example)}</div><div class="v2-content-guide__box v2-content-guide__caution"><strong>이 결과로 확정할 수 없는 것</strong><br>${esc(g.caution)}</div>${faq?`<div class="v2-content-guide__faq"><h3>자주 묻는 질문</h3>${faq}</div>`:''}<p class="v2-content-guide__source">${esc(g.source)}</p><h3 id="rc-guide-next" style="margin:18px 0 8px;font-size:16px;color:#0d1f3c">확인한 뒤, 다음 단계</h3><nav class="v2-content-guide__links" aria-label="관련 Rent Check 페이지">${links}</nav><p class="rc-tool-help"><a href="${prefix}about/">자료·계산 안내 원칙</a> · <a href="${prefix}contact/">계산·표시 오류 제보</a></p><noscript><p class="rc-tool-help">계산 버튼은 JavaScript가 켜진 브라우저에서 작동합니다. 사용 설명과 관련 글은 이 상태에서도 읽을 수 있습니다.</p></noscript></section>`.replace('入力の前後に確認','입력 전 확인 · 결과 해석');
  s=block(s,'tool-guide',html,rootBounds(s).end);
  s=block(s,'tool-nav','<nav class="rc-tool-reading-nav" aria-label="도구 사용 안내"><a href="#v2-content-guide-title">입력 전 확인</a><a href="#rc-guide-interpretation">결과 해석</a><a href="#rc-guide-next">다음 행동</a></nav>',rootBounds(s).openEnd);
  const cssHref=id==='redevelopment'?'../tools/tool-guides.css':'../tool-guides.css';
  s=block(s,'tool-style',`<link rel="stylesheet" href="${cssHref}?v=20260925">`,s.indexOf('</head>'));
  s=s.replace(/(src="[^"<>]*tool-common\.js)(?:\?[^"<>]*)?"/g,'$1?v=journeys-20260925"');
  put(p,s);
 }
 // Preserve the current five entry points and their design, but make the labels task-oriented.
 let home=read('index.html'),app=read('app.js');
 const specs=vm.runInNewContext(extract(app,/const specs=(\[[\s\S]*?\]),palette=/,'home services'),Object.create(null));
 const icons=vm.runInNewContext(extract(app,/const serviceIcons=(\[[\s\S]*?\]);/,'service icons'),Object.create(null));
 const palette=[['#0d1f3c','#eef1f5'],['#1565c0','#eef5fc'],['#d4a73a','#fff8e7'],['#d4a73a','#fff8e7'],['#0d1f3c','#eef1f5']];
 const services=specs.map((x,i)=>{const t=x[3]&&tools.find(t=>t.id===x[3]);const url=x[2]||(t?.url.startsWith('/')?t.url:'/'+t?.url);assert(url&&!url.includes('undefined'));return `<a class="service-item" href="${esc(url)}" style="--tone:${palette[i][0]};--tint:${palette[i][1]}"><span class="service-icon">${icons[i]}</span><span class="service-copy"><strong>${esc(x[0])}</strong><small>${esc(x[1])}</small></span><span class="service-arrow">→</span></a>`}).join('');
 home=home.replace(/(<section\b[^>]*id="services"[^>]*>)[\s\S]*?<\/section>/,`$1${services}</section>`);
 home=home.replace(/src="app\.js\?[^"<>]*"/,'src="app.js?v=journeys-20260925"');
 put('index.html',home);
 return [...changes];
}
function migrate(){
 let app=read('app.js');
 for(const [a,b] of [['계산기 모음','비용을 계산해요'],['부동산 계산 도구\',\'#calculators','보증금·월세·계약 비용\',\'#calculators'],['실거래 조회','주변 시세를 봐요'],['실전 가이드\',\'계약·청년·재개발','계약이 궁금해요\',\'계약·퇴거 확인 순서'],['청년 지원\',\'청년주택 점수 확인','청년임대를 알아봐요\',\'순위·가점부터 확인'],['재개발\',\'분담금과 사업성 확인','분담금을 확인해요\',\'권리가액·자금 비교']]){
  const start=app.indexOf('const specs='),end=app.indexOf(',palette=',start);const spec=swap(app.slice(start,end),a,b,'service label '+a);app=app.slice(0,start)+spec+app.slice(end);
 }
 put('app.js',app);
 let common=read('tools/tool-common.js');
 const old='      row.innerHTML=`<a href="${root}">홈으로</a><span>·</span><a href="${root}#calculators">다른 계산기</a>`;';
 const next=`      const guide=body.querySelector('.v2-content-guide [data-primary-guide]');
      if(guide){
        const interpret=document.createElement('a');interpret.href='#rc-guide-interpretation';interpret.textContent='결과 해석 보기';
        const article=document.createElement('a');article.href=guide.getAttribute('href');article.textContent=guide.textContent;
        const home=document.createElement('a');home.href=root;home.textContent='홈으로';
        const tools=document.createElement('a');tools.href=root+'#calculators';tools.textContent='다른 계산기';
        row.replaceChildren(interpret,article,home,tools);
      }else{
${old}
      }`;
 common=swap(common,old,next,'contextual result navigation');put('tools/tool-common.js',common);
 let core=read('scripts/render-core-content.mjs');
 const hook="\n// Keep static tool explanations and the five service entry points after regular regeneration.\nconst {renderUserJourneys}=await import('./render-user-journeys.mjs');\nrenderUserJourneys();\n";
 if(!core.includes("await import('./render-user-journeys.mjs')"))core+=hook;
 const previous='실거래와 공식 공고를 그대로 옮기지 않고,<br>비교할 조건과 지금 할 일을 붙여 분석·계산으로 연결합니다.';
 const revised='집을 구하거나 계약을 바꾸기 전,<br>시세·내 조건·비용을 확인하고 다음 할 일을 정리하세요.';
 core=swap(core,previous,revised,'home introduction generator');put('scripts/render-core-content.mjs',core);
 put('index.html',swap(read('index.html'),previous,revised,'home introduction'));
 let contact=read('contact/index.html');
 const support='<section class="panel" id="rc-error-report"><h2>오류 제보에 필요한 네 가지</h2><p>문제 페이지 주소, 사용 기기·브라우저, 누른 버튼과 입력 조건, 예상한 결과와 실제 결과를 적어주세요. 계산 조건은 개인을 식별할 수 없는 가정값으로 설명해도 됩니다.</p><p><a href="mailto:arttoy61@gmail.com?subject=Rent%20Check%20%EC%98%A4%EB%A5%98%20%EC%A0%9C%EB%B3%B4">오류 제보 이메일 작성 →</a></p><p>주민등록번호·계좌번호·전화번호·개인 주소는 보내지 마세요. 화면을 첨부할 때에도 가린 뒤 보내주세요. 이메일 작성 화면만 열리며 자동 전송되지 않습니다.</p></section>';
 contact=block(contact,'support',support,contact.indexOf('</main>'));put('contact/index.html',contact);
 renderUserJourneys();
 const out=process.env.JOURNEY_OUT||'/tmp/rentcheck-journeys';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/changed-files.json',JSON.stringify([...changes],null,2));
 console.log('JOURNEY_CHANGED_FILES='+JSON.stringify([...changes]));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--apply'))migrate();else renderUserJourneys();
}
