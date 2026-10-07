/* testes do comando de voz do painel, no Chromium de verdade */
const { chromium } = require('playwright');

let ok = 0, mau = 0;
function val(cond, nome, extra){
  if (cond){ ok++; console.log('ok    ' + nome); }
  else { mau++; console.log('ERRO  ' + nome + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}

const PLANO_3 = {
  ok: true,
  texto: 'cadastra o corte por 35 a barba por 25 e a sobrancelha',
  plano: {
    intencao: 'criar', entidade: 'servico', precisaConfirmar: true, confianca: 0.8,
    pergunta: 'Qual o preço da sobrancelha?',
    itens: [
      { nome:'Corte',       preco:35, duracao:30, id:'', ambiguo:false },
      { nome:'Barba',       preco:25, duracao:30, id:'', ambiguo:false },
      { nome:'Sobrancelha', preco:0,  duracao:30, id:'', ambiguo:true  }
    ]
  },
  custo: { tin: 400, tout: 120 }
};

(async () => {
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const p = await b.newPage({ viewport:{ width:390, height:844 } });   // iPhone 14
  const erros = [];
  p.on('pageerror', e => erros.push(String(e)));
  await p.goto('http://localhost:8742/', { waitUntil:'networkidle' });

  /* ── 1. o gancho existe ─────────────────────────────────────────── */
  val(await p.evaluate(() => typeof window.ALOCO_IA_ABRIR === 'function'),
      'window.ALOCO_IA_ABRIR existe (e o botao BARBER IA chama isso)');

  /* ── 2. abre na tela de inicio ──────────────────────────────────── */
  await p.evaluate(() => window.ALOCO_IA_ABRIR());
  val(await p.locator('#iavMic').isVisible(), 'abre com o botao de microfone');
  val((await p.locator('.iav-centro').innerText()).includes('conferir'),
      'avisa que nada e salvo sem conferir');

  /* ── 3. erro de permissao, em portugues ─────────────────────────── */
  await p.evaluate(() => { window.__micErro = { name:'NotAllowedError' }; });
  await p.click('#iavMic');
  await p.waitForTimeout(150);
  let t = await p.locator('.iav-centro').innerText();
  val(t.includes('permitir o microfone'), 'erro de permissao explicado em portugues', t.slice(0,60));
  val(!/NotAllowedError/.test(t), 'nao mostra o nome tecnico do erro para o barbeiro');

  /* ── 4. caminho feliz: gravar e receber o plano ─────────────────── */
  await p.evaluate(r => { window.__micErro = null; window.__resposta = r; }, PLANO_3);
  await p.click('#iavTentar');
  await p.click('#iavMic');
  await p.waitForTimeout(100);
  val(await p.locator('#iavParar').isVisible(), 'mostra o botao Terminei enquanto grava');
  val(await p.locator('.iav-ondas').isVisible(), 'mostra as ondas de audio (azul, nao verde)');
  await p.click('#iavParar');
  await p.waitForTimeout(250);

  val(await p.locator('.iav-item').count() === 3, 'lista os 3 itens que a IA entendeu');
  val((await p.locator('.iav-falou').innerText()).includes('cadastra o corte'),
      'mostra o que ele falou, transcrito');
  val(await p.locator('.iav-pergunta').isVisible(), 'mostra a pergunta da IA quando ela tem duvida');
  val(await p.locator('.iav-item.amb').count() === 1, 'marca visualmente o item ambiguo');
  val(await p.locator('.iav-item').nth(0).locator('.iav-bt').count() === 3,
      'cada item tem os 3 botoes sempre visiveis');

  /* o primeiro POST foi o audio, com a senha */
  let posts = await p.evaluate(() => window.__posts);
  val(posts.length === 1 && posts[0].corpo.action === 'ia_voz', 'manda action ia_voz');
  val(posts[0].corpo.senha === 'SENHA-DE-TESTE', 'manda a senha da barbearia junto');
  val(posts[0].corpo.b === 'marcos-2', 'manda o slug da barbearia');
  val(typeof posts[0].corpo.b64 === 'string' && posts[0].corpo.b64.length > 0, 'manda o audio em base64');

  /* ── 5. botao salvar comeca travado ─────────────────────────────── */
  val(await p.locator('#iavGravar').isDisabled(), 'Salvar comeca desligado: nada confirmado ainda');

  /* ── 6. confirmar e desfazer ────────────────────────────────────── */
  await p.locator('.iav-item').nth(0).locator('[data-a="ok"]').click();
  await p.waitForTimeout(80);
  val(!(await p.locator('#iavGravar').isDisabled()), 'confirmando um item, Salvar liga');
  val((await p.locator('#iavGravar').innerText()).includes('1 servico') ||
      (await p.locator('#iavGravar').innerText()).includes('1 serviço'),
      'o botao diz quantos vao ser salvos');
  await p.locator('.iav-item').nth(0).locator('[data-a="ok"]').click();
  await p.waitForTimeout(80);
  val(await p.locator('#iavGravar').isDisabled(), 'tocar de novo no mesmo botao desfaz');

  /* ── 7. corrigir escrevendo, com virgula ────────────────────────── */
  await p.locator('.iav-item').nth(2).locator('[data-a="editar"]').click();
  await p.waitForTimeout(80);
  val(await p.locator('.iav-form').count() === 1, 'abre o formulario de correcao');
  await p.locator('.iav-in[data-c="nome"]').fill('Sobrancelha masculina');
  await p.locator('.iav-in[data-c="preco"]').fill('12,50');
  await p.locator('[data-a="salvar"]').click();
  await p.waitForTimeout(80);
  let est = await p.evaluate(() => window.__iavTeste.estado());
  val(est.ITENS[2].preco === 12.5, 'aceita preco escrito com virgula', est.ITENS[2].preco);
  val(est.ITENS[2].nome === 'Sobrancelha masculina', 'guarda o nome corrigido');
  val(est.ITENS[2].ambiguo === false, 'corrigir na mao tira a marca de ambiguo');
  val(est.ESTADO[2] === 'ok', 'corrigir ja conta como confirmado');
  val((await p.locator('.iav-item').nth(2).innerText()).includes('corrigido'),
      'mostra a etiqueta "corrigido"');

  /* ── 8. recusa valor invalido ───────────────────────────────────── */
  await p.locator('.iav-item').nth(1).locator('[data-a="editar"]').click();
  await p.waitForTimeout(80);
  await p.locator('.iav-in[data-c="nome"]').fill('');
  await p.locator('[data-a="salvar"]').click();
  await p.waitForTimeout(80);
  let avisos = await p.evaluate(() => window.__toasts);
  val(avisos.some(a => /nome/i.test(a.m)), 'recusa salvar item sem nome');
  val(await p.locator('.iav-form').count() === 1, 'continua no formulario depois de recusar');

  /* ── 9. so o confirmado e enviado ───────────────────────────────── */
  await p.locator('.iav-in[data-c="nome"]').fill('Barba');
  await p.locator('[data-a="salvar"]').click();
  await p.waitForTimeout(80);
  await p.evaluate(() => { window.__posts = []; window.__resposta = { ok:true, gravados:2, recusados:0 }; });
  await p.click('#iavGravar');
  await p.waitForTimeout(250);

  posts = await p.evaluate(() => window.__posts);
  val(posts.length === 1 && posts[0].corpo.action === 'ia_aplicar', 'manda action ia_aplicar ao salvar');
  val(posts[0].corpo.itens.length === 2, 'envia SO os itens confirmados, nao os 3', posts[0].corpo.itens.length);
  val(!posts[0].corpo.itens.some(i => i.nome === 'Corte'),
      'o item que foi desfeito NAO e enviado');
  val(posts[0].corpo.senha === 'SENHA-DE-TESTE', 'ia_aplicar tambem leva a senha');
  val(!posts[0].corpo.itens.some(i => i.ambiguo === true), 'nenhum item ambiguo e enviado');

  /* ── 10. tela final ─────────────────────────────────────────────── */
  t = await p.locator('.iav-centro').innerText();
  val(/2 servi/.test(t), 'tela final diz quantos foram salvos', t.slice(0,40));

  /* ── 11. identidade visual ──────────────────────────────────────── */
  const cores = await p.evaluate(() => {
    const css = document.getElementById('iavCss').textContent;
    return {
      azul:  (css.match(/#0097fd/gi) || []).length,
      verm:  (css.match(/#(b84040|ff0000|e53|f44)/gi) || []).length,
      verde: (css.match(/#4A9E6E/gi) || []).length
    };
  });
  val(cores.azul >= 5, 'azul eletrico e a cor principal', cores);
  val(cores.verm === 0, 'NAO usa vermelho (regra da identidade BARBER IA)', cores);
  val(cores.verde > 0 && cores.verde < cores.azul, 'verde so na confirmacao, menos que o azul', cores);

  /* ── 12. nao vazou erro de script ───────────────────────────────── */
  val(erros.length === 0, 'nenhum erro de JavaScript no caminho inteiro', erros);

  await b.close();
  console.log('\n' + ok + ' passou / ' + mau + ' falhou');
  process.exit(mau ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
