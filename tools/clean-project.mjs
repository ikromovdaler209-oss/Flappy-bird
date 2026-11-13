// Remove only Finder/AppleDouble metadata. Run without --apply to inspect first.
import {readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const apply=process.argv.includes('--apply');
let count=0;
async function visit(directory){
  for(const entry of await readdir(directory,{withFileTypes:true})){
    if(entry.isSymbolicLink()||['.git','node_modules'].includes(entry.name))continue;
    const target=path.join(directory,entry.name);
    const metadata=entry.name==='.DS_Store'||entry.name.startsWith('._');
    if(metadata&&entry.isFile()){
      console.log((apply?'Removed ':'Found ')+path.relative(root,target));
      if(apply)await rm(target);
      count++;
    }else if(entry.isDirectory())await visit(target);
  }
}
await visit(root);
console.log(count+' metadata files'+(apply?' removed.':' found. Use --apply to remove.'));
