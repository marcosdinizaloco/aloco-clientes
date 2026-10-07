/* ══════════════════════════════════════════════════════════════════════
   O PAINEL INTEIRO COMO UM SISTEMA SO

   Nao testa aparencia "bonita": testa CONTINUIDADE. A pergunta de cada
   bloco e sempre a mesma — ao sair da Home e entrar aqui, a pessoa
   continua no mesmo produto?

   O backend responde em 900ms (Apps Script acordado). O que importa nao
   e so o numero final: e QUANDO a estrutura aparece.
   ══════════════════════════════════════════════════════════════════════ */
const fs=require('fs'); const { chromium } = require('playwright');
const B=fs.readFileSync(__dirname+'/bundle.json','utf8');
const H=fs.readFileSync(__dirname+'/horario.json','utf8');
const P=fs.readFileSync(__dirname+'/pacotes.json','utf8');
const LAT=900;

const TELAS=[['nb-agd','Agenda'],['nb-cx','Caixa'],['nb-cli','Clientes'],
             ['nb-barb','Profissionais'],['nb-svc','Serviços'],['nb-hora','Horários'],
             ['nb-pac','Pacotes'],['nb-fila','Fila de espera'],
             ['nb-fin','Financeiro'],['nb-eq','Ajustes']];

const RAIO_OK=['11px','14px','18px','50%','999px','9999px','0px'];
const CORPO_OK=['13px','14px','15px'];

function corpo(u){ if(/action=bundle/.test(u))return B; if(/action=horario/.test(u))return H;
  if(/action=pacotes/.test(u))return P; return '{"ok":true,"dados":[]}'; }

let ok=0, mau=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('ok    '+n);} else {mau++;console.log('ERRO  '+n+(x!==undefined?'  -> '+JSON.stringify(x):''));} };

async function abrir(p,id){
  const t0=Date.now();
  await p.evaluate(i=>document.getElementById(i).click(),id);
  let tEstrutura=null;
  for(let i=0;i<200;i++){
    const st=await p.evaluate(()=>{const c=document.getElementById('ct');
      return { sk:!!c.querySelector('.sk'), car:/Carregando/i.test(c.textContent||''),
               n:c.querySelectorAll('div,button,input,select,table').length }; });
    if(tEstrutura===null && st.n>10) tEstrutura=Date.now()-t0;
    if(!st.sk && !st.car && st.n>12) return {tEstrutura, tDados:Date.now()-t0};
    await p.waitForTimeout(25);
  }
  return {tEstrutura, tDados:null};
}

(async()=>{
const br=await chromium.launch({args:['--no-sandbox']});
const p=await br.newPage({viewport:{width:430,height:932}});
const erros=[]; p.on('pageerror',e=>erros.push(String(e)));
let rede=[];
await p.addInitScript(()=>{try{sessionStorage.setItem('aloco_senha','TESTE')}catch(e){}});
await p.route('**script.google.com/**', async r=>{
  rede.push((/action=([a-z_]+)/.exec(r.request().url())||[0,'post'])[1]);
  await new Promise(s=>setTimeout(s,LAT));
  r.fulfill({status:200,contentType:'application/json',body:corpo(r.request().url())});
});
await p.goto('http://localhost:8777/painel-app-pwa/?b=marcos-2',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(3200);

/* ── abertura do painel: nenhuma leitura igual duas vezes ────────── */
{ const c={}; rede.forEach(a=>c[a]=(c[a]||0)+1);
  t('abertura: o pacote nao e buscado duas vezes', (c.bundle||0)<=1, c); }

for (const [id,nome] of TELAS){
  console.log('\n— '+nome);
  rede=[];
  const t1=await abrir(p,id);

  /* 1. NAVEGACAO: sei onde estou e como volto */
  const cab=await p.evaluate(()=>{const v=document.querySelector('#ct .alcVoltar');
    if(!v) return null; const b=v.querySelector('.alcVbt').getBoundingClientRect();
    return { nome:(v.querySelector('.alcTopoNm')||{}).textContent||'',
             h:Math.round(b.height), w:Math.round(b.width) };});
  t(nome+': tem Voltar', !!cab);
  t(nome+': o cabecalho diz o nome certo', cab && cab.nome===nome, cab&&cab.nome);
  t(nome+': Voltar com alvo de toque grande', cab && cab.h>=40 && cab.w>=80, cab);

  /* 2. ESPERA: a estrutura aparece na hora, os dados entram depois */
  t(nome+': estrutura em ate 150ms', t1.tEstrutura!==null && t1.tEstrutura<=150, t1);
  t(nome+': os dados chegam', t1.tDados!==null, t1);
  t(nome+': nao fica parado em "Carregando..."',
    await p.evaluate(()=>!/Carregando/i.test(document.getElementById('ct').textContent||'')));

  /* 3. VISUAL: um sistema so */
  const v=await p.evaluate(()=>{
    const ct=document.getElementById('ct'); const el=[...ct.querySelectorAll('*')];
    const raios=new Set(), fam=new Set(), bts=[], claro=[];
    for(const e of el){
      const c=getComputedStyle(e), b=e.getBoundingClientRect();
      if(b.height<=0) continue;
      if(c.borderTopLeftRadius!=='0px' && b.height>8) raios.add(c.borderTopLeftRadius);
      fam.add(c.fontFamily.split(',')[0].replace(/["']/g,'').toLowerCase());
      const bg=c.backgroundColor.match(/\d+/g);
      if(bg && bg.length>=3 && +bg[0]>200 && +bg[1]>200 && +bg[2]>200 &&
         (bg.length<4 || +bg[3]>0.5) && b.width>60 && b.height>24) claro.push(e.className);
      if(e.tagName==='BUTTON') bts.push({h:Math.round(b.height),fs:c.fontSize,r:c.borderTopLeftRadius,cl:e.className});
    }
    return { raios:[...raios], fontes:[...fam], bts, claro,
             overflow: document.documentElement.scrollWidth > window.innerWidth+1 };
  });
  t(nome+': so raios do sistema', v.raios.every(r=>RAIO_OK.includes(r)), v.raios);
  t(nome+': uma familia de fonte', v.fontes.length<=1, v.fontes);
  t(nome+': botao com alvo de toque', v.bts.every(b=>b.h>=32), v.bts.filter(b=>b.h<32));
  t(nome+': botao no corpo do sistema', v.bts.every(b=>CORPO_OK.includes(b.fs)),
    v.bts.filter(b=>!CORPO_OK.includes(b.fs)));
  t(nome+': botao com raio do sistema', v.bts.every(b=>RAIO_OK.includes(b.r)),
    v.bts.filter(b=>!RAIO_OK.includes(b.r)));
  t(nome+': nenhum bloco claro (tela branca)', v.claro.length===0, v.claro);
  t(nome+': nada escapa pela lateral', !v.overflow);

  /* 3.1  LINGUAGEM DE ICONE: o painel inteiro desenha com traco e com
     simbolo tipografico (✓ ✕ ⚠ ◍). Emoji colorido era a unica tela
     falando outra lingua — formas de pagamento, medalha de ranking,
     aba de aniversario e os vazios do Financeiro. */
  const emoji = await p.evaluate(()=>{
    const re=/[\u{1F300}-\u{1FAFF}]/u, out=[];
    for(const e of document.getElementById('ct').querySelectorAll('*')){
      if(e.children.length) continue;
      if(re.test(e.textContent||'') && e.getBoundingClientRect().height>0)
        out.push(e.className+' :: '+(e.textContent||'').trim().slice(0,20));
    }
    return [...new Set(out)];
  });
  t(nome+': sem emoji colorido', emoji.length===0, emoji);

  /* 4. VOLTAR E ENTRAR DE NOVO: nao repete a mesma leitura */
  await p.evaluate(()=>document.getElementById('nb-agd').click());
  await p.waitForTimeout(400);
  rede=[];
  const t2=await abrir(p,id);
  t(nome+': segunda visita em ate 150ms', t2.tDados!==null && t2.tDados<=150, t2);
  await p.evaluate(()=>document.getElementById('nb-agd').click());
  await p.waitForTimeout(300);
}

/* ── a acao principal e azul em qualquer tela ───────────────────── */
await p.evaluate(()=>document.getElementById('nb-eq').click());
await p.waitForTimeout(1600);
const prim=await p.evaluate(()=>[...document.querySelectorAll('#ct .btn-primary, #ct .bp')]
  .map(e=>getComputedStyle(e).backgroundImage+getComputedStyle(e).backgroundColor));
t('acao principal e azul, nunca creme',
  prim.length>0 && prim.every(s=>/gradient/.test(s)), prim);

/* ── o Voltar leva mesmo para a Home ────────────────────────────── */
await p.evaluate(()=>document.querySelector('#ct .alcVbt').click());
await p.waitForTimeout(700);
t('Voltar leva para a Home', await p.evaluate(()=>!!document.querySelector('.alcHome')));

/* ── celular pequeno: nada espremido ────────────────────────────── */
for (const w of [320,375]){
  await p.setViewportSize({width:w,height:780});
  await p.evaluate(()=>document.getElementById('nb-fin').click());
  await p.waitForTimeout(1500);
  t('Financeiro cabe em '+w+'px', await p.evaluate(()=>
    document.documentElement.scrollWidth <= window.innerWidth+1));
}

t('nenhum erro de JavaScript', erros.length===0, erros);
await br.close();
console.log('\n'+ok+' passou / '+mau+' falhou');
process.exit(mau?1:0);
})();
