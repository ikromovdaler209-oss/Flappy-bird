import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const languages=['EN','RU','ZH','ES','PT'];let dictionaries=0;
for(const dir of ['src/game','src/ui','src/firebase','src/multiplayer','src/campaign'])for(const file of readdirSync(new URL('../'+dir+'/',import.meta.url)).filter(f=>f.endsWith('.js'))){
 const s=readFileSync(new URL('../'+dir+'/'+file,import.meta.url),'utf8');
 for(const m of s.matchAll(/(?:const|let)\s+(\w+)\s*=\s*\{/g)){
  const start=m.index+m[0].length-1;let level=0,quote='',escape=false,end=-1;
  for(let i=start;i<s.length;i++){const c=s[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')level++;if(c==='}'&&!--level){end=i;break;}}
  if(end<0)continue;let obj;try{obj=vm.runInNewContext('('+s.slice(start,end+1)+')',{},{timeout:100})}catch{continue;}
  if(!obj.EN||typeof obj.EN!=='object'||!obj.RU)continue;
  dictionaries++;
  for(const lang of languages){assert.ok(obj[lang],file+' '+m[1]+' '+lang);for(const [key,value] of Object.entries(obj.EN)){
   assert.ok(typeof obj[lang][key]==='string'&&obj[lang][key].length,file+' '+m[1]+' '+lang+': '+key);
   assert.deepEqual([...String(value).matchAll(/\{\w+\}/g)].map(x=>x[0]).sort(),[...obj[lang][key].matchAll(/\{\w+\}/g)].map(x=>x[0]).sort(),file+' placeholders '+key);
  }}
 }
}
assert.ok(dictionaries>=10);console.log('PASS',dictionaries,'translation dictionaries: all 5 languages, keys and placeholders');
