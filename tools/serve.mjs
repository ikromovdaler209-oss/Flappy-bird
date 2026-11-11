import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8000);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
createServer(async (req,res) => {
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
  let pathname;
  try {pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}
  catch {res.writeHead(400);res.end();return;}
  let target=path.resolve(root, '.'+pathname);
  if (target !== root && !target.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
  try {
    if ((await stat(target)).isDirectory()) target=path.join(target,'index.html');
    const content=await readFile(target);
    res.writeHead(200, {'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:content);
  } catch {res.writeHead(404);res.end('Not Found');}
}).listen(port, () => console.log(`High Fly: http://localhost:${port}`));
