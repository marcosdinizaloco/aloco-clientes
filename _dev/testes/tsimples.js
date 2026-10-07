/* Home simplificada: tem que terminar no BARBER IA e nao arrastar.
   Roda contra o mesmo painel falso das outras suites. */
const fs=require('fs'); const {chromium}=require('playwright');
const MOCK=fs.readFileSync('mock.html','utf8');
const JS_=fs.readFileSync('home-apps.js','utf8');
const SAFE=59;
function pagina(){
  return MOCK.replace('</head>','<style>:root{--alc-safe:'+SAFE+'px;--alc-safe-b:34px}</style></head>')
             .replace('</body>','<scr'+'ipt>'+JS_+'</scr'+'ipt></body>');
}
let ok=0,f=0;
const t=(n,a,b)=>{ if(JSON.stringify(a)===JSON.stringify(b))ok++;
  else{f++;console.log('FALHOU',n,'->',JSON.stringify(a),'esperado',JSON.stringify(b));} };

const SUMIU = ['Próximo atendimento','Nenhum atendimento agendado','Ver agenda',
               'Novo atendimento','Novo cliente','Nova comanda','Avisos de agendamento',
               'Seus próximos horários'];

(async()=>{
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

for (const vp of [{width:390,height:844,nome:'iPhone 14'},
                  {width:375,height:667,nome:'iPhone SE'},
                  {width:430,height:932,nome:'iPhone 15 Pro Max'}]){
  const pg=await br.newPage({viewport:{width:vp.width,height:vp.height}});
  const err=[]; pg.on('pageerror',e=>err.push(String(e)));
  await pg.setContent(pagina(),{waitUntil:'load'}); await pg.waitForTimeout(600);
  const p = vp.nome+': ';

  t(p+'nenhum erro de script', err, []);

  /* 1. os blocos sairam do DOM, nao foram so escondidos */
  t(p+'sem cartao de proximo atendimento', await pg.$$eval('#alcProx,.alcProx',e=>e.length), 0);
  t(p+'sem os tres atalhos',               await pg.$$eval('.alcAcoes,.alcAcao',e=>e.length), 0);
  t(p+'sem botao de avisos',               await pg.$$eval('#alcNotif,.alcNotif',e=>e.length), 0);

  /* 2. nenhum texto removido sobrou na tela */
  const txt = await pg.$eval('.alcHome',e=>e.textContent.replace(/\s+/g,' '));
  for (const s of SUMIU) t(p+'nao aparece "'+s+'"', txt.indexOf(s)>=0, false);

  /* 3. a Home tem exatamente os 4 blocos e termina no BARBER IA */
  t(p+'Home com 4 blocos', await pg.$eval('.alcHome',e=>e.children.length), 4);
  t(p+'ordem: saudacao, indicadores, grade, BARBER IA', await pg.$eval('.alcHome',e=>
    [...e.children].map(c=>c.className.split(' ')[0])), ['alcOla','alcDia','alcGrade','alcIA']);
  t(p+'ultimo elemento e o BARBER IA', await pg.$eval('.alcHome',
    e=>e.lastElementChild.id), 'alcIaBt');

  /* 4. nada foi criado no lugar */
  t(p+'nenhum bloco abaixo do BARBER IA', await pg.evaluate(()=>{
    const ia=document.getElementById('alcIaBt');
    let n=ia.nextElementSibling, c=0; while(n){c++;n=n.nextElementSibling;} return c; }), 0);

  /* 5. o que ficou continua inteiro */
  t(p+'cabecalho intacto',   await pg.$$eval('.hdr',e=>e.length), 1);
  t(p+'menu intacto',        await pg.$$eval('#navBt',e=>e.length), 1);
  t(p+'Noite intacto',       await pg.$$eval('#btNoite',e=>e.length), 1);
  t(p+'saudacao presente',   await pg.$eval('.alcOla h1',e=>/Marcos/.test(e.textContent)), true);
  t(p+'tres indicadores',    await pg.$$eval('.alcDia > div',e=>e.length), 3);
  t(p+'rotulos dos indicadores', await pg.$$eval('.alcDia u',e=>e.map(x=>x.textContent)),
    ['ATENDIMENTOS','COMANDAS ABERTAS','NO CAIXA']);
  t(p+'dez aplicativos',     await pg.$$eval('.alcGrade .alcAp',e=>e.length), 10);
  t(p+'BARBER IA presente',  await pg.$$eval('#alcIaBt',e=>e.length), 1);

  /* 6. nao arrasta nem pra cima nem pra baixo */
  t(p+'abre no topo', await pg.evaluate(()=>document.scrollingElement.scrollTop), 0);
  t(p+'nao rola', await pg.evaluate(()=>
    document.documentElement.scrollHeight - window.innerHeight <= 1), true);
  t(p+'BARBER IA inteiro no viewport', await pg.evaluate(()=>{
    const r=document.getElementById('alcIaBt').getBoundingClientRect();
    return r.top>=0 && r.bottom<=window.innerHeight+1; }), true);

  /* 7. espaco vazio e permitido, mas sem buraco entre os blocos */
  t(p+'grade colada no BARBER IA', await pg.evaluate(()=>{
    const g=document.querySelector('.alcGrade').getBoundingClientRect();
    const i=document.getElementById('alcIaBt').getBoundingClientRect();
    return i.top - g.bottom < 40; }), true);

  await pg.close();
}

/* 8. o tamanho do aplicativo nao pode ter mudado */
const pg=await br.newPage({viewport:{width:390,height:844}});
await pg.setContent(pagina(),{waitUntil:'load'}); await pg.waitForTimeout(600);
const r = await pg.evaluate(()=>
  document.querySelector(".alcSq").getBoundingClientRect().width / window.innerWidth);
t('azulejo no mesmo tamanho de antes (0.158)', Math.abs(r-0.158)<0.004, true);
console.log('      (proporcao medida do azulejo: '+r.toFixed(3)+')');

/* 9. o codigo das funcionalidades continua no arquivo, so nao e chamado na Home */
t('codigo de proximo atendimento preservado', /function buscarProximo/.test(JS_), true);
t('codigo de avisos preservado',              /function ligarAvisos/.test(JS_), true);
t('nao chama buscarProximo na Home',          /\n\s*buscarProximo\(\);/.test(JS_), false);
t('nao chama ligarAvisos na Home',            /\n\s*ligarAvisos\(\);/.test(JS_), false);

await br.close();
console.log('\nHome simplificada: '+ok+' ok, '+f+' falhas');
process.exit(f?1:0);
})();
