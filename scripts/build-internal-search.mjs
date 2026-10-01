import fs from 'node:fs';
const records=[];
for(const section of ['blog','analysis'])for(const dir of fs.readdirSync(section,{withFileTypes:true}).filter(x=>x.isDirectory())){
 if(['all','apartment'].includes(dir.name))continue;
 const file=section+'/'+dir.name+'/index.html';if(!fs.existsSync(file))continue;
 const html=fs.readFileSync(file,'utf8'),title=html.match(/<title>([^<]+)<\/title>/)?.[1];if(!title)continue;
 const description=html.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1]||'';
 const headings=[...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map(x=>x[1].replace(/<[^>]*>/g,' ')).join(' ');
 records.push({title:title.replace(/\s*\|\s*Rent Check.*$/,'').replaceAll('&amp;','&'),url:`/${section}/${dir.name}/`,category:section==='analysis'?'자체 분석':'사이트 가이드',description,keywords:(description+' '+headings).replace(/\s+/g,' ').slice(0,2500)});
}
fs.writeFileSync('data/internal-search.json',JSON.stringify(records,null,2)+'\n');
console.log('Internal search records:',records.length);
