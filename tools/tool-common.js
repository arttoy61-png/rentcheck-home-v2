(() => {
  const heroCopy={
    'redevelopment':{title:'재개발 자금 30초 계산기',desc:'소유주는 분담금, 매수자는 총투입금을 계산합니다.'},
    'youth-score':{title:'청년임대 계산기',desc:'LH·SH 매입임대·청년안심주택 순위와 가점을 확인합니다.'},
    'rent-check':{title:'내 월세·전세, 적정한가요?',desc:'주소 주변 실거래로 내 계약 조건을 비교합니다.'},
    'apartment':{title:'강서구 아파트 실거래',desc:'동과 단지를 골라 매매·전세·월세 실거래를 확인합니다.'},
    'jeonse-ratio':{title:'전세가율 계산기',desc:'매매가에서 전세보증금이 차지하는 비율을 확인합니다.'},
    'tenant-message':{title:'전월세 문자 만들기',desc:'세입자·집주인 입장에서 상황별 문자를 만들어 바로 복사합니다.'},
    'rent-vs-monthly':{title:'전세 vs 월세 비교',desc:'두 계약의 월 부담을 같은 기준으로 비교합니다.'},
    'rent-conversion':{title:'전월세 전환 계산기',desc:'보증금을 바꿀 때 월세가 얼마나 달라지는지 계산합니다.'},
    'rent-yield':{title:'임대 수익률 계산기',desc:'매매가·보증금·월세·대출 조건으로 실투자금과 세전 현금수익률을 계산합니다.'},
    'brokerage-fee':{title:'중개보수 계산기',desc:'매매·전세·월세의 최대 중개보수를 계산합니다.'}
  };

  const contentGuide={
    'apartment':{
      title:'아파트 실거래는 가격 하나보다 조건을 같이 보세요',
      lead:'이 도구는 강서구 아파트의 매매·전세·월세 신고자료를 동, 단지, 면적별로 나눠 보는 도구입니다. 같은 단지라도 전용면적과 층, 계약일이 다르면 가격 차이가 커질 수 있으므로 최근 거래 한 건만 보고 시세를 단정하지 않는 것이 중요합니다.',
      steps:['먼저 동과 단지를 고른 뒤 매매·전세·월세를 따로 봅니다.','같은 전용면적의 거래를 우선 비교하고 계약일이 가까운 순서로 확인합니다.','거래가 적다면 최고가·최저가보다 최근 여러 건의 범위를 함께 봅니다.'],
      example:'예를 들어 같은 단지 84㎡가 12억원에 거래됐더라도 몇 달 전 거래인지, 같은 면적의 다른 계약이 11억원대인지 12억원대인지까지 같이 봐야 현재 시세에 더 가깝게 판단할 수 있습니다.',
      caution:'실거래 신고자료는 계약 후 신고되며 이후 해제·정정될 수 있습니다. 전세는 신규계약과 갱신계약의 조건이 다를 수 있어 보증금 숫자만 단순 비교하지 마세요.',
      source:'자료 기준 · 국토교통부 실거래 신고자료 · 계약일 기준',
      related:[['blog/gangseo-home-price/','강서구 집값 확인 순서'],['analysis/gangseo-august-2026/','강서구 8월 실거래 월결산'],['tools/neighborhood-price/','아파트·빌라·오피스텔 동네시세']]
    },
    'neighborhood-price':{
      title:'강서구 집값은 평균 하나보다 집 종류부터 나누는 게 먼저입니다',
      lead:'강서구 전체 평균만 보면 아파트·빌라·오피스텔의 서로 다른 가격대가 한 숫자에 섞입니다. 이 도구는 주택유형을 먼저 나누고 동, 거래유형, 역세권, 면적으로 좁혀 최근 실거래를 확인하도록 만들었습니다. 검색한 집과 비슷한 조건의 거래가 충분하지 않다면 결과가 적게 나오는 것이 정상이며, 그때는 조건을 한 단계씩 넓혀 비교하는 편이 안전합니다.',
      steps:['아파트·빌라·오피스텔 중 실제로 찾는 집 종류를 먼저 선택합니다.','매매·전세·월세를 구분한 뒤 동과 면적을 맞춰 비교합니다.','역을 선택했다면 거리순과 최근 거래순을 번갈아 보며 위치 차이도 확인합니다.'],
      example:'예를 들어 화곡동 월세를 찾는다면 강서구 전체 월세 평균보다 화곡동의 같은 주택유형·비슷한 면적 거래를 모아 보는 편이 실제 계약 조건을 판단하는 데 더 도움이 됩니다. 빌라는 같은 동이라도 준공연도와 지번 차이가 커서 같은 건물 또는 가까운 지번부터 보는 것이 좋습니다.',
      caution:'거래건수가 적은 조건은 중간값 하나만으로 시세를 확정하기 어렵습니다. 최근 계약의 위치·면적·준공연도·층 등 개별 조건을 함께 확인하세요. 신고 이후 해제·정정되는 거래도 있을 수 있습니다.',
      source:'자료 기준 · 국토교통부 실거래 신고자료 · 최근 신고분은 계속 추가될 수 있음',
      faq:[['왜 강서구 평균가격 하나만 보여주지 않나요?','아파트·빌라·오피스텔의 가격 구조가 다르고, 같은 동 안에서도 면적과 연식에 따라 차이가 커서 한 평균으로 묶으면 실제 계약 판단에 도움이 되기 어렵기 때문입니다.'],['최근 거래가 한 건뿐이면 그 가격이 시세인가요?','아닙니다. 한 건은 참고점일 뿐입니다. 조건을 조금 넓혀 여러 거래가 반복되는 가격 구간을 함께 보세요.'],['월세는 무엇을 같이 봐야 하나요?','월세 숫자만 보지 말고 보증금과 면적을 함께 맞춰야 합니다. 관리비·옵션·주차처럼 신고자료에 없는 조건은 별도로 확인해야 합니다.']],
      related:[['analysis/gangseo-august-2026/','강서구 8월 실거래 월결산'],['tools/apartment/','강서구 아파트 실거래'],['blog/gangseo-home-price/','강서구 집값 읽는 순서']]
    },
    'redevelopment':{
      title:'재개발 분담금은 권리가액을 먼저 계산해야 합니다',
      lead:'분담금은 새 아파트 조합원 분양가에서 내 종전자산의 권리가액을 뺀 값입니다. 권리가액은 감정평가액에 비례율을 곱해 계산하므로, 감정평가액만 보고 “내 집값이 얼마 인정된다”라고 생각하면 실제 분담금과 차이가 생길 수 있습니다. 이 도구는 소유주와 매수 검토자의 계산을 나눠 보여줍니다.',
      steps:['소유주는 감정평가액·비례율·조합원 분양가를 넣어 권리가액과 예상 분담금을 봅니다.','매수 검토자는 매매가와 예상 분담금을 합쳐 총투입금이 어느 정도인지 확인합니다.','비례율이 바뀌면 결과도 달라지므로 슬라이더로 민감도를 보고 한 숫자를 확정값처럼 쓰지 않습니다.'],
      example:'감정평가액 3억원, 비례율 100%, 조합원 분양가 9억원이라면 권리가액은 3억원이고 단순 예상 분담금은 6억원입니다. 비례율이 110%라면 권리가액은 3억3천만원으로 바뀌어 같은 분양가에서도 분담금이 달라집니다.',
      caution:'실제 사업에서는 추가분담금, 금융비용, 옵션·발코니, 취득 관련 비용, 사업비 변경 등이 더해질 수 있습니다. 계산 결과는 사업시행계획·관리처분계획·조합 공지보다 우선하지 않습니다.',
      source:'계산 구조 · 권리가액 = 감정평가액 × 비례율 · 예상 분담금 = 조합원분양가 − 권리가액',
      faq:[['비례율 100%면 좋은 건가요?','100%는 감정평가액이 권리가액으로 그대로 반영되는 단순 기준점입니다. 사업성 판단은 비례율 하나만이 아니라 분양수입·사업비·종전자산평가와 함께 봐야 합니다.'],['분담금이 음수면 바로 환급받나요?','계산상 권리가액이 조합원분양가보다 크다는 뜻입니다. 실제 청산금·환급 여부와 시점은 사업계획과 조합 기준을 확인해야 합니다.'],['매수자는 무엇을 더 봐야 하나요?','매매가와 예상 분담금뿐 아니라 취득세·대출이자·이주비 조건·추가 사업비 등 실제 현금흐름을 별도로 확인해야 합니다.']],
      related:[['blog/redevelopment-contribution/','재개발 분담금 읽는 법'],['blog/redevelopment-rights/','권리가액 계산 이해하기'],['analysis/hwagok6-957-a1/','화곡6동 모아타운 A1 진행상황']]
    },
    'youth-score':{
      title:'청년임대는 “몇 점”보다 먼저 내 순위를 확인해야 합니다',
      lead:'청년 매입임대와 청년안심주택은 공고마다 순위·배점표가 다르고, 같은 점수라도 다른 순위끼리 바로 경쟁하는 구조가 아닙니다. 그래서 이 도구는 먼저 신청 순위를 고른 뒤 그 순위에서 실제로 적용되는 가점만 계산하도록 만들었습니다. 결과는 공고문을 대신하는 당첨예측이 아니라 내가 확인할 항목을 빠르게 정리하는 용도입니다.',
      steps:['신청하려는 공고에서 내가 1·2·3순위 중 어디에 해당하는지 먼저 확인합니다.','선택한 순위에서 적용되는 무주택·부모 무주택·소득·수급 여부 등 배점 항목을 체크합니다.','계산된 점수는 같은 순위 안에서 비교할 참고값으로 보고, 실제 제출서류와 공고의 배점표를 다시 확인합니다.'],
      example:'예를 들어 3순위 신청자가 부모 무주택 항목을 받을 수 있는 공고라면 해당 배점을 더할 수 있지만, 모든 LH·SH 공고가 같은 표를 쓰는 것은 아닙니다. 공고명과 모집차수를 확인한 뒤 계산 결과를 읽어야 합니다.',
      caution:'청년임대는 순위·소득·자산·부모 기준이 공고별로 달라질 수 있습니다. “점수가 높으니 신청 가능”이 아니라 먼저 신청자격을 충족해야 하고, 서류심사에서는 공적자료 기준으로 다시 확인됩니다.',
      source:'2026년 LH·SH 청년 매입임대·청년안심주택 공고의 순위·배점 구조를 참고해 구성',
      faq:[['점수가 높으면 바로 당첨인가요?','아닙니다. 먼저 같은 순위 안에서 경쟁하고, 공고에 따라 추첨·배점·우선기준이 함께 적용될 수 있습니다.'],['부모 무주택 점수는 항상 있나요?','아닙니다. 모집기관과 공고에 따라 배점항목이 달라지므로 신청하는 공고의 배점표를 기준으로 확인해야 합니다.'],['신청 후 서류를 바로 내나요?','공고에 따라 신청과 서류제출이 분리될 수 있습니다. 서류심사 대상자 발표가 따로 있는지 일정표를 먼저 확인하세요.']],
      related:[['blog/youth-rank-check/','청년임대 순위 확인 가이드'],['blog/public-housing-application-documents/','신청 후 서류는 언제 내는지'],['public-housing/','LH·SH 최신 모집공고']]
    },
    'rent-check':{
      title:'월세·전세는 보증금과 면적을 맞춰야 비교가 됩니다',
      lead:'월세 60만원과 80만원만 나란히 놓으면 어느 계약이 비싼지 바로 판단하기 어렵습니다. 보증금이 다르면 월 부담의 의미가 달라지고, 같은 동네라도 주택유형과 면적이 다르면 시세 차이가 생깁니다. 이 도구는 내 계약 조건과 주변 실거래를 가능한 한 같은 기준으로 맞춰 비교합니다.',
      steps:['내 보증금·월세·면적과 주택유형을 실제 계약서 기준으로 입력합니다.','주변 거래 중 보증금과 면적이 비슷한 사례를 먼저 확인합니다.','결과의 차이만 보지 말고 최근 계약일과 건물 조건까지 함께 봅니다.'],
      example:'예를 들어 월세가 10만원 더 비싸 보여도 보증금이 크게 낮거나 면적이 더 넓다면 단순히 월세 숫자만으로 비싸다고 말하기 어렵습니다. 비슷한 조건의 실제 거래 여러 건과 나란히 보는 것이 핵심입니다.',
      caution:'이 비교는 시세 확인을 돕는 참고자료입니다. 관리비, 옵션, 층, 준공연도, 주차 같은 실거래 신고에 없는 조건은 별도로 확인해야 합니다.',
      source:'자료 기준 · 국토교통부 실거래 신고자료와 사용자가 입력한 계약 조건',
      related:[['blog/rent-price-check/','월세 시세 비교하는 방법'],['tools/neighborhood-price/','강서구 동네시세'],['tools/rent-vs-monthly/','전세 vs 월세 비교']]
    },
    'jeonse-ratio':{
      title:'전세가율은 위험 여부를 한 숫자로 확정하는 지표가 아닙니다',
      lead:'전세가율은 매매가격과 전세보증금의 관계를 빠르게 확인하는 숫자입니다. 비율이 높을수록 매매가격과 보증금의 간격이 좁다는 뜻이지만, 이 숫자만으로 보증금 안전 여부를 판단할 수는 없습니다. 실제 계약 전에는 등기부, 선순위 권리, 주택유형과 보증보험 가능 여부를 함께 봐야 합니다.',
      steps:['현재 확인 가능한 매매가격과 실제 전세보증금을 같은 주택 기준으로 넣습니다.','계산된 비율은 주변 비슷한 주택의 실거래와 함께 비교합니다.','비율이 높다면 등기부·근저당·선순위 보증금 등 권리관계를 더 꼼꼼히 확인합니다.'],
      example:'매매가 3억원, 전세보증금 2억4천만원인 집과 매매가 3억원, 보증금 1억5천만원인 집은 임차인이 부담하는 가격 간격이 다릅니다. 전세가율은 이 차이를 빠르게 숫자로 확인하기 위한 출발점입니다.',
      caution:'빌라·다가구처럼 정확한 매매시세를 잡기 어려운 주택은 입력한 매매가격 자체가 달라질 수 있습니다. 한 번의 계산 결과보다 실제 거래와 권리관계 확인을 우선하세요.',
      source:'계산 기준 · 사용자가 입력한 매매가격과 전세보증금',
      related:[['blog/jeonse-safety/','전세 계약 전 안전 확인'],['tools/neighborhood-price/','주변 실거래 확인'],['blog/jeonse-ratio-reading/','전세가율 읽는 법']]
    },
    'rent-conversion':{
      title:'보증금을 올리거나 내릴 때 월세가 얼마나 바뀌는지 확인하세요',
      lead:'전월세 전환은 보증금 일부를 월세로 바꾸거나, 반대로 월세 부담을 줄이기 위해 보증금을 높일 때 사용합니다. 이 도구는 바뀌는 보증금 차액과 적용 전환율을 기준으로 월세 증감액을 계산해 두 계약을 같은 기준에서 비교하도록 돕습니다.',
      steps:['현재 보증금과 월세, 바꾸려는 보증금 수준을 먼저 입력합니다.','적용할 전환율을 계약 조건과 해당 시점의 공식 기준에 맞춰 확인합니다.','계산된 월세 차이를 실제 제안받은 계약 조건과 비교합니다.'],
      example:'보증금을 낮추는 대신 월세를 더 내는 계약을 제안받았다면 보증금 감소액이 얼마인지부터 확인한 뒤, 그 차액이 월세로 어느 정도 전환되는지 계산하면 두 조건을 비교하기 쉬워집니다.',
      caution:'실제 계약에 적용할 수 있는 전환 기준은 계약 형태와 시점에 따라 확인이 필요합니다. 계산값을 그대로 계약 조건으로 확정하지 말고 최신 법령·공식 안내와 계약 내용을 함께 확인하세요.',
      source:'계산 기준 · 사용자가 입력한 보증금 차액과 전환율',
      related:[['blog/lease-cost-renewal/','전월세 비용·갱신 가이드'],['tools/rent-vs-monthly/','전세 vs 월세 비교'],['tools/rent-check/','월세·전세 적정 확인']]
    },
    'longterm-jeonse-51':{
      title:'같은 59㎡라도 제51차 장기전세 순위 기준이 다른 이유',
      lead:'제51차 장기전세는 한 공고 안에 신규 매입형, 공사 건설형 재공급, 매입형 재공급, 서울리츠3호가 함께 들어 있습니다. 그래서 신청자는 단지 이름만 보고 순위를 찾기 어렵습니다. 예를 들어 청담르엘 59㎡는 매입형 기준을 적용하고, 마곡지구 59㎡는 공사 건설형 60㎡ 이하 기준을 적용해 같은 59㎡라도 소득과 청약통장 판정표가 달라집니다.',
      steps:['자치구 → 단지 → 면적을 고르면 공급유형을 자동으로 찾습니다.','가구원수·소득·맞벌이·출생자녀·청약통장 등 선택한 주택에 필요한 조건만 확인합니다.','결과에서 일반공급 순위와 접수일을 본 뒤 제51차 안내글과 SH 원문에서 최종 확인합니다.'],
      example:'마곡지구 59㎡처럼 공사 건설형 60㎡ 이하인 주택은 소득구간과 청약저축 24회 여부로 1~4순위가 갈립니다. 반면 매입형 50㎡ 미만은 청약통장보다 거주지역 순위가 먼저 적용됩니다. 청약통장이 없어도 신청 가능한 유형이 있다는 점도 공고문에서 따로 확인해야 합니다.',
      caution:'이 도구는 일반공급 순위를 빠르게 찾는 보조도구입니다. 우선공급·주거약자, 동순위 경쟁기준, 서류심사 결과까지 당첨을 예측하지 않습니다. 2~4순위는 선순위 접수 결과에 따라 실제 접수를 받지 않을 수 있으므로 해당일 SH 공지를 다시 확인해야 합니다.',
      source:'자료 기준 · SH 제51차 장기전세주택 입주자 모집공고(2026.08.31)',
      faq:[['청약통장이 없으면 신청 자체가 안 되나요?','아닙니다. 공사 건설형 60㎡ 이하의 2·4순위처럼 미가입자를 포함하는 구간이 있고, 매입형 50㎡ 미만은 거주지역으로 순위를 가르는 구조도 있습니다.'],['1순위면 바로 당첨인가요?','아닙니다. 신청자가 많으면 같은 순위 안에서 공고의 동순위 경쟁기준을 다시 적용합니다.'],['왜 맞벌이와 출생자녀를 묻나요?','일부 구간은 맞벌이와 출생자녀 여부에 따라 적용하는 소득·자산 기준이 달라질 수 있기 때문입니다. 맞벌이 자체가 가점은 아닙니다.']],
      related:[['public-housing/sh-longterm-jeonse-51/','제51차 일정·서울 공급주택'],['blog/public-housing-application-documents/','신청 후 서류 제출 순서'],['public-housing/','LH·SH 임대주택 모집공고']]
    }
  };

  const join=(root,path)=>`${root}${path||''}`;

  function ensureGA(){
    if(typeof window.gtag==='function')return;
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments)};
    window.gtag('js',new Date());
    window.gtag('config','G-MPRR3J99YQ');
    if(!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')){
      const s=document.createElement('script');
      s.async=true;
      s.src='https://www.googletagmanager.com/gtag/js?id=G-MPRR3J99YQ';
      document.head.appendChild(s);
    }
  }

  function brandText(value){
    return String(value||'').replace(/렌트체크\s*강서/gi,'Rent Check').replace(/Rent Check\s*강서/gi,'Rent Check');
  }

  function normalizeBrand(){
    document.title=brandText(document.title);
    document.querySelectorAll('meta[property="og:title"]').forEach(meta=>{meta.content=brandText(meta.content)});
    document.querySelectorAll('.brandbar').forEach(el=>{el.style.display='none'});
  }

  function ensureHeroRuntimeLock(){
    if(document.getElementById('v2-hero-runtime-lock'))return;
    const style=document.createElement('style');
    style.id='v2-hero-runtime-lock';
    style.textContent='html body.v2-tool-page .v2-normalized-hero>h1::after,html body.v2-tool-page .v2-normalized-hero>.v2-hero-description::after{content:none!important;display:none!important}html body.v2-tool-page .v2-normalized-hero>h1{font-size:28px!important;line-height:1.35!important;color:#fff!important;margin:0!important}html body.v2-tool-page .v2-normalized-hero>.v2-hero-description{display:block!important;font-size:14px!important;line-height:1.7!important;color:#d6dde6!important;margin:8px 0 0!important}@media(max-width:560px){html body.v2-tool-page .v2-normalized-hero>h1{font-size:23px!important}html body.v2-tool-page .v2-normalized-hero>.v2-hero-description{font-size:13px!important;line-height:1.65!important}}';
    document.head.appendChild(style);
  }

  function normalizeHero(body,activeTool){
    const copy=heroCopy[activeTool];
    if(!copy)return;
    const hero=body.querySelector('main .hero,main .chero,main .hd,.wrap>.hd,.wrap>header,.container>header');
    if(!hero)return;
    hero.classList.add('v2-normalized-hero');
    const brand=document.createElement('div');
    brand.className='v2-hero-brand';
    brand.textContent='Rent Check';
    const title=document.createElement('h1');
    title.textContent=copy.title;
    const desc=document.createElement('p');
    desc.className='v2-hero-description';
    desc.textContent=copy.desc;
    hero.replaceChildren(brand,title,desc);
    ensureHeroRuntimeLock();
  }

  function ensureStructuredData(activeTool){
    const image='https://rent-check.kr/assets/share/rent-check-og-20260831-v2.png';
    let found=false;
    document.querySelectorAll('script[type="application/ld+json"]').forEach(node=>{
      try{
        const data=JSON.parse(node.textContent||'{}');
        const items=Array.isArray(data['@graph'])?data['@graph']:[data];
        items.forEach(item=>{
          if(item&&item['@type']==='WebApplication'){
            found=true;
            if(!item.image)item.image=image;
            if(!item.provider)item.provider={'@id':'https://rent-check.kr/#organization'};
            if(!item.isPartOf)item.isPartOf={'@id':'https://rent-check.kr/#website'};
          }
        });
        node.textContent=JSON.stringify(data);
      }catch(_){ }
    });
    if(found||activeTool!=='longterm-jeonse-51')return;
    const script=document.createElement('script');
    script.type='application/ld+json';
    script.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebApplication','@id':'https://rent-check.kr/tools/longterm-jeonse-51/#webapp',name:'제51차 SH 장기전세 내 순위 찾기',url:'https://rent-check.kr/tools/longterm-jeonse-51/',applicationCategory:'UtilitiesApplication',operatingSystem:'Web',inLanguage:'ko-KR',image,description:'제51차 SH 장기전세에서 단지와 면적을 고르면 일반공급 순위와 접수일을 확인하는 도구입니다.',provider:{'@id':'https://rent-check.kr/#organization'},isPartOf:{'@id':'https://rent-check.kr/#website'}});
    document.head.appendChild(script);
  }

  function ensureContentGuideStyle(){
    if(document.getElementById('v2-content-guide-style'))return;
    const style=document.createElement('style');
    style.id='v2-content-guide-style';
    style.textContent='.v2-content-guide{margin:22px 0 10px;padding:24px;border:1px solid #d7dce3;border-radius:18px;background:#fff;box-shadow:0 10px 30px rgba(13,31,60,.06);color:#111}.v2-content-guide__eyebrow{margin:0 0 6px;color:#1565c0;font-size:11px;font-weight:800;letter-spacing:.02em}.v2-content-guide h2{margin:0;color:#0d1f3c;font-size:20px;line-height:1.45;letter-spacing:-.03em}.v2-content-guide__lead{margin:10px 0 0;color:#4f5a68;font-size:14px;line-height:1.8}.v2-content-guide ol{margin:16px 0 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;counter-reset:v2guide}.v2-content-guide li{counter-increment:v2guide;padding:13px;border:1px solid #e2e7ed;border-radius:12px;background:#f8fafc;color:#354052;font-size:12.5px;line-height:1.65}.v2-content-guide li:before{content:counter(v2guide);width:22px;height:22px;margin:0 0 7px;display:grid;place-items:center;border-radius:50%;background:#0d1f3c;color:#fff;font-size:11px;font-weight:800}.v2-content-guide__box{margin-top:10px;padding:13px 14px;border-radius:11px;font-size:12.5px;line-height:1.75}.v2-content-guide__example{border-left:3px solid #1565c0;background:#f3f7fc;color:#334b66}.v2-content-guide__caution{border-left:3px solid #d4a73a;background:#fff9e9;color:#66572f}.v2-content-guide__box strong{color:#0d1f3c}.v2-content-guide__source{margin:12px 0 0;color:#7b8490;font-size:11px;line-height:1.6}.v2-content-guide__faq{margin-top:18px;padding-top:16px;border-top:1px solid #e5e9ee}.v2-content-guide__faq h3{margin:0 0 8px;color:#0d1f3c;font-size:15px}.v2-content-guide__faq details{border-top:1px solid #edf0f3}.v2-content-guide__faq details:first-of-type{border-top:0}.v2-content-guide__faq summary{padding:10px 0;cursor:pointer;color:#26364a;font-size:12.5px;font-weight:800}.v2-content-guide__faq p{margin:0 0 10px;color:#596273;font-size:12px;line-height:1.75}.v2-content-guide__links{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}.v2-content-guide__link{display:inline-flex;align-items:center;min-height:42px;padding:0 14px;border:1px solid #0d1f3c;border-radius:9px;background:#0d1f3c;color:#fff!important;font-size:12px;font-weight:800;text-decoration:none!important}.v2-content-guide__link.alt{background:#fff;color:#0d1f3c!important}@media(max-width:640px){.v2-content-guide{padding:19px 16px;border-radius:15px}.v2-content-guide h2{font-size:18px}.v2-content-guide__lead{font-size:13px}.v2-content-guide ol{grid-template-columns:1fr}.v2-content-guide li,.v2-content-guide__box{font-size:12px}.v2-content-guide__links{display:grid}.v2-content-guide__link{justify-content:center}}';
    document.head.appendChild(style);
  }

  function addContentGuide(body,activeTool,root){
    const copy=contentGuide[activeTool];
    if(!copy||document.querySelector('.v2-content-guide'))return;
    const main=body.querySelector('main,.wrap,.container');
    if(!main)return;
    ensureContentGuideStyle();
    const section=document.createElement('section');
    section.className='v2-content-guide';
    section.setAttribute('aria-labelledby','v2-content-guide-title');
    const faq=copy.faq?.length?`<div class="v2-content-guide__faq"><h3>자주 묻는 질문</h3>${copy.faq.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`:'';
    const links=(copy.related||[]).map(([href,label],i)=>`<a class="v2-content-guide__link${i?' alt':''}" href="${join(root,href)}">${label} →</a>`).join('');
    section.innerHTML=`<p class="v2-content-guide__eyebrow">도구 사용 가이드</p><h2 id="v2-content-guide-title">${copy.title}</h2><p class="v2-content-guide__lead">${copy.lead}</p><ol>${copy.steps.map(step=>`<li>${step}</li>`).join('')}</ol><div class="v2-content-guide__box v2-content-guide__example"><strong>예시</strong><br>${copy.example}</div><div class="v2-content-guide__box v2-content-guide__caution"><strong>주의할 점</strong><br>${copy.caution}</div>${faq}<p class="v2-content-guide__source">${copy.source}</p>${links?`<nav class="v2-content-guide__links" aria-label="관련 Rent Check 페이지">${links}</nav>`:''}`;
    const disclaimer=main.querySelector('.v2-tool-disclaimer');
    if(disclaimer)disclaimer.insertAdjacentElement('beforebegin',section);
    else main.appendChild(section);
  }

  function addDisclaimer(body,activeTool){
    if(['calculator-notice','tenant-message'].includes(activeTool)||document.querySelector('.v2-tool-disclaimer'))return;
    const main=body.querySelector('main,.wrap,.container');
    if(!main)return;
    const notice=document.createElement('p');
    notice.className='v2-tool-disclaimer';
    notice.textContent='계산 결과는 참고용입니다. 실제 적용 전 공식 기준을 확인하세요.';
    main.appendChild(notice);
  }

  function addResultNext(body,root){
    const results=[...body.querySelectorAll('.result,#result')];
    results.forEach(result=>{
      if(result.nextElementSibling?.classList?.contains('v2-result-next'))return;
      const row=document.createElement('nav');
      row.className='v2-result-next';
      row.setAttribute('aria-label','계산 후 이동');
      row.innerHTML=`<a href="${root}">홈으로</a><span>·</span><a href="${root}#calculators">다른 계산기</a>`;
      result.insertAdjacentElement('afterend',row);
      const sync=()=>{
        const cs=getComputedStyle(result);
        const visible=cs.display!=='none'&&cs.visibility!=='hidden'&&(result.classList.contains('show')||result.offsetHeight>0);
        row.classList.toggle('is-visible',visible);
      };
      new MutationObserver(sync).observe(result,{attributes:true,attributeFilter:['class','style']});
      sync();
    });
  }

  function addNumericClearButtons(body){
    if(!document.getElementById('v2-input-clear-style')){
      const style=document.createElement('style');
      style.id='v2-input-clear-style';
      style.textContent='.v2-clear-host{position:relative!important}.v2-input-clear{position:absolute;z-index:5;top:50%;right:10px;transform:translateY(-50%);width:28px;height:28px;padding:0;border:0;border-radius:50%;background:#edf1f5;color:#52606e;font-family:inherit;font-size:20px;font-weight:500;line-height:1;display:none;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent}.v2-input-clear.is-visible{display:flex}.v2-input-clear:active{background:#dfe5ec}.v2-clear-host>input[data-v2-clear-ready="1"]{padding-right:48px!important}.v2-clear-host.v2-clear-has-unit>.v2-input-clear{right:58px}.v2-clear-host.v2-clear-has-unit>input[data-v2-clear-ready="1"]{padding-right:94px!important}';
      document.head.appendChild(style);
    }
    const selector='input[inputmode="numeric"],input[inputmode="decimal"],input[type="number"]';
    const enhance=input=>{
      if(!(input instanceof HTMLInputElement)||input.dataset.v2ClearReady==='1'||input.type==='range'||input.disabled||input.readOnly)return;
      const parent=input.parentElement;
      if(!parent)return;
      input.dataset.v2ClearReady='1';
      parent.classList.add('v2-clear-host');
      const hasUnit=[...parent.children].some(el=>el!==input&&el.tagName!=='BUTTON'&&(el.classList.contains('unit')||el.tagName==='SPAN')&&getComputedStyle(el).position==='absolute');
      if(hasUnit)parent.classList.add('v2-clear-has-unit');
      const button=document.createElement('button');
      button.type='button';
      button.className='v2-input-clear';
      button.setAttribute('aria-label','입력값 지우기');
      button.title='입력값 지우기';
      button.textContent='×';
      parent.appendChild(button);
      const sync=()=>button.classList.toggle('is-visible',String(input.value||'').trim()!=='');
      button.addEventListener('click',()=>{
        input.value='';
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.dispatchEvent(new Event('change',{bubbles:true}));
        try{input.focus({preventScroll:true})}catch(_){input.focus()}
        sync();
      });
      input.addEventListener('input',sync);
      input.addEventListener('change',sync);
      sync();
    };
    body.querySelectorAll(selector).forEach(enhance);
    const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
      if(!(node instanceof Element))return;
      if(node.matches(selector))enhance(node);
      node.querySelectorAll?.(selector).forEach(enhance);
    })));
    observer.observe(body,{childList:true,subtree:true});
  }

  function fixAnalysisLinks(){
    document.querySelectorAll('a[href$="#article-library"]').forEach(a=>{
      if((a.textContent||'').includes('분석 글'))a.setAttribute('href','https://rent-check.kr/#article-library');
    });
  }

  function initializeToolShell(){
    const body=document.body;
    if(!body)return;
    const root=body.dataset.v2Root||'../../';
    const activeTool=body.dataset.toolId||'';
    ensureGA();
    normalizeBrand();
    normalizeHero(body,activeTool);
    ensureStructuredData(activeTool);
    fixAnalysisLinks();
    addNumericClearButtons(body);

    if(!document.querySelector('.v2-toolbar')){
      const toolbar=document.createElement('header');
      toolbar.className='v2-toolbar';
      toolbar.innerHTML=`<div class="v2-toolbar__inner"><a class="v2-toolbar__home" href="${root}" aria-label="Rent Check 홈"><span class="v2-toolbar__mark" aria-hidden="true"><svg viewBox="0 0 28 28"><path d="M4 13 14 5l10 8v10H4z"></path><path d="m10 16 3 3 6-7"></path></svg></span><strong>Rent Check</strong></a><a class="v2-toolbar__tools" href="${root}#calculators">다른 도구 보기 <span aria-hidden="true">→</span></a></div>`;
      body.insertAdjacentElement('afterbegin',toolbar);
    }

    addContentGuide(body,activeTool,root);
    addDisclaimer(body,activeTool);
    addResultNext(body,root);

    if(!document.querySelector('.v2-tool-footer')){
      const footer=document.createElement('footer');
      footer.className='v2-tool-footer';
      footer.innerHTML=`<div class="v2-tool-footer__inner"><nav class="v2-tool-footer__simple" aria-label="사이트 안내"><a href="${join(root,'about/')}">소개</a><span>|</span><a href="${join(root,'privacy.html')}">개인정보처리방침</a><span>|</span><a href="${join(root,'contact/')}">문의</a><span>|</span><a href="${join(root,'sponsor/')}">광고/제휴</a></nav><p class="v2-tool-footer__copy">Copyright © 2026 Rent Check</p></div>`;
      body.insertAdjacentElement('beforeend',footer);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeToolShell,{once:true});
  else initializeToolShell();
})();