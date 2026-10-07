/* Serve o repositorio inteiro em http://localhost:8777 para os testes.
   O caminho /painel-app-pwa/ e servido como esta no repositorio — a
   armadilha aqui e o tipo do arquivo: .css PRECISA sair como text/css.
   Servido como text/plain, a folha de estilo parseia para ZERO regras em
   modo standards e o teste passa a medir a tela sem estilo nenhum. */
const http=require('http'), fs=require('fs'), path=require('path');
const RAIZ = path.join(__dirname,'..','..');
const TIPO = {
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml'
};
http.createServer((q,r)=>{
  let p = q.url.split('?')[0];
  if (p === '/' || p === '/painel-app-pwa/') p = '/painel-app-pwa/index.html';
  const f = path.join(RAIZ, p);
  if (f.indexOf(RAIZ) !== 0){ r.writeHead(403); return r.end('fora'); }
  fs.readFile(f, (e,d)=>{
    if (e){ r.writeHead(404); return r.end('nao achei ' + p); }
    r.writeHead(200, { 'Content-Type': TIPO[path.extname(p)] || 'text/plain' });
    r.end(d);
  });
}).listen(8777, ()=>console.log('servindo o repositorio em http://localhost:8777'));
