/* Auditoria medida. Usa a NAVEGACAO REAL (clique nos botoes do menu),
   um backend que responde como o de verdade e latencia configuravel. */
const fs=require('fs'); const { chromium } = require('playwright');
const BUNDLE = fs.readFileSync(__dirname+'/bundle.json','utf8');
const HOR = fs.readFileSync(__dirname+'/horario.json','utf8');
const PAC = fs.readFileSync(__dirname+'/pacotes.json','utf8');
const LAT = parseInt(process.env.LAT||'900',10);   // Apps Script acordado ~0.9s

const TELAS = [['nb-agd','Agenda'],['nb-cx','Caixa'],['nb-cli','Clientes'],
               ['nb-barb','Profissionais'],['nb-svc','Serviços'],
               ['nb-hora','Horários'],['nb-pac','Pacotes'],['nb-fila','Fila de Espera'],
               ['nb-fin','Financeiro'],['nb-eq','Ajustes']];

function corpo(url){
  if (/action=bundle/.test(url)) return BUNDLE;
  if (/action=horario/.test(url)) return HOR;
  if (/action=pacotes/.test(url)) return PAC;
  return '{"ok":true,"dados":[]}';
}

(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:430,height:932}});
  const erros=[]; p.on('pageerror',e=>erros.push(String(e)));
  let chamadas=[];
  await p.addInitScript(()=>{try{sessionStorage.setItem('aloco_senha','TESTE')}catch(e){}});
  await p.route('**script.google.com/**', async r=>{
    chamadas.push(r.request().url().replace(/.*action=/,'').split('&')[0]);
    await new Promise(s=>setTimeout(s,LAT));
    r.fulfill({status:200,contentType:'application/json',body:corpo(r.request().url())});
  });
  await p.goto('http://localhost:8777/painel-app-pwa/?b=marcos-2',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(2500);
  console.log('abertura do painel — chamadas:', JSON.stringify(chamadas));

  const linhas=[];
  for (const [id,nome] of TELAS){
    const temBt = await p.$('#'+id);
    chamadas=[];
    const t0=Date.now();
    if (temBt) await p.evaluate(i=>document.getElementById(i).click(), id);
    else { linhas.push({nome,erro:'botao '+id+' nao existe'}); continue; }

    let tEstrutura=null, tPronto=null;
    for(let i=0;i<160;i++){
      const st=await p.evaluate(()=>{
        const ct=document.getElementById('ct');
        const tx=ct.textContent||'';
        return { carregando:/Carregando/i.test(tx),
                 esqueleto: !!ct.querySelector('.sk'),
                 n:ct.querySelectorAll('div,button,input,select,table').length };
      });
      if(tEstrutura===null && st.n>10) tEstrutura=Date.now()-t0;
      if(!st.carregando && !st.esqueleto && st.n>12){ tPronto=Date.now()-t0; break; }
      await p.waitForTimeout(40);
    }
    await p.waitForTimeout(250);
    const m=await p.evaluate(()=>{
      const ct=document.getElementById('ct'); const el=[...ct.querySelectorAll('*')];
      const raios={}, bts=[]; let fam=new Set();
      for(const e of el){ const c=getComputedStyle(e);
        if(c.borderTopLeftRadius!=='0px' && e.getBoundingClientRect().height>0)
          raios[c.borderTopLeftRadius]=(raios[c.borderTopLeftRadius]||0)+1;
        fam.add(c.fontFamily.split(',')[0].replace(/["']/g,''));
        if(e.tagName==='BUTTON'){ const r=e.getBoundingClientRect();
          if(r.height>0) bts.push({h:Math.round(r.height),r:c.borderTopLeftRadius,fs:c.fontSize}); } }
      const tx=ct.textContent.replace(/\s+/g,' ');
      return { voltar:!!ct.querySelector('.alcVoltar'),
               nomeTopo:(ct.querySelector('.alcTopoNm')||{}).textContent||null,
               raios:Object.entries(raios).sort((a,b)=>b[1]-a[1]),
               fontes:[...fam], alturasBt:[...new Set(bts.map(x=>x.h))].sort((a,b)=>a-b),
               raiosBt:[...new Set(bts.map(x=>x.r))], fsBt:[...new Set(bts.map(x=>x.fs))],
               aindaCarregando:/Carregando/i.test(tx), nEl:el.length,
               overflowX: document.documentElement.scrollWidth > window.innerWidth+1 };
    });
    linhas.push({nome,tEstrutura,tPronto,chamadas:chamadas.slice(),...m});
    console.log(JSON.stringify(linhas[linhas.length-1]));
  }
  console.log('\nERROS JS:', JSON.stringify(erros));
  await b.close();
})();
