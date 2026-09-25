"""Evidence-based edits of twelve existing articles. No new articles or tool changes."""
from __future__ import annotations
import argparse, hashlib, html, json, os, re
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
from bs4 import BeautifulSoup
ROOT=Path.cwd()
OUT=Path(os.environ.get('EDITORIAL_OUT','/tmp/rentcheck-editorial'))
OUT.mkdir(parents=True,exist_ok=True)
DATE='2026-09-25'
MARK='data-editorial-review="20260925"'
PATHS=['blog/brokerage-fee-check/index.html','blog/monthly-rent-deposit-compare/index.html','blog/maintenance-fee-rent-compare/index.html','blog/lh-seoul-youth-purchase-rental-2026-3/index.html','blog/lh-seoul-newlywed-purchase-rental-1-2026-3/index.html','blog/lh-seoul-newlywed-purchase-rental-2-2026-3/index.html','public-housing/sh-long-vacant-purchase-2026-2/index.html','blog/public-housing-waitlist-move-in/index.html','blog/youth-rental/index.html','blog/jeonse-new-vs-renewal/index.html','blog/recent-transaction-incomplete/index.html','public-housing/sh-happy-housing-2026-2/index.html']
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def txt(t): return BeautifulSoup(t,'html.parser').get_text(' ',strip=True)
def once(s,a,b):
    assert s.count(a)==1, f'anchor count={s.count(a)}: {a[:100]}'
    return s.replace(a,b,1)
def before(s,heading,extra): return once(s,'<h2>'+heading+'</h2>',extra+'<h2>'+heading+'</h2>')
def paragraph(s,prefix,replacement):
    matches=[m for m in re.finditer(r'<p\b[^>]*>.*?</p>',s,re.S) if txt(m.group()).startswith(prefix)]
    assert len(matches)==1, (prefix,len(matches))
    m=matches[0]; return s[:m.start()]+replacement+s[m.end():]
def block(s,heading,next_heading,body):
    a='<h2>'+heading+'</h2>'; b='<h2>'+next_heading+'</h2>'
    assert s.count(a)==s.count(b)==1
    start=s.index(a)+len(a); end=s.index(b,start)
    return s[:start]+body+s[end:]
def table(caption,headers,rows):
    return '<div class="table-wrap"><table><caption>'+caption+'</caption><thead><tr>'+''.join('<th scope="col">'+v+'</th>' for v in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join(('<th scope="row">'+v+'</th>') if i==0 else '<td>'+v+'</td>' for i,v in enumerate(row))+'</tr>' for row in rows)+'</tbody></table></div>'
def source(url,label,pages):
    return '<p class="reference-note">근거: <a href="'+html.escape(url,quote=True)+'" target="_blank" rel="noopener noreferrer">'+label+'</a> '+pages+'.</p>'
def lh(pid): return 'https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancInfo.do?aisTpCd=26&ccrCnntSysDsCd=03&mi=1026&panId='+pid+'&uppAisTpCd=13'
Y=lh('2015122300020759'); I=lh('2015122300020750'); II=lh('2015122300020749')
SH='https://www.i-sh.co.kr/main/lay2/program/S1T294C295/www/brd/m_241/view.do?seq=310107'
SEOUL='https://land.seoul.go.kr/land/broker/brokerageCommission.do'
RULE='https://www.law.go.kr/법령/공인중개사법시행규칙/제20조'
def enrichment(s,body,target):
    found=list(re.finditer(r'<section data-content-enrichment="2026-08-28">.*?</section>',s,re.S)); assert len(found)==1
    m=found[0];s=s[:m.start()]+s[m.end():]
    return before(s,target,'<section data-content-enrichment="2026-08-28">'+body+'</section>')
def annotate(s,scope):
    assert MARK not in s
    end=s.index('</h1>')+len('</h1>')
    s=s[:end]+f'<p class="meta" {MARK}>내용 보완: 2026. 9. 25. · {scope}</p>'+s[end:]
    s=re.sub(r'("dateModified"\s*:\s*")[^"]+("|$)',r'\g<1>2026-09-25\2',s)
    return s

def edits(path,s):
    if path==PATHS[0]:
        s=block(s,'2. 월세는 월세액만 넣는 게 아닙니다','3. 상한요율과 한도액을 같이 봅니다',
        '<p>주택 월세는 먼저 <strong>보증금 + 월세 × 100</strong>으로 거래금액을 계산합니다. 그 합계가 <strong>5천만원 미만일 때만 보증금 + 월세 × 70</strong>으로 다시 계산합니다. 정확히 5천만원이면 ×100으로 구한 금액을 사용합니다.</p>'+table('서울 주택 임대차 기준 계산 예시 · 부가세 별도',['계약 조건','환산 거래금액','중개보수 상한'],[['보증금 2천만원 / 월세 80만원','2천만원 + 80만원 × 100 = 1억원','1억원 × 0.3% = 30만원'],['보증금 1억원 / 월세 20만원','1억원 + 20만원 × 100 = 1억2천만원','1억2천만원 × 0.3% = 36만원'],['보증금 500만원 / 월세 30만원','×100 합계 3,500만원 → ×70으로 재계산한 2,600만원','2,600만원 × 0.5% = 13만원']])+'<p>위 세 계약은 계산을 설명하기 위한 가정입니다. 월세가 더 낮아도 보증금까지 합친 거래금액이 크면 중개보수 상한이 더 높아질 수 있습니다.</p>')
        s=block(s,'3. 상한요율과 한도액을 같이 봅니다','4. ‘최대 중개보수’와 실제 지급액은 다를 수 있습니다',table('서울 주택 전세·월세 중개보수표',['거래금액','상한요율','한도액'],[['5천만원 미만','0.5%','20만원'],['5천만원 이상~1억원 미만','0.4%','30만원'],['1억원 이상~6억원 미만','0.3%','별도 한도 없음'],['6억원 이상~12억원 미만','0.4%','별도 한도 없음'],['12억원 이상~15억원 미만','0.5%','별도 한도 없음'],['15억원 이상','0.6%','별도 한도 없음']])+'<p>예를 들어 <strong>전세 8천만원 × 0.4% = 32만원</strong>이지만 해당 구간의 한도액이 30만원이므로 상한은 <strong>30만원</strong>입니다. 전세 3억원은 0.3%를 적용해 상한 90만원입니다. 매매는 임대차와 요율표가 다르며, 서울 주택 매매 6억원은 0.4%를 적용해 상한 240만원입니다. 모두 부가세 별도 계산입니다.</p><p>이 표를 오피스텔에 그대로 적용하지 마세요. 전용 85㎡ 이하이고 전용 입식부엌·수세식 화장실·목욕시설 등 요건을 갖춘 오피스텔은 매매 0.5%, 임대차 0.4% 상한을 확인합니다. 그 외 오피스텔은 0.9% 이내 협의 기준을 확인합니다.</p>'+source(SEOUL,'서울부동산정보광장 중개보수 안내','주택·오피스텔 요율표와 적용기준, 2026.09.25 확인'))
        s=paragraph(s,'주택 중개보수는 지역 조례와 관련 기준을 확인해야 합니다.','<p>주택 중개보수는 <strong>중개사무소 소재지를 관할하는 시·도의 조례</strong>를 확인합니다. 물건이 있는 지역만으로 적용 조례를 고르는 것은 정확하지 않습니다. 다른 시·도 소재 중개사무소가 중개한다면 사무소 소재지와 적용 요율표를 함께 확인하세요. 이 글의 계산 예시는 서울 주택 기준입니다.</p>'+source(RULE,'공인중개사법 시행규칙 제20조','제3항(중개사무소 소재지 관할 조례), 제5항(거래금액 계산)'))
        s=once(s,'계약지역의 최신 중개보수 기준을 확인했는지','중개사무소 소재지 관할 조례와 최신 중개보수 기준을 확인했는지')
        s=s.replace('월세는 보증금과 월세를 환산해 거래금액을 만든 뒤 해당 기준을 적용합니다. 계약 조건과 지역 기준을 함께 확인하는 것이 좋습니다.','주택 월세는 보증금에 월세의 100배를 더하고, 그 합계가 5천만원 미만이면 월세의 70배로 다시 계산합니다. 해당 거래금액의 상한요율과 한도액을 함께 적용합니다.')
        return annotate(s,'환산식·상한액 예시·적용 조례 확인 기준')
    if path==PATHS[1]:
        body=('<h2>4천만원을 더 맡기고 월세 20만원을 줄이는 선택</h2><p>본문의 A집(보증금 1천만원·월세 80만원)과 B집(5천만원·60만원)을 같은 조건으로 계산해보겠습니다. <strong>실제 매물이 아닌 가정 사례</strong>이며 관리비·주차비는 같고, 보증금 자금비용률을 연 4%로 가정합니다.</p>'+table('보증금과 월세를 함께 비교 · 원 단위 반올림',['항목','A집','B집'],[['보증금','10,000,000원','50,000,000원'],['월세','800,000원','600,000원'],['보증금 × 4% ÷ 12','33,333원','166,667원'],['월세 + 비교용 자금비용','약 833,333원','약 766,667원']])+'<p>추가 보증금 4천만원의 자금비용은 월 약 13만3,333원이고, 월세 절감액은 20만원입니다. 따라서 이 가정에서는 <strong>B집이 월 약 6만6,667원, 연 80만원 유리</strong>합니다. 원 단위 반올림 때문에 표의 표시값 차이는 1원 다를 수 있습니다.</p><p>판단이 뒤집히는 기준은 <strong>20만원 × 12 ÷ 4천만원 = 연 6%</strong>입니다. 추가 보증금의 비용률이 6%보다 낮으면 B집, 높으면 A집의 비교 비용이 낮습니다. 6%면 두 집이 같습니다.</p><p>자기 돈의 기회비용은 통장에서 실제로 빠져나가는 월세가 아닙니다. 대출분에는 실제 이자, 자기자금분에는 선택한 기회비용률을 적용하고 <strong>같은 돈에 두 비용을 중복해서 더하지 마세요.</strong> 이 6%는 두 가정 매물의 손익분기율이지 법정 전월세 전환율이나 대출 추천금리가 아닙니다.</p>')
        s=enrichment(s,body,'비교용 자금비용률은 내 상황에 맞추세요')
        return annotate(s,'동일 사례 비교표·손익분기 비용률 계산')
    if path==PATHS[2]:
        body=('<p>앞의 두 집을 한 표로 맞추면 관리비 때문에 순위가 어떻게 바뀌는지 보입니다. 아래는 <strong>설명을 위한 가정 사례</strong>이며 관리비 포함 항목과 별도 주차·인터넷 비용은 같다고 가정합니다.</p>'+table('월 현금지출과 보증금 기회비용은 구분합니다',['항목','A집','B집'],[['보증금','1천만원','2천만원'],['월세','65만원','60만원'],['고정 관리비','5만원','15만원'],['매달 고정 현금지출','70만원','75만원'],['자기자금 기회비용 가정(연 4%)','월 약 33,333원','월 약 66,667원'],['기회비용까지 합친 비교값','월 약 733,333원','월 약 816,667원']])+'<p><strong>실제로 내는 고정비는 A집이 월 5만원 적고</strong>, 보증금 기회비용까지 고려한 비교 차이는 월 약 8만3,333원입니다. 연간 비교 차이는 100만원입니다. 반올림 전 금액으로 차이를 계산했습니다. 기회비용을 관리비처럼 청구되는 금액으로 해석하면 안 됩니다.</p><p>대출이 있다면 그 부분은 실제 이자로 바꾸고 자기자금 기회비용과 중복 계산하지 마세요. 전기·가스처럼 사용량에 따른 비용은 별도 항목으로 비교하고, 포함 항목이 서로 다르면 같은 항목으로 맞춘 뒤 합산합니다.</p>')
        s=paragraph(s,'두 집을 비교할 때는',body)
        return annotate(s,'관리비 포함 비교표·현금지출과 기회비용 구분')
    if path==PATHS[3]:
        body=('<h2>소득 100%는 월 얼마인가요?</h2><p>이번 2026년 9월 17일 서울 공고의 기준입니다. 아래 금액에는 <strong>1인가구 20%p, 2인가구 10%p 가산이 이미 포함</strong>돼 있습니다. 다시 가산하지 마세요. 월급 실수령액이 아니라 공고가 정한 공적 소득자료와 검증대상 범위를 확인합니다.</p>'+table('청년 매입임대 2·3순위 소득·자산 기준',['구분','소득 상한','자산·자동차'],[['2순위 · 검증대상 1인','월 4,576,036원','본인+부모 총자산 3억4,500만원 이하 / 자동차 4,542만원 이하'],['2순위 · 검증대상 2인','월 6,452,897원','같은 2순위 자산기준 적용'],['2순위 · 검증대상 3인','월 8,168,429원','같은 2순위 자산기준 적용'],['3순위 · 본인','월 4,576,036원','본인 총자산 2억5,100만원 이하 / 자동차 4,542만원 이하']])+'<p>2순위의 인원은 주민등록등본에 적힌 사람을 무조건 세는 방식이 아닙니다. 본인과 공고상 검증대상 부모의 범위를 먼저 정합니다. 부모 이혼·재혼·사망 사례는 함께 첨부된 Q&amp;A의 부모 범위를 확인하세요. 형제자매는 이 부모·본인 검증대상에 넣지 않습니다.</p><p><strong>부모가 집을 갖고 있어도 신청자 본인이 무주택이면 신청할 수 있습니다.</strong> 다만 2순위에서는 부모 재산을 포함한 자산기준을 확인하고, 부모 무주택 가점은 별개로 판단합니다.</p>'+source(Y,'LH 서울 청년 매입임대 공고(2026.09.17)','3~4쪽 및 첨부 신청 유의사항·Q&amp;A'))
        s=before(s,'누가 신청할 수 있나요?',body)
        s=before(s,'누가 신청할 수 있나요?','<p><strong>부모가 수급자·차상위계층인 경우의 1순위:</strong> 신청자 본인 자격인지 먼저 구분하세요. 부모 자격을 기준으로 할 때는 같은 주민등록표 등재 여부를 보며, 세대가 분리된 경우에는 공고일 기준 30세 미만인 경우에 한해 해당 요건을 확인합니다. 지원대상 한부모가족은 신청자 본인 이름으로 증명서 발급이 가능한지 확인합니다.</p>')
        s=paragraph(s,'이번 공고는 현재 비어 있는 집만 바로 계약하는 방식이 아니라','<p>이 공고의 예비입주자 순번은 <strong>해당 주택군에서 공급 가능한 집을 선택하는 순서</strong>이기도 합니다. 순번 발표 후 주택을 개방하고 순서대로 희망 주택을 지정해 계약합니다. 공급호수보다 뒤 순번인 사람은 앞사람의 포기나 추가 공급 가능 물량을 기다릴 수 있습니다. 모든 예비번호가 처음부터 공실 발생만 기다리는 대기번호인 것은 아닙니다.</p><p>공고문은 주택군별 공급호수의 <strong>2.5~3배수</strong>를 예비입주자로 모집한다고 설명합니다. 순번의 유효기간은 발표일부터 60일이며, 실제 선택 가능한 집과 계약 연락을 함께 확인해야 합니다.</p>')
        s=s.replace('공급주택 420호, 예비입주자 모집 1,222명','공급주택 420호, 주택군별 공급호수의 2.5~3배수 예비입주자 모집').replace('420호를 뽑는데 왜 모집인원은 1,222명인가요?','420호보다 예비입주자를 더 많이 뽑는 이유는 무엇인가요?').replace('<td>1,222명</td>','<td>주택군별 공급호수의 2.5~3배수</td>')
        s=paragraph(s,'본인 소득이 같아도 2순위는 부모 소득과 자산까지 함께 보고,','<p><strong>가정 사례:</strong> 1순위가 아닌 청년의 본인 월 소득이 200만원이고 검증대상이 본인과 부모 2명, 총 3명이라고 하겠습니다. 부모 합산 소득이 500만원이면 합계 700만원으로 2순위 소득 상한 8,168,429원 안입니다. 부모 합산 소득이 700만원이면 합계 900만원으로 해당 소득 상한을 넘습니다.</p><p>두 번째 사람도 본인 소득 200만원은 3순위 소득 상한 4,576,036원 안입니다. 다만 <strong>2순위는 본인+부모 자산, 3순위는 본인 자산과 자동차 기준까지 따로 충족해야</strong> 하므로 소득만으로 최종 신청자격이나 당첨을 확정할 수 없습니다. 순위에 맞는 서류 검증이 남아 있습니다.</p>')
        s=before(s,'신청 전 체크리스트','<h2>9월 30일은 오후 4시 마감입니다</h2><p>청약은 <strong>9/28 10:00~9/30 16:00</strong>, 서류심사 대상자 발표는 <strong>10/2 14:00 이후</strong>, 대상자 온라인 서류제출은 <strong>10/6 10:00~10/8 16:00</strong>입니다. 같은 날 마감하는 다른 SH 공고의 오후 5시와 섞지 마세요. 신청 접수와 서류제출은 다른 절차입니다.</p><p>모바일 서류제출은 일반 모바일 웹이 아니라 LH청약플러스 앱을 이용하라는 공고 안내를 확인하세요. 파일은 PDF·JPG·JPEG·GIF·TIF·TIFF, <strong>파일당 3MB 이하</strong>입니다. 개인정보가 담긴 서류는 공식 제출처에만 제출하고 공개 댓글에 올리지 마세요.</p>'+source(Y,'LH 서울 청년 매입임대 공고(2026.09.17)','5~6쪽(일정), 9쪽(온라인 서류제출)'))
        s=paragraph(s,'※ 이 글은 2026년 9월 18일 확인한 LH 공식 페이지를 기준으로 작성했습니다.','<p class="reference-note">※ 9월 18일 작성한 글을 9월 25일에 보완했습니다. 추가한 자격 금액·접수시간·순번 설명은 2026.09.17 모집공고문과 첨부 Q&amp;A 기준입니다. 모집인원 총계 대신 공고문에서 확인되는 주택군별 2.5~3배수 기준을 표시했습니다. 이후 정정과 주택별 임대조건은 신청 직전 공식 원문에서 확인하세요.</p>')
        s=s.replace('420호·예비 1,222명 모집을 정리했습니다.','420호 공급과 주택군별 예비입주자 모집 기준을 정리했습니다.')
        assert '1,222' not in s
        return annotate(s,'공고문 자격 금액·마감시간·주택선택 순번 설명')
    if path in [PATHS[4],PATHS[5]]:
        one=path==PATHS[4]; url=I if one else II
        if one:
            body=('<h2>Ⅰ형 소득·자산 금액으로 한 번 더 확인하세요</h2><p>2026.09.17 공고는 소득 70% 이하, <strong>본인과 배우자 모두 소득이 있으면 90% 이하</strong>를 적용합니다. 아래는 많이 비교하는 2~4인가구 기준이며, 2인가구 가산이 이미 포함된 금액입니다.</p>'+table('Ⅰ형 월평균소득 상한 · 원',['검증 가구원수','70%','맞벌이 90%'],[['2인','4,693,016','5,866,270'],['3인','5,717,900','7,351,586'],['4인','6,161,541','7,921,982']])+'<p>출산가구 완화 전 기본 자산기준은 <strong>총자산 3억4,500만원, 자동차 4,542만원 이하</strong>입니다. 자동차는 총자산에도 포함되고 개별 자동차 기준도 확인합니다. 해당 출산가구는 공고문 자녀수별 완화 표를 별도로 적용합니다.</p><p><strong>가정 사례:</strong> 2인가구 공적 월평균소득 480만원은 70% 상한 4,693,016원을 넘지만, 본인과 배우자 모두 소득이 있다면 90% 상한 5,866,270원 안입니다. 무주택·신청유형·자산 요건까지 갖췄는지는 별도로 봅니다.</p><p>신생아 가구라는 이유만으로 소득·자산 검증을 모두 면제받는 것은 아닙니다. 공고에는 수급자·지원대상 한부모·차상위계층의 검증 예외와 예비신혼부부 예외가 따로 있습니다. <strong>순위와 자격검증 면제를 같은 뜻으로 보지 마세요.</strong></p>'+source(url,'LH 서울 신혼·신생아 매입임대Ⅰ 공고(2026.09.17)','3~5쪽'))
            s=paragraph(s,'LH의 2026년 동일 유형 공식 기준은',body)
            s=before(s,'신청 전 체크리스트','<h2>보증금을 바꾸면 월 임대료가 얼마나 달라지나요?</h2><p>Ⅰ형은 보증금을 늘려 월 임대료를 낮추는 전환과, 보증금을 낮춰 월 임대료를 올리는 전환을 구분합니다. 공고상 증액 전환이율 연 6%를 적용하면 <strong>300만원 추가 납부 → 월 15,000원 감소</strong>, 감액 전환이율 연 3.5%를 적용하면 <strong>300만원 감액 → 월 8,750원 증가</strong>입니다.</p><p>이는 전환 한도·월임대료 하한·10만원 단위를 충족하는 경우의 계산입니다. 증액 전환 한도는 기본 월임대료의 최대 60%이며 실제 가능 금액은 주택별로 다릅니다. Ⅱ형 전세형에는 같은 증액 전환을 적용할 수 없습니다.</p>'+source(url,'LH Ⅰ형 공고','2쪽(임대조건·상호전환)'))
        else:
            body=('<h2>Ⅱ형은 소득 130%, 맞벌이는 200% 기준을 봅니다</h2><p>아래는 2026.09.17 공고의 2~4인가구 월평균소득 상한입니다. <strong>본인과 배우자 모두 소득이 있을 때 200%</strong> 기준을 확인하며, 2인가구 가산은 이미 표에 포함돼 있습니다.</p>'+table('Ⅱ형 월평균소득 상한 · 원',['검증 가구원수','130%','맞벌이 200%'],[['2인','8,212,778','12,319,167'],['3인','10,618,958','16,336,858'],['4인','11,442,863','17,604,404']])+'<p>출산가구 완화 전 기본 총자산 상한은 <strong>3억6,200만원</strong>입니다. 자동차 가액은 총자산에 포함합니다. Ⅰ형의 별도 자동차 상한을 Ⅱ형에 그대로 가져와 판정하지 말고 이번 Ⅱ형 표를 보세요. 자녀수에 따른 완화와 수급자 등의 검증 예외는 공고문 해당 표에서 따로 확인합니다.</p>'+source(url,'LH 서울 신혼·신생아 매입임대Ⅱ(전세형) 공고(2026.09.17)','4~5쪽'))
            s=before(s,'공급 규모와 일정',body)
            s=paragraph(s,'그렇지 않습니다. Ⅱ형은 5순위에 일반 혼인가구가 포함되는 등','<p><strong>가정 사례:</strong> 본인과 배우자 모두 소득이 있는 2인가구의 공적 월평균소득 합계가 800만원이라면, Ⅰ형 맞벌이 상한 5,866,270원은 넘지만 Ⅱ형 맞벌이 상한 12,319,167원 안입니다. 따라서 Ⅰ형 소득기준을 넘었다고 Ⅱ형까지 바로 제외할 수는 없습니다. 무주택·혼인가구 유형·총자산 요건을 이어서 확인해야 합니다.</p><p>Ⅱ형에는 일반 혼인가구 5순위가 있지만 앞 순위를 건너뛰는 것은 아닙니다. 신청 가능한 유형을 확인한 뒤 실제 주택의 보증금·월임대료와 자금 마련 비용을 비교하세요.</p>')
            s=before(s,'신청 전 체크리스트','<h2>보증금 비율 80%는 대출 지원율이 아닙니다</h2><p>공고의 <strong>보증금 비율 80%</strong>는 임대조건을 준전세형으로 구성한다는 뜻이지, LH가 보증금의 80%를 대출해 주거나 대신 낸다는 뜻이 아닙니다. 필요한 현금과 가능한 대출은 따로 확인해야 합니다.</p><p>Ⅱ형은 <strong>보증금을 추가 납부해 월 임대료를 낮추는 증액 전환을 적용하지 않습니다.</strong> 공고가 허용한 것은 보증금을 낮추고 월 임대료를 늘리는 감액 전환입니다. 연 3.5% 기준으로 300만원을 낮추면 월 임대료가 8,750원 늘어납니다. 10만원 단위와 전환 한도가 있으므로 원하는 금액을 모두 낮출 수 있는 것은 아닙니다.</p>'+source(url,'LH Ⅱ형 전세형 공고','2쪽(임대조건·전환 제한)'))
        s=before(s,'신청 전 체크리스트','<p><strong>Ⅰ형과 Ⅱ형은 중복 신청할 수 없습니다.</strong> 두 유형을 비교한 뒤 한 유형·한 모집단위를 선택하세요. 주민등록상 세대를 분리한 배우자도 공고의 무주택세대구성원 범위에 포함되므로 혼자만 무주택이라고 판단하지 않습니다.</p><p>이번 접수는 <strong>9/28 10:00~9/30 16:00</strong>입니다. 서류심사 대상자는 10/2 14:00 이후 확인하고, 대상자 서류는 <strong>10/6 10:00~10/8 16:00 온라인</strong>으로 제출합니다. 우편 제출 일정과 혼동하지 마세요.</p>'+source(url,'해당 유형 모집공고','1쪽(중복 신청), 3쪽(세대 범위), 6~7쪽(신청·서류)'))
        s=paragraph(s,'※ 이 글은 2026년 9월 18일 확인한 LH 공식 페이지','<p class="reference-note">※ 9월 18일 작성한 글을 9월 25일에 보완했습니다. 추가한 금액·시간·전환 조건은 2026.09.17 서울지역본부 해당 유형 모집공고문 기준입니다. 출산가구 완화, 주택별 임대조건 및 이후 정정사항은 신청 직전 공식 원문에서 확인하세요.</p>')
        return annotate(s,'해당 유형 공고문 소득·자산·전환 조건 대조')
    if path==PATHS[6]:
        s=paragraph(s,'소득비율만 보고 가족 수나 무주택세대구성원 범위를','<p><strong>130%의 실제 금액:</strong> 공고문 8쪽 기준 월평균소득 상한은 1인 5,720,045원, 2인 8,212,778원, 3인 10,618,958원, 4인 11,442,863원입니다. 1·2인가구 가산은 이미 포함된 값이므로 다시 더하지 않습니다. 세전 공적 소득자료에 따라 해당 무주택세대구성원 소득을 합산합니다.</p><p><strong>가정 사례:</strong> 서울 거주·성년·무주택세대구성원 등 공통 요건을 갖춘 1인가구가 월 소득 550만원이면 1순위 기준 안이고, 600만원이면 130%를 넘는 2순위에 해당합니다. 소득을 초과했다고 곧바로 신청 불가인 공고가 아닙니다. 같은 순위 경합 시 추첨합니다.</p><p>별거 배우자 포함 여부와 세대원 범위는 공고문 6~8쪽을 확인하세요. 다른 LH 청년 공고의 본인·부모 범위나 금액을 여기에 대입하지 마세요.</p>')
        s=before(s,'신청·서류 일정은 따로 적어두세요','<h2>원하는 호실을 골라 신청하는 공고는 아닙니다</h2><p>공급은 <strong>133개 단지 476호</strong>이며 한 세대가 <strong>한 주택단지</strong>를 지정해 신청합니다. 같은 단지 안의 동·호는 전산 추첨으로 배정하므로, 공급목록에서 마음에 드는 호실을 발견했어도 그 호실을 확정해 신청하는 것은 아닙니다.</p><p>공급호수의 400% 이내 예비입주자는 미계약·계약취소·미입주 등으로 공가가 생길 때 순서대로 공급받으며, 예비자 유효기간은 <strong>최초 당첨자 발표일부터 6개월</strong>입니다. LH 청년 매입임대의 60일 기준과 구분하세요.</p>'+source(SH,'SH 2026년 2차 장기미임대 모집공고(2026.08.28)','3~8쪽 및 15쪽'))
        return annotate(s,'소득 금액·단지 선택·추첨 배정·예비자 기간')
    if path==PATHS[7]:
        s=paragraph(s,'예비입주자 선정은 즉시 입주 확정이 아닙니다.','<p><strong>예비입주자 선정만으로 즉시 입주가 확정되는 것은 아닙니다.</strong> 다만 모든 예비번호를 빈집이 새로 생길 때까지 기다리는 번호로 보면 안 됩니다. <strong>이미 공급할 집을 선택하는 순번인지, 계약대상자 다음의 공가 대기번호인지</strong> 먼저 확인하세요. 아래처럼 공고의 공급 방식에 따라 번호를 읽는 순서가 다릅니다.</p>')
        s=before(s,'예비 1번과 실제 대기 1번은 다를 수 있습니다','<h2>같은 ‘예비’라도 두 가지 공급 방식을 구분하세요</h2>'+table('2026년 실제 공고를 기준으로 구분한 예',['공고','번호의 역할','먼저 확인할 것'],[['LH 서울 3차 청년 매입임대 · 9/17 공고','순번 발표 후 공급 가능한 주택을 순서대로 선택·계약. 뒤 순번은 포기·추가 공급 상황에 따라 대기','주택군 내 현재 공급 가능 호수, 선택 안내일, 발표일부터 60일 유효기간'],['SH 2차 장기미임대 · 8/28 공고','당첨자 동·호는 추첨. 예비자는 미계약·계약취소·미입주 등 공가 발생 시 순차 공급','본인이 당첨자인지 예비자인지, 예비순위, 최초 당첨자 발표일부터 6개월 유효기간']])+'<p>표의 기간을 다른 모집차수에 자동 적용하지 마세요. 연락이 왔더라도 원하는 집을 고를 수 있는지, 서류 검증을 마쳤는지, 언제 계약하고 잔금을 내는지는 별도로 확인해야 합니다. <a href="/blog/lh-youth-purchase-waitlist/">LH 주택선택 순번과 대기번호 사례</a>에서 실제 준비 순서를 이어서 볼 수 있습니다.</p>'+source(Y,'LH 서울 청년 매입임대 공고','1쪽·5쪽')+source(SH,'SH 2차 장기미임대 공고','3쪽·15쪽'))
        return annotate(s,'LH 주택선택 순번과 SH 공가 대기번호 구분')
    if path==PATHS[8]:
        s=once(s,'<td>공실·미계약 발생 시 순차 기회</td>','<td>주택선택 순번 또는 공가 대기순번 · 공고별 구분</td>')
        s=paragraph(s,'특히 예비순번은 “곧 입주”라는 뜻이 아닙니다.','<p>예비순번만으로 “곧 입주”라고 판단할 수는 없지만, 모든 번호가 공실 발생만 기다리는 대기번호인 것도 아닙니다. <strong>LH 서울 2026년 3차 청년 매입임대는 순번 발표 후 공급 가능한 주택을 개방하고 순서대로 집을 선택해 계약</strong>하는 방식입니다. 뒤 순번은 포기·추가 공급 상황에 따라 기다릴 수 있습니다. <a href="/blog/lh-youth-purchase-waitlist/">주택선택 순번과 대기번호의 차이</a>를 확인한 뒤 연락처·유효기간·계약 안내를 관리하세요.</p>'+source(Y,'LH 서울 청년 매입임대 공고(2026.09.17)','1쪽·5쪽'))
        return annotate(s,'예비순번의 공급 방식 구분 · 기존 네이버 연결 유지')
    if path==PATHS[9]:
        body=('<h2>같은 세 계약도 나누어 계산하면 기준이 달라집니다</h2><p><strong>실제 신고자료가 아닌 계산용 가정</strong>입니다. 같은 단지·같은 전용면적·비슷한 시기의 계약 세 건이 다음과 같다고 하겠습니다.</p>'+table('신규·갱신을 섞은 평균과 신규 평균 비교',['계약','구분','전세보증금'],[['A','신규','6억원'],['B','신규','6억2천만원'],['C','갱신','5억2천만원']])+'<p>전체 평균은 <strong>(6 + 6.2 + 5.2) ÷ 3 = 5억8천만원</strong>입니다. 신규 두 건만의 평균은 <strong>(6 + 6.2) ÷ 2 = 6억1천만원</strong>으로 3천만원 높습니다. 새로 들어갈 집을 찾는 사람이 전체 평균만 예산으로 잡으면 이 사례에서는 신규 계약과 차이가 생깁니다.</p><p>신규 두 건 평균도 곧바로 시장 전체 시세가 되는 것은 아닙니다. 층·수리 상태·정확한 계약일을 더 확인해야 합니다. <strong>보증금이 낮다는 이유로 갱신이라고 추정하지 말고</strong> 공개자료의 계약구분을 확인하세요. 구분값이 없으면 ‘미확인’으로 남겨 신규·갱신 평균에 임의로 배정하지 않습니다.</p>')
        s=enrichment(s,body,'갱신계약은 종전 보증금이 있으면 같이 보세요')
        return annotate(s,'가정 거래 3건 비교표·미확인 계약구분 처리')
    if path==PATHS[10]:
        body=('<h2>계약월은 같은데 조회일이 바뀌면 건수도 달라집니다</h2><p>다음은 <strong>실제 강서구 통계가 아닌 설명용 가정</strong>입니다. 집계 대상을 ‘8월 1~31일에 계약한 같은 주택유형·같은 거래유형’으로 고정하고 조회일만 바꾼 예입니다.</p>'+table('동일 계약월의 조회시점별 스냅샷 예시',['자료 조회일','8월 계약 집계','읽는 방법'],[['8월 28일','48건','계약월 자체도 끝나지 않았고 신고도 추가되는 중'],['9월 10일','76건','8월에 체결한 계약의 뒤늦은 신고 등이 반영됨'],['9월 30일','90건','누적 공개 상태. 이후 정정·해제로 다시 바뀔 수 있음']])+'<p>48건에서 90건으로 늘었다고 “9월에 8월 계약이 42건 새로 체결됐다”고 쓰면 안 됩니다. 달라진 것은 <strong>조회 시점의 공개·집계 결과</strong>입니다. 반대로 진행 중인 48건을 완결된 다른 달과 비교해 수요가 반 토막 났다고 판단해서도 안 됩니다.</p><p>비교할 때는 지역·주택유형·거래유형·계약기간·해제 제외 기준을 같게 맞추고, 자료 조회일을 함께 기록하세요. 보고서에는 ‘8월 계약 / 9월 10일 공개자료 기준 / 해제 제외 76건 / 추후 신고·정정 가능’처럼 적으면 어떤 숫자인지 다시 확인할 수 있습니다.</p>')
        s=enrichment(s,body,'거래량 추세는 한 달보다 여러 달로 보세요')
        return annotate(s,'계약기간과 조회일을 구분한 가정 스냅샷 예시')
    if path==PATHS[11]:
        s=paragraph(s,'접수는 9월 11일 17시에 끝났습니다.','<p class="lead"><strong>접수는 9월 11일 17시에 끝난 공고입니다.</strong> 신청했다면 접수번호로 서류심사 대상자 발표와 후속 공지를 조회하고, <strong>선정 여부 → 본인 제출기간 → 제출 완료 여부</strong>를 확인하세요. 새로 서류를 보내기 전에 해당 단계와 기한부터 맞춥니다.</p>')
        s=once(s,'<li><span class="point">9월 21일 서류심사 대상자 발표</span>를 일정에 따로 적어둡니다.</li>','<li>공고상 서류심사 대상자 발표 예정일은 <span class="point">9월 21일</span>입니다. 이 글의 날짜만 보고 기다리지 말고 공식 발표 조회와 후속 일정 변경 여부를 확인합니다.</li>')
        s=paragraph(s,'청년 계층의 순위·가점 구조가 헷갈리면','<p><strong>행복주택과 청년 매입임대의 선정기준은 구분하세요.</strong> Rent Check의 <a href="/tools/youth-score/">청년임대 계산기</a>는 화면에 명시된 LH·SH 매입임대 및 청년안심주택 유형을 위한 도구입니다. 그 결과를 이번 SH 행복주택의 순위·가점 판정으로 사용하면 안 됩니다. 이번 공고는 본인이 신청한 계층과 공식 자격표를 기준으로 확인하세요.</p>')
        return annotate(s,'발표 이후 행동 안내·연결 계산기의 적용 범위')
    raise AssertionError(path)
def links(s):
    soup=BeautifulSoup(s,'html.parser')
    return {a.get('href') for a in soup.select('a[href]') if 'blog.naver.com' in a.get('href','')}
def publish_dates(s): return re.findall(r'"datePublished"\s*:\s*"([^"]*)"',s)
def fingerprints():
    return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in ROOT.rglob('*') if p.is_file() and '.git' not in p.relative_to(ROOT).parts and '__pycache__' not in p.relative_to(ROOT).parts}
def apply():
    initial=fingerprints(); output={}
    for path in PATHS:
        old=read(path)
        if MARK in old: continue
        new=edits(path,old)
        a,b=BeautifulSoup(old,'html.parser'),BeautifulSoup(new,'html.parser')
        assert str(a.h1)==str(b.h1),(path,'h1 changed')
        assert a.select_one('link[rel=canonical]')['href']==b.select_one('link[rel=canonical]')['href']
        assert publish_dates(old)==publish_dates(new),(path,'published date changed')
        assert links(old)<=links(new),(path,'naver link lost')
        assert [str(x) for x in a.select('style,link[rel=stylesheet]')]==[str(x) for x in b.select('style,link[rel=stylesheet]')],(path,'CSS changed')
        assert len(b.select('main'))==1 and len(b.select('h1'))==1
        output[path]=new
        dest=OUT/'originals'/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(old,encoding='utf-8')
    for path,new in output.items(): (ROOT/path).write_text(new,encoding='utf-8')
    sitemap=read('sitemap.xml'); changed=sitemap
    for path in output:
        url='https://rent-check.kr/'+path.removesuffix('index.html')
        pattern=r'(<url>\s*<loc>'+re.escape(url)+r'</loc>.*?<lastmod>)[^<]+(</lastmod>)'
        changed,n=re.subn(pattern,lambda m:m.group(1)+DATE+m.group(2),changed,flags=re.S)
        assert n<=1,(url,n)
    if changed!=sitemap:
        dest=OUT/'originals/sitemap.xml';dest.write_text(sitemap,encoding='utf-8');(ROOT/'sitemap.xml').write_text(changed,encoding='utf-8')
        output['sitemap.xml']=changed
    final=fingerprints();modified={p for p in initial if initial[p]!=final.get(p)}
    assert modified<=set(PATHS)|{'sitemap.xml'},modified
    (OUT/'changed-files.json').write_text(json.dumps(list(output),ensure_ascii=False,indent=2),encoding='utf-8')
    (OUT/'protection-check.json').write_text(json.dumps({'changed':sorted(modified),'unchanged_files':len(initial)-len(modified),'protected':'HTML-only content and matching sitemap lastmod; h1, canonical, datePublished, CSS, Naver links unchanged'}),encoding='utf-8')
    print('EDITED='+json.dumps(list(output),ensure_ascii=False))
def verify():
    for path in PATHS:
        s=read(path);assert s.count(MARK)==1,path
        soup=BeautifulSoup(s,'html.parser')
        for script in soup.select('script[type="application/ld+json"]'): json.loads(script.string or script.get_text())
        for tag in soup.select('a[href]'):
            u=urlsplit(urljoin('https://rent-check.kr/'+path.removesuffix('index.html'),tag['href']))
            if u.hostname!='rent-check.kr':continue
            target=ROOT/unquote(u.path).lstrip('/')
            assert target.is_file() or (target/'index.html').is_file(),(path,u.path)
    assert 20_000_000+800_000*100==100_000_000
    assert (5_000_000+300_000*70)*.005==130000
    assert min(80_000_000*.004,300000)==300000
    assert abs((200000*12-40_000_000*.04)-800000)<.01
    assert 200000*12/40_000_000==.06
    assert abs(((750000-700000)*12+10_000_000*.04)-1_000_000)<.01
    assert round((6+6.2+5.2)/3,1)==5.8 and (6+6.2)/2==6.1
    assert abs(3_000_000*.035/12-8750)<.001 and abs(3_000_000*.06/12-15000)<.001
    assert '5,866,270' in read(PATHS[4]) and '12,319,167' in read(PATHS[5])
    print('CONTENT_CHECKS=PASS: 12 existing URLs; schemas; internal links; example arithmetic; protected metadata')
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');parser.add_argument('--verify',action='store_true')
    args=parser.parse_args()
    if args.apply:apply()
    if args.verify:verify()
