/* CSV rows prove observations, not successful collection of an empty month. */
(function(root){
  'use strict';
  const MONTHS=[];
  for(let y=2024,m=9;;){const ym=String(y)+String(m).padStart(2,'0');MONTHS.push(ym);if(ym==='202607')break;if(++m===13){m=1;y++}}
  const TYPES={apt:{label:'아파트',deal:'아파트_전월세'},house:{label:'주택(연립·다세대)',deal:'연립다세대_전월세'},off:{label:'오피스텔',deal:'오피스텔_전월세'}};
  function parseCSV(text){
    const records=[];let row=[],value='',quoted=false;
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(value);value=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(Boolean))records.push(row);row=[];value=''}else value+=c}
    if(quoted)throw Error('CSV 인용부호 오류');
    row.push(value);if(row.some(Boolean))records.push(row);
    const headers=(records.shift()||[]).map(x=>x.replace(/^\uFEFF/,''));
    for(const key of ['deal_type','deal_ym','monthly_rent','cdeal_type'])if(!headers.includes(key))throw Error('CSV 필수 열 누락: '+key);
    return records.map(values=>{if(values.length!==headers.length)throw Error('CSV 열 개수 오류');return Object.fromEntries(headers.map((key,i)=>[key,values[i]]))});
  }
  function rentNumber(value){const raw=String(value??'').replaceAll(',','').trim();if(!/^\d+(?:\.\d+)?$/.test(raw))return null;const n=Number(raw);return Number.isFinite(n)?n:null}
  function build(rows,coverage){
    const results={};
    for(const [key,type] of Object.entries(TYPES)){
      const map=Object.fromEntries(MONTHS.map(m=>[m,{m,j:null,w:null,observed:0,invalid:0}]));
      for(const row of rows){if(row.deal_type!==type.deal||!map[row.deal_ym])continue;const cell=map[row.deal_ym];cell.observed++;if(String(row.cdeal_type||'').trim()==='O')continue;const rent=rentNumber(row.monthly_rent);if(rent===null){cell.invalid++;continue}if(cell.j===null){cell.j=0;cell.w=0}cell[rent===0?'j':'w']++}
      const series=MONTHS.map(m=>{const x=map[m],verified=coverage?.[type.deal]?.[m]==='complete';return {...x,state:x.invalid?'partial':!x.observed?(verified?'zero':'missing'):'observed',j:x.invalid?null:verified?(x.j??0):x.j,w:x.invalid?null:verified?(x.w??0):x.w,verified}});
      const missing=series.filter(x=>x.state==='missing').map(x=>x.m),partial=series.filter(x=>x.state==='partial').map(x=>x.m);
      results[key]={series,missing,partial,canCompare:missing.length===0&&partial.length===0&&series.every(x=>x.verified)};
    }
    return results;
  }
  function average(series,key){if(!series.length||series.some(x=>x[key]===null))return null;return series.reduce((sum,x)=>sum+x[key],0)/series.length}
  const api={MONTHS,TYPES,parseCSV,rentNumber,build,average};
  if(typeof module!=='undefined')module.exports=api;else root.RentTrendData=api;
})(typeof globalThis!=='undefined'?globalThis:this);
