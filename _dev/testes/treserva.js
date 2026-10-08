/* ══════════════════════════════════════════════════════════════════════
   A RESERVA SÓ PODE DIZER "RESERVADO" QUANDO O SERVIDOR CONFIRMAR.

   Abre o app real do marcos-2, injeta o patch.js novo, percorre o fluxo
   de agendamento até o botão Confirmar e responde o servidor de quatro
   jeitos. Mede o que o cliente vê em cada um, e quantos pedidos saíram.
   ══════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const RAIZ  = '/mnt/user-data/uploads/aloco-clientes';
const PATCH = '/home/claude/aud/saida/patch.js';

let ok = 0, mau = 0;
const t = (n, c, x) => {
  if (c) { ok++; console.log('ok    ' + n); }
  else   { mau++; console.log('ERRO  ' + n + (x !== undefined ? '  -> ' + JSON.stringify(x) : '')); }
};

/* servidor: o app de verdade + o patch.js novo */
const TIPO = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
               '.css':'text/css; charset=utf-8', '.json':'application/json' };
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  let f = (u === '/patch.js') ? PATCH : path.join(RAIZ, u);
  if (u === '/') f = path.join(RAIZ, 'clientes/marcos-2/index.html');
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); res.end('nao achei'); return; }
    res.writeHead(200, { 'Content-Type': TIPO[path.extname(f)] || 'text/plain' });
    res.end(d);
  });
});

async function abrir(br, responder) {
  const p = await br.newPage({ viewport: { width: 430, height: 932 } });
  const pedidos = [];
  const erros = [];
  p.on('pageerror', e => erros.push(String(e)));

  await p.route('**script.google.com/**', async r => {
    const req = r.request();
    if (req.method() === 'POST') {
      let corpo = {};
      try { corpo = JSON.parse(req.postData() || '{}'); } catch (e) {}
      if (corpo.action === 'agendar') {
        pedidos.push(corpo);
        const resp = responder(pedidos.length);
        if (resp === 'CAIU') { await r.abort('failed'); return; }
        await new Promise(s => setTimeout(s, 250));
        await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resp) });
        return;
      }
    }
    /* leituras: devolve vazio, o teste não depende delas */
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"dados":[]}' });
  });

  await p.addInitScript(() => {
    try {
      localStorage.setItem('aloco_cliente', JSON.stringify({
        nome: 'Teste', sobrenome: 'Reserva', telefone: '79999990000'
      }));
    } catch (e) {}
  });

  await p.goto('http://localhost:8911/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);

  /* o patch precisa ter assumido a função */
  const assumiu = await p.evaluate(() => !!window.__alocoReservaFirme);

  /* monta o estado do agendamento direto, como o fluxo faria */
  await p.evaluate(() => {
    selSvc  = { nome: 'Corte', preco: 'R$30' };
    selBar  = 'Teste Auditoria';
    selSlot = '14:00';
    selDate = 'SEXTA, 09 OUT';
    window.selDateISO = '2026-10-09';
    document.querySelectorAll('.stage').forEach(s => s.classList.remove('active'));
    const s2 = document.getElementById('ag-stage-2');
    if (s2) s2.classList.add('active');
    const b = document.getElementById('ag-cta-2');
    if (b) b.disabled = false;
  });

  return { p, pedidos, erros, assumiu };
}

function vis(p, id) {
  return p.evaluate(x => {
    const e = document.getElementById(x);
    return !!e && e.classList.contains('active');
  }, id);
}
function toast(p) {
  return p.evaluate(() => {
    const d = [...document.querySelectorAll('div')]
      .filter(e => e.children.length === 0 && /position:\s*fixed/.test(e.getAttribute('style') || ''));
    return d.map(e => (e.textContent || '').trim()).filter(Boolean).join(' | ');
  });
}

(async () => {
  await new Promise(r => srv.listen(8911, r));
  const br = await chromium.launch({ args: ['--no-sandbox'] });

  /* ── 1. o patch assume a função ────────────────────────────────── */
  {
    const { p, assumiu } = await abrir(br, () => ({ ok: true }));
    t('o patch assume o confirmarAgendamento', assumiu === true);
    await p.close();
  }

  /* ── 2. servidor confirma -> tela de sucesso ──────────────────── */
  {
    const { p, pedidos, erros } = await abrir(br, () => ({ ok: true, mensagem: 'Agendamento recebido!' }));
    await p.evaluate(() => confirmarAgendamento());
    await p.waitForTimeout(1800);
    t('ok:true leva para a tela de sucesso', await vis(p, 'ag-stage-3'));
    t('ok:true mandou UM pedido só (sem duplicar)', pedidos.length === 1, pedidos.length);
    t('o pedido levou os dados certos',
      pedidos[0] && pedidos[0].servico === 'Corte' && pedidos[0].horario === '14:00'
      && pedidos[0].data === '2026-10-09' && pedidos[0].valor === 30
      && pedidos[0].telefone === '79999990000', pedidos[0]);
    t('sem erro de JavaScript', erros.length === 0, erros);
    await p.close();
  }

  /* ── 3. horário ocupado -> NÃO mostra sucesso ─────────────────── */
  {
    const { p, pedidos } = await abrir(br, () => ({ ok: false, erro: 'horario_ocupado' }));
    await p.evaluate(() => confirmarAgendamento());
    await p.waitForTimeout(1800);
    t('horario_ocupado NAO pinta "RESERVADO"', (await vis(p, 'ag-stage-3')) === false);
    t('horario_ocupado deixa o cliente na escolha', await vis(p, 'ag-stage-2'));
    const msg = await toast(p);
    t('horario_ocupado avisa o cliente', /preenchido/i.test(msg), msg);
    t('horario_ocupado nao reenviou', pedidos.length === 1, pedidos.length);
    t('o botao volta a funcionar',
      await p.evaluate(() => { const b = document.getElementById('ag-cta-2'); return !!b && !b.disabled; }));
    await p.close();
  }

  /* ── 4. internet caiu -> NÃO mostra sucesso, e diz a verdade ──── */
  {
    const { p } = await abrir(br, () => 'CAIU');
    await p.evaluate(() => confirmarAgendamento());
    await p.waitForTimeout(2000);
    t('queda de rede NAO pinta "RESERVADO"', (await vis(p, 'ag-stage-3')) === false);
    const msg = await toast(p);
    t('queda de rede diz que NAO reservou', /N[ÃA]O foi reservado/i.test(msg), msg);
    await p.close();
  }

  /* ── 5. erro generico do servidor ─────────────────────────────── */
  {
    const { p } = await abrir(br, () => ({ ok: false, erro: 'qualquer_coisa', mensagem: 'Deu ruim.' }));
    await p.evaluate(() => confirmarAgendamento());
    await p.waitForTimeout(1800);
    t('erro generico NAO pinta "RESERVADO"', (await vis(p, 'ag-stage-3')) === false);
    t('erro generico mostra a mensagem do servidor', /Deu ruim/.test(await toast(p)));
    await p.close();
  }

  /* ── 6. dois cliques seguidos nao viram dois agendamentos ─────── */
  {
    const { p, pedidos } = await abrir(br, () => ({ ok: true }));
    await p.evaluate(() => {
      const b = document.getElementById('ag-cta-2');
      b.click(); b.click(); b.click();
    });
    await p.waitForTimeout(2200);
    t('tres cliques = UM agendamento', pedidos.length === 1, pedidos.length);
    await p.close();
  }

  /* ── 7. Remarcar e o relogio ──────────────────────────────────── */
  {
    const { p } = await abrir(br, () => ({ ok: true }));
    const r = await p.evaluate(() => {
      const bt = [...document.querySelectorAll('.cta2')]
        .find(b => /^\s*Remarcar\s*$/i.test(b.textContent || ''));
      const mortas = [...document.querySelectorAll('.style-row')]
        .filter(e => /^(Notificações|Privacidade|Ajuda)\s*›?$/.test((e.textContent || '').replace(/\s+/g, ' ').trim()))
        .filter(e => getComputedStyle(e).display !== 'none');
      const agora = new Date();
      const hh = ('0' + agora.getHours()).slice(-2) + ':' + ('0' + agora.getMinutes()).slice(-2);
      const relogios = [...document.querySelectorAll('.sb-time')].map(e => e.textContent.trim());
      return { temRemarcar: !!bt, remarcarLigado: !!(bt && bt.__alocoOk),
               mortasVisiveis: mortas.length, hh, relogios };
    });
    t('o botao Remarcar existe', r.temRemarcar);
    t('o Remarcar foi ligado', r.remarcarLigado);
    t('Notificacoes/Privacidade/Ajuda nao aparecem mais mortas', r.mortasVisiveis === 0, r.mortasVisiveis);
    t('nenhum relogio ficou em 09:41', r.relogios.indexOf('09:41') < 0, r.relogios);
    t('todos os relogios mostram a hora certa',
      r.relogios.every(x => x === r.hh), r.relogios);
    await p.close();
  }

  await br.close();
  srv.close();
  console.log('\n' + ok + ' passou / ' + mau + ' falhou');
  process.exit(mau ? 1 : 0);
})();
