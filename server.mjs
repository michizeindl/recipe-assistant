import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root=path.resolve(fileURLToPath(new URL('./dist/',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  if(!(await stat(file)).isFile()){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'});
  res.end(await readFile(file));
 }catch{res.writeHead(404).end('Nicht gefunden');}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>{
 const url='http://127.0.0.1:'+server.address().port;
 console.log('Recipe Assistant: '+url);
 if(process.argv.includes('--open')&&process.platform==='win32')spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'}).unref();
});
server.on('error',error=>{if(error.code==='EADDRINUSE')console.error('Port ist bereits belegt. Eine laufende Recipe-Assistant-App zuerst beenden oder einen anderen PORT wählen.');else console.error(error.message);process.exitCode=1;});
