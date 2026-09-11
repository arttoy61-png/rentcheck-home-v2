(()=>{
  const district=document.querySelector('#supplyDistrict');
  const complex=document.querySelector('#complex');
  const area=document.querySelector('#area');
  if(!district||!complex||!area)return;

  const original=[...complex.options]
    .filter(o=>o.value)
    .map(o=>({value:o.value,text:o.textContent||''}));

  const districts=[...new Set(original.map(o=>o.value.split('|')[0]))]
    .sort((a,b)=>a.localeCompare(b,'ko'));

  districts.forEach(d=>{
    const o=document.createElement('option');
    o.value=d;
    o.textContent=d;
    district.appendChild(o);
  });

  complex.innerHTML='<option value="">단지를 선택하세요</option>';
  complex.disabled=true;
  area.innerHTML='<option value="">면적을 선택하세요</option>';
  area.disabled=true;

  district.addEventListener('change',()=>{
    const d=district.value;
    complex.innerHTML='<option value="">단지를 선택하세요</option>';
    area.innerHTML='<option value="">면적을 선택하세요</option>';
    area.disabled=true;

    if(!d){
      complex.disabled=true;
      complex.dispatchEvent(new Event('change',{bubbles:true}));
      return;
    }

    original
      .filter(o=>o.value.startsWith(d+'|'))
      .sort((a,b)=>a.text.localeCompare(b.text,'ko'))
      .forEach(item=>{
        const o=document.createElement('option');
        o.value=item.value;
        o.textContent=item.text.replace(/^.*? · /,'');
        complex.appendChild(o);
      });

    complex.disabled=false;
    complex.dispatchEvent(new Event('change',{bubbles:true}));
  });
})();