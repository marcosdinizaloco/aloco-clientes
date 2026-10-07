/* ══════════════════════════════════════════════════════════════════════
   BARBER IA x BEAUTY IA — PRODUTOS IRMÃOS

   O teste não pergunta "ficou bonito". Pergunta duas coisas que dá para
   medir, e que são exatamente o pedido:

     1. IRMÃOS: estrutura, tipografia, espaçamento, tamanho e quantidade
        de componente têm que ser IDÊNTICOS nos dois. Se a Beauty tivesse
        um botão a mais ou um azulejo menor, seriam dois produtos.

     2. IDENTIDADES: a paleta tem que ser OUTRA. Azul na barbearia,
        champagne e rosa queimado no salão — e nada de rosa choque, pink
        neon ou roxo, que foi o que ele pediu para evitar.
   ══════════════════════════════════════════════════════════════════════ */
const fs=require('fs'); const { chromium } = require('playwright');
const B=fs.readFileSync(__dirname+'/bundle.json','utf8');
const H=fs.readFileSync(__dirname+'/horario.json','utf8');
const P=fs.readFileSync(__dirname+'/pacotes.json','utf8');
function corpo(u){ if(/action=bundle/.test(u))return B; if(/action=horario/.test(u))return H;
  if(/action=pacotes/.test(u))return P; return '{"ok":true,"dados":[]}'; }

let ok=0, mau=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('ok    '+n);} else {mau++;console.log('ERRO  '+n+(x!==undefined?'  -> '+JSON.stringify(x):''));} };

function hsv(r,g,b){
  r/=255; g/=255; b/=255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn;
  let h=0;
  if(d>0){ if(mx===r) h=60*(((g-b)/d)%6); else if(mx===g) h=60*((b-r)/d+2); else h=60*((r-g)/d+4); }
  if(h<0) h+=360;
  return { h, s: mx>0 ? d/mx : 0, v: mx };
}
function rgbDe(txt){
  const m=String(txt).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/);
  if(!m) return null;
  return { r:+m[1], g:+m[2], b:+m[3], a: m[4]===undefined?1:+m[4] };
}

async function medir(br, seg){
  const p=await br.newPage({viewport:{width:430,height:932}});
  const erros=[]; p.on('pageerror',e=>erros.push(String(e)));
  const baixou=[];
  p.on('request',r=>{ if(/arte-beauty\.js/.test(r.url())) baixou.push(1); });
  await p.addInitScript(()=>{try{sessionStorage.setItem('aloco_senha','TESTE')}catch(e){}});
  await p.route('**script.google.com/**', async r=>{ await new Promise(s=>setTimeout(s,150));
    r.fulfill({status:200,contentType:'application/json',body:corpo(r.request().url())}); });
  await p.goto('http://localhost:8777/painel-app-pwa/?b=marcos-2&seg='+seg,{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(4000);

  const m = await p.evaluate(()=>{
    const q=s=>document.querySelector(s);
    const cs=e=>e?getComputedStyle(e):null;
    const cx=(e)=>{ const r=e.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)}; };
    const sq=[...document.querySelectorAll('.alcSq')];
    const ia=q('#alcIaBt'), ola=q('.alcOla h1'), dia=q('.alcDia');
    /* todas as cores visíveis da Home, com área, para saber qual domina */
    const cores={};
    for(const e of document.querySelectorAll('.alcHome *')){
      const c=getComputedStyle(e), r=e.getBoundingClientRect();
      if(r.width<2||r.height<2) continue;
      const area=r.width*r.height;
      for(const v of [c.color, c.backgroundColor, c.borderTopColor]){
        if(!v||/rgba\(0, 0, 0, 0\)/.test(v)) continue;
        cores[v]=(cores[v]||0)+area;
      }
    }
    return {
      marca: document.documentElement.getAttribute('data-ia'),
      nAzulejos: sq.length,
      azulejo: sq.length?cx(sq[0]):null,
      iaCaixa: ia?cx(ia):null,
      rotulo: ia?ia.textContent.replace(/\s+/g,' ').trim():'',
      fonteH1: ola?cs(ola).fontFamily:'',
      tamH1: ola?cs(ola).fontSize:'',
      pesoH1: ola?cs(ola).fontWeight:'',
      gapGrade: cs(q('.alcGrade')).rowGap,
      indicadores: dia?dia.children.length:0,
      nBotoes: document.querySelectorAll('.alcHome button').length,
      blocos: [...q('.alcHome').children].map(e=>e.className.split(' ')[0]),
      acento: cs(q('.alcOla h1 em')).color,
      bordaIA: ia?cs(ia).borderTopColor:'',
      setaVoltarCor: null,
      cores: Object.entries(cores).sort((a,b)=>b[1]-a[1]).slice(0,14),
      srcIcone: sq.length?(sq[0].querySelector('img')||{}).src||'':''
    };
  });
  m.erros=erros; m.baixouArte=baixou.length>0;
  /* assinatura de pixel do primeiro ícone, para provar que o desenho é o
     mesmo e só a luz mudou */
  m.icone = await p.evaluate(()=>{
    const img=document.querySelector('.alcSq img'); if(!img) return null;
    const c=document.createElement('canvas'); c.width=c.height=40;
    const x=c.getContext('2d'); x.drawImage(img,0,0,40,40);
    const d=x.getImageData(0,0,40,40).data;
    let r=0,g=0,b=0,n=0, forma=[];
    for(let i=0;i<d.length;i+=4){
      if(d[i+3]<40){ forma.push(0); continue; }
      forma.push(1); r+=d[i]; g+=d[i+1]; b+=d[i+2]; n++;
    }
    return { r:Math.round(r/n), g:Math.round(g/n), b:Math.round(b/n),
             forma: forma.join('') };
  });
  await p.close();
  return m;
}

(async()=>{
const br=await chromium.launch({args:['--no-sandbox']});
const bar = await medir(br,'barber');
const bea = await medir(br,'beauty');

console.log('\n— a marca no documento');
t('barbearia marcada como barber', bar.marca==='barber', bar.marca);
t('salão marcado como beauty',     bea.marca==='beauty', bea.marca);
t('barbearia NÃO baixa o conjunto do salão', bar.baixouArte===false);
t('salão baixa o conjunto dele',             bea.baixouArte===true);
t('sem erro de JavaScript nos dois', bar.erros.length===0 && bea.erros.length===0,
  bar.erros.concat(bea.erros));

console.log('\n— irmãos: a estrutura é a mesma');
t('mesma quantidade de aplicativos', bar.nAzulejos===bea.nAzulejos, [bar.nAzulejos,bea.nAzulejos]);
t('mesmo tamanho de azulejo', JSON.stringify(bar.azulejo)===JSON.stringify(bea.azulejo), [bar.azulejo,bea.azulejo]);
t('mesmo tamanho do bloco da IA', JSON.stringify(bar.iaCaixa)===JSON.stringify(bea.iaCaixa), [bar.iaCaixa,bea.iaCaixa]);
t('mesma tipografia na saudação', bar.fonteH1===bea.fonteH1 && bar.tamH1===bea.tamH1 && bar.pesoH1===bea.pesoH1,
  [bar.tamH1,bea.tamH1,bar.pesoH1,bea.pesoH1]);
t('mesmo espaçamento da grade', bar.gapGrade===bea.gapGrade, [bar.gapGrade,bea.gapGrade]);
t('mesmos três indicadores', bar.indicadores===3 && bea.indicadores===3, [bar.indicadores,bea.indicadores]);
t('mesma quantidade de botões', bar.nBotoes===bea.nBotoes, [bar.nBotoes,bea.nBotoes]);
t('mesma ordem de blocos', JSON.stringify(bar.blocos)===JSON.stringify(bea.blocos), [bar.blocos,bea.blocos]);
t('o ícone é o MESMO desenho, só a luz muda',
  bar.icone && bea.icone && bar.icone.forma===bea.icone.forma);

console.log('\n— o nome muda com a identidade');
t('a barbearia lê BARBER IA', /BARBER IA/.test(bar.rotulo), bar.rotulo);
t('o salão lê BEAUTY IA',     /BEAUTY IA/.test(bea.rotulo), bea.rotulo);
t('o salão não fala em barbearia', !/barbearia/i.test(bea.rotulo), bea.rotulo);
t('concordância certa no salão ("seu salão", nunca "suo")',
  !/suo|sua salão/i.test(bea.rotulo), bea.rotulo);

console.log('\n— identidades: a cor é outra');
{ const a=rgbDe(bar.acento), b=rgbDe(bea.acento);
  const ha=hsv(a.r,a.g,a.b), hb=hsv(b.r,b.g,b.b);
  t('o acento da barbearia é AZUL (matiz 190–240)', ha.h>=190 && ha.h<=240, Math.round(ha.h));
  t('o acento do salão é QUENTE (matiz 0–45)',      hb.h>=0  && hb.h<=45,  Math.round(hb.h));
  t('os dois acentos são mesmo diferentes', bar.acento!==bea.acento, [bar.acento,bea.acento]); }

{ /* o ícone do salão não pode continuar azul */
  const i=bea.icone;
  t('o ícone do salão não é azul', !(i.b > i.r + 25), i);
  t('o ícone da barbearia é azul', bar.icone.b > bar.icone.r + 20, bar.icone); }

{ /* nada de rosa choque, pink neon ou roxo no salão */
  const proibidas = bea.cores.filter(([c])=>{
    const p=rgbDe(c); if(!p || p.a<0.5) return false;
    const h=hsv(p.r,p.g,p.b);
    const choque = h.h>=300 && h.h<=345 && h.s>0.55;   /* rosa choque / pink */
    const roxo   = h.h>=255 && h.h<=300 && h.s>0.35;   /* roxo */
    return choque || roxo;
  }).map(x=>x[0]);
  t('salão sem rosa choque, pink neon ou roxo', proibidas.length===0, proibidas); }

{ /* o azul não pode sobrar no salão: olho as cores que mais ocupam área */
  const azuis = bea.cores.filter(([c])=>{
    const p=rgbDe(c); if(!p || p.a<0.35) return false;
    const h=hsv(p.r,p.g,p.b);
    return h.h>=185 && h.h<=255 && h.s>0.35;
  }).map(x=>x[0]);
  t('não sobrou azul de identidade no salão', azuis.length===0, azuis); }

{ /* champagne é claro: o texto em cima do botão principal tem que
     escurecer, senão fica branco no claro e some */
  const p=await br.newPage({viewport:{width:430,height:932}});
  await p.addInitScript(()=>{try{sessionStorage.setItem('aloco_senha','TESTE')}catch(e){}});
  await p.route('**script.google.com/**', async r=>{ await new Promise(s=>setTimeout(s,120));
    r.fulfill({status:200,contentType:'application/json',body:corpo(r.request().url())}); });
  await p.goto('http://localhost:8777/painel-app-pwa/?b=marcos-2&seg=beauty',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(3000);
  await p.evaluate(()=>document.getElementById('nb-agd').click());
  await p.waitForTimeout(1400);
  const r = await p.evaluate(()=>{
    const b=document.querySelector('#ct .btn-primary, #ct .bp');
    if(!b) return null;
    const c=getComputedStyle(b);
    return { cor:c.color, fundo:c.backgroundImage };
  });
  t('a ação principal do salão usa o gradiente champagne', r && /gradient/.test(r.fundo), r);
  { const c=rgbDe(r.cor); const l=(0.299*c.r+0.587*c.g+0.114*c.b)/255;
    t('o texto em cima do champagne é escuro (legível)', l < 0.45, Math.round(l*100)/100); }
  await p.close(); }

await br.close();
console.log('\n'+ok+' passou / '+mau+' falhou');
process.exit(mau?1:0);
})();
