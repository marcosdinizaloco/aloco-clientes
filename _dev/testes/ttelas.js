/* consistencia visual das telas internas, contra a Home */
const { chromium } = require('playwright');
const B = require(__dirname+'/dados.json');
/* Comandas e Caixa sao a MESMA tela ('cx') — por isso o cabecalho de
   Comandas diz "Caixa", e esta certo: e onde a pessoa esta. Nao existe
   tela 'cm'; eu tinha inventado uma no primeiro teste. */
const TELAS = [['agd','Agenda'],['cx','Caixa'],['cli','Clientes'],
               ['barb','Profissionais'],['svc','Serviços'],['fin','Financeiro'],['eq','Ajustes']];
let ok=0, mau=0;
const t=(n,c,x)=>{ if(c){ok++;console.log('ok    '+n);} else {mau++;console.log('ERRO  '+n+(x!==undefined?'  -> '+JSON.stringify(x):''));} };

(async()=>{
  const b=await chromium.launch({args:['--no-sandbox']});
  const p=await b.newPage({viewport:{width:425,height:919}});
  const erros=[]; p.on('pageerror',e=>erros.push(String(e)));
  await p.addInitScript(()=>{try{sessionStorage.setItem('aloco_senha','TESTE')}catch(e){}});
  await p.route('**script.google.com/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(B)}));
  await p.goto('http://localhost:8777/painel-app-pwa/?b=marcos-2',{waitUntil:'networkidle'});
  await p.waitForTimeout(1600);

  t('a camada ui.css carregou e tem regras', await p.evaluate(()=>{
    const s=[...document.styleSheets].find(x=>(x.href||'').includes('ui.css'));
    try{ return !!s && s.cssRules.length > 8; }catch(e){ return false; } }), true);

  t('o azul do produto e o da Home', await p.evaluate(()=>
    getComputedStyle(document.documentElement).getPropertyValue('--alc-ac').trim().toUpperCase()), '#2A9BFF');

  for (const [id,nome] of TELAS){
    await p.evaluate(x=>{try{ir(x,null)}catch(e){}}, id);
    await p.waitForTimeout(1250);
    const m = await p.evaluate(()=>{
      const ct=document.getElementById('ct');
      const cab=document.querySelector('.alcVoltar');
      const bt=document.querySelector('.alcVbt');
      const nm=document.querySelector('.alcTopoNm');
      const r=bt?bt.getBoundingClientRect():null;
      const prim=[...ct.querySelectorAll('.btn-primary')];
      const creme=prim.filter(e=>{const c=getComputedStyle(e).backgroundColor;
        return c==='rgb(237, 234, 230)'||c==='rgb(255, 255, 255)';});
      const raios={};
      ct.querySelectorAll('button,.btn,input,select').forEach(e=>{
        const v=getComputedStyle(e).borderTopLeftRadius;
        if(v&&v!=='0px'&&v!=='50%') raios[v]=(raios[v]||0)+1;});
      const claro=[...ct.querySelectorAll('*')].filter(e=>{
        const c=getComputedStyle(e).backgroundColor.match(/\d+/g);
        if(!c||c.length<3) return false;
        if(c[3]!==undefined && +c[3]===0) return false;
        return (+c[0]+ +c[1]+ +c[2])/3 > 170;}).length;
      return { temCab:!!cab, temBt:!!bt, nome:nm?nm.textContent:'',
               alvo: r?Math.round(r.width*r.height):0, altura: r?Math.round(r.height):0,
               primarios:prim.length, creme:creme.length,
               raios:Object.keys(raios), claros:claro };
    });
    console.log('\n— ' + nome);
    t('  ' + nome + ': cabecalho com voltar', m.temCab && m.temBt, m);
    t('  ' + nome + ': nome certo no cabecalho', m.nome === nome, m.nome);
    t('  ' + nome + ': voltar com alvo de toque grande', m.altura >= 40, m.altura);
    t('  ' + nome + ': nenhum botao principal creme/branco', m.creme === 0, m.creme);
    t('  ' + nome + ': no maximo 2 raios diferentes', m.raios.length <= 2, m.raios);
    t('  ' + nome + ': nada de fundo claro (tela branca)', m.claros <= 2, m.claros);
  }

  t('nenhum erro de JavaScript', erros.length === 0, erros.slice(0,2));
  await b.close();
  console.log('\n' + ok + ' passou / ' + mau + ' falhou');
  process.exit(mau?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
