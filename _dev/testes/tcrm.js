/* ══════════════════════════════════════════════════════════════════════
   O AGENDAMENTO TEM QUE CONTAR COMO VISITA NO CLIENTES 360.

   Carrega o painel corrigido, entrega um pacote com 1 cliente e
   agendamentos nas formas que a vida produz (app do cliente manda só
   nome+telefone; o painel às vezes manda idCliente) e confere o que o
   cartão do cliente mostra. O mesmo teste roda contra o arquivo ANTIGO,
   para provar que ele dava zero.
   ══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const RAIZ  = '/mnt/user-data/uploads/aloco-clientes/painel-app-pwa';
const NOVO  = '/home/claude/aud/saida/index.html';

let ok = 0, mau = 0;
const t = (n, c, x) => {
  if (c) { ok++; console.log('ok    ' + n); }
  else   { mau++; console.log('ERRO  ' + n + (x !== undefined ? '  -> ' + JSON.stringify(x) : '')); }
};

const PACOTE = {
  ok: true, papel: 'master',
  home: { receitaBruta: 0, comissoes: 0, receitaLiquida: 0, capacidadeDia: 20, horariosVagos: 20 },
  fin:  { receitaBruta: 0, comissoes: 0, receitaLiquida: 0 },
  clientes: [
    { id:'CL1', barbearia:'marcos-2', nome:'Marcos Diniz',
      telefone:'(79) 99924-1960', status:'ATIVO', criadoEm:'2026-10-01', dataCadastro:'01/10/2026' }
  ],
  agendamentos: [
    /* como o APP DO CLIENTE grava: so nome e telefone, sem id nenhum */
    { id:'AG1', barbearia:'marcos-2', data:'2026-10-05', horario:'14:00',
      cliente:'Marcos Diniz', telefone:'79999241960', servico:'Corte',
      barbeiro:'', valor:30, status:'CONFIRMADO' },
    { id:'AG2', barbearia:'marcos-2', data:'2026-10-09', horario:'10:00',
      cliente:'marcos diniz', telefone:'5579999241960', servico:'Corte',
      barbeiro:'', valor:30, status:'CONFIRMADO' },
    /* cancelado nao conta */
    { id:'AG3', barbearia:'marcos-2', data:'2026-10-10', horario:'11:00',
      cliente:'Marcos Diniz', telefone:'79999241960', servico:'Corte',
      barbeiro:'', valor:30, status:'CANCELADO' },
    /* bloqueio nao e cliente */
    { id:'AG4', barbearia:'marcos-2', data:'2026-10-11', horario:'08:00',
      cliente:'Indisponível', telefone:'', servico:'', barbeiro:'',
      valor:0, status:'BLOQUEADO' },
    /* de outra pessoa */
    { id:'AG5', barbearia:'marcos-2', data:'2026-10-07', horario:'15:00',
      cliente:'Outro Alguem', telefone:'79988887777', servico:'Corte',
      barbeiro:'', valor:50, status:'CONFIRMADO' }
  ],
  barbeiros: [], servicos: [], comandas: [], fila: [],
  reativacao: [], aniversariantes: { mes: 0, lista: [] }
};

const TIPO = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
               '.css':'text/css; charset=utf-8', '.json':'application/json', '.webp':'image/webp' };

function servir(arquivoIndex, porta) {
  const s = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    let f;
    if (u === '/' || u === '/painel-app-pwa/' || u === '/painel-app-pwa/index.html') f = arquivoIndex;
    else f = path.join(RAIZ, u.replace('/painel-app-pwa/', '/'));
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); res.end(''); return; }
      res.writeHead(200, { 'Content-Type': TIPO[path.extname(f)] || 'text/plain' });
      res.end(d);
    });
  });
  return new Promise(r => s.listen(porta, () => r(s)));
}

async function medir(br, porta) {
  const p = await br.newPage({ viewport: { width: 1150, height: 880 } });
  const erros = [];
  p.on('pageerror', e => erros.push(String(e)));
  await p.addInitScript(() => { try { sessionStorage.setItem('aloco_senha', 'TESTE'); } catch (e) {} });
  await p.route('**script.google.com/**', async r => {
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PACOTE) });
  });
  await p.goto('http://localhost:' + porta + '/painel-app-pwa/?b=marcos-2', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);

  /* chama a funcao direto: e ela que esta sob teste */
  const r = await p.evaluate(pac => {
    if (typeof _cliEnrichBasic !== 'function') return { semFuncao: true };
    const out = _cliEnrichBasic(pac.clientes, pac.agendamentos);
    const c = out[0] || {};
    return { visitas: c._atend, gasto: c._totalGasto, ultima: c._ultimaV,
             novo: c._novo, vip: c._vip, dias: c._diasSemV };
  }, PACOTE);
  r.erros = erros;
  await p.close();
  return r;
}

(async () => {
  const sNovo   = await servir(NOVO, 8921);
  const sVelho  = await servir(path.join(RAIZ, 'index.html'), 8922);
  const br = await chromium.launch({ args: ['--no-sandbox'] });

  const velho = await medir(br, 8922);
  const novo  = await medir(br, 8921);

  console.log('\n— ANTES (arquivo de producao hoje) —');
  console.log('  visitas=' + velho.visitas + '  gasto=' + velho.gasto + '  ultima=' + velho.ultima);
  console.log('— DEPOIS (corrigido) —');
  console.log('  visitas=' + novo.visitas + '  gasto=' + novo.gasto + '  ultima=' + novo.ultima + '\n');

  t('o arquivo de hoje realmente da ZERO visita', velho.visitas === 0, velho.visitas);
  t('corrigido conta as 2 visitas validas', novo.visitas === 2, novo.visitas);
  t('corrigido casa telefone com e sem o 55', novo.visitas === 2, novo.visitas);
  t('cancelado NAO conta', novo.visitas === 2, novo.visitas);
  t('bloqueio NAO vira cliente', novo.visitas === 2, novo.visitas);
  t('agendamento de outra pessoa NAO conta', novo.gasto === 60, novo.gasto);
  t('ultima visita e a mais recente', novo.ultima === '2026-10-09', novo.ultima);
  t('com 2 visitas deixa de ser "Novo"', novo.novo === false, novo.novo);
  t('nao virou VIP com R$60', novo.vip === false, novo.vip);
  t('nao contou duas vezes (gasto = 30+30)', novo.gasto === 60, novo.gasto);
  t('sem erro de JavaScript', (novo.erros || []).length === 0, novo.erros);

  await br.close();
  sNovo.close(); sVelho.close();
  console.log('\n' + ok + ' passou / ' + mau + ' falhou');
  process.exit(mau ? 1 : 0);
})();
