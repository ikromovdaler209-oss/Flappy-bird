import {copyFileSync,mkdirSync} from 'node:fs';
const base=new URL('../',import.meta.url);
mkdirSync(new URL('functions/shared/',base),{recursive:true});
for(const name of ['stats','experience','netcode'])copyFileSync(new URL('src/multiplayer/'+name+'.js',base),new URL('functions/shared/'+name+'.js',base));
console.log('Server match verifier synchronized');
