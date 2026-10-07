/* palco do BARBER IA por voz */
const http=require('http'),fs=require('fs'),path=require('path');
const RAIZ=path.join(__dirname,'..','..');
const t={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png'};
http.createServer((q,r)=>{
  let p=q.url.split('?')[0];
  if(p==='/') p='/_dev/testes/palco.html';
  const f = p.indexOf('/painel-app-pwa/')===0 ? path.join(RAIZ,p) : path.join(RAIZ,p);
  fs.readFile(f,(e,d)=>{
    if(e){r.writeHead(404);return r.end('x');}
    r.writeHead(200,{'Content-Type':t[path.extname(p)]||'text/plain'});r.end(d);
  });
}).listen(8742,()=>console.log('8742'));
