/* ALOCO SEGMENTO */
/* ─────────────────────────────────────────────────────────────────────
   ALOCO — segmento: barber (padrao) ou beauty.
   Nada de cor, layout ou estrutura muda. So o texto.
   O dicionario vai do masculino (como esta escrito hoje) para o feminino.
   ───────────────────────────────────────────────────────────────────── */
(function(){
  if(window.__alocoSegMotor) return;
  window.__alocoSegMotor = 1;
  /* A lembranca do segmento era UMA SO para todo o app.aloco.com.br. Quem
     abrisse o painel de um salao levava "beauty" junto para qualquer app de
     barbearia aberto depois no mesmo navegador - a Barbearia do Markim virava
     "Salao do Markim". Agora a chave e por cliente. */
  function alocoQuem(){
    try { var b = new URLSearchParams(location.search).get('b'); if(b) return String(b).toLowerCase(); } catch(e){}
    var m = String(location.pathname || '').match(/\/clientes\/([^\/]+)/);
    return m ? String(m[1]).toLowerCase() : '_';
  }
  var QUEM  = alocoQuem();
  var CHAVE = 'aloco_seg_' + QUEM;
  try { localStorage.removeItem('aloco_seg'); } catch(e){}   // apaga a chave antiga, contaminada

  function qualSegmento(){
    try {
      var u = new URLSearchParams(location.search).get('seg');
      if(u){ try{ localStorage.setItem(CHAVE, u); }catch(e){} return String(u).toLowerCase(); }
    } catch(e){}
    try { if(window.ALOCO_SEG) return String(window.ALOCO_SEG).toLowerCase(); } catch(e){}
    try {
      var mt = document.querySelector('meta[name="aloco-seg"]');
      if(mt && mt.content) return String(mt.content).toLowerCase();
    } catch(e){}
    try { var g = localStorage.getItem(CHAVE); if(g) return String(g).toLowerCase(); } catch(e){}
    return '';
  }

  /* Os apps entregues antes do {{SEGMENTO}} nao sabem o que sao. Em vez de
     chutar, perguntam ao servidor uma vez e guardam a resposta. */
  var API_SEG = 'https://script.google.com/macros/s/AKfycbwjH7c69qlBz58Cuy0c23Yq7kSC-4PpohEqQCpKUy4gAb6Q1Syzqp-hxVra00wRr7RhiQ/exec';
  function perguntarSegmento(){
    if(QUEM === '_' || !window.fetch) return;
    try {
      fetch(API_SEG + '?action=disponibilidade&b=' + encodeURIComponent(QUEM))
        .then(function(r){ return r.json(); })
        .then(function(j){
          var s = j && j.dados && String(j.dados.segmento || '').toLowerCase();
          if(s !== 'beauty' && s !== 'barber') return;
          try { localStorage.setItem(CHAVE, s); } catch(e){}
          if(s === 'beauty' && window.__alocoSeg !== 'beauty'){
            window.__alocoSeg = 'beauty';
            comecar();
          }
        })
        .catch(function(){});
    } catch(e){}
  }

  var SEG = qualSegmento() || 'barber';
  window.__alocoSeg = SEG;

  // ── frases inteiras primeiro (as mais longas antes) ──────────────────
  var FRASES = [
    // app do cliente
    ['Seu horário está garantido. A barbearia já foi avisada.', 'Seu horário está garantido. O salão já foi avisado.'],
    ['barbearia ja foi avisada', 'salão já foi avisado'],
    ['barbearia já foi avisada', 'salão já foi avisado'],
    ['barbearia foi avisada', 'salão foi avisado'],
    ['barbearia sera avisada', 'salão será avisado'],
    ['barbearia será avisada', 'salão será avisado'],
    ['barbearia avisada', 'salão avisado'],
    ['barbeiro foi avisado', 'profissional foi avisada'],
    ['barbeiro é avisado', 'profissional é avisada'],
    ['seja atendido', 'seja atendida'],
    ['BEM-VINDO À', 'BEM-VINDA AO'], ['BEM-VINDO AO', 'BEM-VINDA AO'], ['BEM-VINDO', 'BEM-VINDA'],
    ['Bem-vindo à', 'Bem-vinda ao'], ['Bem-vindo ao', 'Bem-vinda ao'], ['Bem-vindo', 'Bem-vinda'],
    ['bem-vindo', 'bem-vinda'],
    ['João', 'Maria'], ['Joao', 'Maria'], ['Silva', 'Souza'],
    ['Lucas Mendes', 'Juliana Prado'], ['Rafael Costa', 'Camila Ribeiro'], ['Diego Alves', 'Beatriz Nunes'],
    ['Pra quem trabalha sozinho', 'Pra quem trabalha sozinha'],
    ['clientes atendidos', 'clientes atendidas'],
    ['CLIENTES ATENDIDOS', 'CLIENTES ATENDIDAS'],
    ['cliente atendido', 'cliente atendida'],
    ['atendidos hoje', 'atendidas hoje'],
    ['Planos de corte e barba com preço fechado. Toque num pacote pra falar com a barbearia.',
     'Pacotes com preço fechado. Toque num pacote pra falar com o salão.'],
    ['Entre na fila e seja atendido por ordem de chegada — o barbeiro é avisado na hora.',
     'Entre na fila e seja atendida por ordem de chegada — a profissional é avisada na hora.'],
    ['Pronto! A barbearia foi avisada do seu interesse.', 'Pronto! O salão foi avisado do seu interesse.'],
    ['A barbearia ainda não cadastrou pacotes.', 'O salão ainda não cadastrou pacotes.'],
    ['Fale com a barbearia para fechar o pacote.', 'Fale com o salão para fechar o pacote.'],
    ['identificar sua conta na barbearia.', 'identificar sua conta no salão.'],
    ['É a sua vez! Dirija-se à barbearia', 'É a sua vez! Dirija-se ao salão'],
    ['Dirija-se à barbearia.', 'Dirija-se ao salão.'],
    ['Fale com a barbearia.', 'Fale com o salão.'],
    ['O barbeiro chamou você.', 'A profissional chamou você.'],
    ['Seu visual fala antes de você.', 'Seu momento de cuidar de você.'],
    ['Padrão elevado, mantido.', 'Beleza que começa no seu tempo.'],
    ['Seu barbeiro habitual', 'Sua profissional habitual'],
    ['45 minutos · degradê, tesoura ou navalhado', '45 minutos · corte e finalização'],
    ['30 minutos · navalha e finalização', '60 minutos · lavagem e escova'],
    ['Degradê · Barba · Pigmentação', 'Corte · Coloração · Escova'],
    ['Tesoura · Cortes clássicos', 'Mechas · Luzes'],
    ['Navalhado · Barba longa', 'Unhas · Design de sobrancelha'],
    ['Degradê • Barba', 'Corte • Coloração'],
    ['Tesoura • Clássico', 'Mechas • Luzes'],
    ['Navalhado • Barba longa', 'Unhas • Sobrancelha'],
    ['Reserve seu primeiro corte', 'Reserve seu primeiro horário'],
    ['Planos de corte e barba', 'Pacotes de beleza'],
    ['corte e barba', 'beleza e cuidado'],
    ['Corte + Barba', 'Corte + Escova'],

    // painel
    ['Cadastre os barbeiros e a recepção. Cada um recebe a própria senha e você escolhe o que ele enxerga.',
     'Cadastre as profissionais e a recepção. Cada uma recebe a própria senha e você escolhe o que ela enxerga.'],
    ['Pra quem quer parar de largar a tesoura pra responder cliente.',
     'Pra quem quer parar de largar a cliente na cadeira pra responder mensagem.'],
    ['Pra barbearia com varios barbeiros na cadeira.', 'Pra salão com várias profissionais na cadeira.'],
    ['Pra barbearia com vários barbeiros na cadeira.', 'Pra salão com várias profissionais na cadeira.'],
    ['Precisamos de alguns meses de movimento da sua barbearia', 'Precisamos de alguns meses de movimento do seu salão'],
    ['histórico suficiente da sua barbearia', 'histórico suficiente do seu salão'],
    ['Comissao do Barbeiro (R$)', 'Comissao da Profissional (R$)'],
    ['Comissão do Barbeiro (R$)', 'Comissão da Profissional (R$)'],
    ['Ex: Barbeiro, Recepção', 'Ex: Cabeleireira, Recepção'],
    ['Ex: Corte Social', 'Ex: Escova'],
    ['Barbeiro (opcional)...', 'Profissional (opcional)...'],
    ['Selecione o barbeiro.', 'Selecione a profissional.'],
    ['Receita por barbeiro', 'Receita por profissional'],
    ['Editar Barbeiro', 'Editar Profissional'],
    ['Novo Barbeiro', 'Nova Profissional'],
    ['Barbeiro pref.', 'Profissional pref.'],
    ['Barber IA', 'Beauty IA'],

    // artigos: o portugues muda o genero junto
    ['da sua barbearia', 'do seu salão'], ['na sua barbearia', 'no seu salão'],
    ['a sua barbearia', 'o seu salão'],   ['A sua barbearia', 'O seu salão'],
    ['pela barbearia', 'pelo salão'],     ['Pela barbearia', 'Pelo salão'],
    ['da barbearia', 'do salão'],         ['Da barbearia', 'Do salão'],
    ['na barbearia', 'no salão'],         ['Na barbearia', 'No salão'],
    ['à barbearia', 'ao salão'],          ['À barbearia', 'Ao salão'],
    ['a barbearia', 'o salão'],           ['A barbearia', 'O salão'],
    ['seu barbeiro', 'sua profissional'], ['Seu barbeiro', 'Sua profissional'],
    ['dos barbeiros', 'das profissionais'], ['Dos barbeiros', 'Das profissionais'],
    ['os barbeiros', 'as profissionais'], ['Os barbeiros', 'As profissionais'],
    ['do barbeiro', 'da profissional'],   ['Do barbeiro', 'Da profissional'],
    ['ao barbeiro', 'à profissional'],    ['Ao barbeiro', 'À profissional'],
    ['o barbeiro', 'a profissional'],     ['O barbeiro', 'A profissional']
  ];
  FRASES.sort(function(a,b){ return b[0].length - a[0].length; });

  // ── palavras soltas, preservando maiuscula ──────────────────────────
  var PALAVRAS = [
    [/\bbarbearias\b/g, 'salões'], [/\bBarbearias\b/g, 'Salões'], [/\bBARBEARIAS\b/g, 'SALÕES'],
    [/\bbarbearia\b/g, 'salão'],   [/\bBarbearia\b/g, 'Salão'],   [/\bBARBEARIA\b/g, 'SALÃO'],
    [/\bbarbeiros\b/g, 'profissionais'], [/\bBarbeiros\b/g, 'Profissionais'], [/\bBARBEIROS\b/g, 'PROFISSIONAIS'],
    [/\bbarbeiro\b/g, 'profissional'],   [/\bBarbeiro\b/g, 'Profissional'],   [/\bBARBEIRO\b/g, 'PROFISSIONAL'],
    [/\bBarber IA\b/g, 'Beauty IA'], [/\bBARBER IA\b/g, 'BEAUTY IA'],
    [/\bBARBER\b/g, 'BEAUTY'], [/\bBarber\b/g, 'Beauty'], [/\bbarber\b/g, 'beauty'],
    [/\u{1F488}/gu, '\u{1F485}']   // poste de barbearia -> esmalte
  ];

  /* Antes cada pedacinho de texto da tela passava pelas 110 frases e pelas
     20 expressoes, uma por uma. Numa tela de agenda cheia isso e meio milhao
     de comparacoes a cada redesenho - era isso que deixava o painel pesado
     no salao (na barbearia o motor nem liga). Agora ha um portao: uma unica
     expressao que diz, de primeira, se o texto tem alguma palavra que este
     motor sabe trocar. Quase tudo ("R$ 45,00", "09:30", "Segunda") sai por
     ali sem custo. E o que ja foi traduzido fica guardado. */
  function _chave(txt){
    var ws = String(txt).toLowerCase().match(/[0-9a-z\u00e0-\u00ff]{4,}/g);
    if(!ws || !ws.length) return null;
    var m = ws[0];
    for(var i = 1; i < ws.length; i++) if(ws[i].length > m.length) m = ws[i];
    return m;
  }
  var F_CH = [], P_CH = [], _chs = {};
  (function(){
    var i, k;
    for(i = 0; i < FRASES.length; i++){ k = _chave(FRASES[i][0]); F_CH.push(k); if(k) _chs[k] = 1; }
    for(i = 0; i < PALAVRAS.length; i++){
      k = _chave(String(PALAVRAS[i][0].source)
            .replace(/\\b/g, '').replace(/\\u\{[^}]*\}/g, '').replace(/[\\\/]/g, ''));
      P_CH.push(k); if(k) _chs[k] = 1;
    }
  })();
  var PORTAO = new RegExp(Object.keys(_chs).join('|'), 'i');
  var MEMO = Object.create(null), MEMON = 0;

  function traduzir(t){
    if(!t || t.indexOf('') === 0) return t;
    if(t.length < 2) return t;   // o emoji sozinho tem 2 - nao pode escapar
    var pronto = MEMO[t];
    if(pronto !== undefined) return pronto;
    var s = t, i, abre = PORTAO.test(t);
    for(i = 0; i < FRASES.length; i++){
      if(!abre && F_CH[i]) continue;
      if(s.indexOf(FRASES[i][0]) >= 0) s = s.split(FRASES[i][0]).join(FRASES[i][1]);
    }
    for(i = 0; i < PALAVRAS.length; i++){
      if(!abre && P_CH[i]) continue;
      s = s.replace(PALAVRAS[i][0], PALAVRAS[i][1]);
    }
    if(MEMON < 5000){ MEMO[t] = s; MEMON++; }
    return s;
  }
  window.alocoTraduzir = traduzir;

  var PULAR = { SCRIPT:1, STYLE:1, NOSCRIPT:1, TEXTAREA:1, SVG:1, CODE:1 };
  function varrer(raiz){
    try {
      if(!raiz) return;
      if(raiz.nodeType === 3){ var n = traduzir(raiz.nodeValue); if(n !== raiz.nodeValue) raiz.nodeValue = n; return; }
      if(raiz.nodeType !== 1) return;
      if(PULAR[raiz.nodeName]) return;
      var it = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
        acceptNode: function(no){
          var p = no.parentNode;
          return (p && PULAR[p.nodeName]) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
      });
      var lista = [], no;
      while((no = it.nextNode())) lista.push(no);
      lista.forEach(function(x){ var n = traduzir(x.nodeValue); if(n !== x.nodeValue) x.nodeValue = n; });
      // placeholder, title e aria-label tambem sao texto que a pessoa le
      var els = raiz.querySelectorAll ? raiz.querySelectorAll('[placeholder],[title],[aria-label]') : [];
      for(var k = 0; k < els.length; k++){
        ['placeholder','title','aria-label'].forEach(function(at){
          var v = els[k].getAttribute(at);
          if(v){ var n2 = traduzir(v); if(n2 !== v) els[k].setAttribute(at, n2); }
        });
      }
      if(raiz.getAttribute){
        ['placeholder','title','aria-label'].forEach(function(at){
          var v = raiz.getAttribute(at);
          if(v){ var n3 = traduzir(v); if(n3 !== v) raiz.setAttribute(at, n3); }
        });
      }
      // <option> dentro de select tambem
      if(raiz.querySelectorAll){
        var ops = raiz.querySelectorAll('option');
        for(var o = 0; o < ops.length; o++){
          var tv = traduzir(ops[o].textContent);
          if(tv !== ops[o].textContent) ops[o].textContent = tv;
        }
      }
    } catch(e){}
  }

  function tudo(){ varrer(document.body); try{ document.title = traduzir(document.title); }catch(e){} }

  /* O observador disparava a cada no inserido, no meio do desenho da tela, e
     a propria troca de texto gerava um novo disparo. Agora as mudancas sao
     juntadas e tratadas de uma vez no quadro seguinte, com a escrita marcada
     para nao se observar a si mesma. Lote grande demais: uma varredura so. */
  function ligar(){
    tudo();
    var fila = [], marcado = false;
    function rodar(){
      marcado = false;
      var lote = fila; fila = [];
      try {
        if(lote.length > 60) tudo();
        else for(var i = 0; i < lote.length; i++) varrer(lote[i]);
      } catch(e){}
    }
    var depois = window.requestAnimationFrame
      ? function(f){ window.requestAnimationFrame(f); }
      : function(f){ setTimeout(f, 16); };
    try {
      new MutationObserver(function(muts){
        // nao da pra ignorar as mudancas feitas aqui dentro: junto com elas
        // vinham as mudancas que a tela estava fazendo no mesmo instante, e
        // essas sumiam sem ser traduzidas. Traduzir duas vezes nao faz mal:
        // o texto ja traduzido sai igual e nao gera nova mudanca.
        for(var i = 0; i < muts.length; i++){
          var m = muts[i];
          if(m.type === 'characterData') fila.push(m.target);
          else for(var j = 0; j < m.addedNodes.length; j++){
            var no = m.addedNodes[j];
            if(no.nodeType === 1 || no.nodeType === 3) fila.push(no);
          }
        }
        if(fila.length && !marcado){ marcado = true; depois(rodar); }
      }).observe(document.body, { childList:true, subtree:true, characterData:true });
    } catch(e){}
    [400, 2000].forEach(function(ms){ setTimeout(tudo, ms); });
  }
  function comecar(){
    if(window.__alocoSegLigado) return;
    window.__alocoSegLigado = true;
    if(document.body) ligar();
    else document.addEventListener('DOMContentLoaded', ligar);
  }

  /* Antes este arquivo DESISTIA no comeco quando o segmento nao era beauty,
     e o dicionario nem chegava a existir - a espiada tardia chamava comecar()
     e quebrava. Agora tudo fica montado e so o acionamento e condicional. */
  if(SEG === 'beauty'){
    comecar();
  } else {
    // o app pode declarar ALOCO_SEG depois que este arquivo carrega
    var espiadas = 0;
    var relogio = setInterval(function(){
      if(++espiadas > 20){ clearInterval(relogio); return; }
      if(qualSegmento() === 'beauty'){ clearInterval(relogio); window.__alocoSeg = 'beauty'; comecar(); }
    }, 250);
    var sabe = false;
    try { sabe = !!(window.ALOCO_SEG || document.querySelector('meta[name="aloco-seg"]')
                    || localStorage.getItem(CHAVE)); } catch(e){}
    if(!sabe) perguntarSegmento();
  }
})();
/* FIM SEGMENTO */
// ALOCO - ajustes globais dos apps.

// ── O VISUAL NUNCA MAIS FICA PARA TRAS ──────────────────────────
// O carregador dentro de cada app troca a URL do patch.css so a cada
// 5 minutos, entao o navegador podia servir CSS velho por muito tempo.
// Aqui ele e recarregado com carimbo unico a cada abertura.
(function(){
  try{
    var novo = document.createElement('link');
    novo.rel = 'stylesheet';
    novo.href = '/patch.css?t=' + Date.now();
    novo.onload = function(){
      try{
        var velhos = document.querySelectorAll('link[href*="/patch.css?v="]');
        for(var i = 0; i < velhos.length; i++) velhos[i].remove();
      }catch(e){}
    };
    document.head.appendChild(novo);
  }catch(e){}
})();

(function(){
  var K = 'aloco_cliente';
  var P = 'aloco_agd_pendente';

  function lerCookie(){
    try { var m = document.cookie.match(/(?:^|;\s*)aloco_cliente=([^;]*)/);
          return m ? decodeURIComponent(m[1]) : ''; } catch(e){ return ''; }
  }
  function gravarCookie(v){
    try { document.cookie = K+'='+encodeURIComponent(v)+';path=/;max-age=31536000;SameSite=Lax'; } catch(e){}
  }
  function apagarCookie(){ try { document.cookie = K+'=;path=/;max-age=0'; } catch(e){} }
  function lerLocal(){ try { return localStorage.getItem(K) || ''; } catch(e){ return ''; } }
  function gravarLocal(v){ try { localStorage.setItem(K, v); } catch(e){} }

  // o app grava o nome completo por cima do campo "nome" e mantem o sobrenome:
  // junta os dois depois e sai "Marcos Diniz Diniz". Aqui tiramos a repeticao.
  function semRepetir(o){
    try {
      if(!o || !o.nome || !o.sobrenome) return o;
      var n = String(o.nome).trim(), s = String(o.sobrenome).trim();
      if (n.length > s.length && n.slice(-(s.length+1)).toLowerCase() === (' '+s).toLowerCase()){
        o.nome = n.slice(0, n.length - s.length - 1).trim();
      }
    } catch(e){}
    return o;
  }
  function normalizar(txt){
    try { var o = JSON.parse(txt); if(!o) return txt; return JSON.stringify(semRepetir(o)); }
    catch(e){ return txt; }
  }

  var atual = lerLocal() || lerCookie();
  if (atual && atual !== 'null'){ atual = normalizar(atual); gravarLocal(atual); gravarCookie(atual); }

  if (typeof window.salvarSessao === 'function'){
    var _salvar = window.salvarSessao;
    window.salvarSessao = function(d){
      try { d = semRepetir(d); gravarCookie(JSON.stringify(d)); } catch(e){}
      return _salvar.call(this, d);
    };
  }
  if (typeof window.sairConta === 'function'){
    var _sair = window.sairConta;
    window.sairConta = function(){ apagarCookie(); return _sair.apply(this, arguments); };
  }

  function restaurar(){
    var s = lerLocal() || lerCookie();
    if (!s || s === 'null') return;
    var tela = document.getElementById('screen-cadastro');
    if (tela && !tela.classList.contains('hidden')){
      try {
        if (typeof window.aplicarCliente === 'function') window.aplicarCliente(JSON.parse(s));
        if (typeof window.entrarNoApp === 'function') window.entrarNoApp();
        else tela.classList.add('hidden');
      } catch(e){ tela.classList.add('hidden'); }
    }
  }
  restaurar();
  var n = 0, t = setInterval(function(){ restaurar(); if (++n > 40) clearInterval(t); }, 400);

  // ── AVISO DE AGENDAMENTO NAO CONFIRMADO ────────────────────────────
  // Antes o app dizia "horario garantido" mesmo quando o envio falhava: o
  // POST terminava em .catch(function(){}) e ninguem ficava sabendo.
  var ultimoUrl = '';
  function faixa(txt, acao){
    var id = 'aloco-aviso-agd';
    var el = document.getElementById(id);
    if(!el){
      el = document.createElement('div'); el.id = id;
      // acima da barra de abas do app, senao a faixa cobre a navegacao
      el.style.cssText = 'position:fixed;left:12px;right:12px;z-index:999999;'
        + 'bottom:calc(84px + env(safe-area-inset-bottom, 0px));'
        + 'background:#8c2f2f;color:#fff;padding:13px 15px;border-radius:12px;font:600 13px/1.4 inherit;'
        + 'box-shadow:0 10px 28px rgba(0,0,0,.5);display:flex;gap:10px;align-items:center';
      document.body.appendChild(el);
    }
    el.innerHTML = '<span style="flex:1">'+txt+'</span>';
    if(acao){
      var b = document.createElement('button');
      b.textContent = 'Tentar de novo';
      b.style.cssText = 'border:0;border-radius:9px;padding:9px 12px;font:700 12px inherit;'
        + 'background:#fff;color:#8c2f2f;cursor:pointer';
      b.onclick = acao; el.appendChild(b);
    }
    el.style.display = 'flex';
  }
  function esconderFaixa(){ var el=document.getElementById('aloco-aviso-agd'); if(el) el.style.display='none'; }

  function guardarPendente(url, body){
    try { localStorage.setItem(P, JSON.stringify({ url:url, body:body, em:Date.now() })); } catch(e){}
  }
  function limparPendente(){ try { localStorage.removeItem(P); } catch(e){} }

  function reenviar(){
    var p = null; try { p = JSON.parse(localStorage.getItem(P) || 'null'); } catch(e){}
    if(!p || !p.url || !p.body) { esconderFaixa(); return; }
    faixa('Enviando de novo...', null);
    _fetch.call(window, p.url, { method:'POST', body:p.body })
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(j && j.ok){ limparPendente(); esconderFaixa(); }
        else faixa('A barbearia ainda nao recebeu o seu horario.', reenviar);
      })
      .catch(function(){ faixa('Sem conexao. O seu horario ainda nao foi enviado.', reenviar); });
  }

  // AGENDAMENTO: completa o que faltar com o que esta na tela de confirmacao
  var _fetch = window.fetch;
  window.fetch = function(url, opt){
    var ehAgendar = false;
    try {
      if (opt && String(opt.method||'').toUpperCase() === 'POST'
          && typeof opt.body === 'string' && opt.body.indexOf('"agendar"') >= 0){
        ehAgendar = true;
        var o = JSON.parse(opt.body);
        var g = function(id){ var e = document.getElementById(id); return e ? String(e.textContent||'').trim() : ''; };
        var vazio = function(v){ return !v || v === 'undefined' || v === 'null'; };
        var c = {}; try { c = semRepetir(JSON.parse(lerLocal() || lerCookie() || '{}')) || {}; } catch(e){}
        if (vazio(o.servico))  o.servico  = g('cd-svc');
        if (vazio(o.barbeiro)) o.barbeiro = g('cd-bar');
        if (vazio(o.horario))  o.horario  = g('cd-hr');
        if (vazio(o.telefone)) o.telefone = String(c.telefone || '');
        o.cliente = ((c.nome||'') + ' ' + (c.sobrenome||'')).trim() || o.cliente || 'Cliente';
        if (!o.valor){
          var v = g('cd-vl').replace(/[^\d,]/g,'').replace(',','.');
          o.valor = parseFloat(v) || 0;
        }
        var corpo = JSON.stringify(o);
        opt = Object.assign({}, opt, { body: corpo });   // mantem headers e o resto
        ultimoUrl = String(url || '');
        guardarPendente(ultimoUrl, corpo);
      }
    } catch(e){}

    var r = _fetch.call(this, url, opt);
    if (!ehAgendar) return r;
    return r.then(function(resp){
      try {
        resp.clone().json().then(function(j){
          if (j && j.ok){ limparPendente(); esconderFaixa(); }
          else faixa('A barbearia nao recebeu o seu horario.', reenviar);
        }).catch(function(){ limparPendente(); esconderFaixa(); });
      } catch(e){}
      return resp;
    }, function(err){
      faixa('Sem conexao. O seu horario ainda nao foi enviado.', reenviar);
      throw err;
    });
  };

  // ══════════════════════════════════════════════════════════════
  //  MEUS HORARIOS  —  a Fila sai da barra, esta entra no lugar.
  //  Tudo vem do servidor, entao se a barbearia cancelar, o cliente ve.
  //  Pacotes so aparece se a barbearia tiver cadastrado algum.
  // ══════════════════════════════════════════════════════════════
  var API  = (typeof window.ALOCO_API  !== 'undefined') ? window.ALOCO_API  : '';
  var SLUG = (typeof window.ALOCO_SLUG !== 'undefined') ? window.ALOCO_SLUG : '';
  var temApi = API && String(API).indexOf('http') === 0;

  function meuTelefone(){
    try {
      var c = JSON.parse(lerLocal() || lerCookie() || '{}') || {};
      return String(c.telefone || '').replace(/\D/g, '');
    } catch(e){ return ''; }
  }
  function esc(t){
    return String(t == null ? '' : t)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function diaBR(iso){
    var p = String(iso || '').split('-');
    return p.length === 3 ? (p[2] + '/' + p[1]) : String(iso || '');
  }
  function dinheiro(v){
    v = Number(v) || 0;
    return 'R$ ' + v.toFixed(2).replace('.', ',');
  }

  function horaTopo(){
    var e = document.querySelector('.sb-time');
    return e ? String(e.textContent || '').trim() : '';
  }
  // Rede de seguranca: se sobrar em algum app um atalho antigo para uma tela
  // que nao existe mais, navTo apagava a tela atual e parava no erro — o
  // cliente ficava com o aplicativo em branco. Agora o toque simplesmente
  // nao faz nada.
  function protegerNavTo(){
    try {
      if(typeof window.navTo !== 'function' || window.__alocoNavOk) return;
      var original = window.navTo;
      window.navTo = function(id){
        try {
          if(typeof SCREENS === 'undefined' || !SCREENS[id] || !document.getElementById(SCREENS[id])) return;
        } catch(e){ return; }
        return original.apply(this, arguments);
      };
      window.__alocoNavOk = 1;
    } catch(e){}
  }

  function tirarFila(){
    ['nav-fila','screen-fila','lt-fila'].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.style.display = 'none';
    });
    try {
      var atalhos = document.querySelectorAll('[onclick*="fila"]');
      for(var i = 0; i < atalhos.length; i++){
        if(atalhos[i].id === 'nav-meus') continue;
        atalhos[i].style.display = 'none';
      }
    } catch(e){}
    try {
      if(typeof SCREENS !== 'undefined' && SCREENS.fila) delete SCREENS.fila;
      if(typeof NAV_BTNS !== 'undefined' && NAV_BTNS.fila) delete NAV_BTNS.fila;
    } catch(e){}
  }

  var ICONE =
      '<svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none"'
    + ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
    + '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>';

  function montarMeus(){
    if(document.getElementById('screen-meus')) return true;
    var barra = document.querySelector('.nav-items');
    if(!barra) return false;

    var b = document.createElement('button');
    b.className = 'nav-btn'; b.id = 'nav-meus'; b.type = 'button';
    b.innerHTML = ICONE + '<span class="nav-lbl">Meus</span>';
    b.onclick = function(){ irPara('meus'); };
    var perfil = document.getElementById('nav-perfil');
    if(perfil && perfil.parentNode === barra) barra.insertBefore(b, perfil);
    else barra.appendChild(b);

    var tela = document.createElement('div');
    tela.className = 'screen'; tela.id = 'screen-meus';
    tela.innerHTML =
        '<div class="sb"><span class="sb-time">' + esc(horaTopo()) + '</span>'
      +   '<span class="sb-brand">' + esc(document.querySelector('.sb-brand') ? document.querySelector('.sb-brand').textContent : '') + '</span></div>'
      + '<div class="fila-hd fu on" style="padding:0 20px">'
      +   '<div class="hd-eyebrow">Meus horários</div>'
      +   '<h1 class="hd-title">O que você<em> já marcou.</em></h1>'
      + '</div>'
      + '<div id="meus-corpo" style="padding:18px 20px 40px"></div>';
    document.body.appendChild(tela);

    try {
      if(typeof SCREENS  !== 'undefined') SCREENS.meus  = 'screen-meus';
      if(typeof NAV_BTNS !== 'undefined') NAV_BTNS.meus = 'nav-meus';
    } catch(e){}
    return true;
  }

  function irPara(id){
    try {
      if(typeof window.navTo === 'function' && typeof SCREENS !== 'undefined' && SCREENS[id]){
        window.navTo(id); carregarMeus(); return;
      }
    } catch(e){}
    // caminho de reserva: troca a tela na mao
    try {
      var atual = document.querySelector('.screen.active');
      if(atual) atual.classList.remove('active');
      var nova = document.getElementById('screen-' + id);
      if(nova){ nova.classList.add('active'); nova.scrollTop = 0; }
      var bs = document.querySelectorAll('.nav-btn');
      for(var i = 0; i < bs.length; i++) bs[i].classList.remove('active');
      var bt = document.getElementById('nav-' + id);
      if(bt) bt.classList.add('active');
      carregarMeus();
    } catch(e){}
  }

  function cartao(a, passado){
    var st = String(a.status || '').toUpperCase();
    var cor = 'var(--c2)', rotulo = st.charAt(0) + st.slice(1).toLowerCase();
    if(st === 'CANCELADO'){ cor = 'var(--err)'; rotulo = 'Cancelado pela barbearia'; }
    else if(st === 'PAGO' || st === 'CONCLUIDO'){ cor = 'var(--ok)'; rotulo = 'Atendido'; }
    else if(st === 'CONFIRMADO'){ cor = 'var(--ok)'; rotulo = 'Confirmado'; }
    else if(st === 'PENDENTE'){ cor = 'var(--b2)'; rotulo = 'Aguardando confirmação'; }

    return '<div style="border:0.5px solid var(--r1);border-radius:14px;padding:14px 15px;'
      + 'margin-bottom:10px;background:linear-gradient(135deg,var(--s1),transparent);'
      + (passado ? 'opacity:.62;' : '') + '">'
      +   '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">'
      +     '<div style="min-width:0">'
      +       '<div style="font-size:15px;font-weight:700;color:var(--cr)">' + esc(a.servico || 'Horário') + '</div>'
      +       (a.barbeiro ? '<div style="font-size:12.5px;color:var(--c2);margin-top:3px">com ' + esc(a.barbeiro) + '</div>' : '')
      +     '</div>'
      +     '<div style="text-align:right;white-space:nowrap">'
      +       '<div style="font-size:16px;font-weight:800;color:var(--b2)">' + esc(a.horario || '--:--') + '</div>'
      +       '<div style="font-size:11.5px;color:var(--c3);margin-top:2px">' + esc(diaBR(a.data)) + '</div>'
      +     '</div>'
      +   '</div>'
      +   '<div style="display:flex;justify-content:space-between;align-items:center;'
      +     'margin-top:11px;padding-top:10px;border-top:0.5px solid var(--r1)">'
      +     '<span style="font-size:11.5px;color:' + cor + ';font-weight:600">' + esc(rotulo) + '</span>'
      +     (a.valor > 0 ? '<span style="font-size:12px;color:var(--c2)">' + dinheiro(a.valor) + '</span>' : '<span></span>')
      +   '</div>'
      + '</div>';
  }

  var carregando = false;
  function carregarMeus(){
    var alvo = document.getElementById('meus-corpo');
    var tel = meuTelefone();
    if(!temApi || !tel){
      if(alvo) alvo.innerHTML = vazio('Ainda não dá pra mostrar', 'Confirme seu cadastro para ver os seus horários aqui.');
      return;
    }
    if(carregando) return;
    carregando = true;
    if(alvo && !alvo.innerHTML) alvo.innerHTML = '<div style="color:var(--c3);font-size:13px">Carregando...</div>';

    _fetch.call(window, API + '?action=meus_agendamentos&b=' + encodeURIComponent(SLUG)
                + '&tel=' + encodeURIComponent(tel))
      .then(function(r){ return r.json(); })
      .then(function(j){
        carregando = false;
        if(!j || !j.ok) throw new Error('sem dados');
        pintarMeus(j);
        pintarHistorico(j);
        atualizarInicio(j);
      })
      .catch(function(){
        carregando = false;
        if(alvo && alvo.innerHTML.indexOf('Carregando') >= 0){
          alvo.innerHTML = vazio('Não consegui carregar', 'Verifique a conexão e tente de novo.');
        }
      });
  }

  function vazio(t, s2){
    return '<div style="text-align:center;padding:46px 18px">'
      + '<div style="font-size:30px;margin-bottom:10px">🗓</div>'
      + '<div style="font-size:15px;color:var(--cr);font-weight:600">' + esc(t) + '</div>'
      + '<div style="font-size:13px;color:var(--c3);margin-top:6px;line-height:1.5">' + esc(s2) + '</div>'
      + '</div>';
  }


  // O Perfil tem um bloco "Historico de agendamentos" que nunca foi
  // preenchido por ninguem: dizia "Voce ainda nao tem agendamentos por aqui"
  // mesmo para quem tinha. Agora ele vem do mesmo retorno do servidor.
  function pintarHistorico(j){
    try {
      var alvo = document.getElementById('aloco-hist');
      if(!alvo) return;
      var p = (j && j.passados) || [];
      if(!p.length){
        alvo.innerHTML = '<div class="style-row" style="justify-content:center">'
          + '<span class="style-key" style="opacity:.6">Nenhum atendimento ainda.</span></div>';
        return;
      }
      var h = '';
      p.slice(0, 8).forEach(function(a){
        var val = Number(a.valor) > 0 ? dinheiro(a.valor) : '';
        h += '<div class="style-row"><span class="style-key">' + esc(diaBR(a.data))
           + (a.servico ? ' \u00b7 ' + esc(a.servico) : '')
           + '</span><span class="style-val">' + esc(val) + '</span></div>';
      });
      if(p.length > 8){
        h += '<div class="style-row"><span class="style-key" style="opacity:.6">'
           + '+ ' + (p.length - 8) + ' atendimentos anteriores</span><span class="style-val"></span></div>';
      }
      alvo.innerHTML = h;
    } catch(e){}
  }

  function pintarMeus(j){
    var alvo = document.getElementById('meus-corpo');
    if(!alvo) return;
    var f = j.futuros || [], p = j.passados || [];
    if(!f.length && !p.length){
      alvo.innerHTML = vazio('Nenhum horário ainda', 'Quando você marcar, ele aparece aqui — com a confirmação da barbearia.');
      return;
    }
    var h = '';
    if(f.length){
      h += '<div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;'
         + 'color:var(--c3);margin:0 0 10px">Próximos</div>';
      f.forEach(function(a){ h += cartao(a, false); });
    }
    if(p.length){
      h += '<div style="font-size:10px;letter-spacing:.18em;text-transform:uppercase;'
         + 'color:var(--c3);margin:' + (f.length ? '22px' : '0') + ' 0 10px">Histórico</div>';
      p.forEach(function(a){ h += cartao(a, true); });
    }
    alvo.innerHTML = h;
  }

  // o card do Inicio passa a vir do servidor, nao do celular
  function atualizarInicio(j){
    var f = (j.futuros || [])[0];
    try {
      if(f){
        localStorage.setItem('aloco_proximo', JSON.stringify({
          servico:f.servico, barbeiro:f.barbeiro, dia:diaBR(f.data), iso:f.data, horario:f.horario
        }));
        if(typeof window.alocoMostrarProximo === 'function'){
          window.alocoMostrarProximo({ servico:f.servico, barbeiro:f.barbeiro, dia:diaBR(f.data), horario:f.horario });
        }
      } else {
        localStorage.removeItem('aloco_proximo');
        if(typeof window._alocoTxt === 'function'){
          window._alocoTxt('nc-svc', 'Nenhum horário ainda');
          window._alocoTxt('nc-sub', 'Reserve seu primeiro corte');
          window._alocoTxt('nc-hr', '—');
          window._alocoTxt('nc-dy', '');
        }
      }
    } catch(e){}
  }

  // Pacotes: so fica na barra se a barbearia tiver cadastrado algum
  function conferirPacotes(){
    var bt = document.getElementById('nav-pacotes');
    if(!bt) return;
    if(!temApi){ bt.style.display = 'none'; return; }
    bt.style.display = 'none';                       // escondido ate provar que tem
    _fetch.call(window, API + '?action=pacotes&b=' + encodeURIComponent(SLUG))
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(j && j.ok && j.dados && j.dados.length) bt.style.display = '';
      })
      .catch(function(){});
  }

  // ── TEXTO VOLTA A TER CONTRASTE ───────────────────────────────
  // O gerador pintava a rampa de texto inteira com a cor da marca
  // (--cr virava #5d87ff num app azul). Resultado: titulo, paragrafo e
  // destaque todos no mesmo tom — chapado e sem hierarquia. Aqui a cor do
  // texto volta pra perto do branco, guardando so um fio do tom da marca.
  function _rgbDe(txt){
    txt = String(txt || '').trim();
    var m = txt.match(/^#([0-9a-f]{6})$/i);
    if(m){
      var n = parseInt(m[1], 16);
      return { r:(n >> 16) & 255, g:(n >> 8) & 255, b:n & 255 };
    }
    m = txt.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
    if(m) return { r:+m[1], g:+m[2], b:+m[3] };
    return null;
  }
  function clarearTexto(){
    try {
      var raiz = document.documentElement;
      if(raiz.getAttribute('data-aloco-txt')) return;
      var cor = _rgbDe(getComputedStyle(raiz).getPropertyValue('--cr'));
      if(!cor) return;
      var p = 0.80;                               // 80% branco, 20% da marca
      var r = Math.round(255 * p + cor.r * (1 - p));
      var g = Math.round(255 * p + cor.g * (1 - p));
      var b = Math.round(255 * p + cor.b * (1 - p));
      var base = r + ',' + g + ',' + b;
      raiz.style.setProperty('--cr', 'rgb(' + base + ')');
      raiz.style.setProperty('--c2', 'rgba(' + base + ',0.62)');
      raiz.style.setProperty('--c3', 'rgba(' + base + ',0.40)');
      raiz.style.setProperty('--c4', 'rgba(' + base + ',0.20)');
      raiz.style.setProperty('--c5', 'rgba(' + base + ',0.09)');
      raiz.setAttribute('data-aloco-txt', '1');
    } catch(e){}
  }

  // ── TELA EM BRANCO AO ABRIR O APP ─────────────────────────────
  // O conteudo nasce invisivel (.fu) e so aparece quando o initScreen
  // roda — e ele esta preso ao DOMContentLoaded. Em app instalado, o
  // sistema restaura a pagina do cache e esse evento nao dispara de
  // novo: a tela fica vazia ate o cliente trocar de aba. Aqui a gente
  // garante que o conteudo da tela ativa sempre apareca.
  function garantirVisivel(){
    try {
      var tela = document.querySelector('.screen.active') || document.getElementById('screen-home');
      if(!tela) return;
      var itens = tela.querySelectorAll('.fu');
      for(var i = 0; i < itens.length; i++) itens[i].classList.add('on');
    } catch(e){}
  }
  window.addEventListener('pageshow', garantirVisivel);
  document.addEventListener('visibilitychange', function(){
    if(!document.hidden) setTimeout(garantirVisivel, 60);
  });
  window.addEventListener('focus', garantirVisivel);
  [0, 400, 1200, 2500, 5200].forEach(function(ms){ setTimeout(garantirVisivel, ms); });

  // ── a faixa preta atras do relogio do celular ──────────────────
  // Em app instalado, a cor daquela faixa vem da meta theme-color.
  // Deixando ela igual ao topo do degrade, a tela sobe ate o relogio
  // sem risco preto no meio. Hora e bateria continuam aparecendo.
  var COR_TOPO = '#000000';
  function corDoTopo(){
    try {
      var m = document.querySelector('meta[name="theme-color"]');
      if(!m){
        m = document.createElement('meta');
        m.setAttribute('name', 'theme-color');
        document.head.appendChild(m);
      }
      if(m.getAttribute('content') !== COR_TOPO) m.setAttribute('content', COR_TOPO);
      var s2 = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if(s2) s2.setAttribute('content', 'black-translucent');

      // o proprio app reescreve essa meta depois de desenhar o icone.
      // o observador devolve a nossa cor toda vez que isso acontecer.
      if(!window._alocoObsTopo && window.MutationObserver){
        window._alocoObsTopo = new MutationObserver(function(){
          var mm = document.querySelector('meta[name="theme-color"]');
          if(mm && mm.getAttribute('content') !== COR_TOPO) mm.setAttribute('content', COR_TOPO);
        });
        window._alocoObsTopo.observe(document.head, { subtree:true, attributes:true, childList:true });
      }
    } catch(e){}
  }
  [300, 1500, 4000, 8000].forEach(function(ms){ setTimeout(corDoTopo, ms); });

  // a tesoura emoji vira icone de verdade, no tom do texto do botao
  var TESOURA =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"'
    + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>'
    + '<line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/>'
    + '<line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>';

  function trocarEmoji(){
    try {
      var bs = document.querySelectorAll('.cta');
      for(var i = 0; i < bs.length; i++){
        var b = bs[i];
        if(b.getAttribute('data-aloco-ic')) continue;
        var t = String(b.textContent || '');
        if(t.indexOf('✂') < 0) continue;          // nao tem a tesoura
        b.setAttribute('data-aloco-ic', '1');
        b.innerHTML = TESOURA + '<span>' + esc(t.replace(/[✂️\s]+/, '').trim()) + '</span>';
      }
    } catch(e){}
  }


  // ── Tela de confirmacao ─────────────────────────────────────────────
  // Tres acertos que o modelo de cada app nao tem: a data saia crua
  // (2026-10-02), a tesoura colorida destoava do preto e ouro, e o botao
  // "Ver meu perfil" levava para o Inicio.
  var MESES_C = ['janeiro','fevereiro','marco','abril','maio','junho',
                 'julho','agosto','setembro','outubro','novembro','dezembro'];
  var SEM_C = ['domingo','segunda','terca','quarta','quinta','sexta','sabado'];
  function dataBonita(t){
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(t||'').trim());
    if(!m) return null;
    var d = new Date(+m[1], +m[2]-1, +m[3]);
    if(isNaN(d.getTime())) return null;
    return SEM_C[d.getDay()] + ', ' + (+m[3]) + ' de ' + MESES_C[+m[2]-1];
  }
  function arrumarConfirmacao(){
    try {
      var dt = document.getElementById('cd-dt');
      if(dt){ var b = dataBonita(dt.textContent); if(b) dt.textContent = b; }
      var ic = document.querySelector('#ag-stage-3 .confirm-icon');
      if(ic && !ic.getAttribute('data-aloco-ic') && String(ic.textContent||'').indexOf('\u2702') >= 0){
        ic.setAttribute('data-aloco-ic','1');
        ic.innerHTML = TESOURA;
      }
      var bs = document.querySelectorAll('#ag-stage-3 .cta2, #ag-stage-3 .cta');
      for(var i=0;i<bs.length;i++){
        var el = bs[i];
        if(el.getAttribute('data-aloco-bt')) continue;
        if(/perfil/i.test(el.textContent||'')){
          el.setAttribute('data-aloco-bt','1');
          el.setAttribute('onclick','');
          el.onclick = function(){ irPara('perfil'); };
        }
      }
    } catch(e){}
  }

  // Se o app ficar sem API, a etapa "Quando" mostrava horarios de exemplo
  // com datas de junho. Melhor dizer a verdade do que oferecer horario falso.
  function limparExemplos(){
    try {
      var c = document.getElementById('ag-dias');
      if(!c || c.getAttribute('data-aloco-ex')) return;
      if(temApi) return;                       // com API, o proprio app repinta
      c.setAttribute('data-aloco-ex','1');
      c.innerHTML = '<div style="color:var(--c3);font-size:13px;padding:12px 0;line-height:1.55">'
        + 'Nao consegui carregar os horarios agora.<br>Tente de novo em instantes.</div>';
    } catch(e){}
  }

  function ligarMeus(){
    if(!document.querySelector('.nav-items')) return false;
    // clarearTexto() nao e mais necessario: o patch.css trava a paleta
    corDoTopo();
    tirarFila();
    protegerNavTo();
    trocarEmoji();
    arrumarConfirmacao();
    limparExemplos();
    if(!montarMeus()) return false;
    conferirPacotes();
    // a tela de Meus se atualiza sempre que o app volta pro primeiro plano
    document.addEventListener('visibilitychange', function(){
      if(!document.hidden && document.getElementById('screen-meus')) carregarMeus();
    });
    carregarMeus();
    return true;
  }
  // a confirmacao so existe depois que o cliente reserva: observa e arruma
  try {
    var alvoAg = document.getElementById('screen-agenda');
    if(alvoAg && window.MutationObserver){
      new MutationObserver(function(){ arrumarConfirmacao(); })
        .observe(alvoAg, { childList:true, subtree:true, characterData:true });
    }
  } catch(e){}
  document.addEventListener('click', function(){ setTimeout(arrumarConfirmacao, 60); }, true);

  var tentou = 0;
  var tMeus = setInterval(function(){
    if(ligarMeus() || ++tentou > 40) clearInterval(tMeus);
  }, 400);

  // se o app foi fechado com um agendamento pendente, tenta assim que abrir
  try {
    var pend = JSON.parse(localStorage.getItem(P) || 'null');
    if (pend && pend.url) setTimeout(reenviar, 2500);
  } catch(e){}
  window.addEventListener('online', function(){
    try { if (localStorage.getItem(P)) reenviar(); } catch(e){}
  });
})();


/* ═══════════════════════════════════════════════════════════════════════
   CATÁLOGO: EXEMPLO NUNCA PODE PARECER REAL
   O app nasce com uma equipe de exemplo no HTML (Lucas Mendes, Rafael
   Costa, Diego Alves) e troca por quem está cadastrado quando a API
   responde. So que, se a API FALHA, o carregador do modelo so desiste:
   os exemplos continuam na tela, clicaveis. O cliente escolhe "Rafael
   Costa", manda, e o servidor recusa — com razao, porque esse profissional
   nao existe na casa. O cliente le "escolha um profissional da lista" logo
   depois de escolher um da lista, e vai embora.

   Aqui o app passa a tratar a falha como falha: tira o exemplo da tela,
   diz o que aconteceu e oferece tentar de novo.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  if (window.__alocoCatalogo) return;
  window.__alocoCatalogo = 1;

  var EXEMPLOS = ['lucas mendes','rafael costa','diego alves',
                  'juliana prado','camila ribeiro','beatriz nunes'];

  function quemSou(){
    try { var b = new URLSearchParams(location.search).get('b'); if (b) return String(b); } catch(e){}
    var m = String(location.pathname || '').match(/\/clientes\/([^\/]+)/);
    return m ? m[1] : '';
  }
  var API  = (typeof window.ALOCO_API === 'string' && window.ALOCO_API.indexOf('http') === 0)
             ? window.ALOCO_API
             : 'https://script.google.com/macros/s/AKfycbwjH7c69qlBz58Cuy0c23Yq7kSC-4PpohEqQCpKUy4gAb6Q1Syzqp-hxVra00wRr7RhiQ/exec';
  var SLUG = (typeof window.ALOCO_SLUG === 'string' && window.ALOCO_SLUG) ? window.ALOCO_SLUG : quemSou();
  if (!SLUG) return;
  // este arquivo tambem chega em paginas que nao tem catalogo nenhum
  // (codigos.html, barbeiro.html). Sem isto elas fariam duas chamadas a toa.
  function temCatalogo(){ return !!(document.querySelector('.barbers') || document.querySelector('.services')); }

  function esc(s){ return String(s==null?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function aspas(s){ return String(s==null?'':s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

  function ehExemplo(cont){
    if (!cont) return false;
    if (cont.getAttribute('data-aloco') === 'real') return false;
    var t = (cont.textContent || '').toLowerCase();
    for (var i=0;i<EXEMPLOS.length;i++) if (t.indexOf(EXEMPLOS[i]) >= 0) return true;
    return false;
  }

  function vazio(cont, icone, texto){
    if (!cont) return;
    cont.setAttribute('data-aloco','real');
    cont.innerHTML = '<div class="barber" style="opacity:.55;pointer-events:none">'
      + '<div class="barber-ava">' + icone + '</div>'
      + '<div><div class="barber-name">' + esc(texto) + '</div></div></div>';
  }

  function falhou(cont, oque){
    if (!cont) return;
    cont.setAttribute('data-aloco','erro');
    cont.innerHTML =
        '<div class="aloco-falhou" style="padding:16px;border:1px dashed rgba(255,255,255,.18);'
      + 'border-radius:12px;text-align:center">'
      + '<div style="font-size:13px;line-height:1.5;opacity:.85">Não foi possível carregar '
      + esc(oque) + '. Tente novamente.</div>'
      + '<button type="button" class="aloco-retentar" style="margin-top:10px;padding:9px 16px;'
      + 'min-height:34px;border-radius:999px;border:1px solid currentColor;background:transparent;'
      + 'color:inherit;font:inherit;font-size:13px;cursor:pointer">Tentar de novo</button>'
      + '</div>';
    var b = cont.querySelector('.aloco-retentar');
    if (b) b.onclick = function(){ b.disabled = true; b.textContent = 'Carregando...'; carregar(); };
  }

  function pintarEquipe(lista){
    var cont = document.querySelector('.barbers'); if (!cont) return;
    if (!lista.length){ vazio(cont, '✂', 'Equipe em breve'); return; }
    cont.setAttribute('data-aloco','real');
    cont.innerHTML = lista.map(function(b){
      var nome = String(b.nome || '').trim();
      var ini  = (nome.charAt(0) || '?').toUpperCase();
      return '<div class="barber" onclick="selectBarber(this,\'' + aspas(nome) + '\')">'
           + '<div class="barber-ava">' + esc(ini) + '</div>'
           + '<div><div class="barber-name">' + esc(nome) + '</div>'
           + '<div class="barber-spec">' + esc(b.spec || 'Profissional') + '</div></div>'
           + '<div class="barber-mark"></div></div>';
    }).join('');
  }

  function pintarServicos(lista){
    var cont = document.querySelector('.services'); if (!cont) return;
    if (!lista.length){
      cont.setAttribute('data-aloco','real');
      cont.innerHTML = '<div class="svc" style="justify-content:center;opacity:.55;pointer-events:none">'
                     + '<div class="svc-name">Serviços em breve</div></div>';
      return;
    }
    cont.setAttribute('data-aloco','real');
    window.DUR_SVC = window.DUR_SVC || {};
    cont.innerHTML = lista.map(function(s){
      var nome = String(s.nome || '').trim();
      var preco = 'R$' + String(s.preco).replace('.', ',');
      var dur = parseInt(s.duracao, 10) || 30;
      window.DUR_SVC[nome] = dur;
      return '<div class="svc" onclick="selectSvc(this,\'' + aspas(nome) + '\',\'' + aspas(preco) + '\')">'
           + '<div><div class="svc-name">' + esc(nome) + '</div>'
           + '<div class="svc-detail">' + dur + ' minutos</div></div>'
           + '<div class="svc-price">' + esc(preco) + '</div>'
           + '<div class="svc-sel-mark"></div></div>';
    }).join('');
  }

  function buscar(acao){
    return fetch(API + '?action=' + acao + '&b=' + encodeURIComponent(SLUG) + '&t=' + Date.now())
      .then(function(r){ return r.json(); })
      .then(function(j){
        if (!j || !j.ok) throw new Error('resposta nao ok');
        return Array.isArray(j.dados) ? j.dados : [];
      });
  }

  function carregar(){
    buscar('barbeiros')
      .then(pintarEquipe)
      .catch(function(){
        // so apaga se o que esta na tela ainda for o exemplo do modelo;
        // se o carregador do proprio app ja trouxe gente de verdade, deixa.
        var cont = document.querySelector('.barbers');
        if (ehExemplo(cont) || (cont && cont.getAttribute('data-aloco') === 'erro')) falhou(cont, 'a equipe');
      });
    buscar('servicos')
      .then(pintarServicos)
      .catch(function(){
        var cont = document.querySelector('.services');
        var equipe = document.querySelector('.barbers');
        // se a equipe tambem falhou, o problema e a API: avisa aqui tambem.
        if (cont && equipe && equipe.getAttribute('data-aloco') === 'erro'
            && cont.getAttribute('data-aloco') !== 'real') falhou(cont, 'os serviços');
      });
  }

  function comecar(){ if (temCatalogo()) carregar(); }
  if (document.readyState !== 'loading') comecar();
  else document.addEventListener('DOMContentLoaded', comecar);
})();


/* ═══════════════════════════════════════════════════════════════════════
   INSTALAR NA TELA DE INICIO
   O cliente abre o link, ve um site e vai embora. Ninguem procura
   sozinho o menu do navegador para "adicionar a tela de inicio". Entao
   o proprio app pede, uma vez, de forma clara:

     - Android/Chrome: ha API. Um botao, um toque, instalado.
     - iPhone/Safari: nao ha API. Entao mostramos o caminho com o
       icone certo e uma seta apontando para a barra do Safari.

   Nao aparece se o app ja esta instalado. Se a pessoa dispensar, so
   volta a perguntar daqui a 5 dias. Nunca atrapalha quem esta no meio
   de um agendamento: so entra depois de 20 segundos de uso.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window.__alocoInstalar) return;
  window.__alocoInstalar = 1;

  var CHAVE = 'aloco_instalar_adiado';
  // imediato: so espera a abertura (splash) terminar, para nao aparecer
  // por cima da animacao. Se nao houver splash, entra quase na hora.
  var ESPERA = 500;
  var DESCANSO = 5 * 24 * 3600 * 1000;   // 5 dias apos dispensar

  function jaInstalado(){
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if (navigator.standalone === true) return true;              // iOS
    } catch(e){}
    return false;
  }
  function adiado(){
    try {
      var t = Number(localStorage.getItem(CHAVE) || 0);
      return t && (Date.now() - t) < DESCANSO;
    } catch(e){ return false; }
  }
  function adiar(){ try { localStorage.setItem(CHAVE, String(Date.now())); } catch(e){} }

  function ehIOS(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function ehSafari(){
    var ua = navigator.userAgent;
    return /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
  }

  // a cor do app: usa a propria marca do cliente quando existir
  function corDaMarca(){
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--cr');
      if (v && v.trim()) return v.trim();
    } catch(e){}
    try {
      var m = document.querySelector('meta[name="theme-color"]');
      if (m && m.content) return m.content;
    } catch(e){}
    return '#C9A227';
  }
  function iconeDoApp(){
    var cand = ['link[rel="apple-touch-icon"]','link[rel="icon"]'];
    for (var i = 0; i < cand.length; i++){
      var el = document.querySelector(cand[i]);
      if (el && el.getAttribute('href')) return el.getAttribute('href');
    }
    return 'icon-192.png';
  }
  function nomeDoApp(){
    try {
      var m = document.querySelector('meta[name="application-name"]');
      if (m && m.content) return m.content;
    } catch(e){}
    return (document.title || 'o app').replace(/\s+[-–|·]\s+.*$/, '').trim();
  }

  var estilo = ''
  + '#alcInstBg{position:fixed;inset:0;z-index:2147483000;display:none;'
  +   'background:rgba(0,0,0,.72);backdrop-filter:blur(3px);'
  +   '-webkit-backdrop-filter:blur(3px);align-items:flex-end;justify-content:center}'
  + '#alcInstBg.on{display:flex;animation:alcInstFade .22s ease}'
  + '@keyframes alcInstFade{from{opacity:0}to{opacity:1}}'
  + '@keyframes alcInstSobe{from{transform:translateY(100%)}to{transform:translateY(0)}}'
  + '@keyframes alcInstSeta{0%,100%{transform:translateY(0);opacity:.55}50%{transform:translateY(7px);opacity:1}}'
  + '#alcInstCx{width:100%;max-width:440px;background:#121214;color:#EDEAE6;'
  +   'border-radius:20px 20px 0 0;padding:22px 20px calc(20px + env(safe-area-inset-bottom));'
  +   'box-shadow:0 -16px 48px rgba(0,0,0,.6);font-family:inherit;'
  +   'animation:alcInstSobe .26s cubic-bezier(.2,.8,.3,1)}'
  + '#alcInstCx .topo{display:flex;align-items:center;gap:13px;margin-bottom:14px}'
  + '#alcInstCx .ico{width:54px;height:54px;border-radius:13px;overflow:hidden;flex:0 0 auto;'
  +   'background:rgba(255,255,255,.06);box-shadow:0 3px 12px rgba(0,0,0,.4)}'
  + '#alcInstCx .ico img{width:100%;height:100%;object-fit:contain;display:block}'
  + '#alcInstCx h4{margin:0;font-size:16.5px;font-weight:700;letter-spacing:-.02em;line-height:1.25}'
  + '#alcInstCx .sub{margin:3px 0 0;font-size:12.5px;color:#9A9A9F;line-height:1.4}'
  + '#alcInstCx .passos{margin:0 0 16px;padding:0;list-style:none}'
  + '#alcInstCx .passos li{display:flex;align-items:center;gap:10px;padding:9px 0;'
  +   'font-size:13.5px;color:#D8D5D1;line-height:1.35;border-top:1px solid rgba(255,255,255,.07)}'
  + '#alcInstCx .passos li:first-child{border-top:0}'
  + '#alcInstCx .num{flex:0 0 auto;width:21px;height:21px;border-radius:50%;'
  +   'display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0B0B0C}'
  + '#alcInstCx svg{flex:0 0 auto;vertical-align:-3px}'
  + '#alcInstOk{width:100%;border:0;border-radius:13px;padding:15px;font-size:15px;'
  +   'font-weight:700;font-family:inherit;color:#0B0B0C;cursor:pointer;letter-spacing:-.01em}'
  + '#alcInstOk:active{transform:scale(.985)}'
  + '#alcInstNao{width:100%;margin-top:9px;background:none;border:0;color:#7E7E85;'
  +   'font-size:12.5px;font-family:inherit;padding:9px;cursor:pointer}'
  + '#alcInstSeta{position:fixed;left:50%;transform:translateX(-50%);bottom:12px;'
  +   'z-index:2147483001;display:none;color:#fff;animation:alcInstSeta 1.5s ease-in-out infinite}'
  + '#alcInstBg.ios #alcInstSeta{display:block}';

  // o icone de compartilhar do iOS, desenhado (nao depende de fonte nem imagem)
  var SVG_SHARE = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '
    + 'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M12 15V3"/><path d="M8 7l4-4 4 4"/>'
    + '<path d="M20 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/></svg>';
  var SVG_MAIS = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" '
    + 'stroke="currentColor" stroke-width="1.9" stroke-linecap="round">'
    + '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  var SVG_BAIXO = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" '
    + 'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/></svg>';


  // o app abre com uma animacao (#splash). Convidar por cima dela fica feio
  // e a pessoa nem le. Entao: assim que o splash sai, convidamos.
  function quandoPronto(fn){
    var limite = Date.now() + 6000;      // nunca espera mais que 6s
    function visivel(el){
      if (!el) return false;
      var cs;
      try { cs = getComputedStyle(el); } catch(e){ return false; }
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.02;
    }
    function tentar(){
      var sp = document.getElementById('splash') || document.querySelector('.splash,#alocoSplash');
      if (!visivel(sp) || Date.now() > limite){ setTimeout(fn, ESPERA); return; }
      setTimeout(tentar, 150);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tentar);
    else tentar();
  }

  var pedido = null;      // o beforeinstallprompt guardado
  var caixa = null;

  function montar(modo){
    if (caixa) return caixa;
    var st = document.createElement('style');
    st.textContent = estilo;
    document.head.appendChild(st);

    var cor = corDaMarca();
    var bg = document.createElement('div');
    bg.id = 'alcInstBg';

    var corpo = (modo === 'ios')
      ? '<ul class="passos">'
        + '<li><span class="num" style="background:' + cor + '">1</span>'
        +   'Toque em ' + SVG_SHARE + ' <b>Compartilhar</b>, na barra de baixo</li>'
        + '<li><span class="num" style="background:' + cor + '">2</span>'
        +   'Role e toque em ' + SVG_MAIS + ' <b>Adicionar à Tela de Início</b></li>'
        + '<li><span class="num" style="background:' + cor + '">3</span>'
        +   'Confirme em <b>Adicionar</b></li>'
        + '</ul>'
        + '<button id="alcInstOk" style="background:' + cor + '">Entendi</button>'
      : '<button id="alcInstOk" style="background:' + cor + '">Instalar agora</button>';

    bg.innerHTML =
        '<div id="alcInstCx" role="dialog" aria-modal="true" aria-label="Instalar o aplicativo">'
      +   '<div class="topo">'
      +     '<div class="ico"><img src="' + iconeDoApp() + '" alt=""></div>'
      +     '<div><h4>Deixe ' + nomeDoApp() + ' no seu celular</h4>'
      +     '<p class="sub">Vira um ícone na tela de início. Abre direto, sem navegador.</p></div>'
      +   '</div>'
      +   corpo
      +   '<button id="alcInstNao">Agora não</button>'
      + '</div>'
      + '<div id="alcInstSeta">' + SVG_BAIXO + '</div>';

    document.body.appendChild(bg);
    caixa = bg;

    bg.querySelector('#alcInstNao').onclick = function(){ adiar(); fechar(); };
    bg.addEventListener('click', function(e){ if (e.target === bg){ adiar(); fechar(); } });

    bg.querySelector('#alcInstOk').onclick = function(){
      if (modo === 'ios'){ adiar(); fechar(); return; }
      fechar();
      if (!pedido) return;
      try {
        pedido.prompt();
        pedido.userChoice.then(function(r){
          if (!r || r.outcome !== 'accepted') adiar();
          pedido = null;
        });
      } catch(e){ adiar(); }
    };
    return bg;
  }

  function abrir(modo){
    montar(modo).classList.add('on');
    if (modo === 'ios') caixa.classList.add('ios');
    document.documentElement.style.overflow = 'hidden';
  }
  function fechar(){
    if (caixa) caixa.classList.remove('on');
    document.documentElement.style.overflow = '';
  }

  // Android e desktop: o navegador avisa quando da para instalar
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    pedido = e;
    if (jaInstalado() || adiado()) return;
    quandoPronto(function(){ if (pedido && !jaInstalado()) abrir('android'); });
  });

  window.addEventListener('appinstalled', function(){
    pedido = null; fechar();
    try { localStorage.removeItem(CHAVE); } catch(e){}
  });

  // iPhone: nao ha evento nenhum, entao o convite e por conta propria
  if (ehIOS() && ehSafari() && !jaInstalado() && !adiado()){
    quandoPronto(function(){ if (!jaInstalado()) abrir('ios'); });
  }

  // para testar na hora, sem esperar: alocoInstalar() no console
  window.alocoInstalar = function(){
    abrir((ehIOS() && ehSafari()) ? 'ios' : 'android');
  };
})();
