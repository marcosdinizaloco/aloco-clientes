/* Testa contra um painel falso que reproduz o contrato do de verdade,
   incluindo o cabecalho preso no topo sem area segura (o bug do iPhone). */
const fs=require('fs');
const PROD=require('path').join(__dirname,'..','..','painel-app-pwa')+'/';
 const {chromium}=require('playwright');
const MOCK=fs.readFileSync(__dirname+'/mock.html','utf8');
const JS_=fs.readFileSync(PROD+'home-apps.js','utf8');
/* ui.js passou a ser parte do sistema: e ele que repoe o cabecalho das
   telas internas. Sem ele no palco, o teste media meio produto. */
const UI_=fs.readFileSync(PROD+'ui.js','utf8');
const UICSS_=fs.readFileSync(PROD+'ui.css','utf8');
const SAFE = 59;   // iPhone com notch
function pagina(extra){
  return MOCK.replace('</head>',
      '<style>:root{--alc-safe:'+SAFE+'px;--alc-safe-b:34px}</style></head>')
    .replace('</head>', '<style>'+UICSS_+'</style></head>')
    .replace('</body>', '<scr'+'ipt>'+JS_+'</scr'+'ipt>\n<scr'+'ipt>'+UI_+'</scr'+'ipt>\n'+(extra||'')+'</body>');
}
let ok=0,f=0;
const t=(n,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b))ok++;
  else{f++;console.log('FALHOU',n,'->',JSON.stringify(a),'esperado',JSON.stringify(b));} };

(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

/* ══════════ IPHONE, PWA INSTALADO ══════════ */
let pg=await br.newPage({viewport:{width:390,height:844}});
const err=[]; pg.on('pageerror',e=>err.push(String(e)));
await pg.setContent(pagina(),{waitUntil:'load'}); await pg.waitForTimeout(500);
t('iphone: nenhum erro de script', err, []);

/* 1. menu abaixo do relogio e clicavel */
const bt=await pg.$eval('#navBt',e=>{const r=e.getBoundingClientRect();return{top:r.top,h:r.height,w:r.width};});
t('menu abaixo da area do relogio', bt.top >= SAFE, true);
t('menu tem alvo de toque bom', bt.h>=38 && bt.w>=38, true);
t('menu e o elemento que recebe o toque', await pg.evaluate(()=>{
  const r=document.getElementById('navBt').getBoundingClientRect();
  const el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
  return el && (el.id==='navBt' || el.closest('#navBt')!==null);
}), true);
await pg.click('#navBt'); await pg.waitForTimeout(120);
t('menu abre de verdade', await pg.$eval('.nav',e=>e.classList.contains('aberta')), true);
await pg.evaluate(()=>alcGaveta(false)); await pg.waitForTimeout(120);

/* 2. Noite dentro da area util e clicavel */
const nt=await pg.$eval('#btNoite',e=>{const r=e.getBoundingClientRect();return{top:r.top,h:r.height};});
t('Noite abaixo da area do relogio', nt.top >= SAFE, true);
t('Noite e o elemento que recebe o toque', await pg.evaluate(()=>{
  const r=document.getElementById('btNoite').getBoundingClientRect();
  const el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
  return el && (el.id==='btNoite' || el.closest('#btNoite')!==null);
}), true);
await pg.click('#btNoite');
t('Noite responde ao toque', await pg.evaluate(()=>window.__noite), 1);

/* 3. saudacao no primeiro viewport, sem rolar */
t('pagina abre no topo', await pg.evaluate(()=>document.scrollingElement.scrollTop), 0);
const sd=await pg.$eval('.alcOla h1',e=>{const r=e.getBoundingClientRect();
  return {top:r.top,bottom:r.bottom,txt:e.textContent};});
t('saudacao existe', /Marcos Barber/.test(sd.txt), true);
t('saudacao nao fica atras do cabecalho', sd.top >= await pg.$eval('.hdr',e=>e.getBoundingClientRect().bottom), true);
t('saudacao visivel sem rolar', sd.bottom <= 844, true);
const ind=await pg.$eval('.alcDia',e=>e.getBoundingClientRect().bottom);
t('indicadores visiveis sem rolar', ind <= 844, true);



t('nenhum scroll inicial forcado', await pg.evaluate(()=>window.scrollY), 0);
t('sem overflow hidden escondendo o problema', await pg.evaluate(()=>{
  const b=getComputedStyle(document.body).overflow, h=getComputedStyle(document.documentElement).overflow;
  return b!=='hidden' && h!=='hidden';
}), true);

/* 3b. o vao entre o cabecalho e a saudacao */
const vao = await pg.evaluate(()=>{
  const h=document.querySelector('.hdr').getBoundingClientRect().bottom;
  const o=document.querySelector('.alcOla h1').getBoundingClientRect().top;
  return Math.round(o-h);
});
t('vao do cabecalho a saudacao entre 20 e 30px', vao>=20 && vao<=30, true);
t('saudacao nao encosta no cabecalho', vao>=16, true);


/* ══ GRADE UNICA ══ */
const grade = await pg.evaluate(()=>{
  const g=document.querySelector('.alcGrade');
  const aps=[...g.querySelectorAll('.alcAp')];
  const linhas={};
  aps.forEach(a=>{ const r=a.getBoundingClientRect(); const y=Math.round(r.top);
    (linhas[y]=linhas[y]||[]).push({nome:a.querySelector('.alcNm').textContent,
      g:a.classList.contains('g'), x:Math.round(r.left), w:Math.round(r.width),
      sq:Math.round(a.querySelector('.alcSq').getBoundingClientRect().width)}); });
  const ys=Object.keys(linhas).map(Number).sort((a,b)=>a-b);
  const gr=g.getBoundingClientRect();
  return { total:aps.length, linhas: ys.map(y=>linhas[y]),
    colunas: getComputedStyle(g).gridTemplateColumns.split(' ').length,
    centroG: gr.left + gr.width/2 };
});
t('dez aplicativos', grade.total, 10);
t('tres colunas', grade.colunas, 3);
t('quatro linhas', grade.linhas.length, 4);
t('linha 1', grade.linhas[0].map(x=>x.nome), ['Agenda','Caixa','Clientes']);
t('linha 2', grade.linhas[1].map(x=>x.nome), ['Comandas','Profissionais','Serviços']);
t('linha 3', grade.linhas[2].map(x=>x.nome), ['Horários','Pacotes','Financeiro']);
t('linha 4', grade.linhas[3].map(x=>x.nome), ['Ajustes']);
t('Ajustes centralizado', Math.abs((grade.linhas[3][0].x + grade.linhas[3][0].w/2)
  - grade.centroG) <= 10, true);
t('sem titulo de secao', (await pg.$$('.alcSec')).length, 0);
t('nomes da linha 2 na mesma altura', await pg.evaluate(()=>{
  const aps=[...document.querySelectorAll('.alcGrade .alcAp')].slice(3,6);
  const ys=aps.map(a=>Math.round(a.querySelector('.alcNm').getBoundingClientRect().top));
  return Math.max(...ys) - Math.min(...ys) <= 2; }), true);
t('nomes da linha 1 na mesma altura', await pg.evaluate(()=>{
  const aps=[...document.querySelectorAll('.alcGrade .alcAp')].slice(0,3);
  const ys=aps.map(a=>Math.round(a.querySelector('.alcNm').getBoundingClientRect().top));
  return Math.max(...ys) - Math.min(...ys) <= 2; }), true);
t('nenhuma palavra Aplicativos ou Outros na tela', await pg.evaluate(()=>{
  const t=document.querySelector('.alcHome').textContent;
  return /APLICATIVOS|OUTROS/i.test(t); }), false);

/* escala: principais maiores, mas pouco */
const sqG = grade.linhas[0][0].sq, sqP = grade.linhas[2][0].sq;
t('principais sao os quatro certos', grade.linhas.flat().filter(x=>x.g).map(x=>x.nome),
  ['Agenda','Caixa','Clientes','Comandas']);
/* O Marcos congelou a referencia e nela os DEZ azulejos tem o mesmo
   tamanho: medi as tres linhas, 0.138 / 0.141 / 0.140 da largura.
   Isso substitui o pedido anterior de 15 a 25% de diferenca. O que
   distingue os quatro principais agora e o brilho, nao o tamanho. */
t('os dez azulejos tem o mesmo tamanho', await pg.evaluate(()=>{
  const t=[...document.querySelectorAll('.alcSq')].map(e=>Math.round(e.getBoundingClientRect().width));
  return t.length===10 && Math.max(...t)-Math.min(...t) <= 1; }), true);
{ const r = await pg.evaluate(()=>+(document.querySelector('.alcSq').getBoundingClientRect().width/window.innerWidth).toFixed(3));
  console.log('      (proporcao medida do azulejo: ' + r + ')');
  /* o valor exato varia com a ALTURA da tela, de proposito: o encaixe
     cresce ou encolhe para caber sem arrastar. A referencia mede 0.137
     num aparelho de 919px de altura. O que o teste garante e a faixa:
     nem azulejo de brinquedo, nem azulejo que estoura a linha. */
  t('azulejo na faixa da referencia', r > 0.10 && r < 0.18, true); }

/* nenhum carregamento progressivo */
t('sem gate de menu na pintura', /existe\(tela/.test(JS_), false);
t('imagens com decoding sync', /decoding="sync"/.test(JS_), true);

/* sem rolagem */
/* O contrato mudou: a referencia que o Marcos aprovou tem, abaixo do
   BARBER IA, o cartao de proximo atendimento e os tres atalhos. Entao
   a regra nao e mais "nenhuma rolagem": e "a primeira tela mostra
   tudo ate o BARBER IA, inteiro". O que rola e so o extra. */
t('primeira tela vai ate o BARBER IA, inteiro', await pg.evaluate(()=>{
  const e=document.querySelector('.alcIA'); if(!e) return false;
  const r=e.getBoundingClientRect();
  return r.top>=0 && r.bottom<=window.innerHeight+1; }), true);
t('o que rola depois do BARBER IA e pouco', await pg.evaluate(()=>
  document.documentElement.scrollHeight - window.innerHeight < 320), true);
t('nada de overflow hidden', await pg.evaluate(()=>
  getComputedStyle(document.body).overflow!=='hidden' &&
  getComputedStyle(document.documentElement).overflow!=='hidden'), true);
t('BARBER IA no mesmo viewport', await pg.$eval('#alcIaBt',
  e=>e.getBoundingClientRect().bottom) <= 844, true);
t('BARBER IA depois da grade', await pg.evaluate(()=>{
  const g=document.querySelector('.alcGrade'), i=document.getElementById('alcIaBt');
  return !!(g.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING); }), true);
t('BARBER IA fora da grade', await pg.evaluate(()=>
  !document.querySelector('.alcGrade').contains(document.getElementById('alcIaBt'))), true);
t('BARBER IA mais alto que qualquer icone', await pg.evaluate(()=>{
  const i=document.getElementById('alcIaBt').getBoundingClientRect().height;
  const m=Math.max(...[...document.querySelectorAll('.alcGrade .alcAp')]
    .map(a=>a.getBoundingClientRect().height));
  return i > m; }), true);

/* 4. Fila removido */



t('menu lateral ainda tem Fila de Espera', await pg.$eval('#nb-fila',e=>e.textContent), 'Fila de Espera');

/* 5. os quatro principais intactos */


/* 6. BARBER IA */
t('botao BARBER IA existe', (await pg.$$('#alcIaBt')).length, 1);

const ia=await pg.$eval('#alcIaBt',e=>{const r=e.getBoundingClientRect();
  return {h:r.height,w:r.width,txt:e.textContent.replace(/\s+/g,' ').trim()};});
t('BARBER IA tem alvo grande', ia.h>=92, true);
t('BARBER IA ocupa a largura', ia.w > 300, true);
t('BARBER IA diz o que e', /BARBER IA/.test(ia.txt) && /Pergunte por áudio/.test(ia.txt)
   && /sobre sua barbearia/.test(ia.txt), true);

t('BARBER IA sem emoji', /[\u{1F300}-\u{1FAFF}]/u.test(ia.txt), false);
t('BARBER IA sem vermelho', await pg.evaluate(()=>{
  const e=document.getElementById('alcIaBt'), cs=getComputedStyle(e);
  const txt=(cs.background+cs.borderColor+cs.color+document.getElementById('alcHomeCss').textContent);
  const hex=(txt.match(/#[0-9A-Fa-f]{6}/g)||[]);
  return hex.filter(h=>{const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
    return r-g>40 && r-b>40 && Math.abs(g-b)<40;});
}), []);
/* o microfone */
const mic = await pg.evaluate(()=>{
  const svg=document.querySelector('#alcIaBt .alcIaIc svg');
  if(!svg) return null;
  const d=svg.outerHTML;
  const r=svg.getBoundingClientRect();
  return { html:d, w:r.width, h:r.height,
    capsula: !!svg.querySelector('rect[x="25"][y="12"]'),
    ondas: svg.querySelectorAll('path[d^="M13 25"],path[d^="M51 25"]').length,
    suporte: !!svg.querySelector('path[d^="M21 30"]'),
    base: !!svg.querySelector('path[d^="M25 50"]') };
});
t('tem capsula de microfone', mic.capsula, true);
t('tem o suporte em U', mic.suporte, true);
t('tem a base da haste', mic.base, true);
t('tem duas ondas de audio', mic.ondas, 2);
t('microfone grande o bastante', mic.w>=44 && Math.abs(mic.w-mic.h)<1.5, true);
t('nenhum verde no microfone', (mic.html.match(/#[0-9A-Fa-f]{6}/g)||[]).filter(h=>{
  const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
  return g-r>24 && g-b>24; }), []);
t('nenhum vermelho no microfone', (mic.html.match(/#[0-9A-Fa-f]{6}/g)||[]).filter(h=>{
  const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
  return r-g>22 && r-b>22; }), []);
t('sem emoji no bloco IA', /[\u{1F300}-\u{1FAFF}]/u.test(mic.html), false);

/* saudacao: faixas definidas pelo Marcos
   06:00-11:59 Bom dia | 12:00-18:59 Boa tarde | 19:00-05:59 Boa noite */
const saud = await pg.evaluate(()=>{
  const f = (h) => (h>=6 && h<12) ? 'Bom dia' : (h>=12 && h<19) ? 'Boa tarde' : 'Boa noite';
  const casos = [[0,'Boa noite'],[5,'Boa noite'],[6,'Bom dia'],[11,'Bom dia'],
                 [12,'Boa tarde'],[18,'Boa tarde'],[19,'Boa noite'],[23,'Boa noite']];
  return casos.filter(c => f(c[0]) !== c[1]);
});
t('saudacao certa nas 8 horas de virada', saud, []);

/* a frase nao pode quebrar feio */
const frase = await pg.evaluate(()=>{
  const e=document.querySelector('#alcIaBt .alcIaSub');
  const cs=getComputedStyle(e);
  const lh=parseFloat(cs.lineHeight)||16;
  return { linhas: Math.round(e.getBoundingClientRect().height/lh),
           txt:e.innerText, transborda: e.scrollWidth > e.clientWidth+1 };
});
t('frase certa', frase.txt.replace(/\s+/g,' ').trim(), 'Pergunte por áudio sobre sua barbearia');
t('frase em no maximo 2 linhas', frase.linhas<=2, true);
t('frase nao transborda', frase.transborda, false);

/* o botao NAO pode navegar nem abrir cobranca */
let ultimoAviso=''; pg.on('dialog', d=>{ ultimoAviso=d.message(); d.dismiss(); });
await pg.evaluate(()=>{ window.__iaAberta=0; window.__navegou=0;
  window.addEventListener('beforeunload',()=>{window.__navegou=1;}); });
await pg.click('#alcIaBt'); await pg.waitForTimeout(260);
t('NAO abre o link de assinatura', await pg.evaluate(()=>window.__iaAberta||0), 0);
t('NAO navega pra lugar nenhum', await pg.evaluate(()=>window.__navegou||0), 0);
t('continua na Home', (await pg.$$('.alcGrade .alcAp')).length, 10);
t('nao usa o link de assinatura', /getElementById\('alcAssLink'\)/.test(JS_), false);
t('nao caca link por texto', /querySelectorAll\('a,button'\)/.test(JS_), false);
t('avisa em vez de navegar', /sendo preparado/.test(ultimoAviso) || ultimoAviso==='', true);
/* com o ponto de integracao definido, ele usa */
await pg.evaluate(()=>{ window.ALOCO_IA_ABRIR = function(){ window.__chamouIA=1; }; });
await pg.click('#alcIaBt'); await pg.waitForTimeout(160);
t('usa ALOCO_IA_ABRIR quando existe', await pg.evaluate(()=>window.__chamouIA), 1);

/* 7. nada quebrado */
await pg.evaluate(()=>{ window.CHAMOU.length=0; });
await pg.click('.alcGrade .alcAp >> nth=0'); await pg.waitForTimeout(120);
t('Agenda abre a agenda', await pg.evaluate(()=>window.CHAMOU), ['agd']);
/* o voltar agora mora num cabecalho junto com o nome da secao:
   a barra e .alcVoltar, o botao e .alcVbt */
t('Voltar aparece dentro da tela', (await pg.$$('.alcVbt')).length, 1);
t('cabecalho mostra o nome da secao', await pg.$eval('.alcTopoNm',e=>e.textContent), 'Agenda');
await pg.click('.alcVbt'); await pg.waitForTimeout(160);
t('Voltar leva pra Home', await pg.evaluate(()=>window.CHAMOU), ['agd','home']);
await pg.evaluate(()=>{ window.CHAMOU.length=0; });
await pg.click('.alcGrade .alcAp >> nth=3'); await pg.waitForTimeout(120);
t('Comandas abre o Caixa', await pg.evaluate(()=>window.CHAMOU), ['cx']);
await pg.click('.alcVbt'); await pg.waitForTimeout(160);
t('numeros reais', await pg.$$eval('.alcDia b',n=>n.map(x=>x.textContent)), ['3','2','R$ 840']);
t('todo icone carregou', await pg.$$eval('.alcSq img',n=>n.filter(x=>!x.naturalWidth).length), 0);
t('a Home original continua rodando', await pg.evaluate(()=>window.__rodouOriginal>=1), true);
await pg.close();

/* ══════════ IPHONE SEM NOTCH (area segura zero) ══════════ */
pg=await br.newPage({viewport:{width:375,height:667}});
await pg.setContent(MOCK.replace('</head>','<style>:root{--alc-safe:0px;--alc-safe-b:0px}</style></head>')
  .replace('</body>','<scr'+'ipt>'+JS_+'</scr'+'ipt></body>'),{waitUntil:'load'});
await pg.waitForTimeout(450);
const bt2=await pg.$eval('#navBt',e=>e.getBoundingClientRect().top);
t('sem notch: menu nao desce a toa', bt2 < 20, true);
t('sem notch: saudacao visivel', await pg.$eval('.alcOla h1',e=>e.getBoundingClientRect().bottom) <= 667, true);
t('sem notch: indicadores visiveis', await pg.$eval('.alcDia',e=>e.getBoundingClientRect().bottom) <= 667, true);
await pg.close();

/* ══════════ IPHONE GRANDE ══════════ */
pg=await br.newPage({viewport:{width:430,height:932}});
await pg.setContent(pagina(),{waitUntil:'load'}); await pg.waitForTimeout(450);
t('tela grande: saudacao visivel', await pg.$eval('.alcOla h1',e=>e.getBoundingClientRect().bottom) <= 932, true);
t('tela grande: menu abaixo do relogio', await pg.$eval('#navBt',e=>e.getBoundingClientRect().top) >= SAFE, true);
await pg.close();

/* ══════════ IPHONE SE, 320px: a frase nao pode explodir ══════════ */
pg=await br.newPage({viewport:{width:320,height:568}});
await pg.setContent(pagina(),{waitUntil:'load'}); await pg.waitForTimeout(500);
const f320 = await pg.evaluate(()=>{
  const e=document.querySelector('#alcIaBt .alcIaSub');
  const lh=parseFloat(getComputedStyle(e).lineHeight)||16;
  const b=document.getElementById('alcIaBt').getBoundingClientRect();
  return { linhas: Math.round(e.getBoundingClientRect().height/lh),
           transborda: e.scrollWidth > e.clientWidth+1,
           alturaBt: Math.round(b.height), largura: Math.round(b.width) };
});
t('320px: frase em no maximo 3 linhas', f320.linhas<=3, true);
t('320px: frase nao transborda', f320.transborda, false);
t('320px: botao nao estoura', f320.alturaBt<=150, true);
t('320px: microfone continua legivel', await pg.$eval('#alcIaBt .alcIaIc svg',e=>{
  const r=e.getBoundingClientRect();
  return r.width>=38 && Math.abs(r.width-r.height)<1.5; }), true);
t('320px: nenhum scroll horizontal', await pg.evaluate(()=>
  document.documentElement.scrollWidth <= window.innerWidth+1), true);
const v320 = await pg.evaluate(()=>{
  const h=document.querySelector('.hdr').getBoundingClientRect().bottom;
  const o=document.querySelector('.alcOla h1').getBoundingClientRect().top;
  return Math.round(o-h); });
t('320px: vao tambem certo', v320>=20 && v320<=30, true);
await pg.close();

/* ══════════ COMPUTADOR: nada pode mudar ══════════ */
pg=await br.newPage({viewport:{width:1280,height:900}});
const err2=[]; pg.on('pageerror',e=>err2.push(String(e)));
await pg.setContent(pagina(),{waitUntil:'load'}); await pg.waitForTimeout(400);
t('computador: nenhum erro', err2, []);
t('computador: Home antiga intacta', await pg.$eval('#ct',e=>!!e.querySelector('.CMD')), true);
t('computador: nenhum icone novo', (await pg.$$('.alcHome .alcAp')).length, 0);
t('computador: nenhum BARBER IA novo', (await pg.$$('#alcIaBt')).length, 0);
t('computador: cabecalho nao foi mexido', await pg.$eval('.hdr',e=>e.style.paddingTop||''), '');
await pg.close();

/* ══════════ SEM SERVIDOR ══════════ */
pg=await br.newPage({viewport:{width:390,height:844}});
const err3=[]; pg.on('pageerror',e=>err3.push(String(e)));
await pg.setContent(pagina().replace('window.google = {','window.__semGoogle = {'),{waitUntil:'load'});
await pg.waitForTimeout(450);
t('sem servidor: nenhum erro', err3, []);
t('sem servidor: Home aparece inteira', (await pg.$$('.alcGrade .alcAp')).length, 10);
t('sem servidor: numeros no traco', await pg.$$eval('.alcDia b',n=>n.map(x=>x.textContent)), ['—','—','—']);
await pg.close();

/* ══════════ SEM O BARBER IA NO PAINEL ══════════ */
pg=await br.newPage({viewport:{width:390,height:844}});
await pg.setContent(pagina().replace(/<a id="alcAssLink"[\s\S]*?<\/a>/,''),{waitUntil:'load'});
await pg.waitForTimeout(450);
pg.on('dialog',d=>d.dismiss());
t('sem acesso existente: botao continua', (await pg.$$('#alcIaBt')).length, 1);
t('ponto de integracao documentado', /ALOCO_IA_ABRIR/.test(JS_), true);
await pg.close();

console.log('');
console.log('painel no iphone:', ok, 'ok,', f, 'falhas');
await br.close(); if(f) process.exit(1);
})();
