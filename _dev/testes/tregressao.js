/* Regressão: o painel corrigido abre, navega e não quebra nada. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const RAIZ = '/mnt/user-data/uploads/aloco-clientes/painel-app-pwa';
const NOVO = '/home/claude/aud/saida/index.html';

let ok = 0, mau = 0;
const t = (n, c, x) => { if (c) { ok++; console.log('ok    ' + n); }
  else { mau++; console.log('ERRO  ' + n + (x !== undefined ? '  -> ' + JSON.stringify(x) : '')); } };

const PACOTE = { ok:true, papel:'master',
  home:{receitaBruta:30,comissoes:0,receitaLiquida:30,capacidadeDia:20,horariosVagos:20,receita7d:[0,0,0,0,0,0,30]},
  fin:{receitaBruta:30,comissoes:0,receitaLiquida:30,pagamentos:[],grafico7d:[],movimentacoes:[],receitaBarb:[],receitaSvc:[],ranking:[]},
  clientes:[{id:'CL1',barbearia:'marcos-2',nome:'Marcos',telefone:'79999241960',status:'ATIVO',dataCadastro:'01/10/2026'}],
  agendamentos:[{id:'AG1',barbearia:'marcos-2',data:'2026-10-09',horario:'14:00',cliente:'Marcos',telefone:'79999241960',servico:'Corte',barbeiro:'Teste',valor:30,status:'CONFIRMADO'}],
  barbeiros:[{id:'BB1',barbearia:'marcos-2',nome:'Teste',status:'ATIVO'}],
  servicos:[{id:'SV1',barbearia:'marcos-2',nome:'Corte',preco:30,duracao:30,status:'ATIVO'}],
  comandas:[], fila:[], reativacao:[], aniversariantes:{mes:0,lista:[]} };

const TIPO = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
               '.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp' };

(async () => {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = (u === '/' || /index\.html$/.test(u) || u === '/painel-app-pwa/')
      ? NOVO : path.join(RAIZ, u.replace('/painel-app-pwa/', '/'));
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); res.end(''); return; }
      res.writeHead(200, { 'Content-Type': TIPO[path.extname(f)] || 'text/plain' }); res.end(d);
    });
  });
  await new Promise(r => srv.listen(8931, r));

  const br = await chromium.launch({ args: ['--no-sandbox'] });
  const p = await br.newPage({ viewport: { width: 1150, height: 880 } });
  const erros = [];
  p.on('pageerror', e => erros.push(String(e)));
  await p.addInitScript(() => { try { sessionStorage.setItem('aloco_senha', 'TESTE'); } catch (e) {} });
  await p.route('**script.google.com/**', async r =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PACOTE) }));
  await p.goto('http://localhost:8931/painel-app-pwa/?b=marcos-2', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);

  t('o painel abre logado', await p.evaluate(() => !!document.querySelector('nav .nb')));

  const telas = ['nb-home','nb-barb','nb-svc','nb-hora','nb-agd','nb-fila','nb-pac','nb-cli','nb-cx','nb-fin','nb-eq'];
  for (const id of telas) {
    await p.evaluate(x => { const e = document.getElementById(x); if (e) e.click(); }, id);
    await p.waitForTimeout(700);
    const vazia = await p.evaluate(() => (document.getElementById('ct').textContent || '').trim().length < 5);
    t('a tela ' + id + ' pinta alguma coisa', !vazia);
  }

  await p.evaluate(() => { document.getElementById('nb-cli').click(); });
  await p.waitForTimeout(1500);
  const visitas = await p.evaluate(() => {
    const m = (document.getElementById('ct').textContent || '').match(/(\d+)\s*Visitas/);
    return m ? +m[1] : null;
  });
  t('o cartao do cliente mostra 1 visita (antes mostrava 0)', visitas === 1, visitas);

  /* svAgd agora exige telefone */
  await p.evaluate(() => { document.getElementById('nb-agd').click(); });
  await p.waitForTimeout(1500);
  const val = await p.evaluate(async () => {
    window.oModal('new-agd'); window.pAgd();
    await new Promise(r => setTimeout(r, 600));
    const out = [];
    const tos = () => ((document.getElementById('tos') || {}).textContent || '').trim();
    document.getElementById('tos').textContent = '';
    window.svAgd(); await new Promise(r => setTimeout(r, 400)); out.push(tos());
    document.getElementById('agd-nome').value = 'Fulano';
    document.getElementById('tos').textContent = '';
    window.svAgd(); await new Promise(r => setTimeout(r, 400)); out.push(tos());
    window.fModal('new-agd');
    return out;
  });
  t('sem nome -> pede o nome', /Informe o nome/.test(val[0]), val[0]);
  t('sem telefone -> PEDE O TELEFONE (antes inventava 00000000000)',
    /Informe o telefone/.test(val[1]), val[1]);

  t('nenhum erro de JavaScript em todo o passeio', erros.length === 0, erros);

  await br.close(); srv.close();
  console.log('\n' + ok + ' passou / ' + mau + ' falhou');
  process.exit(mau ? 1 : 0);
})();
