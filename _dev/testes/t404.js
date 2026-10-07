/* testa a regra de redirecionamento do 404.html contra o HTML real */
const fs = require('fs');
const html = fs.readFileSync('/home/claude/fix404/404.html', 'utf8');

/* extrai a IIFE do arquivo, para testar o codigo real e nao uma copia */
const i = html.indexOf('(function(){');
const j = html.indexOf('})();', i);
if (i < 0 || j < 0) { console.log('FALHA: nao achei a IIFE'); process.exit(1); }
const fonte = html.slice(i, j + 5);

function rodar(url){
  const u = new URL(url);
  let destino = null;
  const location = {
    pathname: u.pathname, search: u.search, hash: u.hash,
    replace: function(d){ destino = d; }
  };
  const fn = new Function('location', 'URLSearchParams', fonte);
  fn(location, URLSearchParams);
  return destino;
}

const B = 'https://app.aloco.com.br';
const casos = [
  ['/painel/marcos-2',                    '/painel-app-pwa/?b=marcos-2'],
  ['/painel/marcos-2/',                   '/painel-app-pwa/?b=marcos-2'],
  ['/painel/Marcos-2',                    '/painel-app-pwa/?b=marcos-2'],
  ['/painel/nova-jerusalem-0721',         '/painel-app-pwa/?b=nova-jerusalem-0721'],
  ['/painel/ki%2Dbeleza',                 '/painel-app-pwa/?b=ki-beleza'],
  ['/painel/marcos-2?nome=Marcos',        '/painel-app-pwa/?nome=Marcos&b=marcos-2'],
  ['/painel/marcos-2#agenda',             '/painel-app-pwa/?b=marcos-2#agenda'],
  ['/painel/',                            null],
  ['/painel',                             null],
  ['/qualquer-coisa',                     null],
  ['/clientes/marcos-2',                  null],
  ['/painel-app-pwa/?b=marcos-2',         null],
  ['/',                                   null],
  ['/painel/a/b',                         null]
];

let ok = 0, mau = 0;
for (const [caminho, esperado] of casos){
  const r = rodar(B + caminho);
  const passou = r === esperado;
  passou ? ok++ : mau++;
  console.log((passou ? 'ok  ' : 'ERRO') + '  ' + caminho.padEnd(34) + ' -> ' + r);
  if (!passou) console.log('      esperado: ' + esperado);
}

/* o 404 nunca pode gerar manifest (era a causa do PWA preso) */
const semManifest = !/rel\s*=\s*["']?manifest/i.test(html) && !/start_url/i.test(html);
console.log((semManifest ? 'ok  ' : 'ERRO') + '  nao gera manifest nem start_url');
semManifest ? ok++ : mau++;

/* tamanho: o antigo tinha 391 KB */
const pequeno = html.length < 8000;
console.log((pequeno ? 'ok  ' : 'ERRO') + '  tamanho ' + html.length + ' bytes (antigo: 391906)');
pequeno ? ok++ : mau++;

console.log('\n' + ok + ' passou / ' + mau + ' falhou');
process.exit(mau ? 1 : 0);
